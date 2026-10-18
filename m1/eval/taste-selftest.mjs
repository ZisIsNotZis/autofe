// S6 页面级品味先验自测（docs/m1/composition.md §3/§6）：页框是一条中央内容带；页级孤立控件不贴左；
// 页脚的链接组在带内分布。
// 为什么必须有这道门禁：S5a 让「内容列居中」，但页级单行元素仍可贴在最左、右侧留半页空白 ——
// 36kr 搜索页的根级 SPAN.action-plain 在 x=24、右侧 1117px 空着，页脚 6 个链接挤在 x=24..520。
// 判据是几何的（宽度、空余比例），CSS 文本断言抓不到：必须在真浏览器里量 40 页。
// 可证伪（docs/proof 的 gate_probe）：一条合成负样本页（贴左的孤立按钮 + 贴左的页脚）在同一个
// 判据函数下必须被抓到；判据家族若一条也没量到（选择器坏了），断言同样失败而不是静默通过。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { render } from '../render.mjs';

let checks = 0;
const check = (label, condition) => { assert.ok(condition, label); checks++; };

const scale = JSON.parse(fs.readFileSync(new URL('./m3-scale.json', import.meta.url), 'utf8')).filter((x) => x.tier === 'exemplar');
const modelOf = (k) => JSON.parse(fs.readFileSync(new URL(`../curated/${k}.json`, import.meta.url), 'utf8'));

// One geometry probe, evaluated inside the page. It returns
//   frame       – main's content box (the page's content band)
//   rows        – every page-level (root child / depth-1 child) lone-action / control-bar row, with
//                 its INK box (a control bar's ink is its items' union, not its full-width box)
//   offenders   – rows whose ink starts at the band's left edge while >40% of the band is empty to
//                 their right: the owner's "drags attention to the very left" geometry
//   footer      – the footer band's link ink measured against the root's content box
const PROBE = () => {
  const main = document.querySelector('main');
  const root = main.querySelector(':scope>.node');
  const mb = main.getBoundingClientRect();
  const mcs = getComputedStyle(main);
  const frame = { left: mb.left + parseFloat(mcs.paddingLeft), right: mb.right - parseFloat(mcs.paddingRight) };
  const width = frame.right - frame.left;
  const ink = (el) => {
    const kids = [...el.children].map((c) => c.getBoundingClientRect()).filter((b) => b.width > 0);
    if (!kids.length) { const b = el.getBoundingClientRect(); return [b.left, b.right]; }
    return [Math.min(...kids.map((b) => b.left)), Math.max(...kids.map((b) => b.right))];
  };
  const rows = [];
  for (const node of document.querySelectorAll('main .node.depth-0, main .node.depth-1')) {
    for (const k of node.children) {
      const kind = k.matches('.action,.action-plain') ? 'action' : k.matches('.controls') ? 'controls' : null;
      if (!kind) continue;
      const [l, r] = ink(k);
      if (!(r - l > 0)) continue;
      rows.push({ kind, left: Math.round(l - frame.left), width: Math.round(r - l),
        rightGap: Math.round(width - (r - frame.left)), text: (k.textContent || '').trim().slice(0, 24) });
    }
  }
  const rb = root.getBoundingClientRect();
  const footerBand = document.querySelector('.g-footer');
  const footerLinks = footerBand
    ? [...footerBand.querySelectorAll('.ctl,.linklist a,.chip-item,.seq li')].map((e) => e.getBoundingClientRect()).filter((b) => b.width > 0)
    : [];
  const footer = footerLinks.length
    ? { links: footerLinks.length, start: Math.round(Math.min(...footerLinks.map((b) => b.left)) - rb.left),
        endGap: Math.round(rb.right - Math.max(...footerLinks.map((b) => b.right))) }
    : null;
  const identity = document.querySelector('main>.node>.title.site-identity');
  return {
    frame: { left: Math.round(frame.left), width: Math.round(width) },
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    rows, offenders: rows.filter((r) => r.left <= 2 && r.rightGap > width * 0.4), footer,
    identityLeft: identity ? Math.round(identity.getBoundingClientRect().left - frame.left) : null,
  };
};

const pw = process.env.AUTOFE_PLAYWRIGHT_CORE || (process.env.HOME + '/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core');
const chrome = process.env.AUTOFE_CHROME_PATH || (process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell');
assert.ok(fs.existsSync(pw) && fs.existsSync(chrome), 'Chromium required; a CSS-only reading cannot measure the band or the empty-right fraction');
const { chromium } = createRequire(import.meta.url)(pw);
const browser = await chromium.launch({ executablePath: chrome, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  let measuredRows = 0, footerPages = 0, identityPages = 0;

  // ---- 1. all 40 pages: central band, no lone left anchor, footer distributed ---------------
  for (const r of scale) {
    await page.setContent(render(modelOf(r.k), { site: r.k.split('/')[0] }), { waitUntil: 'domcontentloaded' });
    const g = await page.evaluate(PROBE);
    measuredRows += g.rows.length;
    // the content band never touches the edges, and never grows past a comfortable measure
    check(`${r.k}: content sits in a central band (left ${g.frame.left}, width ${g.frame.width})`,
      g.frame.left >= 40 && g.frame.width <= 1180);
    check(`${r.k}: no horizontal overflow`, g.overflow <= 1);
    // the owner's rule: a page-level lone action / control bar never sits at the band's left edge
    // with most of the band empty to its right.
    check(`${r.k}: no page-level lone anchor (${JSON.stringify(g.offenders)})`, g.offenders.length === 0);
    if (g.footer) {
      footerPages++;
      check(`${r.k}: footer link groups distribute across the band (${JSON.stringify(g.footer)})`,
        g.footer.start <= 24 && g.footer.endGap <= 24);
    }
    if (g.identityLeft !== null) { identityPages++; check(`${r.k}: the site identity keeps the band's left edge (typesetting baseline)`, g.identityLeft === 0); }
  }
  // a family that never matches would make every "no offender" above vacuous (gate_probe)
  check(`the lone-anchor family really measured page-level rows across 40 pages (${measuredRows})`, measuredRows >= 20);
  check(`the footer rule really measured footer pages (${footerPages})`, footerPages >= 10);
  check(`the identity exemption is exercised, not dead (${identityPages} pages)`, identityPages >= 1);

  // ---- 2. the wide viewport keeps the same band instead of stretching -------------------------
  await page.setViewportSize({ width: 1920, height: 900 });
  for (const k of ['36kr-com/search-ai', 'sspai-com/matrix', 'aws-amazon/ec2-on-demand', 'mi-com/home']) {
    await page.setContent(render(modelOf(k), { site: k.split('/')[0] }), { waitUntil: 'domcontentloaded' });
    const g = await page.evaluate(PROBE);
    check(`${k} @1920: the band does not stretch to the edges (left ${g.frame.left}, width ${g.frame.width})`,
      g.frame.left >= 150 && g.frame.width <= 1600 && g.offenders.length === 0);
  }
  await page.setViewportSize({ width: 1280, height: 900 });

  // ---- 3. the four pages the owner named, pinned as regression facts --------------------------
  const four = async (k) => { await page.setContent(render(modelOf(k), { site: k.split('/')[0] }), { waitUntil: 'domcontentloaded' }); return page.evaluate(PROBE); };
  // 36kr 搜索页：根级「查看更多」现在是居中的一行，页脚 11 个链接铺满带。
  const kr = await four('36kr-com/search-ai');
  check('36kr search: the root action is centred in the band (523px on both sides)',
    kr.rows.some((x) => x.kind === 'action' && x.text === '查看更多' && Math.abs(x.left - x.rightGap) <= 2));
  check('36kr search: the footer band starts and ends on the band edges', kr.footer.start === 0 && kr.footer.endGap === 0);
  // aws 表页：612px 引言居中的同时，页框不再贴边（旧：内容 1232、左边距 24）。
  await page.setContent(render(modelOf('aws-amazon/ec2-on-demand'), { site: 'aws-amazon' }), { waitUntil: 'domcontentloaded' });
  const aws = await page.evaluate(() => {
    const intro = document.querySelector('.table-page .fact').getBoundingClientRect();
    const main = document.querySelector('main'), mb = main.getBoundingClientRect(), cs = getComputedStyle(main);
    const left = mb.left + parseFloat(cs.paddingLeft), right = mb.right - parseFloat(cs.paddingRight);
    return { introLeft: Math.round(intro.left - left), introRight: Math.round(right - intro.right), introWidth: Math.round(intro.width), left: Math.round(left) };
  });
  check('aws table page: the intro stays centred under its table inside the wider band',
    Math.abs(aws.introLeft - aws.introRight) <= 2 && aws.introWidth < 700 && aws.left >= 40);
  // sspai matrix：两区帧（feed + 380px 侧栏）整体落在带内，两侧留出对称的页边。
  await page.setContent(render(modelOf('sspai-com/matrix'), { site: 'sspai-com' }), { waitUntil: 'domcontentloaded' });
  const mx = await page.evaluate(() => {
    const rail = document.querySelector('.feed-rail').getBoundingClientRect();
    const main = document.querySelector('main'), mb = main.getBoundingClientRect(), cs = getComputedStyle(main);
    return { left: Math.round(rail.left - (mb.left + parseFloat(cs.paddingLeft))), width: Math.round(rail.width), feed: Math.round(document.querySelector('.feed-main').getBoundingClientRect().width) };
  });
  check('sspai matrix: the two-region frame fills the band exactly (feed + rail, no outer overflow)',
    mx.left === 0 && mx.width <= 1180 && mx.feed > 600 && mx.feed < mx.width);
  // sspai u-jtc092al：身份卡/成就格/动态流都收在同一段 1160px 带内。
  const u = await four('sspai-com/u-jtc092al');
  check('sspai profile: the page band carries the identity, achievements and feed (no edge-to-edge rows)',
    u.frame.left >= 40 && u.frame.width <= 1180 && u.offenders.length === 0);

  // ---- 4. NEGATIVE CONTROL: a synthetic left-flushed lone button must be detected -------------
  // Same predicate, same rendered page; only the taste rules are reverted. If this passes with 0
  // offenders, the gate above is measuring nothing.
  const synthetic = { _title: { text: 'Lone control fixture' }, _text: { text: 'A synthetic page carrying one page-level action and one control bar.' },
    _action: { verb: 'open', to: 'https://example.test/go', label: 'Go' },
    browse: { _title: { text: 'Browse' }, _action: { verb: 'navigate', to: 'https://example.test/browse' } },
    footer: { _title: { text: 'Footer' }, _items: ['One', 'Two', 'Three'].map((n) => ({ _name: { text: n }, _action: { verb: 'navigate', to: `https://example.test/${n}` } })) } };
  await page.setContent(render(synthetic), { waitUntil: 'domcontentloaded' });
  const good = await page.evaluate(PROBE);
  check('synthetic fixture: the lone action and the control bar are both centred',
    good.rows.length >= 2 && good.offenders.length === 0);
  check('synthetic fixture: its three footer links distribute across the band',
    good.footer && good.footer.links === 3 && good.footer.endGap <= 24);
  await page.addStyleTag({ content: '.depth-0>.action,.depth-1>.action{display:inline-block!important;width:auto!important;margin-inline:0!important}'
    + '.depth-0>.controls,.depth-1>.controls{justify-content:flex-start!important}'
    + '.group.g-footer .controls{display:flex!important}' });
  const bad = await page.evaluate(PROBE);
  check('negative control: a left-flushed lone button is detected', bad.offenders.some((x) => x.kind === 'action' && x.left <= 2));
  check('negative control: a left-flushed control bar is detected', bad.offenders.some((x) => x.kind === 'controls' && x.left <= 2));
  check('negative control: a left-hugging footer is detected', bad.footer !== null && bad.footer.endGap > 24);
} finally { await browser.close(); }
console.log(`PASS page-level taste regressions: ${checks} assertions; 40 exemplar pages + 4 owner pages pinned + synthetic negative control; no experience verdict.`);
