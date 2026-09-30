# 06 · 独立验收（第 7 轮）— 轮 12/13/14：新页策展 + `offer` 行为 + `paginator` 行为 + 文档一致性

> **口径提示（轮 15 补记）**：本文件是**当时轮次的快照**，文中 `41`/`41/41` 均为轮 12 口径；轮 15 策展 `learn-microsoft/vm-sizes` + 修 F-051 后**当前门禁为 42 页**（保真 42/42 = 1.00、视觉自查 42/42 干净）。当前分母见 `m1/eval/m3-scale.json`。


验收者：独立 subagent（fresh 视角，只读 + 仅写本文件）。**不采信修复者自述**。
验收对象：`ff53863`（轮 12 策展 5 页）、`7e2b085`（fix-10 `offer` 行为）、`162ef81`（fix-11 `paginator` + apple 去重 + 文档 41）。
写于：2026-11-XX（本轮开始时先落盘，后续分片追加）。

---

## 0. 门禁原文（我自己跑的，`node m1/eval/pipeline.mjs`，EXIT=0）

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
```

## 1. 门禁真实性

独立复跑（`timeout 300 node m1/eval/pipeline.mjs`），EXIT=0，未采信任何自述：

| 门禁项 | 要求 | 实测 | 判定 |
|---|---|---|---|
| 渲染 | 41/41 | 渲染 41/41 \| 错误 0 | PASS |
| 保真 | 41/41 | 保真 1.00: 41/41 | PASS |
| 模型校验 | 47 | 模型校验: 47 个全通过 | PASS |
| 校验器自测 | 通过 | 校验器自测: 通过 | PASS |
| 地基自测 D1/D2/D3 | 通过 | 地基自测(D1/D2/D3): 通过 + 地基自测: 全部通过 | PASS |
| 视觉自查 | 干净 | 视觉自查: 41/41 干净 | PASS |

- 唯一 `dup-title` 命中为 `sspai-com-home.html` 的 `dup-source-true(info):2`，是**源站自身重复标题**（info 级，非渲染缺陷）。
- 显式降级清单仅 `stripe-com/pricing`（`degenerate-no-shared-attribute`），是已知且显式声明的降级，不是静默丢弃。
- **副作用（非本轮改动）**：跑 pipeline 会重写受版本控制的产物 `m1/curated/renders/index.html`（`git status` 显示 M，41+41 行 = 重新生成）。这是 pipeline 的正常写产物，非本轮编辑；未提交、未回退（未在授权范围内），仅记录。

## 2. 零语法变更

`git log --oneline -6`：

```
 e6e2130 triage accepted: coverage matrix of the 41 curated pages (21 archetypes, 11 thin, 8 gaps)
 162ef81 fix-11 accepted: pagination stops being silently dropped; apple installments de-duplicated with source counts; docs unified at 41
 3598643 handoff: current state snapshot (41-page gate, what is blocked on D-1, what comes next)
 7e2b085 fix-10 accepted (offer behaviour + prose merge): strike-through now follows an explicit qualifier, no arithmetic anywhere
 2f0d443 decisions for the user on one page: the _macro grammar fork, field referencability, input labels, sample scope
 ff53863 round 12 accepted: five of six exemplar pages curated, gate now 41 pages
```

`git diff ff53863~1 HEAD --stat -- m1/vocab.json m1/vocab-fields.json m1/vocab-context.json m1/vocab-domain.json m1/validate.mjs`：

```
 m1/vocab-fields.json | 24 ++++++++++++++++++++++++
 1 file changed, 24 insertions(+)
```

- 唯一命中是 `m1/vocab-fields.json` **+24 行、纯新增**（新页新字段的声明），不含删除/改写。
- 已核对无**新保留键**引入：`_macro` 等保留语法键未出现在本轮 diff。
- 判定：**零语法变更 PASS**。

## 3. 新页策展质量（5 页，抽 2）

抽查 `gov-uk/ni-rates-letters` 与 `github-com/login`（不采信自述，回 `corpus/` 与词表核对）。

### 3a. `gov-uk/ni-rates-letters` — PASS
- **表头/标签来自抓取**：`m1/curated/gov-uk/ni-rates-letters.json` 表列与 `corpus/gov-uk/ni-rates-letters/dom.html` 逐字一致——`Category letter`、`£129 to £242 (£559 to £1,048 a month)`、`£242.01 to £967 (£1,048.01 to £4,189 a month)`、`Over £967 a week (£4,189 a month)`（源站去标签正文里逐一命中）。行值 `A..Z`/`0%`/`8%`/`N/A` 等同样取自源表。
- **域字段已声明**：该页 `_fields` 实际用到 6 个键（`category-letter`、`employee-rate-low`、`employee-rate-mid`、`rate-over-967`、`employer-rate-low`、`employer-rate-mid`），我用脚本比对 `m1/vocab-fields.json` → **6/6 全部已声明，missing=[]**（这 6 个键正是本轮 diff 新增的 24 行）。
- 无凭据、无“登录后”内容；无内部键泄漏。

### 3b. `github-com/login` — PASS
- **凭据 / “登录后”内容**：`m1/curated/github-com/login.json` 只声明 `identifier`（`_label`="Username or email address"）、`secret`（`_label`="Password"），均**只有标签 + `_expose`（page-scoped identifier），无任何值**；`grep -niE 'password|secret|token|credential|"value"|after login|dashboard'` 命中的只有标签文字与 `password_reset` 链接，**0 个真实凭据/已登录内容**。源站 `corpus/github-com/login/dom.html` 去标签正文只有：用户名/密码/忘记密码/Continue with Google/Continue with Apple/Create an account/Sign in with a passkey/Terms——**无 signed-in/dashboard/repositories 内容**（正向 grep 0 命中）。
- **域字段声明**：本页不使用 `_fields`（登录输入走 `_expose` 的 page-scoped 命名空间），故无“域字段未声明”问题；`validate.mjs` 对 `_expose` 只要求 `{name,type}` 闭式类型，已满足。
- 判定：标签来源为抓取、无凭据外泄、无越权内容。

## 4. `offer` 行为

用本轮渲染产物（`m1/curated/renders/mi-com-*.html`）对 `corpus/mi-com/*/dom.html` 逐页数字比对：

| 页 | 渲染 `class="fact was"` | 源站 `<del>` | 1:1 |
|---|---|---|---|
| `mi-com/search-earbuds` | 10 | 10 | ✅ |
| `mi-com/search-phone` | 7 | 7 | ✅ |
| `mi-com/product-detail-mi15` | 1 | 1 | ✅ |

- 三页 **10/10、7/7、1/1 完全一致**；无多划、无漏划。`mi-com/home`、`shop-category-list` 源站 `<del>=0`，渲染 `fact was=0`，一致。
- **无金额比较**：`grep -nE 'node\._price|\.money *[<>]' m1/render.mjs` → **0 命中（exit 1）**。删线是跟随显式限定词（源站 `<del>`），不是靠算术比大小；与 fix-10 自述一致。
- 取样渲染片段实证：`<div class="fact"><span class="val">¥1549</span></div><div class="fact was"><span class="val">¥1599</span></div>`（现价 + 划价并列）。
- 判定：**PASS**（文本级；本轮预算未做看图，视觉确认记 §9 未做）。

## 5. `paginator` 行为

- **goto 目标**：`m1/curated/gov-uk/ni-rates-letters.json` 的 `pagination._items[0]._action.to = https://www.gov.uk/national-insurance-rates-letters/category-letters`。源站 `corpus/gov-uk/ni-rates-letters/dom.html`：`<a href="/national-insurance-rates-letters/category-letters" class="govuk-link govuk-pagination__link">`。**路径段逐字一致**（`/national-insurance-rates-letters/category-letters`）；方案+主机用站点 origin 绝对化（`meta.json` url = `https://www.gov.uk/national-insurance-rates-letters`），与源站同源。
- **渲染**：`<section class="group g-pagination"><article ...><div class="controls"><a class="ctl" href="https://www.gov.uk/national-insurance-rates-letters/category-letters">Next</a><a class="ctl" href="...">Category letters</a></div>` — 目标如实透传。此前被静默丢弃的 `<nav aria-label="Pagination">` 已回补为控件锚点。
- **无目标控件不是 `<a>`**：`render.mjs` 的 `hasTarget()` 门（line 142/384/727-728/752）在无有效 `to` 时输出 `<span class="ctl">`。全库实证：`<span class="ctl"...>` 共 **89 处**（含 `data-verb` 变体），`href=""` **0 处**，缺 `href` 的 `<a class="ctl">` **0 处**。
- 判定：**PASS**。

## 6. apple 去重
**未做**（按本轮收窄范围，仅做 6 项；见 §9/§10）。

## 7. 文档一致性

执行任务指定 grep（`README.md docs/ .scratch/*.md`）：

```
docs/m1/m4-composites-proposal.md:5    ...M3 验收后快照 36 页 / 15 站；轮 12 后为 41 页 / 22 站...
docs/m1/m4-composites-proposal.md:7    > 口径提示（轮 12 补记）：..."36"/"104" 均指该快照分母...门禁现为 41 页
docs/m1/m4-composites-proposal.md:40   36 页 / 15 站；310 个集合...
docs/m1/m4-composites-proposal.md:43   36 页里一次没被选中
docs/m1/m4-composites-proposal.md:100  M3 覆盖率声明只在 exemplar 36 页上算
docs/m1/m4-composites-proposal.md:359  14/36 exemplar 页
docs/m1/m4-composites-proposal.md:430  扫描 36 页
docs/m1/m4-composites-proposal.md:588  模型层：36 页 / 15 站
.scratch/active-work.md:26             既有 36 页未动（轮 9 采集叙述）
.scratch/active-work.md:50             36/36 ... 42/42 ...（M3 快照口径，基线节）
```

**逐条判定**：
- `docs/m1/m4-composites-proposal.md` 的 8 处是**快照测量**：line 5 当场对照"轮 12 后为 41 页"，line 7 有轮 12 口径提示声明"下文出现的 36/104 均指该快照分母"。**读者不会被误导**。
- `.scratch/active-work.md:26` 是轮 9 的**过去时记录**；`:50` 位于"## 基线（本轮开始时）"节并显式标注"（M3 快照口径）"，其后紧跟"轮 12 后现况：门禁 41 页"。
- `README.md` 现况门禁全用 **41**（41 页 / 41/41 保真 / 41/41 干净 / 47 校验）——正确。

**结论**：范围内**未发现“以当前口径呈现过期页数”的未标注位置**；所有 36 引用都带快照/基线标注。唯一可挑之处：`162ef81` 提交信息"docs unified at 41"措辞不够精确——`m4-composites-proposal.md` 正文仍字面保留 8 个"36"（靠顶部口径注兜底）。这不构成误导，记为 **minor（文档卫生）**。真缺陷计数：**0**。

## 8. 回归与纪律
**未做**（收窄范围外）。旁证：`git status` 显示无**暂存文件**（`git diff --cached` 为空）；除 pipeline 自写的产物 `m1/curated/renders/index.html`（M，41+41 行重生成）与本报告外，验收开始时工作树只有这两项。

> ⚠ 并发写入者告警（非本验收者所为）：验收后段 `git status` 额外出现 `M tools/capture/sites.json` 与未跟踪的 `.scratch/11-table-sample/`——两者均非本验收者产生（我只写了本文件）；疑似有并行 worker 在同一工作树写入。建议父代理确认写入者归属后再提交。

我自己的足迹：仅 `.scratch/06-visual-review/verification-4.md`（+ pipeline 重生成 `m1/curated/renders/index.html`）。未改任何代码/模型/文档/corpus，未提交。

## 9. 独立看图
**未做**（本轮按指令收窄，0 张图；预算优先给 6 项文本/门禁检查）。

## 10. 缺陷清单

- **blocker：0**
- **major：0**
- **minor：1** — `docs/m1/m4-composites-proposal.md`（8 行）与 `.scratch/active-work.md`（2 行）仍字面写 36；均有快照/基线标注，不误导，仅建议把提交信息"docs unified at 41"表述收窄为"门禁口径统一为 41"。
- 未做项（已知）：§6 apple 去重、§8 回归与纪律、§9 独立看图。

## 总体判定

6 项收窄检查逐条通过：门禁全绿（渲染 41/41 / 保真 1.00 / 模型校验 47 / 双自测 / 自查 41/41）、零语法变更（仅 `vocab-fields.json` +24 纯新增、无新保留键）、两页策展标签取自抓取且域字段已声明、无凭据外泄、`offer` 删线与源 `<del>` 1:1 且无金额比较、`paginator` 目标路径逐字一致且无目标控件不渲染为 `<a>`。范围内无 blocker、无 major，仅 1 条文档卫生 minor。§6/§8/§9 未做（收窄）。

VERIFY4B_DONE verdict=PASS blockers=0 majors=0 minors=1 skipped=[apple-dedup, regression-discipline, image-review]
