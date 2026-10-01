// Round 42 verification: re-check the enclosing anchor of every image attached to
// huawei-cn/consumer-phones (focus: the 37 added in round 40, 36 by M3 "anchor name").
//
// PASS rules (any one suffices, all tie the image to the entry's own card/product):
//   M2  : the image's own alt (normalized) equals the entry title.
//   M3  : the ENCLOSING anchor's accessible name (badge-stripped) starts with the entry title.
//   card: the image's enclosing anchor href equals the href of another <a> whose accessible
//         name equals the entry title (the card's title link) -> the image sits in that card.
//   slug: the enclosing anchor href's last path segment and the asset filename share a slug.
// The footer reports how many entries passed by which rule and any failure with raw evidence.
import fs from 'node:fs';
import { imageRows, modelEntries, norm, scanDom, attrOf, absolutize } from '../../m1/eval/imgattr.mjs';

const dir = 'corpus/huawei-cn/consumer-phones';
const modelPath = 'm1/curated/huawei-cn/consumer-phones.json';
const meta = JSON.parse(fs.readFileSync(`${dir}/meta.json`, 'utf8'));
const nodes = JSON.parse(fs.readFileSync(`${dir}/nodes.json`, 'utf8'));
const html = fs.readFileSync(`${dir}/dom.html`, 'utf8');
const { rows, dangling } = imageRows({ html, nodes, meta, minW: 1, minH: 1 });
const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
const entries = modelEntries(model);
const BADGE = /^(最新|新品首发|新品|热销|预购|预售|推荐)+/;
const base = meta.redirectedUrl || meta.url;
const fileOf = (r) => { const p = /^data:/i.test(r.src) ? r.dataSrc : (r.src || r.dataSrc); return String(p).split('?')[0].split('/').pop(); };

// all <a> open tags -> { href -> [accessible names] }
const { tags } = scanDom(html);
const byClean = new Map(); for (const nd of nodes) if (typeof nd.cleanedIndex === 'number') byClean.set(nd.cleanedIndex, nd);
const namesByHref = new Map();
for (let k = 0; k < tags.length; k++) {
  if (tags[k].name !== 'a') continue;
  const href = absolutize(attrOf(tags[k].attrs, 'href'), base);
  if (!href) continue;
  const nm = norm(byClean.get(k)?.name || '');
  if (nm) { if (!namesByHref.has(href)) namesByHref.set(href, new Set()); namesByHref.get(href).add(nm); }
}
const addedSet = new Set(JSON.parse(fs.readFileSync('.scratch/42-imgattr/added.json', 'utf8')));
let pass = 0, fail = 0, noRow = 0; const byRule = {};
console.log('# dangling-open-tags =', dangling);
for (const e of entries) {
  if (!e.img || !e.img.image) continue;
  const tag = addedSet.has(e.path) ? 'ADDED' : 'pre  ';
  const suffix = e.img.image.startsWith('../assets/') ? fileOf({ src: e.img.image }).replace(/^hw-catalog-/, '') : e.img.image.split('?')[0].split('/').pop();
  const matches = rows.filter((r) => fileOf(r) === suffix);
  if (!matches.length) { noRow++; console.log(`${tag} NOROW  ${e.path.padEnd(32)} <${e.title}>  suffix=${suffix}`); continue; }
  const title = norm(e.title);
  let rule = '', ev = '';
  for (const r of matches) {
    if (norm(r.alt) && norm(r.alt) === title) { rule = 'M2-alt'; ev = `row#${r.idx} alt=${JSON.stringify(r.alt)}`; break; }
    const aName = norm(r.anchorName).replace(BADGE, '');
    if (aName && aName.startsWith(title)) { rule = 'M3-enclosing-name'; ev = `row#${r.idx} name=${JSON.stringify(r.anchorName).slice(0, 34)}`; break; }
    const sib = r.href && namesByHref.get(r.href);
    if (sib && [...sib].some((n) => n === title || n.startsWith(title))) { rule = 'card-href'; ev = `row#${r.idx} href=${r.href.slice(-26)} cardTitle=${JSON.stringify([...sib][0]).slice(0, 26)}`; break; }
    const seg = String(r.href || '').split('?')[0].replace(/\/$/, '').split('/').pop();
    const stem = suffix.replace(/\.[a-z0-9]+$/i, '');
    if (r.enclosingAnchorIdx >= 0 && (seg.includes(stem) || stem.includes(seg))) { rule = 'slug'; ev = `row#${r.idx} href=${seg} asset=${stem}`; break; }
  }
  if (rule) { pass++; byRule[rule] = (byRule[rule] || 0) + 1; console.log(`${tag} PASS  ${e.path.padEnd(32)} <${e.title}>  [${rule}] ${ev}`); }
  else { fail++; const r = matches[0]; console.log(`${tag} FAIL  ${e.path.padEnd(32)} <${e.title}>  row#${r.idx} aIdx=${r.enclosingAnchorIdx} name=${JSON.stringify(r.anchorName)} href=${r.href}`); }
}
console.log(`# pass=${pass} fail=${fail} noRow=${noRow} rules=${JSON.stringify(byRule)}`);
