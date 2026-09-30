# 07 · M4-b2 报告（fix-report-11）— `paginator` 行为（零新语法）+ apple 分期去重 + 文档一致性

> **口径提示（轮 15 补记）**：本文件是**当时轮次的快照**，文中 `41`/`41/41` 均为轮 12 口径；轮 15 策展 `learn-microsoft/vm-sizes` + 修 F-051 后**当前门禁为 42 页**（保真 42/42 = 1.00、视觉自查 42/42 干净）。当前分母见 `m1/eval/m3-scale.json`。


作者：worker `M4-b2`（唯一写入者）。任务书：本轮 brief（paginator 行为 / apple 去重 / 文档 41 一致性 / 交叉引用）。
纪律：只碰 `m1/**`、`docs/**`、`README.md`、`.scratch/**`；不动 `corpus/`；不 git 提交；40 分钟分片，每片先落盘。

## 0. 范围与关键裁定（先声明，避免误读）

- **本轮零新语法**：不新增保留键（无 `_macro`）、不新增语义角色、不动任何闭集枚举
  （`vocab.json` / `vocab-domain.json` / `vocab-fields.json` **均未改**）。
  命名原语 `paginator`（`_macro` = `paginator` + `_expose page` + `_ref` + `_count`）需要 `_macro` 保留键
  ⇒ 属 **D-1 待用户拍板**，本轮**不做、不预埋**。
- **面包屑仍为已声明的不作表达**：`docs/m1/axioms-v0.md §8` 明写「导航历史（面包屑）不作表达」，
  本轮**未动面包屑**，在此保留该项为「已声明的不作表达」（防止被当成遗漏）。
- 分页的**行为**用**现有键**表达：条目级 `_action`（无捕获 `to` ⇒ 控件观感；有捕获 `to` ⇒ `<a>`）。

---

## 1. 分片进展

1. 读 brief / `docs/m1/m4-composites-proposal.md` §4.4·§5.1·§5.2 / `axioms-v0.md §8` / `render.mjs`·`model-lib.mjs`·`validate.mjs`·`metrics.mjs`·`foundation-selftest.mjs` / fix-report-10 / `active-work.md` / `decisions-for-user.md`。
2. **清点分页事实**（见 §2）：模型层 3 页有分页节点（华为 `search-laptop`/`search-phone` 的 `results.pagination` 7 项、mi `search-earbuds` 的 `pages` 2 项）；抓取层另 1 页有分页控件但被策展静默丢弃（`gov-uk/ni-rates-letters` 的 `<nav aria-label="Pagination">`）。
3. **实现（现有键）**：4 页分页改为**控件行**（条目级 `_action`）；华为页去掉只影响形态选择的 `_rel.order:sequence`（控件行本身保序）；gov-uk 补回带真实目标的分页控件。
4. **apple 分期去重**：先抓取核实源站文案次数（见 §3），再去重 intra-node 重复。
5. **文档一致性**：README 加「当前状态与门禁命令」段 + 状态行更新；历史快照加口径提示（§4）。
6. **交叉引用**：`failures.md` F-047/F-048 与 `.scratch/decisions-for-user.md` D-1 互相指向；新增 **F-049 / F-050**。
7. **门禁**：`node m1/eval/pipeline.mjs --shots` → 41/41 保真 1.00 + 视觉自查 41/41 干净 + 47 模型校验 + 两个自测全绿；read 6 张截图视觉确认（§5）。

---

## 2. 分页事实清点与处置（逐页）

**清点方法**：全库扫 `m1/curated/*/*.json` 中「成员全为页码/省略号标签的 `_items`/`_lines`」；再用
`corpus/<page>/nodes.json` 与 `dom.html` 核对抓取真相（不给模型背书）。

| 页 | 模型里的分页节点 | 源站真相（`corpus/`） | 捕获目标 | 本轮处置 | 渲染结果 |
|---|---|---|---|---|---|
| `huawei-cn/search-laptop` | `results.pagination` 7 项（1..5 … 8）| `#result_list_PageBar` 的 `<ul><li><a ref="page_index">1..8</a></li>`，href 全是 `javascript:;` | ❌ 无真实地址 | 每条加 `_action{verb:"navigate"}`；去掉只影响形态的 `_rel.order:sequence` | 控件行 `<span class="ctl">1</span>…`（**无 `<a href>`**，见截图）|
| `huawei-cn/search-phone` | `results.pagination` 7 项（1..5 … 357）| 同上（共 357 页）| ❌ | 同上 | 同上 |
| `mi-com/search-earbuds` | `pages` 2 项（1、2）| `.mi-pagenav`：`<span class="current">1</span><a href="javascript:void(0)">2</a>` | ❌ `javascript:void(0)` | 每条加 `_action{verb:"navigate"}` | 控件行 `1 2`（**无 `<a href>`**，见截图）|
| `gov-uk/ni-rates-letters` | **原无**（策展静默丢弃）| `<nav aria-label="Pagination">` 的下一页 `<a href="/national-insurance-rates-letters/category-letters">Next / Category letters</a>` | ✅ 真实地址 | **补回** `pagination` 节点（1 条，`_name`=Next + `_action{to,label}`）| 控件行 `<a class="ctl" href="https://www.gov.uk/…/category-letters">Next</a> <a …>Category letters</a>`（**有 `<a>`**，见截图）|

**关键裁定**
- 提案 §5.1 列的「4 页」里第 4 页写的是 `stripe-com/pricing`。**实测该页现在没有分页节点**，其 DOM 里的
  `NextSiblings`/`Next` 是**粘性导航的滚动目标**（`data-js-scroll-target`），**不是分页** ⇒ 不是静默丢弃。
  真正的第 4 页是 `gov-uk/ni-rates-letters`（抓取层 `rel=next`/`aria-label=Pagination` 唯一命中页）。
- 华为/mi 的分页**并非"未渲染"**：此前渲染成 `<ol class="seq">`（序号列表）/`<div class="chips">`（chip），
  即**被当成内容**而非控件。本轮把它渲染成控件行 —— 关闭的是「控件被静默当成内容」，不是「整块消失」。
- **当前页/总数**没有可渲染的事实位（`_rel.order` 只表达顺序；`_expose`/`_ref` 是原语级语义决策，与 D-2 同源）
  ⇒ 写入节点 `_intent`（显式记录，见 F-050），**不静默丢弃、不造键**。
- **面包屑不在本轮范围**（v0 §8 明示不作表达），未动。

**"查看更多/加载更多"控件（同属分页条目类型）抽查**：抓取层 41 页里 14 页源站含 `查看更多/加载更多/…`。
其中有 storyline 语义且**已建模并渲染**：36kr `home`/`information-technology`（4+1 条 `查看更多*` 链接）、
airbnb `显示全部 815 条评价`、apple `See all deals`、stripe `查看更多支付方式`、sspai `加载更多`。
其余命中是**站内导航/页脚 chrome**（华为全站 footer、taobao 分类菜单）或"展开已声明集合"的 `_action`
（airbnb 显示更多照片），**不是分页控件**，无需新增节点。`stripe-com/pricing` 的
`_lines[...]/_items[...]` 是费率规则子列表 + `查看更多支付方式`（已渲染），与分页无关。

**构造断言**（`m1/eval/foundation-selftest.mjs`，新增 7 条）
```
ok   paginator a page set with actions renders as a control row
ok   paginator an uncaptured target is a control shape, never an `<a href>`
ok   paginator the internal verb is never printed as copy
ok   paginator a captured target renders as a real link
ok   paginator huawei page controls render as a control row
ok   paginator mi page controls render as a control row
ok   paginator gov-uk next-page control carries its captured target
```

---

## 3. apple 分期文案去重（先抓取核实）

**问题**：根节点 `_summary` 句子与上一轮加的结构化 `_duration` 都含同一期数 ⇒ **同一节点内**渲染两次。

**源站出现次数**（`corpus/<page>/dom.html` 去脚本后归一 `&nbsp;`，统计可见文本；同时列出原始 DOM 计数）：

| 页 | 目标文案 | 源站 DOM 文本计数 | 源站**可见位置** | 本轮 rendered（前→后）|
|---|---|---|---|---|
| `apple-com/ipad-air` | `12 mo.` | `for 12 mo.` ×3、`12 mo` ×3 | hero ×1 + 对比块（iPad Air）×1 + 对比块（iPad Pro）×1 | **4 → 3** |
| `apple-com/macbook-air` | `12 mo.` | `for 12 mo.` ×3、`12 mo` ×3 | hero ×1 + 对比块（Air）×1 + 对比块（Pro）×1 | **4 → 3** |
| `apple-com-cn/iphone-17` | `24 期` | `(24 期) 起` ×4、`24 期` ×6 | hero ×1 + 对比块（iPhone 17/Air）+ 脚注 | **4 → 3** |
| `apple-com/iphone-16` | `24 mo.` | `for 24 mo.` ×4 | 无 `_duration`（本轮未动）| 1 → 1 |

**裁定与做法**：同一**节点**（hero）内源站只陈述该期数**一次**，`_summary` + `_duration` 的"两次"是
**我们引入的 intra-node 重复** ⇒ 去重。按 brief「保留更结构化的一处」**保留 `_duration`**，
把根 `_summary` **改写为不含该期数的表述**（不改任何数字、不删源站内容）：
- ipad-air：`From $749 or $62.41/mo. for 12 mo. Lease from $15.99/mo. for 36 mo. with Apple Upgrade`
  → `From $749 or $62.41/mo. Lease from $15.99/mo. for 36 mo. with Apple Upgrade`（期数由 `_duration` 元数据给出）
- macbook-air：同法去 `for 12 mo.`。
- iphone-17：`RMB 6799 起或 RMB 284/月 (24 期) 起` → `RMB 6799 起或 RMB 284/月 起`。

**保留的跨节点重复**：对比块里对**不同机型**（iPad Air vs iPad Pro 等）的同类分期文案是**源站本就重复**
（不同节点、不同数字），原样保留 —— 这是"源站本就重复"的合法重复，未去。

**边界（如实记）**：源站页面**整体**多处陈述分期（hero + 对比块 + 脚注），故跨节点重复保留；
本轮去掉的是**同一 hero 节点内**的自我重复。另一候选做法（删 `_duration`、留逐字 `_summary`）被 brief 的
「保留更结构化的一处」否决；若用户更看重 hero 句读（`$62.41/mo.` 与其期数相邻），可改选该做法 —— 记录备选。

---

## 4. 文档一致性核对清单（页数统一为 41）

| 文件 | 处置 |
|---|---|
| `README.md` | **新增「当前状态与门禁命令」段**：41 页/22 站、保真 41/41、视觉自查 41/41、模型校验 47、自测；门禁命令；决策页/失败日志/活跃工作链接。**状态行**由 "M0…No engine yet" 更新为 M1–M3 完成 + 41 页 + M4 进行中（待 D-1）。|
| `docs/m1/m4-composites-proposal.md` | 已有「口径提示（轮 12）」标注 36/104 为快照、当前 41；本次**额外**在 **§4.4** 加更正注：分页第 4 页由 `stripe/pricing` 更正为 `gov-uk/ni-rates-letters`（见本报告 §2）。|
| `m1/eval/m3-report.md` | 已有「口径提示（轮 12）」：36/104 为 M3 快照，当前 41。无需再改。|
| `.scratch/active-work.md` / `.scratch/decisions-for-user.md` | 已是 41/41、47 模型校验（轮 12/13 已同步）。|
| `.scratch/06-visual-review/spec.md` | 加**口径提示**：36/36、42/42 为轮 06 快照；当前 41 页/47 校验。|
| `.scratch/05-visual-defects/spec.md` | 加**口径提示**：36/36、55 为轮 05 快照；当前 41 页。|
| `.scratch/07-m4/spec.md` | 加**口径提示**：36/36、42/42 为 M4-a 快照；当前 41 页/47 校验。|
| 历史 round 报告（`06-visual-review/fix-report-1..4.md`、`verification.md`、`rounds.md`、`07-m4/fix-report-5.md`）| **不改正文**（它们是当时快照的逐轮记录，改写即篡改历史）；由各 spec 顶部口径提示统一指向当前分母。|
| `docs/**` 其余、`m1/eval/{rubric,calibration-human}.md` | 无当前分母引用（`layout-axes.md` 的 55/98 已有口径说明；`36kr` 非页数）。|

**交叉引用**：`m1/failures.md` F-047/F-048 各加一行指向 `.scratch/decisions-for-user.md` **D-1**；
D-1 顶部加一行反向指向 **F-047/F-048/F-050**。新增 **F-049**（站点相对 URL 不能作 `_action.to`）、
**F-050**（`paginator` 当前页/被分页集合无表达位，受阻于 D-1）。

---

## 5. 门禁原文（`node m1/eval/pipeline.mjs --shots`）

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
[pipeline] 截图 41 张, 画廊 v=muoffthk
```

**read 了哪些图（视觉确认，均裁切局部）**
- `huawei-cn-search-laptop`（底部）：页码 `1 2 3 4 5 … 8` 现为**控件行药丸**（浅灰描边圆角），**无下划线/链接色** ⇒ 非 `<a>`。
- `mi-com-search-earbuds`（结果卡之后）：页码 `1 2` 同为控件行药丸。
- `gov-uk/ni-rates-letters`（底部）：`Next` 与 `Category letters` 两枚**蓝色链接药丸**（有真实 `<a href>`）。
- `apple-com/ipad-air`（顶部 hero）：`…for 36 mo. with Apple Upgrade` 后仅一处 `12 mo.` 灰元数据，**无重复**。
- `apple-com-cn/iphone-17`（顶部 hero）：`RMB 6799 起或 RMB 284/月 起` + 一处 `24 期` 灰元数据，**无重复**。

---

## 6. 未决 / 遗留（不本轮）

1. **`paginator` 命名原语**（`_macro` + `_expose page` + `_ref` + `_count` + 数字页码互不相同校验）⇒ 待 **D-1**。
2. **F-049**：站点相对 URL（`/path`）不能入 `_action.to`（校验器当内部路径解析）⇒ 需语法/校验口径裁定。
3. **F-050**：分页的"当前页/被分页集合"无可渲染事实位（本轮写入 `_intent`）。
4. apple 去重的备选做法（删 `_duration` 留逐字 `_summary`）见 §3 边界。
5. 采集中性：14 个"查看更多"页里多数是站内导航 chrome；真正 storyline 的加载更多已建模（§2）。

FIX11_DONE paginator=4 pages_explicit=4 apple_dedupe=done docs=yes fidelity=41/41 audit=clean
