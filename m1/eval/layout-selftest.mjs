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
check('宽度分层规则存在（prose/narrow/wide/bleed）',
  css.includes('.node.w-prose{max-width:74ch;margin-inline:auto}') && css.includes('.node.w-narrow{max-width:880px;margin-inline:auto}')
  && css.includes('.node.w-wide{max-width:none}') && css.includes('.node.w-bleed{max-width:none;width:100vw'));

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

// ---- 范例页全量断言 ----------------------------------------------------------
const exemplars = fs.readdirSync(RENDERS).filter((f) => f.endsWith('.html') && f !== 'index.html');
let pinBad = [], footBad = [], bleedBad = [];
for (const f of exemplars) {
  const b = bodyOf(fs.readFileSync(path.join(RENDERS, f), 'utf8'));
  const gh = b.indexOf('<section class="group g-header"');
  const h1p = b.indexOf('<h1');
  if (gh >= 0 && h1p >= 0 && gh > h1p) pinBad.push(f);
  const opens = [...b.matchAll(/<section class="group g-/g)].map((m) => m.index);
  const gf = b.indexOf('<section class="group g-footer"');
  if (gf >= 0 && opens.length && gf !== opens[opens.length - 1]) footBad.push(f);
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

console.log(failed ? `\n布局系统自测: 失败 ${failed} 项 — ${failMsgs.join(' | ')}` : `\n布局系统自测: 全部通过（栅格/钉扎/图片策略/列数/媒体优先 + ${exemplars.length} 页范例 + 4 负例注入）`);
process.exit(failed ? 1 : 0);
