# 独立验收（第 11 轮）— 复合元语这条线（轮 47–52）

验收者：fresh reviewer（未参与本轮修复）。方法：**不采信修复者自述**；自跑门禁、独立构造合成模型测 schema、`git show` 逐字节回归、独立复算迁移分布、回 `corpus/` 核实未迁移原因、深比较注册表压缩。只写本文件；未改仓库内任何文件、未 git 提交、未触碰 `corpus/`。

## 0. 门禁原文（我自跑 `node m1/eval/pipeline.mjs`，exit=0）

```
[pipeline] 渲染 42/42 | 错误 0
[pipeline] 保真 1.00: 42/42
[pipeline] Markdown 目标: 渲染 42/42 | 保真 1.00: 42/42
[pipeline] 模型校验: 48 个全通过
[pipeline] 模型校验警告（不阻断）: 10 条
   ! warn query: composite "search" declares its name but no "default" value ... (W_COMPOSITE_NAME_ONLY_WATERMARK)
   ! warn ... (×8 全部为 W_COMPOSITE_NAME_ONLY_WATERMARK)
   ! warn families-by-type.storage-optimized: table has a single row ... (W_COMPOSITE_ROWS_TOO_FEW)
   ! warn families-by-type.fpga-accelerated: table has a single row ... (W_COMPOSITE_ROWS_TOO_FEW)
[pipeline] 校验器自测: 通过
[pipeline] 地基自测(D1/D2/D3): 通过
[pipeline] 显式降级清单（compare 标记但成不了对比表）:
[pipeline] · stripe-com/pricing · n=2 · degenerate-no-shared-attribute
[pipeline] 地基自测: 全部通过
[pipeline] 度量自测(F-052): 通过
[pipeline] 文本目标自测(F-031): 通过
[pipeline] 轴一致性自测(F-031 三目标): 通过
[pipeline] Markdown 目标自测(F-031): 通过
[pipeline] 证据门禁自测(哈希优先): 通过
[pipeline] 归属工具自测(闭合标签): 通过
[pipeline] 采集↔模型一致性(F-078 · 第9道门禁): 通过
[pipeline] [采集↔模型一致性] 页面 42 | 事实 4077 | 参与判定 3661 | 未命中 0 | 白名单(转换) 37 | 采集缺口 4（声明白名单共 41 条）
[pipeline] [采集↔模型一致性] 通过
[pipeline] 采集一致性自测(F-078): 通过
[pipeline] 图片不放大自测(F-082 · 第10道): 通过
[pipeline] 复合元语自测(轮47 · 第11道): 通过
· sspai-com-home.html  dup-title-source-true(info):1 dup-source-true(info):3
    dup-title: 派早报：欧盟拟禁止 13 岁以下儿童使用社交媒体等
视觉自查: 42/42 干净
[pipeline] 证据一致性（PNG ⇄ HTML）: 通过（42 页与截图同源, 画廊 v=mupct4wn）
EXIT=0
```

---

## 2. schema 真的会拒绝（独立构造，未用仓库 fixture）— accept

构造物全部写在 `/tmp/v8/`，命令见下。

### ① table 某行缺一列 ⇒ `E_COMPOSITE_ROWS_INCONSISTENT`
构造 `/tmp/v8/bad-rows.json`（我自写，非仓库 fixture）：
```json
{ "_intent": "…", "_composite": "table", "_name": {"text":"示例表格"},
  "_items": [ {"_fields":{"age":{"num":1},"email":{"text":"a@x"}}},
              {"_fields":{"age":{"num":2}}} ] }
```
`node m1/validate.mjs /tmp/v8/bad-rows.json` → exit=1：
```
FAIL /tmp/v8/bad-rows.json
   /: table rows declare inconsistent field sets: [age|email] vs [age] (E_COMPOSITE_ROWS_INCONSISTENT)
```
**亲眼确认错误码正确。**

### ② 注册表外的 `_composite:"nope"` ⇒ `E_COMPOSITE_UNKNOWN_TYPE`
构造 `/tmp/v8/bad-type.json`：`{ "_intent":"…", "_composite":"nope", "_label":{"text":"x"} }`
`node m1/validate.mjs /tmp/v8/bad-type.json` → exit=1：
```
FAIL /tmp/v8/bad-type.json
   ._composite: _composite type "nope" is not a key of the closed registry m1/composites.json (adding a type is a grammar+vocabulary change) (E_COMPOSITE_UNKNOWN_TYPE)
```

### ③ `query` 的 role 改判 ⇒ role 判定确实生效（双向实测）
方法：把整个 `m1/` 复制到 `/tmp/v8/m1/`（只读仓库，**仓库内文件未动**），只改副本注册表里的 `role`，用副本渲染器渲染同一模型并与仓库渲染器逐字节对比。

**(a) `search.query`: role `field` → `state`**
- 仓库版（`role:field`）`bilibili-com/home` 渲染含：`<input type="text" name="query" data-type="text" aria-label="磊哥游戏" placeholder="磊哥游戏">`
- 副本版（`role:state`）同一模型渲染：`grep -c '<input'` = **0**，输入框**整块消失**（`磊哥游戏` 只剩 1 处——页脚/其它节点，不再有 input 的 aria-label/placeholder）。
- `metrics.mjs`：两版 `factFidelity=1, 58/58, missing=[]`。**保真不变**（`_expose` 本身不计入事实集），所以此条的判据是**输入消失**而非保真下降——判据满足。

**(b) 反向对照 `login.state`: role `state` → `field`**（证明不是巧合）
- 仓库版（`role:state`）`github-com/login` 渲染：`grep -c 'type="checkbox"'` = **0**，`signed-in` 完全不出现。
- 副本版（`role:field`）同一模型：多出 `<label class="choice expose-signed-in"><input type="checkbox" name="signed-in" value="true">`，`type="checkbox"` 计数 = **1**（`diff` 只有这一处差异）。
- 即：槽位 role 就是**唯一**的控制点，改它 ⇒ 控件出现/消失。仓库的登录页**没有**把 `signed-in`（对外状态）误画成勾选框，判定正确。

**结论**：role 判定在渲染层真实生效（`axis.mjs:slotRoleOf/exposeRendersAsControl`），且方向正确（`field`=控件、`state`=不画）。

---

## 3. "声明不改变产物" — accept（逐字节相同）

方法：（a）`git archive e10de40 m1`（**复合元语这条线之前**的最后一个提交，只读）解到 `/tmp/v8/old/`，用它自带的旧渲染器渲染旧模型；（b）用**当前**渲染器渲染**当前**模型；（c）对 HTML / 纯文本 / Markdown 三个目标算 sha256 逐字节比对；HTML 另做**剥 `<style>`**后的比对；并与仓库里**已提交**的 `m1/curated/renders/*.html`（`git show e10de40:`）比对。

| 页面 | 模型变化 | html | txt | md | 剥 style 后 html（git 已提交 vs 当前 vs 新渲染） |
|---|---|---|---|---|---|
| `bilibili-com/home` | 仅新增 `"_composite":"search"` | `b0f741ef…` **相同** | `a3345708…` 相同 | `0b981168…` 相同 | `9966b9cf…` = `9966b9cf…` = `9966b9cf…` |
| `gov-uk/ni-rates-letters` | 仅新增 2 处 `"_composite":"table"` | `2eea3ad9…` **相同** | `eb38d722…` 相同 | `19ee179f…` 相同 | `71359478…` = `71359478…` = `71359478…` |
| `airbnb-com/room-28871` | 仅新增 `"_composite":"form"` | `af334cac…` **相同** | `d6c03a32…` 相同 | `08fbef17…` 相同 | `8b95b2d5…` = `8b95b2d5…` = `8b95b2d5…` |

- **模型 delta 全部是纯新增 `_composite` 键**（我用 sort_keys 的 JSON 规范化 `diff` 逐条核对，无其它任何改动）——所以这里的比对是名副其实的"声明 vs 无声明"。
- 三目标的产物**逐字节相同**、且与仓库**已提交**的 HTML 相同 ⇒ 本轮"声明不改变产物"成立，**没有**偷改渲染结果来迁就 schema。
- 旁证：我自跑 `pipeline.mjs` 会把 42 页重渲进 `m1/curated/renders/`（门禁自身行为），之后 `git status --porcelain` 只有本文件一个未跟踪项 ⇒ 重渲结果与提交版**逐字节一致**。

---

## 4. 迁移进度表 vs 产物（独立复算）— accept（27 / 16 / 8·13·3·2·1 全部对上）

我自己写的脚本（遍历 `m1/curated/*/*.json` 全部 43 个模型，递归找所有 `_composite` 节点）：
```
type counts: {'search': 8, 'form': 1, 'table': 13, 'login': 3, 'paginator': 2}
total instances: 27
total pages covered: 16
```
- `docs/m1/composites.md §9.5.A`：`search 8 · table 13 · login 3 · paginator 2 · form 1`，合计 **27**，覆盖 **16 页**。
- **逐类型、逐节点、逐页面全部一致**（我把 27 个节点的 `类型/页面/JSON路径` 全打印核对，与 §9.5.A「具体节点」列的清单一一对应，例如 8 表实例里 7 个在 `families-by-type/*`、1 个在 `vm-size-and-series-naming/name-structure-breakdown`）。
- 注意 `_composite` 的**唯一来源**是模型文件（`m1/curated/**`），不是渲染产物；`validate.mjs` 也是从模型判定的，所以这张表是可复算的，不是自述。

> 旁证（§6.3「裸 `_expose` 非复合件」）：我用粗暴口径（任何有 `_expose` 且无 `_composite` 的节点）得 50 节点/23 页，与 §6.3 的 **19 个/12 页**不同。**这不是矛盾**：§6.3 的口径是 `[A.4]` 里"结构性单字段控件"（频道条/tab/颜色选择器/弹幕框/评论框/支付区），我的粗暴口径把输入字段、集合元素也数进去了。我**没有**独立复现 §6.3 的 19/12，故此项标注为"未独立核算"，不计入对账结论。

---

## 5. 未迁移清单是否诚实 —— accept（抽 2 条，回模型实测）

### (1) `gov-uk/ni-rates-letters.pagination` 拟 `paginator` —— 原因成立
- **模型核实**：`m1/curated/gov-uk/ni-rates-letters.json` 的 `pagination` 节点真实内容为
  `{"_items":[{"_name":{"text":"Next"},"_action":{"verb":"navigate","to":"https://www.gov.uk/national-insurance-rates-letters/category-letters","label":"Category letters"}}]}`，
  **没有 `_ref`**；这是页面级 Next（多页指南），目标 `…/category-letters` 是**另一个未采集的页面**（`corpus/gov-uk/` 只有 `ni-rates-letters`、`register-birth-abroad`；`category-letters` 只在本页 dom.html 里作为链接出现）。
- **实测**（我把声明注入 `/tmp/v8/govuk-paginator*.json`，未改仓库）：
  - 带 `_ref:{ref:"/"}`：`pagination: paginator _ref "/" does not resolve to a page collection (E_COMPOSITE_REF_UNRESOLVED)` + `pagination._ref: ref /: empty`，exit=1 —— **与 §9.5.B 声称的错误码和现象逐字一致**。
  - 不带 `_ref`：`E_COMPOSITE_MISSING_REQUIRED`（`ref` 是必需槽）⇒ "声明会撒谎"成立，**不应**为了让本页升级而放宽 `_ref` 必需性。
- **判定：原因诚实。**（"采集缺口 + 同时缺必需槽"两条都成立。）

### (2) `sspai-com/post-114699.discussion` 拟 `form` —— 原因成立
- **模型核实**：`discussion` 真实内容 = `_items: []` + `_empty` + `input`（1 个 `_expose` text）+ `sort`（`_items` 选择控件 + `_expose`）。**确实没有 ≥2 个"一次提交的输入字段"**，且带 `_items`/`_empty`。
- **实测**（注入 `/tmp/v8/sspai-form.json`）：`composite "form" has no field slot for "_items"` / `"_empty"` (`E_COMPOSITE_NOT_ALLOWED`)，exit=1 ⇒ 评论框**真的不匹配 form**（它的 `_items`+`_empty` 在 `form` 无槽）。
- 反证也成立：注入 `search` 亦被拒（`_empty` 无槽 + 缺必需 `name`）⇒ "既非 search 也非 form"**不是**为了少迁移而随口说的。
- **判定：原因诚实。**

> 其余 B 段条目（`aws…data-transfer` 设计推迟、`mi-com/search-earbuds` 无输入节点、36kr×2/huawei×2/mi-search-phone 归 `search`）我**未逐条实测**（时间预算），但第 3 项已证明这 5 页确实作为 `search` 迁移（在 A 表里可复算），口径自洽。

---

## 6. 注册表压缩无语义变化 —— accept

### (a) 校验全过
- `node m1/validate.mjs $(find m1/curated -maxdepth 2 -name '*.json' -not -path '*/renders/*') m1/models/*/*.json` → **exit=0，48 个 `ok`，0 个 FAIL**（与 pipeline 第 143 行的口径完全一致）。

### (b) 与 `HEAD~1`（=S5 `29701fb`）的注册表深比较
```
deep-equal (canonical JSON):     true
pretty-equal:                    true
order-insensitive equal:         true
bytes  HEAD: 8170    HEAD~1: 9551   lines HEAD~1: 340
```
`JSON.parse` 前后 `JSON.stringify` 逐字节相同、且键序无关的深比较也相同 ⇒ 压缩是**纯格式整理，语义零变化**（340 行 → 紧凑）。

### ⚠ 新发现缺陷 ①（**不是本线引入**）：`validate.mjs` 遇到"单字符串子件"会**栈溢出崩溃**
- 任务给的字面命令 `node m1/validate.mjs m1/curated/*/*.json` **不"全过"**：它会连带把**生成物** `m1/curated/renders/manifest.json` 也当模型校验，随后
  ```
  exit=2   error: Maximum call stack size exceeded
  （已打印 31 个 ok 后崩溃）
  ```
- 根因（我定位到栈帧）：`model-lib.mjs#walk` 对**字符串**子节点调用 `childrenOf`，而 `Object.entries("x") === [["0","x"]]` ⇒ 对 1 字符字符串**无限自递归**。最小复现：`node m1/validate.mjs <(echo '{"a":"x"}')` → `Maximum call stack size exceeded`。（`{"pages":{}}` 不崩、`{"a":"x"}` 崩。）
- **断代**：我用**复合元语线之前**的验证器（`git archive e10de40 m1` 解到 `/tmp/v8/old/`）跑**同一输入**，输出**完全相同**的 `Maximum call stack size exceeded`（`{"a":"x"}` 与 `renders/manifest.json` 都一样崩）⇒ **这是更早轮就存在的健壮性缺陷，不是轮 47–52 引入的**。
- 严重度：**minor**（它需要喂进"1 字符字符串子件"才会触发；pipeline 用 `find … -not -path '*/renders/*'` 明确排除了 `renders/**`，并已在源码注释里声明 `renders/**` 是生成物不是策展模型，所以门禁不受影响）。但它确实会让"按字面 glob 跑校验"的人看到 exit=2，且报的是崩溃而不是可诊断的错误。

### ⚠ 新发现缺陷 ②（**本线的口径盲点，非回归**）：保真度量看不见"输入消失"
- 第 2 项③里，`search.query` 的 role 从 `field` 改判为 `state` 后**输入框整块消失**，但 `metrics.mjs` 仍是 `factFidelity=1, 58/58, missing=[]`。
- 原因：`_expose`（输入位）不计入事实集，所以"丢了一个输入控件"在保真门禁里**不可见**，只被 `composite-selftest`/`axis-selftest` 的 role 用例兜住（我自跑的门禁里 `复合元语自测 第11道`、`轴一致性自测` 都通过）。
- 严重度：**minor / 设计口径**，建议（非本轮必须）：把"复合件声明的 `field` 槽存在 ⇒ 必须有一个可交互标记"纳入度量或审计。

---

## 总体判定

| 项 | 结论 |
|---|---|
| 1 门禁（自跑） | **accept** — 42/42 保真 HTML+MD · 48 模型 · 11 道自测全过 · 采集一致性 0 未命中 · 证据一致性通过 · 视觉自查 42/42 干净，exit=0 |
| 2 schema 真的会拒绝 | **accept** — ①`E_COMPOSITE_ROWS_INCONSISTENT` ②`E_COMPOSITE_UNKNOWN_TYPE` ③role 双向实测生效（`field`⇒控件、`state`⇒不画） |
| 3 声明不改变产物 | **accept** — 3 页 × 3 目标 **逐字节相同**，且与仓库已提交 HTML 相同；模型 delta 只有 `_composite` 一个键 |
| 4 迁移进度表对账 | **accept** — 独立复算 27 实例 / 16 页 / 8·13·3·2·1，与 §9.5.A 完全一致（§6.3 的 19/12 未独立复现，已标注） |
| 5 未迁移清单诚实 | **accept** — 抽 2 条（gov-uk paginator、sspai discussion）回模型实测，原因逐字成立 |
| 6 注册表压缩无语义变化 | **accept** — 48/48 全过；与 `HEAD~1` 深比较 true；另发现 2 个**非本线**缺陷（见上） |

**没有发现复合元语这条线的回归或"声明改变产物"的偷改。** 修复者自述的关键主张（27/16、零渲染变化、role 生效、压缩无语义变化、未迁移有据）**经我独立复算/构造/逐字节比对后全部成立**。两个新发现缺陷都**不属于本线**（缺陷①断代到更早轮、缺陷②是度量口径）。

VERIFY8_DONE verdict=PASS blockers=0 majors=0 minors=2 isomorphism=holds
