// AutoFE · 并排对照图（原始整页截图 | 引擎渲染截图）
// 用法:
//   node m1/eval/side-by-side.mjs                      # 全部在册页面
//   node m1/eval/side-by-side.mjs airbnb-com/room-28871 bilibili-com/home
//   node m1/eval/side-by-side.mjs --flagged            # 用户点名的 10 页
// 输出: m1/curated/renders/sbs/<site>-<page>.png 与 sbs/index.html
//
// 目的：交付/评审时给人一张能直接比对“原站 vs 渲染”的图，而不是只给渲染图。
// 复用项目既有工具链（playwright-core），不引入新的图像依赖。
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const PW = process.env.AUTOFE_PLAYWRIGHT_CORE || '/home/z/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core';
const { chromium } = require(PW);
const CHROME = process.env.AUTOFE_CHROME_PATH || (process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell');

const FLAGGED = [
  'airbnb-com/room-28871', 'apple-com-cn/iphone-17', 'bilibili-com/read-home',
  'huawei-cn/consumer-phones', 'huawei-cn/home', 'huawei-cn/search-laptop',
  'mi-com/shop-category-list', 'sspai-com/matrix', 'sspai-com/u-jtc092al', 'sspai-com/post-102392',
];

let keys = process.argv.slice(2);
if (!keys.length || keys[0] === '--flagged') {
  const all = JSON.parse(fs.readFileSync('m1/eval/m3-final.json', 'utf8')).map((r) => r.k);
  keys = keys[0] === '--flagged' ? FLAGGED : all;
}

const OUT = 'm1/curated/renders/sbs';
fs.mkdirSync(OUT, { recursive: true });
const W = 900; // 每栏目标宽度（px）
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1200 } });
// 读 PNG IHDR 得到真实像素尺寸（避免把“短图下方留白”误读为渲染缺陷）
function probe(file) {
  const b = fs.readFileSync(file).subarray(0, 24);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}
const made = [];
for (const k of keys) {
  const dash = k.replace(/\//g, '-');
  const orig = path.resolve('corpus/' + k + '/full.png');
  const rend = path.resolve('m1/curated/renders/' + dash + '.png');
  if (!fs.existsSync(orig) || !fs.existsSync(rend)) { console.log('skip (missing pair):', k); continue; }
  const [ow, oh] = probe(orig);
  const [rw, rh] = probe(rend);
  const doc = `<!doctype html><meta charset=utf-8>
<style>
  body{margin:0;background:#eef1f5;font:13px/1.4 system-ui,sans-serif;color:#222}
  .row{display:flex;gap:12px;align-items:flex-start;padding:12px}
  .col{flex:0 0 auto;width:${W}px}
  .col h2{margin:0 0 6px;font-size:13px;font-weight:600;padding:4px 8px;border-radius:4px;background:#dde3ea}
  .orig h2{background:#f3dcdc;color:#7a2020}
  .rend h2{background:#d9e8f7;color:#12456e}
  .col img{display:block;width:${W}px;height:auto;background:#fff}
  .ratio{padding:2px 0 0;color:#555;font-size:12px}
</style>
<div class="row">
  <div class="col orig"><h2>原站 · ${k}</h2><img src="file://${orig}"><div class="ratio">原图 ${ow}×${oh} · 高/宽 ${(oh/ow).toFixed(2)}</div></div>
  <div class="col rend"><h2>渲染 · ${k}</h2><img src="file://${rend}"><div class="ratio">渲染 ${rw}×${rh} · 高/宽 ${(rh/rw).toFixed(2)} · 为原站 ${Math.round((rh/rw)/(oh/ow)*100)}%</div></div>
</div>`;
  const tmp = path.join(OUT, '.tmp-' + dash + '.html');
  fs.writeFileSync(tmp, doc);
  await page.goto('file://' + path.resolve(tmp));
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));
  const out = path.join(OUT, dash + '.png');
  await page.screenshot({ path: out, fullPage: true });
  fs.unlinkSync(tmp);
  made.push({ k, png: dash + '.png' });
  console.log('✓', k, '→', out);
}
await browser.close();
const cards = made.map((m) => `<figure><a href="${m.png}"><img src="${m.png}" loading="lazy"></a><figcaption>${m.k}</figcaption></figure>`).join('\n');
fs.writeFileSync(path.join(OUT, 'index.html'), `<!doctype html><meta charset=utf-8><title>AutoFE 原站 | 渲染 并排对照</title>
<style>body{margin:0;background:#111;color:#eee;font:14px system-ui}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:14px;padding:14px}
figure{margin:0}figure img{width:100%;background:#fff}figcaption{padding:4px 0;font-size:13px;color:#9fd0ff}</style>
<h1 style="padding:14px">原站 | 渲染 并排对照（${made.length} 页）</h1><div class="grid">${cards}</div>`);
console.log('并排对照:', made.length, '页 →', path.join(OUT, 'index.html'));
