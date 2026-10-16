// AutoFE · 交付前视觉自查（程序化）— 覆盖 .scratch/05-visual-defects 全部类别
// 用法: node m1/eval/audit-visual.mjs <render.html> [more.html...]  或  --all
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const PW = process.env.AUTOFE_PLAYWRIGHT_CORE || '/home/z/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core';
const { chromium } = require(PW);
const CHROME = process.env.AUTOFE_CHROME_PATH || (process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell');

let files = process.argv.slice(2);
if (!files.length || files[0] === '--all') {
  const dir = 'm1/curated/renders';
  files = fs.readdirSync(dir).filter((f) => f.endsWith('.html') && f !== 'index.html' && !f.startsWith('auto-')).map((f) => path.join(dir, f));
}
// capture oracle: a text repeated twice in the source capture is the site's own design
const finalRows = JSON.parse(fs.readFileSync('m1/eval/m3-final.json', 'utf8'));
const corpusOf = new Map(finalRows.map((r) => [r.k.replace(/\//g, '-') + '.html', 'corpus/' + r.k + '/nodes.json']));
const captureTexts = new Map();
function captureHay(file) {
  if (!captureTexts.has(file)) {
    let hay = '';
    try {
      const arr = JSON.parse(fs.readFileSync(file, 'utf8'));
      hay = arr.map((x) => (x.text || '') + ' ' + (x.name || '')).join('\u0000');
    } catch { hay = ''; }
    try { hay += '\u0000' + fs.readFileSync(file.replace(/nodes\.json$/, 'dom.html'), 'utf8'); } catch { /* optional */ }
    captureTexts.set(file, hay);
  }
  return captureTexts.get(file);
}
function countAll(hay, norm) {
  let n = 0, i = -1;
  while ((i = hay.indexOf(norm, i + 1)) >= 0) n++;
  return n;
}
function captureCount(file, needle) {
  const norm = needle.replace(/\s+/g, ' ').trim();
  if (!norm) return 0;
  const hay = captureHay(file);
  if (countAll(hay, norm) >= 2) return 2;
  // the DOM may split the sentence across elements: fall back to distinctive tokens
  const tokens = [...new Set((norm.match(/[A-Za-z$¥][\w$.%,]{3,}|[\u4e00-\u9fa5]{4,}/g) || []))].slice(0, 6);
  if (!tokens.length) return 0;
  return tokens.every((t) => countAll(hay, t) >= 2) ? 2 : 0;
}
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const rows = [];
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  await page.goto('file://' + path.resolve(f));
  const probe = await page.evaluate(() => {
    const T = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();
    const out = { fabricated: 0, emptyAnchors: 0, checkmarks: 0, emptyText: [], dups: [], durOptions: [], frag: [], imgVar: [], broken: [], unitStack: [], titleDup: [] };
    out.fabricated = document.querySelectorAll('button.action:not(.search-submit)').length;
    // T-101/T-104: controls the source never had
    out.emptyAnchors = [...document.querySelectorAll('a')].filter((a) => !T(a) && !a.querySelector('img')).length;
    out.checkmarks = (document.body.textContent.match(/✓/g) || []).length;
    // T-104 duplicate content across blocks
    const blocks = [];
    for (const el of document.querySelectorAll('h1,h2,h3,h4,h5,.deflabel,.chip-item,.choice,.fact .val,.qa-a,td,.promo,.prose p')) {
      const t = T(el); if (t.length < 12 || t.length > 200) continue;
      const sec = el.closest('section,article'); blocks.push([t, sec ? (sec.id || sec.className.split(' ')[0]) : '?']);
    }
    const seen = new Map();
    for (const [t, sec] of blocks) { if (!seen.has(t)) seen.set(t, new Set()); seen.get(t).add(sec); }
    for (const [t, secs] of seen) if (secs.size > 1) out.dups.push(t.slice(0, 60) + ' ⟨' + [...secs].join('|') + '⟩');
    // T-103 same labels as choice and as list
    const opts = new Set([...document.querySelectorAll('.choice')].map(T).filter(Boolean));
    for (const l of [...document.querySelectorAll('.chips .chip-item,.deflist .deflabel')].map(T)) if (opts.has(l)) out.durOptions.push(l);
    // T-103 form fragmentation: sibling blocks rendered at different widths
    for (const g of document.querySelectorAll('.run,.cards,.deflist')) {
      if (g.parentElement?.closest('.run,.cards,.compare,.deflist')) continue;  // nested lists may be narrow
      const kids = [...g.children].filter((k) => T(k));
      if (kids.length < 5) continue;
      const tops = kids.map((k) => Math.round(k.getBoundingClientRect().top));
      const counts = [...new Set(tops)].map((y) => tops.filter((v) => v === y).length);
      const body = counts.slice(0, -1);           // a short last row is normal
      if (body.length > 1 && new Set(body).size > 1 && Math.min(...body) === 1) out.frag.push(g.className + ' rows=' + counts.join(','));
    }
    // T-105 image size variance inside one grid
    for (const g of document.querySelectorAll('.cards,.run')) {
      const hs = [...g.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth).map((i) => Math.round(i.getBoundingClientRect().height * 10) / 10);
      if (hs.length < 3) continue;
      const mn = Math.min(...hs), mx = Math.max(...hs);
      if (mx > 0 && mn / mx < 0.7) out.imgVar.push('h=' + [...new Set(hs)].slice(0, 5).join('/'));
    }
    for (const img of document.querySelectorAll('img')) if (!img.complete || !img.naturalWidth) out.broken.push((img.getAttribute('src') || '').slice(-40));
    for (const el of document.querySelectorAll('.chip-item,.choice,.defrow,.item,li,a,button,.promo,.prose p')) {
      const t = T(el);
      if (!t && !el.querySelector('img,svg,input,button,a')) out.emptyText.push(el.tagName + '.' + (el.className || '').split(' ')[0]);
    }
    // F-037 unit stacking: a number followed by TWO adjacent unit tokens (never legitimate).
    const UNIT = '(?:条评价|人好评|万人好评|条|次|项|个|件|分|元|星|人|万|张|间|位|年|月|日|天|公里|千米|米|厘米|小时|分钟|秒|%)';
    const stackRe = new RegExp('\\d[\\d.,]*\\s+' + UNIT + '\\s+' + UNIT);
    for (const el of document.querySelectorAll('.val,.meta,.defval,.chip-item,td,.fact,.promo,.prose p')) {
      const t = T(el);
      if (t && t.length < 80 && stackRe.test(t)) out.unitStack.push(t.slice(0, 60));
    }
    // F-038 same-page duplicate heading (one title text should appear once per page)
    const titles = [...document.querySelectorAll('h1,h2,h3,h4,h5')].map(T).filter((t) => t.length >= 6);
    out.titleDup = [...new Set(titles.filter((t) => titles.filter((x) => x === t).length > 1))].slice(0, 3);
    out.emptyText = [...new Set(out.emptyText)].slice(0, 4);
    out.dups = [...new Set(out.dups)].slice(0, 3);
    out.broken = [...new Set(out.broken)].slice(0, 2);
    return out;
  });
  const cssFlag = /column-width/.test(html) ? ['css-columns'] : [];
  // classify duplicates: source-true (>=2 in the capture) vs renderer-introduced
  const cap = corpusOf.get(path.basename(f));
  const sourceTrue = [], introduced = [];
  for (const d of probe.dups) {
    const t = d.split(' ⟨')[0];
    (cap && captureCount(cap, t) >= 2 ? sourceTrue : introduced).push(d);
  }
  const optionsIntroduced = probe.durOptions.filter((t) => !(cap && captureCount(cap, t) >= 2));
  // declared-inherent flags (m1/eval/audit-visual-allow.json): page+flag with a written reason;
  // a declared flag is downgraded to (info) — visible in the board, never silently waived.
  const allowDoc = fs.existsSync('m1/eval/audit-visual-allow.json') ? JSON.parse(fs.readFileSync('m1/eval/audit-visual-allow.json','utf8')) : { entries: [] };
  const pageSlug = path.basename(f, '.html');
  const allowed = (flag) => allowDoc.entries.some((e) => e.page === pageSlug && flag.startsWith(e.flag) && e.reason?.trim());
  const optionsSourceTrue = probe.durOptions.filter((t) => cap && captureCount(cap, t) >= 2);
  const titleIntroduced = probe.titleDup.filter((t) => !(cap && captureCount(cap, t) >= 2));
  const titleSourceTrue = probe.titleDup.filter((t) => cap && captureCount(cap, t) >= 2);
  probe.unitStack = [...new Set(probe.unitStack)].slice(0, 3);
  probe.sourceTrue = sourceTrue; probe.introduced = introduced;
  const flags = [
    ...cssFlag,
    probe.fabricated && 'fabricated-buttons:' + probe.fabricated,
    probe.emptyAnchors && 'empty-anchors:' + probe.emptyAnchors,
    probe.checkmarks && 'checkmarks:' + probe.checkmarks,
    probe.emptyText.length && 'empty-text:' + probe.emptyText.join(','),
    probe.unitStack.length && 'unit-stack:' + probe.unitStack.length,
    titleIntroduced.length && 'dup-title:' + titleIntroduced.length,
    titleSourceTrue.length && 'dup-title-source-true(info):' + titleSourceTrue.length,
    probe.introduced.length && 'dup-content:' + probe.introduced.length,
    probe.sourceTrue.length && 'dup-source-true(info):' + probe.sourceTrue.length,
    optionsIntroduced.length && 'dup-options:' + optionsIntroduced.length,
    optionsSourceTrue.length && 'dup-options-source-true(info):' + optionsSourceTrue.length,
    probe.frag.length && (allowed('form-fragmentation') ? 'form-fragmentation(info):' : 'form-fragmentation:') + probe.frag.length,
    probe.imgVar.length && (allowed('img-variance') ? 'img-variance(info):' : 'img-variance:') + probe.imgVar.join(','),
    probe.broken.length && 'broken-img:' + probe.broken.length,
  ].filter(Boolean);
  rows.push({ page: path.basename(f), flags, detail: probe });
}
await browser.close();
let bad = 0;
for (const r of rows) {
  const hard = r.flags.filter((x) => !x.includes('info'));
  if (hard.length) bad++;
  if (r.flags.length) {
    console.log((hard.length ? '⚠ ' : '· ') + r.page.padEnd(46) + r.flags.join(' '));
    if (r.detail.introduced.length) console.log('    renderer-dup: ' + r.detail.introduced.join('\n                  '));
    if (r.detail.unitStack?.length) console.log('    unit-stack: ' + r.detail.unitStack.join(' | '));
    if (r.detail.titleDup?.length) console.log(`    ${r.page} dup-title (${r.flags.some((f) => f.startsWith('dup-title:')) ? 'hard' : 'info/source-true'}): ` + r.detail.titleDup.join(' | '));
  }
}
console.log('\n视觉自查: ' + (rows.length - bad) + '/' + rows.length + ' 干净' + (bad ? ' | 待修 ' + bad : ''));
