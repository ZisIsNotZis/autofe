// Round-32 evidence shots (≤6, read-only): the three fixed surfaces, current HTML/CSS.
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const PW = process.env.HOME + '/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core';
const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';
const { chromium } = require(PW);
const out = '.scratch/32-fix';
const shots = [
  ['airbnb-com-room-28871.html', '2a-airbnb-controls.png', 'div.controls'],
  ['bilibili-com-home.html', '2b-bilibili-card.png', '.cards .item'],
  ['huawei-cn-home.html', '2c-huawei-featured.png', 'section.g-featured'],
];
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
for (const [file, name, sel] of shots) {
  await p.goto('file://' + path.resolve('m1/curated/renders/' + file));
  const el = await p.$(sel);
  if (!el) { console.log('MISS', name, sel); continue; }
  await el.screenshot({ path: out + '/' + name });
  console.log('shot', name);
}
await b.close();
