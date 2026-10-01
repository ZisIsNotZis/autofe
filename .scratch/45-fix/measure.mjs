// Round 45 measurement: for each page, report every rendered <img>'s natural vs displayed
// width, any that exceed natural (upscale), and the page height. Read-only, no writes.
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const PW = process.env.HOME + '/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core';
const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';
const { chromium } = require(PW);
const pages = process.argv.slice(2);
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
for (const dash of pages) {
  const f = 'm1/curated/renders/' + dash + '.html';
  await p.goto('file://' + path.resolve(f));
  await p.waitForTimeout(300);
  const r = await p.evaluate(() => {
    const imgs = [...document.images];
    const rows = imgs.map((im) => {
      const b = im.getBoundingClientRect();
      return { src: im.currentSrc || im.src, nw: im.naturalWidth, nh: im.naturalHeight, dw: Math.round(b.width), dh: Math.round(b.height) };
    });
    const up = rows.filter((x) => x.dw > x.nw + 1);
    return { height: Math.round(document.documentElement.scrollHeight), n: imgs.length, up, rows };
  });
  console.log(`### ${dash}  height=${r.height}px imgs=${r.n}`);
  console.log(`  upscaled (displayed>natural): ${r.up.length}`);
  for (const u of r.up.slice(0, 30)) console.log(`    ${u.nw}x${u.nh} -> ${u.dw}x${u.dh}  ${u.src.slice(-70)}`);
}
await b.close();
