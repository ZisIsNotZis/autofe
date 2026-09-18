// Per-page capture: navigate -> robots re-check on the final URL -> freeze -> screenshots
// -> DOM/a11y/JSON-LD/geometry.
//
// Output layout per page (corpus/<site>/<page>/):
//   meta.json, dom.html, a11y.json, jsonld.json, full.png, viewport.png, nodes.json

import fs from 'node:fs';
import path from 'node:path';

import { analyzeDom, extractStructuredData, retagMarkers, extractCleanedDom, waitForDomQuiescence } from './inpage.mjs';
import { fileSize, firstLine, nowIso, withTimeout, writeJson, writeJsonCompact, writeText } from './util.mjs';

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

// Threshold below which the a11y join is considered low-fidelity and flagged explicitly.
export const AX_COVERAGE_LOW_RATIO = 0.6;
// Elements that appear only after the analysis pass (re-render) above this share of the DOM
// are flagged: ids still join, but the capture is of a moving page.
export const DOM_CHANGE_FLAG_RATIO = 0.01;

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

// A failed capture must never leave artifacts from an earlier run behind that failures.json
// could be misread as this run's output.
function discardArtifacts(outDir) {
  const hadStaleArtifacts = fs.existsSync(outDir);
  if (hadStaleArtifacts) {
    fs.rmSync(outDir, { recursive: true, force: true });
    // Leave no empty site directory behind either.
    try {
      fs.rmdirSync(path.dirname(outDir));
    } catch {
      /* site directory still holds other pages */
    }
  }
  return hadStaleArtifacts;
}

function terminalFailure({ stage, reason, message, url, outDir, extra = {} }) {
  const hadStaleArtifacts = discardArtifacts(outDir);
  return {
    stage,
    reason,
    message,
    url,
    partialArtifacts: false,
    discardedStaleArtifacts: hadStaleArtifacts,
    ...extra,
  };
}

// CDP assigns accessibility node ids in allocation order, which is not stable across
// runs (observed: identical tree, ids shifted by one). IDs are therefore re-assigned in
// pre-order DFS so a11y.json is byte-stable for identical renders while the tree shape and
// child order stay exactly as the browser reported them.
export function serializeAxTree(axNodes, markerIndex = new Map(), indexById = {}, frameScope = null) {
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

  // Document scope: only the main frame is persisted. Frame AX content has no entry in
  // nodes.json/dom.html (the top document is what we walk), and a third-party frame's content is
  // content we did not ask to crawl. Nodes attributed to any other frame are dropped here;
  // the pages that embed cross-origin frames are flagged by the caller (qualityFlags).
  const frameById = new Map((frameScope?.frames ?? []).map((frame) => [frame.frameId, frame]));
  const frameExclusions = new Map();
  const survivors = ordered.filter((node) => {
    if (!frameScope || !node.frameId || node.frameId === frameScope.mainFrameId) return true;
    const frame = frameById.get(node.frameId) ?? { frameId: node.frameId, url: null, origin: null, crossOrigin: null };
    // Keyed by frameId internally, but only stable fields are persisted: CDP frame ids differ
    // between runs, which would make a11y.json non-reproducible.
    const entry = frameExclusions.get(node.frameId) ?? { url: frame.url, origin: frame.origin, crossOrigin: frame.crossOrigin, axNodesExcluded: 0 };
    entry.axNodesExcluded += 1;
    frameExclusions.set(node.frameId, entry);
    return false;
  });

  const newId = new Map(survivors.map((node, index) => [node.nodeId, `ax${index + 1}`]));
  const nodes = survivors.map((node) => {
    const marker = node.backendDOMNodeId === undefined ? null : markerIndex.get(node.backendDOMNodeId) ?? null;
    const properties = Array.isArray(node.properties)
      ? node.properties
          .map((property) => ({ name: property.name, value: property.value?.value ?? null }))
          .filter((property) => property.value !== null && property.value !== undefined)
      : [];
    const childIds = (node.childIds ?? []).filter((childId) => newId.has(childId)).map((childId) => newId.get(childId));
    // Fields with no content are omitted (absent === null/empty) to keep a11y.json proportional
    // to the page's semantics rather than to its node count.
    const entry = {
      id: newId.get(node.nodeId),
      parentId: node.parentId && newId.has(node.parentId) ? newId.get(node.parentId) : null,
      ignored: Boolean(node.ignored),
      role: node.role?.value ?? null,
      childIds,
    };
    const name = node.name?.value ?? null;
    const description = node.description?.value ?? null;
    const value = node.value?.value ?? null;
    if (name) entry.name = name;
    if (description) entry.description = description;
    if (value !== null && value !== undefined && value !== '') entry.value = value;
    if (properties.length) entry.properties = properties;
    // domIndex is the element's position in the delivered dom.html (from extractCleanedDom);
    // it is the join key into nodes.json cleanedIndex.
    if (marker && indexById[marker.id] !== undefined) entry.domIndex = indexById[marker.id];
    return entry;
  });

  return {
    source: 'CDP Accessibility.getFullAXTree',
    semantics:
      'trimmed to id,parentId,ignored,role,childIds plus name/description/value/properties/domIndex when non-empty (absent means null/empty)',
    idNormalization: 'ids re-assigned in pre-order DFS (CDP allocation order is not run-stable); child order preserved',
    domIndexDefinition: 'position among the elements that survive cleaning = index into dom.html element order; nodes.json carries the same value as cleanedIndex',
    documentScope: 'main frame only; nodes belonging to another frame are excluded (see framesExcluded)',
    framesExcluded: [...frameExclusions.values()],
    count: nodes.length,
    rootId: nodes[0]?.id ?? null,
    nodes,
  };
}

// backendNodeId -> marker element id, read from the data-af-node markers written by
// analyzeDom()/retagMarkers(). Read through DOM.getDocument in the same CDP session as the AX
// tree, immediately after the markers were re-applied, so both describe the same DOM snapshot.
export function buildMarkerIndex(domRoot) {
  const map = new Map();
  const stack = [domRoot];
  while (stack.length) {
    const node = stack.pop();
    if (node.backendNodeId !== undefined && Array.isArray(node.attributes)) {
      let id = null;
      for (let i = 0; i < node.attributes.length; i += 2) {
        if (node.attributes[i] === 'data-af-node') id = node.attributes[i + 1];
      }
      if (id !== null) map.set(node.backendNodeId, { id });
    }
    if (Array.isArray(node.children)) stack.push(...node.children);
    if (Array.isArray(node.shadowRoots)) stack.push(...node.shadowRoots);
    if (node.contentDocument) stack.push(node.contentDocument);
  }
  return map;
}

// Attach the real accessibility role/name to each node record (fallback: in-page
// approximations). Matching is by element id, so a re-render cannot shift the join.
export function applyAxToNodes(nodes, markerIndex, axNodes) {
  const byMarkerId = new Map();
  for (const ax of axNodes) {
    const marker = ax.backendDOMNodeId === undefined ? null : markerIndex.get(ax.backendDOMNodeId) ?? null;
    if (!marker) continue;
    const candidate = { ignored: Boolean(ax.ignored), role: ax.role?.value ?? null, name: ax.name?.value ?? null };
    const previous = byMarkerId.get(marker.id);
    if (!previous || (previous.ignored && !candidate.ignored)) byMarkerId.set(marker.id, candidate);
  }

  let matched = 0;
  for (const node of nodes) {
    const ax = byMarkerId.get(node._id);
    if (!ax) {
      // No AX node: keep the author's explicit role attribute before falling back to the
      // implicit tag mapping.
      node.role = node.role ?? node._implicitRole ?? null;
      continue;
    }
    matched += 1;
    const axRole = ax.role && ax.role !== 'none' ? ax.role : null;
    node.role = axRole ?? node.role ?? node._implicitRole ?? null;
    if (ax.name) node.name = ax.name;
  }
  return matched;
}

// nodes.json fields (spec set + the two join keys, see README "join keys"):
//   cleanedPath/cleanedIndex resolve in the delivered dom.html (paths come from parsing it);
//   domPath resolves in the live DOM.
// Nodes with no position in the parsed dom.html (an ad-descendant, or markup the HTML parser
// dropped) are excluded rather than emitted with an unresolvable path; the count is recorded.
export function finalizeNodes(nodes, cleaned) {
  const out = [];
  let withoutDomPath = 0;
  for (const node of nodes) {
    const cleanedIndex = cleaned.indexById[node._id];
    if (cleanedIndex === undefined) {
      withoutDomPath += 1;
      continue;
    }
    out.push({
      domPath: node.domPath,
      cleanedPath: cleaned.pathById[node._id] ?? null,
      cleanedIndex,
      tag: node.tag,
      role: node.role,
      name: node.name,
      text: node.text,
      bbox: node.bbox,
      styles: node.styles,
      visible: node.visible,
    });
  }
  return { nodes: out, withoutDomPath };
}

// Per-page artifact cap: keeps the corpus manageable by shrinking the JSON artifacts only.
// The PNG pair is the alignment anchor and is never modified. Pages that stay above the cap
// after every mitigation are kept in full and flagged (qualityFlags: artifact_cap_exceeded).
export function applyArtifactCap({ nodes, axTree, fixedBytes, capBytes }) {
  // Measured the same way the files are written (compact), otherwise the ladder mis-triggers.
  const jsonBytes = (value) => Buffer.byteLength(`${JSON.stringify(value)}\n`, 'utf8');
  const measure = (candidateNodes, candidateAx) => jsonBytes(candidateNodes) + jsonBytes(candidateAx) + fixedBytes;

  let nodesOut = nodes;
  let axOut = axTree;
  const mitigations = [];
  let totalBytes = measure(nodesOut, axOut);
  if (capBytes <= 0 || totalBytes <= capBytes) {
    return { nodes: nodesOut, a11y: axOut, mitigations, projectedBytes: totalBytes, exceeded: false };
  }

  for (const tier of [200, 64]) {
    nodesOut = nodesOut.map((node) => (node.text.length > tier ? { ...node, text: node.text.slice(0, tier) } : node));
    mitigations.push(`nodeTextCappedAt${tier}Chars`);
    totalBytes = measure(nodesOut, axOut);
    if (totalBytes <= capBytes) break;
  }

  if (totalBytes > capBytes) {
    const trimmed = axTree.nodes.map((node) =>
      node.ignored
        ? {
            id: node.id,
            parentId: node.parentId,
            ignored: true,
            role: node.role,
            childIds: node.childIds,
            ...(node.domIndex === undefined ? {} : { domIndex: node.domIndex }),
          }
        : node,
    );
    axOut = {
      ...axTree,
      a11yTrim: 'ignored nodes reduced to id/parentId/childIds/role/domIndex',
      nodes: trimmed,
    };
    mitigations.push('a11yIgnoredNodesTrimmed');
    totalBytes = measure(nodesOut, axOut);
  }

  return { nodes: nodesOut, a11y: axOut, mitigations, projectedBytes: totalBytes, exceeded: totalBytes > capBytes };
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
  let pageErrorCount = 0;
  // Main-frame navigations seen after the initial load (evidence for the pre-write URL re-check).
  const navigationLog = [];
  // The site's own stylesheets/scripts that failed to load: those change the render (observed: a
  // docs page whose CSS failed captured as an unstyled 13k-px page and was reported "ok").
  const assetLoadFailures = [];
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
    const failure = terminalFailure({
      stage: 'robots',
      reason: access.reason,
      message: access.detail ?? access.reason,
      url: page.url,
      outDir,
    });
    result.discardedStaleArtifacts = failure.discardedStaleArtifacts;
    result.failures = [failure];
    return result;
  }

  let browserPage = null;
  try {
    browserPage = await context.newPage();
    browserPage.setDefaultTimeout(options.navTimeoutMs);
    await browserPage.addInitScript(installFreezeStyle, FREEZE_CSS);
    browserPage.on('pageerror', (error) => {
      pageErrorCount += 1;
      if (errors.length < 25) errors.push(`pageerror: ${firstLine(error.message)}`);
    });
    browserPage.on('console', (message) => {
      if (message.type() === 'error' && errors.length < 25) {
        errors.push(`console.error: ${firstLine(message.text())}`);
      }
    });
    browserPage.on('framenavigated', (frame) => {
      if (frame !== browserPage.mainFrame()) return;
      if (navigationLog.length < 10) navigationLog.push(frame.url());
    });
    // A same-host stylesheet/script that fails at the network layer OR comes back with an error
    // status degrades the render (observed: a docs page whose CSS did not load captured as an
    // unstyled 13k-px page and was reported "ok"). Both paths feed the same counter.
    const recordAssetFailure = (url, type, error) => {
      try {
        if (new URL(url).host !== new URL(page.url).host) return;
      } catch {
        return;
      }
      if (assetLoadFailures.some((failure) => failure.url === url)) return;
      if (assetLoadFailures.length < 10) assetLoadFailures.push({ url: url.slice(0, 300), type, error });
    };
    browserPage.on('response', (response) => {
      if (response.status() < 400) return;
      const type = response.request().resourceType();
      if (type !== 'stylesheet' && type !== 'script') return;
      recordAssetFailure(response.url(), type, `HTTP ${response.status()}`);
    });
    browserPage.on('requestfailed', (request) => {
      const failure = request.failure();
      const text = failure ? failure.errorText : 'unknown';
      if (/ERR_ABORTED/.test(text)) return;
      if (errors.length < 25) errors.push(`requestfailed: ${request.url().slice(0, 200)} (${text})`);
      const type = request.resourceType();
      if (type !== 'stylesheet' && type !== 'script') return;
      recordAssetFailure(request.url(), type, text);
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
      const failure = terminalFailure({
        stage: 'navigation',
        reason: 'navigation_failed',
        message: firstLine(error.message),
        url: page.url,
        outDir,
      });
      result.discardedStaleArtifacts = failure.discardedStaleArtifacts;
      result.failures = [failure];
      return result;
    }
    const navigationMs = Date.now() - navStartedAt;
    const httpStatus = response ? response.status() : null;

    await browserPage.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
    // Let the renderer settle before reading anything: a quiet DOM is a much better readiness
    // signal than a fixed sleep when the network is slow.
    await withTimeout(
      browserPage.evaluate(waitForDomQuiescence, options.quiescenceMs, options.quiescenceMaxMs),
      options.quiescenceMaxMs + 5000,
      'DOM quiescence',
    ).catch(() => {});
    await browserPage.waitForLoadState('networkidle', { timeout: options.networkIdleTimeoutMs }).catch(() => {});
    // document.fonts.ready never settling (a hung font request) would otherwise stall the run.
    await withTimeout(
      browserPage.evaluate(() => (document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true)),
      options.fontsTimeoutMs,
      'document.fonts.ready',
    ).catch(() => {});
    await browserPage.waitForTimeout(options.settleMs);

    const finalUrl = browserPage.url();

    // robots is checked per request, not per seed entry: a redirect must not be used to land
    // on a path or host we were told not to fetch. Nothing is written before this point.
    const redirectChain = finalUrl !== page.url;
    if (redirectChain) {
      const finalAccess = await robots.check(finalUrl, { maxCrawlDelayMs: options.maxCrawlDelayMs });
      if (!finalAccess.allowed) {
        result.reason = 'robots_redirect_disallowed';
        result.detail = `${page.url} -> ${finalUrl} (${finalAccess.reason}${finalAccess.rule ? `: ${finalAccess.rule}` : ''})`;
        const failure = terminalFailure({
          stage: 'robots',
          reason: 'robots_redirect_disallowed',
          message: result.detail,
          url: finalUrl,
          outDir,
          extra: {
            requestedUrl: page.url,
            rule: finalAccess.rule ?? null,
            redirectRule: finalAccess.rule ?? null,
            redirectDetail: finalAccess.detail ?? null,
          },
        });
        result.discardedStaleArtifacts = failure.discardedStaleArtifacts;
        result.failures = [failure];
        return result;
      }
    }

    if (httpStatus !== null && httpStatus >= 400) {
      result.reason = 'http_error';
      result.detail = `HTTP ${httpStatus}`;
      result.httpStatus = httpStatus;
      const failure = terminalFailure({
        stage: 'navigation',
        reason: 'http_error',
        message: `HTTP ${httpStatus}`,
        url: finalUrl,
        outDir,
      });
      result.discardedStaleArtifacts = failure.discardedStaleArtifacts;
      result.failures = [failure];
      return result;
    }

    // Reset scroll and confirm the init-script freeze actually applied.
    const freezeApplied = await withTimeout(
      browserPage.evaluate(() => Boolean(document.querySelector('style[data-af-freeze]'))),
      options.evaluateTimeoutMs,
      'freeze probe',
    ).catch(() => false);
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
      await browserPage.screenshot({ path: viewportPng, fullPage: false, timeout: options.screenshotTimeoutMs });
    } catch (error) {
      errors.push(`viewport screenshot failed: ${firstLine(error.message)}`);
      failures.push({ stage: 'screenshot', reason: 'viewport_screenshot_failed', message: firstLine(error.message), url: finalUrl, partialArtifacts: true });
    }
    // Optional full-page height ceiling: keeps very tall pages from dominating the corpus. Off by
    // default; when it bites, the captured height is recorded and the page is flagged.
    const documentHeight = await withTimeout(
      browserPage.evaluate(() => document.documentElement.scrollHeight),
      options.evaluateTimeoutMs,
      'document height probe',
    ).catch(() => null);
    const fullPngTruncated = Boolean(options.maxFullPngHeight) && documentHeight !== null && documentHeight > options.maxFullPngHeight;
    try {
      if (fullPngTruncated) {
        await browserPage.screenshot({
          path: fullPng,
          clip: { x: 0, y: 0, width: options.viewport.width, height: options.maxFullPngHeight },
          timeout: options.screenshotTimeoutMs,
        });
      } else {
        await browserPage.screenshot({ path: fullPng, fullPage: true, timeout: options.screenshotTimeoutMs });
      }
    } catch (error) {
      errors.push(`full-page screenshot failed: ${firstLine(error.message)}`);
      failures.push({ stage: 'screenshot', reason: 'fullpage_screenshot_failed', message: firstLine(error.message), url: finalUrl, partialArtifacts: true });
    }
    await browserPage.evaluate(() => window.scrollTo(0, 0)).catch(() => {});

    // Element order, ids and cleaning decisions come from this pass; the accessibility tree is
    // read next so both describe the same elements.
    const analysis = await withTimeout(browserPage.evaluate(analyzeDom), options.evaluateTimeoutMs, 'DOM analysis');

    const session = await context.newCDPSession(browserPage);
    let axNodesRaw = [];
    let axTree = { source: 'CDP Accessibility.getFullAXTree', count: 0, nodes: [] };
    let markerIndex = new Map();
    let retagged = { addedTotal: 0, addedRendered: 0 };
    let frameScope = null;
    try {
      const { nodes: axNodes } = await withTimeout(session.send('Accessibility.getFullAXTree'), options.cdpTimeoutMs, 'Accessibility.getFullAXTree');
      axNodesRaw = axNodes;
      // Frame tree: the a11y tree is scoped to the main frame, and pages embedding third-party
      // frames are flagged rather than having that content persisted.
      try {
        const { frameTree } = await withTimeout(session.send('Page.getFrameTree'), options.cdpTimeoutMs, 'Page.getFrameTree');
        const pageOrigin = (() => { try { return new URL(finalUrl).origin; } catch { return null; } })();
        const frames = [];
        const collect = (tree, depth) => {
          const frameUrl = tree.frame.url || null;
          let origin = null;
          try { origin = frameUrl ? new URL(frameUrl).origin : null; } catch { origin = null; }
          frames.push({
            frameId: tree.frame.id,
            parentFrameId: tree.frame.parentId ?? null,
            depth,
            url: frameUrl ? frameUrl.slice(0, 300) : null,
            origin: origin === 'null' ? null : origin,
            crossOrigin: depth > 0 && origin !== null && pageOrigin !== null && origin !== pageOrigin,
          });
          for (const child of tree.childFrames ?? []) collect(child, depth + 1);
        };
        collect(frameTree, 0);
        frameScope = { mainFrameId: frameTree.frame.id, frames };
      } catch (error) {
        errors.push(`frame tree read failed: ${firstLine(error.message)}`);
      }
      // Re-tag immediately before reading the DOM: anything that appeared after analyzeDom()
      // gets a marker, so the join cannot silently lose elements to a re-render.
      retagged = await withTimeout(browserPage.evaluate(retagMarkers), options.evaluateTimeoutMs, 'marker retag');
      const { root } = await withTimeout(
        session.send('DOM.getDocument', { depth: -1, pierce: true }),
        options.cdpTimeoutMs,
        'DOM.getDocument',
      );
      markerIndex = buildMarkerIndex(root);
    } catch (error) {
      errors.push(`accessibility snapshot failed: ${firstLine(error.message)}`);
      failures.push({ stage: 'a11y', reason: 'a11y_snapshot_failed', message: firstLine(error.message), url: finalUrl, partialArtifacts: true });
    } finally {
      await session.detach().catch(() => {});
    }

    // Paths come from parsing the cleaned DOM we are about to write, so they resolve in it.
    const cleaned = await withTimeout(
      browserPage.evaluate(extractCleanedDom, analysis.nodes.map((node) => node._id)),
      options.evaluateTimeoutMs,
      'cleaned DOM extraction',
    );
    if (axNodesRaw.length) axTree = serializeAxTree(axNodesRaw, markerIndex, cleaned.indexById, frameScope);
    const crossOriginFrames = (frameScope?.frames ?? []).filter((frame) => frame.crossOrigin);
    const axMatched = applyAxToNodes(analysis.nodes, markerIndex, axNodesRaw);
    const finalized = finalizeNodes(analysis.nodes, cleaned);
    const nodes = finalized.nodes;
    const visibleNodes = nodes.filter((node) => node.visible).length;
    const axCoverageRatio = nodes.length ? axMatched / nodes.length : 0;

    // Quality guards — a rendered-but-empty page is a capture failure, never a success, and
    // low-fidelity joins are flagged instead of being averaged into the corpus.
    const qualityFlags = [];
    const bodyTextLength = analysis.document.bodyTextLength;
    // Three ways a capture is not a usable page: nothing rendered at all; almost no content; or a
    // page whose scripts threw and which then rendered only a speck (e.g. cn.bing.com home:
    // 36 nodes / 113 chars / 1 pageerror used to slip through the first two rules).
    const renderIsEmpty =
      !nodes.length ||
      (bodyTextLength < options.minBodyTextLength && nodes.length < 100) ||
      (pageErrorCount > 0 && bodyTextLength < options.sparseBodyTextLength && nodes.length < options.sparseNodes);
    if (renderIsEmpty) {
      qualityFlags.push('suspicious_empty_render');
      failures.push({
        stage: 'render',
        reason: 'suspicious_empty_render',
        message: `renderedNodes=${nodes.length} bodyTextLength=${bodyTextLength} pageErrors=${pageErrorCount}`,
        url: finalUrl,
        partialArtifacts: true,
      });
    }
    if (nodes.length >= 50 && axCoverageRatio < AX_COVERAGE_LOW_RATIO) {
      qualityFlags.push('ax_coverage_low');
    }
    // Only laid-out additions count: script/style nodes injected mid-capture are not a DOM change
    // anyone cares about, and a sub-1% loss is still reported through counts.nodesWithoutDomPath.
    if (nodes.length && retagged.addedRendered / nodes.length > DOM_CHANGE_FLAG_RATIO) {
      qualityFlags.push('dom_changed_during_capture');
    }
    if (crossOriginFrames.length) {
      qualityFlags.push('cross_origin_frame');
    }
    if (assetLoadFailures.length) {
      qualityFlags.push('asset_load_failed');
      failures.push({
        stage: 'render',
        reason: 'asset_load_failed',
        message: `${assetLoadFailures.length} same-host stylesheet/script request(s) failed: ${assetLoadFailures
          .slice(0, 3)
          .map((failure) => `${failure.type} ${failure.url} (${failure.error})`)
          .join('; ')}`,
        url: finalUrl,
        partialArtifacts: true,
      });
    }
    // A same-host redirect (trailing slash, param normalisation) is recorded but is not a
    // capture failure; a cross-host redirect changes which site was captured and is recorded as
    // a failure so it cannot hide inside an apparently successful page.
    const sameHostRedirect = finalUrl !== page.url && new URL(finalUrl).host === new URL(page.url).host;
    if (finalUrl !== page.url && !sameHostRedirect) {
      failures.push({
        stage: 'navigation',
        reason: 'cross_host_redirect',
        message: `${page.url} -> ${finalUrl}`,
        url: finalUrl,
        // The target was robots-checked above; the capture itself is kept.
        partialArtifacts: true,
      });
    }

    const structured = await withTimeout(browserPage.evaluate(extractStructuredData), options.evaluateTimeoutMs, 'structured data extraction');

    // TOCTOU: `finalUrl` was a snapshot taken before extraction. Re-read the live URL immediately
    // before anything is written; a page that navigated in between must be robots-checked again
    // (and discarded if the new target is disallowed) rather than being stored under the old
    // identity. A `framenavigated` listener records main-frame navigations for evidence.
    let resolvedUrl = finalUrl;
    const urlBeforeWrite = browserPage.url();
    // A same-document anchor change moves browserPage.url() without fetching anything; compare on
    // the URL without its fragment so scrolling/anchor scripts do not read as a late navigation.
    const withoutFragment = (value) => {
      try {
        const parsed = new URL(value);
        parsed.hash = '';
        return parsed.toString();
      } catch {
        return value;
      }
    };
    if (withoutFragment(urlBeforeWrite) !== withoutFragment(finalUrl)) {
      const lateAccess = await robots.check(urlBeforeWrite, { maxCrawlDelayMs: options.maxCrawlDelayMs });
      if (!lateAccess.allowed) {
        result.reason = 'robots_redirect_disallowed';
        result.detail = `late navigation ${finalUrl} -> ${urlBeforeWrite} (${lateAccess.reason}${lateAccess.rule ? `: ${lateAccess.rule}` : ''})`;
        const failure = terminalFailure({
          stage: 'robots',
          reason: 'robots_redirect_disallowed',
          message: result.detail,
          url: urlBeforeWrite,
          outDir,
          extra: {
            requestedUrl: page.url,
            rule: lateAccess.rule ?? null,
            redirectRule: lateAccess.rule ?? null,
            redirectDetail: lateAccess.detail ?? null,
            lateNavigation: true,
            navigationLog,
          },
        });
        result.discardedStaleArtifacts = failure.discardedStaleArtifacts;
        result.failures = [failure];
        return result;
      }
      resolvedUrl = urlBeforeWrite;
      qualityFlags.push('late_navigation');
      failures.push({
        stage: 'navigation',
        reason: 'late_navigation',
        message: `${finalUrl} -> ${urlBeforeWrite} after the robots check (re-checked and allowed)`,
        url: urlBeforeWrite,
        partialArtifacts: true,
      });
    }

    const domHtml = `<!DOCTYPE html>\n${cleaned.html}\n`;
    const jsonld = { url: resolvedUrl, count: structured.blocks.length, blocks: structured.blocks };

    // Artifact cap: JSON only, PNGs untouched (see applyArtifactCap).
    const fixedBytes =
      Buffer.byteLength(domHtml, 'utf8') +
      Buffer.byteLength(`${JSON.stringify(jsonld, null, 2)}\n`, 'utf8') +
      (fileSize(fullPng) ?? 0) +
      (fileSize(viewportPng) ?? 0);
    const capped = applyArtifactCap({ nodes, axTree, fixedBytes, capBytes: options.maxPageBytes });
    if (fullPngTruncated) qualityFlags.push('fullpage_screenshot_truncated');
    if (capped.exceeded) qualityFlags.push('artifact_cap_exceeded');

    const title = await withTimeout(browserPage.title(), options.evaluateTimeoutMs, 'title read').catch(() => '');
    writeText(path.join(outDir, 'dom.html'), domHtml);
    writeJsonCompact(path.join(outDir, 'nodes.json'), capped.nodes);
    writeJsonCompact(path.join(outDir, 'a11y.json'), capped.a11y);
    writeJson(path.join(outDir, 'jsonld.json'), jsonld);

    const artifactBytes = ARTIFACT_FILES.reduce((sum, name) => sum + (fileSize(path.join(outDir, name)) ?? 0), 0);
    const jsonBytes = ['meta.json', 'dom.html', 'a11y.json', 'jsonld.json', 'nodes.json'].reduce(
      (sum, name) => sum + (fileSize(path.join(outDir, name)) ?? 0),
      0,
    );
    const meta = {
      url: page.url,
      redirectedUrl: resolvedUrl,
      capturedAt: nowIso(),
      title,
      viewport: { w: options.viewport.width, h: options.viewport.height },
      userAgent,
      status: httpStatus,
      // Sorted so two runs of the same page produce comparable error lists: console/page events
      // arrive asynchronously and their arrival order is not stable.
      errors: [...errors].sort(),
      site: site.slug,
      page: page.slug,
      archetype: page.archetype,
      robots: access.robots ?? null,
      crawlDelaySeconds: access.crawlDelaySeconds ?? null,
      redirect: {
        requestedUrl: page.url,
        finalUrl: resolvedUrl,
        sameHost: new URL(resolvedUrl).host === new URL(page.url).host,
        redirected: resolvedUrl !== page.url,
        lateNavigation: resolvedUrl !== finalUrl,
        navigationLog,
      },
      // No frameId: CDP frame ids are not run-stable; url/origin identify a frame for a reader.
      assetLoadFailures,
      frames: (frameScope?.frames ?? []).map((frame) => ({
        depth: frame.depth,
        url: frame.url,
        origin: frame.origin,
        crossOrigin: frame.crossOrigin,
      })),
      a11yFramesExcluded: axTree.framesExcluded ?? [],
      effectiveHostDelayMs: throttle.delayFor(new URL(resolvedUrl).host),
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
        cleanedElements: cleaned.elementsInDom,
        droppedFromDom: analysis.droppedFromDom,
        adExcludedNodes: analysis.adExcludedNodes,
        nodesWithoutDomPath: finalized.withoutDomPath,
        domReparseDuplicates: cleaned.duplicates,
        domUnmarkedElements: cleaned.unmarkedElements,
        retaggedElements: retagged.addedTotal,
        retaggedRenderedElements: retagged.addedRendered,
        pageErrors: pageErrorCount,
        assetLoadFailures: assetLoadFailures.length,
        a11yFrameNodesExcluded: (axTree.framesExcluded ?? []).reduce((sum, frame) => sum + frame.axNodesExcluded, 0),
        renderedNodes: nodes.length,
        visibleNodes,
        axNodes: axTree.count,
        axMatchedNodes: axMatched,
        axCoverageRatio: Math.round(axCoverageRatio * 1000) / 1000,
        jsonLdAndMicrodataBlocks: structured.blocks.length,
      },
      artifactCap: {
        maxBytes: options.maxPageBytes,
        totalBytes: artifactBytes,
        jsonBytes,
        imageBytes: artifactBytes - jsonBytes,
        exceeded: capped.exceeded,
        mitigations: capped.mitigations,
        fullPngHeight: {
          maxHeight: options.maxFullPngHeight,
          documentHeight,
          truncated: fullPngTruncated,
        },
      },
      artifactBytes,
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
    result.redirectedUrl = resolvedUrl;
    result.sameHostRedirect = sameHostRedirect;
    result.counts = meta.counts;
    result.artifactBytes = artifactBytes;
    result.artifactCap = meta.artifactCap;
    result.screenshot = { full: fileSize(fullPng), viewport: fileSize(viewportPng) };
    result.artifacts = ARTIFACT_FILES.filter((name) => fs.existsSync(path.join(outDir, name)));
    result.durationMs = meta.timings.totalMs;
    result.failures = failures;
    return result;
  } catch (error) {
    result.reason = 'capture_failed';
    result.detail = firstLine(error.message);
    const failure = terminalFailure({
      stage: 'capture',
      reason: 'capture_failed',
      message: firstLine(error.message),
      url: page.url,
      outDir,
    });
    result.discardedStaleArtifacts = failure.discardedStaleArtifacts;
    result.failures = [failure];
    return result;
  } finally {
    if (browserPage) await browserPage.close().catch(() => {});
  }
}
