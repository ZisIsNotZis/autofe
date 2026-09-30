# 轮 21 · 第三目标（Markdown）：架构兑现的证明

> 状态：**已完成**。最后一行 `MD_TARGET_DONE ...` 即完成标记。
> 本轮的性质是**验收架构**，不是加功能：用一个**新增目标**去检验轮 19/20 抽出的共享轴决策层
> （`m1/axis.mjs`）是否真的让「新目标 = 只写表现层」成立。
> 约束：只新增 `m1/render-md.mjs`；改 `m1/eval/*selftest*.mjs` 与 `m1/eval/pipeline.mjs`；
> 写本报告。**不改模型 / `corpus/` / `render.mjs` / `render-text.mjs` 的语义**；不新增语法/保留键；
> 看图 0 张；未 git 提交。

---

## 1. 交付物

| 交付物 | 位置 | 说明 |
|---|---|---|
| Markdown 目标 | `m1/render-md.mjs` | `node m1/render-md.mjs <model.json> <out.md>`。**只** import `./model-lib.mjs` + `./axis.mjs`（19 个共享符号），**不** import 任何渲染器 |
| 42 页产物 | `.tmp/md-renders/<dash>.md` | 42/42 渲染成功（0 错误） |
| 第 7 道门禁 | `m1/eval/md-selftest.mjs`（新增） | Markdown 目标自测：20 条断言 |
| 门禁 6 扩展 | `m1/eval/axis-selftest.mjs`（改） | 两目标 → **三目标**一致性 + 反重新推导 + 证伪，37 条断言 |
| 流水线 | `m1/eval/pipeline.mjs`（改） | 第 1 步同时渲染/度量 Markdown；第 7 道门禁接入 |

### Markdown 映射（轴语义 → Markdown）

| 轴语义（F-030/F-031） | HTML 目标 | 文本目标 | **Markdown 目标** |
|---|---|---|---|
| 可比集合（同一行） | `<table class="data">` | 横向对齐文本表 | **GFM 表格**（成员=行） |
| 堆叠 / 不可比 | `<section class="block">` | 缩进分节 | **`##`/`###` 分节** |
| 对比集 `_rel.compare` | 列=实体的 `<table class="cmp-table">` | 列=实体的文本表 | **列=实体的 GFM 表格** |
| 图片 | `<img>` / `<span class="img-alt">` | `[图片] alt` | **`![alt](src)`；无 src ⇒ 只留 alt 文本** |
| 控件 `_action.label` | `<span class="ctl">` / `<a class="ctl">` | `[标签]` | **`[标签](href)`；无目标 ⇒ `[标签]`** |
| `_expose` | `<fieldset>`/`<label><input>` | `( ) 选项` / `[ ] 选项` | **`- ( ) 选项` / `- [ ] 选项`（选项列表）** |
| `_rel.level >= 2` | `<aside class="zone">` | `参考:` 前缀 | **引用块 `> …`** |
| `_amount` + `list` 限定词 | `<div class="fact was">` + CSS `line-through` | `(原价) ` 前缀 | **`~~¥2999~~`（GFM 删除线）** |
| 货币 / 角色单位 | `CURRENCY_GLYPH` / `ROLE_UNIT`（共享） | 同左（共享） | **同左（共享，本轮实测同一常量）** |

---

## 2. 新目标的成本

- **总行数**：`m1/render-md.mjs` = **400 行**（含约 30 行文件头/分节注释）；非空非注释 = **328 行**。
  对比：`render-text.mjs` 420 行、`render.mjs` 734 行。
- **表现层以外还必须写的知识**：**11 处**（见 §3）。**理想为 0，实测 >0 ⇒ 架构成立但不完整。**
- 但注意：**F-030/F-031 的「硬」决策本轮真的一行都不用抄** —— `selectForm` / `comparable` /
  `compareSetVerdict` / `compareRowKeys` / `seqGroupsOf` / `primarySlot` / `actionVisible` /
  `itemScope` / 8 个共享常量，全部 `import`。三目标对同一节点的形态判定与对比集判定**零分歧**（§5）。

---

## 3. 非表现层知识逐条判定（本轮的核心发现）

判断基准：**「所有目标都必须给出相同结果」= 决策（应上移 `axis.mjs`）；「只是一个目标的字符/元素/版式」= 表现层。**

| # | 重新推导的东西 | `render-md.mjs` 位置 | 三目标必须一致？ | 应否上移进 `axis.mjs` |
|---|---|---|---|---|
| 1 | **节点 `_when` 可见性**（`parseExpr`+`evalExpr`+节点作用域） | `renderNode` 开头 | 是（F-042；`axis.mjs` 只覆盖 `_action.when`） | **应上移** → `nodeVisible(node, chain, ctx)`；`render.mjs`/`render-text.mjs`/`metrics.mjs` 各有一份 |
| 2 | **标题键选择**（`_title` → `_name` → null） | `renderNode`、`factsLines`（2 处） | 是 | **应上移** → `headingKeyOf(node)` |
| 3 | **F-051 表/卡片阈值**（`attrs.length>=2 && (named \|\| 有列标签)`） | `renderTable` | 是（这才是「这个集合到底是不是表」的判定） | **应上移**（本轮最强发现）→ `runForm(items)` |
| 4 | **选择集形态**（1 个选项 ⇒ 普通事实，不成控件；有 `_fields` 的选项 ⇒ HTML 走选择表，文本/MD 走选项列表） | `_expose` 分支 | 是 | **应上移** → `choiceSetForm(node)`（当前三目标**形态名不一致**，见 §5 注） |
| 5 | **对比表格取值 + `only`/`rich` 判据** | `renderCompareTable.cellOf` | 是 | **应上移**（轮 20 报告已登记为下一批债） |
| 6 | **对比表行标题解析**（子节点标题 → 声明字段标签） | `renderCompareTable.childLabel` | 是 | **应上移**（同族） |
| 7 | **连续 action-only 子节点 ⇒ 一条控件带**（`actionKids.length >= 2`） | `renderNode` | 是（分组决策） | **应上移** → 并入 `seqGroupsOf` 家族 |
| 8 | **`_rel.level >= 2` 降级阈值** | `renderNode.demoted` | 是 | **应上移** → `isDemoted(node)` |
| 9 | **「标题即控件」**（`_action.label === 标题文本` ⇒ 标题降为控件，不再当分节标题） | `renderNode` | 是（F-031-§4） | **应上移** |
| 10 | **空集合 `_empty` 空态渲染条件** | `renderNode` | 是（F-013） | **应上移**（小） |
| 11 | **`_expose.bool` 吞掉标题键** | `renderNode` | 是 | **应上移**（小） |

**判定为纯表现层、不该上移**：`ROLE_LABEL` 中文字典、`mdTable`（表头/分隔线/管道转义）、`escTilde`、
`![alt](src)` / `[标签](href)` / `~~…~~` / `- ( )` / `> ` 这些记号、标题层级映射、块间距 `\n\n`、
chips 的 ` · ` 连接——另一个目标没有对应概念（HTML 有 class 与 CSS，文本有对齐与缩进）。
共享常量 `CURRENCY_GLYPH`/`ROLE_UNIT`/`META_KEYS`/`LIST_QUALIFIER`/`hasOwnUnit`/`hasTarget`/`hrefOf`
按轮 19/20 的判据仍属决策层，已 import，**未重复定义**（`md-selftest.mjs` 有一条断言直接对比共享常量值）。

**结论**：架构把「轴决策」中**最难、最容易漂移的那一半**（形态/可比/对比集判定、分组、主指槽、控件可见性）
真正单一化了；剩下的是「节点渲染骨架」里的一批**同族决策**，它们仍在每个目标各写一遍。
第三个目标一落地就把这批债**全部暴露**——这正是本轮想要的证据。

---

## 4. 门禁扩展与证伪

### 4.1 门禁 6（`m1/eval/axis-selftest.mjs`）→ 三目标

- **A. 静态单一实现**：目标列表 `['render.mjs','render-text.mjs','render-md.mjs']` 全体
  ① 必须 `from './axis.mjs'`；② 不得有 23 个共享名的本地定义；③ 新增 **A1b**：`render-text.mjs`/`render-md.mjs`
  不得 `import` 另一个渲染器（第三目标必须是第三个「表现」，不是包装器）。
- **A2. 结构反重新推导**：三目标源码都不得出现 `_rel.compare`、`typeof *._primary`、`resolveWithParent(`、`._action.when`。
- **A3. 度量口径**：`metrics.mjs` 必须 import 共享 `pageText`、不得有私有副本。
- **B. 动态（构造模型）**：对比集降级清单在**三个**目标间逐元素相同，覆盖全部 6 种理由 + 真表。
- **C. 动态（形态名）**：`selectForm` 判出的形态名必须与预期一致，**且三个目标都渲染出该形态**
  （table/prose/seq/image-strip/stack），并各自给出目标特有的输出签名（HTML `<table class="data"`、
  文本 `Basic $9.99`、Markdown `| Basic | $9.99 | 1 |`）。

**结果**：`轴一致性自测(三目标): 全部通过 (37 条断言)`（原 29 条 → 37 条）。

### 4.2 第 7 道门禁（`m1/eval/md-selftest.mjs`，20 条断言）

构造模型，独立于语料，可单独失败：静态（只 import `model-lib`+`axis`）、GFM 表格语法、货币常量取自
`CURRENCY_GLYPH`、角色单位取自 `ROLE_UNIT`、`_fields` 保真=1、堆叠分节、`![alt](src)`、无 src 只留 alt、
控件 `[标签](href)` / `[标签]`、`- ( )` / `- [ ]`、`_when` 作用域、对比集列=实体、`level≥2` 引用块、
`~~` 删除线且限定词不外泄、**输出里没有 HTML 元素**、整体保真 1.00。

**结果**：`Markdown 目标自测: 全部通过`。

### 4.3 证伪（门禁必须能失败，F-040）

| 实验 | 动作 | 结果 |
|---|---|---|
| 反重新推导（具名副本） | 临时向 `render-md.mjs` 追加 `const comparable = (items) => items.length >= 2;` | `FAIL render-md.mjs keeps no private copy of the axis layer — re-derived: comparable`，退出码 1 ✅ |
| 反重新推导（内联手写） | 临时追加 `const probeCmp = (n) => Boolean(n._rel?.compare);` | `FAIL render-md.mjs does not re-derive the compare grouping (_rel.compare)`，退出码 1 ✅ |
| （附注）同名副本 | 追加 `const selectForm = …`（与 import 同名） | ESM 直接 `SyntaxError: Identifier 'selectForm' has already been declared`，模块无法加载 ⇒ 门禁退出码 1 ✅（但这是语言层挡住，不是断言命中） |

两次实验后均从备份还原（`diff -q` 为空），门禁恢复全绿。

**诚实边界**：A1 是**按名字**检测共享决策的私有副本。把同一判定换个名字手写（如本文件实际存在的
`isTable` 阈值）**不会**被 A1 命中——§3 的 #3 就是这个洞的实例，它必须靠人（或未来某轮）上移，
门禁目前抓不住。本轮如实登记，不假装修好。

---

## 5. 三目标一致性 + 42 页保真

- **对比集判定**：42 个策展模型上，三目标的降级清单（`key|entities|reason`）**0 分歧**
  （HTML 侧用 `renderWithAudit`、文本/MD 侧用 `report` 参数）；构造模型上 6 种理由逐条一致（门禁 B）。
- **形态判定**：5 种形态（table/prose/seq/image-strip/stack）三目标一致（门禁 C）。
- **保真**：`node m1/eval/metrics.mjs m1/curated/<k>.json .tmp/md-renders/<dash>.md`
  → **每页 1.00，42/42；总保真 1.00（42/42）**。`metrics.mjs` 一行未改 —— 同一把尺子量三个目标。
  无一条缺失需要归属（不涉及「MD 没渲染 ⇒ 修」或「度量耦合 ⇒ 报告」）。
- **注（形态名以外的差异，如实登记）**：`_expose` 带 `_fields` 的选项集，HTML 目标渲染成**选择表**，
  文本/MD 渲染成**选项列表**。两者都不丢事实（保真 1.00），但**不是同一形态** —— 这是 §3 #4 的表现，
  也是「三目标同构」主张目前的真实边界：**判定层同构，节点渲染骨架未完全同构**。

---

## 6. Markdown 暴露的表现层差异（vs HTML / 文本）

1. **链接必须带 URL，否则没有「控件」可言**。HTML 的 target-less 控件是 `<span class="ctl">标签</span>`（有按钮外观），
   文本目标用 `[标签]`，Markdown 也只能是 `[标签]`——一对方括号，读者无法与正文区分；只有有目标时才能写
   `[标签](href)`（`key:` 目标降为 `#锚点`）。
2. **对齐/列宽/粘性表头全部无意义**。文本目标精心做宽字符宽度与列对齐；Markdown 管道表一律左对齐、不换行。
   对比集的实体列表头只能塞进**一个单元格**（`aliyun-com-product-ecs` 的表头单元格长达数百字符）。
3. **`_was`（`_amount` + `list` 限定词）在 Markdown 没有原生表达**。HTML 有 CSS `line-through`，文本目标有
   `(原价) ` 前缀；Markdown 只能借 **GFM 的 `~~…~~`**（CommonMark 无删除线）。若渲染器不支持 GFM，
   删除线**静默消失**、只剩一个价格 —— 「原价」语义丢失。这也带来**分隔符冲突**：模型正文里若本身含 `~~`
   （`bilibili-com-read-home` 实测），会与目标自己的删除线配对、划掉一大段无关文案。已在 `fmt()`/`controlOf()`
   对 `~` 转义（`escTilde`）。其余元字符（`*`、`[`、`_`）仍是**残留风险**（未做通用转义）。
4. **不存在输入控件**。HTML 有 `<input type=text/date/num>`；Markdown 只能写
   `Username or email address: ________ \`[text]\`` —— 下划线 + 内联代码标出类型，纯占位。
5. **HTML 实体不解码**。HTML 目标 `decodeEntities` 把 `&nbsp;` 变空格；Markdown 目标逐字输出
   `保存↓↓↓&nbsp;`（实测 `bilibili-com-read-home`）。保真不受影响（`metrics` 两侧都解码），
   但**人读到的可见文本不同**。
6. **`level≥2` 的「旁置」变成引用块**。HTML 是 `<aside>`（视觉降级但仍是文档的一部分），Markdown 的 `>` 在语义上
   是「引用别人的话」——降级方向不同，且没有嵌套 `> >`（本轮 42 页实测 0 处）。
7. **标题即文档结构**。Markdown 的 `#` 进目录/大纲，服务端/编辑器会据此建索引；HTML 的 class 不会。
   同一个「h3」在 Markdown 里比在 HTML 里**更重**。
8. **图片必须有 alt 才有意义**。HTML 无 alt 仍能显示图；Markdown 的 `![alt](src)` 里 alt 是唯一可读文本，
   空 alt 就是 `![](...)`（见 §7 #2）。

---

## 7. 42 页里最不像人读的 5 处

| 处 | 现象 | 归属 |
|---|---|---|
| **`mi-com-home.md`** | 10 行 `![](../assets/mi-home-band1.png)`：`_image` 有 src 但**没有抓取到 alt** | **模型语义缺失**（`_image` 无 `alt`）；Markdown 把它放大成 `![](...)` |
| **`apple-com-home.md` L147** | 单行 1349 字符：几十个 label-only 条目挤成一条 `A · B · C · …`（chips 在 Markdown 无原生表达） | **Markdown 目标局限**（+ 共享 `selectForm` 把它们判成 `chips`，判定没错，是目标表现不了） |
| **`aliyun-com-product-ecs.md` / `apple-com-cn-iphone-17.md`** | 对比集表头：左上角恒为空 `\|  \| …`；实体列表头把「名称+价格+副标题+嵌套颜色列表+按钮」压成一格（最长数百字符） | **Markdown 目标局限**（管道表不能换行/分区）+ **共享对比集决策**（行标签列没有角落名） |
| **`github-com-login.md` / `36kr-com-search-ai.md`** | `Username or email address: ________ \`[text]\``：输入控件退化成下划线 + 类型码 | **Markdown 目标局限**（无表单控件） |
| **`bilibili-com-read-home.md` / `sspai-com-post-114716.md`** | 数百字整段正文里夹着裸 URL（`https://priconne.kimura.icu/` 连写三遍）与 HTML 实体 `&nbsp;` | **模型语义缺失**（URL 留在正文事实里，未抽成 `_action`/`_ref`）+ **Markdown 目标局限**（不解码实体、裸 URL 不自动成链） |

（前 4 处的「模型侧」都只有一条：`_image` 缺 alt（#1）与正文夹 URL/实体（#5）；其余是 Markdown 表现不了的形态。）

---

## 8. 结论：**「同构引擎」这一主张在本轮结束时 = 部分成立（partial）**

**依据**：

- **成立的部分（有据）**：新增一个目标**确实**只 import 了 `model-lib` + `axis`（19 个共享符号），
  F-030/F-031 的判定层（形态选择、可比闸门、对比集退化与理由、有序分组、主指槽、控件可见性、共享常量）
  **一行私有副本都没有**；三目标对 42 页 + 全部构造模型的**对比集判定 0 分歧、5 种形态一致**；
  门禁的证伪实验证明这套单一实现**能被打假**。第三个目标**没有因为架构而受阻**。
- **不成立的部分（有据）**：新目标仍然不得不重新推导 **11 处**非表现层知识，其中
  **F-051 表/卡片阈值、节点 `_when` 可见性、选择集形态、对比表格取值/行标题** 属于「所有目标必须一致」
  的判定（#3/#4 已经造成 **HTML 与 文本/MD 的形态名不一致**，虽不丢事实）。这些恰好是门禁 A1 的**名字检测抓不住**的洞。
  所以「只写表现层就能完成」**尚未成立**，准确说法是「**只写表现层 + 11 处未被上移的判定骨架**」。

**下一步（不属本轮授权，仅登记）**：把这 11 处按 #1→#11 顺序上移进 `m1/axis.mjs`（建议新导出
`nodeVisible`/`headingKeyOf`/`runForm`/`choiceSetForm`/`compareCellOf`/`compareRowLabel`/`isDemoted`），
并把门禁 A1 从「名字检测」升级为「行为检测」（对同一构造模型断言三目标的**节点级渲染骨架决策**一致，
而不只是形态名），那样第 4 个目标才可能真正 0 处非表现层知识。

---

## 9. 收尾门禁

`node m1/eval/pipeline.mjs`（退出码 0）：

```
[pipeline] 渲染 42/42 | 错误 0
[pipeline] 保真 1.00: 42/42
[pipeline] Markdown 目标: 渲染 42/42 | 保真 1.00: 42/42
[pipeline] 模型校验: 48 个全通过
[pipeline] 校验器自测: 通过
[pipeline] 地基自测(D1/D2/D3): 通过
[pipeline] 显式降级清单（compare 标记但成不了对比表）:
[pipeline] · stripe-com/pricing · n=2 · degenerate-no-shared-attribute
[pipeline] 地基自测: 全部通过
[pipeline] 度量自测(F-052): 通过
[pipeline] 文本目标自测(F-031): 通过
[pipeline] 轴一致性自测(F-031 三目标): 通过
[pipeline] Markdown 目标自测(F-031): 通过
视觉自查: 42/42 干净
```

`node m1/eval/axis-selftest.mjs` = **37/37**；`node m1/eval/md-selftest.mjs` = **20/20**；
**六套自测全过**（校验器/地基/度量/文本/轴一致性/Markdown）。
改动：新增 `m1/render-md.mjs`、`m1/eval/md-selftest.mjs`；改 `m1/eval/axis-selftest.mjs`、`m1/eval/pipeline.mjs`；
`m1/eval/m3-final.json` 因流水线新增 `mdFid` 字段而例行更新。
无暂存文件（`git diff --cached --name-only` 为空）；未 git 提交；看图 0 张；`render.mjs`/`render-text.mjs`/模型/`corpus/` 未改。

---

MD_TARGET_DONE models=42/42 non_presentation_knowledge=11 md_fidelity=42/42 rederivation_gate=pass isomorphism=partial
