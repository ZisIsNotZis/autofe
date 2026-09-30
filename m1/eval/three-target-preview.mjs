// Three-target preview (round 23): render a few representative pages through ALL THREE
// targets and write docs/three-targets.md — a regenerable, artifact-sourced demonstration
// of the round-19/20/21/22/23 claim: ONE set of business meta-primitives (the M1 model)
// becomes MULTIPLE front-end shapes; the DECISION layer is shared (m1/axis.mjs) and only
// the DRAWING differs per target.
//
// EVERYTHING in the output document comes from the real renderers: the excerpts are byte
// slices of the actual HTML/plain-text/Markdown products (never hand-written summaries),
// and the "shared decisions" line is computed with the same axis.mjs the renderers use.
//
// Usage: node m1/eval/three-target-preview.mjs            (writes docs/three-targets.md)
//        node m1/eval/three-target-preview.mjs --stdout   (prints instead of writing)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '../render.mjs';
import { renderText } from '../render-text.mjs';
import { renderMarkdown } from '../render-md.mjs';
import { nodePlan } from '../axis.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const writeStdout = process.argv.includes('--stdout');

// One representative page per shape. `marker` is a string that occurs in all three products
// on that page; the excerpt is a byte window around its first occurrence (script-sliced).
const PAGES = [
  {
    k: 'gov-uk/ni-rates-letters', shape: '表格页（data table）',
    marker: 'Employee National Insurance rates',
    note: '同一批记录在三种目标里都是「有身份列/≥2 属性列」的表——表/卡阈值由共享 runPlan 决定。',
  },
  {
    k: 'apple-com-cn/iphone-17', shape: '对比页（compare table）',
    marker: '当前浏览',
    note: '实体表头属性集由共享 compareHeaderEntries 决定；HTML 画成列头块，文本/MD 画成一行。',
  },
  {
    k: 'github-com/login', shape: '表单 / 登录页（form）',
    marker: 'Username or email address',
    note: '输入/选择形态由共享 nodePlan.choice 决定；HTML 是 fieldset/input，文本是下划线位，MD 是 [text]。',
  },
  {
    k: 'sspai-com/post-114716', shape: '内容页（prose + 列表 + 集合）',
    marker: '本周看什么',
    note: '正文段合并 / 有序集合 / 链接清单等形态都由共享 selectForm/seqGroupsOf 决定。',
  },
];

const bodyStart = (html) => {
  const i = html.indexOf('<main>');
  return i >= 0 ? html.slice(i) : html;
};
// A byte window around the marker; `…` marks a truncated edge. Never invented text.
const excerpt = (text, marker, after = 620) => {
  const i = text.indexOf(marker);
  if (i < 0) return `（未在产物中找到标记「${marker}」）`;
  return (i > 0 ? '…' : '') + text.slice(i, i + after);
};
// HTML is one long line; fold at tag boundaries so the excerpt is readable. This is a
// display-only reflow (whitespace between tags) — the content is the real product bytes.
const reflow = (html) => html.replace(/></g, '>\n<');

// The DECISION-layer view of a page: which item-set forms the shared axis chose, computed
// by the same `nodePlan` every target consumes. Identical for all three drawings.
function decisionsOf(model) {
  const forms = new Map();
  const choices = new Map();
  const verdicts = [];
  const bump = (m, f) => m.set(f, (m.get(f) || 0) + 1);
  (function visit(node, chain, depth) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    const plan = nodePlan(node, { chain, values: {}, depth });
    if (!plan.visible) return;
    if (plan.choice) bump(choices, `${plan.choice.kind}`);
    for (const g of plan.items.groups) {
      bump(forms, g.form);
      if (g.form === 'compare-table') verdicts.push(`compare-table ${g.items.length} 实体`);
      for (const it of g.items) visit(it, [...chain, node], depth + 1);
    }
    for (const c of plan.namedChildren) visit(c.node, [...chain, node], depth + 1);
    if (plan.emptyState) visit(plan.emptyState, [...chain, node], depth + 1);
    if (plan.choice && plan.choice.item) visit(plan.choice.item, [...chain, node], depth + 1);
  })(model, [], 0);
  const list = [
    ...[...forms.entries()].sort((a, b) => b[1] - a[1]).map(([f, n]) => `${f}×${n}`),
    ...[...choices.entries()].sort((a, b) => b[1] - a[1]).map(([f, n]) => `choice:${f}×${n}`),
  ];
  return { list, verdicts };
}

const oneLine = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

const lines = [];
const push = (s = '') => lines.push(s);

let summary = [];
for (const p of PAGES) {
  const mp = `m1/curated/${p.k}.json`;
  if (!fs.existsSync(mp)) { summary.push(`${p.k}: MISSING`); continue; }
  const model = JSON.parse(fs.readFileSync(mp, 'utf8'));
  const html = render(model);
  const text = renderText(model);
  const md = renderMarkdown(model);
  const dec = decisionsOf(model);
  summary.push({ k: p.k, shape: p.shape, forms: dec.list.join(' '), verdicts: dec.verdicts.join(' '), html: html.length, text: text.length, md: md.length });
}

push('# 三目标演示：同一份业务元语，多个前端形态');
push();
push('> 本文件由 `node m1/eval/three-target-preview.mjs` 生成，**内容全部取自真实渲染产物**');
push('> （片段为脚本从 HTML / 纯文本 / Markdown 产物中截取的字节窗口，非手写摘要）。');
push();
push('## 目标与现状');
push();
push('- **一句话目标**：同一份 **业务元语**（M1 模型）→ **多个前端形态**（HTML / 纯文本 / Markdown）。');
push('- **决策层共享**：形态选择、可比性闸门、对比表头属性集、控件可见性、节点渲染计划等**唯一实现**在');
push('  `m1/axis.mjs`；三个渲染器（`m1/render.mjs`、`m1/render-text.mjs`、`m1/render-md.mjs`）');
push('  只 `import` 它、**互不 import**，各自把同一决策画成自己的记号。');
push('- **画法各异**：HTML 画元素（`<table>`/`<div>`/`<fieldset>`…），纯文本画对齐文本与 `[标签]`/`( )`，');
push('  Markdown 画 GFM 语法（`| 表格 |`、`- ( ) 选项`、`> 引用`）。');
push('- **isomorphism 现状：`partial`**。**决策层已无重复实现**：本轮把上一轮遗留的「对比表实体表头属性集」');
push('  上移为共享决策 `compareHeaderEntries`，并加了**三目标同集合**的显式门禁断言（`m1/eval/axis-selftest.mjs` 的 E2/F2）。');
push('  **剩余残余**（已登记；下表四页均未触发）：');
push('  1. `ROLE_LABEL` 标签词汇仍是目标本地（文本/MD）。当一次 `table` 形态的列含内部角色事实');
push('     （`_count`/`_price`…）时，HTML 该列**无表头文字**，而文本/MD 打 `数量`/`价格`；身份列 `名称` 同理只在文本/MD。');
push('     合法模型可达（已声明 `_fields` + 一个角色事实），但 42 个策展页扫描 **0/42** 触发 ⇒ 当前无产物差异，只是保证尚非结构性。');
push('  2. 8 个形态各自的绘制写法（「画法各异」本身）。');
push('  ⇒ 决策层无重复，但上述目标本地标签词汇使三目标尚未达到**产物级**同构，故记 `partial`。');
push();
push('生成命令（可重复执行，产物确定性）：');
push();
push('```bash');
push('node m1/eval/three-target-preview.mjs   # → docs/three-targets.md');
push('```');
push();
push('## 决策层一览（本页模型经 `m1/axis.mjs` 选出的形态；三目标共用）');
push();
for (const s of summary) {
  if (typeof s === 'string') { push(`- ${s}`); continue; }
  push(`- \`${s.k}\` — ${s.shape}：${s.forms}${s.verdicts ? `（${s.verdicts}）` : ''}`);
}
push();

PAGES.forEach((p, i) => {
  const mp = `m1/curated/${p.k}.json`;
  if (!fs.existsSync(mp)) return;
  const model = JSON.parse(fs.readFileSync(mp, 'utf8'));
  const html = render(model);
  const text = renderText(model);
  const md = renderMarkdown(model);
  const dec = decisionsOf(model);
  push(`## ${i + 1}. \`${p.k}\` — ${p.shape}`);
  push();
  push(`- **模型意图**：${oneLine(model._intent) || '（模型未声明 _intent）'}`);
  push(`- **共享决策**（` + '`axis.mjs`）：' + dec.list.join('、') + (dec.verdicts.length ? `；${dec.verdicts.join('；')}` : ''));
  push(`- **说明**：${p.note}`);
  push();
  push('### HTML 目标 · `m1/render.mjs`');
  push();
  push('```html');
  push(reflow(excerpt(bodyStart(html), p.marker)));
  push('```');
  push();
  push('### 纯文本目标 · `m1/render-text.mjs`');
  push();
  push('```text');
  push(excerpt(text, p.marker));
  push('```');
  push();
  push('### Markdown 目标 · `m1/render-md.mjs`');
  push();
  push('```markdown');
  push(excerpt(md, p.marker));
  push('```');
  push();
});

push('## 同一决策层，不同画法');
push();
push('三份产物的**形态选择完全相同**（上表由同一个 `m1/axis.mjs` 算出），差别只在绘制：');
push('HTML 用元素与 class，纯文本用空格对齐与 `[标签]`，Markdown 用 GFM 语法。');
push('因此「业务元语 → 前端形态」的映射是**一对多**的，但映射的**决策**是**一份**的——');
push('任一目标都无法自行改变形态、表头集合或可比性判定，只能改变画法。');
push();

const out = lines.join('\n');
if (writeStdout) { process.stdout.write(out); }
else {
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'three-targets.md'), out);
  console.log(`[three-target-preview] wrote docs/three-targets.md (${out.length} bytes, ${PAGES.length} pages)`);
  for (const s of summary) console.log('  ·', typeof s === 'string' ? s : `${s.k} — ${s.forms}`);
}
