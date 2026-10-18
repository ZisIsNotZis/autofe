// S7 页面级品味先验自测（docs/m1/composition.md §3/§6）：页框是一条中央内容带；页级动作行对齐**内容列左边缘**；
// 瀑布流列数不产生孤列；长表有斑马纹、舒展留白与停靠的键列。
// 为什么必须有这道门禁：S6 把「页级孤立控件贴最左」改成「居中」，owner 在 S6 复看时否掉了它——
// 36kr search-ai 的底部按钮现在居中（源站那里是在内容列左边缘），search-viz / huawei home 的按钮
// 仍贴左（居中规则没到它们，修得不系统）。所以判据不是「居中或贴边」，而是「对齐内容列左边缘」。
// 判据是几何的（相对内容列的偏差、列数与每列成员数、行底色），CSS 文本断言抓不到：必须在真浏览器里量 40 页。
// 可证伪（docs/proof 的 gate_probe）：四条有界负样本在同一个判据函数下必须被抓到——把动作行重新居中、
// 把动作行贴回页框左边缘、给 5 张卡的瀑布流声明 4 列、去掉表的斑马纹；判据家族若一条也没量到
// （选择器坏了），断言同样失败而不是静默通过。
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
//   rows        – every page-level (depth-0 / depth-1 node child) lone-action / control-bar row that is
//                 NOT a declared exemption, with its INK box (a control bar's ink is its items' union, not
//                 its full-width box) and the content-box left of the node that owns it
//   searchCol   – on a search page whose results are a narrower centred sub-column: that column's left edge
//   masonry     – every waterfall container: member count, realised column count, cards per column
//   tables      – every `.data` table: striped row backgrounds, cell padding, key-column share, tabular nums
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
  // The page's content column. Only a search page has one that differs from the row's own containing
  // block: its result rows are a narrower column centred on the frame (886px with media, 646px without).
  const hits = [...document.querySelectorAll('main .record-member')].map((e) => e.getBoundingClientRect()).filter((b) => b.width > 0);
  const searchCol = root.classList.contains('search-page') && hits.length ? Math.min(...hits.map((b) => b.left)) : null;
  const rows = [];
  for (const node of document.querySelectorAll('main .node.depth-0, main .node.depth-1')) {
    for (const k of node.children) {
      const kind = k.matches('.action,.action-plain') ? 'action' : k.matches('.controls') ? 'controls' : null;
      if (!kind) continue;
      // Declared exemptions, not style choices: the footer band distributes its links; a declared
      // hero/banner centres its content; a card owns its own interior; the identity card is centred;
      // a node that owns a one-line field keeps its submit on the field's row.
      if (k.closest('.g-footer,.banner,.banner-integrated,.item,.identity-frame')) continue;
      if (node.matches(':has(>.fieldbar,>.expose-input,>.expose-select)')) continue;
      const [l, r] = ink(k);
      if (!(r - l > 0)) continue;
      const ncs = getComputedStyle(node);
      rows.push({ kind, left: Math.round(l - frame.left), width: Math.round(r - l),
        parentLeft: Math.round(node.getBoundingClientRect().left + parseFloat(ncs.paddingLeft) - frame.left),
        inRail: Boolean(k.closest('.feed-rail-side')),
        text: (k.textContent || '').trim().slice(0, 24) });
    }
  }
  const masonry = [...document.querySelectorAll('.masonry')].map((el) => {
    const items = [...el.children].filter((c) => c.getBoundingClientRect().width > 0);
    const xs = [...new Set(items.map((c) => Math.round(c.getBoundingClientRect().left)))].sort((a, b) => a - b);
    return { cls: el.className, n: items.length, cols: xs.length,
      per: xs.map((x) => items.filter((c) => Math.round(c.getBoundingClientRect().left) === x).length),
      declared: getComputedStyle(el).getPropertyValue('--masonry-cols').trim() };
  });
  const tables = [...document.querySelectorAll('table.data')].map((t) => {
    const trs = t.querySelectorAll('tbody tr');
    const data = [...trs].find((r) => !r.classList.contains('row-group') && r.children.length);
    const cell = data?.querySelector('td,th');
    const bg = (sel) => { const r = t.querySelector(`tbody tr:nth-child(${sel})`); return r ? getComputedStyle(r).backgroundColor : null; };
    return { rows: trs.length, cols: data ? data.children.length : 0,
      even: bg('even'), odd: bg('odd'),
      padTop: cell ? Math.round(parseFloat(getComputedStyle(cell).paddingTop)) : 0,
      keyShare: cell ? +(cell.getBoundingClientRect().width / t.getBoundingClientRect().width).toFixed(3) : null,
      nums: getComputedStyle(t).fontVariantNumeric, sticky: cell ? getComputedStyle(cell).position : null,
      cellBg: cell ? getComputedStyle(cell).backgroundColor : null };
  }).sort((a, b) => b.rows - a.rows);
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
    searchCol: searchCol === null ? null : Math.round(searchCol - frame.left),
    rows, masonry, tables, footer,
    identityLeft: identity ? Math.round(identity.getBoundingClientRect().left - frame.left) : null,
  };
};

// The one rule, in one place: a page-level row's ink starts on the content column's left edge — the
// narrower centred results column on a search page, otherwise the left edge of the node that owns it
// (a two-region rail row belongs to its rail card, not to the page's feed column).
const expectedLeft = (g, row) => (row.inRail || g.searchCol === null ? row.parentLeft : g.searchCol);
const misaligned = (g) => g.rows.filter((r) => Math.abs(r.left - expectedLeft(g, r)) > 4);
const orphans = (m) => (m.cols === m.n ? [] : m.per.filter((c) => c === 1));

const pw = process.env.AUTOFE_PLAYWRIGHT_CORE || (process.env.HOME + '/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core');
const chrome = process.env.AUTOFE_CHROME_PATH || (process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell');
assert.ok(fs.existsSync(pw) && fs.existsSync(chrome), 'Chromium required; a CSS-only reading cannot measure the content column, the waterfall columns or a table row stripe');
const { chromium } = createRequire(import.meta.url)(pw);
const browser = await chromium.launch({ executablePath: chrome, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const load = async (k) => { await page.setContent(render(modelOf(k), { site: k.split('/')[0] }), { waitUntil: 'domcontentloaded' }); return page.evaluate(PROBE); };
  let measuredRows = 0, footerPages = 0, identityPages = 0, railPages = 0;
  const waterfall = [], striped = [];

  // ---- 1. all 40 pages: central band, rows on the content column, footer distributed, no orphan column
  for (const r of scale) {
    const g = await load(r.k);
    measuredRows += g.rows.length;
    railPages += g.rows.some((x) => x.inRail) ? 1 : 0;
    // the content band never touches the edges, and never grows past a comfortable measure
    check(`${r.k}: content sits in a central band (left ${g.frame.left}, width ${g.frame.width})`,
      g.frame.left >= 40 && g.frame.width <= 1180);
    check(`${r.k}: no horizontal overflow`, g.overflow <= 1);
    // the owner's rule: a page-level row starts on the content column's left edge — never at the
    // viewport edge, never floating at the page centre while a narrower column sits there.
    const bad = misaligned(g);
    check(`${r.k}: every page-level action row starts on the content column's left edge (${JSON.stringify(bad)})`, bad.length === 0);
    check(`${r.k}: no page-level row escapes the content band (${JSON.stringify(g.rows.filter((x) => x.left < -1))})`,
      g.rows.every((x) => x.left >= -1));
    for (const m of g.masonry) {
      waterfall.push({ k: r.k, ...m });
      // a column count that can leave a column holding ONE card (n=5 in 4 columns) is the orphan
      // column the owner saw; n === cols (a full row) is a row, not an orphan.
      check(`${r.k}: waterfall of ${m.n} has no orphan column (${m.cols} columns ${JSON.stringify(m.per)})`, orphans(m).length === 0);
    }
    for (const t of g.tables) {
      striped.push({ k: r.k, rows: t.rows });
      check(`${r.k}: table (${t.rows} rows) has zebra stripes (even ${t.even} / odd ${t.odd})`,
        t.even !== t.odd && t.even !== 'rgba(0, 0, 0, 0)' && t.odd !== 'rgba(0, 0, 0, 0)');
      check(`${r.k}: table cells have comfortable padding (top ${t.padTop}px) and keep tabular numerals`,
        t.padTop >= 11 && t.nums === 'tabular-nums');
      // a 2-column key/value table keeps its value next to its key instead of across a half-empty table
      check(`${r.k}: a 2-column table keeps the value near its key (key column ${t.keyShare} of the table)`,
        t.cols !== 2 || t.keyShare === null || t.keyShare <= 0.4);
      check(`${r.k}: the key column stays visible while the table scrolls (first cell ${t.sticky}, opaque ${t.cellBg})`,
        t.sticky === 'sticky' && t.cellBg !== 'rgba(0, 0, 0, 0)');
    }
    if (g.footer) {
      footerPages++;
      check(`${r.k}: footer link groups distribute across the band (${JSON.stringify(g.footer)})`,
        g.footer.start <= 24 && g.footer.endGap <= 24);
    }
    if (g.identityLeft !== null) { identityPages++; check(`${r.k}: the site identity keeps the band's left edge (typesetting baseline)`, g.identityLeft === 0); }
  }
  // a family that never matches would make every per-row assertion above vacuous (gate_probe)
  check(`the page-level row family really measured rows across 40 pages (${measuredRows})`, measuredRows >= 20);
  check(`the footer rule really measured footer pages (${footerPages})`, footerPages >= 10);
  check(`the identity exemption is exercised, not dead (${identityPages} pages)`, identityPages >= 1);
  check(`the rail exemption is exercised, not dead (${railPages} pages)`, railPages >= 1);
  check(`waterfalls are exercised across the corpus (${waterfall.length} containers)`, waterfall.length >= 5);
  check(`tables are exercised across the corpus (${striped.length} tables)`, striped.length >= 3);
  check('waterfall members never split across columns (break-inside:avoid kept)',
    render(modelOf('sspai-com/home')).includes('.masonry>*{break-inside:avoid}'));

  // ---- 2. the wide viewport keeps the same band instead of stretching -------------------------
  await page.setViewportSize({ width: 1920, height: 900 });
  for (const k of ['36kr-com/search-ai', 'sspai-com/matrix', 'aws-amazon/ec2-on-demand', 'mi-com/home']) {
    const g = await load(k);
    check(`${k} @1920: the band does not stretch to the edges (left ${g.frame.left}, width ${g.frame.width})`,
      g.frame.left >= 150 && g.frame.width <= 1600 && misaligned(g).length === 0);
  }
  await page.setViewportSize({ width: 1280, height: 900 });

  // ---- 3. the pages the owner named, pinned as regression facts -------------------------------
  // 36kr 搜索页（两个查询页同形）：根级「查看更多」和导航动作都落在结果子列的左边缘（帧 60 + 偏移 137
  // = 197），既不居中（S6 的 523）也不贴页框左边缘（153 之前的那次错修）；「站内搜索」作为字段行的
  // 提交钮仍留在输入框那一行 —— 例外被行使，不是一条空话。
  for (const k of ['36kr-com/search-ai', '36kr-com/search-viz']) {
    const g = await load(k);
    const more = g.rows.find((x) => x.text === '查看更多');
    const nav = g.rows.find((x) => x.text === 'AI测评网');
    check(`${k}: the results column really is a centred sub-column (${g.searchCol}px in)`, g.searchCol > 100 && g.searchCol < 200);
    check(`${k}: the root action sits on the results column's left edge, not the page centre (${more?.left} vs ${g.searchCol})`,
      more && more.left === g.searchCol && Math.abs(more.left - (g.frame.width - more.width) / 2) > 40);
    check(`${k}: the navigation action is aligned the same way (${nav?.left})`, nav && nav.left === g.searchCol);
    const field = await page.evaluate(() => {
      const row = document.querySelector('.g-query .expose-input');
      const btn = row?.parentElement?.querySelector('.action,.action-plain,.action.verb-submit');
      return row && btn ? { field: Math.round(row.getBoundingClientRect().left), btn: Math.round(btn.getBoundingClientRect().left) } : null;
    });
    check(`${k}: the field+submit row keeps its submit on the field's line (${JSON.stringify(field)})`,
      field && field.btn > field.field);
  }
  // huawei home：营销页的内容列就是 band 本身，页级动作行落在 x=0（帧左边缘），入口矩阵仍铺满 band。
  const hw = await load('huawei-cn/home');
  const news = hw.rows.find((x) => x.text === '更多新闻');
  const brand = hw.rows.find((x) => x.text === '了解华为');
  check(`huawei home: end-of-section actions sit on the band's left edge (${news?.left}, ${brand?.left})`,
    news?.left === 0 && brand?.left === 0);
  check('huawei home: the entrance matrix still spans the band', hw.rows.some((x) => x.kind === 'controls' && x.width >= 1100));
  // sspai home：5 张卡的瀑布流不再排成 4 列（2/1/1/1），而是 2 列 3+2。
  const sp = await load('sspai-com/home');
  const five = sp.masonry.find((m) => m.n === 5);
  check(`sspai home: the 5-card collection is 2 columns of 3+2 (${JSON.stringify(five)})`,
    five && five.cols === 2 && five.declared === '2' && five.per.slice().sort().join('/') === '2/3' && orphans(five).length === 0);
  // aws 表页：79 行的键值表有斑马纹、舒展留白、键列收紧，并且横向滚动时键列停靠。
  await load('aws-amazon/ec2-on-demand');
  const aws = await page.evaluate(() => {
    const t = [...document.querySelectorAll('table.data')].sort((a, b) => b.querySelectorAll('tbody tr').length - a.querySelectorAll('tbody tr').length)[0];
    const trs = [...t.querySelectorAll('tbody tr')];
    const cell = trs.find((r) => !r.classList.contains('row-group')).querySelector('td');
    const gap = (el) => Math.round(el.getBoundingClientRect().width);
    return { rows: trs.length, key: gap(cell), table: gap(t), width: Math.round(getComputedStyle(cell).width === '' ? 0 : parseFloat(getComputedStyle(cell).paddingTop)) };
  });
  check(`aws table: ${aws.rows} rows read as a key/value list, not key left + value across the table (key ${aws.key}/${aws.table})`,
    aws.rows >= 60 && aws.key / aws.table <= 0.4);
  const stickyProof = async (mutate) => {
    await load('aws-amazon/ec2-on-demand');
    // force a horizontal scroll: the rule must hold whenever the table is wider than its scroller
    await page.addStyleTag({ content: '.data-scroll table.data{min-width:1500px}' + (mutate || '') });
    return page.evaluate(() => {
      const sc = [...document.querySelectorAll('.data-scroll')].sort((a, b) => b.querySelectorAll('tbody tr').length - a.querySelectorAll('tbody tr').length)[0];
      const cell = sc.querySelector('tbody tr:not(.row-group) td');
      const before = Math.round(cell.getBoundingClientRect().left);
      sc.scrollLeft = 240;
      return { moved: sc.scrollLeft, before, after: Math.round(cell.getBoundingClientRect().left) };
    });
  };
  const stuck = await stickyProof();
  check(`aws table: the key column stays put while the table scrolls (${JSON.stringify(stuck)})`,
    stuck.moved > 0 && stuck.after === stuck.before);
  // aws 表页的引言仍居中在表前（S5a），页框仍落在内容带内。
  const intro = await page.evaluate(() => {
    const b = document.querySelector('.table-page .fact').getBoundingClientRect();
    const main = document.querySelector('main'), mb = main.getBoundingClientRect(), cs = getComputedStyle(main);
    const left = mb.left + parseFloat(cs.paddingLeft), right = mb.right - parseFloat(cs.paddingRight);
    return { introLeft: Math.round(b.left - left), introRight: Math.round(right - b.right), introWidth: Math.round(b.width), left: Math.round(left) };
  });
  check('aws table page: the intro stays centred under its table inside the wider band',
    Math.abs(intro.introLeft - intro.introRight) <= 2 && intro.introWidth < 700 && intro.left >= 40);
  // sspai matrix：两区帧（feed + 380px 侧栏）整体落在带内，侧栏的动作行对齐侧栏卡自己的左边缘。
  await load('sspai-com/matrix');
  const mx = await page.evaluate(() => {
    const rail = document.querySelector('.feed-rail').getBoundingClientRect();
    const main = document.querySelector('main'), mb = main.getBoundingClientRect(), cs = getComputedStyle(main);
    const side = document.querySelector('.feed-rail-side').getBoundingClientRect();
    const act = [...document.querySelectorAll('.feed-rail-side .action,.feed-rail-side .controls')].map((e) => Math.round(e.getBoundingClientRect().left));
    return { left: Math.round(rail.left - (mb.left + parseFloat(cs.paddingLeft))), width: Math.round(rail.width),
      feed: Math.round(document.querySelector('.feed-main').getBoundingClientRect().width),
      side: Math.round(side.left), inRail: act.every((x) => x >= Math.round(side.left) && x < Math.round(side.left + 200)) };
  });
  check('sspai matrix: the two-region frame fills the band exactly (feed + rail, no outer overflow)',
    mx.left === 0 && mx.width <= 1180 && mx.feed > 600 && mx.feed < mx.width);
  check(`sspai matrix: rail actions align to their own card, not the whole page (${JSON.stringify(mx)})`, mx.inRail);
  // sspai u-jtc092al：身份卡/成就格/动态流都收在同一段 1160px 带内。
  const u = await load('sspai-com/u-jtc092al');
  check('sspai profile: the page band carries the identity, achievements and feed (no edge-to-edge rows)',
    u.frame.left >= 40 && u.frame.width <= 1180 && misaligned(u).length === 0);

  // ---- 4. NEGATIVE CONTROLS: the same predicate must catch the owner's two failures -------------
  // (a) S6's centring: the row floats at the page centre again.
  const centred = await (async () => {
    const g = await load('36kr-com/search-ai');
    await page.addStyleTag({ content: '.depth-0>.action-plain,.depth-1>.action{margin-inline:auto!important}' });
    const bad = await page.evaluate(PROBE);
    return { before: misaligned(g).length, after: misaligned(bad) };
  })();
  check('negative control: a re-centred page-level row is detected',
    centred.before === 0 && centred.after.length >= 2 && centred.after.every((r) => Math.abs(r.left - r.parentLeft) > 40));
  // (b) the "still left" fix: the row hugs the page frame while the content column is further in.
  const flushed = await (async () => {
    await load('36kr-com/search-viz');
    await page.addStyleTag({ content: '.depth-0>.action-plain,.depth-1>.action{margin-inline-start:0!important}' });
    return misaligned(await page.evaluate(PROBE));
  })();
  check('negative control: a row flushed to the page frame instead of the content column is detected',
    flushed.length >= 2 && flushed.every((r) => r.left === 0));
  // (c) the orphan column: 5 cards declared as 4 columns (2/1/1/1).
  await load('sspai-com/home');
  await page.addStyleTag({ content: '.cards.masonry{--masonry-cols:4!important}' });
  const orphan = (await page.evaluate(PROBE)).masonry.find((m) => m.n === 5);
  check(`negative control: 5 cards in 4 columns is detected as an orphan column (${JSON.stringify(orphan)})`,
    orphan.cols === 4 && orphans(orphan).length >= 1);
  // (d) the table zebra removed.
  await load('aws-amazon/ec2-on-demand');
  await page.addStyleTag({ content: 'table.data tbody tr{background:transparent!important}' });
  const flat = (await page.evaluate(PROBE)).tables[0];
  check('negative control: a table without zebra stripes is detected', flat.even === flat.odd);
} finally { await browser.close(); }
console.log(`PASS page-level taste regressions: ${checks} assertions; 40 exemplar pages + 6 owner pages pinned + 4 bounded negative controls; no experience verdict.`);
