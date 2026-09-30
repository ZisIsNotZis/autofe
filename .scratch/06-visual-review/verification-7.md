# 独立验收 · 轮 10（同构架构这条线：轮 18-23）—— verification-7.md

验收者：轮 10 独立验收 subagent（不采信修复者自述；所有结论均来自本轮亲自运行/亲自构造/亲眼所读）。
验收对象：第二目标（render-text）/ 共享轴层（`m1/axis.mjs`）/ 节点渲染契约（renderers draw a plan）/ 表头契约（`_name/_tag/_price/_subtitle/_summary` 共享列头）/ 演示件（`docs/three-targets.md`）。
纪律：只写本文件；未改仓库其它任何文件；未改 `corpus/`；未 git 提交。

---

## 项 1 · 门禁（亲自跑）— accept

命令：`node m1/eval/pipeline.mjs`（exit 0）。原文（`/tmp/gate7.txt`）：

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
dup-title: 华为磁吸手机支架 - 华为官网
· sspai-com-home.html                           dup-source-true(info):2

视觉自查: 42/42 干净
```

核对任务书要求的五项：
- 42/42 HTML 保真 1.00 ✓（`保真 1.00: 42/42`）
- 42/42 MD 保真 1.00 ✓（`Markdown 目标: 渲染 42/42 | 保真 1.00: 42/42`）
- 48 个模型全通过 ✓
- 七套自测 ✓：校验器 / 地基开发D1D2D3 / 地基 / 度量F-052 / 文本目标F-031 / 轴一致性F-031 三目标 / Markdown 目标 = **7**
- 视觉自查 42/42 干净 ✓

结论：**accept**。（`dup-title` 一行是 `dup-source-true(info)`，与既往口径一致的非阻断信息项。）

---

## 项 2 · "渲染器不做决策"是否真成立 — accept（附 1 条 minor）

方法：（a）对三个渲染器用脚本去注释（先剥 `/*…*/`，再剥行内 `//…`）后统计任务书点名的 9 个决策 token：`_rel|_when|_expose|_fields|_primary|_empty|_items|_lines|_action`；（b）查 `m1/axis.mjs` 的 import。

结果（`node -e` 剥注释后 `String.match(re)` 计数）：

```
=== m1/render.mjs ===       after comment strip, matches: 0 []
=== m1/render-md.mjs ===    after comment strip, matches: 0 []
=== m1/render-text.mjs ===  after comment strip, matches: 0 []
```

→ 三个渲染器去注释后对模型语义/决策 token 的引用**均为 0**：渲染器确实只"画计划"，不读模型内部语义。

`m1/axis.mjs` 的 import（全文仅 2 处 import 语句）：
```
17: import {
19: } from './model-lib.mjs';
```
且 `grep "import(\|require("` 于 `axis.mjs` / 三个渲染器 / `model-lib.mjs` = **none**（无动态导入、无 CJS）。

三条渲染器的 import 图：
```
render.mjs      -> ./model-lib.mjs , ./axis.mjs
render-md.mjs   -> ./model-lib.mjs , ./axis.mjs
render-text.mjs -> ./model-lib.mjs , ./axis.mjs
```
→ 三个目标都只依赖「模型语义(model-lib) + 共享轴决策(axis)」，**没有任何渲染器 import 另一个渲染器**。

结论：**accept**（这是本轮同构性最硬的一条证据：渲染器零决策 + 轴层单一来源）。

### minor（M1）· `render-text.mjs` 头注释陈旧
`m1/render-text.mjs:3-4` 仍写 `HARD CONSTRAINT: imports ONLY ./model-lib.mjs ... It must NOT import ./render.mjs`，但该文件在 `:29` 已 `from './axis.mjs'`（同文件 `:24-26` 的下半段注释已正确说明「round 19 起轴层共享」）。头注释与代码自相矛盾。**属陈旧文案，不影响行为**：轴层是共享决策模块而非另一渲染器，`must NOT import ./render.mjs` 仍然成立。建议下轮顺手把 `:3` 的 "ONLY ./model-lib.mjs" 改为 "ONLY ./model-lib.mjs + ./axis.mjs"。

---

## 项 3 · 三目标一致性（独立构造，不走断言）— accept

**方法**：自建模型 `/tmp/probe5.json`——一个 `_rel.compare` 对比集，**三个实体都带全部五个表头属性** `_name/_tag/_price/_subtitle/_summary`，外加两个共享行属性（`weight`/`screen`），走三个真实渲染器（`m1/render.mjs` / `m1/render-text.mjs` / `m1/render-md.mjs`）产出 `/tmp/probe5.{html,txt,md}`。然后写 `/tmp/cmp5.mjs` **独立**提取：对每个实体按共享函数 `compareHeaderEntries` 的顺序，逐个在产物里**顺序查找**该属性的值，得到「属性键=值」序列，再跨目标 `JSON.stringify` 比对（**不用它们各自的断言**）。

**产物摘录（原样）**：
```
HTML  <th class="cmp-col">实体甲<span class="cmp-tag">标签甲</span><div class="cmp-price">RMB 100</div><div class="cmp-sub">副标题甲</div><div class="cmp-sub">摘要甲</div></th>…
TEXT   实体甲 [标签甲] RMB 100 副标题甲 摘要甲  实体乙 [标签乙] RMB 200 副标题乙 摘要乙  实体丙 [标签丙] RMB 300 副标题丙 摘要丙
MD    |  | 实体甲 标签甲 RMB 100 副标题甲 摘要甲 | 实体乙 标签乙 RMB 200 副标题乙 摘要乙 | 实体丙 标签丙 RMB 300 副标题丙 摘要丙 |
```

**独立比对程序输出**：
```
shared fn expectation:
  entity 0 _name=实体甲 | _tag=标签甲 | _price=100 | _subtitle=副标题甲 | _summary=摘要甲
  …
--- html sameOrderAsSharedFn = true
--- text sameOrderAsSharedFn = true
--- md   sameOrderAsSharedFn = true
html==text: true | html==md: true | VERDICT: SETS+ORDER IDENTICAL ACROSS 3 TARGETS
```

**加强探针**（`/tmp/probe5b.json`，部分实体只带部分表头属性，且实体乙只声明 `_title` 而非 `_name`）：
```
HTML  <th class="cmp-col">甲甲<span class="cmp-tag">热销</span><div class="cmp-price">$11</div></th><th class="cmp-col">乙乙<div class="cmp-sub">乙副标题</div><div class="cmp-sub">乙摘要</div></th><th class="cmp-col">丙丙<div class="cmp-price">$33</div><div class="cmp-sub">丙副标题</div></th>
TEXT   甲甲 [热销] $11  乙乙 乙副标题 乙摘要  丙丙 $33 丙副标题
MD    |  | 甲甲 热销 $11 | 乙乙 乙副标题 乙摘要 | 丙丙 $33 丙副标题 |
```
→ 缺属性时三目标**同步省略**同一属性；`_title` 与 `_name` **同步坍缩**到「名称」位（乙乙）；顺序 `名称→标签→价格→副标题→摘要` 三目标一致；`$` 与文本目标繁简符号约定一致。

结论：**accept**。共享列头契约（`compareHeaderEntries` + `COMPARE_HEADER_KEYS`）确实是「一处决策、三处画」：三份产物的属性**集合与顺序完全一致**，差异只在记号（HTML span/div、文本 `[]`、MD 空格）。

---

## 项 4 · 演示件真实性 + 确定性 — accept

**确定性**（亲自重跑）：
```
$ md5sum docs/three-targets.md
9c9ad10a31b4be3dd264cf69de04b551  docs/three-targets.md
$ node m1/eval/three-target-preview.mjs
[three-target-preview] wrote docs/three-targets.md (10112 bytes, 4 pages)
  · gov-uk/ni-rates-letters — list×2 table×2 controls×1
  · apple-com-cn/iphone-17 — deflist×5 chips×4 list×3 stack×2 cards×1 compare-table×1 choice:choice×2
  · github-com/login — list×1 choice:input×2
  · sspai-com/post-114716 — prose×18 stack×9 deflist×7 list×1 cards×1
$ md5sum docs/three-targets.md
9c9ad10a31b4be3dd264cf69de04b551  docs/three-targets.md
$ git status --short docs/three-targets.md    # 空输出 ⇒ 重跑未产生任何 diff
```
→ **md5 前后完全一致**，重跑不产生仓库 diff：演示件**确定性可再生产**。

**摘录逐字核对**（任务要求抽 3 段；我做了全部 12 段）：
用 `/tmp/verbatim.mjs` 从 `docs/three-targets.md` 解析全部代码块，**用我本地重渲染的产物**（`node m1/render*.mjs m1/curated/<page>.json`，输出到 `/tmp/prod/`）逐行 `indexOf` 顺序比对（HTML 块按生成脚本的 `></`→`>\n<` 显示性折行还原；首行 `…` 截断标记剥除；末行允许为字节窗口的部分行）：

```
{"page":"gov-uk/ni-rates-letters","target":"html","ok":true,"matchedLines":39,"totalLines":40}
{"page":"gov-uk/ni-rates-letters","target":"text","ok":true,"matchedLines":6,"totalLines":6}
{"page":"gov-uk/ni-rates-letters","target":"md","ok":true,"matchedLines":20,"totalLines":21}
{"page":"apple-com-cn/iphone-17","target":"html","ok":true,"matchedLines":20,"totalLines":20}
{"page":"apple-com-cn/iphone-17","target":"text","ok":true,"matchedLines":4,"totalLines":4}
{"page":"apple-com-cn/iphone-17","target":"md","ok":true,"matchedLines":5,"totalLines":6}
{"page":"github-com/login","target":"html","ok":true,"matchedLines":21,"totalLines":22}
{"page":"github-com/login","target":"text","ok":true,"matchedLines":9,"totalLines":10}
{"page":"github-com/login","target":"md","ok":true,"matchedLines":14,"totalLines":15}
{"page":"sspai-com/post-114716","target":"html","ok":true,"matchedLines":22,"totalLines":22}
{"page":"sspai-com/post-114716","target":"text","ok":true,"matchedLines":18,"totalLines":18}
{"page":"sspai-com/post-114716","target":"md","ok":true,"matchedLines":29,"totalLines":29}
```
→ **12/12 ok**，全部行逐字存在于**真实产物**中；未匹配的仅为每块末尾被 620 字节窗口截断的部分行（脚本明确标注 `…` 为截断边）。**没有任何手写摘要冒充产物**。

结论：**accept**（确定性 + 逐字真实，均为我独立复算，未采信报告自述）。

---

## 项 5 · 本轮 1 页行为变化（iphone-17 的 `cmp-sub` 顺序）是否正当 — accept

**变化事实**（我用基线/现状产物直接 diff）：
```
$ diff <(sed 's/></>\n</g' .scratch/23-closeup-demo/baseline/apple-com-cn-iphone-17.html) \
       <(sed 's/></>\n</g' .scratch/23-closeup-demo/after/apple-com-cn-iphone-17.html)
516d515
< <div class="cmp-sub">RMB 6799 起或 RMB 284/月 (24 期) 起</div>      ← 旧：_summary 在前
517a517
> <div class="cmp-sub">RMB 6799 起或 RMB 284/月 (24 期) 起</div>      ← 新：_summary 在后
532d531
< <div class="cmp-sub">RMB 8799 起或 RMB 367/月 (24 期) 起</div>
533a533
> <div class="cmp-sub">RMB 8799 起或 RMB 367/月 (24 期) 起</div>
```
即：`_subtitle`（拉高好感度， 再添耐用性。）与 `_summary`（RMB 6799 起或…）两块**互换**。

**是否由共享决策驱动？——是，且是三目标同时变。** `git show 71959b4 -- m1/render.mjs` 里 HTML 渲染器**删掉了自己的局部顺序**：
```diff
-    const sum = (it._summary ? `<div class="cmp-sub">…</div>` : '')
-      + (it._subtitle ? `<div class="cmp-sub">…</div>` : '');
+    for (const e of compareHeaderEntries(it)) { … else rest += `<div class="cmp-sub">…</div>` }
```
`compareHeaderEntries`（`m1/axis.mjs:135`，本轮新增）的规范顺序是 **名称→标签→价格→副标题→摘要**。同一提交里 `render-text.mjs` / `render-md.mjs` 也用同一函数替换了各自的局部 `if (it._summary) … if (it._subtitle) …`。所以顺序变化**由共享层唯一定义驱动，不是某目标的局部修补**；三目标在这一点上从「碰巧不同」变成「由同一处决定」。

**保真**：`node m1/eval/pipeline.mjs` 原文 `保真 1.00: 42/42`（含 iphone-17），Markdown 目标 `保真 1.00: 42/42`。变化只在弱化块的**先后**，事实集合不变 ⇒ 保真仍 1.00。**accept**。

---

## 项 6 · 新登记的残余（table 列标签 target-local）是否属实 — **reject（附实证分歧）**

### 6a · 字面路径「声明 `_fields` + 同节点角色事实」= 0/42 —— 与登记一致
`/tmp/scan42.mjs` 独立扫描 `m1/curated/**` 全部 **42** 个模型，枚举所有 `_rel.compare` 集合，按共享 `compareRowKeys` 取行键，找「行键是 `ROLE_LABEL` 专有角色键（HTML 侧无对应文案）」的情形：命中 **1** 处，但它是 `_rating`（**未**声明 `_fields`）⇒ 任务书字面路径（`_fields` + 角色事实）确为 **0/42**。

### 6b · 但「⇒ 当前无产物差异」是**假的**：库里已有 1/42 页真的分歧（airbnb）
`m1/curated/airbnb-com/room-28871.json` 的 `aspects` 集合（`_rel.compare`，6 个实体，行键 `_rating`）**已经**踩到同一机制：
```
HTML : <th class="cmp-row"></th>                     ← 行标签**空**
       <th class="cmp-col">干净卫生</th> …
TEXT :   评分  4.8       4.9       4.9       4.9       4.9       4.8
MD   : | 评分 | 4.8 | 4.9 | 4.9 | 4.9 | 4.9 | 4.8 |
```
原因即残余本身：`render.mjs:313` = `compareRowLabel(items,key) ?? FIELDS[key]?.label ?? ''`（无 `ROLE_LABEL`），而 `render-text.mjs:129` / `render-md.mjs:146` = `… ?? ROLE_LABEL[key] ?? …`。我核实 `m1/vocab-fields.json` 中 **无** `_rating`/`_count`/`weight` ⇒ HTML 只能画空。这不是"保证尚非结构性"，而是**已在策展页上可见的产物分歧**（且文本目标正是轮 18 引入的 ⇒ 本条线引入的回归）。`docs/three-targets.md` 写的「42 个策展页扫描 0/42 触发 ⇒ 当前无产物差异」**不成立**。

### 6c · 我构造的模型（任务书要求"更强的证据"）
`/tmp/probe6.json`：对比集，每个实体**同时**声明 `_fields`（`weight`）**和**角色事实 `_count` —— 正是登记所说「合法模型可达、但 0/42」的那条路径。
```
HTML : <th class="cmp-row"></th>  （"重量"行与"数量"行**都无标签**）
TEXT :
      甲甲    乙乙
----  ------  ------
      1 公斤  2 公斤
数量  10      20
MD   : |  | 甲甲 | 乙乙 |
       | --- | --- | --- |
       |  | 1 公斤 | 2 公斤 |
       | 数量 | 10 | 20 |
```
→ 同一个合法模型，**HTML 丢标签、文本/MD 给 `数量`**：三目标**实际分歧**，实测复现。这比任何断言都更强地证明：该残余是**真实存在的产物级同构破口**，不是"仅理论可达"。

**结论：reject。** 残余的**存在**属实（我构造并复现了分歧），登记它、把 isomorphism 记为 `partial` 是**正确的**；但随附的"0/42 / 当前无产物差异"结论**经不起独立扫描**（1/42 已在库里可见），且 HTML 产物在 airbnb 上有一个**空的左侧列头**这一可见缺陷。⇒ 记为 **major**：`three-targets.md` 的该句必须改正；并需决定是**把角色键标签上移到 `m1/axis.mjs`**（则 `isomorphism` 才可能从 `partial` 走向 `holds`），还是显式承认 HTML 侧无标签并写进 `layout-axes.md`。

---

## 新发现清单
| # | 级别 | 位置 | 事实 |
|---|---|---|---|
| N1 | **major** | `docs/three-targets.md`（"目标与现状"残余 1）+ `m1/curated/airbnb-com/room-28871.json` `aspects` | 「42 页扫描 0/42 触发 ⇒ 当前无产物差异」为假：airbnb 对比表行头 HTML 为空、文本/MD 为 `评分`；且该分歧由轮 18 引入本线条。构造集 `/tmp/probe6.json` 亦复现（HTML 空 vs 文本/MD `数量`）。 |
| N2 | minor | `m1/render-text.mjs:3-4` | 头注释仍写 `imports ONLY ./model-lib.mjs`，但文件已 `import … from './axis.mjs'`（:29）；同文件 :24-26 的描述正确。陈旧文案，不影响行为。 |

## 总体判定
- 项 1（门禁）**accept**：42/42 HTML 保真 1.00 + 42/42 MD 保真 1.00 + 48 模型 + **七套自测** + 自查 42/42 干净，亲自运行 exit 0。
- 项 2（渲染器不做决策）**accept**：三渲染器去注释后 9 个决策 token 计数 **0/0/0**；`axis.mjs` **只** import `model-lib`；无动态导入；三目标互不 import。
- 项 3（三目标一致性）**accept**：自建五表头属性模型（+部分属性变体），三产物属性**集合与顺序完全一致**（独立脚本复算，非采信断言）。
- 项 4（演示件真实 + 确定性）**accept**：md5 重跑不变、无 diff；**12/12** 摘录逐字存在于真实产物。
- 项 5（cmp-sub 顺序变化）**accept**：由共享 `compareHeaderEntries` 驱动、三目标同步、保真仍 1.00。
- 项 6（残余属实性）**reject**：残余存在且已复现，但"0/42、无产物差异"的结论被独立扫描证伪（1/42 可见）。

**架构层结论**：轮 18-23 的**结构性主张成立**——决策层无重复实现（渲染器零决策、轴层单一来源）、表头契约三目标同集合、演示件可再生产且逐字真实。
**但**：`isomorphism` 仍是 `partial`，且**其残余在库里已有可见实例**——演示件对残余范围的陈述过度乐观，必须更正；修正方式（上移角色标签 vs 明文承认 HTML 无标签）是一个需要父代理裁定的**新增决定**，我不自行选择。

VERIFY7_DONE verdict=FAIL blockers=0 majors=1 minors=1 isomorphism=partial
