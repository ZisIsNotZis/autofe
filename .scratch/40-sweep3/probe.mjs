// Round 40 probe: for one page, print model entries (doc order) and captured image candidates
// together with the evidence available for the four attribution methods:
//   M1 business key  = key(enclosing <a href>) == key(entry _action.to)
//   M2 alt           = normalized source `alt` == entry title
//   M3 anchor name   = accessible name of the nearest enclosing <a> == entry title
//   M4 y-order       = candidate bbox y interval vs entry document order
// Nothing is invented: every field printed comes from the capture or the model.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const [dir, modelPath, minW = '100', minH = '60'] = process.argv.slice(2);

const norm = (s) => String(s ?? '')
  .replace(/<[^>]*>/g, '')
  .replace(/\u200b|\u2060/g, '')
  .replace(/[（）()【】\[\]]/g, '')
  .replace(/\s+/g, '')
  .trim();

// ---- model entries (document order) ----
const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
const entries = [];
function walk(node, p) {
  if (Array.isArray(node)) { node.forEach((v, i) => walk(v, p + '[' + i + ']')); return; }
  if (node && typeof node === 'object') {
    const title = (node._title && node._title.text) || (node._name && node._name.text) || '';
    const to = node._action && node._action.to;
    if (title || to) {
      entries.push({
        path: p, title, to: to || '',
        img: node._image ? String(node._image.image ?? node._image) : '',
        alt: node._image && node._image.alt ? node._image.alt : '',
      });
    }
    for (const k of Object.keys(node)) walk(node[k], p + (Array.isArray(node) ? '' : '.') + k);
  }
}
walk(model, '$');

// ---- captured images: src/alt/href from the DOM scan, anchor accessible name from nodes.json ----
const nodes = JSON.parse(fs.readFileSync(path.join(dir, 'nodes.json'), 'utf8'));
const byPath = new Map();
for (const n of nodes) if (n.cleanedPath) byPath.set(n.cleanedPath, n);

const rows = JSON.parse(execFileSync('node', ['.scratch/38-images-sweep/imgattr.mjs', dir, String(minW), String(minH)], { encoding: 'utf8', maxBuffer: 1 << 28 }));
const out = [];
for (const r of rows) {
  const n = nodes.find((x) => x.cleanedIndex === r.idx);
  let anchorName = '', anchorText = '', entryPath = '';
  if (n && n.cleanedPath) {
    const segs = n.cleanedPath.split('/');
    for (let i = segs.length - 2; i >= 0; i--) {
      if (/^a(\[\d+\])?$/.test(segs[i])) { entryPath = segs.slice(0, i + 1).join('/'); break; }
    }
    const an = entryPath ? byPath.get(entryPath) : null;
    if (an) { anchorName = an.name || ''; anchorText = an.text || ''; }
  }
  out.push({ idx: r.idx, w: r.w, h: r.h, x: r.x, y: r.y, src: r.src, alt: r.alt, href: r.href, anchorName, anchorText: anchorText.slice(0, 90), entryPath });
}

console.log('### MODEL ENTRIES (' + entries.length + ')');
entries.forEach((e, i) => console.log([i, e.title.slice(0, 34), e.to.slice(0, 58), e.img ? 'HAS_IMG' : '-', e.alt.slice(0, 20)].join('\t')));
console.log('### IMAGE CANDIDATES ' + minW + 'x' + minH + ' (' + out.length + ')');
out.forEach((r) => console.log([r.idx, r.w + 'x' + r.h, Math.round(r.y), (r.href || '-').slice(0, 48), '|', r.alt.slice(0, 26), '|', r.anchorName.slice(0, 34)].join('\t')));
