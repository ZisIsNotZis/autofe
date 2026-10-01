// No-upscale self-test (round 45, F-082). The renderer must never display an image larger
// than its natural pixel size: a 234x176 source thumbnail must render at <=234px, not be
// stretched to the container width (that was the round-44 bilibili finding: covers blown up
// 2-3x AND the page pushed to 14394px).
//
// The claim is tested by CONSTRUCTION, not by reading the stylesheet and hoping:
//   a 200px-wide image placed in a 1000px-wide container must display at <=200px.
// Chromium measures the real box (displayed <= natural). If Chromium is unavailable the
// test falls back to the deterministic cascade check (the winning `width` for an <img> must
// be `auto`, i.e. never a percentage/fixed value that could exceed the natural width), which
// still fails the moment someone reintroduces `img{width:100%}`.
// Run: node m1/eval/no-upscale-selftest.mjs   (exit 0 = all assertions pass)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { render } from '../render.mjs';

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log('  ok  ', msg); }
  else { failed++; console.log('  FAIL', msg); }
}

// A solid-colour PNG of exactly WxH, so the natural size is known by construction.
function pngDataURI(w, h) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  const row = Buffer.alloc(1 + w * 3); // filter byte 0 + black pixels
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  return 'data:image/png;base64,' + png.toString('base64');
}

// ---- A. the rendered stylesheet must not force a container width on images ----------
const HTML = render({ _intent: 'x', _title: { text: 'No Upscale' }, gallery: { _intent: 'images', _items: [{ _name: { text: 'shot' }, _image: { image: pngDataURI(200, 100), alt: 'shot' } }] } });
const style = (HTML.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1];
{
  // Every declaration that sets `width` on a selector list naming `img` must be `auto`.
  const offenders = [];
  for (const rule of style.split('}')) {
    const [sel, decl] = rule.split('{');
    if (!sel || !decl) continue;
    if (!/(^|[\s,>])img\b/.test(sel)) continue;
    const m = /(^|;)\s*width\s*:\s*([^;]+)/.exec(decl);
    if (m && !/^\s*auto\s*$/.test(m[2])) offenders.push(`${sel.trim()} { width:${m[2].trim()} }`);
  }
  assert(offenders.length === 0, `no image rule forces a width (found ${offenders.length})${offenders.length ? ': ' + offenders.join(' | ') : ''}`);
  assert(/(^|[\s,>])img\b[^{]*\{[^}]*max-width\s*:\s*100%/.test(style) || /img\{[^}]*max-width:100%/.test(style), 'images carry max-width:100% (they shrink for narrow containers)');
  assert(/<img src="data:image\/png;base64,/.test(HTML), 'the constructed 200px image is rendered as <img>');
}

// ---- B. CONSTRUCTION: 200px image in a 1000px container displays at <=200px ----------
const PW = process.env.HOME + '/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core';
const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';
let browserMeasured = false;
if (fs.existsSync(PW) && fs.existsSync(CHROME)) {
  const { chromium } = createRequire(import.meta.url)(PW);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'autofe-upscale-'));
  // container is forced to 1000px so the old `width:100%` rule would have produced 1000px.
  const page = '<!doctype html><html><head><meta charset=utf-8><style>' + style + 'main{max-width:none}#c{width:1000px}</style></head><body><main><div id="c"><div class="fact"><span class="val">' + HTML.match(/<img[^>]*>/)[0] + '</span></div></div></main></body></html>';
  const f = path.join(dir, 'page.html'); fs.writeFileSync(f, page);
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1200, height: 400 } });
  await p.goto('file://' + f);
  const r = await p.evaluate(() => { const im = document.images[0]; const bb = im.getBoundingClientRect(); return { nw: im.naturalWidth, dw: Math.round(bb.width), cw: document.getElementById('c').getBoundingClientRect().width }; });
  await b.close();
  browserMeasured = true;
  assert(r.cw === 1000, `container is 1000px wide by construction (got ${r.cw})`);
  assert(r.nw === 200, `image natural width is 200px (got ${r.nw})`);
  assert(r.dw <= 200, `200px image in a 1000px container displays at <=200px (got ${r.dw})`);
  fs.rmSync(dir, { recursive: true, force: true });
} else {
  console.log('  skip Chromium measurement (playwright/chrome not found) — cascade check above still enforced');
}

console.log(`\n${failed ? 'FAIL' : 'PASS'} no-upscale: ${passed} passed, ${failed} failed${browserMeasured ? ' (measured in Chromium)' : ' (cascade-only)'}`);
process.exit(failed ? 1 : 0);
