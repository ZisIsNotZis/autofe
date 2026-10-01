// Round 38: dump candidate images (>=120x120) with src+href+alt, side by side with
// model items' action targets, for human attribution. Uses imgattr.mjs output.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const dir = process.argv[2];
const modelPath = process.argv[3];
const rows = JSON.parse(execFileSync('node', ['.scratch/38-images-sweep/imgattr.mjs', dir, '120', '120'], { encoding: 'utf8', maxBuffer: 1 << 28 }));
const m = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
const items = [];
(function walk(n, path) {
  if (Array.isArray(n)) return n.forEach((e, i) => walk(e, path + '[' + i + ']'));
  if (!n || typeof n !== 'object') return;
  for (const [k, v] of Object.entries(n)) {
    if (k === '_items' && Array.isArray(v)) v.forEach((e, i) => items.push({ path: path + '/' + k + '[' + i + ']', title: (e._title?.text ?? e._name?.text ?? '').slice(0, 70), to: e._action?.to ?? e._link?.to ?? '' }));
    else if (v && typeof v === 'object') walk(v, path + '/' + k);
  }
})(m, '');
console.log('=== CANDIDATES ' + rows.length + ' ===');
rows.forEach((r, i) => console.log(`${i}\t${r.idx}\t${r.w}x${r.h}\ty=${r.y}\t${r.alt}\t${r.href}\t${r.src?.slice(0, 110)}`));
console.log('=== MODEL ITEMS ' + items.length + ' (with action) ===');
items.filter((x) => x.to).forEach((x) => console.log(`${x.path}\t${x.title}\t${x.to}`));
