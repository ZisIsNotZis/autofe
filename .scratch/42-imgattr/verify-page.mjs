// Round 42 generic re-check: for every image already attached to a model entry, find the
// captured <img> rows with the same URL and decide PASS when the row ties the image to the
// entry by one of: M2 alt==title, M3 enclosing-anchor accessible name starts with title,
// card-href (the enclosing anchor href == an <a> named like the entry), or M1 (the enclosing
// anchor href shares a business key with the entry's `_action.to`/`_key`).
// Usage: node .scratch/42-imgattr/verify-page.mjs <dir> <model.json> [N]
import fs from 'node:fs';
import { imageRows, modelEntries, norm, scanDom, attrOf, absolutize, keysOf } from '../../m1/eval/imgattr.mjs';

const [dir, modelPath, nArg] = process.argv.slice(2);
const N = Number(nArg || 0);
const meta = JSON.parse(fs.readFileSync(`${dir}/meta.json`, 'utf8'));
const nodes = JSON.parse(fs.readFileSync(`${dir}/nodes.json`, 'utf8'));
const html = fs.readFileSync(`${dir}/dom.html`, 'utf8');
const { rows, dangling } = imageRows({ html, nodes, meta, minW: 1, minH: 1 });
const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
const entries = modelEntries(model);
const BADGE = /^(最新|新品首发|新品|热销|预购|预售|推荐)+/;
const base = meta.redirectedUrl || meta.url;
const fileOf = (r) => String(/^data:/i.test(r.src || '') ? r.dataSrc : (r.src || r.dataSrc)).split('?')[0].split('/').pop();
const { tags } = scanDom(html);
const byClean = new Map(); for (const nd of nodes) if (typeof nd.cleanedIndex === 'number') byClean.set(nd.cleanedIndex, nd);
const namesByHref = new Map();
for (let k = 0; k < tags.length; k++) {
  if (tags[k].name !== 'a') continue;
  const href = absolutize(attrOf(tags[k].attrs, 'href'), base);
  const nm = norm(byClean.get(k)?.name || ''); if (!href || !nm) continue;
  if (!namesByHref.has(href)) namesByHref.set(href, new Set()); namesByHref.get(href).add(nm);
}
console.log(`# ${dir} dangling=${dangling} rows=${rows.length}`);
let pass = 0, fail = 0, noRow = 0, seen = 0; const fails = [];
for (const e of entries) {
  if (!e.img || !e.img.image) continue;
  seen++;
  const suffix = fileOf({ src: e.img.image });
  const matches = rows.filter((r) => fileOf(r) === suffix)
    .concat(rows.filter((r) => { try { return absolutize(e.img.image, base) === (r.src || r.dataSrc); } catch { return false; } }));
  if (!matches.length) { noRow++; continue; }
  const title = norm(e.title);
  let rule = '';
  for (const r of matches) {
    if (norm(r.alt) && norm(r.alt) === title) { rule = 'M2-alt'; break; }
    const aName = norm(r.anchorName).replace(BADGE, '');
    if (aName && title && aName.startsWith(title)) { rule = 'M3-name'; break; }
    const sib = r.href && namesByHref.get(r.href);
    if (sib && title && [...sib].some((n) => n === title || n.startsWith(title))) { rule = 'card-href'; break; }
    if (r.href && (e.keys.size || 0)) { const hk = keysOf(r.href); if ([...e.keys].some((k) => hk.has(k))) { rule = 'M1-key'; break; } }
  }
  if (rule) pass++; else { fail++; fails.push(`${e.path} <${e.title}> url=${e.img.image.slice(-46)}`); }
}
console.log(`# imaged=${seen} pass=${pass} fail=${fail} noUrlMatch=${noRow}`);
for (const f of fails) console.log('FAIL', f);
if (N) {
  console.log(`# sample of ${N}:`);
  let i = 0;
  for (const e of entries) { if (!e.img || !e.img.image) continue; if (i++ >= N) break; console.log(`  ${e.path} <${String(e.title).slice(0, 22)}> to=${e.to.slice(-46)} img=${e.img.image.slice(-46)}`); }
}
