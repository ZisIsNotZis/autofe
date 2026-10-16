// Regenerate round-62 image assets lost in re-clone (round 63).
// Method per task contract: for each model-referenced 62-* asset, locate the
// matching image in the FRESH capture (dom.html img src + nodes.json bbox) and
// crop from full.png; never upscale (F-082). Provenance hints (old bbox, URL,
// alt) come from .scratch/62-all-sites/integration/proof/content/content/asset-provenance.json.
// Matching is strict: URL match, or (URL-less region crops) unique
// dimension+order match; anything else is reported NOT_FOUND, not substituted.
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
    const dataSrc = (attrs.match(/\sdata-src\s*=\s*"([^"]*)"/) ?? attrs.match(/\sdata-src\s*=\s*'([^']*)'/) ?? [])[1];
    out.push({ name, src, dataSrc, attrs, pos: i - 1 });
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
    const code = k.startsWith('#x') ? parseInt(k.slice(2), 10) : NaN;
    return Number.isFinite(code) ? String.fromCodePoint(code) : m;
  });
}
function absolutizeSrc(rawSrc, baseUrl) {
  // baseUrl is tried as-is and with a trailing slash: round-62 provenance URLs
  // resolve relative srcs against the directory form (…/sizes/ + media/x.png),
  // while fresh meta.url may lack the slash.
  // relative srcs resolve against the directory form (…/sizes/ + media/x.png),
  // matching round-62 provenance URLs; absolute srcs pass through.
  const s = decodeAttrEntities(String(rawSrc ?? '').trim());
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) || /^(data|blob):/i.test(s)) return s;
  const dirBase = /\/$/.test(baseUrl) ? baseUrl : baseUrl + '/';
  try { return new URL(s, dirBase).href; } catch { /* fall through */ }
  try { return new URL(s, baseUrl).href; } catch { return ''; }
}
function absolutizeSrcStrict(rawSrc, baseUrl) {
  const s = decodeAttrEntities(String(rawSrc ?? '').trim());
  if (!s) return '';
  if (/^(data|blob):/i.test(s)) return s;
  if (/^javascript:/i.test(s)) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return s;
  try { return new URL(s, baseUrl).href; } catch { return ''; }
}

const worklist = JSON.parse(fs.readFileSync('/tmp/asset-worklist.json', 'utf8'));
const byPage = new Map();
for (const w of worklist) {
  if (!byPage.has(w.page)) byPage.set(w.page, []);
  byPage.get(w.page).push(w);
}

function imgsOf(dir) {
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const nodes = JSON.parse(fs.readFileSync(path.join(dir, 'nodes.json'), 'utf8'));
  const html = fs.readFileSync(path.join(dir, 'dom.html'), 'utf8');
  const tags = scanElementTags(html);
  const imgs = nodes.filter((n) => n.tag === 'img');
  // whole-page alignment gate (round-26b rule, reused)
  let aligned = 0, checked = 0, firstBad = '';
  for (const n of nodes) {
    if (typeof n.cleanedIndex !== 'number' || !n.tag) continue;
    checked++;
    const got = tags[n.cleanedIndex];
    if (got && got.name === String(n.tag).toLowerCase()) aligned++;
    else if (!firstBad) firstBad = `idx ${n.cleanedIndex} tag=${n.tag}`;
  }
  const alignOk = checked > 0 && aligned === checked;
  const rows = imgs.map((n) => {
    const t = tags[n.cleanedIndex] ?? {};
    const raw = (t.src && !/^data:/i.test(t.src)) ? t.src : (t.dataSrc || t.src || '');
    // nearest preceding <a href=…> (card link) for product-grid disambiguation
    let cardHref = '';
    if (typeof t.pos === 'number') {
      const pre = html.slice(0, t.pos);
      const last = pre.match(/<a\s[^>]*href\s*=\s*"([^"]*)"[^>]*>\s*$/s);
      if (last) cardHref = last[1];
      else {
        const all = pre.match(/<a\s[^>]*href\s*=\s*"([^"]*)"[^>]*>/g);
        if (all) cardHref = (all[all.length - 1].match(/href\s*=\s*"([^"]*)"/) ?? [])[1] ?? '';
      }
    }
    return {
      cleanedIndex: n.cleanedIndex,
      cleanedPath: n.cleanedPath,
      bbox: n.bbox ?? {},
      alt: decodeAttrEntities(n.name ?? ''),
      src: absolutizeSrc(raw, meta.url),
      cardHref: decodeAttrEntities(cardHref),
      attrs: (t.attrs ?? '').slice(0, 300),
    };
  });
  // all visible element nodes (for region-crop structural matching)
  const elNodes = nodes.filter((n) => n.tag && n.bbox && n.bbox.w > 0)
    .map((n) => ({ tag: n.tag, cleanedPath: n.cleanedPath, bbox: n.bbox, name: n.name ?? '' }));
  return { alignOk, alignInfo: `${aligned}/${checked} ${firstBad}`, rows, elNodes, meta };
}

// stripe hero: img node dropped from nodes.json; locate via tag attrs.
function nodeByAttrMarker(dir, marker) {
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const nodes = JSON.parse(fs.readFileSync(path.join(dir, 'nodes.json'), 'utf8'));
  const html = fs.readFileSync(path.join(dir, 'dom.html'), 'utf8');
  const tags = scanElementTags(html);
  for (const n of nodes) {
    const t = tags[n.cleanedIndex];
    if (t && t.attrs && t.attrs.includes(marker)) return { node: n, tag: t, meta };
  }
  return null;
}
const stripeHero = nodeByAttrMarker('corpus/stripe-docs/payments', 'HeroSection-right-image');
const stripeHeroInfo = stripeHero ? { cleanedIndex: stripeHero.node.cleanedIndex, bbox: stripeHero.node.bbox, attrs: stripeHero.tag.attrs.slice(0, 200), inNodes: true } : 'no node carries HeroSection-right-image attrs';
console.error('[stripe-hero]', JSON.stringify(stripeHeroInfo));

const report = [];
for (const [page, items] of byPage) {
  const dir = path.join('corpus', page);
  const cap = imgsOf(dir);
  console.error(`[page] ${page} align=${cap.alignOk} imgs=${cap.rows.length}`);
  for (const w of items) {
    const rec = { asset: w.asset, page, method: w.status, provenanceUrl: w.url, oldBbox: w.oldBbox };
    if (w.url) {
      let cands = cap.rows.filter((r) => r.src === w.url);
      if (cands.length > 1 && w.requireCardHrefSuffix) {
        cands = cands.filter((r) => (r.cardHref ?? '').endsWith(w.requireCardHrefSuffix));
      }
      if (cands.length === 0) {
        rec.match = 'NOT_FOUND';
        rec.evidence = `no fresh img with src=${w.url}`;
      } else {
        cands.sort((a, b) => Math.abs((a.bbox.y ?? 0) - (w.oldBbox?.y ?? 0)) - Math.abs((b.bbox.y ?? 0) - (w.oldBbox?.y ?? 0)));
        rec.match = 'url';
        rec.node = cands[0];
        rec.alternatives = cands.length - 1;
        rec.allCandidates = cands.map((c) => ({ bbox: c.bbox, cardHref: c.cardHref, cleanedIndex: c.cleanedIndex }));
      }
    } else {
      // region crop: exact cleanedPath match when the page structure is
      // unchanged (linear home: fresh y values equal round-62), else unique
      // dimension match within 2px on w and h
      const tw = w.naturalSize[0], th = w.naturalSize[1];
      let cands = w.cleanedPath ? cap.elNodes.filter((r) => r.cleanedPath === w.cleanedPath) : [];
      if (cands.length !== 1) cands = cap.elNodes.filter((r) => Math.abs(r.bbox.w - tw) <= 2 && Math.abs(r.bbox.h - th) <= 2);
      rec.dimCandidates = cands.map((c) => ({ tag: c.tag, y: c.bbox.y, x: c.bbox.x, w: c.bbox.w, h: c.bbox.h, cleanedPath: c.cleanedPath }));
      if (cands.length !== 1) {
        rec.match = cands.length === 0 ? 'NOT_FOUND' : 'AMBIGUOUS';
        rec.evidence = `region dimension ${tw}x${th}: ${cands.length} fresh element nodes within 2px`;
      } else {
        rec.match = 'region-dim';
        rec.node = { bbox: cands[0].bbox, cleanedPath: cands[0].cleanedPath, tag: cands[0].tag };
      }
    }
    report.push(rec);
  }
}
fs.writeFileSync('/tmp/asset-matches.json', JSON.stringify(report, null, 1));
const ok = report.filter((r) => !String(r.match).startsWith('NOT') && r.match !== 'AMBIGUOUS');
console.log(`matched=${ok.length} notfound=${report.filter((r) => r.match === 'NOT_FOUND').length} ambiguous=${report.filter((r) => r.match === 'AMBIGUOUS').length}`);
for (const r of report) {
  if (r.match !== 'url' && r.match !== 'region-dim') console.log('PROBLEM', r.asset, r.match, r.evidence ?? '');
  else console.log('ok', r.match, r.asset, JSON.stringify(r.node.bbox));
}
