// Executable regressions for the all-sites shared frame/control findings. Geometry
// is a falsification gate, not experience acceptance. No generated gallery writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { render } from '../render.mjs';
import { renderMarkdown } from '../render-md.mjs';
import { renderText } from '../render-text.mjs';
import { hasTarget, nodePlan, selectForm, feedRailOf, matrixColumns } from '../axis.mjs';

let checks = 0;
const check = (label, condition) => { assert.ok(condition, label); checks++; };
const action = (label, to, verb = 'open') => ({ verb, label, to });
const choice = { _title: { text: 'Choose' }, _expose: { name: 'route', type: 'text' },
  _items: [{ _name: { text: 'Local destination' }, _action: action('Local destination', 'https://example.test/local') },
    { _name: { text: 'Targetless choice' } }] };
const entity = (name, n) => ({ _name: { text: name }, _price: { money: n, currency: 'USD' }, _detail: { text: 'Shared attribute' },
  _action: action('Learn more', `https://example.test/${n}`), buy: { _title: { text: 'Buy' }, _action: action('Buy', `https://example.test/buy/${n}`, 'buy') } });
const comparison = { _title: { text: 'Compare' }, _rel: { compare: true }, _items: [entity('First', 1), entity('Second', 2)] };
const email = { _title: { text: 'Help' }, _summary: { text: 'Write to support@example.test for help.' },
  _action: action('support@example.test', 'mailto:support@example.test') };
for (const [label, model, target] of [['choice', choice, 'https://example.test/local'], ['comparison inner Buy', comparison, 'https://example.test/buy/2'], ['email', email, 'mailto:support@example.test']]) {
  check(`${label} HTML destination`, render(model).includes(`href="${target}"`));
  check(`${label} Markdown destination`, renderMarkdown(model).includes(`](${target})`));
}
check('comparison text retains inner Buy', renderText(comparison).includes('[Buy]'));
for (const to of ['javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd', 'mailto:bad address']) check('unsafe target rejected: ' + to, !hasTarget({ to }));
const buyPage = { _title: { text: 'Product' }, _summary: { text: 'Product introduction.' }, _action: action('Buy', 'https://example.test/buy', 'buy'),
  story: { _title: { text: 'Later story' }, _detail: { text: 'Long following narrative.' } } };
const closingPage = { ...buyPage, _action: action('Get started', 'https://example.test/signup') };
for (const fn of [render, renderMarkdown, renderText]) {
  const h = fn(buyPage); check('purchase stays with opening facts in ' + fn.name, h.indexOf('Buy') < h.indexOf('Later story'));
  const c = fn(closingPage); check('non-purchase closing CTA stays at tail in ' + fn.name, c.lastIndexOf('Get started') > c.indexOf('Later story'));
}
const repeated = { _title: { text: 'Guide' }, _lines: [
  { _name: { text: 'Payment methods' }, _items: [{ _name: { text: 'First destination' } }] },
  { _name: { text: 'Manage' }, _items: [{ _name: { text: 'Manage destination' } }] },
  { _name: { text: 'Payment methods' }, _items: [{ _name: { text: 'Second destination' } }] }] };
check('populated repeated sibling heading remains local', render(repeated).split('>Payment methods</').length === 3);
check('long editorial records do not become cramped cards', selectForm([1, 2, 3].map((i) => ({ _title: { text: 'News ' + i }, _detail: { text: 'Long editorial paragraph. '.repeat(12) } }))) === 'stack');
check('option decision supplies target at the option', nodePlan(choice).choice.options[0].action.href === 'https://example.test/local');
check('named editorial records with metadata do not inherit feature-card columns',
  nodePlan({ _items: [1, 2, 3].map((n) => ({ _name: { text: 'Record ' + n }, _summary: { text: 'Editorial summary' }, _author: { text: 'Captured author' } })) }).items.groups[0].cols === 0);
const acceptedProduct = JSON.parse(fs.readFileSync(new URL('../curated/apple-com/ipad-air.json', import.meta.url), 'utf8'));
check('accepted named feature comparison keeps its established card axis', nodePlan(acceptedProduct._lines[4]).items.groups[0].form === 'cards'
  && nodePlan(acceptedProduct._lines[4]).items.groups[0].cols === 'auto');
const acceptedReading = JSON.parse(fs.readFileSync(new URL('../curated/sspai-com/post-114716.json', import.meta.url), 'utf8'));
check('accepted reading utilities retain compact definition form', nodePlan(acceptedReading._lines[11]).items.groups[0].form === 'deflist');

// ---- S2c: feed+rail frame and even link matrix (docs/m1/composition.md §3/§6) ---------------
// The frame is DERIVED (axis.mjs feedRailOf): the largest collection when it dominates its
// siblings, plus the short card sections that follow it. These are its two refusals.
const list = (n, prefix, extra = {}) => ({ _items: Array.from({ length: n }, (_, i) => ({ _name: { text: `${prefix} ${i + 1}` }, ...extra, _action: action('Open', `https://example.test/${prefix}/${i + 1}`) })) });
const railPage = (feedCount, rivalCount, scope = 'category') => ({ _scope: scope, _title: { text: 'Community' },
  feed: list(feedCount, 'Post', { _detail: { text: 'A short post description.' } }),
  other: { _title: { text: 'Series' }, ...list(rivalCount, 'Series', { _detail: { text: 'A short series description.' } }) },
  side: { _title: { text: 'Worth following' }, _image: { image: 'https://example.test/side.png', alt: '' }, _action: action('Open', 'https://example.test/side') },
  nav: { _items: [{ _title: { text: 'Home' }, _action: action('Home', 'https://example.test/', 'navigate') }] } });
const derived = feedRailOf(railPage(9, 4));
check('catalog feed + trailing short cards becomes feed+rail', derived?.feedKey === 'feed' && derived.railKeys.join() === 'other,side' && derived.tailKeys.join() === 'nav');
check('two comparable collections keep the single column', feedRailOf(railPage(9, 8)) === null);
check('a collection too short to be the page feed keeps the single column', feedRailOf(railPage(7, 3)) === null);
check('a prototype with its own frame (search) is never re-cut into feed+rail', feedRailOf(railPage(9, 4, 'query')) === null);
check('a feed whose only trailing section is site navigation has no rail', feedRailOf({ _scope: 'category', feed: list(9, 'Post'), nav: railPage(9, 4).nav }) === null);
check('matrix columns divide the entrance count evenly', matrixColumns(6) === 3 && matrixColumns(8) === 4 && matrixColumns(4) === 4 && matrixColumns(3) === 3 && matrixColumns(12) === 4 && matrixColumns(7) === 4);

// Every modeled safe action survives both link-capable targets, including label-less
// navigation. An option-local DOM check below prevents a false pass from a duplicate
// destination located elsewhere on the page.
// The same sweep records which pages the S2c feed+rail frame claims, so the honest coverage
// figure in composition.md §3 (1/40) is pinned: a frame that starts firing on another page
// fails here instead of shipping silently.
const framed = [];
for (const site of fs.readdirSync(new URL('../curated/', import.meta.url))) {
  if (!fs.statSync(new URL(`../curated/${site}`, import.meta.url)).isDirectory() || ['assets', 'renders'].includes(site)) continue;
  const dir = new URL(`../curated/${site}/`, import.meta.url);
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const model = JSON.parse(fs.readFileSync(new URL(file, dir), 'utf8'));
    const html = render(model, { site }).split('<body>')[1].replaceAll('&amp;', '&');
    if (html.includes('<div class="feed-rail">')) framed.push(`${site}/${file.replace(/\.json$/, '')}`);
    const md = renderMarkdown(model);
    const visit = (n, p = '$') => {
      if (!n || typeof n !== 'object') return;
      if (hasTarget(n._action) && !n._action.when) {
        const target = n._action.to.startsWith('key:') ? '#' + n._action.to.slice(4).replace(/[^A-Za-z0-9_-]/g, '-') : n._action.to;
        check(`${site}/${file} ${p} HTML target`, html.includes(`href="${target}"`));
        check(`${site}/${file} ${p} Markdown target`, md.includes(`](${target})`));
      }
      for (const [k, v] of Object.entries(n)) visit(v, p + '.' + k);
    };
    visit(model);
  }
}
check('the feed+rail frame claims exactly the one catalog feed page (1/40)', framed.join() === 'sspai-com/matrix');

const pw = process.env.AUTOFE_PLAYWRIGHT_CORE || (process.env.HOME + '/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core');
const chrome = process.env.AUTOFE_CHROME_PATH || (process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell');
assert.ok(fs.existsSync(pw) && fs.existsSync(chrome), 'Chromium required; static fallback cannot certify frame geometry');
const { chromium } = createRequire(import.meta.url)(pw);
const browser = await chromium.launch({ executablePath: chrome, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  const fixture = { _title: { text: 'Mixed frame' }, _summary: { text: 'Same owning frame.' }, choice,
    prose: { _title: { text: 'Text' }, _lines: [{ _text: { text: 'A readable paragraph.' } }] },
    table: { _title: { text: 'Data' }, _items: [1, 2].map((n) => ({ _name: { text: 'Record ' + n }, _fields: { cpu: { text: 'Technical CPU value' }, memory: { text: 'Technical memory value' } } })) },
    cards: { _title: { text: 'Records' }, _items: [1, 2, 3].map((n) => ({ _title: { text: 'Record ' + n }, _detail: { text: 'A distinct readable description.' } })) } };
  const geometry = () => {
    const root = document.querySelector('main>.node');
    const left = root.getBoundingClientRect().x;
    const edges = [...root.querySelectorAll(':scope>.title,:scope>.fact,:scope>.group>.node')].map((e) => e.getBoundingClientRect().x);
    return { left, edges, width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth };
  };
  for (const width of [2560, 1920, 1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.setContent(render(fixture), { waitUntil: 'load' });
    const g = await page.evaluate(geometry);
    check('mixed frame actual edges at ' + width, g.edges.every((x) => Math.abs(x - g.left) <= 2));
    check('no document overflow at ' + width, g.scroll <= g.width + 1);
    check('option-local destination at ' + width, await page.locator('.expose-route .choice a[href="https://example.test/local"]').count() === 1);
    if (width === 390) check('data table scrolls rather than compressing columns', await page.locator('.data-scroll').evaluate((e) => e.scrollWidth > e.clientWidth && e.querySelector('table').getBoundingClientRect().width >= 640));
    // The exact historical failure (title 640, local section 880 vs frame1232) must be detected.
    await page.addStyleTag({ content: '.depth-0>.title{max-width:640px;margin-inline:auto}.node.w-narrow{max-width:880px;margin-inline:auto}' });
    const bad = await page.evaluate(geometry);
    if (width > 390) check('wide-screen axis mutation is detected at ' + width, bad.edges.some((x) => Math.abs(x - bad.left) > 2));
  }
  const media = { image: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="784"><rect width="200" height="784" fill="gray"/></svg>'), alt: 'Captured object' };
  const mediaPage = { _title: { text: 'Product media' }, _image: media, _price: { money: 10, currency: 'USD' },
    inbox: { _title: { text: 'Objects' }, _items: [1, 2].map((n) => ({ _name: { text: 'Associated object ' + n }, _image: media })) },
    coverage: { ...choice, _items: [1, 2].map((n) => ({ _name: { text: 'Coverage ' + n }, _detail: { text: 'Readable coverage explanation. '.repeat(10) } })) } };
  for (const width of [2560, 1920, 1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.setContent(render(mediaPage), { waitUntil: 'load' });
    const g = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth,
      rows: [...document.querySelectorAll('.media-captions .defrow')].map((e) => {
        const im = e.querySelector('img'), r = im.getBoundingClientRect(), label = e.querySelector('.deflabel').getBoundingClientRect();
        return { width: r.width, height: r.height, natural: im.naturalWidth, captionY: label.y, imageY: r.y };
      }), choice: document.querySelector('fieldset:has(table)').getBoundingClientRect().width }));
    check('media/fieldset do not overflow actual page at ' + width, g.overflow <= 1 && g.choice <= width);
    check('tall source objects remain compact, caption-cohesive and never enlarged at ' + width,
      g.rows.length === 2 && g.rows.every((r) => r.height <= 360 && r.width <= r.natural && r.captionY < r.imageY));
  }
  const contrast = () => {
    const a = document.querySelector('.self-link'); const s = getComputedStyle(a); const rgb = s.color.match(/[\d.]+/g).slice(0, 3).map(Number);
    const lin = rgb.map((x) => x / 255).map((x) => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
    return 1.05 / (lin.reduce((n, x, i) => n + x * [.2126, .7152, .0722][i], 0) + .05);
  };
  for (const site of ['36kr-com', 'sspai-com', 'grafana-play']) {
    await page.setContent(render({ _title: { text: 'Informative link' }, _action: { verb: 'navigate', to: 'https://example.test/link' } }, { site }));
    check(site + ' informative link foreground pairs with light surface', await page.evaluate(contrast) >= 4.5);
  }
  await page.addStyleTag({ content: '.self-link{color:#ccccdc!important}' });
  check('copied dark-theme foreground mutation is detected', await page.evaluate(contrast) < 4.5);
  for (const [site, slug] of [['apple-com', 'home'], ['taobao-com', 'home']]) {
    const model = JSON.parse(fs.readFileSync(new URL(`../curated/${site}/${slug}.json`, import.meta.url), 'utf8'));
    for (const width of [2560, 1920, 1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.setContent(render(model, { site }), { waitUntil: 'domcontentloaded' });
      const g = await page.locator('main>.node>.site-identity').evaluate((e) => ({ x: e.getBoundingClientRect().x, root: e.parentElement.getBoundingClientRect().x, size: parseFloat(getComputedStyle(e).fontSize), align: getComputedStyle(e).textAlign }));
      check(`${site} compact content-edge identity at ${width}`, g.size <= 18 && Math.abs(g.x - g.root) <= 2 && g.align === 'left');
    }
  }

  // ---- S2b frame regressions (docs/m1/composition.md §3/§6) -------------------
  // 1. A feed/record row is capped at its own text measure + media + declared gap: the unused
  //    middle of a page-wide row WAS the text↔media gap (sspai matrix, 608px median before).
  const curated = (site, slug) => JSON.parse(fs.readFileSync(new URL(`../curated/${site}/${slug}.json`, import.meta.url), 'utf8'));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.setContent(render(curated('sspai-com', 'matrix'), { site: 'sspai-com' }), { waitUntil: 'domcontentloaded' });
  const rowFrame = () => page.evaluate(() => {
    const row = document.querySelector('.record-member');
    const cs = getComputedStyle(row);
    const tracks = cs.gridTemplateColumns.trim().split(/\s+/).map(parseFloat);
    const media = row.querySelector(':scope>.band,:scope>.fact:has(img)');
    return { maxWidth: parseFloat((cs.maxWidth.match(/([\d.]+)px/) || [])[1] ?? '0'), width: row.getBoundingClientRect().width, tracks,
      gap: parseFloat(cs.columnGap), mediaLead: media.getBoundingClientRect().left - row.getBoundingClientRect().left,
      container: row.closest('main').getBoundingClientRect().width };
  });
  const row = await rowFrame();
  // 同一条不变式两向用：行自有量宽成立时封顶，去掉后必须被同一个谓词抓到。
  const cappedRow = (m) => m.width <= m.maxWidth + 1 && m.maxWidth < m.container;
  check('record row is capped at its own text measure + media + gap', cappedRow(row));
  check('record row text column and media are adjacent at the declared gap', Math.abs(row.mediaLead - (row.tracks[0] + row.gap)) <= 2);
  await page.addStyleTag({ content: '.record-member{max-width:100%!important}' });
  const stretched = await rowFrame();
  // 负样本：去掉自有量宽（回到旧的一行拉满）必须被同一条不变式抓到。
  check('record row without its own measure is detected', !cappedRow(stretched) && stretched.width > row.width);
  // 2. A collection whose cards cannot share a row height is column flow (masonry) on marketing
  //    image walls and on a catalog feed with uneven excerpts; a uniform product grid stays a grid.
  await page.setContent(render(curated('huawei-cn', 'home'), { site: 'huawei-cn' }), { waitUntil: 'domcontentloaded' });
  const collage = await page.evaluate(() => {
    const c = document.querySelector('.g-featured .cards');
    const cs = getComputedStyle(c);
    const box = c.getBoundingClientRect();
    const kids = [...c.children].map((k) => k.getBoundingClientRect());
    return { cls: c.className, display: cs.display, columns: cs.columnCount,
      inside: kids.every((k) => k.left >= box.left - 1 && k.right <= box.right + 1), n: kids.length };
  });
  check('heterogeneous marketing collage is masonry (column flow, 2 columns)', collage.cls.includes('masonry') && collage.display === 'block' && collage.columns === '2');
  check('masonry cards stay inside the container', collage.inside && collage.n === 4);
  await page.setContent(render(curated('huawei-cn', 'consumer-phones'), { site: 'huawei-cn' }), { waitUntil: 'domcontentloaded' });
  check('uniform product grid stays a row grid (not masonry)', await page.evaluate(() => [...document.querySelectorAll('.cards')].every((c) => !c.className.includes('masonry') && getComputedStyle(c).display === 'grid')));
  // 3. A marketing page's set of ≥4 link controls is an entrance matrix of cards, not a pill row.
  await page.setContent(render(curated('huawei-cn', 'home'), { site: 'huawei-cn' }), { waitUntil: 'domcontentloaded' });
  const matrix = await page.evaluate(() => {
    const c = document.querySelector('.g-business .controls');
    const cards = [...c.querySelectorAll('a.ctl')].map((a) => a.getBoundingClientRect());
    return { cls: c.className, display: getComputedStyle(c).display, n: cards.length,
      cardLike: cards.every((r) => r.width >= 200 && r.height >= 100) };
  });
  check('marketing link matrix renders each entrance as a card', matrix.cls.includes('link-matrix') && matrix.display === 'grid' && matrix.n === 6 && matrix.cardLike);
  // 4. A comparison row prints its label ONCE: the cell must not repeat the row heading.
  await page.setContent(render(curated('apple-com-cn', 'iphone-17'), { site: 'apple-com-cn' }), { waitUntil: 'domcontentloaded' });
  const cmp = await page.evaluate(() => [...document.querySelectorAll('.cmp-table tbody tr')].map((tr) => {
    const th = tr.querySelector('th.cmp-row');
    const label = th ? th.textContent.trim() : '';
    return { label, repeats: label ? [...tr.querySelectorAll('td .title')].filter((e) => e.textContent.trim() === label).length : 0 };
  }));
  check('comparison rows carry labels', cmp.filter((r) => r.label).length >= 5);
  check('comparison cell never repeats the row label', cmp.every((r) => r.repeats === 0));

  // ---- S2c frame: feed+rail two regions, and an even link matrix ----------------------
  // 1. sspai matrix: the sidebar (一派 / 值得关注 / 专栏推荐) is a RAIL beside the feed, not a
  //    stack under it, and the feed column is no longer page-wide — the row's own cap and its
  //    column now agree, so the text↔media gap is the declared gap instead of dead canvas.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.setContent(render(curated('sspai-com', 'matrix'), { site: 'sspai-com' }), { waitUntil: 'domcontentloaded' });
  const regions = () => page.evaluate(() => {
    const frame = document.querySelector('.feed-rail');
    if (!frame) return { frame: false };
    const cs = getComputedStyle(frame);
    const feed = document.querySelector('.feed-main').getBoundingClientRect();
    const rail = document.querySelector('.feed-rail-side').getBoundingClientRect();
    const rows = [...document.querySelectorAll('.feed-main .record-member')];
    const withMedia = rows.map((r) => ({ row: r, media: r.querySelector(':scope>.band,:scope>.fact:has(img)') })).filter((x) => x.media);
    return { frame: true, display: cs.display, tracks: cs.gridTemplateColumns.trim().split(/\s+/).length,
      feedW: Math.round(feed.width), railW: Math.round(rail.width), feedTop: Math.round(feed.top), railTop: Math.round(rail.top),
      feedIsLeft: rail.left >= feed.right, rows: rows.length,
      // only a media-bearing row declares a media slot: a row without one caps at the text measure
      slack: withMedia.map((x) => Math.round(feed.right - x.row.getBoundingClientRect().right)),
      mediaAtRowEdge: withMedia.every((x) => Math.abs(x.media.getBoundingClientRect().right - x.row.getBoundingClientRect().right) <= 2),
      railText: document.querySelector('.feed-rail-side').textContent, insideRail: Boolean(document.querySelector('.feed-rail-side .g-worth-following') && document.querySelector('.feed-rail-side .g-columns')) };
  });
  const twoRegion = await regions();
  check('matrix page is laid out as two regions (feed + rail)', twoRegion.frame && twoRegion.display === 'grid' && twoRegion.tracks === 2);
  check('the rail sits to the right of the feed, beside it rather than after it',
    twoRegion.feedIsLeft && Math.abs(twoRegion.railTop - twoRegion.feedTop) <= 2 && twoRegion.feedW > twoRegion.railW * 2);
  check('the trailing side cards ARE the rail', twoRegion.insideRail && twoRegion.railText.includes('值得关注') && twoRegion.railText.includes('专栏推荐'));
  check('feed rows fill their column: no page-wide dead band', twoRegion.rows >= 20 && twoRegion.slack.every((s) => s >= 0 && s <= 40) && twoRegion.mediaAtRowEdge);
  await page.addStyleTag({ content: '.feed-rail{display:block!important}' });
  check('a stacked rail is detected (the two-region frame can fail)', (await regions()).frame === false || (await regions()).display !== 'grid');
  await page.setContent(render(curated('sspai-com', 'matrix'), { site: 'sspai-com' }), { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: '.feed-rail{grid-template-columns:minmax(0,1fr) 120px!important}' });
  const narrowRail = await regions();
  check('a rail too narrow for the feed column\'s own measure leaves a dead band and is detected', narrowRail.railW <= 130 && narrowRail.slack.some((s) => s > 40));
  // 2. A marketing page's entrance matrix fills whole rows: the column count divides the entrance
  //    count (6 entrances → 3 across), so no row is left with a lone card.
  await page.setContent(render(curated('huawei-cn', 'home'), { site: 'huawei-cn' }), { waitUntil: 'domcontentloaded' });
  const evenMatrix = () => page.evaluate(() => {
    const c = document.querySelector('.g-business .controls.link-matrix');
    const cards = [...c.querySelectorAll('a.ctl')].map((a) => a.getBoundingClientRect());
    const perRow = {};
    for (const r of cards) perRow[Math.round(r.y)] = (perRow[Math.round(r.y)] ?? 0) + 1;
    return { cols: getComputedStyle(c).gridTemplateColumns.trim().split(/\s+/).length,
      declared: getComputedStyle(c).getPropertyValue('--matrix-cols').trim(), n: cards.length, rows: Object.values(perRow) };
  });
  const even = await evenMatrix();
  check('link matrix columns divide its 6 entrances evenly (3 across, 2 full rows)',
    even.cols === 3 && even.declared === '3' && even.n === 6 && even.rows.length === 2 && even.rows.every((r) => r === 3));
  await page.addStyleTag({ content: '.marketing-page .controls.link-matrix{grid-template-columns:repeat(4,minmax(0,1fr))!important}' });
  const ragged = await evenMatrix();
  check('a 4-column matrix (the old auto-fit) is detected as a ragged 4+2 row', ragged.cols === 4 && ragged.rows.includes(4) && ragged.rows.includes(2));
} finally { await browser.close(); }
console.log(`PASS page-frame/action regressions: ${checks} assertions; Chromium 2560/1920/1440/390; no experience verdict.`);
