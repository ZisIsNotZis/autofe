# 独立验收（第 4 轮）

验收者：fresh reviewer（未参与修复）。方法：先读 `spec.md`/`rounds.md`/`fix-report-1..3.md`（把修复自述当作**待验证主张**），再自跑门禁、独立 `read` 渲染 PNG（长页用 ImageMagick 裁段）、`git` 只读核查、回到 `corpus/` 核实"采集缺口/设计如此"主张。
本报告只写这一个文件；未改任何代码/模型/文档，未 git 提交，未触碰 `corpus/`。

## 门禁（原文）

`node m1/eval/pipeline.mjs`（exit=0，我自跑，重出渲染产物）：
```
[pipeline] 渲染 36/36 | 错误 0
[pipeline] 保真 1.00: 36/36
· huawei-cn-consumer-phones.html                dup-source-true(info):1
· sspai-com-home.html                           dup-source-true(info):2

视觉自查: 36/36 干净
```
`node m1/validate.mjs m1/curated/*/*.json` → 全部 `ok`，exit=0。门禁与四份报告自述一致，这点成立。

工作区 `git status --porcelain` 为空（`node m1/eval/pipeline.mjs` 重跑后产物字节一致，未产生新脏文件）。

## 逐条结论（accept / reject + 我亲眼看到的）

### R1 控件被 promo 分支吞掉（fix-1 blocker）— **accept**
- 36kr `search-ai`：裁 y0..700 看，"请输入关键词"输入框下方是**蓝色描边胶囊**「站内搜索」，不再是整幅浅灰 promo 条。HTML `<div class="controls"><span class="ctl">站内搜索</span>`。
- apple `iphone-16`：`g-save-later`/`g-continue` 均为 `<div class="controls"><span class="ctl">Save for later|Continue</span>`，裁图确认是两枚胶囊，不是横幅。
- huawei `consumer-phones`（裁 0..1000）：hero 与 3 列卡片每张都有「购买」（描边胶囊）+「了解更多」（深色实心按钮），**没有**整行浅灰空框；全库 `grep -rhoE '>(buy|operate|open|navigate|subscribe|toggle|select|follow|search|reset|submit|filter)<'` = 0 命中。
- mi15：`立即领取 / 修改 / 加入购物车 / 喜欢` 均为胶囊控件。
- taobao：`更多低价商品` 为胶囊控件且带 href。
- linear：`Contact sales` 为带 href 的胶囊控件（裁图确认）。

### R2 内部动词上屏（fix-1 blocker）— **accept**
- aliyun `product-ecs` 裁图：三张实例卡 + 底部都是「立即购买」深色按钮，无裸 `buy`；全库内部动词 0 命中（见上）。

### R5 单一 action-only 子节点被吞（fix-2 blocker）— **accept（视觉确认）**
- mi15 页面底部出现深色按钮「用户评价」（HTML `<a class="action verb-open" href=".../comment/21096.html">用户评价</a>`）；findings-4 的 blocker 确实闭环。

### R4 grafana 面板连排（fix-2 blocker 主张）— **accept**
- 裁图/整图：11 个面板名是**带编号的 ol**（1. Introduction … 11. Emoji in stat names），不再是连排文字。
- 工具栏 4 枚胶囊（Last 6 hours / Refresh / Enter edit mode / Edit）与下方两条蓝色下划线横幅（Grafana Cloud / Learning Journeys）形态已分离。
- 面板体缺失 = 源站加载态（见"采集缺口"节，已核）。

### R7a 对比表印英文键（fix-2 major）— **accept（附残留）**
- `apple-com-cn-iphone-17` 对比表行标题实测：`薰衣草紫色/鼠尾草绿色/青雾蓝色/白色/黑色/显示屏/芯片/摄像头/电池/Apple 智能/购买`，**无** display/chip/camera/battery/buy。
- 残留：单元格内重复行标签（`显示屏 | 显示屏 6.3 英寸超视网膜 XDR 显示屏`），颜色行第一列也重复色名。经 `git show dd5b94e` 比对，该重复在修复前就存在（非本轮引入），属 cosmetic，记为 minor。

### R7b 裸数字无单位 / 同一事实两处（fix-2 major）— **部分 accept**
- airbnb `<div class="meta">4.86 分 · 815 条评价</div>`：裁图确认「总体评分 / 4.86 分 · 815 条评价」；旧的裸 `4.86`/`815` 各占一行已消失。
- **但**：mi-com 两页出现单位叠加错误（见"新发现缺陷"①），说明该修复对"模型自带 unit"的值不成立 → 这条修复**未generally成立**。

### R7c 评分分布连排（fix-2 major）— **accept**
- airbnb `g-distribution` 为 `<div class="chips chips-rows">`，5 个 chip-item 各自成行（HTML 逐条确认 + 整图可见多行）。

### R7d order 顺序语义（fix-2 复核项）— **accept**
- aliyun `product-ecs`「产品动态」4 条为编号 1..4 并带时间轴导轨（裁图确认）。

### R7f 兄弟区块区域分隔（fix-3 major）— **accept（范围可控）**
- 全库计数：R7f 之前（`41ebd1c`）6 处 `hr.region`/6 页；现在 20 处/15 页 → **新增 13 处/11 页**，与 fix-3 自述（"11 页 13 处"）一致；父代理提交信息里的"15 pages"是累计总数，两者不冲突。
- 新增页：aliyun-home(3)、airbnb、ipad-air、iphone-16、bilibili-home、bilibili-video、huawei-search-laptop、huawei-search-phone、sspai-post-114699 各 1；macbook-air、sspai-post-102392 各 +1。
- 抽验 iphone-16 两处 hr 的实际上下文：均在**有标题兄弟块 → 无标题兄弟块**之间（`g-deals`(h2 Carrier Deals) → `g-steps`；`g-save`(h3 Need a moment?) → `g-specialist`），符合规则语义；未发现"前兄弟无标题却插 hr"的越界页。判据代码只对命名子块生效（`_items[` 分支不经过），范围符合主张。

### R3 B 站横幅裁错（fix-3 blocker）— **accept（图像内容正确；"满幅"措辞不实）**
- 裁图：标题「第五人格亲密之月」下是**粉色活动主视觉**（第五人格 亲密之月），不是导航条带 —— blocker 闭环。
- 但图片以自然尺寸 516×290 左侧排布（HTML 里在 `.fact` 内），右侧留有约 500px 空白；fix-report-3 写的"满幅活动图"不成立（未拉伸本身可接受，记为 minor/表述不实）。

### airbnb 图墙（fix-3 major）— **accept（含 1 项新问题）**
- 旧的 alt 英文字串消失，改为 5 张等宽图（`<figure class="strip"><img ...>`），「显示所有照片」控件只出现 1 次（`grep -c`=1）。裁图确认是真实照片（床/街景/浴室）。
- 新问题：第 5 张资产把源站自己的「显示所有照片」按钮烘进了像素（见"新发现缺陷"②）。

### taobao 四会场（fix-3 blocker）— **accept（判定为采集缺口，且我已核实）**
- 渲染仍是"标题 + 只有价格"的空卡片（裁图确认），但 `corpus/taobao-com/home/nodes.json` 里这四块的成员 `a` 节点 name 就是 `¥14999` 这类价格，`img` 100×100 但 `name/alt` 全为空 —— 商品名确实不在抓取里。**不发明文案**的处置正确，F-036/采集待办成立。

### 36kr 资讯页 H1（fix-3 minor）— **accept**
- `information-technology` 的 h1 为「科技频道」（我不视为缺陷原样）。注意 `search-ai/search-viz/home` 仍是 SEO 串标题（fix-3 明确列为待裁定），见 minor。

### linear deflist 空标签列 / 页头 `_brand` 去重 — **accept**
- linear 引语行不再有 130px 空列缩进；`grep -rn '<div class="deflabel"></div>' renders/` = 0；aliyun「阿里云」仅 1 处（裁图确认）。

## 新发现缺陷（修复轮遗漏或新引入）

### ① [major · **新引入**] 单位叠加：`870 人好评 条评价`
- 证据：`m1/curated/renders/mi-com-search-earbuds.html`、`mi-com-search-phone.html` 的 meta 行 = `870 人好评 条评价`（全库共 **20 处**，2 页）。模型该事实是 `{"num":870,"unit":"人好评"}`（`search-earbuds.json:499`）。
- 归因（已用 git 断代）：`dd5b94e`（fix-1）渲染为 `870 人好评`（正确）；`41ebd1c`（fix-2）起变为 `870 人好评 条评价`。根因 `m1/render.mjs:232` `ROLE_UNIT = { _rating:'分', '_rating-count':'条评价' }` + `roleFact()` 无条件追加单位，**覆盖/叠加了模型自带 unit**。
- 性质：既违反 F-031-§6（数值带单位要正确），也违反父代理裁定 2（"单位必须由模型给出，引擎不得推定"），并且是本轮新引入的可见错误文案 → 必须返工。

### ② [major · 新引入] airbnb 图墙资产烘进了源站按钮
- 证据：渲染页第 5 张图（`m1/curated/assets/airbnb-room-photo-5.png`，裁 bbox 1000,420,272,230）像素里含源站自己的「显示所有照片」大按钮；页面上因此出现"图内假按钮 + 图外真控件"两个同名控件。裁图 `/tmp/ver/ab4.png` 可见。
- 附带：4 张缩略图原生仅 273px，满幅渲染 3.8× 上采样，肉眼明显发糊（fix-3 已声明该限制）。
- 性质：伪造的可点暗示（`.action-plain 显示所有照片` 是真控件），属"图上出现假控件"，建议重裁该 bbox（避开按钮）或换用 4 张图。

### ③ [major · 遗漏] linear 同一 H2 出现两次
- `linear-app-home` 页「Powering the companies building the future」出现两次（model `proof._title` 与 `customers._title` 同字）。裁图确认（y≈378 与 y≈832）。findings-2 major，**fix-report-1/2/3 均未提及、未列入 defer** → 漏办。

### ④ [major · 部分遗漏] airbnb「地段 616 / 待客之道 582 …」仍无单位
- HTML：`<div class="deflabel">地段</div><div class="defval">616</div>`。findings-1 major 要求"616 条评价"；fix-3 只做了区域分隔那一半，单位那半归入"需要人类决策"（`_count` 单位表）后未落地 → 该 major 只闭环一半。

### ⑤ [major · 遗漏] bilibili home 顶部搜索框仍是无标签空白框
- HTML：`<span class="expose expose-query"><input type="text" name="query" data-type="text" aria-label="query">`，裁图确认是一个无占位、无标签的空框（findings-1 major）。模型注释说框内灰字是热搜提示但未采集。**未列入任何一轮任务书**，也没进 defer → 漏办。附带：`aria-label="query"` 把内部键写进了输出属性（不可见，minor）。

### minors
- m1 36kr `search-ai`/`search-viz`/`home` 的 H1 仍是 SEO 串（`人工智能相关文章_36氪`）——fix-3 明列待裁定，但页面上仍是原始串。
- m2 bilibili home 视频卡标题仍是浏览器默认蓝色下划线链接（与全站标题样式不一致，findings-1 minor）。
- m3 bilibili 横幅非满幅 + 右侧大片空白；fix-3 报告称"满幅"不实。
- m4 mi15 底部「发货说明/7天无理由退货…/售后服务政策」仍是一行密排 chip、无区块标题（findings-4 minor）。
- m5 taobao「猜你喜欢」27 个商品仍是单列整行 block + 裸价格（findings-4 minor）。
- m6 iphone-17 对比表格子重复行标签（pre-existing）；airbnb 颜色行首列重复色名。
- m7 `_count` 类（bilibili 20.2万/155、airbnb 616）多数仍无角色标签。

## 抽查"设计如此/采集缺口"结论

1. **taobao 四会场 = 采集缺口**（fix-3 主张）→ **成立**。`corpus/taobao-com/home/nodes.json`：四会场容器 name 仅 `百亿补贴 · 买贵必赔 ¥14999 ¥6299 ¥4999 ¥9999`；成员 `a{744,277,104,100} name="¥14999"`；同区 `img{746,277,100,100}` 的 name/alt 为空。商品名确实不在抓取里（在像素里），**不发明文案**正确。
2. **grafana 面板体 = 源站加载态**（fix-2 主张）→ **成立**。`corpus/grafana-play/play-home/nodes.json` 该容器 name 为 `Introduction Loading plugin panel...`；`dom.html` 同区为 `data-plugin-id="loading-plugin"`。按 F-031/F-013 不补为事实，判定正确。
3. **airbnb「同一次评价事实两处」前的一半**（fix-2 主张：删 `overview.rating._rating/_rating-count` 与 `reviews._detail`）→ **成立**：新版模型 `overview` 只留源站句子，评价区 meta 行承担评分事实；渲染里 `评分为 4.86 星（满分 5 星）。` 与 `4.86 分 · 815 条评价` 是源站两个不同事实（一句是描述、一处是聚合），不再算重复。
4. **"对比表行标题只在模型有 `_title` 时才显示"**（fix-2 处置）→ **成立但已无观测面**：`dd5b94e`（fix-1 后）行标题就已经是中文（模型已补 `_title`），fix-2 去掉内部键兜底在产物上不可见；好处是以后不会再印键名，风险=模型缺 `_title` 时行标题空白（现在未见空白行）。

## 回归与纪律检查

- `git log --oneline -8`：`6d11b23 handoff → cd8f94d fix-3 → 41ebd1c fix-2 → dd5b94e fix-1 → …`，每轮一次提交，无历史改写。
- `git diff --stat cd8f94d~3 HEAD`：改动落在 `m1/render.mjs`、`m1/curated/*.json`、`m1/curated/assets/*`、`m1/failures.md`、`m1/curated/renders/*`、`.scratch/*`。**`corpus/` 零改动**（`git diff --name-only cd8f94d~3 HEAD -- corpus/` 空；`git status --porcelain corpus/` 空）。
- HTML/CSS 逃生口：`git diff cd8f94d~3 HEAD -- m1/render.mjs` 逐行读过，新增全部走 `esc()/fmt()/hrefOf()`，无 `innerHTML`、无原样 HTML 注入；产物里 `<script` 计数 0。
- `_intent` 泄漏：`grep -rlo '_intent' m1/curated/renders/` = **0 文件**。
- 内部动词/键名上屏：内部动词 0 命中；`cmp-row">(display|chip|…)` 0 命中；`href="key:` 0 命中（`key:` 已降为 `#锚点`）。
- 单位/数值语义复核：`4.86 分 · 815 条评价`（正确，对应源站 5 分制评分与 815 条评价）；`616`（airbnb 提及计数，缺单位，语义不完整）；`870 人好评 条评价`（**语义错误**，见缺陷①）。

## 总体判定: FAIL

三轮的**被指派项本身基本真实**（R1/R2/R3/R4a/R5/R7a/R7c/R7d/R7f 均经我独立看图+HTML+git 断代确认；两项"采集缺口"主张回查 corpus 成立；纪律与 corpus 完整性无问题）。但存在修复轮**新引入**的可见错误文案与一处误导性资产，以及 3 条 findings major 被漏办，故本轮不通过。

**必须返工清单（按优先级）**
1. `m1/render.mjs` roli-unit：`_rating-count` 不得无条件追加「条评价」。改为"模型给了 `unit` 就用模型的；没有才用角色默认（或按父代理裁定 2 只输出数字）"。受影响 2 页 20 处文案（`mi-com/search-earbuds`、`mi-com/search-phone`）。
2. `airbnb-room-photo-5.png` 重裁（避开源站「显示所有照片」按钮像素）；核对另 4 张是否也含源站覆盖层。
3. linear 重复 H2 合并（模型侧 `proof`/`customers` 合为一个区块，或渲染侧对同字 H2 去重）——findings-2 major 从未被处理。
4. airbnb「地段/待客之道…」补单位（`616 条评价`），或明确记为待裁定并进 defer 清单——findings-1 major 只完成一半。
5. bilibili home 搜索框补可见标签/占位，或按"拿不到文案就不输出空框"处理——findings-1 major 漏办。
6. 修完重跑 `node m1/eval/pipeline.mjs` 必须仍为 `保真 1.00: 36/36` + `视觉自查: 36/36 干净`；并注意自查**没有**覆盖"单位叠加/图上烘按钮"两类，建议把两者加入 `audit-visual.mjs`。

VERIFY_DONE verdict=FAIL blockers=0 majors=5 minors=7
