// Image attribution: map captured content images to model entries, with a checkable
// attribution evidence trail for every candidate.
//
// WHY "NEAREST PRECEDING <a>" IS NOT AN ATTRIBUTION
// --------------------------------------------------
// The round-38 scanner walked the DOM but its low-level tokenizer dropped closing tags, so
// the "ancestor" stack never popped. What it called a candidate's parent chain was really
// "the most recent still-open start tag in document order" — i.e. the nearest *preceding*
// `<a>`, not the `<a>` that *encloses* the image. Round 41 caught the consequence on the
// huawei/aliyun/sspai pages: an image sitting in a plain content block *after* a card link
// was attributed to that link's entry (once even to a different entry whose `_action.to`
// was the preceding link's `href`). Attribution must therefore be built on the *enclosing*
// anchor: this scanner records closing tags and pops the stack, and refuses to report any
// mapping while `dangling-open-tags != 0` (a nonzero count means the stack is still lying).
//
// FOUR ATTRIBUTION METHODS, applied in order and never guessed:
//   M1 business key : a key of the image's enclosing <a href> equals a key of the entry's
//                     `_action.to` / `_key` (query values, path basenames, id-like segments).
//   M2 alt          : normalized source `alt` equals the entry title.
//   M3 anchor name  : normalized ENCLOSING anchor accessible name starts with the entry title
//                     (longest title wins; a tie is reported, never guessed).
//   M4 y-order      : opt-in via `--only=<collection path>`; equal counts inside one y-band
//                     (bbox.y span <= 4000) only.
//
// CLI:
//   node m1/eval/imgattr.mjs <corpus-dir> <model.json> [--minw=N] [--minh=N]
//        [--only=<collection-path>] [--yband=min-max] [--json] [--quiet]
//   <corpus-dir> is `corpus/<site>/<page>` (needs dom.html, nodes.json, meta.json).
//   Output: candidate ⇄ entry mapping (one line per assignment) plus the evidence per line
//   (method, entry path/title, image url/size/bbox, enclosing-anchor href + accessible name).
//   `--json` prints the same as JSON. Exit code is 0 only when `dangling-open-tags == 0`
//   (otherwise the ancestry — and thus every mapping — is untrustworthy: exit 2).
import fs from 'node:fs';
import path from 'node:path';

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW_TEXT = new Set(['script', 'style']);

// ---------- DOM scan: open + close tokens, parents that actually pop ----------
// Returns `tags` (open/void tags only, in document order == the capture's `cleanedIndex`),
// `parents[k]` (index into `tags` of the enclosing element, -1 at root), `dangling`
// (elements still open at EOF) and `unmatchedClose` (closing tags with no matching open).
export function scanDom(html) {
  const tags = [];
  const parents = [];
  const closeEnd = []; // end position in html of the matching `</name>` (html.length if left dangling)
  const stack = [];
  let dangling = 0, unmatchedClose = 0;
  let i = 0; const n = html.length;
  while (i < n) {
    const lt = html.indexOf('<', i);
    if (lt < 0) break;
    i = lt + 1;
    const c = html[i];
    if (c === '!') { if (html.startsWith('!--', i)) { const e = html.indexOf('-->', i); i = e < 0 ? n : e + 3; } else { const e = html.indexOf('>', i); i = e < 0 ? n : e + 1; } continue; }
    if (c === '?') { const e = html.indexOf('>', i); i = e < 0 ? n : e + 1; continue; }
    if (c === '/') {
      // Closing tag: pop the stack down to its matching open (records closures; this is the
      // line the round-38 scanner was missing). Record where each popped element really ends.
      let j = i + 1; while (j < n && !/[\s/>]/.test(html[j])) j++;
      const name = html.slice(i + 1, j).toLowerCase();
      const gt = html.indexOf('>', j); const end = gt < 0 ? n : gt;
      let found = false;
      for (let s = stack.length - 1; s >= 0; s--) if (tags[stack[s]].name === name) { for (let q = stack.length - 1; q >= s; q--) closeEnd[stack[q]] = end + 1; stack.length = s; found = true; break; }
      if (!found) unmatchedClose++;
      i = end + 1;
      continue;
    }
    if (!/[A-Za-z]/.test(c)) { continue; }
    let j = i; while (j < n && !/[\s/>]/.test(html[j])) j++;
    const name = html.slice(i, j).toLowerCase();
    const gt = html.indexOf('>', j); const end = gt < 0 ? n : gt;
    const attrs = html.slice(j, end);
    const raw = html.slice(lt, end + 1);
    const k = tags.length;
    tags.push({ name, attrs, raw, start: lt, end: end + 1 });
    parents[k] = stack.length ? stack[stack.length - 1] : -1;
    closeEnd[k] = n;
    const selfClose = /\/\s*>$/.test(raw.trim()) || VOID.has(name);
    if (!selfClose) stack.push(k);
    i = end + 1;
    if (RAW_TEXT.has(name)) { const close = html.indexOf('</' + name, i); if (close >= 0) { const e = html.indexOf('>', close); closeEnd[k] = e < 0 ? n : e + 1; i = e < 0 ? n : e + 1; } }
  }
  dangling = stack.length;
  return { tags, parents, closeEnd, dangling, unmatchedClose };
}

// ---------- small attribute/text helpers ----------
export function decodeAttrEntities(s) {
  return String(s).replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (m, e) => {
    const map = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
    const k = e.toLowerCase(); if (k in map) return map[k];
    const code = k.startsWith('#x') ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : m;
  });
}
export function attrOf(attrs, name) {
  const m = attrs.match(new RegExp('\\s' + name + '\\s*=\\s*"([^"]*)"', 'i')) ?? attrs.match(new RegExp('\\s' + name + "\\s*=\\s*'([^']*)'", 'i'));
  return m ? decodeAttrEntities(m[1]) : '';
}
export function absolutize(u, baseUrl) {
  const s = decodeAttrEntities(String(u ?? '').trim());
  if (!s) return '';
  if (/^(data|blob):/i.test(s)) return s;
  if (/^javascript:/i.test(s)) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return s;
  try { return new URL(s, baseUrl).href; } catch { return ''; }
}
export const norm = (s) => String(s ?? '')
  .replace(/<[^>]*>/g, '')
  .replace(/[\u200b\u2060]/g, '')
  .replace(/[（）()【】\[\]「」]/g, '')
  .replace(/\s+/g, '')
  .trim();

// index of the enclosing `<a>` for tag k (or -1); `chain` is the ancestor element names.
export function enclosingAnchor(tags, parents, k) {
  let p = parents[k]; const chain = []; let aIdx = -1;
  while (p >= 0) { chain.push(tags[p].name); if (aIdx < 0 && tags[p].name === 'a') aIdx = p; p = parents[p]; }
  return { aIdx, chain };
}

// ---------- captured candidates + per-image evidence ----------
// `names` maps a `cleanedIndex` to the capture's accessible name (from a11y/nodes), used
// for the enclosing anchor's accessible name when available (falls back to visible text).
export function imageRows({ html, nodes, meta, minW = 120, minH = 120 }) {
  const dom = scanDom(html);
  const { tags, parents, closeEnd } = dom;
  const byClean = new Map();
  for (const nd of nodes) if (typeof nd.cleanedIndex === 'number') byClean.set(nd.cleanedIndex, nd);
  // Visible text of the range [from, to): strip tag markup so the result is text, not a tag soup.
  const visibleText = (from, to) => html.slice(from, to).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const base = meta.redirectedUrl || meta.url;
  const rows = [];
  for (let k = 0; k < tags.length; k++) {
    if (tags[k].name !== 'img') continue;
    const nd = byClean.get(k);
    if (!nd) continue;
    const b = nd.bbox ?? {};
    if (!(b.w >= minW && b.h >= minH)) continue;
    const src = absolutize(attrOf(tags[k].attrs, 'src'), base);
    const dataSrc = absolutize(attrOf(tags[k].attrs, 'data-src') || attrOf(tags[k].attrs, 'data-original') || attrOf(tags[k].attrs, 'data-lazy-src'), base);
    const { aIdx, chain } = enclosingAnchor(tags, parents, k);
    const anchor = aIdx >= 0 ? byClean.get(aIdx) : null;
    const href = aIdx >= 0 ? absolutize(attrOf(tags[aIdx].attrs, 'href'), base) : '';
    // The anchor's real extent is [start of its open tag, closeEnd] — never a spill past `</a>`.
    const aText = aIdx >= 0 ? visibleText(tags[aIdx].end, closeEnd[aIdx]) : '';
    const aName = aIdx >= 0 ? (anchor?.name || aText) : '';
    rows.push({
      idx: k, w: b.w, h: b.h, x: b.x, y: b.y,
      src, dataSrc, alt: String(nd.name ?? '').slice(0, 120),
      enclosingAnchorIdx: aIdx, href, anchorName: String(aName).slice(0, 120), aText: aText.slice(0, 120),
      chain,
    });
  }
  return { rows, dangling: dom.dangling, unmatchedClose: dom.unmatchedClose };
}

// ---------- model entries ----------
const GENERIC = new Set(['cn', 'en', 'phones', 'phone', 'product', 'products', 'detail', 'html', 'htm', 'index', 'www', 'com', 'http', 'https']);
export function keysOf(u) {
  const out = new Set();
  if (!u) return out;
  let abs = String(u).trim();
  if (/^\/\//.test(abs)) abs = 'https:' + abs;
  try {
    const url = new URL(abs, 'https://x.invalid/');
    for (const [k, v] of url.searchParams) if (v && v.length >= 3) { out.add(v.toLowerCase()); out.add(`${k}=${v}`.toLowerCase()); }
    for (const s of url.pathname.split('/').filter(Boolean)) {
      const b = s.replace(/\.(html?|jpe?g|png|webp|gif|avif)$/i, '');
      if (b.length >= 4 && !GENERIC.has(b.toLowerCase())) out.add(b.toLowerCase());
      const m = /([a-z]*-?\d{3,}[a-z0-9-]*)/i.exec(b);
      if (m) out.add(m[1].toLowerCase());
    }
  } catch { /* not a URL */ }
  return out;
}
// line index of every node, by structural scan (never by title text: two entries legitimately
// share a title, e.g. a flagship and its catalogue row).
export function indexNodeLines(text) {
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
export function modelEntries(model) {
  const entries = [];
  (function walk(node, p, parentArray) {
    if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${p}[${i}]`, true)); return; }
    if (node && typeof node === 'object') {
      const t = (node._title && node._title.text) || (node._name && node._name.text) || '';
      const to = (node._action && node._action.to) || '';
      if (t || to) {
        const ks = new Set([...(node._key ? [String(node._key).toLowerCase()] : []), ...keysOf(to)]);
        entries.push({ path: p, title: t, to, keys: ks, img: node._image || null, inArray: !!parentArray, isContainer: !!(node._items || node._collections) });
      }
      for (const k of Object.keys(node)) walk(node[k], Array.isArray(node) ? p : `${p}.${k}`, false);
    }
  })(model, '$', false);
  return entries;
}

// ---------- attribution (M1..M4) ----------
// `opts`: { minW, minH, only, yband:[min,max] }. Returns assignments with the candidate's
// full evidence row so a reviewer can re-derive the mapping by hand.
export function attribute({ dir, modelPath, minW = 120, minH = 120, only = '', yband = [null, null] }) {
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const nodes = JSON.parse(fs.readFileSync(path.join(dir, 'nodes.json'), 'utf8'));
  const html = fs.readFileSync(path.join(dir, 'dom.html'), 'utf8');
  const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
  const { rows, dangling, unmatchedClose } = imageRows({ html, nodes, meta, minW, minH });
  const [bandMin, bandMax] = yband || [null, null];
  const groups = new Map();
  for (const r of rows) {
    if (bandMin != null && (r.y < bandMin || r.y > bandMax)) continue;
    const placeholder = !r.src || /^data:image\/gif/i.test(r.src);
    const url = placeholder ? (r.dataSrc || r.src) : r.src;
    if (!url || /^data:/i.test(url)) continue;
    if (!groups.has(url)) groups.set(url, []);
    groups.get(url).push({ ...r, url, used: false });
  }
  const entries = modelEntries(model);
  const assignments = [], skipped = [];
  const claimed = new Set();
  const assign = (c, entry, method) => {
    for (const x of groups.get(c.url)) x.used = true;
    claimed.add(entry.path);
    assignments.push({
      method, entryPath: entry.path, title: entry.title, url: c.url, size: `${c.w}x${c.h}`, bbox: `${Math.round(c.x)},${Math.round(c.y)}`,
      evidence: { href: c.href, anchorName: c.anchorName, anchorText: c.aText, chain: c.chain, alt: c.alt },
    });
  };
  const targetable = (e) => !claimed.has(e.path) && !e.img && !e.isContainer && e.title && norm(e.title).length >= 2;
  // M1 business key
  for (const [url, cs] of groups) {
    const c = cs[0];
    const hrefKeys = keysOf(c.href);
    if (!hrefKeys.size) continue;
    const hits = entries.filter((e) => e.inArray && targetable(e) && e.keys.size && [...e.keys].some((k) => hrefKeys.has(k)));
    if (hits.length === 1) assign(c, hits[0], 'M1-bizkey');
    else if (hits.length > 1) skipped.push({ method: 'SKIP-M1-ambiguous', entries: hits.map((h) => h.path), url });
  }
  // M2 alt == title
  for (const [url, cs] of groups) {
    const c = cs[0];
    if (c.used) continue;
    const a = norm(c.alt);
    if (!a || a.length < 2) continue;
    const all = entries.filter((e) => norm(e.title) === a);
    if (all.length !== 1) { if (all.length > 1) skipped.push({ method: 'SKIP-M2-ambiguous', entries: all.map((h) => h.path), url }); continue; }
    if (!targetable(all[0])) { skipped.push({ method: 'SKIP-M2-best-not-targetable', entries: [all[0].path], url }); continue; }
    assign(c, all[0], 'M2-alt');
  }
  // M3 enclosing-anchor accessible name starts with title (longest wins)
  const BADGE = /^(最新|新品首发|新品|热销|预购|预售|推荐)+/;
  for (const [url, cs] of groups) {
    const c = cs[0];
    if (c.used) continue;
    const a = norm(c.anchorName || c.aText).replace(BADGE, '');
    if (!a || a.length < 2) continue;
    const all = entries.filter((e) => e.title && a.startsWith(norm(e.title)));
    if (!all.length) continue;
    const maxLen = Math.max(...all.map((h) => norm(h.title).length));
    const best = all.filter((h) => norm(h.title).length === maxLen);
    if (best.length > 1) { skipped.push({ method: 'SKIP-M3-ambiguous', entries: best.map((h) => h.path), url }); continue; }
    if (!targetable(best[0])) { skipped.push({ method: 'SKIP-M3-best-not-targetable', entries: [best[0].path], url }); continue; }
    assign(c, best[0], 'M3-anchor');
  }
  // M4 y-order (opt-in)
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
      if (!left.length || es.length !== left.length) { if (left.length) skipped.push({ method: 'SKIP-M4-count-mismatch', entries: [coll], url: `entries=${es.length} cands=${left.length}` }); continue; }
      const ys = left.map((c) => c.y).sort((a, b) => a - b);
      if (ys.length > 1 && (ys[ys.length - 1] - ys[0]) > 4000) { skipped.push({ method: 'SKIP-M4-scattered', entries: [coll], url: '' }); continue; }
      [...left].sort((a, b) => a.y - b.y || a.x - b.x).forEach((c, i) => assign(c, es[i], 'M4-yorder'));
    }
  }
  const unmatched = [...groups.values()].map((cs) => cs[0]).filter((c) => !c.used);
  return { assignments, skipped, unmatched, dangling, unmatchedClose, rows, meta, entries };
}

// ---------- CLI ----------
function isMain() { return process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname); }
if (isMain()) {
  const args = process.argv.slice(2);
  const num = (p, d) => { const a = args.find((x) => x.startsWith(p)); return a ? Number(a.slice(p.length)) : d; };
  const only = (args.find((a) => a.startsWith('--only=')) || '').slice(7);
  const yb = (args.find((a) => a.startsWith('--yband=')) || '').slice(8);
  const yband = yb ? yb.split('-').map(Number) : [null, null];
  const asJson = args.includes('--json');
  const quiet = args.includes('--quiet');
  const [dir, modelPath] = args.filter((a) => !a.startsWith('--'));
  if (!dir || !modelPath) {
    console.error('usage: node m1/eval/imgattr.mjs <corpus-dir> <model.json> [--minw=N] [--minh=N] [--only=path] [--yband=min-max] [--json] [--quiet]');
    process.exit(64);
  }
  const res = attribute({ dir, modelPath, minW: num('--minw=', 120), minH: num('--minh=', 120), only, yband });
  if (asJson) console.log(JSON.stringify({ assignments: res.assignments, skipped: res.skipped, unmatched: res.unmatched, dangling: res.dangling, unmatchedClose: res.unmatchedClose }, null, 1));
  else {
    console.log(`dangling-open-tags = ${res.dangling}  unmatched-close-tags = ${res.unmatchedClose}`);
    console.log('### ASSIGNED');
    for (const a of res.assignments) console.log([
      a.method, a.entryPath, JSON.stringify(a.title), a.size, `@${a.bbox}`,
      `href=${a.evidence.href || '-'}`, `anchor-name=${JSON.stringify(a.evidence.anchorName)}`,
      `alt=${JSON.stringify(a.evidence.alt)}`, a.url.slice(-70),
    ].join('\t'));
    console.log(`### SKIPPED (${res.skipped.length})`);
    for (const s of res.skipped) console.log([s.method, s.entries.join(','), s.url].join('\t'));
    console.log(`### UNMATCHED CANDIDATES (${res.unmatched.length})`);
    for (const c of res.unmatched) console.log([c.idx, `${c.w}x${c.h}`, Math.round(c.y), c.href || '-', '|', norm(c.alt).slice(0, 22), '|', norm(c.anchorName).slice(0, 30)].join('\t'));
  }
  // A nonzero dangling count means the ancestry is still lying: never present mappings as truth.
  if (res.dangling !== 0) { console.error(`FATAL: dangling-open-tags=${res.dangling} > 0; ancestry untrustworthy`); process.exit(2); }
  void quiet;
}
