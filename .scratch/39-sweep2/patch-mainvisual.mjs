// Round 39: insert `_image` into model items whose `_action.to` carries the same BUSINESS KEY
// as the captured image's enclosing <a href>, chosen by the shared main-visual criterion
// (.scratch/39-sweep2/mainvisual.mjs, docs/m1/layout-axes.md §9.5).
// Keys come from the capture (never invented); the entry = the image's enclosing <a href>.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { isMainVisual } from './mainvisual.mjs';

const [dir, modelPath, keyRe] = process.argv.slice(2);
if (!dir || !modelPath || !keyRe) {
  console.error('usage: node patch-mainvisual.mjs <corpusDir> <model.json> <keyRegex-with-1-group> [--exclude=REGEX]');
  process.exit(2);
}
// `--exclude` drops captured images that are SITE CHROME, not content: a 36kr search page embeds
// the 36克APP QR (`staticx.36krcdn.com/36kr-web/static/code_production*.png`) inside a result's
// link, so the business key alone would mis-attribute it. Excluded by source path, never invented.
const excluded = process.argv.filter((a) => a.startsWith('--exclude=')).map((a) => new RegExp(a.slice('--exclude='.length)));
// The captured `alt` is the source attribute; search pages mark the matched query with <em>,
// which is markup, not text. Strip tags (never invent) and keep what the reader would see.
const cleanAlt = (s) => String(s ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const rows = JSON.parse(execFileSync('node', ['.scratch/38-images-sweep/imgattr.mjs', dir, '0', '0'], { encoding: 'utf8', maxBuffer: 1 << 28 }))
  .filter((r) => !excluded.some((re) => re.test(r.src)));
const re = new RegExp(keyRe);
const keyOf = (u) => { if (!u) return null; const m = re.exec(u); return m ? m[1] : null; };

// entry = nearest enclosing <a href>; images with no link have no business key anyway.
const groups = new Map();
for (const r of rows) {
  const k = keyOf(r.href);
  if (!k) continue;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(r);
}
const lines = fs.readFileSync(modelPath, 'utf8').split('\n');
const inserts = [];
const report = [];
for (const [k, imgs] of groups) {
  const main = imgs.filter((r) => isMainVisual(r, imgs));
  if (main.length !== 1) { report.push(['SKIP-not-unique-main', k, main.map((m) => `${m.w}x${m.h}`).join(',')]); continue; }
  const r = main[0];
  const li = lines.findIndex((l) => l.includes('"to":') && keyOf(/"(https?:[^"]*)"/.exec(l)?.[1] ?? '') === k);
  if (li < 0) { report.push(['SKIP-nomodel', k, `${r.w}x${r.h}`]); continue; }
  let ai = li; while (ai > 0 && !/^\s*"_action":\s*\{/.test(lines[ai])) ai--;
  if (ai < 0) { report.push(['SKIP-noaction', k]); continue; }
  // Never declare a second `_image` on one item: an item that already carries an image keeps it.
  const actIndent = lines[ai].match(/^\s*/)[0].length;
  let start = ai - 1;
  while (start > 0 && !(lines[start].trim() === '{' && lines[start].match(/^\s*/)[0].length < actIndent)) start--;
  if (lines.slice(start, ai).some((l) => /^\s*"_image":/.test(l))) { report.push(['SKIP-already-has-image', k]); continue; }
  const indent = lines[ai].match(/^\s*/)[0];
  const alt = cleanAlt(r.alt);
  const frag = alt ? { image: r.src, alt } : { image: r.src };
  inserts.push({ at: ai, text: `${indent}"_image": ${JSON.stringify(frag)},`, key: k, size: `${r.w}x${r.h}`, dropped: imgs.filter((x) => x !== r).map((x) => `${x.w}x${x.h}`).join(',') });
  report.push(['ADD', k, `${r.w}x${r.h}`, r.src.slice(0, 70)]);
}
inserts.sort((a, b) => b.at - a.at);
for (const ins of inserts) lines.splice(ins.at, 0, ins.text);
fs.writeFileSync(modelPath, lines.join('\n'));
for (const x of report) console.log(x.join('\t'));
console.error(`inserted ${inserts.length} of ${groups.size} entries`);
