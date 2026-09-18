#!/usr/bin/env node
// Alignment spot-check: does nodes.json `bbox` point at the same pixels in full.png?
//
// For every node with a solid, opaque, visually distinctive background colour, sample a
// 5x5 grid inside its bbox and compare with the computed background colour. Two controls
// (the same grid placed entirely above and entirely below the element) must NOT match,
// otherwise the element sits on a same-coloured surface and its match proves nothing.
//
// Candidates that do not match exactly are then explained rather than merely counted:
//   aligned               — grid matches, controls do not: positive evidence
//   translucent-overlay   — painted colour equals the element colour composited with white
//                           or black (e.g. a ::before overlay on a loading button)
//   ancestor-transparent  — an ancestor on the domPath has opacity < 1
//   covered-by-later-node — a later node in document order fully covers the bbox
//   non-discriminating    — matches, but the controls match too (uninformative)
//   low-coverage          — some grid points match (text/border covers the rest)
//   unexplained           — nothing above applies; the only true alarm signal
//
// Second, independent check: the top rows of viewport.png (captured at scroll 0,0) must
// equal the top rows of full.png, i.e. full.png is anchored at the document origin.
//
// Usage:
//   node tools/capture/verify-alignment.mjs corpus/<site>/<page> [--max-checked 25] [--tolerance 3] [--out file.json]

import fs from 'node:fs';
import path from 'node:path';

import { decodePng } from './lib/png.mjs';

// Elements whose pixels come from painted content rather than the CSS background.
const PAINTED_TAGS = new Set(['img', 'svg', 'canvas', 'video', 'iframe', 'picture', 'object', 'embed', 'map', 'area', 'image']);
const BLEND_BASES = [[255, 255, 255], [0, 0, 0]];

function parseArgs(argv) {
  const options = { dir: null, maxChecked: 25, tolerance: 3, out: null, minSize: 20, shiftPx: 60, minFraction: 0.25 };
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
    else if (arg === '--out') options.out = value();
    else if (!options.dir) options.dir = arg;
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!options.dir) throw new Error('usage: verify-alignment.mjs <page-dir> [--max-checked N]');
  return options;
}

function parseColor(value) {
  const match = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\s*\)$/.exec(String(value ?? ''));
  if (!match) return null;
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: match[4] === undefined ? 1 : Number(match[4]) };
}

function channelDelta(a, b) {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
}

// Nearest alpha (1% steps) at which the element colour composited over white/black matches.
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

function sampleGrid(png, box, expectedRgb, tolerance) {
  const empty = { gridPoints: 0, matchingPoints: 0, fraction: 0, blendedPoints: 0, blendedFraction: 0, blend: null, minChannelDelta: null, centrePixel: null };
  if (box.w < 2 || box.h < 2 || box.y + box.h < 0) return empty;
  const insetX = Math.max(1, Math.round(box.w * 0.1));
  const insetY = Math.max(1, Math.round(box.h * 0.1));
  const x0 = box.x + insetX;
  const x1 = box.x + box.w - insetX;
  const y0 = box.y + insetY;
  const y1 = box.y + box.h - insetY;
  const centreX = Math.round((x0 + x1) / 2);
  const centreY = Math.round((y0 + y1) / 2);
  let matchingPoints = 0;
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
    blendedPoints,
    blendedFraction: gridPoints ? blendedPoints / gridPoints : 0,
    blend,
    minChannelDelta,
    centrePixel,
  };
}

function frameAnchorCheck(dir, fullPng, options) {
  const viewportPath = path.join(dir, 'viewport.png');
  if (!fs.existsSync(viewportPath)) return { available: false };
  const viewport = decodePng(fs.readFileSync(viewportPath));
  const rows = Math.min(viewport.height, fullPng.height);
  const columns = Math.min(viewport.width, fullPng.width);
  let compared = 0;
  let identical = 0;
  for (let y = 0; y < rows; y += 3) {
    for (let x = 0; x < columns; x += 3) {
      const a = fullPng.pixel(x, y);
      const b = viewport.pixel(x, y);
      if (!a || !b) continue;
      compared += 1;
      if (channelDelta(a, b) <= options.tolerance) identical += 1;
    }
  }
  return {
    available: true,
    viewportSize: { w: viewport.width, h: viewport.height },
    sampledPixels: compared,
    identicalFraction: compared ? identical / compared : 0,
    note: 'viewport.png is captured at scroll (0,0); equality with the top of full.png proves full.png starts at the document origin',
  };
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
  const direct = sampleGrid(png, node.bbox, expectedRgb, options.tolerance);
  const above = sampleGrid(png, { ...node.bbox, y: node.bbox.y - node.bbox.h - options.shiftPx }, expectedRgb, options.tolerance);
  const below = sampleGrid(png, { ...node.bbox, y: node.bbox.y + node.bbox.h + options.shiftPx }, expectedRgb, options.tolerance);
  const discriminating = above.fraction < options.minFraction && below.fraction < options.minFraction;

  // Ancestor opacity (nodes.json only records the element's own opacity).
  const segments = node.domPath.split('/');
  let ancestorOpacity = null;
  for (let i = segments.length - 1; i > 0; i -= 1) {
    const ancestor = byPath.get(segments.slice(0, i).join('/'));
    if (ancestor && ancestor.styles.opacity !== null && ancestor.styles.opacity < 1) {
      ancestorOpacity = { domPath: ancestor.domPath, opacity: ancestor.styles.opacity };
    }
  }
  const cover = nodes.findIndex((other, otherIndex) => otherIndex > index && other.tag !== node.tag && covers(other.bbox, node.bbox));

  let classification;
  if (ancestorOpacity) classification = 'ancestor-transparent';
  else if (direct.fraction >= options.minFraction && discriminating) classification = 'aligned';
  else if (direct.fraction >= options.minFraction) classification = 'non-discriminating';
  else if (direct.blendedFraction >= options.minFraction) classification = 'translucent-overlay';
  else if (cover !== -1) classification = 'covered-by-later-node';
  else if (direct.fraction > 0) classification = 'low-coverage';
  else classification = 'unexplained';

  return {
    domPath: node.domPath,
    tag: node.tag,
    role: node.role,
    bbox: node.bbox,
    expectedBackground: node.styles.backgroundColor,
    classification,
    direct,
    controlAbove: above,
    controlBelow: below,
    ancestorOpacity: ancestorOpacity ?? undefined,
    coveringNode: cover === -1 ? undefined : { domPath: nodes[cover].domPath, tag: nodes[cover].tag, bbox: nodes[cover].bbox },
  };
}

function main() {
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
  const frameAnchor = frameAnchorCheck(dir, png, options);
  const aligned = count('aligned');
  const unexplained = count('unexplained');

  const verdict =
    aligned > 0 && unexplained === 0
      ? 'aligned'
      : aligned > 0
        ? 'aligned-with-caveats'
        : unexplained > 0
          ? 'misaligned'
          : frameAnchor.available && frameAnchor.identicalFraction > 0.99
            ? 'no-distinctive-candidate; frame-anchor-only'
            : 'inconclusive';

  const evidence = {
    pageDir: path.relative(process.cwd(), dir),
    fullPng: { width: png.width, height: png.height },
    nodesChecked: nodes.length,
    candidatesExamined: candidates.length,
    tolerancePerChannel: options.tolerance,
    minimumMatchingFraction: options.minFraction,
    aligned,
    unexplained,
    classificationCounts: {
      'translucent-overlay': count('translucent-overlay'),
      'ancestor-transparent': count('ancestor-transparent'),
      'covered-by-later-node': count('covered-by-later-node'),
      'non-discriminating': count('non-discriminating'),
      'low-coverage': count('low-coverage'),
    },
    frameAnchor,
    verdict,
    checks,
  };

  const text = `${JSON.stringify(evidence, null, 2)}\n`;
  if (options.out) fs.writeFileSync(options.out, text);
  process.stdout.write(text);
  if (verdict === 'misaligned' || verdict === 'inconclusive') process.exitCode = 1;
}

main();
