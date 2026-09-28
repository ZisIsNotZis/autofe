// M3 curation pilot: screenshot curated renders with the on-disk headless shell.
// Usage: node m1/curated/renders/shoot.mjs <render.html> <out.png>
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/home/z/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core/package.json');
const { chromium } = require('playwright-core');

const [htmlPath, outPath] = process.argv.slice(2);
const binary = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';

const browser = await chromium.launch({ executablePath: binary, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const url = 'file://' + fs.realpathSync(htmlPath);
await page.goto(url, { waitUntil: 'load', timeout: 20000 });
await page.waitForTimeout(300);
await page.screenshot({ path: outPath, fullPage: true });
await browser.close();
console.log('shot', outPath);
