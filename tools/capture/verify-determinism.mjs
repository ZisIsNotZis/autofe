#!/usr/bin/env node
// Structural re-run check: capture the same page twice and prove the outputs are structurally
// identical. Volatile fields (timestamps, wall-clock timings) are ignored and listed explicitly;
// everything else must match exactly. PNGs are compared byte-wise first, then — if they differ —
// pixel-wise over *every* pixel (never subsampled), requiring all of:
//   maxChannelDelta <= --max-pixel-delta, differing fraction <= --max-diff-fraction, and a
//   difference bounding box covering <= --max-diff-box-fraction of the image area.
// Larger differences are a failure, not rendering noise.
//
// Usage:
//   node tools/capture/verify-determinism.mjs <dirA> <dirB> [--out file.json]
//   node tools/capture/verify-determinism.mjs --pair <dirA>:<dirB> [--pair <dirA>:<dirB> ...] [--out file.json]

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { decodePng } from './lib/png.mjs';

// Fields that legitimately differ between two runs of the same page.
const DYNAMIC_LEAF_KEYS = new Set(['capturedAt', 'at']);
// meta.json paths excluded from the structural comparison, with the reason each is safe:
//   timings.*            wall-clock durations
//   counts.domElements   raw element count in the live DOM; the page injects an extra
//   counts.droppedFromDom  <script>/<style> on some runs, which moves these two counters
//                        while dom.html, nodes.json and counts.cleanedElements stay identical.
const VOLATILE_META_PATHS = [
  ['capturedAt'],
  ['timings'],
  ['counts', 'domElements'],
  ['counts', 'droppedFromDom'],
];

function isVolatileMetaPath(path) {
  return VOLATILE_META_PATHS.some((candidate) => candidate.length === path.length && candidate.every((segment, index) => segment === path[index]));
}

function parseArgs(argv) {
  const options = { pairs: [], out: null, maxPixelDelta: 2, maxDiffFraction: 0.01, maxDiffBoxFraction: 0.01 };
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = () => {
      i += 1;
      if (argv[i] === undefined) throw new Error(`missing value for ${arg}`);
      return argv[i];
    };
    if (arg === '--out') options.out = value();
    else if (arg === '--pair') {
      const [a, b] = value().split(':');
      if (!a || !b) throw new Error('--pair expects dirA:dirB');
      options.pairs.push([a, b]);
    } else if (arg === '--max-pixel-delta') options.maxPixelDelta = Number(value());
    else if (arg === '--max-diff-fraction') options.maxDiffFraction = Number(value());
    else if (arg === '--max-diff-box-fraction') options.maxDiffBoxFraction = Number(value());
    else if (arg.startsWith('--')) throw new Error(`unknown argument: ${arg}`);
    else positional.push(arg);
  }
  if (positional.length === 2) options.pairs.push([positional[0], positional[1]]);
  else if (positional.length) throw new Error('pass exactly two directories, or use --pair dirA:dirB');
  if (!options.pairs.length) throw new Error('usage: verify-determinism.mjs <dirA> <dirB> | --pair dirA:dirB [--pair ...] [--out file.json]');
  return options;
}

// Every pixel is compared; no subsampling, so a sparse difference cannot slip through.
function pixelDiff(fileA, fileB, options) {
  const a = decodePng(fs.readFileSync(fileA));
  const b = decodePng(fs.readFileSync(fileB));
  if (a.width !== b.width || a.height !== b.height) {
    return { sameSize: false, sizeA: { w: a.width, h: a.height }, sizeB: { w: b.width, h: b.height } };
  }
  let differing = 0;
  let maxDelta = 0;
  let box = null;
  for (let y = 0; y < a.height; y += 1) {
    for (let x = 0; x < a.width; x += 1) {
      const p = a.pixel(x, y);
      const q = b.pixel(x, y);
      const delta = Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2]), Math.abs(p[3] - q[3]));
      if (delta === 0) continue;
      differing += 1;
      if (delta > maxDelta) maxDelta = delta;
      box = box ? [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)] : [x, y, x, y];
    }
  }
  const totalPixels = a.width * a.height;
  const boxArea = box ? (box[2] - box[0] + 1) * (box[3] - box[1] + 1) : 0;
  const differingFraction = totalPixels ? differing / totalPixels : 0;
  const boxFraction = totalPixels ? boxArea / totalPixels : 0;
  return {
    sameSize: true,
    totalPixels,
    differingPixels: differing,
    differingFraction: Math.round(differingFraction * 1e6) / 1e6,
    maxChannelDelta: maxDelta,
    boundingBox: box,
    boundingBoxAreaFraction: Math.round(boxFraction * 1e6) / 1e6,
    withinTolerance:
      maxDelta <= options.maxPixelDelta && differingFraction <= options.maxDiffFraction && boxFraction <= options.maxDiffBoxFraction,
  };
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function strip(value, path = [], isMeta = false) {
  if (Array.isArray(value)) return value.map((item) => strip(item, path, isMeta));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      const childPath = [...path, key];
      if (DYNAMIC_LEAF_KEYS.has(key)) continue;
      if (isMeta && isVolatileMetaPath(childPath)) continue;
      out[key] = strip(child, childPath, isMeta);
    }
    return out;
  }
  return value;
}

function firstDifference(a, b) {
  const limit = Math.min(a.length, b.length);
  for (let i = 0; i < limit; i += 1) {
    if (a[i] !== b[i]) return { offset: i, a: a.slice(Math.max(0, i - 40), i + 40), b: b.slice(Math.max(0, i - 40), i + 40) };
  }
  if (a.length !== b.length) return { offset: limit, a: a.slice(Math.max(0, limit - 40)), b: b.slice(Math.max(0, limit - 40)) };
  return null;
}

function compareJson(fileA, fileB, name) {
  const rawA = JSON.parse(fs.readFileSync(fileA, 'utf8'));
  const rawB = JSON.parse(fs.readFileSync(fileB, 'utf8'));
  const a = JSON.stringify(strip(rawA, [], name === 'meta.json'));
  const b = JSON.stringify(strip(rawB, [], name === 'meta.json'));
  if (a === b) return { file: name, identical: true, mode: 'json-structural' };
  return { file: name, identical: false, mode: 'json-structural', detail: firstDifference(a, b) };
}

function comparePair(dirA, dirB, options) {
  const filesA = fs.readdirSync(dirA).sort();
  const filesB = fs.readdirSync(dirB).sort();
  const pair = {
    dirA: path.relative(process.cwd(), dirA),
    dirB: path.relative(process.cwd(), dirB),
    fileSets: { a: filesA, b: filesB, identical: JSON.stringify(filesA) === JSON.stringify(filesB) },
    comparisons: [],
  };

  for (const file of filesA) {
    const fileB = path.join(dirB, file);
    if (!fs.existsSync(fileB)) {
      pair.comparisons.push({ file, identical: false, mode: 'missing', detail: 'missing in second capture' });
      continue;
    }
    const a = path.join(dirA, file);
    if (file.endsWith('.json')) {
      pair.comparisons.push(compareJson(a, fileB, file));
    } else if (file.endsWith('.png')) {
      const hashA = sha256(a);
      const hashB = sha256(fileB);
      if (hashA === hashB) {
        pair.comparisons.push({ file, identical: true, byteIdentical: true, mode: 'bytes', sha256: hashA });
      } else {
        const pixels = pixelDiff(a, fileB, options);
        pair.comparisons.push({
          file,
          identical: false,
          byteIdentical: false,
          pixelEquivalent: pixels.sameSize && pixels.withinTolerance,
          mode: 'bytes+pixel-diff',
          sha256: hashA,
          sha256Other: hashB,
          pixelDiff: pixels,
          note: pixels.withinTolerance
            ? `differs in ${pixels.differingPixels}/${pixels.totalPixels} pixels (${(pixels.differingFraction * 100).toFixed(4)}%), max channel delta ${pixels.maxChannelDelta}, diff box ${(pixels.boundingBoxAreaFraction * 100).toFixed(4)}% of the image: within the rendering-noise budget`
            : 'pixel difference exceeds the rendering-noise budget (max channel delta / differing fraction / diff box)',
        });
      }
    } else {
      const textA = fs.readFileSync(a, 'utf8');
      const textB = fs.readFileSync(fileB, 'utf8');
      pair.comparisons.push({ file, identical: textA === textB, mode: 'text', detail: textA === textB ? null : firstDifference(textA, textB) });
    }
  }

  const allIdentical = pair.fileSets.identical && pair.comparisons.every((comparison) => comparison.identical);
  const structurallyIdentical =
    pair.fileSets.identical &&
    pair.comparisons.every((comparison) => comparison.identical || (comparison.mode === 'bytes+pixel-diff' && comparison.pixelEquivalent));
  pair.verdict = allIdentical ? 'identical' : structurallyIdentical ? 'identical-modulo-png-rendering-noise' : 'different';
  return pair;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const pairs = options.pairs.map(([a, b]) => comparePair(path.resolve(a), path.resolve(b), options));
  const report = {
    pairs,
    budgets: {
      maxPixelDelta: options.maxPixelDelta,
      maxDifferingFraction: options.maxDiffFraction,
      maxDiffBoxAreaFraction: options.maxDiffBoxFraction,
      note: 'PNG diffs are compared over every pixel; a diff must satisfy all three budgets to count as rendering noise',
    },
    ignoredVolatile: {
      dynamicLeafKeys: [...DYNAMIC_LEAF_KEYS],
      metaPaths: VOLATILE_META_PATHS.map((entry) => entry.join('.')),
      reason:
        'timestamps always differ; counts.domElements / counts.droppedFromDom count raw live-DOM elements, and the page injects an extra script or style node on some runs (dom.html, nodes.json and counts.cleanedElements were byte/structurally identical while these moved)',
    },
    verdict: pairs.length === 1 ? pairs[0].verdict : pairs.some((pair) => pair.verdict === 'different') ? 'different' : pairs.every((pair) => pair.verdict === 'identical') ? 'identical' : 'identical-modulo-png-rendering-noise',
  };

  const text = `${JSON.stringify(report, null, 2)}\n`;
  if (options.out) fs.writeFileSync(options.out, text);
  process.stdout.write(text);
  if (report.verdict === 'different') process.exitCode = 1;
}

main();
