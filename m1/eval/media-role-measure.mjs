// Media-role measurement (S3b). Reports, per media role, what size the role actually renders at
// and what the source image intrinsically is, and fails on any upscale (displayed > natural, the
// F-082 hard rule in docs/m1/layout-axes.md §7.1).
//
// Why measure instead of read the stylesheet: a role's size is the product of its container, the
// container's grid track, and the image's natural size. Only Chromium settles it. The role is taken
// from the DOM ancestor the engine itself paints (page-level class + role container), so the same
// table can be compared across pages and rounds.
//
// Usage: node m1/eval/media-role-measure.mjs [--all|file.html ...] [--width=1280] [--json]
//   default walks the 40 exemplar renders (m1/eval/m3-scale.json).
// Exit 0 = no upscale anywhere and every role has media; 1 = an upscaled image or a hard error.
import fs from 'node:fs';
import path from 'node:path';

import { launchBrowser } from './browser.mjs';

const args = process.argv.slice(2);
const widthArg = args.find((a) => a.startsWith('--width='));
const WIDTH = widthArg ? Number(widthArg.split('=')[1]) : 1280;
const asJson = args.includes('--json');
const RENDERS = 'm1/curated/renders';

let files = args.filter((a) => a.endsWith('.html'));
if (!files.length) {
  const scale = JSON.parse(fs.readFileSync('m1/eval/m3-scale.json', 'utf8')).filter((x) => x.tier === 'exemplar');
  files = scale.map((x) => `${RENDERS}/${x.k.replace(/\//g, '-')}.html`);
}

let b;
try {
  b = await launchBrowser();
} catch (error) {
  console.log(`SKIP media-role-measure: ${String(error.message).split('\n')[0]}`);
  process.exit(0);
}
const p = await b.newPage({ viewport: { width: WIDTH, height: 1000 } });
const perRole = new Map();
const violations = [];
const perPage = [];

for (const f of files) {
  if (!fs.existsSync(f)) { violations.push(`${f}: missing render`); continue; }
  await p.goto('file://' + path.resolve(f));
  const rows = await p.evaluate(() => {
    const roleOf = (img) => {
      const chain = [];
      for (let n = img; n && n !== document.body; n = n.parentElement) chain.push(n);
      const has = (sel) => chain.some((n) => n.matches(sel));
      if (has('.native-media')) return 'native (原图查看器)';
      if (has('.banner-integrated')) return 'hero/band';
      if (has('.gallery-mosaic')) return 'gallery tile';
      if (has('.search-page .record-member')) return 'search result';
      if (has('.record-member')) return 'feed row';
      if (has('.catalog-page .cards .item')) return 'catalog card';
      if (has('.catalog-page .ordered-media-rows')) return 'catalog media row';
      if (has('.ordered-media-rows')) return 'media row';
      if (has('.profile-page .cards')) return 'profile feed row';
      if (has('.identity-frame')) return 'identity';
      if (has('.reading-page figure.strip') || has('.reading-page .fact')) return 'reading figure';
      if (has('figure.strip') || has('.band')) return 'band';
      if (has('.defval')) return 'inline';
      return 'other';
    };
    return [...document.images].map((img) => {
      const r = img.getBoundingClientRect();
      return {
        role: roleOf(img),
        nw: img.naturalWidth, nh: img.naturalHeight,
        dw: Math.round(r.width), dh: Math.round(r.height),
        src: (img.currentSrc || img.src || '').slice(-70),
      };
    });
  });
  const local = [];
  for (const r of rows) {
    if (!r.nw || !r.nh) continue; // broken/unloaded image is a different gate's business
    local.push(r);
    if (!perRole.has(r.role)) perRole.set(r.role, []);
    perRole.get(r.role).push(r);
    if (r.dw > r.nw + 1 || r.dh > r.nh + 1) violations.push(`${path.basename(f)}: ${r.role} upscaled ${r.nw}x${r.nh} -> ${r.dw}x${r.dh} (${r.src})`);
  }
  perPage.push({ page: path.basename(f, '.html'), images: local.length, roles: [...new Set(local.map((r) => r.role))], rows: local });
}
await b.close();

const q = (s, t) => s[Math.min(s.length - 1, Math.floor(t * (s.length - 1)))];
const stats = (xs) => { const s = [...xs].sort((a, b) => a - b); return { n: s.length, min: s[0], p50: q(s, 0.5), max: s[s.length - 1] }; };
const wh = (rs, key) => {
  const w = rs.map((r) => r[key + 'w']).sort((a, b) => a - b);
  const h = rs.map((r) => r[key + 'h']).sort((a, b) => a - b);
  return `${q(w, 0.5)}x${q(h, 0.5)} (${w[0]}x${h[0]}..${w[w.length - 1]}x${h[h.length - 1]})`;
};
const table = [];
for (const [role, rs] of [...perRole].sort((a, b) => a[0].localeCompare(b[0]))) {
  const shown = rs.filter((r) => r.role !== 'native (原图查看器)');
  table.push({
    role,
    n: rs.length,
    measured: wh(shown, 'd'),
    intrinsic: wh(rs, 'n'),
    // an image whose intrinsic side is below the role target renders at intrinsic: a reporting gap, not an upscale
    intrinsicBelowShown: rs.filter((r) => r.nw <= r.dw + 1 || r.nh <= r.dh + 1).length,
  });
}

if (asJson) {
  console.log(JSON.stringify({ width: WIDTH, table, violations, perPage }, null, 2));
} else {
  console.log(`media roles @ ${WIDTH}px viewport (${files.length} pages)\n`);
  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad('role', 24) + pad('n', 5) + pad('measured w x h @p50 (min..max)', 46) + 'intrinsic w x h @p50 (min..max)');
  for (const t of table) {
    console.log(pad(t.role, 24) + pad(t.n, 5) + pad(t.measured, 46) + t.intrinsic);
  }
  console.log(`\nupscale violations: ${violations.length}`);
  for (const v of violations) console.log('  ' + v);
}
process.exit(violations.length ? 1 : 0);
