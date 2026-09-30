# 轮 23 · 收口（对比表头决策上移）+ 三目标演示件

## 0. 计划与时限

- **A. 收口**：把对比表「实体表头属性集」上移为 `axis.mjs` 的共享决策
  `compareHeaderEntries(entity)` / `COMPARE_HEADER_KEYS`，三渲染器改为消费它；
  门禁（`axis-selftest.mjs`）新增「三目标同集合」断言。
- **B. 演示件**：`m1/eval/three-target-preview.mjs` → 可重生成的 `docs/three-targets.md`。
- 40 分钟硬限；每片完成即追加本文件；不改模型/`corpus/`；不新增语法/保留键；不看图。

## 1. 基线（change 前）

- 42 个 exemplar 模型的三目标产物快照：`.scratch/23-closeup-demo/baseline/{html,txt,md}`（126 文件）。
- 对比实体表头键扫描（`.scratch/23-closeup-demo/_hdrscan.mjs`）：corpus 内 4 个对比集，
  表头键实际只用到 `_name` / `_price` / `_summary`（无实体同时带 `_subtitle`+`_summary`，
  也无 `_tag`）⇒ 统一顺序不会改变任何 corpus 产物字节。
- 三渲染器现状（各写一遍、顺序不同）：
  - HTML：`_tag → _price → _summary → _subtitle`
  - 文本/MD：`_tag → _price → _subtitle → _summary`

## 2. A · 表头属性集上移（完成）

**新增共享决策（`m1/axis.mjs`）**
```js
export const COMPARE_HEADER_KEYS = ['_name', '_title', '_tag', '_price', '_subtitle', '_summary'];
export function compareHeaderEntries(entity) { /* 现有表头属性，规范顺序：名称→标签→价格→副标题→摘要 */ }
```
- `compareRowKeys` 改为用 `COMPARE_HEADER_KEYS` 排除表头键（原内联字面量删除）。
- 三渲染器的 `renderCompareTable` 改为遍历 `compareHeaderEntries(it)`，只把每个 `{key,value}`
  画成各自记号（HTML 元素 / 文本空格拼接+`[]` / GFM 文本）——不再自行列举键、不再自定顺序。
- `axis-selftest.mjs`：`compareHeaderEntries`/`COMPARE_HEADER_KEYS` 加入 `SHARED_NAMES`（私有副本即失败），
  新增 A1c-b「三目标消费 compareHeaderEntries」；E0/E1/E2 与 F1/F2 见 §3。

**顺序统一（有意的行为修正）**：原 HTML 是 `_summary → _subtitle`，文本/MD 是 `_subtitle → _summary`。
现统一为共享的规范顺序 `… _subtitle → _summary`（副标题是实体的一句话，摘要更长；两目标原有顺序一致，
HTML 此前是孤例）。**无事实增减，保真不变。**

**逐页字节差异（change 前后快照 diff）**：126 文件中 **1 页（1 文件）** 变化——
| 目标 | 变化页 | 说明 |
|---|---|---|
| HTML | **1/42** `apple-com-cn/iphone-17` | 对比表两实体列头 `_subtitle`/`_summary` 两个 `<div class="cmp-sub">` 互换顺序（现值：副标题先、摘要后）。有意修正，事实不丢（fidelity 173/173=1.00）。 |
| 文本 | **0/42** | 原本已是 `_subtitle → _summary` |
| Markdown | **0/42** | 同上 |

（corpus 内仅 `apple-com-cn/iphone-17` 的对比实体同时带 `_subtitle`+`_summary`；其余对比实体只有
`_name`/`_price`/`_summary`，顺序统一不产生影响。）

**证伪（要求的一次）**：临时在 `render-md.mjs` 让表头丢弃 `_summary`
（`compareHeaderEntries(it).filter(e => e.key !== '_summary')`）：
```
FAIL E2 all 23 compare entities draw the same header set in every target — 6 mismatched header values
FAIL F2 all three targets draw every header attribute (identical set) — … md=[…,false]
```
撤销后恢复 `全部通过 (55 条断言)`（原 48：A1c-b +3、E0 +1、E2 +1、F1/F2 +2）。

## 3. 门禁改动（`m1/eval/axis-selftest.mjs`）

- `SHARED_NAMES` 增加 `compareHeaderEntries`、`COMPARE_HEADER_KEYS`（私有副本 ⇒ A 段失败）。
- 新增 **A1c-b**：三目标都必须 `compareHeaderEntries(` 消费表头决策（+3 断言）。
- 新增 **E0**：满实体产出规范键序列 `_name,_tag,_price,_subtitle,_summary`，`_name/_title` 坍缩为一个名称位。
- 提取 **E1**（三目标同轴决策）+ 新增 **E2**：corpus 全部 **23 个对比实体** 的每个表头属性值
  都必须到达**三个**产物（三目标同集合，显式断言）。
- 新增 **F1/F2**：构造「带全部 5 个表头属性」的对比集，断言三目标都画出同一集合。
- 断言总数 48 → **55**。

## 4. B · 三目标演示件（完成）

- 新增 **`m1/eval/three-target-preview.mjs`**（一条命令生成）：
  - 页面：`gov-uk/ni-rates-letters`（表格）、`apple-com-cn/iphone-17`（对比）、
    `github-com/login`（表单/登录）、`sspai-com/post-114716`（内容）。
  - 对**同一份模型**分别渲染 HTML / 纯文本 / Markdown，并把三种产物**并排**写入 `docs/three-targets.md`。
  - 片段=脚本按 marker 从**真实产物**截取的字节窗口（`…` 标注截断边）；HTML 仅按 `><` 折行便于阅读，内容不变。
  - 每页给出：模型意图一句话（`_intent`）、**决策层视角**的形态清单（由同一个 `axis.mjs` `nodePlan` 算出）、
    三目标的片段摘录、以及「同一决策层、不同画法」的说明。
  - 开头写明目标（同一份业务元语 → 多个前端形态、决策层共享、画法各异）与 `isomorphism=partial`，
    并诚实列出剩余残余：`ROLE_LABEL` 目标本地标签词汇、8 个形态画法（见 §5）。
- 可重生成且确定：连续两次生成 md5 相同（`9c9ad10a31b4be3dd264cf69de04b551`）。
- 产物：`docs/three-targets.md`（约 10.1 KB，4 页）。

## 5. isomorphism 判定（诚实登记新发现的残余）

**本轮收口**：对比表实体表头属性集 → 共享 `compareHeaderEntries`（决策层已无重复实现）。

**新发现（未在轮 22 登记）**：`ROLE_LABEL` 标签词汇仍是目标本地（只在文本/MD）；
当一次 `table` 形态的列包含**内部角色事实**（`_count`/`_price`…）时，三目标表头行不一致。
用**合法**模型（已声明 `_fields` + 角色事实）复现：
```
{ "list": { "_items":[
  { "_name":{"text":"A"}, "_fields":{"age":{"num":4}}, "_count":{"num":3} },
  { "_name":{"text":"B"}, "_fields":{"age":{"num":5}}, "_count":{"num":6} } ]}}
```
| 目标 | 表头行 |
|---|---|
| HTML | `<th></th><th>Age</th><th></th>`（身份列/角色列无文字） |
| 文本 | `名称  Age  数量` |
| Markdown | `\| 名称 \| Age \| 数量 \|` |

⇒ 合法的三目标**可见差异**（列集合由共享 `runPlan` 决定，但列标签未上移）。**当前 42 个策展页 0/42 触发**
（全库扫描：`valid tables with role-key columns: 0`），故无当前产物差异，但保证非结构性。

**结论**：决策层无重复；但目标本地标签词汇使三目标尚未达到**产物级**同构 ⇒ `isomorphism=partial`。
残余登记：① `ROLE_LABEL`/`名称` 列标签（文本/MD）未上移；② 8 个形态各自的画法。

## 6. 收尾门禁（`node m1/eval/pipeline.mjs --shots`，退出码 0）

```
[pipeline] 渲染 42/42 | 错误 0
[pipeline] 保真 1.00: 42/42
[pipeline] Markdown 目标: 渲染 42/42 | 保真 1.00: 42/42
[pipeline] 模型校验: 48 个全通过
[pipeline] 校验器自测: 通过
[pipeline] 地基自测(D1/D2/D3): 通过
[pipeline] 度量自测(F-052): 通过
[pipeline] 文本目标自测(F-031): 通过
[pipeline] 轴一致性自测(F-031 三目标): 通过
[pipeline] Markdown 目标自测(F-031): 通过
视觉自查: 42/42 干净
[pipeline] 截图 42 张, 画廊 v=muoososz
```

- 七套自测：`validate/foundation/metrics/text/axis/md` 六套 + 视觉自查 42/42。
- `axis-selftest` = **55/55**（原 48：A1c-b +3、E0 +1、E2 +1、F1/F2 +2）。
- 未 git 提交；`git diff --cached --name-only` 为空（无暂存）。只改 `m1/**`、`docs/**`、`.scratch/**`；
  未改模型/`corpus/`；未新增语法/保留键；未逐张看图（HTML 改动仅 iphone-17 表头两行顺序，视觉自查门禁通过）。

### 残留（下一轮可登记）
- 上表 ①：把 `table` 表头列标签（身份列 `名称` + `ROLE_LABEL`）也上移为共享决策
  （`runPlan` 可携带 `labelOf(col)`），即可让三目标 table 表头一致 ⇒ 产物级同构。

---

## 更正（轮 24，2026-10-01）：本报告 §5 的「0/42 触发」结论已被证伪

本报告 §5 与 `docs/three-targets.md`（生成件）当时写道：

> `ROLE_LABEL` 标签词汇仍是目标本地……**当前 42 个策展页 0/42 触发**（全库扫描：`valid tables with role-key columns: 0`），故无当前产物差异，但保证非结构性。

**更正：这个结论是错的。** 那次扫描只覆盖了 `table` 形态的**列**标签（列键含角色事实），
漏掉了**对比表（compare-table）的行标签**这条同样消费 `ROLE_LABEL` 的路径：

- `m1/render.mjs:313`（旧）：`compareRowLabel(items,key) ?? FIELDS[key]?.label ?? ''` —— **只查域字段词典**，没有角色标签兜底；
- `m1/render-text.mjs:129` / `m1/render-md.mjs:146`（旧）：多了一步 target-local `ROLE_LABEL[key]`。

**证据（真实发生，不是构造）**：`airbnb-com/room-28871` 的 `reviews.aspects` 对比集
（6 个实体、行键 `_rating`，无子节点 `_title`/`_name`，`_rating` 不在域字段词典）：

| 目标 | 该行标签（修复前） |
|---|---|
| HTML | `<th class="cmp-row"></th>`（空） |
| 纯文本 | `评分  4.8  4.9 …` |
| Markdown | `| 评分 | 4.8 | … |` |

⇒ 同一模型、同一对比集，三目标给出的**行标签决策不一致**；`0/42 触发` 不成立。

**处置（轮 24）**：把角色标签词汇**声明化**为 `m1/vocab-role-labels.json`，把行标签完整链
（子节点 `_title`/`_name` → 共享角色词汇 → 域字段词典 → 空）上移为 `m1/axis.mjs` 的
`resolveRowLabel`，列标签同链为 `columnLabel`；三渲染器删除本地 `ROLE_LABEL`；
`axis-selftest` 新增 G 段（构造 G1–G4 + corpus G5/G6）并做了一次证伪（临时让 HTML 跳过共享链 → 门禁 FAIL）。
本报告 §5 的「结论」与「残余①」按上述更新；`isomorphism` 随之从 `partial` 更新为 `holds（已行使路径）`
（仍未共享的部分见 `.scratch/24-row-label/report.md`）。
