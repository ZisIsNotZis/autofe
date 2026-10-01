// Round 38 helper: candidate content images with src + attribution evidence.
// Reuses the round-26b whole-page tag-alignment gate (joinImageSrcs copied from imgmap.mjs)
// and the round-29 ancestry walk (attrib.mjs). No URL is invented.
import fs from 'node:fs';
import path from 'node:path';

const RAW_TEXT = new Set(['script', 'style']);
function scanElementTags(html) {
  const out = [];
  let i = 0; const n = html.length;
  while (i < n) {
    const lt = html.indexOf('<', i);
    if (lt < 0) break;
    i = lt + 1;
    const c = html[i];
    if (c === '!') { if (html.startsWith('!--', i)) { const e = html.indexOf('-->', i); i = e < 0 ? n : e + 3; } else { const e = html.indexOf('>', i); i = e < 0 ? n : e + 1; } continue; }
    if (c === '?' || c === '/') { const e = html.indexOf('>', i); i = e < 0 ? n : e + 1; continue; }
    if (!/[A-Za-z]/.test(c)) continue;
    let j = i; while (j < n && !/[\s/>]/.test(html[j])) j++;
    const name = html.slice(i, j).toLowerCase();
    const gt = html.indexOf('>', j); const end = gt < 0 ? n : gt;
    const attrs = html.slice(j, end);
    out.push({ name, attrs, raw: html.slice(lt, end + 1), start: lt, end: end + 1 });
    i = end + 1;
    if (RAW_TEXT.has(name)) { const close = html.indexOf('</' + name, i); if (close >= 0) { const e = html.indexOf('>', close); i = e < 0 ? n : e + 1; } }
  }
  return out;
}
function decodeAttrEntities(s) {
  return String(s).replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (m, e) => {
    const map = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
    const k = e.toLowerCase(); if (k in map) return map[k];
    const code = k.startsWith('#x') ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : m;
  });
}
function absolutizeSrc(rawSrc, baseUrl) {
  const s = decodeAttrEntities(String(rawSrc ?? '').trim());
  if (!s) return '';
  if (/^(data|blob):/i.test(s)) return s;
  if (/^javascript:/i.test(s)) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return s;
  try { return new URL(s, baseUrl).href; } catch { return ''; }
}
function attrOf(attrs, name) {
  const m = attrs.match(new RegExp('\\s' + name + '\\s*=\\s*"([^"]*)"', 'i')) ?? attrs.match(new RegExp('\\s' + name + "\\s*=\\s*'([^']*)'", 'i'));
  return m ? decodeAttrEntities(m[1]) : '';
}
const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);

const dir = process.argv[2];
const minW = Number(process.argv[3] ?? 120), minH = Number(process.argv[4] ?? 120);
const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
const nodes = JSON.parse(fs.readFileSync(path.join(dir, 'nodes.json'), 'utf8'));
const html = fs.readFileSync(path.join(dir, 'dom.html'), 'utf8');
const tags = scanElementTags(html);
const imgs = nodes.filter((n) => n.tag === 'img');
let aligned = 0, checked = 0, firstBad = '';
for (const n of nodes) { if (typeof n.cleanedIndex !== 'number' || !n.tag) continue; checked++; const g = tags[n.cleanedIndex]; if (g && g.name === String(n.tag).toLowerCase()) aligned++; else if (!firstBad) firstBad = `idx ${n.cleanedIndex} tag=${n.tag} scan=${g ? g.name : 'oob'}`; }
const state = checked && aligned === checked ? 'ok' : 'abandoned';
console.error(`join state=${state} tags=${tags.length} imgs=${imgs.length} aligned=${aligned}/${checked}${firstBad ? ' firstBad=' + firstBad : ''}`);
if (state !== 'ok') process.exit(1);

const parent = new Array(tags.length).fill(-1);
const stack = [];
for (let k = 0; k < tags.length; k++) {
  const t = tags[k];
  if (t.raw.startsWith('</')) { for (let s = stack.length - 1; s >= 0; s--) if (tags[stack[s]].name === t.name) { stack.length = s; break; } continue; }
  const selfClose = /\/>$/.test(t.raw.trim()) || VOID.has(t.name);
  parent[k] = stack.length ? stack[stack.length - 1] : -1;
  if (!selfClose) stack.push(k);
}
function textBetween(a, b) { let out = ''; for (let k = a + 1; k <= b && k < tags.length; k++) { const gap = html.slice(tags[k - 1].end, tags[k].start); if (gap && !/^[\s>]*$/.test(gap)) out += gap; } return out.replace(/\s+/g, ' ').trim(); }
function closeOf(k) { let d = 0; for (let m = k + 1; m < tags.length; m++) { if (tags[m].raw.startsWith('</') && tags[m].name === tags[k].name) { if (d === 0) return m; d--; } else if (tags[m].name === tags[k].name && !tags[m].raw.startsWith('</')) d++; } return tags.length - 1; }

const rows = [];
for (let k = 0; k < tags.length; k++) {
  if (tags[k].name !== 'img') continue;
  const n = imgs.find((x) => x.cleanedIndex === k);
  if (!n) continue;
  const b = n.bbox ?? {};
  if (!(b.w >= minW && b.h >= minH)) continue;
  const src = absolutizeSrc(attrOf(tags[k].attrs, 'src'), meta.url);
  const dsrc = attrOf(tags[k].attrs, 'data-src') || attrOf(tags[k].attrs, 'data-original') || attrOf(tags[k].attrs, 'data-lazy-src');
  let aIdx = -1; let p = parent[k]; let chain = [];
  while (p >= 0) { chain.push(tags[p].name); if (aIdx < 0 && tags[p].name === 'a') aIdx = p; p = parent[p]; }
  const href = aIdx >= 0 ? attrOf(tags[aIdx].attrs, 'href') : '';
  const aText = aIdx >= 0 ? textBetween(aIdx, closeOf(aIdx)) : '';
  // nearest ancestor with class attr
  let cls = ''; p = parent[k];
  while (p >= 0 && !cls) { const c = attrOf(tags[p].attrs, 'class'); if (c) cls = tags[p].name + '.' + c.split(/\s+/)[0]; p = parent[p]; }
  rows.push({ idx: k, w: b.w, h: b.h, y: b.y, x: b.x, src, dataSrc: dsrc, alt: String(n.name ?? '').slice(0, 100), href, aText: aText.slice(0, 120), cls });
}
console.log(JSON.stringify(rows, null, 1));
