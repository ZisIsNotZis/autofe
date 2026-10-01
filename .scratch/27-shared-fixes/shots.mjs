import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const PW = process.env.HOME + '/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core';
const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';
const { chromium } = require(PW);
const jobs = [
  ['stripe-com-pricing', '.chips', 'shot-chip-stripe.png'],
  ['aliyun-com-home', '.chips', 'shot-chip-aliyun.png'],
  ['apple-com-ipad-air', 'fieldset.chipbar', 'shot-container-apple.png'],
  ['36kr-com-search-ai', 'article.node', 'shot-search-36kr.png'],
  ['36kr-com-search-ai', 'fieldset.chipbar', 'shot-container-36kr.png'],
  ['huawei-cn-search-laptop', 'fieldset.chipbar', 'shot-container-huawei.png'],
  ['linear-app-home', 'main > article', 'shot-heading-linear.png'],
];
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
for (const [page, sel, out] of jobs) {
  const html = 'm1/curated/renders/' + page + '.html';
  await p.goto('file://' + path.resolve(html));
  const el = p.locator(sel).first();
  await el.screenshot({ path: '.scratch/27-shared-fixes/' + out });
  console.log('shot', out, await el.boundingBox());
}
await b.close();
