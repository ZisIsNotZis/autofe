// worker-63 probe: list ALL failing imgs per render (audit-visual caps at 2)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const PW = process.env.AUTOFE_PLAYWRIGHT_CORE;
const { chromium } = require(PW);
const CHROME = process.env.AUTOFE_CHROME_PATH;

const files = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await ctx.newPage();
for (const f of files) {
  const url = 'file://' + path.resolve(f);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch((e) => console.log(f, 'goto:', e.message));
  await page.waitForTimeout(2500);
  const broken = await page.evaluate(() => {
    return [...document.querySelectorAll('img')]
      .filter((i) => !i.complete || !i.naturalWidth)
      .map((i) => i.getAttribute('src'));
  });
  console.log('==', path.basename(f), 'broken:', broken.length);
  for (const b of broken) console.log('   ', b);
}
await browser.close();
