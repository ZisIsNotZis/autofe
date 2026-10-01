// Round-35 probe: bounding box of a selector in a render, plus font sizes of card facts.
// Usage: node .scratch/35-typography/box.mjs <render.html> "<css selector>" [vw] [vh]
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const PW = '/home/z/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core';
const { chromium } = require(PW);
const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';
const file = process.argv[2];
const sel = process.argv[3];
const vw = Number(process.argv[4] || 1280), vh = Number(process.argv[5] || 900);
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: vw, height: vh } });
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(150);
const r = await page.evaluate((sel) => {
  const els = [...document.querySelectorAll(sel)];
  const box = (el) => { const b = el.getBoundingClientRect(); return { l: Math.round(b.left), t: Math.round(b.top + window.scrollY), w: Math.round(b.width), h: Math.round(b.height) }; };
  return els.map((el) => ({ cls: el.className, box: box(el), fs: getComputedStyle(el).fontSize, fw: getComputedStyle(el).fontWeight, txt: (el.textContent || '').trim().slice(0, 40) }));
}, sel);
console.log(JSON.stringify(r, null, 1));
await browser.close();
