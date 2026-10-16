// worker-63: map broken img refs in 4 curated models to canonical URLs + asset names.
// Canonical URL: protocol-relative `//host` → `https://host`; `&amp;` → `&` (R1 decode).
// Asset name: 62-<site>-<page>-<sha256(canonical)[:12]>.<ext>  (round-62 rule, verified
// against .scratch/62-all-sites .../asset-provenance.json: 46d4bcfd2844, b2a4a48da7f3).
import fs from 'node:fs';
import crypto from 'node:crypto';
const sha12 = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);

const PAGES = [
  { site: 'mi-com', page: 'search-earbuds', file: 'm1/curated/mi-com/search-earbuds.json' },
  { site: 'mi-com', page: 'search-phone', file: 'm1/curated/mi-com/search-phone.json' },
  { site: 'sspai-com', page: 'home', file: 'm1/curated/sspai-com/home.json' },
  { site: 'sspai-com', page: 'matrix', file: 'm1/curated/sspai-com/matrix.json' },
  { site: 'stripe-docs', page: 'payments', file: 'm1/curated/stripe-docs/payments.json' },
];

function collect(node, out) {
  if (Array.isArray(node)) { node.forEach((n) => collect(n, out)); return; }
  if (!node || typeof node !== 'object') return;
  if (node._image && typeof node._image.image === 'string') out.push(node._image);
  for (const v of Object.values(node)) if (v && typeof v === 'object') collect(v, out);
}

const canon = (u) => u.replace(/^\/\//, 'https://').replace(/&amp;/g, '&');
const assets = new Map();      // canonical -> {name, refs: []}
const rows = [];
for (const p of PAGES) {
  const model = JSON.parse(fs.readFileSync(p.file, 'utf8'));
  const imgs = [];
  collect(model, imgs);
  for (const im of imgs) {
    const raw = im.image;
    const isBroken =
      raw.startsWith('//cdn.cnbj1.fds.api.mi-img.com/') ||           // file:// context breaks protocol-relative
      raw.startsWith('https://cdnfile.sspai.com/') ||                // all cdnfile refs fail in headless audit
      raw.startsWith('https://b.stripecdn.com/');                    // flaky remote hero
    if (!isBroken) continue;
    const c = canon(raw);
    if (!assets.has(c)) assets.set(c, { canonical: c, name: `62-${p.site}-${p.page}-${sha12(c)}`, refs: [] });
    const a = assets.get(c);
    a.refs.push({ page: `${p.site}/${p.page}`, raw });
    rows.push({ page: `${p.site}/${p.page}`, raw, canonical: c, asset: a.name });
  }
}
fs.writeFileSync('/tmp/broken-img-map.json', JSON.stringify([...assets.values()], null, 1));
fs.writeFileSync('/tmp/broken-img-refs.json', JSON.stringify(rows, null, 1));
console.log('unique assets:', assets.size, '| refs:', rows.length);
for (const a of assets.values()) console.log(a.name, '<-', a.refs.map((r) => r.page).join(','));
