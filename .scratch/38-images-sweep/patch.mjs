// Round 38: insert `_image` facts into model items whose `_action.to` carries the same
// business key as the captured image's enclosing <a href>. Keys come from the capture
// (never invented); insertion is a text edit on the existing formatting.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const [dir, modelPath, keyName, width, height] = process.argv.slice(2);
const minW = Number(width ?? 120), minH = Number(height ?? 120);
const rows = JSON.parse(execFileSync('node', ['.scratch/38-images-sweep/imgattr.mjs', dir, String(minW), String(minH)], { encoding: 'utf8', maxBuffer: 1 << 28 }));
const lines = fs.readFileSync(modelPath, 'utf8').split('\n');
const keyOf = (u) => { if (!u) return null; const abs = /^\/\//.test(u) ? 'https:' + u : u; try { return new URL(abs).searchParams.get(keyName); } catch { return null; } };
const inserts = [];
const report = [];
for (const r of rows) {
  const k = keyOf(r.href);
  if (!k) { report.push(['SKIP-nokey', r.idx, r.href.slice(0, 60)]); continue; }
  const li = lines.findIndex((l) => l.includes('"to":') && keyOf(/"(https?:[^"]*)"/.exec(l)?.[1] ?? '') === k);
  if (li < 0) { report.push(['SKIP-nomodel', r.idx, k, r.w + 'x' + r.h]); continue; }
  let ai = li; while (ai > 0 && !/^\s*"_action":\s*\{/.test(lines[ai])) ai--;
  if (ai < 0) { report.push(['SKIP-noaction', r.idx, k]); continue; }
  const indent = lines[ai].match(/^\s*/)[0];
  const frag = r.alt ? { image: r.src, alt: r.alt } : { image: r.src };
  inserts.push({ at: ai, indent, text: `${indent}"_image": ${JSON.stringify(frag)},`, key: k, idx: r.idx, size: r.w + 'x' + r.h });
  report.push(['ADD', r.idx, k, r.w + 'x' + r.h]);
}
inserts.sort((a, b) => b.at - a.at);
for (const ins of inserts) lines.splice(ins.at, 0, ins.text);
fs.writeFileSync(modelPath, lines.join('\n'));
for (const x of report) console.log(x.join('\t'));
console.error(`inserted ${inserts.length} of ${rows.length} candidates`);
