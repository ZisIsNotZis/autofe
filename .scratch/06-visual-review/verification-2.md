# 独立验收（第 5 轮）

验收者：fresh reviewer（未参与本轮修复）。方法：把 `fix-report-4.md` 的自述当**待验证主张**；自跑门禁、独立 `read` 渲染产物、回到 `corpus/` 核实抓取背书、`git` 只读断代、构造合成页验证新自查灵敏度。只写本文件；未改代码/模型/文档、未 git 提交、未触碰 `corpus/`。

**看图方法说明（重要）**：仓库里 36 张 `m1/curated/renders/*.png` 是**过期**的（最后一次由 fix-3 `cd8f94d` 更新；fix-4 只改了 HTML 未刷新截图，见"新发现缺陷 ①"）。因此我**没有**采信已提交的 PNG，而是用 `chrome-headless-shell` 对**当前 HTML** 重新截图到 `/tmp/ver2/*.png` 后逐页 `read`，避免被旧图误导。

## 门禁（原文）

`node m1/eval/pipeline.mjs`（exit=0，我自跑）：
```
[pipeline] 渲染 36/36 | 错误 0
[pipeline] 保真 1.00: 36/36
· huawei-cn-consumer-phones.html                dup-source-true(info):1
· sspai-com-home.html                           dup-source-true(info):2

视觉自查: 36/36 干净
```

`node m1/eval/audit-visual.mjs --all`（exit=0，我自跑；区分 hard/info）：
```
· apple-com-cn-iphone-17.html   dup-title-source-true(info):1 dup-source-true(info):1   (dup-title: Apple 智能)
· apple-com-ipad-air.html       dup-title-source-true(info):1                            (dup-title: iPad Air)
· huawei-cn-consumer-phones.html dup-title-source-true(info):1 dup-source-true(info):1   (dup-title: HUAWEI Mate XT 2 非凡大师)
· huawei-cn-search-phone.html   dup-title-source-true(info):1                            (dup-title: 华为磁吸手机支架 - 华为官网)
· sspai-com-home.html           dup-source-true(info):2

视觉自查: 36/36 干净
```
所有命中行都是 `(info)` 级（源站自身重复），`hard` 计数 = 0 → 36/36 干净成立。**已亲自区分 hard 与 info**。

`node m1/validate.mjs m1/curated/*/*.json` → 36 条全部 `ok`，exit=0。

## 逐条结论（accept / reject + 我亲眼看到的）

### 1. 单位叠加回归 — **accept**
- 全库搜「数字 + 两个相邻单位 token」：以**强制空格**语义（= 自查口径）扫 36 页 HTML → **0 命中**。
- 代码：`m1/render.mjs:235` `roleFact = fmt(v) + (ROLE_UNIT[key] && !hasOwnUnit(v) ? ' ' + unit : '')`；`hasOwnUnit` 判定 `{num,unit}` 自带 `unit`。模型实测：`search-earbuds._rating-count = {num:870, unit:"人好评"}`（自带 unit）→ 渲染 **`870 人好评`**（不再追加）；`airbnb._rating-count = {num:815}`（无 unit）→ `815 条评价`（兜底仍生效）。**两条路径都对**。
- 看图（新截图）`mi-com-search-earbuds` 猜你喜欢区实测：`870 人好评`、`23.3 万人好评`、`2552 人好评`、`4.8 万人好评`… 全部**单单位**；旧文案「870 人好评 条评价」已消失。`mi-com-search-phone` 同（`870/2552/8389 人好评`）。
- `grep '人好评 条评价'` = 0；`grep 条评价` = 3（都在 airbnb 合法处）。

### 2. airbnb 图墙第 5 张重裁 + 其余 4 张 — **accept**（附分辨率限制）
- **我亲自 read 了** `m1/curated/assets/airbnb-room-photo-5.png`（272×178）：内容是浴室实景（镜/卷筒纸/兰花/挂画），**无任何源站 UI 元素**。
- 对照：`git show 37d4599^:...photo-5.png`（旧 273×231，39007B）我 read 后**确认旧图右下角烘进了源站「显示所有照片」白色胶囊按钮**（栅格图标 + 文案）→ 该 bug 真实存在、本轮确已消除。
- 其余 4 张我逐张 read（montage 2×2）：photo-1 卧室、photo-2/4 阿姆斯特丹街景、photo-3 街景/建筑，**均无源站覆盖层**。尺寸：photo-1 561×477（可用），photo-2/3/4 = 273×239/231（原生即低分，满幅 `width:100%` 渲染约 3.8× 上采样，肉眼发糊）。**分辨率属采集侧限制，可接受但记为 minor**。

### 3. linear 同名 H2 — **accept**（新标题有抓取背书）
- 渲染 HTML 现只有 3 个 h2：`Purpose-built` / `Changelog` / `Powering the companies building the future`，**无重复**。
- 回查 `corpus/linear-app/home/dom.html`：`Purpose-built` **确实存在**（`<span class="sc-KOGVz gPncVY">Purpose-built</span>`，紧跟 `<p>Linear is shaped by the practices and principles of world-class teams.</p>`，正是 `proof._summary` 的出处）。**是源站原文，非臆造**。
- `Powering…` 在 corpus dom.html 只出现 **1 次**（logo 墙前 `<p>`），nodes.json 0 次 → 旧模型把它同时用作 `proof._title` 和 `customers._title` 造成重复，本轮改 `proof._title` 正确。
- 看图（新截图）：页面第一段 H2「Purpose-built」，底部「Powering the companies building the future」各一次。**旧截图（已提交 PNG）里仍是两次**，那是过期图（见缺陷 ①）。

### 4. B 站搜索框标签来源 — **accept**（附语义 caveat）
- `磊哥游戏` 在 `corpus/bilibili-com/home/dom.html` 与 `nodes.json` 各出现 1 次，源为 `<input class="nav-search-input" … placeholder="磊哥游戏" title="磊哥游戏">`。**抓取背书成立**。
- 模型 `search._label = {text:"磊哥游戏"}`，`_expose.name = "query"`。
- aria 内部键消除：全库 `grep 'aria-label="query"'` = **0**；所有 `aria-label` 现均为源站文案（磊哥游戏/请输入关键词/站内搜索/请输入关键字/入住日期…）。`render.mjs:565` 改为 `lbl ? aria-label=lbl : ''`，无标签时不写内部键。看图：搜索框上方有可见「磊哥游戏」标签，不再是空框。
- caveat：源站该字是**轮播热搜提示**（动态），本轮固化为静态标签；fix-4 已列入"需要人类决策"，属实。记 minor。

### 5. 新增两条自查有效性 — **accept**
- 构造合成脏页 `/tmp/ver2-dupe.html`（同名 H2 两次 + `870 人好评 条评价` + `4.86 分 条评价`）→ `⚠ unit-stack:2 dup-title:1`（hard，0/1 干净）。
- 对照干净页 `/tmp/ver2-clean.html` → `1/1 干净`。**两条自查都能真的报警**。
- 全库：`audit-visual.mjs --all` → 36/36 干净；`unit-stack` hard 命中 0；`dup-title` **只**出 `-source-true(info)`（apple/huawei 源站确有的重复标题）。hard 与 info 分级正确，不会误伤源站重复。

### 6. 回归与纪律 — **accept**
- 门禁：保真 **36/36**、视觉自查 **36/36 干净**（见上）。
- `validate.mjs m1/curated/*/*.json`：**36/36 ok**。
- `corpus/` 零改动：`git diff --name-only HEAD~5 HEAD -- corpus/` 空；`git status --porcelain` 除我新写的 verification-2.md 外为空。
- 无 HTML/CSS 逃生口：`m1/render.mjs` 本轮 diff 仅 2 处（`hasOwnUnit/roleFact`、aria），逐行走 `esc()/fmt()`；全库产物 `<script` 计数 0。
- `_intent` 未泄漏：`grep -rlo '_intent' m1/curated/renders/*.html` = **0 文件**。
- 内部动词上屏 0；`href="key:` 0。

### 7. 独立看图复验（≥8 页，用当前 HTML 的新截图）— **accept（真的合理）**
复看：linear-app-home、bilibili-com-home、mi-com-search-earbuds、mi-com-search-phone、taobao-com-home、36kr-com-search-ai、apple-com-iphone-16、huawei-cn-consumer-phones、airbnb-com-room-28871、aliyun-com-product-ecs（+apple-com-cn-iphone-17）。
- linear：结构清晰（H1 → 摘要 → 编号 ol → Purpose-built → Changelog 时间轴 → Contact sales 胶囊 → customers 列表 → Get started）。合理。
- bilibili：标题 + 搜索标签 + 「第五人格亲密之月」粉色活动主视觉 + 视频卡网格（时长/UP主/日期/播放量/弹幕）。合理（横幅左侧排布留白 = 旧 minor）。
- mi-com search-earbuds/phone：分类/排序 chip、收货地、复选框、商品网格（名+价+划线原价+补贴）、猜你喜欢（名+价+**单单位**好评+加入购物车）。合理。
- 36kr search-ai：搜索框+站内搜索胶囊、类型/排序 chip、结果卡（标题+摘要+日期）。合理（H1 仍 SEO 串 = minor）。
- apple iphone-16 / huawei consumer-phones：分区块、卡片、控件（购买/了解更多胶囊）齐备，无被吞控件。合理。
- airbnb：标题/摘要/共享·加心愿单 + 大图 + `4.86 分 · 815 条评价` meta + 图墙 5 张（已无假按钮）+ 评价分布逐行。合理。
- aliyun product-ecs：特性 deflist + 实例卡（价+立即购买）+「产品动态」编号 1..4。合理。
- 结论：不是"仅不再报错"，而是**内容与版式都成立**。

### 8. 上轮未指派的 3 条 minor 现状 — **如实记录**
- **36kr 三页 SEO 串 H1**：仍在。`search-ai` = `人工智能相关文章_36氪`、`search-viz` = `数据可视化相关文章_36氪`、`home` = `36氪_让一部分人先看到未来`。**回查 corpus：这三条正是源站 `<title>` 原文**（`dom.html` 的 `<title>` 一致；页内 `<h1>` 其实是「36氪APP」侧栏）。即模型用页面标题当 H1 = 抓取背书，**不算捏造**；是否换成页内 h1 属裁决 → 低优先级，维持 minor。
- **mi15 底部 assurance chip 连排**：仍在。HTML `<div class="chips">发货说明 / 7天无理由退货（到店自取拆封后不支持）/ 运费说明 / 企业信息 / 售后服务政策…</div>`，仍是一行密排、无区块标题 → minor，不值得单独返工。
- **taobao 猜你喜欢单列裸价格**：仍在。27 个商品仍是整行 block（蓝链接标题 + 裸 `¥` 价格），非网格 → 与源站布局不符属设计/采集侧，minor，不值得单独返工。

## 新发现缺陷（blocker/major/minor + 证据）

### ① [minor · 证据/流程] 已提交的渲染截图**过期**，与 fix-4 的 HTML 自相矛盾
- 证据：`git log --oneline -1 -- m1/curated/renders/*.png` = `cd8f94d (fix-3)`；而 fix-4 改了 `linear/bilibili/mi-com-search-earbuds/mi-com-search-phone/taobao` 的 HTML（提交 `37d4599`）。工作树 `renders/*.png` mtime 00:12:58 < 对应 HTML mtime 00:30:05（落后约 17 分钟），`git status` 干净 ⇒ 提交的 PNG 与提交的 HTML 不一致。
- 后果实测：提交版 `linear-app-home.png` still 显示「Powering…」H2 **两次**（即已被修掉的 bug）——**若盲信提交图会误判 fix-4 未生效**。我因改用新截图才判对。
- 归因：`pipeline.mjs` **不带 `--shots` 时不重出截图**，而 rounds.md 的门禁命令正是 `node m1/eval/pipeline.mjs`（无 `--shots`），故 fix-4 跑门禁时截图未刷新，又被 parent 一并提交。
- 影响：HTML 交付物/门禁/模型/corpus **均无问题**；仅"已提交的可视证据"与当前状态不符（spec P1/P3 以 PNG 为复核介质 → 会污染后续复核）。
- 建议：`node m1/eval/pipeline.mjs --shots` 重出并提交 5 张 PNG（一次性动作，非产品返工）。

### ② [minor] bilibili 搜索标签把"动态热搜提示"固化为静态标签
- 见结论 4。源站是轮播热搜（动态），本轮冻结为 `_label`。视觉可用、有抓取背书，但语义不等价 → fix-4 已列入"需要人类决策"，**标记保留**。

### ③ [minor] airbnb「地段 616 / 待客之道 582 …」仍无单位（capture 缺口）
- HTML `<div class="deflabel">地段</div><div class="defval">616</div>`。回查 `corpus/airbnb-com/room-28871/nodes.json`：源文本就是 `客人评价提到 地段 616 待客之道 582 …`，**无任何单位词**。按裁定 2（引擎不得推定单位）+ 禁止发明，保留数字 + 记采集待办正确。语义不完整但**不可由抓取补**。

### ④ [minor] airbnb 缩略图 2–5 原生低分（273px）满幅约 4× 上采样发糊
- capture 侧限制，fix-3/fix-4 均已声明；不属本轮返工。

### ⑤ [minor] 资源"烘进源站 UI"仍无自动自查
- 上轮两条自查盲区建议：`unit-stack` 已补 ✅；"资产像素里烘按钮"**仍只能靠人工 read**（本轮 photo-5 即靠人工发现）。列为已知盲区。

## 回归与纪律检查
见结论 6。补充：`git log --oneline -5` 为 `37d4599 fix-4 → 5b52655 M4提案 → 3f0a986 round-4 verify → 6d11b23 handoff → cd8f94d fix-3`，无历史改写；本轮改动面只落在 `m1/render.mjs`、`m1/eval/audit-visual.mjs`、`m1/curated/{linear-app,bilibili-com}/*.json`、`m1/curated/renders/*.html`、`m1/curated/assets/airbnb-room-photo-5.png`、`m1/failures.md`（+ 非本轮的 `docs/m1/m4-composites-proposal.md`）。`corpus/` 零改动。无暂存文件。

## 总体判定: PASS

六项被指派缺陷**逐条独立复现并确认已修**：单位叠加（读图+模型+代码三证）、airbnb 第 5 图（我亲读旧/新图）、linear 同名 H2（corpus 背书 `Purpose-built`）、B 站搜索标签（corpus 背书 + aria 去内部键）、两条新自查（合成页验证有效 + 全库 36/36 干净）、回归门禁（保真 36/36、validate 36/36、corpus 零改动、无逃生口、无 `_intent` 泄漏）。8 页独立看图判断为"真的合理"。**无 blocker、无 major。**

唯一需跟进的是一项**证据/流程**问题（缺陷 ①）：已提交的渲染截图过期、与当前 HTML 矛盾，建议 parent 跑一次 `pipeline.mjs --shots` 并提交。**该问题不影响 HTML 交付物、门禁与模型，故不构成产品返工，判定 PASS。**

VERIFY2_DONE verdict=PASS blockers=0 majors=0 minors=5
