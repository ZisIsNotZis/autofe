#!/usr/bin/env node
// Guard tests for the capture pipeline's legal/safety paths. Everything runs against a local
// HTTP server plus a stub robots client, so the test needs no external network:
//
//   F7  robots.txt is re-checked on the redirect target; a denied target is recorded as
//       robots_redirect_disallowed and the partially-navigated page is discarded.
//   F7  robots.txt itself is never followed cross-origin (treated as unavailable + recorded).
//   F8  terminal failures (http_error) discard stale artifacts from an earlier run.
//   F2  an allowed cross-host redirect is captured and recorded as cross_host_redirect.
//   F9  robots parser: rules before the first user-agent line are ignored; rule specificity
//       counts the path only (the `$` anchor is not part of the path).
//
// Usage: node tools/capture/test-guards.mjs

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import { capturePage } from './lib/capture.mjs';
import { launchBrowser, newCaptureContext, DEFAULT_OPTIONS } from './lib/browser.mjs';
import { HostThrottle } from './lib/throttle.mjs';
import { RobotsClient } from './lib/robots-client.mjs';
import { parseRobotsTxt, selectRobotsGroup, decideRobotsAccess } from './lib/robots.mjs';

const results = [];
function check(name, condition, detail) {
  results.push({ name, passed: Boolean(condition), detail });
  process.stdout.write(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}\n`);
}

const PAGE = (title, body = '') => `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>${title}</title></head><body><h1>${title}</h1>${body}</body></html>`;

function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/ok') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(PAGE('local ok page', '<p>hello</p>'.repeat(40)));
      return;
    }
    if (url.pathname === '/secret') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(PAGE('secret target'));
      return;
    }
    if (url.pathname === '/redirect-only') {
      // 127.0.0.1 -> localhost: allowed by robots, but a cross-host redirect.
      res.writeHead(302, { location: `http://localhost:${server.address().port}/ok` });
      res.end();
      return;
    }
    if (url.pathname === '/redirect-secret') {
      res.writeHead(302, { location: `http://localhost:${server.address().port}/secret` });
      res.end();
      return;
    }
    if (url.pathname === '/redirect-samehost-secret') {
      // Same host, disallowed target path: the redirect-target check must catch this, not only
      // the cross-host case above.
      res.writeHead(302, { location: `http://127.0.0.1:${server.address().port}/secret` });
      res.end();
      return;
    }
    if (url.pathname === '/sparse-error') {
      // Page whose script throws and which then renders a speck: must be a recorded failure.
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(
        `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>sparse</title></head><body><h1>sparse</h1><p>${'x'.repeat(90)}</p><script>throw new Error('boom')</script></body></html>`,
      );
      return;
    }
    if (url.pathname === '/asset-error') {
      // Page whose own stylesheet comes back 404: a degraded render, must not be reported "ok".
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(
        `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>asset error</title><link rel="stylesheet" href="/broken.css"></head><body><h1>asset error</h1><p>${'content '.repeat(40)}</p></body></html>`,
      );
      return;
    }
    if (url.pathname === '/broken.css') {
      res.writeHead(404, { 'content-type': 'text/css' });
      res.end('/* missing */');
      return;
    }
    if (url.pathname === '/with-frame') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(PAGE('page with third-party frame', `<iframe src="http://localhost:${server.address().port}/framed" width="200" height="60"></iframe><p>${'host content '.repeat(30)}</p>`));
      return;
    }
    if (url.pathname === '/framed') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(PAGE('framed', '<button id="framedBtn">framed-button-name</button>'));
      return;
    }
    if (url.pathname === '/robots-cross-origin.txt') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('User-agent: *\nDisallow: /\n');
      return;
    }
    if (url.pathname === '/robots.txt') {
      res.writeHead(302, { location: `http://localhost:${server.address().port}/robots-cross-origin.txt` });
      res.end();
      return;
    }
    res.writeHead(404, { 'content-type': 'text/html' });
    res.end(PAGE('not found'));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// Stub robots: everything allowed except the /secret path.
const stubRobots = {
  calls: [],
  async check(url) {
    this.calls.push(url);
    const denied = new URL(url).pathname.startsWith('/secret');
    return {
      allowed: !denied,
      reason: denied ? 'robots_disallowed' : null,
      rule: denied ? 'disallow: /secret' : null,
      detail: denied ? 'stub: /secret is disallowed' : '',
      crawlDelaySeconds: null,
      robots: { fetch: 'stub', status: 200, matchedAgent: '*', url: `${new URL(url).origin}/robots.txt` },
    };
  },
  clearCache() {},
};

async function main() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'autofe-guards-'));
  const corpusDir = path.join(tmpRoot, 'corpus');
  fs.mkdirSync(corpusDir, { recursive: true });
  const server = await startServer();
  const port = server.address().port;

  const browser = await launchBrowser({ log: () => {} });
  const options = { ...DEFAULT_OPTIONS, quiet: true };
  const context = await newCaptureContext(browser, options);
  const throttle = new HostThrottle({ minDelayMs: 10 });
  const job = (slug, url) => ({ site: { slug: 'local' }, page: { slug, url, archetype: 'landing/home' } });

  try {
    // --- F7: redirect target denied -> recorded, artifacts discarded ----------------------
    const denied = await capturePage({
      context,
      job: job('redirect-secret', `http://127.0.0.1:${port}/redirect-secret`),
      corpusDir,
      throttle,
      robots: stubRobots,
      userAgent: 'test',
      options,
    });
    check('F7 denied redirect records robots_redirect_disallowed', denied.reason === 'robots_redirect_disallowed', `reason=${denied.reason}`);
    check('F7 denied redirect keeps the requested URL', denied.failures?.[0]?.requestedUrl?.includes('/redirect-secret'), JSON.stringify(denied.failures?.[0]?.requestedUrl));
    check('F7 denied redirect discards artifacts', !fs.existsSync(path.join(corpusDir, 'local', 'redirect-secret')), 'directory absent');
    check('F7 both requested and final URL were robots-checked', stubRobots.calls.length >= 2, `calls=${stubRobots.calls.length}`);

    // --- F2: allowed cross-host redirect is captured and recorded -------------------------
    const redirected = await capturePage({
      context,
      job: job('redirect-only', `http://127.0.0.1:${port}/redirect-only`),
      corpusDir,
      throttle,
      robots: stubRobots,
      userAgent: 'test',
      options,
    });
    check('F2 allowed cross-host redirect is captured', redirected.status === 'partial' && redirected.failures?.[0]?.reason === 'cross_host_redirect', `status=${redirected.status} reason=${redirected.failures?.[0]?.reason}`);
    check('F2 redirect target artifacts exist', fs.existsSync(path.join(corpusDir, 'local', 'redirect-only', 'meta.json')), 'meta.json written');

    // --- F8: http_error discards stale artifacts from an earlier run ----------------------
    const staleDir = path.join(corpusDir, 'local', 'missing');
    fs.mkdirSync(staleDir, { recursive: true });
    fs.writeFileSync(path.join(staleDir, 'meta.json'), '{"stale":true}\n');
    const missing = await capturePage({
      context,
      job: job('missing', `http://127.0.0.1:${port}/missing`),
      corpusDir,
      throttle,
      robots: stubRobots,
      userAgent: 'test',
      options,
    });
    check('F8 http_error is recorded', missing.reason === 'http_error', `reason=${missing.reason}`);
    check('F8 stale artifacts are discarded', !fs.existsSync(staleDir), 'stale directory removed');
    check('F8 failure reports the discard', missing.failures?.[0]?.discardedStaleArtifacts === true, JSON.stringify(missing.failures?.[0]?.discardedStaleArtifacts));

    // --- F7: robots.txt cross-origin redirect is not followed ----------------------------
    const robotsClient = new RobotsClient({
      userAgent: 'AutoFE-Research-Bot/0.1',
      productToken: 'AutoFE-Research-Bot',
      throttle,
      log: () => {},
    });
    const crossOrigin = await robotsClient.check(`http://127.0.0.1:${port}/ok`);
    check(
      'F7 cross-origin robots redirect is not followed',
      crossOrigin.reason === 'robots_cross_origin_redirect',
      `reason=${crossOrigin.reason} -> ${crossOrigin.robots?.crossOriginRedirectTo}`,
    );

    // --- redirect target on the SAME host, disallowed path --------------------------------
    const sameHostDenied = await capturePage({
      context,
      job: job('redirect-samehost-secret', `http://127.0.0.1:${port}/redirect-samehost-secret`),
      corpusDir,
      throttle,
      robots: stubRobots,
      userAgent: 'test',
      options,
    });
    check(
      'same-host redirect to a disallowed path is recorded',
      sameHostDenied.reason === 'robots_redirect_disallowed' && sameHostDenied.failures?.[0]?.rule === 'disallow: /secret',
      `reason=${sameHostDenied.reason} rule=${sameHostDenied.failures?.[0]?.rule}`,
    );
    check('same-host denied redirect discards artifacts', !fs.existsSync(path.join(corpusDir, 'local', 'redirect-samehost-secret')), 'directory absent');

    // --- sparse page whose script threw ---------------------------------------------------
    const sparse = await capturePage({
      context,
      job: job('sparse-error', `http://127.0.0.1:${port}/sparse-error`),
      corpusDir,
      throttle,
      robots: stubRobots,
      userAgent: 'test',
      options,
    });
    check(
      'sparse render with a page error is a recorded failure',
      sparse.status === 'failed' && sparse.reason === 'suspicious_empty_render',
      `status=${sparse.status} reason=${sparse.reason} message=${sparse.failures?.[0]?.message}`,
    );

    // --- same-host asset failure is an explicit partial capture -----------------------------
    const assetError = await capturePage({
      context,
      job: job('asset-error', `http://127.0.0.1:${port}/asset-error`),
      corpusDir,
      throttle,
      robots: stubRobots,
      userAgent: 'test',
      options,
    });
    check(
      'same-host stylesheet error makes the capture partial with a reason',
      assetError.status === 'partial' &&
        assetError.reason === 'asset_load_failed' &&
        assetError.qualityFlags?.includes('asset_load_failed'),
      `status=${assetError.status} reason=${assetError.reason} message=${String(assetError.failures?.[0]?.message).slice(0, 90)}`,
    );

    // --- third-party frame: content not persisted, page flagged -----------------------------
    const framed = await capturePage({
      context,
      job: job('with-frame', `http://127.0.0.1:${port}/with-frame`),
      corpusDir,
      throttle,
      robots: stubRobots,
      userAgent: 'test',
      options,
    });
    const framedMeta = JSON.parse(fs.readFileSync(path.join(corpusDir, 'local', 'with-frame', 'meta.json'), 'utf8'));
    const frameEntries = framedMeta.frames ?? [];
    check(
      'cross-origin frame is recorded and flagged',
      framed.qualityFlags?.includes('cross_origin_frame') &&
        frameEntries.some((frame) => frame.crossOrigin && String(frame.origin).startsWith('http://localhost')),
      `frames=${JSON.stringify(frameEntries.map((frame) => ({ origin: frame.origin, crossOrigin: frame.crossOrigin })))} flags=${JSON.stringify(framed.qualityFlags)}`,
    );
    const framedA11y = fs.readFileSync(path.join(corpusDir, 'local', 'with-frame', 'a11y.json'), 'utf8');
    check('third-party frame AX content is not persisted', !framedA11y.includes('framed-button-name'), 'frame button name absent from a11y.json');
    check(
      'frame exclusion count is reported',
      typeof framedMeta.counts?.a11yFrameNodesExcluded === 'number',
      `a11yFrameNodesExcluded=${framedMeta.counts?.a11yFrameNodesExcluded}`,
    );

    // --- F9: robots parser rules ---------------------------------------------------------
    const beforeUa = parseRobotsTxt('Disallow: /ignored\nUser-agent: *\nAllow: /\n');
    const beforeUaDecision = decideRobotsAccess(selectRobotsGroup(beforeUa, 'AutoFE-Research-Bot'), 'http://example.com/ignored');
    check('F9 rule before the first User-agent is ignored', beforeUaDecision.allowed === true, `allowed=${beforeUaDecision.allowed} rules=${beforeUa.length}`);

    const anchored = parseRobotsTxt('User-agent: *\nDisallow: /a$\nAllow: /a\n');
    const anchoredDecision = decideRobotsAccess(selectRobotsGroup(anchored, 'AutoFE-Research-Bot'), 'http://example.com/a');
    check('F9 `$` is not counted in rule specificity (allow wins the tie)', anchoredDecision.allowed === true, `rule=${anchoredDecision.rule}`);

    // A group for a different bot token must not capture us just because "bot" is a substring.
    const otherBot = parseRobotsTxt('User-agent: bot\nDisallow: /\nUser-agent: *\nAllow: /\n');
    const otherBotGroup = selectRobotsGroup(otherBot, 'AutoFE-Research-Bot');
    check(
      'F9 a different bot token does not match our product token',
      otherBotGroup.matchedAgent === '*' && decideRobotsAccess(otherBotGroup, 'http://example.com/x').allowed === true,
      `matchedAgent=${otherBotGroup.matchedAgent} allowed=${decideRobotsAccess(otherBotGroup, 'http://example.com/x').allowed}`,
    );

    const exactToken = parseRobotsTxt('User-agent: AutoFE-Research-Bot\nDisallow: /blocked\nUser-agent: *\nAllow: /\n');
    const exactGroup = selectRobotsGroup(exactToken, 'AutoFE-Research-Bot');
    check(
      'F9 our own product token still matches',
      exactGroup.matchedAgent === 'autofe-research-bot' && decideRobotsAccess(exactGroup, 'http://example.com/blocked').allowed === false,
      `matchedAgent=${exactGroup.matchedAgent}`,
    );

    const plain = parseRobotsTxt('User-agent: *\nDisallow: /private/\n');
    const plainDecision = decideRobotsAccess(selectRobotsGroup(plain, 'AutoFE-Research-Bot'), 'http://example.com/private/x');
    check('F9 plain disallow still blocks', plainDecision.allowed === false, `rule=${plainDecision.rule}`);
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    server.close();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }

  const failed = results.filter((result) => !result.passed);
  process.stdout.write(`\n${results.length - failed.length}/${results.length} guard checks passed\n`);
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`guard test error: ${error.stack ?? error.message}\n`);
  process.exit(1);
});
