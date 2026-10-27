// M3 curation pilot: screenshot curated renders with the on-disk headless shell.
// Usage: node m1/curated/renders/shoot.mjs <render.html> <out.png>
import fs from 'node:fs';

import { launchBrowser } from '../m1/eval/browser.mjs';

const [htmlPath, outPath] = process.argv.slice(2);

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const url = 'file://' + fs.realpathSync(htmlPath);
await page.goto(url, { waitUntil: 'load', timeout: 20000 });
await page.waitForTimeout(300);
await page.screenshot({ path: outPath, fullPage: true });
await browser.close();
console.log('shot', outPath);
