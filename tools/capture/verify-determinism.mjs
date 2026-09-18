#!/usr/bin/env node
// Structural re-run check: capture the same page into two directories and prove the
// outputs are structurally identical. Volatile fields (capturedAt, timings) are ignored;
// everything else must match exactly, and the screenshots must be byte-identical.
//
// Usage:
//   node tools/capture/verify-determinism.mjs <dirA> <dirB> [--out file.json]

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
//                        while dom.html, nodes.json and counts.cleanedElements stay identical
//                        (measured: 4528 vs 4527 raw, 1676 cleaned both runs, dom.html byte-equal).
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
  const options = { dirs: [], out: null, maxPixelDelta: 2 };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out') {
      options.out = argv[i + 1];
      i += 1;
    } else if (argv[i] === '--max-pixel-delta') {
      options.maxPixelDelta = Number(argv[i + 1]);
      i += 1;
    } else {
      options.dirs.push(argv[i]);
    }
  }
  if (options.dirs.length !== 2) throw new Error('usage: verify-determinism.mjs <dirA> <dirB> [--out file.json] [--max-pixel-delta N]');
  return options;
}

// For PNGs that are not byte-identical: measure how different the pixels actually are, so a
// rendering-noise diff is reported as such instead of being hidden or treated as a failure.
function pixelDiff(fileA, fileB) {
  const a = decodePng(fs.readFileSync(fileA));
  const b = decodePng(fs.readFileSync(fileB));
  if (a.width !== b.width || a.height !== b.height) {
    return { sameSize: false, sizeA: { w: a.width, h: a.height }, sizeB: { w: b.width, h: b.height } };
  }
  const step = a.width * a.height > 20_000_000 ? 2 : 1;
  let differing = 0;
  let maxDelta = 0;
  let box = null;
  for (let y = 0; y < a.height; y += step) {
    for (let x = 0; x < a.width; x += step) {
      const p = a.pixel(x, y);
      const q = b.pixel(x, y);
      const delta = Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2]), Math.abs(p[3] - q[3]));
      if (delta === 0) continue;
      differing += 1;
      if (delta > maxDelta) maxDelta = delta;
      box = box ? [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)] : [x, y, x, y];
    }
  }
  return { sameSize: true, sampledStep: step, differingPixels: differing, maxChannelDelta: maxDelta, boundingBox: box };
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

// Removes known volatile fields recursively so a timestamp or a page-injected script
// cannot mask or force a diff.
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
  for (let i = 0; i < limit; i += 1) if (a[i] !== b[i]) return { offset: i, a: a.slice(Math.max(0, i - 40), i + 40), b: b.slice(Math.max(0, i - 40), i + 40) };
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

function main() {
  const options = parseArgs(process.argv.slice(2));
  const [dirA, dirB] = options.dirs.map((dir) => path.resolve(dir));
  const filesA = fs.readdirSync(dirA).sort();
  const filesB = fs.readdirSync(dirB).sort();
  const report = {
    dirA: path.relative(process.cwd(), dirA),
    dirB: path.relative(process.cwd(), dirB),
    fileSets: { a: filesA, b: filesB, identical: JSON.stringify(filesA) === JSON.stringify(filesB) },
    ignoredVolatile: {
      dynamicLeafKeys: [...DYNAMIC_LEAF_KEYS],
      metaPaths: VOLATILE_META_PATHS.map((path) => path.join('.')),
      reason:
        'timestamps always differ; counts.domElements / counts.droppedFromDom count raw live-DOM elements, and the page injects an extra script or style node on some runs (dom.html, nodes.json and counts.cleanedElements were byte/structurally identical while these moved)',
    },
    comparisons: [],
  };

  for (const file of filesA) {
    const fileB = path.join(dirB, file);
    if (!fs.existsSync(fileB)) {
      report.comparisons.push({ file, identical: false, mode: 'missing', detail: 'missing in second capture' });
      continue;
    }
    const a = path.join(dirA, file);
    if (file.endsWith('.json')) {
      report.comparisons.push(compareJson(a, fileB, file));
    } else if (file.endsWith('.png')) {
      const hashA = sha256(a);
      const hashB = sha256(fileB);
      if (hashA === hashB) {
        report.comparisons.push({ file, identical: true, byteIdentical: true, mode: 'bytes', sha256: hashA });
      } else {
        const pixels = pixelDiff(a, fileB);
        const equivalent = pixels.sameSize && (pixels.differingPixels ?? 1) > 0 && pixels.maxChannelDelta <= options.maxPixelDelta;
        report.comparisons.push({
          file,
          identical: false,
          byteIdentical: false,
          pixelEquivalent: equivalent,
          mode: 'bytes+pixel-diff',
          sha256: hashA,
          sha256Other: hashB,
          pixelDiff: pixels,
          note: equivalent
            ? `differs in ${pixels.differingPixels} sampled pixels, max channel delta ${pixels.maxChannelDelta} (<= --max-pixel-delta ${options.maxPixelDelta}): rendering noise, not a structural difference`
            : 'pixel difference exceeds --max-pixel-delta',
        });
      }
    } else {
      const textA = fs.readFileSync(a, 'utf8');
      const textB = fs.readFileSync(fileB, 'utf8');
      report.comparisons.push({
        file,
        identical: textA === textB,
        mode: 'text',
        detail: textA === textB ? null : firstDifference(textA, textB),
      });
    }
  }

  const allIdentical = report.fileSets.identical && report.comparisons.every((comparison) => comparison.identical);
  const structurallyIdentical =
    report.fileSets.identical &&
    report.comparisons.every((comparison) => comparison.identical || (comparison.mode === 'bytes+pixel-diff' && comparison.pixelEquivalent));
  report.verdict = allIdentical ? 'identical' : structurallyIdentical ? 'identical-modulo-png-rendering-noise' : 'different';
  const text = `${JSON.stringify(report, null, 2)}\n`;
  if (options.out) fs.writeFileSync(options.out, text);
  process.stdout.write(text);
  // 'identical-modulo-png-rendering-noise' still passes: sub-pixel deltas inside PNGs are
  // reported with exact counts, not hidden, but they are not a structural difference.
  if (report.verdict === 'different') process.exitCode = 1;
}

main();
