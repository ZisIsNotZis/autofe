// Round 45: byte-mirror the source images that the apple-16 / aliyun-ecs models will
// reference, then patch the models to point at the local asset. Verify reachability first
// (curl -r 0-0 -> HTTP 200/206) and refuse to attach anything that is not fully fetched.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = '.';
const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJSON = (p, o) => fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n');

function srcsOf(page) {
  const html = fs.readFileSync(`corpus/${page}/dom.html`, 'utf8');
  return [...html.matchAll(/<img[^>]*>/g)].map((m) => {
    const src = (m[0].match(/\ssrc="([^"]*)"/) || [, ''])[1].replace(/&amp;/g, '&');
    const alt = (m[0].match(/\salt="([^"]*)"/) || [, ''])[1].replace(/&amp;/g, '&');
    return { src, alt };
  });
}
function probe(url) {
  try {
    const out = execFileSync('curl', ['-s', '-r', '0-0', '-o', '/dev/null', '-w', '%{http_code}', url], { timeout: 30000 }).toString().trim();
    return ['200', '206'].includes(out);
  } catch { return false; }
}
function mirror(url, name) {
  const dest = path.join(ROOT, 'm1/curated/assets', name);
  execFileSync('curl', ['-s', '-f', '-L', '--max-time', '90', '-o', dest, url], { timeout: 120000 });
  const sz = fs.statSync(dest).size;
  if (sz <= 0) throw new Error(`empty download for ${name}`);
  return sz;
}

const jobs = [
  // ---- apple-com/iphone-16 ----
  { page: 'apple-com/iphone-16', idx: 3, name: 'apple16-hero.jpg', type: 'hero',
    path: [], altFromSrc: true },
  { page: 'apple-com/iphone-16', idx: 22, name: 'apple16-services.png', type: 'services',
    path: ['services'], altFromSrc: true },
  { page: 'apple-com/iphone-16', idx: 23, name: 'apple16-compare-duo.png', type: 'compare', path: ['compare', '_lines', 0], altFromSrc: true },
  { page: 'apple-com/iphone-16', idx: 28, name: 'apple16-compare-18pro.png', type: 'compare', path: ['compare', '_lines', 1], altFromSrc: true },
  { page: 'apple-com/iphone-16', idx: 32, name: 'apple16-compare-air.png', type: 'compare', path: ['compare', '_lines', 2], altFromSrc: true },
  { page: 'apple-com/iphone-16', idx: 36, name: 'apple16-compare-17.png', type: 'compare', path: ['compare', '_lines', 3], altFromSrc: true },
  { page: 'apple-com/iphone-16', idx: 40, name: 'apple16-compare-17e.png', type: 'compare', path: ['compare', '_lines', 4], altFromSrc: true },
  { page: 'apple-com/iphone-16', idx: 19, name: 'apple16-inbox-phone.png', type: 'inbox', path: ['inbox', '_items', 0], altFromSrc: true },
  { page: 'apple-com/iphone-16', idx: 20, name: 'apple16-inbox-cable.png', type: 'inbox', path: ['inbox', '_items', 1], altFromSrc: true },
  { page: 'apple-com/iphone-16', idx: 17, name: 'apple16-recap.jpg', type: 'recap', path: ['recap'], altFromSrc: true },
  // ---- aliyun-com/product-ecs ----
  { page: 'aliyun-com/product-ecs', idx: 19, name: 'aliyun-ecs-hero.png', type: 'hero', path: [], altFromSrc: true },
];

const srcCache = {};
const report = [];
for (const j of jobs) {
  srcCache[j.page] ??= srcsOf(j.page);
  const { src, alt } = srcCache[j.page][j.idx];
  if (!src || !/^https?:/.test(src)) { report.push({ ...j, ok: false, why: 'no http src' }); continue; }
  const ok = probe(src);
  if (!ok) { report.push({ ...j, ok: false, why: 'unreachable' }); continue; }
  let bytes;
  try { bytes = mirror(src, j.name); } catch (e) { report.push({ ...j, ok: false, why: String(e.message) }); continue; }
  const modelPath = `m1/curated/${j.page}.json`;
  const model = readJSON(modelPath);
  let node = model;
  for (const k of j.path) node = node[k];
  node._image = { image: `../assets/${j.name}`, alt: j.altFromSrc ? alt : node?._title?.text || '' };
  writeJSON(modelPath, model);
  report.push({ ...j, ok: true, bytes, src: src.slice(0, 60), alt: alt.slice(0, 50) });
}
for (const r of report) console.log((r.ok ? 'OK  ' : 'SKIP') + ` [${r.type}] ${r.name || ''} ${r.ok ? r.bytes + 'B' : r.why} ${r.path.join('.')}  alt=${r.alt || ''}`);
const bad = report.filter((r) => !r.ok);
console.log(`\nmirrored ${report.filter((r) => r.ok).length}/${jobs.length}, skipped ${bad.length}`);
if (bad.length) console.log('skipped:', bad.map((b) => `${b.name}:${b.why}`).join(', '));
