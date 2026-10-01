// Round 40 attribution: map captured content images to model entries by EXHAUSTING four methods
// in order, never by guessing position.  Dry-run by default; `--apply` writes the model.
//
//   M1 business key : a key of the image's enclosing <a href> equals a key of the entry's
//                     `_action.to` / `_key` (query values, path basenames, id-like segments).
//   M2 alt          : normalized source `alt` equals the entry title.
//   M3 anchor text  : normalized text of the image's nearest enclosing <a> starts with the entry
//                     title (longest title wins; a tie is reported, never guessed).
//   M4 y-order      : opt-in via --only=<collection path>; equal counts inside one y-band only.
//
// Every URL written comes from the capture (src, or `data-src` when src is a 1x1 lazy placeholder).
// `--mirror=<regex>` byte-mirrors matching URLs into m1/curated/assets/ (no crop/re-encode); this is
// the round-34 mechanism for source CDNs that are too slow to fetch during `--shots`.
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const minW = Number((args.find((a) => a.startsWith('--minw=')) || '').slice(7) || 100);
const minH = Number((args.find((a) => a.startsWith('--minh=')) || '').slice(7) || 60);
const only = (args.find((a) => a.startsWith('--only=')) || '').slice(7);
const mirrors = args.filter((a) => a.startsWith('--mirror=')).map((a) => new RegExp(a.slice(9)));
const assetPrefix = (args.find((a) => a.startsWith('--asset-prefix=')) || '').slice(15);
const [dir, modelPath] = args.filter((a) => !a.startsWith('--'));

const norm = (s) => String(s ?? '')
  .replace(/<[^>]*>/g, '')
  .replace(/[\u200b\u2060]/g, '')
  .replace(/[（）()【】\[\]「」]/g, '')
  .replace(/\s+/g, '')
  .trim();

// ---------- URL handling ----------
const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
function absolutize(u) {
  const s = String(u ?? '').trim();
  if (!s) return '';
  if (/^(data|blob):/i.test(s)) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return s;
  try { return new URL(s, meta.url).href; } catch { return ''; }
}
const GENERIC = new Set(['cn', 'en', 'phones', 'phone', 'product', 'products', 'detail', 'html', 'htm', 'index', 'www', 'com', 'http', 'https']);
function keysOf(u) {
  const out = new Set();
  if (!u) return out;
  let abs = String(u).trim();
  if (/^\/\//.test(abs)) abs = 'https:' + abs;
  try {
    const url = new URL(abs, 'https://x.invalid/');
    for (const [k, v] of url.searchParams) if (v && v.length >= 3) { out.add(v.toLowerCase()); out.add(`${k}=${v}`.toLowerCase()); }
    for (const s of url.pathname.split('/').filter(Boolean)) {
      const base = s.replace(/\.(html?|jpe?g|png|webp|gif|avif)$/i, '');
      if (base.length >= 4 && !GENERIC.has(base.toLowerCase())) out.add(base.toLowerCase());
      const m = /([a-z]*-?\d{3,}[a-z0-9-]*)/i.exec(base);
      if (m) out.add(m[1].toLowerCase());
    }
  } catch { /* not a URL */ }
  return out;
}

// ---------- model entries ----------
const raw = fs.readFileSync(modelPath, 'utf8');
const lines = raw.split('\n');
const model = JSON.parse(raw);

// line index of every node, by structural scan (never by matching title text: two entries in this
// repo legitimately share a title, e.g. the flagship and its catalogue row).
function indexNodeLines(text) {
  const map = new Map();
  const stack = [];
  let i = 0, line = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\n') { line++; i++; continue; }
    if (ch === '"') {
      let j = i + 1, s = '';
      while (j < text.length) { const c = text[j]; if (c === '\\') { s += text[j + 1]; j += 2; continue; } if (c === '"') break; s += c; j++; }
      let k = j + 1;
      while (k < text.length && /\s/.test(text[k])) k++;
      if (stack.length && stack[stack.length - 1].type === 'obj' && text[k] === ':') { stack[stack.length - 1].pendingKey = s; i = k + 1; continue; }
      i = j + 1; continue;
    }
    if (ch === '{' || ch === '[') {
      const p = stack[stack.length - 1];
      let pth;
      if (!p) pth = '$';
      else if (p.type === 'arr') pth = `${p.path}[${p.count++}]`;
      else pth = `${p.path}.${p.pendingKey}`;
      stack.push({ type: ch === '{' ? 'obj' : 'arr', path: pth, count: 0, pendingKey: null });
      map.set(pth, line);
      i++; continue;
    }
    if (ch === '}' || ch === ']') { stack.pop(); i++; continue; }
    i++;
  }
  return map;
}
const nodeLines = indexNodeLines(raw);

const entries = [];
function walk(node, p, parentArray) {
  if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${p}[${i}]`, true)); return; }
  if (node && typeof node === 'object') {
    const t = (node._title && node._title.text) || (node._name && node._name.text) || '';
    const to = (node._action && node._action.to) || '';
    if (t || to) {
      const ks = new Set([...(node._key ? [String(node._key).toLowerCase()] : []), ...keysOf(to)]);
      entries.push({
        path: p, title: t, to, keys: ks, img: node._image || null,
        inArray: !!parentArray, isContainer: !!(node._items || node._collections),
        line: nodeLines.has(p) ? nodeLines.get(p) : -1,
      });
    }
    for (const k of Object.keys(node)) walk(node[k], Array.isArray(node) ? p : `${p}.${k}`, false);
  }
}
walk(model, '$', false);

// ---------- captured images ----------
const nodes = JSON.parse(fs.readFileSync(path.join(dir, 'nodes.json'), 'utf8'));
const rows = JSON.parse(execFileSync('node', ['.scratch/38-images-sweep/imgattr.mjs', dir, String(minW), String(minH)], { encoding: 'utf8', maxBuffer: 1 << 28 }));
const groups = new Map();
for (const r of rows) {
  const placeholder = !r.src || /^data:image\/gif/i.test(r.src);
  const url = absolutize(placeholder ? (r.dataSrc || r.src) : r.src);
  if (!url || /^data:/i.test(url)) continue;
  if (!groups.has(url)) groups.set(url, []);
  groups.get(url).push({ ...r, url, used: false });
}

const report = [];
const claimed = new Set();
function assign(c, entry, method) {
  entry.newImage = { image: c.url, alt: norm(c.alt) };
  for (const x of groups.get(c.url)) x.used = true;
  claimed.add(entry.path);
  report.push([method, entry.path, entry.title.slice(0, 30), `${c.w}x${c.h}`, c.url.slice(-64)]);
}
const targetable = (e) => !claimed.has(e.path) && !e.img && !e.isContainer && e.title && norm(e.title).length >= 2;

// ---- M1 ----
for (const [url, cs] of groups) {
  const c = cs[0];
  const hrefKeys = keysOf(c.href);
  if (!hrefKeys.size) continue;
  const hits = entries.filter((e) => e.inArray && targetable(e) && e.keys.size && [...e.keys].some((k) => hrefKeys.has(k)));
  if (hits.length === 1) assign(c, hits[0], 'M1-bizkey');
  else if (hits.length > 1) report.push(['SKIP-M1-ambiguous', hits.map((h) => h.path).join(','), url.slice(-50)]);
}
// ---- M2 ----
for (const [url, cs] of groups) {
  const c = cs[0];
  if (c.used) continue;
  const a = norm(c.alt);
  if (!a || a.length < 2) continue;
  const all = entries.filter((e) => norm(e.title) === a);
  if (all.length !== 1) { if (all.length > 1) report.push(['SKIP-M2-ambiguous', all.map((h) => h.path).join(','), url.slice(-50)]); continue; }
  if (!targetable(all[0])) { report.push(['SKIP-M2-best-not-targetable', all[0].path, url.slice(-50)]); continue; }
  assign(c, all[0], 'M2-alt');
}
// ---- M3 ----
// The longest matching title wins *over all entries*, including ones that already carry an image:
// `Mate 80 Pro Max 风驰版` is the longest prefix of that card's anchor text, so its asset must not
// fall back to the shorter `Mate 80`. A card whose best match is already imaged contributes nothing.
const BADGE = /^(最新|新品首发|新品|热销|预购|预售|推荐)+/;
for (const [url, cs] of groups) {
  const c = cs[0];
  if (c.used) continue;
  const a = norm(c.aText).replace(BADGE, '');
  if (!a || a.length < 2) continue;
  const all = entries.filter((e) => e.title && a.startsWith(norm(e.title)));
  if (!all.length) continue;
  const maxLen = Math.max(...all.map((h) => norm(h.title).length));
  const best = all.filter((h) => norm(h.title).length === maxLen);
  if (best.length > 1) { report.push(['SKIP-M3-ambiguous', best.map((h) => h.path).join(','), url.slice(-50)]); continue; }
  if (!targetable(best[0])) { report.push(['SKIP-M3-best-not-targetable', best[0].path, url.slice(-50)]); continue; }
  assign(c, best[0], 'M3-anchor');
}
// ---- M4 (opt-in) ----
if (only) {
  const byColl = new Map();
  for (const e of entries) {
    if (!e.inArray || e.img || claimed.has(e.path)) continue;
    const coll = e.path.replace(/\[\d+\]$/, '');
    if (!coll.startsWith(only)) continue;
    if (!byColl.has(coll)) byColl.set(coll, []);
    byColl.get(coll).push(e);
  }
  for (const [coll, es] of byColl) {
    const left = [...groups.values()].map((cs) => cs[0]).filter((c) => !c.used);
    if (!left.length || es.length !== left.length) { if (left.length) report.push(['SKIP-M4-count-mismatch', `${coll} entries=${es.length} cands=${left.length}`, '']); continue; }
    const ys = left.map((c) => c.y).sort((a, b) => a - b);
    if (ys.length > 1 && (ys[ys.length - 1] - ys[0]) > 4000) { report.push(['SKIP-M4-scattered', coll, '']); continue; }
    [...left].sort((a, b) => a.y - b.y || a.x - b.x).forEach((c, i) => assign(c, es[i], 'M4-yorder'));
  }
}

// ---------- mirror slow source assets (byte-for-byte) ----------
const assetDir = 'm1/curated/assets';
const mirrored = [];
const planMirrors = entries.filter((e) => e.newImage);
for (const e of planMirrors) e.newImage.image0 = e.newImage.image;
function tmpOf(dest) { return dest + '.part'; }
function curlTo(url, dest) {
  return new Promise((res, rej) => {
    const p = spawn('curl', ['-sSfL', '--max-time', '120', '-o', tmpOf(dest), url], { stdio: ['ignore', 'ignore', 'inherit'] });
    p.on('close', (code) => (code === 0 ? res() : rej(new Error(`curl exit ${code} for ${url}`))));
  });
}
if (apply) {
  const jobs = [];
  for (const e of planMirrors) {
    if (!mirrors.some((re) => re.test(e.newImage.image))) continue;
    const base = e.newImage.image.split('?')[0].split('/').pop();
    const name = `${assetPrefix}${base}`;
    const dest = path.join(assetDir, name);
    e.newImage.image = `../assets/${name}`;
    if (fs.existsSync(dest)) { mirrored.push([name, fs.statSync(dest).size]); continue; }
    jobs.push(curlTo(e.newImage.image0 ?? e.newImage.image, dest).then(() => { fs.renameSync(tmpOf(dest), dest); mirrored.push([name, fs.statSync(dest).size]); }));
  }
  await Promise.all(jobs);
}

// ---------- report ----------
console.log('### ASSIGNED');
for (const r of report.filter((x) => !String(x[0]).startsWith('SKIP'))) console.log(r.join('\t'));
console.log('### SKIPPED');
for (const r of report.filter((x) => String(x[0]).startsWith('SKIP'))) console.log(r.join('\t'));
const un = [...groups.values()].map((cs) => cs[0]).filter((c) => !c.used);
console.log(`### UNMATCHED CANDIDATES (${un.length})`);
for (const c of un) console.log([c.idx, `${c.w}x${c.h}`, Math.round(c.y), (c.href || '-').slice(0, 44), '|', norm(c.alt).slice(0, 22), '|', norm(c.aText).slice(0, 30)].join('\t'));
const counts = {};
for (const r of report.filter((x) => !String(x[0]).startsWith('SKIP'))) counts[r[0]] = (counts[r[0]] || 0) + 1;
console.log('### MIX', JSON.stringify(counts));

// ---------- apply ----------
if (apply) {
  const inserts = [];
  for (const e of entries) {
    if (!e.newImage) continue;
    if (e.line < 0 || e.line >= lines.length || lines[e.line].indexOf('{') < 0) { console.error('BAD-LINE', e.path, e.line); continue; }
    const near = lines.slice(e.line, e.line + 15).join('\n');
    if (e.title && !near.includes(JSON.stringify(e.title))) { console.error('BAD-LINE-content', e.path, e.line); continue; }
    const indent = ' '.repeat(lines[e.line].indexOf('{') + 1);
    const { image, alt } = e.newImage;
    inserts.push({ at: e.line + 1, text: `${indent}"_image": { "image": ${JSON.stringify(image)}${alt ? `, "alt": ${JSON.stringify(alt)}` : ''} },` });
  }
  inserts.sort((a, b) => b.at - a.at);
  for (const i of inserts) lines.splice(i.at, 0, i.text);
  fs.writeFileSync(modelPath, lines.join('\n'));
  if (mirrored.length) console.log('### MIRRORED', JSON.stringify(mirrored));
}
