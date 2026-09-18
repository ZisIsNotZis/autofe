#!/usr/bin/env node
// Alignment verification for one capture directory. Four independent checks:
//
//  1. domResolution  — every nodes.json entry must resolve in the delivered dom.html. dom.html is
//                      parsed by a real browser and each element's cleaned path + tag is compared
//                      with nodes.json `cleanedPath`. Unresolved paths or tag mismatches are
//                      blockers: without this, nodes.json cannot be joined to the delivered DOM.
//  2. colour grid    — for nodes with a solid opaque background, a 5x5 grid inside the bbox must
//                      match the computed background colour, while same-size controls above and
//                      below must NOT match (otherwise the match proves nothing). Non-matching
//                      candidates are explained: translucent-overlay, ancestor-transparent,
//                      covered-by-later-node, non-discriminating, low-coverage; `unexplained` is
//                      the alarm signal.
//  3. painted feature— for image-like elements (no solid background) the centroid of "ink" inside
//                      the bbox must lie inside the box and the ink extent must stay within a few
//                      px of it. This is what catches a many-px offset on image-heavy pages.
//  4. frame anchor   — viewport.png (captured at scroll 0,0) vs the top of full.png. Below 0.99 is
//                      reported as a warning (full-page capture re-lays out sticky/viewport-fixed
//                      content), never as silent success.
//
// Shift sensitivity: for each matched element the smallest offset its own geometry can detect is
// floor(min(w,h)/2); the page-level value is the minimum over matched candidates, i.e. "alignment
// proven to within X px". A page whose smallest matched element is coarse reports a warning.
//
// Usage:
//   node tools/capture/verify-alignment.mjs corpus/<site>/<page> [options]
//     --max-checked N        colour candidates to examine (default 25)
//     --tolerance N          per-channel tolerance (default 3)
//     --min-discriminating N minimum matched colour candidates for a strong verdict (default 2)
//     --max-shift-sensitivity N  required detection resolution in px (default 16)
//     --min-painted-checks N required painted-feature passes when the page has >=3 painted
//                            candidates (default 1)
//     --feature-tolerance N  allowed ink spill outside the bbox in px (default 6)
//     --no-dom-check         skip the dom.html resolution check (offline/quick runs)
//     --strict-warnings      exit 1 on warnings too
//     --out FILE             write the evidence JSON

import fs from 'node:fs';
import path from 'node:path';

import { decodePng } from './lib/png.mjs';
import { launchBrowser } from './lib/browser.mjs';

// Elements whose pixels come from painted content rather than the CSS background.
const PAINTED_TAGS = new Set(['img', 'svg', 'canvas', 'video', 'iframe', 'picture', 'object', 'embed', 'map', 'area', 'image']);
const BLEND_BASES = [[255, 255, 255], [0, 0, 0]];

// Roles whose implicit-role mapping to a tag is unambiguous; used to cross-check a11y.json's
// domIndex against the parsed dom.html.
const STRICT_ROLE_TAGS = {
  link: ['a', 'area'],
  button: ['button', 'input', 'summary'],
  img: ['img', 'svg', 'image', 'input', 'picture'],
  heading: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  list: ['ul', 'ol', 'menu'],
  listitem: ['li', 'div', 'span'],
  table: ['table'],
  row: ['tr'],
  cell: ['td'],
  columnheader: ['th'],
  rowheader: ['th'],
  textbox: ['input', 'textarea'],
  searchbox: ['input'],
  combobox: ['select', 'input', 'datalist'],
  checkbox: ['input'],
  radio: ['input'],
  slider: ['input'],
  spinbutton: ['input'],
  navigation: ['nav'],
  main: ['main'],
  banner: ['header'],
  contentinfo: ['footer'],
  complementary: ['aside'],
  form: ['form'],
  paragraph: ['p'],
  iframe: ['iframe'],
  listbox: ['select', 'datalist'],
};

function parseArgs(argv) {
  const options = {
    dir: null,
    maxChecked: 25,
    tolerance: 3,
    minDiscriminating: 2,
    maxShiftSensitivity: 16,
    minPaintedChecks: 1,
    featureTolerancePx: 6,
    domCheck: true,
    strictWarnings: false,
    out: null,
    minSize: 20,
    shiftPx: 60,
    // Share of the full-box grid that must match for a candidate to count as aligned. Raised from
    // 0.25: with the 1px inset that value would tolerate a large offset (see shiftDetection).
    minFraction: 0.6,
    // A colour region this close to the computed background counts as the element being there
    // with a subtly different paint (gradient/alpha/AA), not as a misplaced box.
    nearMissDelta: 12,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = () => {
      i += 1;
      if (argv[i] === undefined) throw new Error(`missing value for ${arg}`);
      return argv[i];
    };
    if (arg === '--max-checked') options.maxChecked = Number(value());
    else if (arg === '--tolerance') options.tolerance = Number(value());
    else if (arg === '--min-size') options.minSize = Number(value());
    else if (arg === '--shift') options.shiftPx = Number(value());
    else if (arg === '--min-fraction') options.minFraction = Number(value());
    else if (arg === '--min-discriminating') options.minDiscriminating = Number(value());
    else if (arg === '--max-shift-sensitivity') options.maxShiftSensitivity = Number(value());
    else if (arg === '--min-painted-checks') options.minPaintedChecks = Number(value());
    else if (arg === '--feature-tolerance') options.featureTolerancePx = Number(value());
    else if (arg === '--near-miss-delta') options.nearMissDelta = Number(value());
    else if (arg === '--no-dom-check') options.domCheck = false;
    else if (arg === '--strict-warnings') options.strictWarnings = true;
    else if (arg === '--out') options.out = value();
    else if (!options.dir) options.dir = arg;
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!options.dir) throw new Error('usage: verify-alignment.mjs <page-dir> [options]');
  return options;
}

// Offsets at which the shifted grid is re-sampled, to measure the smallest offset this element
// can actually detect instead of deriving it from a formula.
const SHIFT_LADDER = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64, 96, 128, 192, 256];

function parseColor(value) {
  const match = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\s*\)$/.exec(String(value ?? ''));
  if (!match) return null;
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: match[4] === undefined ? 1 : Number(match[4]) };
}

function channelDelta(a, b) {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
}

function blendOf(expectedRgb, sampledRgb, tolerance) {
  for (const base of BLEND_BASES) {
    for (let step = 99; step >= 5; step -= 1) {
      const alpha = step / 100;
      const blended = expectedRgb.map((channel, index) => channel * alpha + base[index] * (1 - alpha));
      if (channelDelta(sampledRgb, blended) <= tolerance) return { alpha, over: base[0] === 255 ? 'white' : 'black' };
    }
  }
  return null;
}

function sampleGrid(png, box, expectedRgb, tolerance, nearMissDelta = 12) {
  const empty = {
    gridPoints: 0,
    matchingPoints: 0,
    fraction: 0,
    nearPoints: 0,
    nearFraction: 0,
    blendedPoints: 0,
    blendedFraction: 0,
    blend: null,
    minChannelDelta: null,
    centrePixel: null,
  };
  if (box.w < 2 || box.h < 2 || box.y + box.h < 0) return empty;
  // 1px inset: the grid must span the whole box, otherwise a large offset can keep every sample
  // inside a 10%-inset grid and still read as "aligned".
  const insetX = 1;
  const insetY = 1;
  const x0 = box.x + insetX;
  const x1 = box.x + box.w - insetX;
  const y0 = box.y + insetY;
  const y1 = box.y + box.h - insetY;
  const centreX = Math.round((x0 + x1) / 2);
  const centreY = Math.round((y0 + y1) / 2);
  let matchingPoints = 0;
  let nearPoints = 0;
  let blendedPoints = 0;
  let gridPoints = 0;
  let minChannelDelta = null;
  let centrePixel = null;
  let blend = null;
  for (let i = 0; i < 5; i += 1) {
    for (let j = 0; j < 5; j += 1) {
      const x = Math.round(x0 + ((x1 - x0) * i) / 4);
      const y = Math.round(y0 + ((y1 - y0) * j) / 4);
      const pixel = png.pixel(x, y);
      if (!pixel) continue;
      const rgb = pixel.slice(0, 3);
      gridPoints += 1;
      const delta = channelDelta(rgb, expectedRgb);
      minChannelDelta = minChannelDelta === null ? delta : Math.min(minChannelDelta, delta);
      if (delta <= nearMissDelta) nearPoints += 1;
      if (delta <= tolerance) matchingPoints += 1;
      else {
        const found = blendOf(expectedRgb, rgb, tolerance);
        if (found) {
          blendedPoints += 1;
          blend = blend ?? found;
        }
      }
      if (x === centreX && y === centreY) centrePixel = rgb;
    }
  }
  return {
    gridPoints,
    matchingPoints,
    fraction: gridPoints ? matchingPoints / gridPoints : 0,
    nearPoints,
    nearFraction: gridPoints ? nearPoints / gridPoints : 0,
    blendedPoints,
    blendedFraction: gridPoints ? blendedPoints / gridPoints : 0,
    blend,
    minChannelDelta,
    centrePixel,
  };
}

// Two independent facts: how well viewport.png matches the top of full.png (fraction), and where
// the difference is (so a weak anchor can be explained rather than merely reported).
// Smallest offset (px) at which shifting the grid makes the match fraction fall below
// minFraction: this is the real detection threshold of the check for this element.
function measureShiftDetection(png, box, expectedRgb, options) {
  const limit = Math.max(1, Math.floor(Math.min(box.w, box.h)));
  for (const shift of SHIFT_LADDER) {
    if (shift > limit) break;
    const shiftedY = sampleGrid(png, { ...box, y: box.y + shift }, expectedRgb, options.tolerance, options.nearMissDelta);
    if (shiftedY.fraction < options.minFraction) return { measuredPx: shift, axis: 'y', fractionAtDetection: shiftedY.fraction };
    const shiftedX = sampleGrid(png, { ...box, x: box.x + shift }, expectedRgb, options.tolerance, options.nearMissDelta);
    if (shiftedX.fraction < options.minFraction) return { measuredPx: shift, axis: 'x', fractionAtDetection: shiftedX.fraction };
  }
  return { measuredPx: null, axis: null, note: `no shift up to ${limit}px drops the match below ${options.minFraction}` };
}

function frameAnchorCheck(dir, fullPng, options) {
  const viewportPath = path.join(dir, 'viewport.png');
  if (!fs.existsSync(viewportPath)) return { available: false };
  const viewport = decodePng(fs.readFileSync(viewportPath));
  const rows = Math.min(viewport.height, fullPng.height);
  const columns = Math.min(viewport.width, fullPng.width);
  let compared = 0;
  let identical = 0;
  let maxChannelDelta = 0;
  let boundingBox = null;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const a = fullPng.pixel(x, y);
      const b = viewport.pixel(x, y);
      if (!a || !b) continue;
      compared += 1;
      const delta = channelDelta(a, b);
      if (delta <= options.tolerance) identical += 1;
      else {
        if (delta > maxChannelDelta) maxChannelDelta = delta;
        boundingBox = boundingBox
          ? [Math.min(boundingBox[0], x), Math.min(boundingBox[1], y), Math.max(boundingBox[2], x), Math.max(boundingBox[3], y)]
          : [x, y, x, y];
      }
    }
  }
  const identicalFraction = compared ? identical / compared : 0;
  const status = identicalFraction >= 0.99 ? 'strong' : 'weak';
  return {
    available: true,
    status,
    viewportSize: { w: viewport.width, h: viewport.height },
    sampledPixels: compared,
    identicalFraction,
    differingPixels: compared - identical,
    maxChannelDelta,
    diffBoundingBox: boundingBox,
    note:
      status === 'strong'
        ? 'viewport.png (captured at scroll 0,0) matches the top of full.png, i.e. full.png starts at the document origin'
        : `viewport.png and the top of full.png differ in ${((1 - identicalFraction) * 100).toFixed(2)}% of pixels (max channel delta ${maxChannelDelta}). Full-page capture re-lays out viewport-dependent content (sticky/fixed headers, vh sizing, scrollbar reflow), so this anchor is weak for this page; the colour-grid and painted-feature checks are unaffected and carry the alignment claim.`,
  };
}

// Painted-feature check: local background from the ring around the bbox, then the ink centroid
// and ink extent inside the bbox. A systematic bbox offset moves image content outside the box.
function paintedFeatureCheck(png, node, options) {
  const box = node.bbox;
  const pad = 12;
  const ring = {
    x: Math.max(0, box.x - pad),
    y: Math.max(0, box.y - pad),
    w: Math.min(png.width, box.x + box.w + pad) - Math.max(0, box.x - pad),
    h: Math.min(png.height, box.y + box.h + pad) - Math.max(0, box.y - pad),
  };
  if (ring.w < 4 || ring.h < 4) return { skipped: 'bbox touches the image edge' };

  // Modal colour of the ring (quantised to 16 levels), used as the local background.
  const histogram = new Map();
  for (let y = Math.round(ring.y); y < ring.y + ring.h; y += 2) {
    for (let x = Math.round(ring.x); x < ring.x + ring.w; x += 2) {
      const inside =
        x >= box.x - 1 && x <= box.x + box.w + 1 && y >= box.y - 1 && y <= box.y + box.h + 1;
      if (inside) continue;
      const pixel = png.pixel(x, y);
      if (!pixel) continue;
      const key = `${pixel[0] >> 4},${pixel[1] >> 4},${pixel[2] >> 4}`;
      const entry = histogram.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
      entry.count += 1;
      entry.r += pixel[0];
      entry.g += pixel[1];
      entry.b += pixel[2];
      histogram.set(key, entry);
    }
  }
  const mode = [...histogram.values()].sort((a, b) => b.count - a.count)[0];
  if (!mode) return { skipped: 'no ring pixels sampled' };
  const background = [Math.round(mode.r / mode.count), Math.round(mode.g / mode.count), Math.round(mode.b / mode.count)];

  const inkThreshold = 24;
  let ink = 0;
  let sampled = 0;
  let sumX = 0;
  let sumY = 0;
  let inkBox = null;
  for (let y = Math.round(box.y); y < box.y + box.h; y += 1) {
    for (let x = Math.round(box.x); x < box.x + box.w; x += 1) {
      const pixel = png.pixel(x, y);
      if (!pixel) continue;
      sampled += 1;
      if (channelDelta(pixel, background) <= inkThreshold) continue;
      ink += 1;
      sumX += x;
      sumY += y;
      inkBox = inkBox ? [Math.min(inkBox[0], x), Math.min(inkBox[1], y), Math.max(inkBox[2], x), Math.max(inkBox[3], y)] : [x, y, x, y];
    }
  }
  if (sampled === 0) return { skipped: 'bbox outside the image' };
  const inkFraction = ink / sampled;
  if (ink < 20 || inkFraction < 0.005) return { skipped: `too little ink to test (${ink} px, ${(inkFraction * 100).toFixed(2)}%)` };

  const centroid = [Math.round(sumX / ink), Math.round(sumY / ink)];
  const centroidInsideBox = centroid[0] >= box.x && centroid[0] <= box.x + box.w && centroid[1] >= box.y && centroid[1] <= box.y + box.h;
  const tolerance = options.featureTolerancePx;
  const inkWithinBox =
    inkBox[0] >= box.x - tolerance &&
    inkBox[1] >= box.y - tolerance &&
    inkBox[2] <= box.x + box.w + tolerance &&
    inkBox[3] <= box.y + box.h + tolerance;

  return {
    domPath: node.domPath,
    tag: node.tag,
    bbox: box,
    localBackground: `rgb(${background.join(', ')})`,
    inkPixels: ink,
    inkFraction: Math.round(inkFraction * 1000) / 1000,
    centroid,
    centroidInsideBox,
    inkBox,
    inkWithinBox,
    passed: centroidInsideBox && inkWithinBox,
  };
}

// Resolve every nodes.json cleanedPath in the delivered dom.html using a real browser parse.
async function domResolutionCheck(dir, nodes, options) {
  const domPath = path.join(dir, 'dom.html');
  if (!fs.existsSync(domPath)) return { available: false, note: 'dom.html missing' };
  const html = fs.readFileSync(domPath, 'utf8');
  const browser = await launchBrowser({ log: () => {} });
  try {
    const context = await browser.newContext();
    await context.route('**/*', (route) => route.abort()); // structure only: no network
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const expected = nodes.map((node) => ({ p: node.cleanedPath, t: node.tag, i: node.cleanedIndex }));
    // a11y.json is optional (older captures do not carry domIndex).
    let a11yNodes = [];
    try {
      a11yNodes = JSON.parse(fs.readFileSync(path.join(dir, 'a11y.json'), 'utf8')).nodes ?? [];
    } catch {
      a11yNodes = [];
    }
    const sampleStep = Math.max(1, Math.floor(a11yNodes.length / 25));
    const a11ySample = a11yNodes
      .filter((_, index) => index % sampleStep === 0)
      .filter((node) => typeof node.domIndex === 'number' && node.role)
      .slice(0, 25)
      .map((node) => ({ domIndex: node.domIndex, role: node.role }));

    const result = await page.evaluate(({ pairs, sample, strictRoles }) => {
      const byPath = new Map();
      const tagByIndex = [];
      const roleAttrByIndex = [];
      const walk = (el, p) => {
        const tag = el.tagName.toLowerCase();
        byPath.set(p, { tag, index: tagByIndex.length });
        tagByIndex.push(tag);
        roleAttrByIndex.push(el.getAttribute('role'));
        const children = el.children;
        for (let i = 0; i < children.length; i += 1) walk(children[i], `${p}/${children[i].tagName.toLowerCase()}[${i}]`);
      };
      walk(document.documentElement, 'html');

      const unresolved = [];
      const tagMismatch = [];
      const indexMismatch = [];
      let resolved = 0;
      for (const pair of pairs) {
        const found = pair.p === null || pair.p === undefined ? undefined : byPath.get(pair.p);
        if (found === undefined) {
          if (unresolved.length < 10) unresolved.push(pair.p);
          continue;
        }
        if (found.tag !== pair.t) {
          if (tagMismatch.length < 10) tagMismatch.push({ path: pair.p, expected: pair.t, actual: found.tag });
          continue;
        }
        if (typeof pair.i === 'number' && found.index !== pair.i) {
          if (indexMismatch.length < 10) indexMismatch.push({ path: pair.p, expectedIndex: pair.i, actualIndex: found.index });
          continue;
        }
        resolved += 1;
      }

      const a11yMismatch = [];
      let a11yChecked = 0;
      let a11ySkipped = 0;
      for (const entry of sample) {
        const tag = tagByIndex[entry.domIndex];
        if (tag === undefined) {
          if (a11yMismatch.length < 10) a11yMismatch.push({ ...entry, reason: 'domIndex out of range' });
          continue;
        }
        const allowed = strictRoles[entry.role];
        // An explicit role attribute can legitimately make any tag carry the role.
        if (!allowed || roleAttrByIndex[entry.domIndex]) {
          a11ySkipped += 1;
          continue;
        }
        a11yChecked += 1;
        if (!allowed.includes(tag) && a11yMismatch.length < 10) a11yMismatch.push({ ...entry, tag, allowed });
      }

      return {
        resolved,
        unresolved,
        tagMismatch,
        indexMismatch,
        a11yChecked,
        a11ySkipped,
        a11yMismatch,
        elementsInDom: tagByIndex.length,
      };
    }, { pairs: expected, sample: a11ySample, strictRoles: STRICT_ROLE_TAGS });
    await context.close();
    return {
      available: true,
      checkedPaths: expected.length,
      resolved: result.resolved,
      unresolved: result.unresolved,
      unresolvedCount: expected.length - result.resolved - result.tagMismatch.length - result.indexMismatch.length,
      tagMismatch: result.tagMismatch,
      tagMismatchCount: result.tagMismatch.length,
      indexMismatch: result.indexMismatch,
      indexMismatchCount: result.indexMismatch.length,
      a11yDomIndexSample: {
        sampled: a11ySample.length,
        checked: result.a11yChecked,
        skipped: result.a11ySkipped,
        mismatchCount: result.a11yMismatch.length,
        mismatches: result.a11yMismatch,
        note: 'a11y.json[].domIndex resolved against the parsed dom.html and compared with the tag implied by the AX role (elements with an explicit role attribute are skipped)',
      },
      elementsInDom: result.elementsInDom,
      passed:
        result.resolved === expected.length &&
        result.tagMismatch.length === 0 &&
        result.indexMismatch.length === 0 &&
        result.a11yMismatch.length === 0,
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

function covers(outer, inner) {
  return (
    outer.x <= inner.x + 1 &&
    outer.y <= inner.y + 1 &&
    outer.x + outer.w >= inner.x + inner.w - 1 &&
    outer.y + outer.h >= inner.y + inner.h - 1
  );
}

function classify({ node, index, nodes, byPath, png, options }) {
  const colour = parseColor(node.styles.backgroundColor);
  const expectedRgb = [colour.r, colour.g, colour.b];
  const direct = sampleGrid(png, node.bbox, expectedRgb, options.tolerance, options.nearMissDelta);
  const above = sampleGrid(png, { ...node.bbox, y: node.bbox.y - node.bbox.h - options.shiftPx }, expectedRgb, options.tolerance, options.nearMissDelta);
  const below = sampleGrid(png, { ...node.bbox, y: node.bbox.y + node.bbox.h + options.shiftPx }, expectedRgb, options.tolerance, options.nearMissDelta);
  const discriminating = above.fraction < options.minFraction && below.fraction < options.minFraction;

  const segments = node.domPath.split('/');
  let ancestorOpacity = null;
  for (let i = segments.length - 1; i > 0; i -= 1) {
    const ancestor = byPath.get(segments.slice(0, i).join('/'));
    if (ancestor && ancestor.styles.opacity !== null && ancestor.styles.opacity < 1) {
      ancestorOpacity = { domPath: ancestor.domPath, opacity: ancestor.styles.opacity };
    }
  }
  // A fixed/sticky ancestor (or the element itself) is re-laid-out by the full-page capture:
  // in viewport.png it sits at the bottom of the viewport, in full.png at its document position.
  let positionedAncestor = null;
  const selfPosition = node.styles.position;
  if (selfPosition === 'fixed' || selfPosition === 'sticky') positionedAncestor = { domPath: node.domPath, position: selfPosition };
  else {
    for (let i = segments.length - 1; i > 0 && !positionedAncestor; i -= 1) {
      const ancestor = byPath.get(segments.slice(0, i).join('/'));
      if (ancestor && (ancestor.styles.position === 'fixed' || ancestor.styles.position === 'sticky')) {
        positionedAncestor = { domPath: ancestor.domPath, position: ancestor.styles.position };
      }
    }
  }

  const cover = nodes.findIndex((other, otherIndex) => otherIndex > index && other.tag !== node.tag && covers(other.bbox, node.bbox));

  // Which node, if any, paints over this bbox with the colour actually sampled at its centre?
  let overlapping = null;
  if (direct.centrePixel && direct.fraction < options.minFraction) {
    const centre = { x: node.bbox.x + node.bbox.w / 2, y: node.bbox.y + node.bbox.h / 2 };
    for (const other of nodes) {
      if (other === node) continue;
      if (centre.x < other.bbox.x || centre.x > other.bbox.x + other.bbox.w) continue;
      if (centre.y < other.bbox.y || centre.y > other.bbox.y + other.bbox.h) continue;
      const otherColour = parseColor(other.styles.backgroundColor);
      if (!otherColour || otherColour.a < 1) continue;
      if (channelDelta(direct.centrePixel, [otherColour.r, otherColour.g, otherColour.b]) > options.tolerance) continue;
      if (!overlapping || other.bbox.w * other.bbox.h < overlapping.bbox.w * overlapping.bbox.h) {
        overlapping = { domPath: other.domPath, tag: other.tag, bbox: other.bbox };
      }
    }
  }

  let classification;
  if (ancestorOpacity) classification = 'ancestor-transparent';
  else if (direct.fraction >= options.minFraction && discriminating) classification = 'aligned';
  else if (direct.fraction >= options.minFraction) classification = 'non-discriminating';
  else if (direct.blendedFraction >= options.minFraction) classification = 'translucent-overlay';
  else if (positionedAncestor) classification = 'fixed-or-sticky-relayout';
  else if (cover !== -1) classification = 'covered-by-later-node';
  else if (overlapping) classification = 'covered-by-overlapping-node';
  else if (direct.nearFraction >= options.minFraction) classification = 'near-match';
  else if (direct.fraction > 0) classification = 'low-coverage';
  else classification = 'unexplained';

  return {
    domPath: node.domPath,
    cleanedPath: node.cleanedPath,
    tag: node.tag,
    role: node.role,
    bbox: node.bbox,
    expectedBackground: node.styles.backgroundColor,
    classification,
    direct,
    controlAbove: above,
    controlBelow: below,
    // Measured, not assumed: the smallest offset at which the shifted grid drops below
    // minFraction, with the analytic bound as a fallback for elements larger than the ladder.
    shiftDetection: {
      ...measureShiftDetection(png, node.bbox, expectedRgb, options),
      analyticPx: Math.max(1, Math.ceil(Math.min(node.bbox.w, node.bbox.h) * (1 - options.minFraction))),
    },
    ancestorOpacity: ancestorOpacity ?? undefined,
    coveringNode: cover === -1 ? undefined : { domPath: nodes[cover].domPath, tag: nodes[cover].tag, bbox: nodes[cover].bbox },
    positionedAncestor: positionedAncestor ?? undefined,
    overlappingNode: overlapping ?? undefined,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const dir = path.resolve(options.dir);
  const nodes = JSON.parse(fs.readFileSync(path.join(dir, 'nodes.json'), 'utf8'));
  const png = decodePng(fs.readFileSync(path.join(dir, 'full.png')));
  const byPath = new Map(nodes.map((node) => [node.domPath, node]));

  const candidates = nodes
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => {
      if (PAINTED_TAGS.has(node.tag)) return false;
      const color = parseColor(node.styles.backgroundColor);
      if (!color || color.a < 1) return false;
      if (node.styles.opacity !== null && node.styles.opacity < 1) return false;
      if (node.bbox.w < options.minSize || node.bbox.h < options.minSize) return false;
      if (node.bbox.x < 0 || node.bbox.y < 0) return false;
      if (node.bbox.x + node.bbox.w > png.width || node.bbox.y + node.bbox.h > png.height) return false;
      return channelDelta([color.r, color.g, color.b], [255, 255, 255]) > 12;
    })
    .sort((a, b) => b.node.bbox.w * b.node.bbox.h - a.node.bbox.w * a.node.bbox.h)
    .slice(0, options.maxChecked);

  const checks = candidates.map(({ node, index }) => classify({ node, index, nodes, byPath, png, options }));
  const count = (name) => checks.filter((check) => check.classification === name).length;
  const alignedChecks = checks.filter((check) => check.classification === 'aligned');
  const aligned = alignedChecks.length;
  const unexplained = count('unexplained');

  // Painted-feature checks for image-like elements.
  const paintedCandidates = nodes
    .filter((node) => {
      if (!PAINTED_TAGS.has(node.tag)) return false;
      if (node.bbox.w < 24 || node.bbox.h < 24) return false;
      if (node.bbox.x < 0 || node.bbox.y < 0) return false;
      if (node.bbox.x + node.bbox.w > png.width || node.bbox.y + node.bbox.h > png.height) return false;
      return node.visible === true;
    })
    .sort((a, b) => b.bbox.w * b.bbox.h - a.bbox.w * a.bbox.h)
    .slice(0, options.maxChecked);
  const painted = paintedCandidates.map((node) => paintedFeatureCheck(png, node, options));
  const paintedPassed = painted.filter((check) => check.passed === true).length;
  const paintedFailed = painted.filter((check) => check.passed === false).length;
  const paintedSkipped = painted.filter((check) => check.skipped).length;
  const paintedRequired = paintedCandidates.length >= 3;

  const nodesBelowCapturedHeight = nodes.filter((node) => node.bbox.y + node.bbox.h > png.height).length;
  const frameAnchor = frameAnchorCheck(dir, png, options);
  const domResolution = options.domCheck
    ? await domResolutionCheck(dir, nodes, options)
    : { available: false, note: 'skipped via --no-dom-check' };

  const shiftSensitivityPx = alignedChecks.length
    ? Math.min(...alignedChecks.map((check) => check.shiftDetection.measuredPx ?? check.shiftDetection.analyticPx))
    : null;

  const blockers = [];
  if (unexplained > 0) blockers.push(`${unexplained} unexplained colour candidate(s)`);
  if (domResolution.available && !domResolution.passed) {
    blockers.push(
      `nodes.json does not resolve in dom.html (unresolved=${domResolution.unresolvedCount}, tagMismatch=${domResolution.tagMismatchCount}, indexMismatch=${domResolution.indexMismatchCount}, a11yDomIndexMismatch=${domResolution.a11yDomIndexSample?.mismatchCount ?? 0})`,
    );
  }
  if (paintedFailed > 0) blockers.push(`${paintedFailed} painted-feature check(s) failed`);

  const warnings = [];
  const paintedCarriesEvidence = paintedFailed === 0 && paintedPassed >= options.minPaintedChecks;
  if (aligned < options.minDiscriminating && !paintedCarriesEvidence) {
    warnings.push(`only ${aligned} discriminating colour candidate(s), ${options.minDiscriminating} required for a strong verdict`);
  }
  if (shiftSensitivityPx !== null && shiftSensitivityPx > options.maxShiftSensitivity) {
    warnings.push(`coarse shift detection: smallest matched element proves alignment only to ${shiftSensitivityPx}px (> ${options.maxShiftSensitivity}px)`);
  }
  if (frameAnchor.available && frameAnchor.status === 'weak') {
    warnings.push(`frame anchor weak (${(frameAnchor.identicalFraction * 100).toFixed(2)}% of top-of-page pixels match)`);
  }
  if (paintedRequired && paintedPassed < options.minPaintedChecks) {
    warnings.push(`${paintedCandidates.length} image-like candidates but only ${paintedPassed} painted-feature pass(es), ${options.minPaintedChecks} required`);
  }

  let verdict;
  if (blockers.length) verdict = 'misaligned';
  else if (aligned >= options.minDiscriminating) verdict = warnings.length ? 'aligned-with-warnings' : 'aligned';
  else if (paintedCarriesEvidence) verdict = warnings.length ? 'aligned-painted-features-with-warnings' : 'aligned-painted-features';
  else if (aligned > 0) verdict = 'aligned-thin';
  else if (frameAnchor.available && frameAnchor.status === 'strong') verdict = 'frame-anchor-only';
  else verdict = 'inconclusive';

  const evidence = {
    pageDir: path.relative(process.cwd(), dir),
    fullPng: { width: png.width, height: png.height },
    nodesChecked: nodes.length,
    nodesBelowCapturedHeight,
    colourCandidatesExamined: candidates.length,
    tolerancePerChannel: options.tolerance,
    minimumMatchingFraction: options.minFraction,
    minimumDiscriminating: options.minDiscriminating,
    aligned,
    unexplained,
    paintedCarriesEvidence,
    shiftSensitivityPx,
    classificationCounts: {
      'translucent-overlay': count('translucent-overlay'),
      'ancestor-transparent': count('ancestor-transparent'),
      'covered-by-later-node': count('covered-by-later-node'),
      'covered-by-overlapping-node': count('covered-by-overlapping-node'),
      'fixed-or-sticky-relayout': count('fixed-or-sticky-relayout'),
      'near-match': count('near-match'),
      'non-discriminating': count('non-discriminating'),
      'low-coverage': count('low-coverage'),
    },
    paintedFeature: {
      candidates: paintedCandidates.length,
      examined: painted.length,
      passed: paintedPassed,
      failed: paintedFailed,
      skipped: paintedSkipped,
      required: paintedRequired,
      checks: painted,
    },
    frameAnchor,
    domResolution,
    blockers,
    warnings,
    verdict,
    checks,
  };

  const text = `${JSON.stringify(evidence, null, 2)}\n`;
  if (options.out) fs.writeFileSync(options.out, text);
  process.stdout.write(text);
  if (verdict === 'misaligned' || verdict === 'inconclusive') process.exitCode = 1;
  else if (options.strictWarnings && warnings.length) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`verify-alignment error: ${error.stack ?? error.message}\n`);
  process.exit(1);
});
