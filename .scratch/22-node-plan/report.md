# 轮 22 · 节点渲染契约上移进 `axis.mjs`

> 状态：**进行中**（40 分钟硬限；每片先落盘）
> 目标：把轮 21 暴露的 11 个「三目标各自重新推导」的节点级决策收进一个纯函数 `nodePlan`，
> 三渲染器只消费 plan；门禁从「名字型」升级为「结构性 token」+「三目标决策一致」；并修掉
> `_expose` 集合在 HTML（选择表）与文本/MD（选项列表）之间的**轴决策分歧**。

---

## 0. 基线（未改动前）

- 42 页基线产物已冻结到 `.scratch/22-node-plan/baseline/{html,text,md}/`（对照用）。
- 已确认的真实分歧：`m1/curated/apple-com/iphone-16.json` 的 `steps._lines[1..5]`（6 个 `_expose` 集合，
  `_items` 无 `_fields`，但选项带 `_detail`/`_summary`/`_price` 等旁注）：
  - HTML（`expose-trade-in`/`expose-payment-method`/`expose-carrier`/`expose-care-plan`）= **选择表**
    `<table class="data">`；
  - 文本 / Markdown = **选项列表** `( ) Select a smartphone Answer a few questions…`。
  - 即「同一模型、不同轴决策」——HTML 用 `_items.some(_fields) || some(非 name 事实)` 自成一套
    「选择集形态」，文本/MD 只认「选项列表」。

---

（以下各片随实施追加）

## 1. Plan 接口（`m1/axis.mjs` 新增导出）

| 导出 | 决策 | 返回 |
|---|---|---|
| `nodePlan(node, ctx)` | **总入口**：一个纯函数返回该节点渲染所需的一切决策 | `{ok,visible,scope,headingKey,headingValue,headingText,demoted,primary,facts,action,hasAction,titleIsControl,choice,toolbar,items,namedChildren,emptyState,titleConsumed}`；不可见/非对象 ⇒ `{ok:false,visible:false}` |
| `headingKeyOf(node)` | #2 标题键（`_title`→`_name`→null） | `'_title'\|'_name'\|null` |
| `isDemoted(node)` | #8 降级（`_rel.level >= 2`） | bool |
| `nodeVisible` 语义 | #1 节点级 `_when`（在 `nodePlan` 内） | `plan.visible` |
| `actionPlan(node,chain,values)` | 控件可见性 + 作用域 | `{label,verb,hasTarget,href}\|null` |
| `itemActionPlan(it,chain,values)` | 同上 + 是否源站控件（label≠条目名） | `{...actionPlan,isControl}` |
| `runPlan(items)` | #3 F-051 表/卡阈值 + 列与取值 | `{named,attrs,cols,isTable,cellValue}` |
| `choicePlan(node,exp)` | #4 选择集形态 | `{kind:'plain-fact'\|'choice'\|'bool'\|'input',options,rich,multi,legend,hint,...}` |
| `compareCellOf(it,key)` | #5 对比单元格取法（value/text/node/empty） | `{kind,value}\|{kind,node}` |
| `compareRowLabel(items,key)` | #6 对比行标题 | `string\|null` |
| `nodePlan.toolbar` | #7 工具条分组（非数组、action-only、可见、≥2） | `node[]` |
| `nodePlan.titleIsControl` | #9 标题即控件 | bool |
| `nodePlan.emptyState` | #10 `_empty` 空态 | `node\|null` |
| `nodePlan.titleConsumed` | #11 布尔开关吞标题 | bool |
| `nodePlan.facts` | 可见事实/隐藏槽位（`list` 有序含 `meta/unit/was/body` 分类 + `hero` + `fields`） | — |
| `namedChildEntries`/`arrayChildEntries`/`nestedCollections` | 兄弟区块 vs 数组集 vs 实体嵌套集合 | — |

（#1–#11 编号沿用轮 21 报告 §3 表。）

## 2. 三渲染器剩下的「纯表现」职责

- `render.mjs`：HTML 元素与 class/CSS（`<table class="data">`、`<fieldset class="expose">`、`<div class="toolbar">`、`hero`、`aside.zone`、`promo`）、`esc`/实体解码、货币字形（共享常量）、控件形状（`<a class="ctl">` / `<span class="action-plain">`）、`raw key:`→`#锚点`。
- `render-text.mjs`：等宽文本表（`textTable` 宽度对齐）、`[标签]`、`[图片] alt`、`( )`/`[ ]`、`参考:` 前缀、缩进、`ROLE_LABEL` 中文字典。
- `render-md.mjs`：GFM 表格与管道转义、`![alt](src)`、`[标签](href)`、`- ( )`/`- [ ]`、`> ` 引用块、`~~` 删除线、`#` 标题层级。

三者**都不再**出现任何模型语义 token（见 §4）。

## 3. 门禁升级（`m1/eval/axis-selftest.mjs`，37→48 条）

- **A1c**：三渲染器必须调用 `nodePlan(`。
- **A2b（结构性，替代「名字型」）**：把源码去注释后，禁止出现模型语义 token
  `_rel _when _expose _fields _primary _empty _items _lines _action`（改名也躲不过：要读模型就得碰这些键）。
  例外见 §4。
- **E1**：42 个策展模型上，三目标的对比降级清单逐元素相同（42/42）。
- 保留并扩展 **A1/A1b**（三目标都 import `axis`、无私有副本名、互不 import）。
- **D1–D4**：`_expose` 选择集——同一构造模型，共享 plan 报出**同一个** `choice.kind='choice'`（`rich`/`multi` 一致），
  三目标各自画出（HTML 选择表 / 文本 `( )` / MD `- ( )`）。
- 既有 B/C 保留（对比集降级理由、形态名、可比闸门、共享函数自洽）。

### 证伪（要求的一次）
临时在 `render-md.mjs` 写 `const _falsify = (model && model._when) || null;`：
```
FAIL render-md.mjs holds no model-semantic token (...) — found: _when
轴一致性自测(三目标): 待修 1 (48 条断言)
```
撤销后恢复 `全部通过 (48 条断言)`。

**token 计数（去注释）**：三渲染器 `_rel/_when/_expose/_fields/_primary/_empty/_items/_lines/_action` 出现次数
`66+36+38=140`（HEAD）→ **0**。

## 4. 例外清单（允许保留在渲染器里的模型键读取）

门禁只禁 9 个**决策键**；渲染器仍可读取以下键，逐条理由：

| 键 | 用途 | 为什么是纯表现 |
|---|---|---|
| `_name` / `_title` | 条目/标题文案 | `labelOf`/`headingValue` 已给出；渲染器取文案排版 |
| `_label` / `_summary` | 暴露控件的图例/提示文案 | plan 已给 `legend`/`hint` 原文，仅取字 |
| `_text`/`_detail`/`_tag`/`_price`/`_subtitle`/`_summary` | 折叠答案、对比表头实体属性 | 取值排版；判定（谁是行/列）在 plan |
| `_image` | 图片值渲染（hero/strip/正文） | 是否 hero 由 `plan.facts.hero` 决定 |
| `_brand` / `_intent` | 页头品牌、根标题兜底 | 站点壳层文案 |
| `_key` | HTML 锚点 id / 选项 value | 只是稳定标识符，非语义分类 |

## 5. 逐页行为差异（对照 HEAD 基线）

| 目标 | 变化页 | 说明 |
|---|---|---|
| HTML | **0/42** | 字节级相同（`render.mjs` 的 `_expose`/toolbar 决策本就是 plan 的语义） |
| 文本 | **2/42** | `sspai-com/post-114716`、`sspai-com/u-jtc092al` |
| Markdown | **1/42** | `sspai-com/post-114716` |
| 合计 | **2 页**（均有理由） | — |

**共同根因**：这些节点的数组子项 `_lines[i]` 是 action-only 控件。旧 `render-text.mjs`/`render-md.mjs`
在算工具条时**先于**数组集合分组，把 `_lines` 的两个控件抽成「工具条」（`[动态] [收藏]` 一行），
把剩下的第三个成员单独成组；旧 `render.mjs` 的工具条**排除数组子项**，因此 HTML 一直按集合形态渲染。
plan 统一为「工具条 = 非数组、action-only、可见且 ≥2 的子节点」，于是文本/MD 与 HTML 对齐：

- `sspai-com/u-jtc092al`：文本 `[动态] [收藏]`（旧工具栏）→ `[动态]  [收藏]`（现 `controls` 集合，与 HTML 控件组一致）。
- `sspai-com/post-114716`：文本/MD 把 `[本周看什么] [生活方式]` 拆到顶部工具条、`本文责编` 单独成块；
  现与 HTML 一样，三项作为一个集合（`cards`）整体渲染。**不丢事实**（三目标保真仍 1.00）。

这两页属于任务允许的「工具条分组决策」分歧修正，单列如上。`_expose` 分歧（HTML 选择表 / 文本·MD 选项列表）
在决策层已合一（§3 D1），画法差异保留 ⇒ 该页**无视觉变化**。

## 6. 证伪与收尾（见下节）

### `_expose` 分歧的修改前后（决策层）

改前（三个目标各有一套形态判定）：
```js
// render.mjs（HTML）：rich 选项另走选择表，是它自己的“形态”
} else if (exp && node._items.some((it) => it._fields && Object.keys(it._fields).length)) {
  body += renderSelectTable(node._items, { ...exp, legend }, ...);
} else if (exp && node._items.some((it) => factsOf(it).some((f) => !['_name','_title'].includes(f.key)))) {
  body += renderSelectTable(node._items, { ...exp, legend }, ...);
} else if (exp && node._items) { /* chipbar */ }
// render-text.mjs（文本）/ render-md.mjs：只有一种形态
} else if (node._items?.length) { /* 选项列表 */ }
```
改后（一个决策，各自画法）：
```js
// axis.mjs
export function choicePlan(node, exp) { ... return { kind:'choice', rich, options, multi, legend, ... }; }
// render.mjs：ch.rich ? renderSelectTable(ch) : chipbar
// render-text.mjs / render-md.mjs：ch.options.map(...) 画成 `( )` / `- ( )` 列表
```
⇒ 决策 `choice.kind` 三目标一致（门禁 D1），HTML 选择表与文本/MD 选项列表是**同一决策的两种画法**。
`apple-com/iphone-16` 等 `_expose` 页（3 目标合计 0 处形态分歧）**视觉无变化**（HTML 字节级不变）。

### Markdown 变化页证据（`sspai-com/post-114716.md`）
```diff
-[本周看什么](https://sspai.com/tag/本周看什么) [生活方式](https://sspai.com/tag/生活方式)
+[本周看什么](https://sspai.com/tag/本周看什么)
+
+[生活方式](https://sspai.com/tag/生活方式)
```
（`[标签]` 与后续 `本文责编：@Lotta [@Lotta]` 都与 HTML 的同一集合决策对齐；不丢事实。）

## 6. 收尾门禁

`node m1/eval/pipeline.mjs --shots`（退出码 0）：
```
[pipeline] 渲染 42/42 | 错误 0
[pipeline] 保真 1.00: 42/42
[pipeline] Markdown 目标: 渲染 42/42 | 保真 1.00: 42/42
[pipeline] 模型校验: 48 个全通过
[pipeline] 校验器自测: 通过
[pipeline] 地基自测(D1/D2/D3): 通过
[pipeline] 显式降级清单（compare 标记但成不了对比表）: · stripe-com/pricing · n=2 · degenerate-no-shared-attribute
[pipeline] 度量自测(F-052): 通过
[pipeline] 文本目标自测(F-031): 通过
[pipeline] 轴一致性自测(F-031 三目标): 通过
[pipeline] Markdown 目标自测(F-031): 通过
视觉自查: 42/42 干净
```

- `axis-selftest.mjs` = **48/48**（原 37；A2b +3、A1c +3、D +4、E1 +1）；`text-selftest`/`md-selftest`/`metrics-selftest`/`foundation-selftest`/`validate-selftest` 全过。
- 未看图（HTML 字节级不变；视觉自查门禁已跑）。**未 git 提交**；`git diff --cached --name-only` 为空（无暂存）。
- 只改 `m1/**`、`.scratch/**`；**未改模型 / `corpus/`**；未新增语法/保留键。

### 残留（下一轮登记）
- 对比表实体表头的**属性集合**（`_name/_tag/_price/_subtitle/_summary`）仍在三目标各写一遍（顺序各目标不同）；
  它受保真门禁保护（漏掉即保真 <1），但尚无「三目标同集合」的显式断言。
- `ROLE_LABEL` 中文字典在每个目标各一份（纯文案）；`renderForm` 的 8 个形态写法是各自的画法。

---

NODE_PLAN_DONE lifted=11 renderer_semantic_tokens_before=140 after=0 behavior_changed_pages=2 three_target_agreement=42/42 isomorphism=partial
