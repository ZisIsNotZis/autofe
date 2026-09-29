#!/usr/bin/env node
// M0 capture pipeline CLI.
//
// Usage:
//   node tools/capture/index.mjs [options]
//
// Options:
//   --pilot                capture only the pages listed in tools/capture/pilot.json
//   --site <slug>          restrict to a site slug (repeatable)
//   --page <site>/<page>   restrict to a page (repeatable)
//   --archetype <name>     restrict to an archetype (repeatable)
//   --limit <n>            capture at most n pages
//   --out <dir>            corpus directory (default: corpus)
//   --sites <file>         seed file (default: tools/capture/sites.json)
//   --pilot-file <file>    pilot list (default: tools/capture/pilot.json)
//   --min-delay-ms <n>     per-host minimum delay (default 1500)
//   --dry-run              print selection + robots decisions, capture nothing
//   --include-skipped      also run pages marked "skip" in sites.json
//   --no-retry-pass        do not re-attempt pages that failed for transient reasons
//   --retry-pass-delay-ms  wait before that retry pass (default 5000)
//   --max-page-bytes <n>   per-page artifact ceiling; 0 disables (default 2000000)
//   --max-full-png-height <n>  truncate full.png to n px of document height; 0 = never (default)
//   --skip-existing        skip pages that already have a meta.json (resume a long run)
//   --strict               exit 1 if any selected page fails
//
// Exit codes: 0 = ran (failures are recorded in corpus/failures.json), 1 = pipeline error.

import fs from 'node:fs';
import path from 'node:path';

import { capturePage, createCaptureLogger } from './lib/capture.mjs';
import { launchBrowser, newCaptureContext, fetchTextViaBrowser, DEFAULT_OPTIONS, PRODUCT_TOKEN, USER_AGENT } from './lib/browser.mjs';
import { RobotsClient } from './lib/robots-client.mjs';
import { HostThrottle } from './lib/throttle.mjs';
import { fileSize, hostOf, nowIso, readJson, sleep, writeJson } from './lib/util.mjs';

// Transient conditions that are worth exactly one extra attempt at the end of a run.
// A robots.txt fetch that fails on a flaky network, a navigation that times out, or an
// anti-bot shell that renders empty on some hits (passport.baidu.com served a full page in 3 of
// 5 observations) say nothing about the page itself; a robots denial or a 404 does, and is never
// retried.
const RETRYABLE_FAILURE_REASONS = new Set(['robots_unavailable', 'navigation_failed', 'suspicious_empty_render']);

const HERE = path.dirname(new URL(import.meta.url).pathname);

function parseArgs(argv) {
  const options = {
    site: [],
    page: [],
    archetype: [],
    limit: null,
    out: 'corpus',
    sites: path.join(HERE, 'sites.json'),
    pilotFile: path.join(HERE, 'pilot.json'),
    pilot: false,
    dryRun: false,
    strict: false,
    includeSkipped: false,
    retryPass: true,
    retryPassDelayMs: 5000,
    maxPageBytes: DEFAULT_OPTIONS.maxPageBytes,
    maxFullPngHeight: DEFAULT_OPTIONS.maxFullPngHeight,
    skipExisting: false,
    minDelayMs: DEFAULT_OPTIONS.minDelayMs,
    quiet: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = () => {
      const next = argv[i + 1];
      if (next === undefined) throw new Error(`missing value for ${arg}`);
      i += 1;
      return next;
    };
    switch (arg) {
      case '--site': options.site.push(value()); break;
      case '--page': options.page.push(value()); break;
      case '--archetype': options.archetype.push(value()); break;
      case '--limit': options.limit = Number(value()); break;
      case '--out': options.out = value(); break;
      case '--sites': options.sites = value(); break;
      case '--pilot-file': options.pilotFile = value(); break;
      case '--pilot': options.pilot = true; break;
      case '--dry-run': options.dryRun = true; break;
      case '--strict': options.strict = true; break;
      case '--include-skipped': options.includeSkipped = true; break;
      case '--no-retry-pass': options.retryPass = false; break;
      case '--retry-pass-delay-ms': options.retryPassDelayMs = Number(value()); break;
      case '--max-page-bytes': options.maxPageBytes = Number(value()); break;
      case '--max-full-png-height': options.maxFullPngHeight = Number(value()); break;
      case '--skip-existing': options.skipExisting = true; break;
      case '--quiet': options.quiet = true; break;
      case '--min-delay-ms': options.minDelayMs = Number(value()); break;
      case '--help':
      case '-h':
        process.stdout.write(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(0, 24).join('\n'));
        process.exit(0);
        break;
      default:
        throw new Error(`unknown argument: ${arg}`);
    }
  }
  return options;
}

// Archetype names are read from archetypes.md so the taxonomy stays a data file:
// either `### \`name\`` headings or the first cell of a `| \`name\` | ... |` table row.
function knownArchetypes(archetypesFile) {
  try {
    const text = fs.readFileSync(archetypesFile, 'utf8');
    const fromHeadings = [...text.matchAll(/^###\s+`([^`]+)`/gm)].map((match) => match[1]);
    const fromTable = [...text.matchAll(/^\|\s*`([^`]+)`\s*\|/gm)].map((match) => match[1]);
    return [...new Set([...fromHeadings, ...fromTable])];
  } catch {
    return [];
  }
}

function buildJobs(sitesDoc, options, corpusDir) {
  const wantedPages = new Set(options.page);
  const wantedArchetypes = new Set(options.archetype);
  const jobs = [];
  const unknown = [];
  let skippedExisting = 0;

  for (const site of sitesDoc.sites) {
    if (options.site.length && !options.site.includes(site.slug)) continue;
    for (const page of site.pages) {
      const key = `${site.slug}/${page.slug}`;
      if (wantedPages.size && !wantedPages.has(key)) continue;
      if (wantedArchetypes.size && !wantedArchetypes.has(page.archetype)) continue;
      // `skip` pages stay out of bulk runs but can be forced by naming them with --page.
      if (page.skip && !wantedPages.has(key) && !options.includeSkipped) continue;
      if (options.skipExisting && fs.existsSync(path.join(corpusDir, site.slug, page.slug, 'meta.json'))) {
        skippedExisting += 1;
        continue;
      }
      jobs.push({
        site,
        page: {
          slug: page.slug,
          url: page.url,
          archetype: page.archetype,
          note: page.note ?? null,
          // Page-level interaction steps (fill/press/click/waitMs/waitFor), run after
          // navigation+settle and before analysis (see runInteractions in lib/capture.mjs).
          interactions: Array.isArray(page.interactions) ? page.interactions : null,
        },
      });
    }
  }

  if (wantedPages.size) {
    const found = new Set(jobs.map((job) => `${job.site.slug}/${job.page.slug}`));
    for (const key of wantedPages) if (!found.has(key)) unknown.push(key);
  }
  return { jobs, unknown, skippedExisting };
}

function upsertFailures(corpusDir, results) {
  const file = path.join(corpusDir, 'failures.json');
  const existing = readJson(file, { failures: [] }) ?? { failures: [] };
  const kept = (existing.failures ?? []).filter(
    (entry) => !results.some((result) => result.site === entry.site && result.page === entry.page),
  );
  const added = [];
  for (const result of results) {
    for (const failure of result.failures ?? []) {
      added.push({
        site: result.site,
        page: result.page,
        archetype: result.archetype,
        url: failure.url ?? result.url,
        stage: failure.stage,
        reason: failure.reason,
        message: failure.message,
        rule: failure.redirectRule ?? failure.rule ?? null,
        requestedUrl: failure.requestedUrl ?? null,
        partialArtifacts: failure.partialArtifacts ?? false,
        discardedStaleArtifacts: failure.discardedStaleArtifacts ?? false,
        at: nowIso(),
      });
      // qualityFlags make a failure self-describing when read without run-report.json.
      if (result.qualityFlags?.length) added[added.length - 1].qualityFlags = result.qualityFlags;
    }
  }
  const failures = [...kept, ...added].sort(
    (a, b) => a.site.localeCompare(b.site) || a.page.localeCompare(b.page) || a.reason.localeCompare(b.reason),
  );
  writeJson(file, { generatedAt: nowIso(), count: failures.length, failures });
  return failures;
}

async function main() {
  const startedAt = Date.now();
  const options = { ...DEFAULT_OPTIONS, ...parseArgs(process.argv.slice(2)) };
  const log = createCaptureLogger(!options.quiet);
  const corpusDir = path.resolve(options.out);

  const sitesDoc = readJson(options.sites);
  if (!sitesDoc) throw new Error(`cannot read seed file ${options.sites}`);
  const archetypesFile = path.join(HERE, 'archetypes.md');
  const archetypes = knownArchetypes(archetypesFile);

  if (options.pilot) {
    const pilot = readJson(options.pilotFile);
    if (!pilot) throw new Error(`cannot read pilot file ${options.pilotFile}`);
    options.page = [...(pilot.pages ?? []), ...options.page];
  }

  const { jobs: allJobs, unknown, skippedExisting } = buildJobs(sitesDoc, options, corpusDir);
  if (unknown.length) log(`warning: --page selectors not found in ${options.sites}: ${unknown.join(', ')}`);
  if (skippedExisting) log(`--skip-existing: ${skippedExisting} page(s) already captured`);
  const jobs = options.limit ? allJobs.slice(0, options.limit) : allJobs;

  // The taxonomy is a data contract: archetypes.md is the source of truth, and both the seed
  // file and --archetype selectors are validated against it (whole file, not just the selection).
  if (!archetypes.length) {
    log(`warning: no archetype names parsed from ${archetypesFile}; taxonomy validation skipped`);
  } else {
    log(`taxonomy: ${archetypes.length} archetypes from ${path.relative(process.cwd(), archetypesFile)}`);
  }
  const unknownSelectors = options.archetype.filter((name) => archetypes.length > 0 && !archetypes.includes(name));
  if (unknownSelectors.length) {
    throw new Error(`unknown archetype(s): ${unknownSelectors.join(', ')}. Known: ${archetypes.join(', ')}`);
  }
  const seedArchetypes = sitesDoc.sites.flatMap((site) => site.pages.map((page) => ({ site: site.slug, page: page.slug, archetype: page.archetype })));
  const badArchetypes = [...new Set(seedArchetypes.filter((entry) => archetypes.length > 0 && !archetypes.includes(entry.archetype)).map((entry) => `${entry.site}/${entry.page}: ${entry.archetype}`))];
  if (badArchetypes.length) {
    throw new Error(`archetype names not found in archetypes.md:\n  ${badArchetypes.join('\n  ')}`);
  }
  if (options.archetype.length && jobs.length === 0) {
    log(`warning: --archetype ${options.archetype.join(', ')} matched no pages in ${options.sites}`);
  }

  const summary = {
    selectedPages: jobs.length,
    selectedSites: new Set(jobs.map((job) => job.site.slug)).size,
    archetypes: [...new Set(jobs.map((job) => job.page.archetype))],
  };
  log(`selection: ${summary.selectedPages} pages / ${summary.selectedSites} sites / ${summary.archetypes.length} archetypes`);

  if (jobs.length === 0) {
    log('nothing selected; exiting');
    return;
  }

  if (options.dryRun) {
    const throttle = new HostThrottle({ minDelayMs: options.minDelayMs });
    const robots = new RobotsClient({ userAgent: USER_AGENT, productToken: PRODUCT_TOKEN, throttle, log });
    const rows = [];
    for (const job of jobs) {
      const access = await robots.check(job.page.url, { maxCrawlDelayMs: options.maxCrawlDelayMs });
      rows.push({
        site: job.site.slug,
        page: job.page.slug,
        archetype: job.page.archetype,
        url: job.page.url,
        allowed: access.allowed,
        reason: access.reason,
        rule: access.rule ?? null,
        matchedAgent: access.robots?.matchedAgent ?? null,
        crawlDelaySeconds: access.crawlDelaySeconds ?? null,
      });
      log(
        `${access.allowed ? 'ALLOW' : 'DENY '} ${job.site.slug}/${job.page.slug} [${job.page.archetype}]` +
          `${access.rule ? ` (${access.rule})` : ''}${access.reason ? ` <- ${access.reason}` : ''}`,
      );
    }
    writeJson(path.join(corpusDir, 'robots-dry-run.json'), { generatedAt: nowIso(), rows });
    log(`dry run written to ${path.relative(process.cwd(), path.join(corpusDir, 'robots-dry-run.json'))}`);
    return;
  }

  fs.mkdirSync(corpusDir, { recursive: true });
  const throttle = new HostThrottle({ minDelayMs: options.minDelayMs });
  const robots = new RobotsClient({ userAgent: USER_AGENT, productToken: PRODUCT_TOKEN, throttle, log });
  const browser = await launchBrowser({ log });
  const results = [];
  let lastRetryPass = { enabled: options.retryPass, delayMs: options.retryPassDelayMs, attempted: [], recovered: [], stillFailing: [] };
  try {
    const context = await newCaptureContext(browser, options);
    // Hosts whose robots.txt Node cannot fetch (intermittent DNS/connect failures here) are
    // retried through the browser's network stack instead of being skipped.
    robots.setBrowserFetch((url) => fetchTextViaBrowser(context, url, { timeoutMs: options.robotsTimeoutMs, throttle }));
    const retryPass = lastRetryPass;
    for (const [index, job] of jobs.entries()) {
      const label = `[${index + 1}/${jobs.length}] ${job.site.slug}/${job.page.slug} [${job.page.archetype}]`;
      const pageStartedAt = Date.now();
      const result = await capturePage({ context, job, corpusDir, throttle, robots, userAgent: USER_AGENT, options, log });
      result.durationMs = result.durationMs ?? Date.now() - pageStartedAt;
      results.push({ ...result, failures: result.failures ?? [], reason: result.reason });
      const counts = result.counts ? `nodes=${result.counts.visibleNodes} dom=${result.counts.domElements} ax=${result.counts.axNodes}` : '';
      log(`${result.status === 'ok' ? 'OK    ' : result.status === 'partial' ? 'PART  ' : 'FAIL  '} ${label} ${counts} ${result.reason ?? ''}`);
      writeJson(path.join(corpusDir, 'run-report.json'), buildReport({ results, summary, options, startedAt, throttle, retryPass }));
    }

    if (retryPass.enabled) {
      const retryable = results.filter((result) => result.status === 'failed' && RETRYABLE_FAILURE_REASONS.has(result.reason));
      if (retryable.length) {
        log(`retry pass: ${retryable.length} page(s) failed for transient reasons; waiting ${retryPass.delayMs}ms before one extra attempt`);
        retryPass.attempted = retryable.map((result) => `${result.site}/${result.page}`);
        await sleep(retryPass.delayMs);
        robots.clearCache();
        for (const previous of retryable) {
          const job = jobs.find((candidate) => candidate.site.slug === previous.site && candidate.page.slug === previous.page);
          if (!job) continue;
          const pageStartedAt = Date.now();
          const retried = await capturePage({ context, job, corpusDir, throttle, robots, userAgent: USER_AGENT, options, log });
          retried.durationMs = retried.durationMs ?? Date.now() - pageStartedAt;
          retried.retriedAfter = previous.reason;
          const index = results.findIndex((candidate) => candidate.site === previous.site && candidate.page === previous.page);
          results[index] = retried;
          if (retried.status === 'failed') {
            retryPass.stillFailing.push({ page: `${previous.site}/${previous.page}`, reason: retried.reason });
            log(`RETRY-FAIL ${previous.site}/${previous.page} ${retried.reason ?? ''}`);
          } else {
            retryPass.recovered.push(`${previous.site}/${previous.page}`);
            log(`RECOVERED  ${previous.site}/${previous.page} after retry (was ${previous.reason})`);
          }
        }
        writeJson(path.join(corpusDir, 'run-report.json'), buildReport({ results, summary, options, startedAt, throttle, retryPass }));
      }
    }
    await context.close();
  } finally {
    await browser.close().catch(() => {});
  }

  const failures = upsertFailures(corpusDir, results);
  writeJson(path.join(corpusDir, 'run-report.json'), buildReport({ results, summary, options, startedAt, throttle, retryPass: lastRetryPass }));

  const ok = results.filter((result) => result.status === 'ok').length;
  const partial = results.filter((result) => result.status === 'partial').length;
  const failed = results.filter((result) => result.status === 'failed').length;
  const recovered = lastRetryPass.recovered.length;
  log(`done: ok=${ok} partial=${partial} failed=${failed}${recovered ? ` (${recovered} recovered in retry pass)` : ''}; failures recorded=${failures.length}`);
  log(`report: ${path.relative(process.cwd(), path.join(corpusDir, 'run-report.json'))}`);

  if (options.strict && failed + partial > 0) process.exitCode = 1;
}

// Per-archetype outcome table: coverage claims in the ticket are made against this.
function archetypeCoverage(results) {
  const byArchetype = {};
  for (const result of results) {
    const entry = (byArchetype[result.archetype] ??= { selected: 0, ok: 0, partial: 0, failed: 0, renderedNodes: 0, overArtifactCap: 0 });
    entry.selected += 1;
    entry[result.status] = (entry[result.status] ?? 0) + 1;
    entry.renderedNodes += result.counts?.renderedNodes ?? 0;
    if ((result.qualityFlags ?? []).includes('artifact_cap_exceeded')) entry.overArtifactCap += 1;
  }
  return byArchetype;
}

function qualityFlagCounts(results) {
  const counts = {};
  for (const result of results) {
    for (const flag of result.qualityFlags ?? []) counts[flag] = (counts[flag] ?? 0) + 1;
  }
  return counts;
}

function artifactSizeStats(results, maxPageBytes) {
  const sizes = results.map((result) => result.artifactBytes ?? 0).filter((size) => size > 0).sort((a, b) => a - b);
  if (!sizes.length) return { pages: 0 };
  const sum = sizes.reduce((total, size) => total + size, 0);
  return {
    pages: sizes.length,
    totalBytes: sum,
    meanBytes: Math.round(sum / sizes.length),
    medianBytes: sizes[Math.floor(sizes.length / 2)],
    p90Bytes: sizes[Math.min(sizes.length - 1, Math.floor(sizes.length * 0.9))],
    maxBytes: sizes[sizes.length - 1],
    maxPageBytes,
    overCap: sizes.filter((size) => maxPageBytes > 0 && size > maxPageBytes).length,
  };
}

function buildReport({ results, summary, options, startedAt, throttle, retryPass = null }) {
  return {
    generatedAt: nowIso(),
    selection: summary,
    options: {
      viewport: options.viewport,
      locale: options.locale,
      minDelayMs: options.minDelayMs,
      navTimeoutMs: options.navTimeoutMs,
      navRetries: options.navRetries,
      networkIdleTimeoutMs: options.networkIdleTimeoutMs,
      settleMs: options.settleMs,
      maxCrawlDelayMs: options.maxCrawlDelayMs,
      retryPass: options.retryPass,
      retryPassDelayMs: options.retryPassDelayMs,
      maxPageBytes: options.maxPageBytes,
      maxFullPngHeight: options.maxFullPngHeight,
      skipExisting: options.skipExisting,
      minVisibleNodes: options.minVisibleNodes,
      minBodyTextLength: options.minBodyTextLength,
      userAgent: USER_AGENT,
    },
    summary: {
      pages: results.length,
      ok: results.filter((result) => result.status === 'ok').length,
      partial: results.filter((result) => result.status === 'partial').length,
      failed: results.filter((result) => result.status === 'failed').length,
      renderedNodes: results.reduce((sum, result) => sum + (result.counts?.renderedNodes ?? 0), 0),
      visibleNodes: results.reduce((sum, result) => sum + (result.counts?.visibleNodes ?? 0), 0),
      hostWaitMs: Math.round(throttle.totalWaitMs),
      wallMs: Date.now() - startedAt,
    },
    archetypeCoverage: archetypeCoverage(results),
    qualityFlagCounts: qualityFlagCounts(results),
    artifactSize: artifactSizeStats(results, options.maxPageBytes),
    retryPass,
    hostPacing: {
      minDelayMs: throttle.minDelayMs,
      perHostDelayMs: Object.fromEntries(throttle.perHost),
      pacedRequests: throttle.history,
    },
    results: results.map((result) => ({
      ...result,
      outDirSize: null,
      metaSize: result.artifacts ? (() => {
        const dir = path.resolve(result.outDir);
        return fileSize(path.join(dir, 'meta.json'));
      })() : null,
      host: hostOf(result.url),
    })),
  };
}

main().catch((error) => {
  process.stderr.write(`pipeline error: ${error.stack ?? error.message}\n`);
  process.exit(1);
});
