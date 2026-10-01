// Helper for round 26b: map `cleanedIndex` -> absolute image src for one capture dir.
// The four functions below are copied VERBATIM from m1/extract/extract.mjs
// (scanElementTags / decodeAttrEntities / absolutizeSrc / joinImageSrcs, round-16
// implementation) so the whole-page tag-consistency gate is reused unchanged.
// Nothing here invents a URL: an abandoned join returns an empty map.
import fs from 'node:fs';
import path from 'node:path';

const RAW_TEXT = new Set(['script', 'style']);
function scanElementTags(html) {
  const out = [];
  let i = 0;
  const n = html.length;
  while (i < n) {
    const lt = html.indexOf('<', i);
    if (lt < 0) break;
    i = lt + 1;
    const c = html[i];
    if (c === '!') {
      if (html.startsWith('!--', i)) { const e = html.indexOf('-->', i); i = e < 0 ? n : e + 3; } else { const e = html.indexOf('>', i); i = e < 0 ? n : e + 1; }
      continue;
    }
    if (c === '?' || c === '/') { const e = html.indexOf('>', i); i = e < 0 ? n : e + 1; continue; }
    if (!/[A-Za-z]/.test(c)) continue;
    let j = i;
    while (j < n && !/[\s/>]/.test(html[j])) j++;
    const name = html.slice(i, j).toLowerCase();
    const gt = html.indexOf('>', j);
    const end = gt < 0 ? n : gt;
    const attrs = html.slice(j, end);
    const src = (attrs.match(/\ssrc\s*=\s*"([^"]*)"/) ?? attrs.match(/\ssrc\s*=\s*'([^']*)'/) ?? [])[1];
    out.push({ name, src });
    i = end + 1;
    if (RAW_TEXT.has(name)) {
      const close = html.indexOf('</' + name, i);
      if (close >= 0) { const e = html.indexOf('>', close); i = e < 0 ? n : e + 1; }
    }
  }
  return out;
}

function decodeAttrEntities(s) {
  return String(s).replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (m, e) => {
    const map = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
    const k = e.toLowerCase();
    if (k in map) return map[k];
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

function joinImageSrcs(dir, meta, nodes) {
  const join = { page: meta.site + '/' + meta.page, state: 'no-dom', nodes: 0, tags: 0, resolved: 0, unattributed: 0, map: new Map() };
  let html;
  try { html = fs.readFileSync(path.join(dir, 'dom.html'), 'utf8'); } catch { return join; }
  const tags = scanElementTags(html);
  join.tags = tags.length;
  const imgs = nodes.filter((n) => n.tag === 'img');
  join.nodes = imgs.length;
  let aligned = 0, checked = 0;
  let firstBad = '';
  for (const n of nodes) {
    if (typeof n.cleanedIndex !== 'number' || !n.tag) continue;
    checked++;
    const got = tags[n.cleanedIndex];
    if (got && got.name === String(n.tag).toLowerCase()) aligned++;
    else if (!firstBad) firstBad = `idx ${n.cleanedIndex} tag=${n.tag} scan=${got ? got.name : 'out-of-range'}`;
  }
  if (checked && aligned !== checked) {
    join.state = 'abandoned';
    join.reason = `index-alignment ${aligned}/${checked} (${firstBad})`;
    return join;
  }
  join.state = 'ok';
  for (const n of imgs) {
    const got = tags[n.cleanedIndex];
    const url = got ? absolutizeSrc(got.src, meta.url) : '';
    if (url) { join.map.set(n.cleanedIndex, url); join.resolved++; } else join.unattributed++;
  }
  return join;
}

const dir = process.argv[2];
const minW = Number(process.argv[3] ?? 200);
const minH = Number(process.argv[4] ?? 120);
const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
const nodes = JSON.parse(fs.readFileSync(path.join(dir, 'nodes.json'), 'utf8'));
const join = joinImageSrcs(dir, meta, nodes);
console.error(`join state=${join.state} tags=${join.tags} imgs=${join.nodes} resolved=${join.resolved} unattributed=${join.unattributed}${join.reason ? ' reason=' + join.reason : ''}`);
const rows = [];
for (const n of nodes) {
  if (n.tag !== 'img') continue;
  const b = n.bbox ?? {};
  if (!(b.w >= minW && b.h >= minH)) continue;
  rows.push({
    cleanedIndex: n.cleanedIndex,
    cleanedPath: n.cleanedPath,
    role: n.role,
    bbox: b,
    alt: (n.name ?? '').slice(0, 120),
    src: join.map.get(n.cleanedIndex) ?? null,
  });
}
console.log(JSON.stringify(rows, null, 2));
