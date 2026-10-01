// Emit ready-to-paste `_image` literal lines for chosen candidate indices.
import { execFileSync } from 'node:child_process';
const dir = process.argv[2];
const idxs = process.argv[3].split(',').map(Number);
const rows = JSON.parse(execFileSync('node', ['.scratch/38-images-sweep/imgattr.mjs', dir, '120', '120'], { encoding: 'utf8', maxBuffer: 1 << 28 }));
for (const i of idxs) {
  const r = rows[i];
  console.log(`${i}\t${r.w}x${r.h}\t${r.alt}`);
  console.log(`    "_image": { "image": ${JSON.stringify(r.src)}, "alt": ${JSON.stringify(r.alt)} },`);
}
