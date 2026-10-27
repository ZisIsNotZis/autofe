// 轮 63（S1b-ii）：页面构图推导自测（docs/m1/composition.md §2/§5-1）。
// 断言对象是推导本身，不是渲染产物：`pageLayoutOf` 必须对注册表里的 40 页各自落到其采集 archetype
// 允许的闭式原型上，且不得回落 `default`；同时用合成夹具证明树在被声明语义与业务结构无法裁定时
// 诚实返回 `undefined`，而不是编一个原型。
//   a) 40/40：推导结果 ∈ 该页 archetype 允许集（允许集来自 composition.md §1.1 的迁移表，
//      标签只作对照，绝不进入推导；`tools/capture/sites.json` 只按 site/page 键 join）。
//   b) 负样本：结构含混且不声明 `_scope`/`_subject` ⇒ `undefined`（门禁会报未定构图）。
//   c) 正样本：同内容 `_scope:entry` ⇒ marketing，`_scope:category` ⇒ catalog（标签不可由阈值伪造）。
//   d) 正样本：login 复合件（无 `_scope`）⇒ authentication；`_subject:offer` + 媒体墙 + 任务表单 ⇒ detail，
//      同一页去掉任务表单 ⇒ product。
//   e) 长文度量：正文只写在 `_summary`/`_quote` 时也必须被读到（旧度量只看 `_text`）。
// 退出码非 0 即失败。无站点名、无逐页例外、无阈值拟合。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pageLayoutOf, readingPageOf, PAGE_KINDS } from '../axis.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

// 采集 archetype → 允许的引擎原型。目录/列表 = catalog，dashboard 只有 dataset 一种表达
// （图表原语缺失，composition.md §8），故只有 table。
const ALLOWED = {
  'landing/home': ['marketing'],
  'category/list': ['catalog'],
  'search-results': ['search'],
  'product-detail': ['detail', 'product'],
  'article/editorial': ['reading'],
  'docs/design-system': ['reading'],
  'profile/account': ['profile'],
  'table-heavy/admin': ['table'],
  'dashboard/data-viz': ['dashboard'],
  'form/checkout/settings': ['authentication'],
};

let failed = 0, controls = 0;
const fail = (msg) => { failed++; console.log(`FAIL ${msg}`); };
const check = (name, cond, detail = '') => { controls++; if (cond) console.log(`ok   ${name}`); else fail(`${name}${detail ? ` — ${detail}` : ''}`); };
const txt = (s) => ({ text: s });

// ---- a) 40/40 注册页 --------------------------------------------------------
const register = readJson(path.join(here, 'm3-final.json')).map((r) => r.k);
const archetypeOf = new Map();
for (const site of readJson(path.join(root, 'tools/capture', 'sites.json')).sites) {
  for (const page of site.pages) archetypeOf.set(`${site.slug}/${page.slug}`, page.archetype);
}
const rows = register.map((k) => {
  const derived = pageLayoutOf(readJson(path.join(root, 'm1', 'curated', `${k}.json`)));
  return { k, kind: derived.kind, rule: derived.rule, archetype: archetypeOf.get(k) };
});
const unlabelled = rows.filter((r) => r.archetype === undefined);
check('每页都有一条采集 archetype 作对照', unlabelled.length === 0, unlabelled.map((r) => r.k).join(' '));
const offSet = rows.filter((r) => !PAGE_KINDS.includes(r.kind));
check('推导结果都在闭式原型集内', offSet.length === 0, offSet.map((r) => `${r.k}→${r.kind}`).join(' '));
const mismatched = rows.filter((r) => !(ALLOWED[r.archetype] ?? []).includes(r.kind));
check(`注册页推导落在 archetype 允许集（${rows.length - mismatched.length}/${rows.length}）`, mismatched.length === 0,
  mismatched.map((r) => `${r.k} [${r.archetype}] → ${r.kind} (${r.rule})`).join(' | '));
// 逐条印出：失败时报告要能直接看出是哪条规则裁定的。
for (const r of rows) {
  const mark = (ALLOWED[r.archetype] ?? []).includes(r.kind) ? 'ok  ' : 'BAD ';
  console.log(`     ${mark} ${String(r.kind).padEnd(14)} ${String(r.rule).padEnd(28)} ${String(r.archetype).padEnd(22)} ${r.k}`);
}

// ---- b/c) 合成夹具 ----------------------------------------------------------
// 页面骨架：标题 + 一块主推 + 一组链接条目 + 一段短介绍。结构上哪种原型都不决定性。
const ambiguous = {
  _title: txt('示例页'),
  hero: { _title: txt('主推'), _summary: txt('一句话说明。'), _action: { verb: 'navigate', label: '了解', to: 'https://x.example/a' } },
  entries: { _items: [1, 2, 3].map((n) => ({ _name: txt(`条目 ${n}`), _text: txt('很短的一句。'), _action: { verb: 'navigate', label: '查看', to: `https://x.example/e${n}` } })) },
  note: { _text: txt('一句结尾。') },
};
const ambiguousOut = pageLayoutOf(ambiguous);
check('无语义键 + 结构含混 ⇒ undefined（不编原型）', ambiguousOut.kind === undefined, `得到 ${ambiguousOut.kind} (${ambiguousOut.rule})`);
check('含混页不回落 default', pageLayoutOf({ ...ambiguous, _scope: undefined }).kind !== 'default');

const entry = pageLayoutOf({ ...ambiguous, _scope: 'entry' });
const category = pageLayoutOf({ ...ambiguous, _scope: 'category' });
check('同内容 _scope:entry ⇒ marketing', entry.kind === 'marketing', `得到 ${entry.kind}`);
check('同内容 _scope:category ⇒ catalog', category.kind === 'catalog', `得到 ${category.kind}`);

const loginModel = { _title: txt('Sign in'), login: { _composite: 'login', identifier: { _expose: { name: 'email', type: 'text' } }, secret: { _expose: { name: 'password', type: 'secret' } }, _action: { verb: 'submit', label: '登录' } } };
check('login 复合件（无 _scope）⇒ authentication', pageLayoutOf(loginModel).kind === 'authentication', `得到 ${pageLayoutOf(loginModel).kind}`);

// 媒体墙 + 任务表单是 detail 的两个区域（§3）；同一页声明 offer 但没有任务表单 ⇒ product。
const offerBody = {
  _scope: 'entity', _subject: 'offer', _title: txt('示例商品'),
  gallery: { _items: [1, 2, 3].map((n) => ({ _image: { image: `https://x.example/${n}.png`, alt: `图 ${n}` } })) },
  body: { _summary: txt('主体信息。') },
};
const withTask = pageLayoutOf({ ...offerBody, task: { _composite: 'form', _expose: { name: 'size', type: 'text' }, _summary: txt('选择规格') } });
const withoutTask = pageLayoutOf(offerBody);
check('_subject:offer + 媒体墙 + 任务表单 ⇒ detail', withTask.kind === 'detail', `得到 ${withTask.kind}`);
check('detail 保留媒体/任务区域划分', withTask.galleryKey === 'gallery' && withTask.taskKey === 'task', JSON.stringify({ galleryKey: withTask.galleryKey, taskKey: withTask.taskKey }));
check('_subject:offer 无任务表单 ⇒ product', withoutTask.kind === 'product', `得到 ${withoutTask.kind}`);

// 长文度量：正文在 `_summary`/`_quote` 里（旧度量只看 `_text` 会判成普通页）。
const prose = (key) => ({ _title: txt('长文'), _lines: Array.from({ length: 8 }, (_, i) => ({ [key]: txt(`第 ${i + 1} 段。`.repeat(20)) })) });
for (const key of ['_text', '_quote', '_summary', '_detail']) {
  check(`长文度量读到 ${key} 的 8 段长文（>80 字）`, readingPageOf(prose(key)) === true);
}
check('短文不足 8 段不算长文页', readingPageOf(prose('_quote')) === true && readingPageOf({ _lines: prose('_quote')._lines.slice(0, 7) }) === false);

// ---- d) 仪表盘（M2 · dashboard）：统计墙是页面主体 -------------------------------
// 正样本：`_subject:dataset` + 页内至少两个「名称 + 带单位读数」的集合 ⇒ dashboard。
// 负样本分开证明三点：dataset 的普通表仍是 table；只有名称的集合不是统计墙；
// 只有一个统计集合是「表格带一节」，不是仪表盘（阈值 = 2）。
const stat = (name, num, unit) => ({ _name: txt(name), _measure: { num, unit } });
const walls = (name) => ({ _intent: 'wall', _items: [stat('Cellar', 85, 'm²'), stat('Porch', 251, 'm²')] });
const dashboardPage = {
  _subject: 'dataset', _title: txt('Stats'),
  panels: { _intent: 'p', _items: [
    { _name: txt('Wall A'), stats: walls('a') },
    { _name: txt('Wall B'), stats: walls('b') },
  ] },
};
const dashOut = pageLayoutOf(dashboardPage);
check('_subject:dataset + 两个统计集合 ⇒ dashboard', dashOut.kind === 'dashboard' && dashOut.rule === 'subject:dataset-stat-walls', JSON.stringify(dashOut));

const plainTable = {
  _subject: 'dataset', _title: txt('Rows'),
  rows: { _intent: 'r', _items: [
    { _name: txt('alpha'), _detail: txt('one') },
    { _name: txt('beta'), _detail: txt('two') },
  ] },
};
const plainOut = pageLayoutOf(plainTable);
check('NEGATIVE: dataset 页的普通表仍是 table（不是 dashboard）', plainOut.kind === 'table', JSON.stringify(plainOut));

const namedOnly = {
  _subject: 'dataset', _title: txt('Names'),
  panels: { _intent: 'p', _items: [
    { _name: txt('Wall A'), names: { _intent: 'n', _items: [{ _name: txt('alpha') }, { _name: txt('beta') }] } },
    { _name: txt('Wall B'), names: { _intent: 'n', _items: [{ _name: txt('gamma') }, { _name: txt('delta') }] } },
  ] },
};
const namedOut = pageLayoutOf(namedOnly);
check('NEGATIVE: 只有名称的集合不是统计墙 ⇒ 不是 dashboard', namedOut.kind !== 'dashboard', JSON.stringify(namedOut));

const oneWall = {
  _subject: 'dataset', _title: txt('One wall'),
  panels: { _intent: 'p', _items: [{ _name: txt('Wall A'), stats: walls('a') }] },
};
const oneOut = pageLayoutOf(oneWall);
check('NEGATIVE: 只有一个统计集合（阈值 2）⇒ 不是 dashboard', oneOut.kind !== 'dashboard', JSON.stringify(oneOut));

console.log(failed
  ? `\n构图推导自测: 失败 ${failed} 项`
  : `\n构图推导自测: 全部通过（${rows.length}/${rows.length} 注册页落在 archetype 允许集 + ${controls} 项对照检查）`);
process.exit(failed ? 1 : 0);
