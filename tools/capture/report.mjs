#!/usr/bin/env node
// Summarizes the corpus for review. Reads the artifacts themselves (each page's meta.json) plus
// failures.json, so the summary stays valid even after later partial/resume runs overwrite
// run-report.json (which describes only the most recent run).
//
// Usage: node tools/capture/report.mjs [--corpus corpus] [--json]

import fs from 'node:fs';
import path from 'node:path';

import { readJson } from './lib/util.mjs';

function parseArgs(argv) {
  const options = { corpus: 'corpus', json: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--corpus') options.corpus = argv[i + 1];
    else if (argv[i] === '--json') options.json = true;
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  return options;
}

const mb = (bytes) => `${(bytes / 1e6).toFixed(2)}MB`;

// A page counts as captured when its artifacts are on disk; quality flags and failures.json
// determine whether that capture is trustworthy.
function scanCorpus(corpusDir) {
  const pages = [];
  for (const site of fs.readdirSync(corpusDir).sort()) {
    const siteDir = path.join(corpusDir, site);
    if (!fs.statSync(siteDir).isDirectory() || site === '_evidence') continue;
    for (const page of fs.readdirSync(siteDir).sort()) {
      const metaPath = path.join(siteDir, page, 'meta.json');
      if (!fs.existsSync(metaPath)) continue;
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const flags = meta.qualityFlags ?? [];
      pages.push({
        site,
        page,
        archetype: meta.archetype,
        captured: true,
        status: flags.includes('suspicious_empty_render') ? 'captured-empty' : 'captured',
        qualityFlags: flags,
        renderedNodes: meta.counts?.renderedNodes ?? 0,
        visibleNodes: meta.counts?.visibleNodes ?? 0,
        axCoverageRatio: meta.counts?.axCoverageRatio ?? null,
        artifactBytes: meta.artifactBytes ?? 0,
        artifactCapExceeded: meta.artifactCap?.exceeded ?? false,
        robotsVia: meta.robots?.fetchedVia ?? null,
        redirected: meta.redirect?.redirected ?? false,
        errors: meta.errors?.length ?? 0,
      });
    }
  }
  return pages;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const corpusDir = path.resolve(options.corpus);
  const pages = scanCorpus(corpusDir);
  const failures = readJson(path.join(corpusDir, 'failures.json'), { failures: [] }).failures ?? [];
  const failedKeys = new Set(failures.map((failure) => `${failure.site}/${failure.page}`));

  const byArchetype = {};
  for (const entry of pages) {
    const bucket = (byArchetype[entry.archetype] ??= { captured: 0, empty: 0, failed: 0, renderedNodes: 0, bytes: 0 });
    bucket.captured += 1;
    if (entry.status === 'captured-empty') bucket.empty += 1;
    bucket.renderedNodes += entry.renderedNodes;
    bucket.bytes += entry.artifactBytes;
  }
  for (const key of failedKeys) {
    if (pages.some((entry) => `${entry.site}/${entry.page}` === key)) continue;
    const archetype = failures.find((failure) => `${failure.site}/${failure.page}` === key)?.archetype ?? 'unknown';
    const bucket = (byArchetype[archetype] ??= { captured: 0, empty: 0, failed: 0, renderedNodes: 0, bytes: 0 });
    bucket.failed += 1;
  }

  const sizes = pages.map((entry) => entry.artifactBytes).filter((size) => size > 0).sort((a, b) => a - b);
  const totalBytes = sizes.reduce((sum, size) => sum + size, 0);
  const flagCounts = {};
  for (const entry of pages) for (const flag of entry.qualityFlags) flagCounts[flag] = (flagCounts[flag] ?? 0) + 1;
  const failureReasons = {};
  for (const failure of failures) failureReasons[failure.reason] = (failureReasons[failure.reason] ?? 0) + 1;

  const summary = {
    corpusDir: path.relative(process.cwd(), corpusDir),
    capturedPages: pages.length,
    emptyCapturePages: pages.filter((entry) => entry.status === 'captured-empty').length,
    failedPages: [...failedKeys].filter((key) => !pages.some((entry) => `${entry.site}/${entry.page}` === key)).length,
    domains: new Set(pages.map((entry) => entry.site)).size,
    renderedNodes: pages.reduce((sum, entry) => sum + entry.renderedNodes, 0),
    visibleNodes: pages.reduce((sum, entry) => sum + entry.visibleNodes, 0),
    artifactBytes: {
      total: totalBytes,
      mean: sizes.length ? Math.round(totalBytes / sizes.length) : 0,
      median: sizes.length ? sizes[Math.floor(sizes.length / 2)] : 0,
      p90: sizes.length ? sizes[Math.min(sizes.length - 1, Math.floor(sizes.length * 0.9))] : 0,
      max: sizes.length ? sizes[sizes.length - 1] : 0,
    },
    qualityFlags: flagCounts,
    failureReasons,
    failureList: failures.map((failure) => ({ page: `${failure.site}/${failure.page}`, archetype: failure.archetype, reason: failure.reason, message: failure.message })),
    archetypeCoverage: byArchetype,
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }

  process.stdout.write(`${summary.corpusDir}: ${summary.capturedPages} captured pages (${summary.domains} domains), ${summary.emptyCapturePages} empty, ${summary.failedPages} failed\n`);
  process.stdout.write(`nodes: rendered=${summary.renderedNodes} visible=${summary.visibleNodes}\n`);
  process.stdout.write(`artifacts: total=${mb(summary.artifactBytes.total)} mean=${mb(summary.artifactBytes.mean)} median=${mb(summary.artifactBytes.median)} p90=${mb(summary.artifactBytes.p90)} max=${mb(summary.artifactBytes.max)}\n\n`);

  process.stdout.write('per archetype:\n');
  process.stdout.write(`  ${'archetype'.padEnd(24)}${'ok'.padStart(5)}${'empty'.padStart(7)}${'fail'.padStart(6)}${'nodes'.padStart(9)}${'bytes'.padStart(10)}\n`);
  for (const [archetype, bucket] of Object.entries(summary.archetypeCoverage).sort()) {
    process.stdout.write(
      `  ${archetype.padEnd(24)}${String(bucket.captured - bucket.empty).padStart(5)}${String(bucket.empty).padStart(7)}${String(bucket.failed).padStart(6)}${String(bucket.renderedNodes).padStart(9)}${mb(bucket.bytes).padStart(10)}\n`,
    );
  }

  process.stdout.write('\nfailure breakdown:\n');
  const reasons = Object.entries(summary.failureReasons).sort((a, b) => b[1] - a[1]);
  if (!reasons.length) process.stdout.write('  (none)\n');
  for (const [reason, count] of reasons) process.stdout.write(`  ${String(count).padStart(3)}  ${reason}\n`);
  for (const failure of summary.failureList) process.stdout.write(`       ${failure.page.padEnd(38)}${failure.reason.padEnd(28)}${String(failure.message).slice(0, 70)}\n`);

  process.stdout.write('\nquality flags:\n');
  const flags = Object.entries(summary.qualityFlags).sort((a, b) => b[1] - a[1]);
  if (!flags.length) process.stdout.write('  (none)\n');
  for (const [flag, count] of flags) process.stdout.write(`  ${String(count).padStart(3)}  ${flag}\n`);
}

main();
