// Per-page capture: navigate -> freeze -> screenshots -> DOM/a11y/JSON-LD/geometry.
//
// Output layout per page (corpus/<site>/<page>/):
//   meta.json, dom.html, a11y.json, jsonld.json, full.png, viewport.png, nodes.json

import fs from 'node:fs';
import path from 'node:path';

import { analyzeDom, extractStructuredData, serializeCleanedDom } from './inpage.mjs';
import { fileSize, firstLine, nowIso, writeJson, writeText } from './util.mjs';

// Capture-time deterministic rendering: animations/transitions off, light colour scheme,
// scroll-behavior auto. Recorded in meta.normalizations so it is never silent.
export const FREEZE_CSS = [
  '*,*::before,*::after{',
  'animation-delay:0s!important;animation-duration:0s!important;animation-iteration-count:1!important;',
  'transition-delay:0s!important;transition-duration:0s!important;',
  'caret-color:transparent!important;scroll-behavior:auto!important;',
  '}',
].join('');

export const NORMALIZATIONS = ['reduced-motion', 'animation-freeze', 'color-scheme-light', 'scroll-to-top'];

export const FREEZE_STYLE_MARKER = 'data-af-freeze';

// Runs before any page script so animations/transitions never progress: without this the
// freeze would land at a different animation offset on every run. The style tag is dropped
// by the DOM cleaner together with all other <style> elements.
export function installFreezeStyle(css) {
  const apply = () => {
    if (!document.documentElement) return;
    if (document.querySelector('style[data-af-freeze]')) return;
    const style = document.createElement('style');
    style.setAttribute('data-af-freeze', '1');
    style.textContent = css;
    document.documentElement.appendChild(style);
  };
  apply();
  document.addEventListener('DOMContentLoaded', apply, { once: true });
}

export const ARTIFACT_FILES = ['meta.json', 'dom.html', 'a11y.json', 'jsonld.json', 'full.png', 'viewport.png', 'nodes.json'];

// CDP assigns accessibility node ids in allocation order, which is not stable across
// runs (observed: identical tree, ids shifted by one). IDs are therefore re-assigned in
// pre-order DFS so a11y.json is byte-stable for identical renders while the tree shape and
// child order stay exactly as the browser reported them.
export function serializeAxTree(axNodes, backendIndex = new Map(), cleanedIndexByRaw = []) {
  const byId = new Map(axNodes.map((node) => [node.nodeId, node]));
  const roots = axNodes.filter((node) => !node.parentId || !byId.has(node.parentId));
  const ordered = [];
  const seen = new Set();
  const visit = (node) => {
    if (!node || seen.has(node.nodeId)) return;
    seen.add(node.nodeId);
    ordered.push(node);
    for (const childId of node.childIds ?? []) visit(byId.get(childId));
  };
  for (const root of roots) visit(root);
  for (const node of axNodes) visit(node); // safety net for nodes unreachable via childIds

  const newId = new Map(ordered.map((node, index) => [node.nodeId, `ax${index + 1}`]));
  const nodes = ordered.map((node) => ({
    id: newId.get(node.nodeId),
    parentId: node.parentId && newId.has(node.parentId) ? newId.get(node.parentId) : null,
    ignored: Boolean(node.ignored),
    role: node.role?.value ?? null,
    name: node.name?.value ?? null,
    description: node.description?.value ?? null,
    value: node.value?.value ?? null,
    properties: Array.isArray(node.properties)
      ? node.properties.map((property) => ({ name: property.name, value: property.value?.value ?? null }))
      : [],
    // Position of the element in the cleaned DOM (i.e. an index into dom.html's element
    // order). CDP's own backendDOMNodeId is allocated as the DOM is built and is not
    // run-stable, and the raw element index shifts when a page injects a script, so neither
    // is stored.
    domIndex:
      node.backendDOMNodeId === undefined
        ? null
        : (() => {
            const raw = backendIndex.get(node.backendDOMNodeId);
            return raw === undefined ? null : cleanedIndexByRaw[raw] ?? null;
          })(),
    childIds: (node.childIds ?? []).filter((childId) => newId.has(childId)).map((childId) => newId.get(childId)),
  }));

  return {
    source: 'CDP Accessibility.getFullAXTree',
    semantics: 'trimmed to id/parentId/childIds/ignored/role/name/description/value/properties/domIndex',
    idNormalization: 'ids re-assigned in pre-order DFS (CDP allocation order is not run-stable); child order preserved',
    domIndexDefinition: 'position among the elements that survive cleaning = index into dom.html element order; visible nodes in nodes.json appear in this same relative order',
    count: nodes.length,
    rootId: nodes[0]?.id ?? null,
    nodes,
  };
}

// backendNodeId -> index in the `document.querySelectorAll('*')` order, recovered from
// the data-af-node markers set by analyzeDom().
export function buildBackendIndex(domRoot) {
  const map = new Map();
  const stack = [domRoot];
  while (stack.length) {
    const node = stack.pop();
    if (node.backendNodeId !== undefined && Array.isArray(node.attributes)) {
      for (let i = 0; i < node.attributes.length; i += 2) {
        if (node.attributes[i] === 'data-af-node') {
          map.set(node.backendNodeId, Number(node.attributes[i + 1]));
          break;
        }
      }
    }
    if (Array.isArray(node.children)) stack.push(...node.children);
    if (Array.isArray(node.shadowRoots)) stack.push(...node.shadowRoots);
    if (node.contentDocument) stack.push(node.contentDocument);
  }
  return map;
}

// Attach real accessibility role/name to each node record (fallback: in-page approximations).
export function applyAxToNodes(nodes, backendIndex, axNodes) {
  const byDomIndex = new Map();
  for (const ax of axNodes) {
    const backendId = ax.backendDOMNodeId;
    if (backendId === undefined) continue;
    const domIndex = backendIndex.get(backendId);
    if (domIndex === undefined) continue;
    const candidate = {
      ignored: Boolean(ax.ignored),
      role: ax.role?.value ?? null,
      name: ax.name?.value ?? null,
    };
    const previous = byDomIndex.get(domIndex);
    if (!previous || (previous.ignored && !candidate.ignored)) byDomIndex.set(domIndex, candidate);
  }

  let matched = 0;
  for (const node of nodes) {
    const ax = byDomIndex.get(node._index);
    if (!ax) {
      node.role = node._implicitRole ?? null;
      continue;
    }
    matched += 1;
    const axRole = ax.role && ax.role !== 'none' ? ax.role : null;
    node.role = axRole ?? node._implicitRole ?? null;
    if (ax.name) node.name = ax.name;
  }
  return matched;
}

export function finalizeNodes(nodes) {
  return nodes.map((node) => ({
    domPath: node.domPath,
    tag: node.tag,
    role: node.role,
    name: node.name,
    text: node.text,
    bbox: node.bbox,
    styles: node.styles,
    visible: node.visible,
  }));
}

async function navigateWithRetry(browserPage, url, { throttle, timeoutMs, attempts, errors }) {
  const host = new URL(url).host;
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    await throttle.wait(host);
    try {
      const response = await browserPage.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
      return { response, attempt };
    } catch (error) {
      lastError = error;
      errors.push(`navigation attempt ${attempt}/${attempts}: ${firstLine(error.message)}`);
    }
  }
  throw lastError;
}

export function createCaptureLogger(enabled) {
  return (message) => {
    if (enabled) process.stderr.write(`${message}\n`);
  };
}

export async function capturePage({ context, job, corpusDir, throttle, robots, userAgent, options, log = () => {} }) {
  const { site, page } = job;
  const startedAt = Date.now();
  const outDir = path.join(corpusDir, site.slug, page.slug);
  const errors = [];
  const result = {
    site: site.slug,
    page: page.slug,
    archetype: page.archetype,
    url: page.url,
    outDir: path.relative(process.cwd(), outDir),
    status: 'failed',
    reason: null,
  };

  const access = await robots.check(page.url, { maxCrawlDelayMs: options.maxCrawlDelayMs });
  if (!access.allowed) {
    result.reason = access.reason;
    result.detail = access.detail ?? null;
    result.failures = [
      {
        stage: 'robots',
        reason: access.reason,
        message: access.detail ?? access.reason,
        url: page.url,
        // A directory may already exist from an earlier successful run; it is not from this run.
        partialArtifacts: fs.existsSync(outDir),
        staleArtifactsFromEarlierRun: fs.existsSync(outDir),
      },
    ];
    return result;
  }

  let browserPage = null;
  try {
    browserPage = await context.newPage();
    browserPage.setDefaultTimeout(options.navTimeoutMs);
    await browserPage.addInitScript(installFreezeStyle, FREEZE_CSS);
    browserPage.on('pageerror', (error) => {
      if (errors.length < 25) errors.push(`pageerror: ${firstLine(error.message)}`);
    });
    browserPage.on('console', (message) => {
      if (message.type() === 'error' && errors.length < 25) {
        errors.push(`console.error: ${firstLine(message.text())}`);
      }
    });
    browserPage.on('requestfailed', (request) => {
      const failure = request.failure();
      const text = failure ? failure.errorText : 'unknown';
      if (/ERR_ABORTED/.test(text)) return;
      if (errors.length < 25) errors.push(`requestfailed: ${request.url().slice(0, 200)} (${text})`);
    });

    const navStartedAt = Date.now();
    let response;
    try {
      ({ response } = await navigateWithRetry(browserPage, page.url, {
        throttle,
        timeoutMs: options.navTimeoutMs,
        attempts: options.navRetries,
        errors,
      }));
    } catch (error) {
      result.reason = 'navigation_failed';
      result.detail = firstLine(error.message);
      result.failures = [
        {
          stage: 'navigation',
          reason: 'navigation_failed',
          message: firstLine(error.message),
          url: page.url,
          partialArtifacts: fs.existsSync(outDir),
          staleArtifactsFromEarlierRun: fs.existsSync(outDir),
        },
      ];
      return result;
    }
    const navigationMs = Date.now() - navStartedAt;
    const httpStatus = response ? response.status() : null;

    await browserPage.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
    await browserPage.waitForLoadState('networkidle', { timeout: options.networkIdleTimeoutMs }).catch(() => {});
    await browserPage
      .evaluate(() => (document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true))
      .catch(() => {});
    await browserPage.waitForTimeout(options.settleMs);

    if (httpStatus !== null && httpStatus >= 400) {
      result.reason = 'http_error';
      result.detail = `HTTP ${httpStatus}`;
      result.httpStatus = httpStatus;
      result.failures = [{ stage: 'navigation', reason: 'http_error', message: `HTTP ${httpStatus}`, url: browserPage.url() }];
      return result;
    }

    const finalUrl = browserPage.url();

    // Reset scroll and confirm the init-script freeze actually applied.
    const freezeApplied = await browserPage
      .evaluate(() => Boolean(document.querySelector('style[data-af-freeze]')))
      .catch(() => false);
    if (!freezeApplied) {
      await browserPage.addStyleTag({ content: FREEZE_CSS }).catch(() => {});
      errors.push('animation freeze had to be injected after load (init script did not apply)');
    }
    await browserPage.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
    await browserPage.waitForTimeout(120);

    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });

    const fullPng = path.join(outDir, 'full.png');
    const viewportPng = path.join(outDir, 'viewport.png');
    const failures = [];
    try {
      await browserPage.screenshot({ path: viewportPng, fullPage: false });
    } catch (error) {
      errors.push(`viewport screenshot failed: ${firstLine(error.message)}`);
      failures.push({ stage: 'screenshot', reason: 'viewport_screenshot_failed', message: firstLine(error.message), url: finalUrl });
    }
    try {
      await browserPage.screenshot({ path: fullPng, fullPage: true });
    } catch (error) {
      errors.push(`full-page screenshot failed: ${firstLine(error.message)}`);
      failures.push({ stage: 'screenshot', reason: 'fullpage_screenshot_failed', message: firstLine(error.message), url: finalUrl });
    }
    await browserPage.evaluate(() => window.scrollTo(0, 0)).catch(() => {});

    // Element order is fixed by analyzeDom(): it tags every element with data-af-node and
    // drops unrendered ones from the cleaned DOM. The accessibility tree is fetched after
    // that so its backendDOMNodeIds can be resolved back to the same element order.
    const analysis = await browserPage.evaluate(analyzeDom);

    const session = await context.newCDPSession(browserPage);
    let axNodesRaw = [];
    let axTree = { source: 'CDP Accessibility.getFullAXTree', count: 0, nodes: [] };
    let backendIndex = new Map();
    try {
      const { nodes: axNodes } = await session.send('Accessibility.getFullAXTree');
      axNodesRaw = axNodes;
      const { root } = await session.send('DOM.getDocument', { depth: -1, pierce: true });
      backendIndex = buildBackendIndex(root);
      axTree = serializeAxTree(axNodes, backendIndex, analysis.cleanedIndexByRaw);
    } catch (error) {
      errors.push(`accessibility snapshot failed: ${firstLine(error.message)}`);
      failures.push({ stage: 'a11y', reason: 'a11y_snapshot_failed', message: firstLine(error.message), url: finalUrl });
    } finally {
      await session.detach().catch(() => {});
    }

    const axMatched = applyAxToNodes(analysis.nodes, backendIndex, axNodesRaw);
    const nodes = finalizeNodes(analysis.nodes);

    // Quality guards — a rendered-but-empty page is a capture failure, never a success.
    const qualityFlags = [];
    const bodyTextLength = analysis.document.bodyTextLength;
    if (
      nodes.length < options.minVisibleNodes ||
      (bodyTextLength < options.minBodyTextLength && nodes.length < 100)
    ) {
      qualityFlags.push('suspicious_empty_render');
      failures.push({
        stage: 'render',
        reason: 'suspicious_empty_render',
        message: `visibleNodes=${nodes.length} bodyTextLength=${bodyTextLength}`,
        url: finalUrl,
        partialArtifacts: true,
      });
    }
    const sourceHost = new URL(page.url).host;
    const finalHost = new URL(finalUrl).host;
    if (finalHost !== sourceHost) {
      failures.push({
        stage: 'navigation',
        reason: 'cross_host_redirect',
        message: `${sourceHost} -> ${finalHost}`,
        url: finalUrl,
      });
    }

    const structured = await browserPage.evaluate(extractStructuredData);
    const cleanedDom = await browserPage.evaluate(serializeCleanedDom);

    const title = await browserPage.title();
    writeText(path.join(outDir, 'dom.html'), `<!DOCTYPE html>\n${cleanedDom}\n`);
    writeJson(path.join(outDir, 'nodes.json'), nodes);
    writeJson(path.join(outDir, 'a11y.json'), axTree);
    writeJson(path.join(outDir, 'jsonld.json'), { url: finalUrl, count: structured.blocks.length, blocks: structured.blocks });

    const meta = {
      url: page.url,
      redirectedUrl: finalUrl,
      capturedAt: nowIso(),
      title,
      viewport: { w: options.viewport.width, h: options.viewport.height },
      userAgent,
      status: httpStatus,
      errors,
      site: site.slug,
      page: page.slug,
      archetype: page.archetype,
      robots: access.robots ?? null,
      crawlDelaySeconds: access.crawlDelaySeconds ?? null,
      effectiveHostDelayMs: throttle.delayFor(new URL(finalUrl).host),
      context: {
        locale: options.locale,
        timezoneId: options.timezoneId,
        colorScheme: 'light',
        reducedMotion: 'reduce',
        deviceScaleFactor: 1,
      },
      normalizations: NORMALIZATIONS,
      qualityFlags,
      document: analysis.document,
      counts: {
        domElements: analysis.total,
        cleanedElements: analysis.cleanedElements,
        droppedFromDom: analysis.droppedFromDom,
        visibleNodes: nodes.length,
        axNodes: axTree.count,
        axMatchedNodes: axMatched,
        jsonLdAndMicrodataBlocks: structured.blocks.length,
      },
      timings: {
        navigationMs,
        totalMs: Date.now() - startedAt,
      },
    };
    writeJson(path.join(outDir, 'meta.json'), meta);

    result.status = qualityFlags.includes('suspicious_empty_render')
      ? 'failed'
      : failures.length
        ? 'partial'
        : 'ok';
    result.reason = failures.length ? failures[0].reason : null;
    result.qualityFlags = qualityFlags;
    result.httpStatus = httpStatus;
    result.redirectedUrl = finalUrl;
    result.counts = meta.counts;
    result.screenshot = { full: fileSize(fullPng), viewport: fileSize(viewportPng) };
    result.artifacts = ARTIFACT_FILES.filter((name) => fs.existsSync(path.join(outDir, name)));
    result.durationMs = meta.timings.totalMs;
    result.failures = failures;
    return result;
  } catch (error) {
    result.reason = 'capture_failed';
    result.detail = firstLine(error.message);
    result.failures = [
      { stage: 'capture', reason: 'capture_failed', message: firstLine(error.message), url: page.url, partialArtifacts: fs.existsSync(outDir) },
    ];
    return result;
  } finally {
    if (browserPage) await browserPage.close().catch(() => {});
  }
}
