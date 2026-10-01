// Round-34 measurement probe: image band full-bleed + trailing-dead-space audit.
// Usage: node .scratch/34-layout/measure.mjs <render.html> [vw] [vh]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const PW = '/home/z/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core';
const { chromium } = require(PW);
const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';
const file = process.argv[2];
const vw = Number(process.argv[3] || 1440), vh = Number(process.argv[4] || 900);
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: vw, height: vh } });
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(200);
const r = await page.evaluate(() => {
  const de = document.documentElement;
  const out = { vw: null, swimgs: [], lastContentBottom: 0, scrollH: de.scrollHeight, clientW: de.clientWidth, docW: de.scrollWidth };
  out.vw = window.innerWidth;
  const R = (el) => { const b = el.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width), h: Math.round(b.height) }; };
  out.swimgs = [...document.querySelectorAll('img')].map((im) => ({ src: im.getAttribute('src'), ...R(im), nat: im.naturalWidth + 'x' + im.naturalHeight }));
  // trailing dead space: bottom of the lowest painted element that carries content
  const sel = 'img,h1,h2,h3,h4,p,li,td,th,figcaption,input,textarea,a,span.val,.val,.chip-item,.manifest-item,.defval,.deflabel,.promo,.ctl,.action';
  let bottom = 0, who = '';
  for (const el of document.querySelectorAll(sel)) {
    if (el.closest('header.site')) continue;
    const txt = (el.textContent || '').trim();
    if (!txt && !(el.tagName === 'IMG') && !(el.tagName === 'INPUT')) continue;
    const b = el.getBoundingClientRect();
    if (b.height === 0) continue;
    if (b.bottom > bottom) { bottom = b.bottom; who = el.tagName + '.' + (el.className || ''); }
  }
  out.lastContentBottom = Math.round(bottom);
  out.lastWho = who;
  out.tailDead = Math.round(de.scrollHeight - bottom);
  return out;
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
