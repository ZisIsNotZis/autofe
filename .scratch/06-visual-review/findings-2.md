Finalizing now — the harness signalled the budget soft limit, so I'll stop verification and report from the evidence already gathered.

# 组 2 视觉复核

> 复核范围：组 2 全部 9 页的渲染截图（`m1/curated/renders/<k>.png`）+ 渲染 HTML + `m1/curated/<k>.json` 模型。证据一律标注"我看到的"位置。
> **工具限制（影响结论强度，务必读）**：本次运行时我只拿到 read/grep/find/ls 等只读工具，**没有 bash，无法用 ImageMagick 裁切**（任务书建议的 `convert … -crop` 无法执行）；而 read 对图片最长边限 2000px 缩放显示。因此 ≥6000px 高的页面（aliyun 6323px、stripe 17212px）文字不可辨，只有结构层结论。所有依赖缩放字形的判断我都标了 `[uncertain]`。

## 跨页共性（根因，先读）
- **render.mjs `bareTitle` 分支会吞掉动作链接并把控件渲染成 promo 卡**。`render.mjs:556` `const bareTitle = depth > 0 && titleText && !bodyLead && !heroHtml && !body && !action;` —— 一个"只有标题 + `_action`"的节点，其 label 与标题同名时会在前面被判定为 `titleIsControl`（`render.mjs:392-394`，linkTo 赋值、`action` 保持空串），于是命中 `bareTitle`，在 `render.mjs:559` 直接返回 `<div class="promo"><span class="promo-label">…</span></div>`，**`linkTo` 与控件外观一起被丢弃**。`.promo{background:#f8fafc;border:1px solid #e3e8ee;padding:10px 14px}`（render.mjs:615）正好渲染成"占满整行、左对齐文字的浅色空框"。华为 `购买`（45+ 处）与 Linear `Contact sales` 是同一根因的两个实例。
- **`renderDeflist` 会输出空的标签列**（`render.mjs:194-204`：`l` 为空时仍拼 `<div class="deflabel">${l}</div>`，而 `.deflabel{min-width:130px}`）→ 屏幕上表现为无标签、无理由缩进的散字（Linear 的客户引语与品牌名）。

---

## 36kr-com/information-technology

- [minor] 现象：页面主标题是 SEO 串接标题，可见下划线分隔符：`科技频道_前沿科技_人工智能_黑科技_智能社会_智慧城市_36氪`｜证据：渲染图顶部 H1（1280×2823，显示缩到 907px，字形可辨）｜层级：model（把文档 `<title>` 当作 H1）｜建议：H1 改为"36氪 · 资讯频道"这类人读标题；若源站 H1 确实如此则忽略 `[uncertain]`。

### 通过（设计如此，不必改）
- 频道 chip 两行（最新/推荐/创投…；创新/企服/消费…）是同形紧凑的可比集合，行布局正确（F-031 §2 反例"36kr 频道 17 项 ⇒ 真可比"）。
- "最新" 3 列新闻卡为同类可互换实例，同排可比，符合 F-031 §1。
- "推荐企业" 两个条目（行业新知 / 氪睿研究院）带标题+摘要并堆叠，各自成立；底部 `查看更多企业` 是唯一深色按钮，控件像控件。

## aliyun-com/home

- [uncertain] **覆盖受限**，不算缺陷：渲染图 1280×6323，read 缩放到 405px 宽，正文不可辨，我只做了结构层检查。建议用 bash+ImageMagick 裁切（如 `-crop 1280x1400+0+0` 分段）后补一次文字级复核。

### 通过（设计如此，不必改）
- 结构层：各区块（通义/产品/行业/安全合规…）以标题分段堆叠；顶部主视觉与底部"安全合规、遍布全球的云计算基础设施"的视觉带都是满幅（edge-to-edge），符合 F-031 §7。
- 底部基础设施统计以 label/value 行组织（区域 31 个 / 可用区 / CDN 节点…），未出现同排异质项。

## apple-com/ipad-air

- [major] 现象："Two sizes. Infinite possibilities." 下面同一行三格是 `11″ model` ｜ `True Tone for comfortable viewing` ｜ `P3 wide color` —— 一个**实体**（11″ 机型）与两条**显示属性**被放进同一行，违反 F-031 §1"同一行 ⇒ 成员可比"；且同一区块里只有 `13″ model` 带 `2360x1640 display resolution`，11″ 一格没有任何对应值 → 行内成员不同形、不同粒度。｜证据：渲染图 y≈470 行（显示坐标 454×2000，×2.82 映射回原图）；对照上方文本列里 13″ model 有四行规格｜层级：model（把尺寸与属性混放进 `_items`）+ renderer（可比性自判应降级为堆叠）｜建议：`_rel.compare` 的两个实体（11″/13″）各自成列、各自带 `_detail` 规格；True Tone / P3 wide color 作为两列共有的属性行（列=实体、行=属性，F-031 §3）。
- [minor] 现象：hero 文案里 `From $749` 连续出现两次：`From $749 or $62.41/mo, for 12 mo. Lease from $15.99/mo, for 36 mo. with Apple Upgrade From $749`。｜证据：渲染图顶部 y≈90 行｜层级：model（同一价格既进 `_summary` 文本又作为 `_price` 事实）｜建议：价格事实不进 `_summary` 文本，或让 hero 事实行不再重复 `_summary` 中已出现的金额 `[uncertain]`（源站是否如此未核）。
- [minor] 现象："M4. Power up, up, up." 的对比块右侧 `than iPad Air with M1` 原样重复两遍（`Up to 2.3x faster / than iPad Air with M1`、`Over 44x faster 3D pro rendering / than iPad Air with M1`），不是 F-031 §3 的"列=实体、行=属性"表。｜证据：渲染图 y≈545、y≈585 两行｜层级：renderer（对比表列头未去重/未做同一个对照基）｜建议：同一个对照基上升为列头或表注，只出现一次。
- [uncertain][minor] 现象："Keep exploring iPad." 里 `iPad Air` 卡片的 `Buy` 按钮正上方有一个小的深色空块（无文字、无 alt）。｜证据：渲染图 y≈2015（显示坐标）｜层级：renderer|capture（疑为无 `src` 的图片槽或空控件）｜建议：确认该节点是什么；若无内容则不要输出空壳。

### 通过（设计如此，不必改）
- `Take a closer look.` 的 All Colors / Space Gray / Blue / Purple / Starlight 是单选控件条（chipbar），控件像控件。
- "Cameras." 下面三格（12MP Center Stage 前摄 / 12MP Wide 后摄 / Dual mic and stereo speakers）是同形同类，行布局正确。
- "Keep exploring iPad." 的两张机型卡（iPad Air / iPad Pro）堆叠、各带标题与动作，符合"不可比则堆叠"。

## bilibili-com/read-home

- [major] 现象：正文里出现**未解码的 HTML 实体 `&nbsp;`**：`…的自获取请存111&nbsp;【图片】`。｜证据：渲染图第 2 条摘要行与后面重复条目同一句；原图 1280×3978（显示缩到 644px，字符可辨）｜层级：model/capture（文本节点未解码实体）｜建议：清洗阶段解码实体；模型侧做断言"文本不含 `&`+`nbsp;` 形式残留"。
- [major] 现象：**同一篇文章被渲染两次，正文逐字相同**：`【个人圈的专属绘画大礼包合集】` 在第 2 条与后面另一条都出现，正文同为 `自己画画不容易，我托了很多年积累到的绘画素材都整理打包好了，涵盖（线稿、色卡、笔刷、软件、资料）的自获取请存111【图片】`。｜证据：渲染图第 2 条与第 4 条（两条之间夹着"【追婚1997中越战争】"）｜层级：model（`_items` 里放了同一实例）|capture（重复采集）｜建议：按业务键去重后再入 `_items`；audit-visual 的重复内容检查显然没拦到这条 `[uncertain]`（源站是否真的排两次未核）。
- [major] 现象：每条摘要下方的元信息是 **3 个连续无标签裸数字**，形如 `… 5.3万 738 188`、`… 1.7万 117 25 1`，没有任何"阅读/评论/点赞"标签。｜证据：渲染图每条条目底部作者名之后；具体数值因 1.99× 缩放 `[uncertain]`｜层级：model（统计数字应以 `_count`/角色带标签）｜建议：给三类计数各自带标签，或用 F-031 §6 的"规格行"形式（阅读 5.3万 · 评论 738 · 点赞 188）。

### 通过（设计如此，不必改）
- "推荐文章" 为 H1，"搜索专栏文章"渲染成带框的控件，控件像控件。
- 每条：标题（链接）+ 摘要 + 元信息的竖排堆叠是"不可比 ⇒ 堆叠"，正确；条目内的分类标签（如"日常"）作为位置标签也在位。

## huawei-cn/consumer-phones

- [blocker] 现象：**每个机型的 `购买` 被渲染成占满卡片宽度的浅色边框空框**（视觉上像一个空的文本输入框），且**没有链接**；hero 那张卡片的 `购买` 横跨整页内容宽度，尤其像坏掉的空表单。全页共 45+ 处同类。｜证据：渲染图（1280×4881，显示 524px）Mate 系列每张卡片中"价格 → 空框（内有左对齐"购买"）→ 了解更多"；hero 的"购买"框 y≈125 横贯整行｜层级：renderer（`render.mjs:556` 的 `bareTitle` 把"只有标题 + 动作"的节点判为 promo，`render.mjs:559` 返回时丢弃 `linkTo`/控件外观）｜建议：`bareTitle` 增加 `&& !titleIsControl && !linkTo`；控件（F-031 §4）必须渲染为 `.ctl`/`.action` 观感，无目标时也是链接样式的控件而不是 `.promo` 盒子。
- [uncertain][minor] 现象：同排卡片不同形/不同高：`华为畅享 80`、`华为畅享 70X 尊享版`、`HUAWEI nova 14 Pro` 无价格、无 `购买`，而它们同排邻居都有 → 违反 F-031 §1 的"同形/同高"判据。｜证据：渲染图"畅享系列"第 2 行、"nova 系列"第 4 行｜层级：capture|model（若源站有价格则属采集/策展缺失）｜建议：先确认源站是否给出价格与购买入口；缺采集则补，源站确实没有则接受。

### 通过（设计如此，不必改）
- 顶部系列 chip（Mate/Pura/Pocket/nova/畅享/配件）是同形紧凑可比集合，行布局正确。
- 各系列（Mate/Pura/Pocket/nova/畅享）以标题分区块堆叠，3 列机型卡为同类实例，符合 F-031 §1/§2。
- "为什么选择华为手机?"（影像/设计/通信/可靠性/AI/续航/隐私 + 说明）以 label/value 行组织，没有把异质项并排。

## linear-app/home

- [major] 现象：`Contact sales` 是**抓取到了目标地址却被丢掉的控件**：模型里 `sales._action = {verb:"open", to:"https://linear.app/contact-sales", label:"Contact sales"}`，渲染出来却是 `<div class="promo"><span class="promo-label">Contact sales</span></div>`（无 `<a>`、无控件外观），在屏幕上是"占满整行的浅色空框 + 左对齐文字"。｜证据：`m1/curated/linear-app/home.json`（sales 节点）+ `m1/curated/renders/linear-app-home.html`（`<section class="group g-sales">…`）+ 渲染图 y≈715｜层级：renderer（`render.mjs:556/559`，与华为 `购买` 同根因）｜建议：同一条最小修（`bareTitle` 排除 `titleIsControl`）。
- [major] 现象：**同一个 H2 在同一页出现两次**：`Powering the companies building the future`（先出现在含 "Linear is shaped by the practices…" 的区块，之后又出现在只列 `OpenAI/Vercel/Figma/Coinbase/Ramp` 的区块）。｜证据：模型 `proof._title` 与 `customers._title` 文本相同（home.json:48-52 与 :113-117）；渲染图 y≈378 与 y≈832｜层级：model（同一标题被两个节点复用，且客户与引语被拆到两个区块）｜建议：合并为一个区块：每项 = 品牌（`_brand`）+ 引语（`_detail`），标题只出现一次。
- [major] 现象：**deflist 的空标签列把文字顶到 x≈254**，屏幕上看起来像无理由缩进的散句/散词：proof 的两段引语 `Designed for workflows shared by humans and agents, from drafting to review.`、`Reduces noise and restores momentum…`，以及 customers 的 `OpenAI/Vercel/Figma/Coinbase/Ramp` 五行。｜证据：渲染 HTML `<div class="deflabel"></div><div class="defval">OpenAI</div>`；CSS `.deflabel{min-width:130px;font-weight:600}`；渲染图 y≈495/540 与 y≈916-1088｜层级：renderer（`render.mjs:194-204` 输出空 label 单元）+ model（条目没有标签）｜建议：renderer 侧 `l` 为空时不要输出 `.deflabel`（整行还给 defval）；model 侧给引语补归属（品牌名即标签）。
- [minor] 现象：`order:"time"` 声明的时间轴**没有任何视觉产出**（无竖线、无圆点）。｜证据：`render.mjs` 有 `.timeline .item::before{…}`，而 changelog 区块渲染为 `<article class="node depth-1 timeline">` 内含 `<div class="deflist"><div class="defrow">…` —— 选择器永远匹配不到 `.item`；渲染图 y≈600 区块只有两条虚线行｜层级：renderer（CSS/结构不匹配）｜建议：timeline 分支用 `.item` 结构，或把 `.defrow` 纳入 `.timeline > *::before`。
- [minor] 现象：changelog 里 `Ride rows reset fix` 渲染成 **UA 默认蓝链接**（未加粗、无调色板），而同区块的 `Faster app launch` 是加粗深色标签 → 同形不一致；根因是 `.deflabel` 内的 `<a>` 没有样式规则。｜证据：渲染 HTML `<div class="deflabel"><a href="https://linear.app/changelog">Ride rows reset fix</a></div>`；CSS 只有 `.linklist a{color:#0b62d0}`；渲染图 y≈651（蓝色）vs y≈609（深色加粗）｜层级：renderer（补 `.deflabel a` 样式）。顺带：一条 changelog 有链接、另一条没有，来源可能确实如此 `[uncertain]`。
- [uncertain][minor] 现象：`Intake and integrations / Planning and monitoring / AI and automations / Build, review, and ship` 4 项排成两列裸项目符号，**只有名字、没有任何说明**（源站这些能力条通常各带一句解释）。｜证据：渲染 HTML `<ul class="linklist">` 4 个 `<li>`；渲染图 y≈290-320｜层级：capture|model（说明可能未采集或被丢弃）。

### 通过（设计如此，不必改）
- H1 = 文档标题 `The product development system for teams and agents`，hero（`_summary`）放大，符合 `_primary` 规则。
- 只有 `Get started` 一个真正的深色按钮，链接有 `href`，控件像控件。
- 区块以 `header h2` 分段，`Changelog` 只出现一次（除上述重复标题外无其它重名区块）。

## mi-com/search-phone

- [major] 现象：三个筛选控件 **`促销`、`分期`、`仅看有货` 各带一个完全空的方框**（无文字、无选项、无占位符），视觉上就是"坏掉的空输入框"；它们与顶部 `站内搜索` 的空输入框外观完全一致 → 疑为把下拉筛选渲染成了空文本框。｜证据：渲染图（1280×2211，显示 1158px）y≈306/343/379 三行，每行左侧标签、右侧空白框｜层级：model（这三项应是带选项的单选/下拉，而非自由输入）+ capture（选项集合缺失）；renderer 至少应在选项为空时不输出空框｜建议：把选项采齐后建为 `_expose` + `_items`（单选，参照顶部 `全部/红米手机/小米手机` 那一组的正确形态）；采集缺席时也不要渲染空框。
- [uncertain][minor] 现象：每张商品卡下半部约 40–50% 是空白（标题+价格之上、卡片下边框之内），商品列表页却**没有任何商品图**。｜证据：渲染图两段网格（所有产品 / 猜你喜欢）所有卡片底部留白等高；CSS `.cards .item img{width:100%;height:150px;object-fit:cover}` 提示存在 150px 固定高度图片槽｜层级：capture（T-109：未记录 img src）|renderer（无图时仍留固定高度槽）｜建议：无 `_image` 时不保留图片槽；`corpus` 侧补 img src。
- [uncertain][minor] 现象：`收货地` 下面是 `北京 北京市`（省+市同义重复）。｜证据：渲染图 y≈428/448｜层级：model｜建议：合并为单值或明确为"北京市"。

### 通过（设计如此，不必改）
- 排序/品牌两组筛选渲染为带 legend 的 `fieldset` + 圆形单选 chip（`全部/红米手机/小米手机`；`综合/新品/销量/价格`），控件像控件。
- 两段商品网格均为 3 列同类卡片（标题链接 + 价格 / 好评数），同排可比，符合 F-031 §1；`猜你喜欢` 有独立标题。
- 价格一律带 `¥`，没有裸数字。

## sspai-com-post-102392

- [blocker] 现象：**内部动词 `operate` 直接印在页面上**：`充电鼓励` 标题下方有一行灰色小字 `operate`。｜证据：`m1/curated/sspai-com/post-102392.json` 的 `support` 节点 `"_action": { "verb": "operate" }`（无 `label`、无 `to`）；`render.mjs:363` `const copy = a.label ?? a.verb;` + `render.mjs:368` `action-plain`；渲染图（1280×877 全分辨率可读）y≈724｜层级：renderer（把 verb 当文案是错误兜底）+ model（该动作缺 label）｜建议：renderer 改为"无 label 就不渲染该动作"（或退回节点 `_title`），绝不打印 verb；model 侧给 `充电鼓励` 的动作补 label。
- [uncertain][minor] 现象：文章正文没有任何图片（本篇是 Typora 主题效果演示，"以「反色」方式进行适配""以「替换」方式进行适配"两节各只有一行）。｜证据：渲染图整页仅文字；对比同目录 `sspai-com-post-114716` 有长正文｜层级：capture|model（图片资产/正文段落缺失）｜建议：核对 `corpus/sspai-com/post-102392/` 是否本就有图；有图则属采集或策展丢弃。

### 通过（设计如此，不必改）
- 标题、日期、tag chip（VLOOK™/Typora/Markdown）、`MaxChow · 少数派` 元信息层级清晰。
- 正文以标题分段堆叠、阅读宽度合理，符合 F-031 §2 的"长文本 ⇒ 序列"。
- "2 分钟阅读 · MIT License" 作为阅读成本事实单行呈现，没有并排异质内容。

## stripe-com-pricing

- [uncertain] **覆盖受限（非缺陷结论）**：渲染图 1280×**17212**，read 只能缩到 **149×2000**，文字完全不可辨，无法做文字级/控件级视觉复核，也没有 bash 裁切手段。仅能给出的量化观察：这一页高度是次长页（aliyun 6323px）的 **2.7×**，对定价页异常，怀疑原页的定价表/多列对比被展平成一维长列表（F-031 §3 的"列=实体、行=属性、不换行"）。｜层级：待定（model 优先）｜建议：由具备 bash+ImageMagick 的一方分段裁切复核，例如 `convert m1/curated/renders/stripe-com-pricing.png -crop 1280x1200+0+0 +repage /tmp/rev-stripe-0.png`（按 1200px 步进），再按本组同格式补一份 findings。

### 通过（设计如此，不必改）
- 结构层（HTML/模型未在本轮复核，故不声明通过项）：仅确认渲染产物存在且为整页截图，未发现渲染失败/空白页。
- 说明：本轮未对 stripe 作任何"通过"判断，任何补充复核请以裁切图为准。

---

FINDINGS_DONE group=2 pages=9 blockers=2 majors=8 minors=9