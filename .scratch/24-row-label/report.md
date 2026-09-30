# 轮 24 · 行标签决策共享（worker 报告 · 分片落盘）

## 缺陷（父代理已复现）
同一模型 / 同一对比集，HTML 产出空行标签（`<th class="cmp-row"></th>` × 2），文本/Markdown 产出 `评分`。
- 根因：`m1/render.mjs:313` = `compareRowLabel(...) ?? FIELDS[key]?.label ?? ''`（只查域字段词典）；
  `render-text.mjs` / `render-md.mjs` 各带一份 target-local `ROLE_LABEL`。
- 已在 `airbnb-com/room-28871` 真实发生（`reviews.aspects`，行键 `_rating`）。

## 裁定（父代理）
行标签的**决策**必须共享：该行子节点 `_title`/`_name` → 共享**角色标签词汇** → 域字段词典 `FIELDS` → 空。
角色标签属引擎词汇 ⇒ **声明化**为独立词汇文件。

## 设计选择（词汇声明化 vs 常量上移）
- **选：声明化**。新增 `m1/vocab-role-labels.json`（`$comment` + `version` + `labels`），与既有
  `vocab.json` / `vocab-domain.json` / `vocab-fields.json` / `vocab-context.json` 同构，
  由 `m1/axis.mjs` 用 `fs.readFileSync` 加载（沿用 `model-lib.mjs` 的既有惯例）。
- 理由：① 角色标签是**引擎词汇**（内部角色键 → 人可读文案），不是某个目标的文案，也不该是某目标的常量；
  ② 可审查（词表一页可读完、可 diff），新增/修改角色文案是**词表变更**而非散落的代码改动；
  ③ 三目标从同一处取词，结构上不允许再漂移（`axis-selftest` 静态半边按名检测私有副本）。
- 不做：把中文映射硬编码进 `axis.mjs` 的常量对象——那只是"换个地方的目标本地副本"，仍不可独立审查。

## 进展
- [x] 基线复现（airbnb HTML 空 / 文本·MD `评分`）
- [x] 新增 `m1/vocab-role-labels.json`
- [x] `axis.mjs`：加载词汇 + `ROLE_LABEL` / `roleLabel` / `fieldLabel` / `resolveRowLabel`
- [x] 三渲染器消费共享链、删除 target-local `ROLE_LABEL`
- [x] 门禁断言（axis-selftest G 段）+ 一次证伪
- [x] 过期注释 / 文档更正
- [x] 收尾门禁

（详细结果随分片追加在下方。）

---

## 1. 交付物

| 文件 | 变更 |
|---|---|
| `m1/vocab-role-labels.json` | **新增**：角色标签词汇（33 个闭式角色键 → 人可读标签），含 `$comment` 说明「是什么 / 谁用 / 空串含义 / 变更纪律」 |
| `m1/axis.mjs` | 加载词汇并导出 `ROLE_LABEL` / `roleLabel` / `NAME_COLUMN_LABEL` / `columnLabel` / `resolveRowLabel`；`compareRowLabel` 注释收窄为「只取子节点标题」 |
| `m1/render.mjs` | 删 `FIELDS` 直查；行标签 → `resolveRowLabel`；数据表列标签 → `columnLabel` |
| `m1/render-text.mjs` | 删本地 `ROLE_LABEL` + `roleLabel`；行/列标签与弱事实前缀 → 共享层；头部注释改为「imports model-lib + axis」 |
| `m1/render-md.mjs` | 同上（删本地 `ROLE_LABEL`） |
| `m1/eval/axis-selftest.mjs` | SHARED_NAMES +5；新增 A1d 静态半边 + G 段（G1–G4 构造、G5/G6 corpus），55 → **74** 断言 |
| `m1/eval/three-target-preview.mjs` | 现状叙述从 `partial` 更新为 `holds（已行使路径）`，列清仍未共享项 |
| `docs/three-targets.md` | 重新生成（叙述变更；md5 `9c9ad10a…` → `317beda5…`，两次生成相同） |
| `.scratch/state-report.md` | §3 证明洞①、§4 残余①追加**更正**（不删原结论） |
| `.scratch/23-closeup-demo/report.md` | 末尾追加**更正**章节（含 airbnb 实证表） |

## 2. 行为变化（逐页 · 前后对照）

对 42 个策展模型，用 **HEAD 版渲染器**与**本轮改动后渲染器**对三目标逐字节对比：

```
HTML changed pages: airbnb-com/room-28871   （仅此 1 页）
TXT  changed pages: （无）
MD   changed pages: （无）
```

`airbnb-com/room-28871` 的对比集（`reviews.aspects`，行键 `_rating`）：

| 位置 | 修复前 | 修复后 |
|---|---|---|
| HTML `<th class="cmp-row">` | 空 | `评分` |
| 纯文本行首 | `评分` | `评分`（不变） |
| Markdown 首格 | `评分` | `评分`（不变） |

其余 41 页三目标**逐字节不变**（含 `render.mjs` 数据表列标签改用 `columnLabel`：已行使的
`table` 形态全部只有域字段列，`columnLabel` 与旧式 `FIELDS[c]?.label ?? ''` 取值相同 ⇒ 零变化）。

**保真不得下降**：pipeline 三目标保真 `42/42 = 1.00`（HTML + Markdown），视觉自查 42/42 干净。

## 3. 门禁断言（含一次证伪）

`axis-selftest.mjs` 新增：

- **A1d（静态，反复发）**：三渲染器都必须消费 `resolveRowLabel(` 与 `columnLabel|roleLabel(`，且不得再出现 `ROLE_LABEL` / `const roleLabel`。
- **G1–G4（构造，逐目标定位提取）**：对同一对比集构造四种行：角色事实行（`_rating` → `评分`）、孩子标题行（`_title` → `部件`）、域字段行（`email` → `Email`）、**无标签行**（三目标必须同时为空）。每例断言 `resolveRowLabel` 返回值 + 从三份产物中**按行位置提取**的标签完全相等。
- **G5/G6（corpus）**：42 页所有真实对比表的每一行，解析出的标签都必须出现在 **HTML 的行头单元格**（G5，精确：`includes` 会漏判，因为 `总体评分` 恰好含 `评分`）与文本/MD 产物（G6）中。命中 **9 个行标签 / 3 张对比表**。

**证伪（临时让 HTML 跳过共享链，再撤销）**：

```
FAIL render.mjs consumes the shared compare row-label decision
FAIL G1 role-fact row: all three targets print "评分" — html="" text="评分" md="评分"
FAIL G3 domain-field row: all three targets print "Email" — html="" text="Email" md="Email"
FAIL G5 all 9 resolved compare row labels … — 3 missing from HTML row headers
轴一致性自测(三目标): 待修 4 (74 条断言)
```

⇒ 门禁确实能失败；撤销后 74/74 通过。这同时证明 **G5 正好抓住 airbnb 那类回归**。

## 4. 收尾门禁（`node m1/eval/pipeline.mjs --shots`，退出码 0）

```
[pipeline] 渲染 42/42 | 错误 0
[pipeline] 保真 1.00: 42/42
[pipeline] Markdown 目标: 渲染 42/42 | 保真 1.00: 42/42
[pipeline] 模型校验: 48 个全通过
[pipeline] 校验器自测: 通过
[pipeline] 地基自测(D1/D2/D3): 通过
[pipeline] 度量自测(F-052): 通过
[pipeline] 文本目标自测(F-031): 通过
[pipeline] 轴一致性自测(F-031 三目标): 通过     （74 条断言）
[pipeline] Markdown 目标自测(F-031): 通过
视觉自查: 42/42 干净
[pipeline] 截图 42 张, 画廊 v=muop7bhg
```

截图变化：仅 `airbnb-com-room-28871.png`（行标签从空变 `评分`）；其余 41 张逐字节不变。

## 5. isomorphism 判定

**从 `partial` 更新为 `holds（已行使路径）`**。理由：已行使路径（42 页）上的**标签决策**现在三目标一致，
且由 G 段门禁 + 证伪背书；剩余差异要么是画法、要么在 42 页上不触发。

**仍未共享的部分（逐条 · 诚实）**：

1. **形态画法**：HTML 元素 / 纯文本空格对齐 / GFM 记号。这是「一对多」的应有之义，不是决策分歧。
2. **HTML 选择表的列标签**（`axis.mjs` 内 `selectTablePlan.labelKey`）：仍是域字段词典 + 空，未接角色词汇。
   但只有 HTML 会画选择表（文本/MD 画选项列表），无对应对照 ⇒ 不构成三目标标签分歧；若要接角色词汇属另一次词表消费变更。
3. **HTML 数据表「画不画表头行」**：无任何列标签且无行内操作时 HTML 省略表头行，文本/MD 恒打表头行。
   **列标签本身已共享**，这只是「是否画空表头行」的表现差异（T-107）。
4. 已行使路径无这些触发（第 2、3 项：`table` 形态的已行使页面全为域字段列；第 2 项无对照目标）。

## 6. 未做 / 风险

- 未改模型、未改 `corpus/`、未新增保留键（`vocab-role-labels.json` 是词汇文件，非保留键）、未 git 提交。
- `_name` 身份列标签统一为共享 `NAME_COLUMN_LABEL='名称'`：已行使的 `table` 形态均无 `_name` 列
  （`named=false`），故零产物变化；`roleLabel('_name')` 仍为空，未被弱事实前缀逻辑误用。
- 证伪后已从备份还原 `render.mjs`，并复跑轴自测 74/74、pipeline 全绿。
