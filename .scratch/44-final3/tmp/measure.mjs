// read-only geometry probe: load rendered HTML, report img boxes + suspicious gaps
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const PW = process.env.HOME + '/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core';
const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';
const { chromium } = require(PW);

const keys = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
for (const k of keys) {
  const f = path.resolve(`m1/curated/renders/${k}.html`);
  if (!fs.existsSync(f)) { console.log(k, 'MISSING'); continue; }
  await page.goto('file://' + f, { waitUntil: 'load' });
  const info = await page.evaluate(() => {
    const imgs = [...document.images].map((im) => {
      const r = im.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y + scrollY), sw: im.naturalWidth, sh: im.naturalHeight, alt: (im.alt || '').slice(0, 28) };
    });
    const broken = imgs.filter((i) => i.sw === 0).length;
    const big = imgs.filter((i) => i.h > 520).map((i) => `${i.w}x${i.h}@y${i.y} "${i.alt}"`);
    const maxH = Math.max(0, ...imgs.map((i) => i.h));
    const docH = document.documentElement.scrollHeight;
    // find full-white horizontal bands >=60px by sampling element stack is hard; use text baseline scan
    const texts = [...document.querySelectorAll('h1,h2,h3,.hero .val,.meta')].slice(0, 6).map((e) => {
      const r = e.getBoundingClientRect();
      return `${e.tagName}${e.className ? '.' + String(e.className).split(' ')[0] : ''} y${Math.round(r.y + scrollY)} h${Math.round(r.height)} sz${Math.round(parseFloat(getComputedStyle(e).fontSize))} "${(e.textContent || '').trim().slice(0, 22)}"`;
    });
    return { n: imgs.length, broken, big, maxH, docH, texts };
  });
  console.log(`\n== ${k} ==  imgs=${info.n} broken=${info.broken} maxImgH=${info.maxH} docH=${info.docH}`);
  if (info.big.length) console.log('   BIG(>520px):', info.big.join(' | '));
  info.texts.forEach((t) => console.log('   T', t));
}
await browser.close();
