import fs from 'node:fs';
import path from 'node:path';
const root = 'm1/curated';
const pages = fs.readdirSync(root, { withFileTypes: true })
  .filter(d => d.isDirectory() && d.name !== 'assets' && d.name !== 'renders')
  .flatMap(d => fs.readdirSync(path.join(root, d.name)).filter(f => f.endsWith('.json')).map(f => [d.name, f.replace(/\.json$/, '')]));
const countImg = (s) => (s.match(/"(_image|image)"\s*:/g) || []).length;
const rows = [];
for (const [site, page] of pages) {
  const modelPath = path.join(root, site, page + '.json');
  const modelText = fs.readFileSync(modelPath, 'utf8');
  const modelImgs = countImg(modelText);
  const dir = path.join('corpus', site, page);
  let cand = 0, total = 0, note = '';
  try {
    const nodes = JSON.parse(fs.readFileSync(path.join(dir, 'nodes.json'), 'utf8'));
    const imgs = (Array.isArray(nodes) ? nodes : nodes.nodes || []).filter(n => n.tag === 'img');
    total = imgs.length;
    cand = imgs.filter(n => n.bbox && n.bbox.w >= 120 && n.bbox.h >= 120).length;
  } catch (e) { note = 'NO_CORPUS: ' + e.message; }
  rows.push({ page: site + '/' + page, cand, modelImgs, total, note });
}
rows.sort((a, b) => (b.cand - b.modelImgs) - (a.cand - a.modelImgs));
console.log('page\tcapture_cand(>=120x120)\tmodel_imgs\tdelta\ttotal_img_nodes\tnote');
for (const r of rows) console.log([r.page, r.cand, r.modelImgs, r.cand - r.modelImgs, r.total, r.note].join('\t'));
console.error('pages=' + rows.length);
