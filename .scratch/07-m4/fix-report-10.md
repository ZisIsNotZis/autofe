# 07 · M4-b1 报告（fix-report-10）— `offer` 行为（不新增语法）+ 散文合并引擎修法

> **口径提示（轮 15 补记）**：本文件是**当时轮次的快照**，文中 `41`/`41/41` 均为轮 12 口径；轮 15 策展 `learn-microsoft/vm-sizes` + 修 F-051 后**当前门禁为 42 页**（保真 42/42 = 1.00、视觉自查 42/42 干净）。当前分母见 `m1/eval/m3-scale.json`。


作者：worker `M4-b1`（唯一写入者）。任务书：本轮 brief（offer 行为 / qualifier 测量 / P3 散文合并 / §4.3 反例）。
纪律：只碰 `m1/**`、`docs/m1/**`、`.scratch/**`；不动 `corpus/`；不 git 提交；40 分钟分片，每片先落盘。

## 0. 范围与关键裁定（先声明，避免误读）

- **本轮零新语法**：不新增保留键（无 `_macro`）、不新增语义角色、不动任何 closures 枚举（`vocab.json` / `vocab-domain.json` / `vocab-fields.json` 均未改）。
- **`_amount` 的“原价”由显式限定词驱动**：标记 = `qualifier === "list"`（取自提案 §4.3 `"_amount": {…, "qualifier": "list"}` 与“`qualifier: list` ⇒ 弱化 + 删除线”）。
  引擎**不做任何金额比较**；`list` 是**内部语义标记，不渲染为文案**（否则会把内部 token 印上屏，违反 F-022/F-029）。
- **qualifier 测量结果：发散（10 个取值，含费率表达式与自由文本前缀）⇒ 本轮不收紧**，登记 F-047 并给建议集。
- 需要人类决策：`vocab.qualifiers` 的**闭式化 + 显示映射**（含 `list` 的正式化）；详见 §4。这也与父代理“是否新增 `_macro`”的待决问题同源。

---

## 1. 分片进展

1. 读 brief / 提案 §4.3·§6 决策 3 / fix-report-5（M4-a 已删算术）/ `render.mjs`·`model-lib.mjs`·`validate.mjs`·`metrics.mjs`·`audit-visual.mjs`·`pipeline.mjs` / `curation-log-ae` / `failures.md`。
2. 独立复现：`render.mjs` 无金额比较（源码断言通过）；mi 三页源站 `<del>` 与模型 `_amount` 逐值核对（发现 **search-phone 7 处原价缺失**）。
3. 实现：`render.mjs` 加“显式限定词 `list` ⇒ `.was`”分支 + 恢复 `.fact.was` 样式 + `fmt` 不输出 `list` 标记；P3 连续 `_text` 段合并。
4. 数据：mi 三页 `_amount` 全部标 `qualifier: "list"`（含补回 search-phone 7 值）；apple 三页加结构化 `_duration`。
5. 自测：`foundation-selftest.mjs` 更新 D3（旧断言“无删除线分支”已过时）+ 新增 8 条 offer 断言 + 4 条 P3 断言。
6. 门禁：`pipeline` 无截图全绿 → `pipeline --shots` 全绿（41 张截图刷新）→ read 截图视觉确认（mi 划线价 / apple 分期 / sspai 正文）。
7. 记账：`failures.md` F-047 / F-048。

---

## 2. `offer` 行为（用现有键）

### 2.1 引擎改动（`m1/render.mjs`）

| 行为 | 修法 | 代码位置 |
|---|---|---|
| `_amount` 原价 ⇒ 划线价 | `_amount.qualifier === 'list'` ⇒ 渲染 `<div class="fact was">`，**纯由显式事实驱动** | `LIST_QUALIFIER` 常量（模块级）+ facts 循环分支 |
| 引擎不做金额比较 | 无 `> node._price` / `.money >`；源码断言（自测 + `grep`）| 全文件 |
| 标记不泄漏 | `fmt` 的 money 分支忽略 `qualifier === 'list'`（只把它当语义位，不当前缀文案）| `fmt` |
| 弱化样式 | 恢复 `.fact.was .val{text-decoration:line-through;color:#8493a3;font-weight:400}` | 内联 CSS |
| `_duration` 分期文案 | 既有行为（`META_KEYS` ⇒ `factHtmlInline`，`{num,unit}` ⇒ “N unit”）；本轮为 apple 三页补结构化事实，数字**来自模型事实** | facts 循环 / `fmt` |
| `_detail` 条件文案 | 既有行为（作为普通事实渲染）| facts 循环 |
| `_primary` 语义 | 未改（主价仍是 `_price`；apple 三页 `_primary = "_price"`）| — |

**反例闸门（本轮构造断言，`foundation-selftest.mjs`）**
```
ok   offer an explicit list qualifier renders the struck-through price
ok   offer the marker itself is never printed as copy
ok   offer without a qualifier there is no strike-through
ok   offer a non-list qualifier is not a was-price (gov-uk “per certificate”)
ok   offer `_duration` renders the period from the model fact
ok   offer changing the fact changes the rendered period      ← 改 24 期 → 12 期，渲染随之变
ok   offer `_detail` renders as the condition copy
ok   offer mi was-prices render (explicit fact, no amount comparison)
ok   D3 the renderer compares no money values
```

### 2.2 三个 mi 页划线价 ↔ 源站 `<del>` 逐一对照（`corpus/mi-com/*/dom.html`，已验收为 1:1）

核对脚本（值集合完全相等，且模型 `_amount.qualifier` 全为 `list`）：

| 页 | 源站 `<del>` 条数 | `<del>` 值集（排序）| 模型 `_amount` 值集 | 一致 |
|---|---|---|---|---|
| `mi-com/product-detail-mi15` | 1 | `[2999]` | `[2999]` | ✅ |
| `mi-com/search-earbuds` | 10 | `[69,119,199,249,399,699,699,849,999,1299]` | 同左 | ✅ |
| `mi-com/search-phone` | 7 | `[1599,1799,1799,2399,2799,2899,3899]` | 同左 | ✅ |

- `product-detail-mi15`：`<del>2999 元</del>` → 渲染 `¥1439`（主价）+ 灰删除线 `¥2999`（截图确认）。
- `search-earbuds`：10 张卡各出 1 条灰删除线（`¥399/¥249/¥119/¥849/¥699/¥1299/¥999/¥699/¥69/¥199`），与源站 `<del>` 逐值一致（截图确认）。
- `search-phone`：**本轮补齐的 7 处**（REDMI Note 17 Pro→1599、Redmi Note 13 Pro→1799、Xiaomi Civi 4 Pro→2799、Redmi Note 14 Pro→1799、Redmi K70 至尊版→2899、Redmi Note 14 Pro+→2399、REDMI K80 Pro→3899）。这 7 处此前因“闭式词表无 was-price 角色”被策展丢弃（`curation-log-ae`「was-price vocab gap (7)」），本轮用现有键 `_amount` + 显式限定词**如实补回**，未改动 `corpus/`。

### 2.3 三个 apple 页分期数字同源

| 页 | 源站分期文案 | 新增结构化事实 | 渲染 |
|---|---|---|---|
| `apple-com-cn/iphone-17` | `RMB 6799 起或 RMB 284/月 (24 期) 起` | `_duration {num:24, unit:"期"}` | meta 出 `24 期`（截图确认）|
| `apple-com/ipad-air` | `From $749 or $62.41/mo. for 12 mo. …` | `_duration {num:12, unit:"mo."}` | meta 出 `12 mo.`（截图确认）|
| `apple-com/macbook-air` | `From $1299 or $108.25/mo. for 12 mo. …` | `_duration {num:12, unit:"mo."}` | meta 出 `12 mo.` |

- **同源回归**：`foundation-selftest` 断言“改模型数字 ⇒ 渲染数字变”（24 期 → 12 期）。数字不再只活在 `_summary` 自由文本里。
- **如实记的边界**：`_summary` 逐句仍保留（含同一期数），故 iphone-17 页 `24 期` 出现两次（正文摘要 + 结构化 meta）。完整拆分（月度金额 `284/月` 另立事实、摘要去重）需要 `offer` 宏/新事实位 ⇒ 属被推迟的语法/词汇变更；本轮不擅自增键。

### 2.4 §4.3 反例核查（确认无副作用）

- **单一定价卡片不被误判为 offer**：`apple-{ipad-air,macbook-air,cn-iphone-17,home}` 均**无** `_amount` ⇒ 渲染 **0 处** `.was`（截图确认 ipad-air 只有 `From $749` 主价）。
- **非 `list` 限定词不划线**：`gov-uk/register-birth-abroad` 的 `_amount {£50, qualifier:"per certificate"}` 渲染为普通 `per certificate £50`，**不划线**（0 处 `.was`）——这正是需要“显式 list 标记”而非“任意限定词”的证据。
- 本轮无语法 ⇒ 不会给任何卡片新增宏层级；`selectForm` 未改。

---

## 3. `qualifier` 测量与处置（条件项）

**全量测量**（`m1/curated/**` + `m1/models/**`，10 个不同取值）：

| 取值 | 次数 | 语义归类 |
|---|---|---|
| `每 GB` | 72 | 单位价（per-unit）|
| `起始价：` | 8 | 显示前缀（文案，不是语义）|
| `From` | 6 | 起始价 |
| `起` | 4 | 起始价 |
| `3.4% +` | 3 | 费率表达式 |
| `per certificate` | 1 | 单位价 |
| `订金` | 1 | 业务文案（预订定金）|
| `2.2% +` / `2.5% +` / `+` | 各 1 | 费率表达式 |

**判定：不收紧**。取值数 **> 6**，且语义混杂（单位前缀 / 显示前缀 / 起始价词 / **费率表达式** / 业务文案）——强行收紧为闭式枚举会误伤现有语料（`3.4% +` 这种费率不是“限定词”，是费率前缀）。已登记 **F-047**。

**建议取值集**（供关词表时裁定；应映射为 `语义 token → 显示文案`，而不是直接印 token）：
`list`（原价，无前缀）、`from`（起始价，显示 `From`/`起`）、`per-unit`（显示 `每 …`）、`per-period`（显示 `/月` 等）、`tax-incl`（含税）。
现有 `3.4% +` / `+` / `起始价：` / `订金` 属**费率前缀与业务文案**，应迁出到独立事实/文案位，不能塞进这个闭式枚举。

---

## 4. P3 散文合并（引擎修法，零新语法）

**修法（提案 §6 决策 3 方案 A）**：`renderNode` 的轴分组从“只按 compare 标记”扩展为按 **kind ∈ {compare, prose, plain}** 分组：**连续的 `_text` 段（≥2）** 切为一个 `prose` 组 ⇒ 一个 `.prose` 正文块，段间**不插** `<hr class="region">`。
- **孤立的 `_text` 段保持不变**（不切出来），以免为单个事实改动既有页面（全库扫描：只有 `sspai-com/post-114716` 有 ≥2 连续 `_text` 段；`post-102392`、`stripe-com/pricing` 各只有 1 段，渲染不变）。
- 段被非 `_text` 成员打断 ⇒ 起第二个正文块（构造断言覆盖）。

**效果**：`sspai-com/post-114716` 的 9 个“剧集”区块里，`@作者：…` 与“主创解读…”两段（此前被 `<hr class="region">` 拆成两个区块）现合并为同一 `.prose`（截图确认）；`<hr class="region">` 计数 由多 → **1**。

**构造断言**
```
ok   P3 consecutive `_text` segments merge into one body block
ok   P3 no region rule between merged paragraphs
ok   P3 an interrupted run starts a second body block
ok   P3 a lone `_text` segment keeps the collection form (no prose split)
```

---

## 5. 需要人类决策

1. **`vocab.qualifiers` 闭式化 + 显示映射**（阻塞 `offer` 宏的正式化）：见 F-047/F-048。本轮 `list` 是引擎硬编码的临时语义 token；关词表后应把 `list`/`from`/`per-unit`/`per-period`/`tax-incl` 纳入并给出显示映射，同时把费率前缀与业务文案迁出。
2. **apple 分期摘要去重**：`_duration` 与 `_summary` 现并存（同一期数出现两次）。是否允许策展裁剪源站整句、把月度金额另立事实，需要与“源站逐句保留”的策展纪律一起裁定。
3. （沿用）父代理将上报的“是否新增 `_macro` 保留键”——本轮未做，也未预埋。

---

## 6. 门禁原文（`node m1/eval/pipeline.mjs --shots`）

```
[pipeline] 渲染 41/41 | 错误 0
[pipeline] 保真 1.00: 41/41
[pipeline] 模型校验: 47 个全通过
[pipeline] 校验器自测: 通过
[pipeline] 地基自测(D1/D2/D3): 通过
[pipeline] 显式降级清单（compare 标记但成不了对比表）:
[pipeline] · stripe-com/pricing · n=2 · degenerate-no-shared-attribute
[pipeline] 地基自测: 全部通过
dup-title: 华为磁吸手机支架 - 华为官网
· sspai-com-home.html                           dup-source-true(info):2

视觉自查: 41/41 干净
[pipeline] 截图 41 张, 画廊 v=muoetgto
```

**read 了哪些图（视觉确认）**
- `mi-com-search-earbuds.png`（裁上部）：10 张卡各 1 条灰色删除线原价（¥399/¥249/¥119/¥849/¥699…），主价为黑色。
- `mi-com-search-phone.png`（裁上部）：新补的 7 条删除线原价（¥1599/¥1799/¥2799/¥2899/¥2399…）与主价并列，语义正确。
- `mi-com-product-detail-mi15.png`（裁上部）：¥1439 主价 + ¥2999 灰删除线。
- `apple-com-cn-iphone-17.png`（裁上部）：`RMB 6799 起或 RMB 284/月 (24 期) 起` + 灰色 `24 期` meta + 主价 hero `起 RMB 6799`。
- `apple-com-ipad-air.png`（裁上部）：`From $749 …` + 灰色 `12 mo.` meta + 主价 hero；**无删除线**（单一定价反例）。
- `sspai-com-post-114716.png`（裁上部）：两段正文连续成块、段间无分隔线。

---

M4B1_DONE offer=done qualifier_closed=no prose=done fidelity=41/41 audit=clean
