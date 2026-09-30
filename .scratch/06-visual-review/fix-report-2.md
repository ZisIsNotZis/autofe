# 修复报告 2（渲染器族 · R4/R5/R7 + 父代理裁定）

范围：`rounds.md` 轮 2 条目 + 父代理裁定（集合形态里带 `label` 的 `_action`）。唯一写入者：本 worker。
基线：`dd5b94e`（fix-1 已接受）。

**先读这一条（影响本轮全部判定）**：四组视觉复核（23:30 归档）看的是 **09-30 19:50 的 PNG/HTML**，而 `m1/render.mjs` 已在 23:34 被 checkpoint + fix-1 改写（`git diff 9c54c7f..HEAD -- m1/render.mjs`：+146 行）。因此若干部件在**当前代码里已不复现**；每条都按"先复现再修"重新判定（下文字面给出复现命令与结果）。本轮开始时 `m1/curated/renders/*.png` 仍是 19:50 的旧图（HTML 已新）——**这是上一轮复核误判的来源之一**；收尾时已用 `node m1/eval/pipeline.mjs --shots` 重出 36 张 PNG。

## 分片进展（每片一行）

- **分片 0（复现/判定，只读）**：R5 已不复现（`actionKids.forEach` 现在位于 `length >= 2` 块内）；R4a 已不复现（`panels._rel.order="sequence"` → `ol.seq` 11 行带编号）；R4b 面板体**在抓取里就不存在**（源站加载态）→ 采集缺口。
- **分片 1（R7a）**：对比表行标题去掉内部键兜底。→ 门禁绿。
- **分片 2（父代理裁定）**：新增 `itemExtra()` 并把带 label 的动作接入 chips / list / seq / deflist / controls 五个集合形态。→ 门禁绿（中途一次 33/36，见"已修"里的保真契约说明）。
- **分片 3（R7b/R7c）**：`_rating`/`_rating-count` 带角色与单位进 meta 行；句读成员集合走纵向 `chips-rows`；airbnb 模型去重。→ 门禁绿。
- **分片 4（R7e/R7f）**：未做（见"未修与原因"）。
- **分片 5（门禁 + 截图）**：`node m1/eval/pipeline.mjs --shots` → 保真 36/36 + 视觉自查 36/36 干净 + 36 张新 PNG。

## 已修（逐条：findings 来源 → 改动 → 截图验证方式）

### R5 小米净化器「用户评价」入口被静默丢弃【findings-4 blocker】— 判定：当前代码已不复现，未改代码
- 复现命令与结果：`node m1/render.mjs m1/curated/mi-com/product-detail-mi15.json /tmp/mi15.html && grep -o 'g-reviews.\{0,120\}' /tmp/mi15.html`
  → `<section class="group g-reviews"><article class="node depth-1"><a class="action verb-open" href="https://www.mi.com/shop/comment/21096.html">用户评价</a></article></section>`
- 根因（findings-4 所述）是 `actionKids.forEach(...) => itemsConsumed` **在** `if (actionKids.length >= 2)` **之外**，导致单个 action-only 子节点"既不渲染又被 continue 跳过"。当前代码该行已在 `if` 块内（checkpoint 已修）：只有 ≥2 个工具时才收进工具条，单个动作节点回落到正常节点渲染。
- 形态合规：渲染为**控件**（`.action` 深色按钮，保留真实 `href`），不是 promo。
- 截图验证：`/tmp/fix2-mi-com-product-detail-mi15.png` y≈1300 区域裁切 → 「喜欢」胶囊上方、正文底部出现深色按钮「用户评价」（见裁切图 `crop-m1.png`）。
- 同族风险（所有"只有动作没有文字"的节点）：脚本扫描全部 33 个模型，顶层/子树里 `action` 唯一内容的节点只有 mi15 `reviews`，已确认渲染。

### R4 grafana play-home：面板连排【findings-1 blocker】+ 面板体丢失【findings-1 major】
- (a) **连排已不复现**：`panels._rel.order="sequence"` → `selectForm(items,'sequence') => 'seq'` → `render.mjs` 的 `renderSeq` 输出 `<ol class="seq">`，11 个 `<li>` 各占一行并带编号。复现：`grep -o 'g-panels.\{0,200\}' m1/curated/renders/grafana-play-play-home.html` → `<ol class="seq"><li>Introduction</li><li>Color background</li>…`。未改代码。
- (b) **面板体"丢失"是采集缺口**（任务书要求先判定"面板体是否在抓取里"）：
  - 证据：`corpus/grafana-play/play-home/dom.html` 的每个 panel content 为 `<div>Loading plugin panel...</div>`，容器带 `data-testid="loading-plugin-panel-18"` `data-plugin-id="loading-plugin"`；`corpus/.../nodes.json` 里这些 panel 的 `name` 同样只有 `Introduction Loading plugin panel...`。
  - 判定：**抓取里没有面板体内容**，只有源站自己的加载态文案。按 F-031/F-013（加载态不是内容事实）与 bilibili「弹幕列表填充中…」同例，模型侧**不补**（补即抄加载态），渲染器无缺陷。记入 `m1/failures.md` **F-035** 与"采集待办"。
- (c) 顺带复核 findings-1 的第三项（工具栏控件与横幅同形）：工具栏 `_action`-only 集合现走 `.controls`+`.ctl`，横幅（`banners`，label==name 的导航）走 chip/链接，两条形态已分离；本轮在 controls 里为「Enter edit mode / Edit」补出了源站可见控件文字（见分片 2）。
- 截图验证：`m1/curated/renders/grafana-play-play-home.png`（本轮重出）y≈130–200 为工具栏控件、y≈310 起为 1..11 编号行。

### R7a 对比表行标题印英文键【findings-4 major】
- 改动（`m1/render.mjs` `renderCompareTable`）：`childLabel(key) ?? FIELDS[key]?.label ?? key.replace(/^_/,'')` → `childLabel(key) ?? FIELDS[key]?.label ?? ''`，即「子节点 `_title` → 词典标签 → 无标签」，**绝不印内部键**。
- 验证：`grep -o 'cmp-row">[^<]*' m1/curated/renders/apple-com-cn-iphone-17.html` → 行标题为 `显示屏/芯片/摄像头/电池/Apple 智能/购买`（子节点 `_title`）+ 颜色名，**无** `display/chip/camera/battery/ai/buy`；保真门禁未下降（36/36）。
- 残留（1 处）：该页有一行标签为空 —— 对应子节点既无 `_title`、`FIELDS` 也无该键，按裁定「都没有则不显示标签」留空白（绝不印内部键）；宜由模型侧补该子节点的 `_title`（模型侧小改，本轮未做）。

### 父代理裁定：集合形态里带 `label` 的 `_action` 必须渲染为控件【约 30 处】
- 改动（`m1/render.mjs`）：新增 `itemExtra(it)`，返回 `{linkTo, ctl}`——
  - 有 `label` 且与条目名**不同字** ⇒ 条目名作内容（不再被顶替），另出 `<a class="ctl">`（有 `to`）/`<span class="ctl">`（无 `to`）；
  - 有 `label` 但与条目名**同字或互为子串**（同一事实的两种写法）⇒ 不重复出第二遍，条目名降级为链接目标（F-020，现状维持）；
  - 无 `label`（F-020 无标签导航/open）⇒ 条目名降级为链接（现状维持）。
  接入 `renderChips` / `renderList` / `renderSeq` / `renderDeflist` / `renderControls` 五个集合形态（对比表格子本轮未改，见"未修"）。
- **保真契约（重要）**：首版把 `renderControls` 改成"label 顶替 `_name`"，门禁立刻掉到 **33/36**（apple-com/home、bilibili video、grafana play-home 的 `_name` 事实在 HTML 里消失 —— 违反"每个事实都必须渲染"）。最终实现为：条目名照常输出，源站控件文字另出一枚控件，二者同字/互为子串时只留信息更全的一处。门禁回到 36/36。
- 验证（渲染 HTML 逐差异比对，`git show HEAD:<html>` vs 现产物）：
  - apple-com/home：`<span class="ctl">Sabrina Carpenter…</span><a class="ctl" href="https://music.apple.com/…">Listen now</a>`（9 张服务卡 = 条目名 + 源站 CTA）；
  - huawei consumer-phones：卡片同时有商品名（h3）、价格、`购买`（`.action`）、`了解更多`（`.ctl`）；`grep -c '>buy<'` = 0；兄弟集合 `Pocket 系列` 里 `HUAWEI Pocket 2 优享版<span class="ctl">了解更多</span>`；
  - grafana toolbar：`<span class="ctl">Enter edit mode</span><span class="ctl" data-verb="operate">Edit</span>`（源站可见文字是 Edit）；
  - stripe pricing / aliyun home / apple ipad-air / sspai home：`deflabel` 从"整条名字当链接"改为「名字（内容）+ 控件文字（控件）」。
- 截图验证：`/tmp/fix2-huawei-cn-consumer-phones.png` y≈200 裁切 → 「起 ¥19999 / 购买（描边胶囊）/ 了解更多（深色按钮）」；mi15 y≈1300 → 「喜欢」「用户评价」两个控件。

### R7b 裸数字无标签无单位 + 同一事实重复【findings-1 major】
- 渲染器（`m1/render.mjs`）：新增 `ROLE_UNIT = {_rating:'分', '_rating-count':'条评价'}` 与 `roleFact()`；`_rating`/`_rating-count` 不再落进 `bodyLead` 的裸事实，而是进 meta 行并带单位 ⇒ 「4.86 分 · 815 条评价」（正是任务书给的形态）；`renderDeflist` 的分项评分同样带「分」⇒「干净卫生 4.8 分」。
- 模型（`m1/curated/airbnb-com/room-28871.json`，最小 diff 9 行）：
  - 删 `overview.rating._rating` / `._rating-count`（裸数字各占一行的来源；该节点保留源站句子 `评分为 4.86 星（满分 5 星）。` 与「815 条评价」入口）；
  - 删 `reviews._detail`（`5星中的4.86星，来自815条评价` 与新的 meta 行是同一事实）。
- 验证：`node m1/validate.mjs m1/curated/airbnb-com/room-28871.json` → `ok`；截图裁切 `/tmp/crop-a1.png`：`总体评分 / 4.86 分 · 815 条评价 / [评价的运作机制][显示全部 815 条评价] / 5 行评分分布 / 干净卫生 4.8 分`。

### R7c 评分分布逐行化【findings-1 major】
- 根因（复现）：分布集合走 `chips`，容器 `.chips{display:flex}` 使 `.chip-item{display:block}` 失效 ⇒ 5 档排成一行连续文字（`1 星，0% 的评价` 末句因此被截断的观感）。
- 改动（`m1/render.mjs`）：成员含**句读**（`，。；、`）时容器加 `chips-rows`（`display:block`，每条一行）。刻意**不用长度阈值**，避免把 aliyun 合规标签、apple 规格、mi15 保障条等正常 chip 集合一并改成纵向（首版用 `长度≥14` 时命中 7 页；收窄到句读后只剩 airbnb 分布、bilibili 一组含「、」的集合、stripe pricing 的三组句子要点）。
- 验证：截图 `/tmp/crop-a1.png` → 「5 星，88% 的评价 / 4 星，11% 的评价 / … / 1 星，0% 的评价」5 行。

### 已经由 checkpoint/fix-1 落地、本轮复核确认无需再动
- **R7d `order: time|sequence` 顺序感**：`selectForm(items, order)` + `renderSeq`（`<ol class="seq">`）+ 仅在"纵向序列"上挂 `.timeline` 导轨（不再给网格画导轨，修掉 sspai-matrix 的"残留竖线"）。aliyun product-ecs「产品动态」4 条 → 编号行；grafana 面板名 → 编号行。
- **R7g/R7h**（`renderDeflist` 空标签列、页头 `_brand` 与根 meta 行重复）：已修，`grep -rn '<div class="deflabel"></div>' renders/` = 0；`grep -c 阿里云 renders/aliyun-com-product-ecs.html` = 1。

## 未修与原因（含层级与证据）

1. **R7e 日期本地化/无标签【findings-4 minor】— 未做**。层级：renderer（格式）+ model（语义标签）。为何不做：`_datetime` 的"人读格式"取决于页面语言（36kr/sspai 中文、gov-uk 英文，渲染器当前无语言信号），改格式或加「发布」前缀都属于**新增可见文案/契约**，按纪律先交"需要人类决策"（下方第 1 条），不在本轮静默决定。
2. **R7f 无标题尾块的区域分隔【findings-1 major】— 未做**。`renderStack` 已有 `hr.region`（区块内无标题块跟随有标题块时输出），但 airbnb「地段 616 / 待客之道 582 / …」十行是 `reviews` 的**命名子节点**（走 `for (const c of kids)` 的 `<section class="group">` 分支），不经过 `renderStack`；给兄弟 `<section>` 之间插 `hr.region` 会改动全库 36 页的区块节奏，超出本片预算，留待专门一轮（建议与 R7b 的 `_count` 单位一起做：`地段 616 条评价`）。
3. **对比表格子里的带 label 动作**：`cellOf()` 仍只输出子节点的 `_detail/_text/_name/_title`。原因：`td` 是自查脚本的重复内容检查对象，且该分支已能靠子节点自身文字承载信息（`buy` 子节点有 `_title:"购买"`），本轮不扩大改动面；已在报告中留痕，供下一轮评估。
4. **B 站横幅、淘宝会场空卡片、airbnb 图墙 alt、ipad-air 行内混排**：任务书划归轮 3，未触碰。
5. **`_count` 无单位**（airbnb mentions 的 `616`、bilibili 的裸互动数）：属"角色数值带单位"的同一族，但 `_count` 的单位依赖上下文（条评价 / 项设施 / 次），无法由渲染器唯一推定；需模型侧补 `unit` 或人类裁定词典单位 —— 见"需要人类决策"第 2 条。

## 需要人类决策

1. **日期与数值的本地化文案由谁提供**：渲染器当前对所有页面输出 `2025-06-30` 这类 ISO 原样值。要变成「2025 年 6 月 30 日」「发布于 …」需要（a）把"页面语言"作为渲染输入（新契约：模型或渲染上下文声明 `lang`），或（b）由模型侧在 `_datetime` 的值里给出人读文本（content，非渲染器发明）。二者都是契约级选择，本轮不实现。
2. **角色数值的单位表**（`_count`/`_measure`/`_duration` 的单位）：是否在 `m1/vocab.json` 的角色层声明默认单位/标签（渲染器据此补「条评价/次/项」），还是要求模型每条 `num` 自带 `unit`（现状，`ROLE_UNIT` 里我只对无歧义的 `_rating`/`_rating-count` 做了内置）。前者是词汇表变更，需先走 failures/评审流程。
3. **控件集合里「条目名 + 控件文字」同时出屏的观感边界**：本轮按裁定做了（若同字或互为子串则只留一处）。当二者都短且不同（如 grafana「Enter edit mode」+「Edit」）会出现两枚并排胶囊；是否改为"控件文字可见 + 条目名进 title/aria"属观感取舍，留待裁定。

## 采集待办（capture，非本轮范围）

- grafana-play/play-home：截图时面板插件仍处于 `Loading plugin panel...`，面板体内容缺失（F-035）。
- mi-com/home 三张纯白图带（懒加载未渲染即截图）、mi/apple/bilibili/sspai 全页零图（T-109 未闭合）。
- taobao-com/home 四会场只有价格（商品名/图未采集）。

## 门禁结果（pipeline 最后输出原文）

命令：`node m1/eval/pipeline.mjs --shots`（exit=0）
```
[pipeline] 渲染 36/36 | 错误 0
[pipeline] 保真 1.00: 36/36
· huawei-cn-consumer-phones.html                dup-source-true(info):1
· sspai-com-home.html                           dup-source-true(info):2

视觉自查: 36/36 干净
[pipeline] 截图 36 张, 画廊 v=muoahruq
```
模型校验：`node m1/validate.mjs m1/curated/airbnb-com/room-28871.json` → `ok`。

## 改动文件

- `m1/render.mjs`：R7a 行标签、`itemExtra()`（chips/list/seq/deflist/controls）、`ROLE_UNIT`+`roleFact`（meta 行与 deflist 的评分单位）、`chips-rows`。
- `m1/curated/airbnb-com/room-28871.json`：去重 9 行（`overview.rating._rating/_rating-count`、`reviews._detail`）。
- `m1/failures.md`：F-033 / F-034 / F-035。
- 产物：`m1/curated/renders/*.html|*.png`（渲染器输出）、`m1/eval/m3-final.json`、`renders/index.html` 画廊（由 pipeline 生成）。
- 未提交（按纪律，父代理统一提交）。

FIX2_DONE fixed=5 deferred=4 decisions=3 fidelity=36/36 audit=clean
