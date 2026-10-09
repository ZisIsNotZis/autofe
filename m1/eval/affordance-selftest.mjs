// 轮 57 · 第 16 道自测：链接可供性系统（三层）+ 两处布局，必须可证伪（F-040）。
// 断言的是渲染产物（类名/CSS 引用 var(--accent)/决策标记），不是"CSS 想象"：
//   1) 目的地列表：带 _action.to 的条目 li.go + ::marker accent ›；纯事实条目保持无类（•）
//   2) 正文内链接：.body-link 规则 = var(--accent) + 1px 常显下划线
//   3) 导航型标题：labelless navigate 链接 .self-link.nav（尾部 › 由 ::after 画）
//   4) 站点头区：named child `header` ⇒ .header-bar（横栏）
//   5) banner：大图+标题+动作 ⇒ 图走 hero 槽满幅（figure.strip）；同形状在卡片格内不满幅
//   6) accent 注入：--accent 只能来自 m1/brand-tokens.json（含 evidence），回退必须声明 fallback
// 把任一规则改坏（如所有列表都 •）本自测必须失败；完全由人眼验收的呈现细节由截图覆盖。
import { render } from '../render.mjs';
import { readFileSync } from 'node:fs';

const tokens = JSON.parse(readFileSync(new URL('../brand-tokens.json', import.meta.url), 'utf8'));
const cssOf = (html) => (/<style>([\s\S]*?)<\/style>/.exec(html) ?? [])[1] ?? '';
const fail = [];
const check = (name, ok, detail = '') => { console.log(`  ${ok ? '·' : '✗'} ${name}${ok ? '' : ' — ' + detail}`); if (!ok) fail.push(name); };

// ---- 1. 目的地列表标记即声明 ------------------------------------------------
const listModel = {
  _title: { text: 'L' },
  hot: { _items: [
    { _name: { text: '月饼' }, _action: { verb: 'open', to: 'https://x.example/mooncake' } },
    { _name: { text: '手机' }, _action: { verb: 'open', to: 'https://x.example/phone' } },
    { _name: { text: '空调' }, _action: { verb: 'open', to: 'https://x.example/ac' } },
    { _name: { text: '冰箱' }, _action: { verb: 'open', to: 'https://x.example/fridge' } },
    { _name: { text: '洗衣机' }, _action: { verb: 'open', to: 'https://x.example/washer' } },
    { _name: { text: '耳机' }, _action: { verb: 'open', to: 'https://x.example/buds' } },
    { _name: { text: '平板' }, _action: { verb: 'open', to: 'https://x.example/pad' } },
    { _name: { text: '笔记本' }, _action: { verb: 'open', to: 'https://x.example/laptop' } },
  ] },
};
const listHtml = render(listModel, { site: 'taobao-com' });
// 混合列表（长标签）：一条带目标、一条纯事实 ⇒ go 与 • 同列
const mixedModel = { _title: { text: 'M' }, related: { _items: [
  { _name: { text: '如何把旧手机的数据迁移到新手机上' }, _action: { verb: 'open', to: 'https://x.example/migrate' } },
  { _name: { text: '关于分期付款服务的说明与常见问题解答' } },
] } };
const mixedHtml = render(mixedModel, {});
check('目的地条目（带目标）li.go', listHtml.includes('<li class="go"><a href="https://x.example/mooncake">'), listHtml.match(/<li[^>]*><a href="https:\/\/x\.example[^>]*>/)?.[0] ?? 'missing');
check('纯事实条目保持 •（无 go 类）', mixedHtml.includes('<li>关于分期付款服务的说明与常见问题解答</li>'));
check('::marker 规则引用 accent ›', /\.linklist li\.go::marker\{content:"›";color:var\(--accent\)/.test(cssOf(listHtml)));

// ---- 2. 正文内链接 ----------------------------------------------------------
const proseModel = {
  _title: { text: 'P' },
  apply: {
    _title: { text: 'A' },
    _detail: { text: 'You must apply for a passport before you travel.' },
    _action: { verb: 'open', label: 'apply for a passport', to: 'https://x.example/apply' },
  },
};
const proseHtml = render(proseModel, {});
check('行内正文链接 .body-link', proseHtml.includes('<a class="body-link" href="https://x.example/apply">'));
check('层2 规则 = accent + 1px 常显下划线', /\.val a\.body-link,\.prose a,\.chips a\{color:var\(--accent\);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:2px\}/.test(cssOf(proseHtml)));

// ---- 3. 导航型标题（无 label 的 navigate 链接）尾部 › ------------------------
const navModel = {
  _title: { text: 'T' },
  card: { _title: { text: 'iPhone 18 Pro' }, _summary: { text: 'Pro beyond.' }, _action: { verb: 'navigate', to: 'https://x.example/iphone' } },
};
const navHtml = render(navModel, {});
check('导航型标题 .self-link.nav', navHtml.includes('<a class="self-link nav" href="https://x.example/iphone">'));
check('.nav 尾部 › 由 ::after 画（不进正文文本）', /a\.self-link\.nav::after\{content:" ›"/.test(cssOf(navHtml)));

// ---- 4. 站点头区横栏 --------------------------------------------------------
const headerModel = {
  _title: { text: 'H' },
  header: { _lines: [
    { _items: [{ _name: { text: '小米官网' }, _action: { verb: 'navigate', to: 'https://www.mi.com' } }] },
    { _items: [{ _name: { text: '登录' } }] },
  ] },
};
const headerHtml = render(headerModel, { site: 'mi-com' });
check('header 区域 ⇒ .header-bar', /class="node depth-1[^\"]*header-bar/.test(headerHtml), headerHtml.match(/class="node[^"]*"/)?.[0]);   // 轮58起 article 另可带宽度层类（w-wide 等）
check('header 内导航项横排（无列表标记）', /\.header-bar \.linklist li\{margin:0;list-style:none\}/.test(cssOf(headerHtml)));
check('账号入口 pill 靠右', /\.header-bar>\.block:last-of-type>\.node\{margin-left:auto\}/.test(cssOf(headerHtml)));
check('非 header 区域不加横栏', !/header-bar/.test(render(listModel, {}).split('</style>')[1]));

// ---- 5. banner：满幅 vs 卡片格内 ---------------------------------------------
const bannerUnit = {
  _title: { text: 'iPhone 18 Pro' }, _subtitle: { text: 'Pro beyond.' },
  _image: { image: 'https://x.example/hero.jpg', alt: 'hero' },
  _action: { verb: 'open', label: 'Learn more', to: 'https://x.example/iphone' },
};
const bandModel = { _title: { text: 'B' }, _lines: [
  structuredClone(bannerUnit),
  { _title: { text: 'Watch' }, _summary: { text: 'Track every move day and night with the new ultra sensor.' }, _detail: { text: 'A longer detail sentence so the text-length ratio exceeds the comparability threshold and the pair is a band, not a grid.' }, _image: { image: 'https://x.example/watch.jpg', alt: 'w' }, _action: { verb: 'open', label: 'Learn more', to: 'https://x.example/watch' }, pricing: { _title: { text: 'Buy' }, _action: { verb: 'buy', label: 'Buy', to: 'https://x.example/buy-watch' } } },
] };
const bandHtml = render(bandModel, {});
check('banner 单元图走 hero 槽满幅（figure.strip）', /<figure class="strip"><img src="https:\/\/x\.example\/hero\.jpg"/.test(bandHtml));
check('banner 单元带 .banner 类', /class="node depth-1[^\"]*banner/.test(bandHtml));   // 轮58起 article 另可带 w-bleed 宽度层类
const gridModel = { _title: { text: 'G' }, tiles: { _items: [
  structuredClone(bannerUnit),
  { ...structuredClone(bannerUnit), _title: { text: 'Watch' }, _action: { verb: 'open', label: 'Learn more', to: 'https://x.example/watch' } },
] } };
const gridHtml = render(gridModel, {});
check('卡片格内同形状不满幅（图留在 .fact）', !/figure class="strip"/.test(gridHtml) && /<img src="https:\/\/x\.example\/hero\.jpg"/.test(gridHtml));
check('价格类记录性事实不成 banner（不误伤商品卡）', (() => {
  const m = { _title: { text: 'S' }, results: { _items: [{ _name: { text: 'X' }, _price: { money: 9.9, currency: 'CNY' }, _image: { image: 'https://x.example/p.jpg', alt: 'p' }, _action: { verb: 'open', to: 'https://x.example/x' } }] } };
  const h = render(m, {});
  return !/figure class="strip"/.test(h);
})());

// ---- 6. accent 注入：只来自 tokens，回退必须声明 ------------------------------
check('accent 按站点注入（taobao）', cssOf(listHtml).includes(':root{color-scheme:light;--accent:#cc6600}'));
check('无 site ⇒ default', cssOf(proseHtml).includes(`--accent:${tokens.default.accent}`));
let tokOk = true, tokWhy = [];
for (const [site, s] of Object.entries(tokens.sites)) {
  const a = s.accent ?? {};
  if (!/^#[0-9a-f]{6}$/i.test(a.value ?? '')) { tokOk = false; tokWhy.push(`${site}: 非法色值`); }
  if (typeof a.evidence !== 'string' || a.evidence.length < 8) { tokOk = false; tokWhy.push(`${site}: 缺 evidence`); }
  if (a.fallback === false && !a.evidence.includes('corpus/')) { tokOk = false; tokWhy.push(`${site}: 量得色 evidence 必须指向语料路径`); }
}
check('每条 token 带 evidence；量得色证据指向语料', tokOk, tokWhy.join('; '));
check('渲染器不写死站 accent（ tokens 驱动）', !/#cc6600/.test(readFileSync(new URL('../render.mjs', import.meta.url), 'utf8')));

if (fail.length) { console.log(`\n可供性自测: 失败 ${fail.length} 项 — ${fail.join(' | ')}`); process.exit(1); }
console.log('可供性自测: 全部通过（三层 + header 横栏 + banner 满幅 + tokens 证据链）');
