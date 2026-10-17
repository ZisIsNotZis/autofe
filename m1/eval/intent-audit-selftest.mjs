// 意图门禁自测（intent-audit 的可证伪性证明，proof.gate_probe）。
//
// 主张：`m1/eval/intent-audit.mjs` 判出的四类发现，是因为缺陷真的存在，而不是因为它恒返回发现；
// 而且它们按 docs/m1/composition.md §5 的严重度分流：三项错误阻断、死选择器只作警告。
// 做法：同一批检测函数与同一个 `gateOutcome` 吃两组合成夹具 ——
//   负样本（已知坏）：未定构图 + 类缺失 + 死选择器 + 死声明对 + 非正方形瓷砖 + 马赛克主体缺失 —— 必须被抓；
//   正样本（已知好）：真实原型 + 类已兑现 + 同值重复/上下文特化/!important 低者/跨媒体 + 正方形瓷砖 —— 必须不被抓。
// 死声明那一节的要点是「只报永远赢不了的那句」：基础声明被更具体的选择器特化是正常级联
// （DevTools 划线，但不是缺陷），把它报出来会逼人删掉本来要生效的 CSS。
// 严重度那一节的要点是「死代码不逼删能力」：只有死选择器（= 只是警告）时门禁必须 exit 0，
// 加上 `--strict-dead` 才 exit 1；任何一项错误必须 exit 1（不靠警告充数也不靠警告阻塞）。
// 另外还会断言「发现本身非空」（页种类类名、语料类名、页表、死选择器），否则正则一坏就返回空表，
// 整节「无违规」就不再是证据。
// 只有「坏的被抓 且 好的通过」才退出 0；任一控制项失败退出 1，浏览器起不来退出 2（未执行≠通过）。
// 用法: node m1/eval/intent-audit-selftest.mjs
import { createRequire } from 'node:module';
import {
  compositionViolations, deadSelectors, cascadeConflicts, parseCss, runtimeOverrides,
  pageKindClasses, emittedClasses, engineCss, loadPages, RUNTIME_VIEWPORTS, cascadeCoveredRuntimePages,
  gateOutcome,
} from './intent-audit.mjs';

let failed = 0, controls = 0;
const check = (name, cond, detail = '') => {
  controls++;
  if (cond) console.log(`ok   ${name}`);
  else { failed++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
};

// ---------------------------------------------------------------- 合成夹具
const BAD_PAGES = [
  { k: 'fixture/bad-default', kind: 'default', emitted: new Set(['node', 'stack']) },
  { k: 'fixture/bad-class', kind: 'catalog', emitted: new Set(['node', 'stack']) },
];
const GOOD_PAGES = [
  { k: 'fixture/good-catalog', kind: 'catalog', emitted: new Set(['node', 'catalog-page']) },
  { k: 'fixture/good-reading', kind: 'reading', emitted: new Set(['node', 'reading-page']) },
];

// 夹具语料：这些类名「真的被某页打出来过」。死声明判定要求覆盖双方都命中语料。
const FIXTURE_EMITTED = new Set([
  'fx-banner', 'title', 'fx-card', 'fx-strip', 'fx-band', 'fx-twin', 'fx-mq', 'fx-imp',
  'fx-a', 'fx-b', 'fx-c', 'fx-good', 'fx-note', 'fx-list', 'fx-row', 'fx-base', 'fx-p', 'on',
  'fx-cards', 'item', 'fx-x',
]);

// 必须被抓：同一主体、同一属性、同一媒体上下文下，低者在整个语料上永远赢不了。
const BAD_CSS = `
.fx-twin{padding:4px}
.fx-twin{padding:8px}
@media(max-width:700px){.fx-mq{padding:2px}.fx-mq{padding:6px}}
.fx-imp{padding:1px}
.fx-imp{padding:2px!important}
.fx-a .fx-b .fx-c{color:red}
.fx-a .fx-b .fx-c{color:blue}
`;
// 必须不被抓：上下文级联（高者多一个祖先/类）、同值重复、!important 特化、跨媒体、不同主体。
const GOOD_CSS = `
.fx-good>.title{text-align:center}
.fx-good>.title{text-align:center}
.fx-banner>.title{text-align:center}
.fx-card .fx-banner>.title{text-align:left}
.fx-strip{width:100vw}
.fx-band .fx-strip{width:auto}
.fx-base{color:blue}
.fx-band .fx-base{color:red!important}
.fx-p{color:blue}
.fx-p:not(.on){color:red}
.fx-cards{display:grid}
.fx-cards:has(>.item){display:flex}
.fx-c{color:red}
@media(max-width:700px){.fx-c{color:blue}}
.fx-a .fx-b .fx-c{margin:1px}
.fx-x .fx-a .fx-b .fx-c{margin:2px}
.fx-list{display:grid}
.fx-list>.fx-row{display:flex}
`;

// 负样本瓷砖复现 §6 的真实缺陷形态：.detail-page 把 aspect-ratio 改成 auto 并钉住行高 180px，
// 瓷砖于是被拉成非正方形；窄屏分支（同引擎的 @media 覆写）把行高压到 60px，所以两个视口都得被抓。
const BAD_TILE = `<style>
.gallery-mosaic{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;align-items:stretch;grid-auto-rows:180px}
.gallery-mosaic .strip{width:auto;aspect-ratio:auto;overflow:hidden}
@media(max-width:900px){.gallery-mosaic{grid-auto-rows:60px}}
</style><div class="gallery-mosaic"><div class="strip"></div><div class="strip"></div><div class="strip"></div><div class="strip"></div></div>`;
const GOOD_TILE = `<style>
.gallery-mosaic{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;align-items:start}
.gallery-mosaic .strip{width:auto;aspect-ratio:1/1;overflow:hidden}
</style><div class="gallery-mosaic"><div class="strip"></div><div class="strip"></div><div class="strip"></div><div class="strip"></div></div>`;

// ------------------------------------------------------- a) 未定构图 / 类兑现
const badComp = compositionViolations(BAD_PAGES);
check('负样本: 回落 default 被抓',
  badComp.some((v) => v.k === 'fixture/bad-default' && v.class === 'undetermined'),
  JSON.stringify(badComp));
check('负样本: 原型未兑现类被抓',
  badComp.some((v) => v.k === 'fixture/bad-class' && v.class === 'class-missing'),
  JSON.stringify(badComp));
const goodComp = compositionViolations(GOOD_PAGES);
check('正样本: 原型非 default 且类已兑现 → 不报', goodComp.length === 0, JSON.stringify(goodComp));

// ------------------------------------------------------------- b) 死选择器
const badDead = deadSelectors(parseCss('.ghost-page .stack{margin:0}\n.live-page{margin:0}'), { 'live-page': 12, stack: 40 });
check('负样本: 0 命中的结构类名按选择器被抓',
  badDead.length === 1 && badDead[0].selector === '.ghost-page .stack' && badDead[0].classes.join() === 'ghost-page',
  JSON.stringify(badDead));
const goodDead = deadSelectors(parseCss('.live-page{margin:0}'), { 'live-page': 12 });
check('正样本: 有命中的选择器 → 不报', goodDead.length === 0, JSON.stringify(goodDead));
// 严重度：死选择器落在 warnings 档，不是 errors 档（composition.md §5-2）。
const deadOnly = gateOutcome({ composition: 0, deadDeclaration: 0, runtime: 0, deadSelectors: badDead.length });
check('分流: 死选择器只进 warnings，不进 errors',
  deadOnly.warnings.deadSelectors === 1 && deadOnly.warnings.total === 1 && deadOnly.errors.total === 0,
  JSON.stringify(deadOnly));

// ------------------------------------------------------------- c) 级联冲突
const badConf = cascadeConflicts(parseCss(BAD_CSS), FIXTURE_EMITTED);
const has = (rows, selector, property, dead, winner) => rows.some((r) =>
  r.struckSelector === selector && r.property === property && r.struckValue === dead && r.winningValue === winner);
check('负样本: 同选择器重复声明被判死声明（.fx-twin 4px→8px）',
  has(badConf, '.fx-twin', 'padding', '4px', '8px'), JSON.stringify(badConf));
check('负样本: @media 内同选择器重复声明被判死声明',
  has(badConf, '.fx-mq', 'padding', '2px', '6px') && badConf.filter((r) => r.struckSelector === '.fx-mq').length === 1,
  JSON.stringify(badConf));
check('负样本: 后置 !important 压掉前句被判死声明',
  has(badConf, '.fx-imp', 'padding', '1px', '2px'), JSON.stringify(badConf));
check('负样本: 三节祖先链上同选择器重复声明被判死声明',
  has(badConf, '.fx-a .fx-b .fx-c', 'color', 'red', 'blue'), JSON.stringify(badConf));

const goodConf = cascadeConflicts(parseCss(GOOD_CSS), FIXTURE_EMITTED);
check('正样本: 基础 + 特化（高者多一个祖先/类）→ 不报', !goodConf.some((r) =>
  r.struckSelector === '.fx-banner>.title' || r.struckSelector === '.fx-strip'
  || r.struckSelector === '.fx-a .fx-b .fx-c' || r.struckSelector === '.fx-p' || r.struckSelector === '.fx-cards'),
  JSON.stringify(goodConf));
check('正样本: 同值重复 / !important 特化 / 跨媒体 / 不同主体 → 一条都不报', goodConf.length === 0, JSON.stringify(goodConf));

// 语料求交：命不中的规则压不掉任何东西（`.product-page` 0 命中，它的声明不算覆盖）。
const ghostCss = '.fx-ghost{color:red}\n.fx-ghost{color:blue}';
check('正样本: 类名不在语料里的规则 → 不报（命不中的规则不算覆盖）',
  cascadeConflicts(parseCss(ghostCss), FIXTURE_EMITTED).length === 0,
  JSON.stringify(cascadeConflicts(parseCss(ghostCss), FIXTURE_EMITTED)));
check('负样本: 把该类名加进语料 → 同一对被抓（证明求交真的在起作用）',
  cascadeConflicts(parseCss(ghostCss), new Set([...FIXTURE_EMITTED, 'fx-ghost'])).length === 1);

// ------------------------------------------------------- 真实引擎的数据发现非空
const realRules = parseCss(engineCss());
check('发现非空: 引擎 CSS 解析出规则', realRules.length > 100, `rules=${realRules.length}`);
const kindClasses = pageKindClasses(realRules);
check('发现非空: 引擎 CSS 里的页种类类名', kindClasses.length > 0, JSON.stringify(kindClasses));
check('发现非空: 引擎 CSS 里确有 `*-page` 页种类类名', kindClasses.some((c) => c.endsWith('-page')), JSON.stringify(kindClasses));
const realPages = loadPages();
check('发现非空: 页表已载入', realPages.length > 0, `pages=${realPages.length}`);
check('发现非空: 渲染里打出的类名', realPages.every((p) => p.emitted.size > 0),
  `empty=${realPages.filter((p) => !p.emitted.size).map((p) => p.k)}`);
const sample = emittedClasses('<style>.stray{color:red}</style><div class="a b"></div><div class="c"></div>');
check('类名提取: 只取 class 属性、不把 CSS 文本里的类名当打出的类',
  sample.has('a') && sample.has('b') && sample.has('c') && !sample.has('stray'), JSON.stringify([...sample]));
check('正样本: 真实 CSS 里 pageKindClasses 能落到真实渲染上（不全是死类名）',
  realPages.some((p) => kindClasses.some((c) => p.emitted.has(c))));
const realEmitCount = {};
for (const p of realPages) for (const c of p.emitted) realEmitCount[c] = (realEmitCount[c] ?? 0) + 1;
const realDead = deadSelectors(realRules, realEmitCount);
// 轮 63：§6 的「页种 CSS 写了不生效」已被构图推导消灭 —— 引擎 CSS 里的每个 `*-page` 类都至少被
// 一页打出（以前 `.product-page` 0 命中）。反向的「检测器没空转」证据改用真实语料里仍然存在的
// 非页种类死类名。
const liveKindClasses = kindClasses.filter((c) => realEmitCount[c] > 0);
check('发现非空: 每个页种类类名都至少被一页打出（§6 页种 CSS 不生效的缺陷已消灭）',
  liveKindClasses.length === kindClasses.length,
  `dead=${JSON.stringify(kindClasses.filter((c) => !(realEmitCount[c] > 0)))}`);
check('发现非空: 真实 CSS 的死选择器检测仍有命中（检测器没空转）',
  realDead.length > 0, JSON.stringify(realDead.slice(0, 5)));

// ----------------------------------------------------------- d) 运行时覆盖
const require = createRequire(import.meta.url);
const PW = process.env.AUTOFE_PLAYWRIGHT_CORE || (process.env.HOME + '/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core');
const CHROME = process.env.AUTOFE_CHROME_PATH || (process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell');
let browser;
try {
  browser = await require(PW).chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
} catch (e) {
  console.error(`意图门禁自测: 无法启动浏览器（${String(e.message).split('\n')[0]}）—— 运行时控制项未执行，不能判通过`);
  process.exit(2);
}
try {
  const page = await browser.newPage({ viewport: RUNTIME_VIEWPORTS[0] });
  for (const viewport of RUNTIME_VIEWPORTS) {
    const badRt = await runtimeOverrides(page, [{ k: 'fixture/bad-tile', content: BAD_TILE }], viewport);
    check(`负样本 @${viewport.width}px: 非正方形马赛克瓷砖被抓`,
      badRt.findings.length === 1 && badRt.findings[0].defect === 'distorted' && badRt.findings[0].deviation > 0.12,
      JSON.stringify(badRt.findings));
    const goodRt = await runtimeOverrides(page, [{ k: 'fixture/good-tile', content: GOOD_TILE }], viewport);
    check(`正样本 @${viewport.width}px: 正方形马赛克瓷砖 → 不报`, goodRt.findings.length === 0, JSON.stringify(goodRt.findings));
  }
  // 主体缺失：模型声明了照片墙，但渲染里一块瓷砖都没有 —— 不许静默通过。
  const noTile = await runtimeOverrides(page, [{ k: 'fixture/gallery-no-tile', content: '<div class="band"></div>', gallery: true }]);
  check('负样本: 模型有照片墙但渲染无瓷砖 → 报主体缺失',
    noTile.findings.length === 1 && noTile.findings[0].defect === 'subject-missing', JSON.stringify(noTile.findings));
  const noGallery = await runtimeOverrides(page, [{ k: 'fixture/no-gallery', content: '<div class="band"></div>', gallery: false }]);
  check('正样本: 模型没有照片墙且渲染无瓷砖 → 不报，但记录 skip',
    noGallery.findings.length === 0 && noGallery.skipped.length === 1, JSON.stringify(noGallery));

  // 真实页正样本：语料里没有照片墙的页（模型无 3–5 张纯图图集）不许被运行时检查报违规。
  const plain = realPages.find((p) => !p.gallery && !p.html.includes('class="gallery-mosaic"'));
  check('发现非空: 找到一页没有照片墙的真实页', Boolean(plain), `pages=${realPages.length}`);
  if (plain) {
    const plainRt = await runtimeOverrides(page, [{
      k: plain.k, content: plain.html, gallery: plain.gallery,
    }]);
    check(`正样本: 真实页 ${plain.k}（无照片墙）→ 运行时检查不报`, plainRt.findings.length === 0, JSON.stringify(plainRt.findings));
  }
  // 真实页负样本：有照片墙的那一页必须真的被量到（否则 d) 整节是空转）。
  const galleryPages = realPages.filter((p) => p.gallery && p.html.includes('class="gallery-mosaic"'));
  check('发现非空: 语料里确有带照片墙的真实页', galleryPages.length > 0, JSON.stringify(realPages.filter((p) => p.gallery).map((p) => p.k)));
} finally {
  await browser.close();
}

// --------------------- c) 与 d) 同页同缺陷去重（否则一个缺陷被两节各计一次）
const dedupePages = [
  { k: 'fixture/mosaic-live', emitted: new Set(['gallery-mosaic', 'strip']) },
  { k: 'fixture/no-mosaic', emitted: new Set(['band']) },
];
check('负样本: 同一页上的 aspect-ratio 死声明与运行时发现被判为同源',
  cascadeCoveredRuntimePages([{ property: 'aspect-ratio', struckClasses: ['gallery-mosaic', 'strip'] }], dedupePages)
    .has('fixture/mosaic-live'));
check('正样本: 其他属性的死声明 / 打不出那两个类的页 → 不算同源',
  cascadeCoveredRuntimePages([
    { property: 'color', struckClasses: ['gallery-mosaic', 'strip'] },
    { property: 'aspect-ratio', struckClasses: ['band'] },
  ], dedupePages).size === 0);

// --------------------------------- 严重度分流与退出码（composition.md §5）
// 基准事实：「只有死选择器」不许阻断。语料不必行使每个引擎能力，把未行使当阻断会逼人删能力。
const warnOnly = gateOutcome({ composition: 0, deadDeclaration: 0, runtime: 0, deadSelectors: realDead.length });
check('发现非空: 真实 CSS 的死选择器非空（下面的正样本才有意义）', realDead.length > 0, `dead=${realDead.length}`);
check('正样本: 只有死选择器警告 → 不阻断、exit 0',
  warnOnly.errors.total === 0 && warnOnly.warnings.total === realDead.length
  && warnOnly.blocked === false && warnOnly.exitCode === 0, JSON.stringify(warnOnly));
check('负样本: 同一批警告在 --strict-dead 下 → 阻断、exit 1',
  gateOutcome({ composition: 0, deadDeclaration: 0, runtime: 0, deadSelectors: realDead.length }, { strictDead: true }).exitCode === 1);
// 三项错误任一项单独出现都必须阻断（不靠警告充数，也不因警告为 0 而漏判）。
for (const kind of ['composition', 'deadDeclaration', 'runtime']) {
  const counts = { composition: 0, deadDeclaration: 0, runtime: 0, deadSelectors: 0, [kind]: 1 };
  check(`负样本: 仅 ${kind} 一项错误 → 阻断、exit 1`, gateOutcome(counts).exitCode === 1, JSON.stringify(counts));
}
check('正样本: 四类都为 0 → exit 0',
  gateOutcome({ composition: 0, deadDeclaration: 0, runtime: 0, deadSelectors: 0 }).exitCode === 0);
// 真实语料口径：错误合计 = 未定构图 + 死声明 + 运行时覆盖，与警告分开计。
const realVerdict = gateOutcome({
  composition: compositionViolations(realPages).length,
  deadDeclaration: cascadeConflicts(realRules, new Set(Object.keys(realEmitCount))).length,
  runtime: 0, deadSelectors: realDead.length,
});
check('发现非空: 真实语料上错误与警告分开计且错误非空',
  realVerdict.errors.total > 0 && realVerdict.warnings.total > 0
  && realVerdict.errors.total === realVerdict.errors.composition + realVerdict.errors.deadDeclaration + realVerdict.errors.runtime,
  JSON.stringify(realVerdict));

console.log(`\n意图门禁自测: ${controls - failed}/${controls} 控制项通过${failed ? `，${failed} 项失败` : ''}`);
process.exit(failed ? 1 : 0);
