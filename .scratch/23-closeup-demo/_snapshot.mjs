import fs from 'node:fs';
import path from 'node:path';
import { render } from '../../m1/render.mjs';
import { renderText } from '../../m1/render-text.mjs';
import { renderMarkdown } from '../../m1/render-md.mjs';

const outDir = process.argv[2];
fs.mkdirSync(outDir, { recursive: true });
const scale = JSON.parse(fs.readFileSync('m1/eval/m3-scale.json', 'utf8')).filter((x) => x.tier === 'exemplar');
for (const r of scale) {
  const mp = `m1/curated/${r.k}.json`;
  if (!fs.existsSync(mp)) continue;
  const model = JSON.parse(fs.readFileSync(mp, 'utf8'));
  const dash = r.k.replace(/\//g, '-');
  fs.writeFileSync(path.join(outDir, dash + '.html'), render(model));
  fs.writeFileSync(path.join(outDir, dash + '.txt'), renderText(model));
  fs.writeFileSync(path.join(outDir, dash + '.md'), renderMarkdown(model));
}
console.log('snapshot ->', outDir);
