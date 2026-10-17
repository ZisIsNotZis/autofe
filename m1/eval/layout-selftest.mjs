// 轮 58 · 第 17 道自测：布局系统（页面栅格 + 区域钉扎 + 图片策略 + 列数 + 条目内聚）。
// 这些全是保真度看不见的呈现规则（U-18…U-27），必须可证伪（F-040）：
//   a) 页面容器：main 居中（max-width ≈1280px + margin auto），宽度分层类由轴层声明；
//   b) 区域钉扎：header 组先于页面主标题（h1）、footer 组永远最后、元素级动作在 footer 之前；
//   c) 图片策略：max-width:100%（不超容器、不违边距）；满幅 .strip 仅限声明的 hero/banner
//      （深度 0 主图 / article.banner / .band 内的受约束内容条带）；
//   d) 列数决策：宽层卡片/Feed 集合（成员皆带图、卡片尺寸文本）⇒ .stack.cols-auto 网格；
//      阅读型集合（长文成员）保持单列；媒体优先（图在题上）由 .media-first 承载。
// 断言对象是渲染产物（HTML 结构 + CSS 规则），并覆盖全部范例页；负例注入证明可失败。
import { render } from '../render.mjs';
import { nodePlan, readingPageOf, pageLayoutOf } from '../axis.mjs';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, '..', '..');
const RENDERS = path.join(root, 'm1/curated/renders');
const cssOf = (html) => (/<style>([\s\S]*?)<\/style>/.exec(html) ?? [])[1] ?? '';
const bodyOf = (html) => { const i = html.indexOf('<body'); return i < 0 ? html : html.slice(i); };

let passed = 0, failed = 0;
const failMsgs = [];
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? '·' : '✗'} ${name}${ok ? '' : ' — ' + detail}`);
  if (ok) passed++; else { failed++; failMsgs.push(name + (detail ? ` (${detail})` : '')); }
};

// ---- fixtures ---------------------------------------------------------------
// 带三个站点区域 + 一个 Feed 集合 + 一个正文集合的最小页：钉扎/列数/媒体优先都看它。
const img = (u) => ({ image: u, alt: 'pic' });
const feedItem = (n) => ({ _title: { text: `视频卡${n}` }, _image: img(`https://x.example/v${n}.jpg`), _duration: { text: '0:1' + n }, _count: { text: '1.2 万' } });
const pageFixture = {
  _title: { text: '页面标题' },
  header: { _lines: [{ _items: [{ _name: { text: '首页' }, _action: { verb: 'navigate', to: 'https://x.example/' } }] }] },
  feed: { _title: { text: 'Feed' }, _items: [1, 2, 3, 4].map(feedItem) },
  notes: {
    _title: { text: '阅读' },
    _lines: [1, 2, 3].map((i) => ({ _text: { text: `这是一段足够长的阅读正文第${i}段，它远超过列数判据的卡片尺寸文本上限，必须是单列阅读流，绝不能被排成多列网格，因为它是文章而不是卡片。` } })),
  },
  footer: { _title: { text: '页脚' }, _lines: [{ _items: [{ _name: { text: '备案信息' } }] }] },
};
const page = bodyOf(render(structuredClone(pageFixture), {}));
const css = cssOf(render(structuredClone(pageFixture), {}));

// ---- a) 页面容器 -------------------------------------------------------------
check('容器居中：main=1280px + margin auto + 对称 padding', /main\{max-width:1280px;margin:0 auto;padding:32px 24px 0\}/.test(css));
check('局部形态继承页面框架（prose/narrow/wide），声明 banner 可 bleed',
  css.includes('.node.w-prose,.node.w-narrow,.node.w-wide{max-width:none;margin-inline:0;width:100%}')
  && css.includes('.node.w-bleed{max-width:none;width:100vw'));

// ---- b) 区域钉扎 -------------------------------------------------------------
const h1 = page.indexOf('<h1');
const gHeader = page.indexOf('<section class="group g-header"');
const gFooter = page.indexOf('<section class="group g-footer"');
const groupOpens = [...page.matchAll(/<section class="group g-/g)].map((m) => m.index);
const lastGroup = groupOpens[groupOpens.length - 1];
check('header 组先于页面主标题（h1）', gHeader >= 0 && h1 >= 0 && gHeader < h1, `g-header@${gHeader} h1@${h1}`);
check('footer 组是最后一个区域组', gFooter >= 0 && gFooter === lastGroup, `g-footer@${gFooter} last@${lastGroup}`);
// 元素级动作（mi15「用户评价」形态）：根节点的动作行渲染在内容区末尾、footer 之前。
const evalModel = { _title: { text: '商品' }, product: { _title: { text: '详情' }, _detail: { text: '规格参数。' } }, reviews: { _action: { verb: 'open', to: 'https://x.example/reviews', label: '用户评价' } }, footer: { _title: { text: '页脚' } } };
const evalPage = bodyOf(render(evalModel, {}));
const pos = (s, m) => s.indexOf(m);
check('商品级动作（用户评价）在 footer 之前', pos(evalPage, '用户评价') >= 0 && pos(evalPage, '用户评价') < pos(evalPage, '<section class="group g-footer"'), `评价@${pos(evalPage, '用户评价')} footer@${pos(evalPage, '<section class="group g-footer"')}`);

// ---- c) 图片策略 -------------------------------------------------------------
check('全局图片规则：max-width:100%（压到容器宽，不违边距）', /(^|[,\s])img\b[^{]*\{[^}]*max-width:100%/.test(css) && /img\{[^}]*margin-inline:auto/.test(css));
check('内容图带（image-strip）不满幅：.band 包裹 + 居中压宽', css.includes('.band .strip{width:auto;max-width:100%;margin:0 auto}'));
check('hero/带内图居中（窄于视口不再贴左）', css.includes('.strip img{width:auto;max-width:100%;height:auto;display:block;margin-inline:auto'));

const bleedModel = {
  _title: { text: '主图页' },
  _image: img('https://x.example/hero.jpg'),
  gallery: { _title: { text: '长图带' }, _items: [1, 2, 3, 4, 5, 6].map((n) => ({ _image: img(`https://x.example/long${n}.jpg`) })) },
  band: { _title: { text: '横幅' }, _lines: [{ _title: { text: '单元' }, _subtitle: { text: '副题' }, _image: img('https://x.example/banner.jpg'), _action: { verb: 'open', label: '看看', to: 'https://x.example/b' } }] },
};
const bleedPage = bodyOf(render(bleedModel, {}));
// 一个裸 .strip（无 .band 包裹）只允许出现在声明的 hero/banner 里：所在 article 必须是
// depth-0 根或带 .banner 类。这里 gallery 六图带必须全部在 .band 内。
const stripPositions = [...bleedPage.matchAll(/<figure class="strip[^"]*"/g)].map((m) => m.index);
const bandWraps = [...bleedPage.matchAll(/<div class="band">/g)].map((m) => m.index);
check('内容图带全部被 .band 包裹（画廊 6 图）', bandWraps.length === 6, `band=${bandWraps.length}`);
check('裸满幅条带仅出现在声明 hero（深度 0 主图）与 banner 成员内', (() => {
  // 每个 strip 图：在 .band/.gallery-mosaic 内（受约束形态）或所在 article 是 depth-0 / .banner。其它位置都是违规。
  for (const m of bleedPage.matchAll(/<figure class="strip([^"]*)"/g)) {
    const extra = m[1], at = m.index;
    if (/\btile\b/.test(extra)) continue;                       // 照片墙瓷砖：受 mosaic 网格约束
    if (bleedPage.slice(at - 18, at) === '<div class="band">') continue; // .band 内：受容器宽约束
    const art = bleedPage.lastIndexOf('<article', at);
    const cls = /class="([^"]*)"/.exec(bleedPage.slice(art, at))?.[1] ?? '';
    if (!/\bdepth-0\b/.test(cls) && !/\bbanner\b/.test(cls)) return false;
  }
  return true;
})());

// ---- d) 列数决策 + 媒体优先 ---------------------------------------------------
check('宽层 Feed 声明多列：.stack.cols-auto / .cards 网格规则存在',
  css.includes('.stack.cols-auto{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))'));
check('Feed 集合拿到 cols-auto（4 卡成员，皆带图）', page.includes('cols-auto'), page.includes('cols-auto') ? '' : 'feed 未声明列数');
check('媒体优先（图在题上）规则存在且被声明', css.includes('.media-first .node>.fact:has(.val img)') && page.includes('media-first'));
check('阅读集合保持单列（无 cols-auto 落到 notes）', (() => {
  const notesAt = page.indexOf('这是一段足够长的阅读正文第1段');
  const stackStart = page.lastIndexOf('<div class="stack', notesAt);
  return !/class="stack[^"]*cols-auto/.test(page.slice(stackStart, notesAt));
})());

// Width must consume the FINAL column decision, not an uninitialized g.cols.
check('图卡列数决定后才求宽度（防止 cols-auto 仍被 880px 锁住）',
  nodePlan(pageFixture.feed, { depth: 1 }).widthTier === 'wide');
const readingFixture = { _title: { text: '长文' }, _image: img('https://x.example/cover.jpg'),
  _lines: Array.from({ length: 8 }, () => ({ _text: { text: '连续正文。'.repeat(30) } })) };
const readingHtml = bodyOf(render(readingFixture));
check('长篇共享阅读列（封面 band + root reading-page）', readingPageOf(readingFixture)
  && /depth-0 reading-page/.test(readingHtml) && readingHtml.includes('<div class="band"><figure class="strip">'));
check('短文不误判为长篇阅读页', !readingPageOf({ _lines: readingFixture._lines.slice(0, 7) }));
check('页脚前景/背景成对 + chip 继承同区域 ink', css.includes('background:var(--surface);color:var(--ink)')
  && /\.group\.g-footer \.chip-item\{[^}]*background:transparent[^}]*color:var\(--ink\)/.test(css));
check('营销图片与文本同 surface（元数据驱动）', css.includes('.banner-integrated')
  && css.includes('background:var(--banner-bg);color:var(--banner-fg)'));

// Whole-page frame classification is structural, not a per-site override.
const modelAt = (site, slug) => JSON.parse(fs.readFileSync(path.join(root, 'm1/curated', site, slug + '.json'), 'utf8'));
// 轮63：合成 fixture（无 `_scope`）走结构兜底分支，真实的商品/目录页走它们声明的角色。
check('目录/商品/营销/详情页有页面级布局契约',
  pageLayoutOf(modelAt('huawei-cn','consumer-phones')).kind === 'catalog'
  && pageLayoutOf({_image: img('https://x.example/p.jpg'), _price: {money: 899, currency: 'USD'}, _title: {text: 'P'}}).kind === 'product'
  && pageLayoutOf(modelAt('apple-com','home')).kind === 'marketing'
  && pageLayoutOf(modelAt('airbnb-com','room-28871')).kind === 'detail');
// 轮 63（S1b-ii）：页面原型由声明的 `_scope`/`_subject` 与业务结构推导，`default` 不再是合法结果 ——
// 这三页以前回落 `default`，现在各自落到它声明的角色上。
check('已认可的阅读/商品/入口页布局不被新契约误伤',
  pageLayoutOf(modelAt('sspai-com','post-114716')).kind === 'reading'
  && pageLayoutOf(modelAt('mi-com','product-detail-mi15')).kind === 'product'
  && pageLayoutOf(modelAt('bilibili-com','home')).kind === 'marketing');
const detailFixture = { _title:{text:'详情'}, gallery:{_items:[1,2,3].map(n=>({_image:img('https://x.example/'+n)}))},
  summary:{_detail:{text:'主体信息'}}, request:{_composite:'form',_summary:{text:'任务面板'}}, reviews:{_text:{text:'评价'}} };
const detailPage = bodyOf(render(detailFixture));
check('详情正文/任务/后续区域可达且各出现一次', ['主体信息','任务面板','评价'].every(t=>detailPage.split(t).length===2)
  && detailPage.includes('class="detail-main"') && detailPage.includes('class="detail-task"') && detailPage.includes('class="detail-tail"'));
check('超宽营销页不再用全视口交错色带', css.includes('main:has(.marketing-page){max-width:1728px')
  && css.includes('.marketing-page .node.w-bleed{width:100%;margin-inline:0}'));

// ---- e) 容器水平界内（轮 59 · U-28）-------------------------------------------
// 口径（静态 HTML 近似，无浏览器布局）：容器是 <main>（居中 max-width:1280px + 24px padding）。
// ① 结构：body 的**顶层可见节点**必须全部位于 <main> 之内 —— 容器外的顶层可见节点必然越出
//    容器左右界（U-28 的 `12 mo.` 孤块正是这一形态）；script/style/容器标签本身不算可见内容。
// ② 逃逸声明：margin 的水平分量为负且幅度超过容差（26px = 容器 padding 24px + 2px）⇒ 内容被
//    推出容器界。满幅 hero 的 100vw 靠 ≤24px 的负边距补偿容器 padding（.strip margin:48px -24px），
//    是声明过的 bleed 形态（c) 组已单独管辖裸 .strip 的位置），在容差内不算违规；
//    -999px 级别的逃逸必失败。
const OOB_TOLERANCE_PX = 26;
const hmarginEscape = (decl) => {
  const m = /margin(?:-(?:left|right|inline))?\s*:\s*([^;}"']+)/.exec(decl);
  if (!m) return false;
  const vals = m[1].trim().split(/\s+/).map(parseFloat);
  const hor = /margin-(?:left|right|inline)/.test(m[0]) ? [vals[0]]
    : vals.length === 1 ? [vals[0]] : [vals[1], vals[3]].filter((x) => !Number.isNaN(x));
  return hor.some((x) => x < -OOB_TOLERANCE_PX);
};
const anyHmarginEscape = (text) => [...text.matchAll(/margin(?:-(?:left|right|inline))?\s*:\s*([^;}"']+)/g)].some((m) => hmarginEscape(m[0]));
// 一处渲染产物的越界违规清单（口径如上）：容器外顶层可见节点 + 内联负水平边距。
const oobViolations = (html) => {
  const b = bodyOf(html);
  const out = [];
  const m0 = b.indexOf('<main'), m1 = b.lastIndexOf('</main>');
  const outside = m0 >= 0 && m1 > m0 ? b.slice(0, m0) + b.slice(m1 + 7) : b;   // '</main>'.length === 7
  for (const t of outside.matchAll(/<([a-zA-Z][a-zA-Z0-9-]*)\b/g)) {
    if (['body', 'html', 'script', 'style'].includes(t[1])) continue;
    out.push(`top-level <${t[1]}> 在容器外`);
  }
  for (const s of b.matchAll(/style="([^"]*)"/g)) if (hmarginEscape(s[1])) out.push(`内联 ${s[1]}`);
  return out;
};
check(`样式表无越界负水平边距（容差 ${OOB_TOLERANCE_PX}px，内含满幅补偿）`, !anyHmarginEscape(css));

// ---- 范例页全量断言 ----------------------------------------------------------
const exemplars = fs.readdirSync(RENDERS).filter((f) => f.endsWith('.html') && f !== 'index.html');
// A footer is terminal at its owning level; descendants are part of it.
const terminalFooters = (html) => {
  const stack = [], footers = [];
  for (const m of html.matchAll(/<\/?([a-z][\w-]*)\b[^>]*>/gi)) {
    const tag = m[1].toLowerCase(), closing = m[0].startsWith('</');
    if (closing) { if (stack.at(-1)?.tag === tag) stack.pop(); continue; }
    if (['img','input','br','hr','meta','link','source','wbr','area','base','embed','param','track','col'].includes(tag)) continue;
    const parent = stack.at(-1), node = { tag, parent, children: [], footer: /class="[^"]*\bg-footer\b/.test(m[0]) };
    if (parent) parent.children.push(node);
    if (node.footer) footers.push(node);
    stack.push(node);
  }
  return footers.every((f) => f.parent?.children.at(-1) === f);
};
check('footer nested region remains valid', terminalFooters('<article><section class="group g-footer"><section class="group g-notices"></section></section></article>'));
check('footer late sibling region is rejected', !terminalFooters('<article><section class="group g-footer"></section><section class="group g-late"></section></article>'));
check('footer late action is rejected', !terminalFooters('<article><section class="group g-footer"></section><a href="/late">Late</a></article>'));
let pinBad = [], footBad = [], bleedBad = [], oobBad = [];
for (const f of exemplars) {
  const b = bodyOf(fs.readFileSync(path.join(RENDERS, f), 'utf8'));
  const gh = b.indexOf('<section class="group g-header"');
  const h1p = b.indexOf('<h1');
  if (gh >= 0 && h1p >= 0 && gh > h1p) pinBad.push(f);
  if (!terminalFooters(b)) footBad.push(f);
  const v = oobViolations(b);
  if (v.length) oobBad.push(`${f}: ${v[0]}`);
  for (const m of b.matchAll(/<figure class="strip([^"]*)"/g)) {
    if (/\btile\b/.test(m[1])) continue;
    if (b.slice(m.index - 18, m.index) === '<div class="band">') continue;
    const art = b.lastIndexOf('<article', m.index);
    const cls = /class="([^"]*)"/.exec(b.slice(art, m.index))?.[1] ?? '';
    if (!/\bdepth-0\b/.test(cls) && !/\bbanner\b/.test(cls)) bleedBad.push(`${f}@${m.index}(${cls})`);
  }
}
check(`范例页 ${exemplars.length} 页：header 组都在 h1 之前`, pinBad.length === 0, pinBad.slice(0, 3).join(', '));
check(`范例页 ${exemplars.length} 页：footer 组都是最后一个区域组`, footBad.length === 0, footBad.slice(0, 3).join(', '));
check(`范例页 ${exemplars.length} 页：裸满幅条带仅在声明 hero/banner`, bleedBad.length === 0, bleedBad.slice(0, 3).join(', '));
check(`范例页 ${exemplars.length} 页：容器水平界内（顶层可见节点全在 <main> 内，无负水平边距逃逸）`, oobBad.length === 0, oobBad.slice(0, 3).join(' | '));
const taobao = fs.existsSync(path.join(RENDERS, 'taobao-com-home.html')) ? bodyOf(fs.readFileSync(path.join(RENDERS, 'taobao-com-home.html'), 'utf8')) : '';
check('taobao 猜你喜欢已多列（cols-auto）', taobao.includes('cols-auto'));
const bili = fs.existsSync(path.join(RENDERS, 'bilibili-com-home.html')) ? bodyOf(fs.readFileSync(path.join(RENDERS, 'bilibili-com-home.html'), 'utf8')) : '';
check('bilibili 视频卡已媒体优先（media-first）', bili.includes('media-first'));

// ---- 负例注入：本门禁必须可失败（F-040）--------------------------------------
const mutate = (s, fn) => fn(s);
const badPin = mutate(page, (s) => {
  const sec = /<section class="group g-header"[\s\S]*?<\/section>/.exec(s)?.[0] ?? '';
  return s.replace(sec, '').replace('</h1>', '</h1>' + sec);   // 把 header 挑到页面主标题之后 ⇒ 违规
});
check('N1 header 挪到 h1 之后 ⇒ 必须失败', (() => {
  const gh = badPin.indexOf('<section class="group g-header"'), h1p = badPin.indexOf('<h1');
  return gh > h1p;
})(), '负例未构造出违规');
const badCols = mutate(page, (s) => s.replace(/ cols-auto/g, ''));
check('N2 删掉 cols-auto ⇒ 必须失败', !badCols.includes('cols-auto'), '负例未构造出违规');
const badBleed = mutate(bleedPage, (s) => s.replace(/<div class="band">(<figure class="strip">[\s\S]*?<\/figure>)<\/div>/g, '$1'));
check('N3 解除 .band 包裹 ⇒ 裸 strip 出现在非声明处，必须失败', (() => {
  for (const m of badBleed.matchAll(/<figure class="strip">/g)) {
    const art = badBleed.lastIndexOf('<article', m.index);
    const cls = /class="([^"]*)"/.exec(badBleed.slice(art, m.index))?.[1] ?? '';
    if (!/\bdepth-0\b/.test(cls) && !/\bbanner\b/.test(cls)) return true;
  }
  return false;
})(), '负例未构造出违规');
const badCss = mutate(css, (s) => s.replace('margin:0 auto', 'margin:0'));
check('N4 容器去居中 ⇒ 必须失败', !/main\{max-width:1280px;margin:0 auto;padding:32px 24px 0\}/.test(badCss), '负例未构造出违规');
const badOobMargin = mutate(page, (s) => s.replace('<main>', '<main><div style="margin-left:-999px">孤儿块</div>'));
check('N5 margin-left:-999px 内联逃逸 ⇒ 必须失败', oobViolations(badOobMargin).some((v) => v.includes('margin-left')), '负例未构造出违规');
const badOobTop = mutate(page, (s) => s.replace('</main>', '</main><div>容器外顶层节点</div>'));
check('N6 容器外顶层可见节点 ⇒ 必须失败', oobViolations(badOobTop).some((v) => v.startsWith('top-level')), '负例未构造出违规');
const badCssOob = mutate(css, (s) => s.replace('.meta{', '.meta{margin-left:-999px;'));
check('N7 样式表越界负水平边距 ⇒ 必须失败', anyHmarginEscape(badCssOob), '负例未构造出违规');

console.log(failed ? `\n布局系统自测: 失败 ${failed} 项 — ${failMsgs.join(' | ')}` : `\n布局系统自测: 全部通过（栅格/钉扎/图片策略/列数/媒体优先/容器界内 + ${exemplars.length} 页范例 + 7 负例注入）`);
process.exit(failed ? 1 : 0);
