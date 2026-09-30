I have enough verified evidence. (Note: I have no write/edit tool in this run — per the runtime override I return the complete artifact below; it should be persisted to `…/findings-4.md`.)

# 组 4 视觉复核

审查者说明：本组 9 页逐页看了渲染 PNG（`m1/curated/renders/<k>.png`），并用渲染产出的 HTML（`m1/curated/renders/<k>.html`，是同一渲染器的输出，可用于确认"屏幕上到底是什么文本/什么形态"）、模型（`m1/curated/<k>.json`）与渲染器源码（`m1/render.mjs`）交叉验证。本环境没有 bash/ImageMagick，无法裁切 `corpus/*/full.png`；对缩得很小、看不清字的部分，我改用渲染 HTML 逐字核对，凡不能核实的都标了 `[uncertain]`。

## 36kr-com/search-viz（k=36kr-com/search-viz）
- [blocker] 现象：搜索结果页的"站内搜索"提交控件被渲染成一条浅色 promo 横幅，紧贴在真正的输入框下方，看起来像一个空的表单框/广告条，完全不像控件。｜证据：`renders/36kr-com-search-viz.html` 第 91 行 `<section class="group g-submit"><div class="promo"><span class="promo-label">站内搜索</span></div></section>`；模型 `36kr-com/search-viz.json` 的 `query.submit`（`_title`＝"站内搜索"、`_action.label`＝"站内搜索"、无 `to`）；机制：`render.mjs:555-559` 的 `bareTitle → <div class="promo">` 启发式（本意是 T-106 的纯标题广告块）把"内容只有控件"的节点也吃掉了；`.promo` 样式见 `render.mjs:615`。｜层级：renderer｜建议：`bareTitle` 增加 `&& !titleIsControl`（并排除"唯一内容就是 `_action`"的节点），让 titleIsControl 走 `render.mjs:566-569` 的 `.ctl` 控件样式；同族缺陷另见 huawei/mi15/taobao。
- [minor] 现象：每张结果卡的日期印成裸的机器格式 `2025-06-30`/`2026-09-15`，且没有任何"发布日期"标签。｜证据：同一 HTML 的卡片 `<div class="fact"><span class="val">2025-06-30</span></div>`；卡片网格本身排版整齐（3 列、标题/摘要/日期一致）。｜层级：renderer（无日期本地化）｜建议：`_datetime` 至少输出为 `2026-09-15`→"9 月 15 日"这类本地化格式或加"发布"前缀。
### 通过（设计如此，不必改）
- 20 条结果的卡片网格：同形同粒度（标题＋摘要＋日期），3 列排布合理，可点标题是链接而非假按钮。
- 搜索类型（文章/快讯/…8 项）与排序（相关性/发布时间）用 radio 表达互斥选择，符合"选择是引擎的"。

## apple-com-cn/iphone-17（k=apple-com-cn/iphone-17）
- [major] 现象："看看哪款 iPhone 适合你"的对比表，行标题是裸露的英文内部键：`display` / `chip` / `camera` / `battery` / `ai` / `buy`（中文页面上出现英文小写键名）。｜证据：`renders/apple-com-cn-iphone-17.html` 第 91 行同时存在 `cmp-row">display` 与 `cmp-row">buy`；模型 `apple-com-cn/iphone-17.json:742-760`、`:818-836` 用 `"display"/"chip"/"camera"/"battery"` 作为命名子组的键、`:848` 用 `"buy"`；渲染器 `render.mjs:344` `const label = FIELDS[key]?.label ?? key.replace(/^_/,'')`，而 `m1/vocab-fields.json` 里没有这些键 → 直接把键名印出来。｜层级：renderer（＋model 未给中文标签）｜建议：行标题优先取该子节点的 `_title`（`buy` 子节点本就有 `_title`"购买"，却仍印 `buy`），无 `_title` 时回退到标签表；模型侧给 display/chip/camera/battery/ai 补中文 `_title`（显示屏/芯片/摄像头/电池/Apple 智能）。
### 通过（设计如此，不必改）
- 对比表列＝实体（iPhone 17 / iPhone Air）且只有 2 列、不换行，`当前浏览` 用 `_tag` 标记而不是重复内容，符合 F-031 §3。
- 页面层级清楚（h1 → h2 章节 → 事实行）；"先刷重点"区块、颜色行（五种颜色＋色块）、续航/芯片卡片的堆叠顺序与源意一致。

## apple-com/macbook-air（k=apple-com/macbook-air）
- [minor][uncertain] 现象："Which laptop is right for you?"（机型对比）没有渲染成对比表，而是两张并排卡片（每张 = 价格 + 一整段规格文字）；同一个"机型对比"语义在 iphone-17 是表格、在这页不是，形态分裂。｜证据：`renders/apple-com-macbook-air.html` 只在 CSS 第 53-54 行出现 `.cmp-table/.cmp-row/.cmp-col`，正文里没有任何 `cmp-row`/`cmp-col` 标记（对比 grep：iphone-17 正文有 `cmp-row">display`）；模型 `apple-com/macbook-air.json:713-745` 的对比节点只写 `_intent/_key/_title/_items`，各实体未带 `_rel.compare`；渲染器判定 `cmp` 只读**成员**的 `_rel.compare`（`render.mjs:491`），节点级 `_rel.compare` 被忽略。｜层级：model（两页编码不一致）＋renderer（不读节点级 `_rel.compare`）｜建议：给该 `_items` 的实体补 `_rel.compare`，或让 `render.mjs:488-499` 同时尊重父节点的 `_rel.compare`。
### 通过（设计如此，不必改）
- 全页章节（Get the highlights/Design/Performance/macOS/Continuity/Display…）标题管辖清楚，短并行要点用 3 列（环境三项、Trinity 三项）合理，长文段堆叠成阅读宽度。
- 无空块、无伪造按钮、无裸露下划线键（该页未使用对比表，所以没踩上 iphone-17 的裸键问题）。

## gov-uk/register-birth-abroad（k=gov-uk/register-birth-abroad）
- [minor] 现象：项目符号列表被强制排成两栏，3 项的列表被切成左 1 右 2，左栏那一条孤立在一大片空白里，读起来像"两个列表"或"左右对照"。｜证据：`render.mjs:644` `.linklist{margin:8px 0;padding-left:1.1em;columns:2;column-gap:28px}`；渲染图 gov-uk 页 "Get help with your application" 下：左列 `have any questions about registering a birth abroad with the UK authorities`，右列 `cannot apply online` / `want to register multiple births (such as twins)`；模型 `gov-uk/register-birth-abroad.json` 的 `help._items` 只有 3 条。｜层级：renderer｜建议：成员数 ≤3 或文本长度不一时退回单列（"同一行＝可比"F-031 §1）。
- [minor] 现象：邮箱 `Overseas.RegistrationUnit@fcdo.gov.uk` 在同一区块出现两次（导读句里一次、下方又作为独立链接一次），读者会以为是重复内容。｜证据：模型 `help._summary` 文本内含邮箱＋`help._action.label` 也是同一邮箱字符串；渲染图 "Email Overseas.RegistrationUnit@fcdo.gov.uk if you:" 之后重复出现同样字符串的链接。｜层级：model｜建议：`_action.label` 改为"发邮件"之类，或把邮箱从 `_summary` 里去掉只留链接。
- [minor] 现象：Fees 区块的层级读起来是倒的——孤立片段 `per certificate £50` 出现在解释段**上方**，而主值 `£150` 出现在解释段**之后**，两个金额都没有"注册费/证书费"的显式标签。｜证据：模型 `fees` 的键序为 `_title,_price(150),_amount(50,qualifier:"per certificate"),_summary,_detail` 且 `_primary:"_price"`；`render.mjs:585-583` 把 `_primary` 放在 `bodyLead` 之后输出（注释"no reordering"，属设计），于是顺序变成"per certificate £50 → 段落 → £150"；渲染图与之一致。｜层级：renderer/model｜建议：给 `_amount` 加中文限定词（"每份证明 £50"）或把 `_primary` 放回其事实位置。
### 通过（设计如此，不必改）
- h2 分区（Fees / How long it takes / Apply online / Get help / Related content / Explore the topic）边界清楚，`Start now`、`apply for a UK passport` 有真实 href，渲染为链接而不是假 button。
- 相关/主题标签用 chip 条表达一组同类导航，符合"同一行＝可比"。

## huawei-cn/search/laptop（k=huawei-cn/search/laptop）
- [blocker] 现象："重置"控件被渲染成一条横贯整行的浅色 promo 横幅，孤零零挂在类别 radio 行下面，看起来像一个空输入框/空内容块（与 36kr"站内搜索"同一个缺陷）。｜证据：`renders/huawei-cn-search-laptop.html` 第 91 行 `<section class="group g-reset"><div class="promo"><span class="promo-label">重置</span></div></section>`；渲染图中该横幅与上方真正的输入框视觉同构。｜层级：renderer（同 B1 机制 `render.mjs:555-559`）｜建议：同 36kr 条目——控件节点不得走 promo 分支。
- [minor] 现象：底部分页 `1 2 3 4 5 … 8` 渲染成无目标、不可点的纯文本 chip，其中 `...` 也是一枚 chip；既不符合"控件像控件"，也违反公理 §8"分页控件明确不作表达"。｜证据：同一 HTML 尾部 `<div class="chips"><span class="chip-item">1</span>…<span class="chip-item">...</span><span class="chip-item">8</span></div>`。｜层级：model（不该编码分页）＋renderer（chip 无链接观感）｜建议：模型去掉分页集合，或渲染为一枚"查看更多结果"的链接。
### 通过（设计如此，不必改）
- 类别 radio（全部(80)/产品与解决方案(12)/…）带计数、互斥语义正确；`80 条结果` 作为 meta 行放在结果集之前，层级合理。
- 结果卡片同形同粒度（h3 标题链接＋描述＋来源），3 列网格整齐，无空块、无重复。

## mi-com/product-detail-mi15（k=mi-com/product-detail-mi15）
- [blocker] 现象：模型里的"用户评价"入口在渲染结果里**完全消失**（截图中找不到，HTML 里也没有）。这是唯一内容为 `_action` 的独立子节点被渲染器静默丢弃。｜证据：模型 `mi-com/product-detail-mi15.json` 顶层 `reviews:{_action:{verb:"open",to:"https://www.mi.com/shop/comment/21096.html",label:"用户评价"}}`；对 `renders/mi-com-product-detail-mi15.html` 全文 grep `用户评价` / `comment/21096` / `g-reviews` 均 0 命中；正文最后一个区块是 `g-assurances`；机制：`render.mjs:533-534` 把该节点收进 `actionKids`，`render.mjs:535` 要求 `actionKids.length>=2` 才渲染工具栏（此处只有 1 个 → 不渲染），但 `render.mjs:547` 又无条件 `actionKids.includes(c) → continue`，于是既不渲染也不回落到正常节点渲染。违反公理 §9"必须渲染每一个事实，不得丢弃"。｜层级：renderer｜建议：`render.mjs:547` 改为 `if (itemsConsumed.has(c.node) || (actionKids.length >= 2 && actionKids.includes(c))) continue;`（或把两个 actionKids 的消费逻辑合并）。
- [blocker] 现象：商品页的四个控件 `立即领取` / `修改` / `加入购物车` / `喜欢` 全部渲染成浅灰 promo 横幅——"加入购物车"是主 CTA，看起来却像一条空信息条，完全不像可点按钮。｜证据：同一 HTML：`<section class="group g-cart"><div class="promo"><span class="promo-label">加入购物车</span></div></section>`，`g-claim`/`g-modify`/`g-like` 同构；模型 `claim._title`＋`_action.label` 同名且无 `to` → 触发 `render.mjs:393-396` 的 titleIsControl，再被 `:556` 的 bareTitle 判成 promo。｜层级：renderer（同 B1 机制）｜建议：同 36kr 条目；控件必须渲染为 F-031 §4 的控件条（无目标时保留链接观感，而非 promo 横幅）。
- [major] 现象：两个价格 `¥1439` 与 `¥2999` 上下并列，都没有任何标签，读者无法判断哪个是到手价、哪个是原价/划线价。｜证据：渲染图 hero 图下方 `¥1439` / `¥2999` 两行；同一 HTML `<div class="fact"><span class="val">¥1439</span></div><div class="fact"><span class="val">¥2999</span></div>`；模型 `product._price=1439` 与 `product._amount=2999` 都没有 qualifier/标签。｜层级：model（＋renderer 无条件平铺两个金额）｜建议：给 `_amount` 加"原价"限定（如 `qualifier:"原价"`）并让渲染器把原价做成弱化/划线样式，或删掉不表达。
- [minor] 现象：商品名出现两次——h1（主图上方）与 h2（主图下方）同名，中间只隔一张图。｜证据：同一 HTML `<h1 class="title">米家宠物空气净化器</h1>` 与 `<h2 class="title">米家宠物空气净化器</h2>`；渲染图可见两处。｜层级：model｜建议：去掉页面级 `_title` 或 `product._title` 之一。
- [minor] 现象：底部"发货说明/7天无理由退货…/运费说明/企业信息/售后服务政策/7天价格保护"渲染成一行密集 chip 文本，其中只有 2/6 是链接，整体读起来像一句没有标点的长句。｜证据：同一 HTML `g-assurances` 的 `<div class="chips"><span class="chip-item">发货说明</span>…`。｜层级：renderer｜建议：给该集合一个标题（"服务与保障"）并允许有链接的成员与纯文本成员有明显的视觉区分。
- [minor] 现象：主图未满幅（两侧留白、圆角内嵌），与源站商品主图的通栏观感不同。｜证据：渲染图 hero 图内缩于内容列；同一 HTML 把主图放在普通 `<div class="fact">` 里（`.val img`）而非满幅容器；模型 `_image` 在根节点（`_image.source=screenshot`，合规）。｜层级：renderer（F-031 §7 的满幅规则）｜建议：根级 `_image` 走满幅 hero 容器。
### 通过（设计如此，不必改）
- "选择颜色 白色"只有一种颜色 → 按 F-030/§6 渲染为规格行而不是不可用的单选，正确。
- 截图派生的主图资产是允许的；模型注释里说明 slug `product-detail-mi15` 是历史误名、页面实为净化器，属策展记录，不算缺陷。

## sspai-com/home（k=sspai-com/home）
- [major] 现象：页面顶部 5 个分组（banner / editors / promo-rail / campaigns）没有任何标题，17 条链接连成一片扁平列表，编辑部文章、"白描 PDF 鸿蒙版""灵犀Linx 68 带屏键盘"这类推广/众测、"换机只选 512GB 起步？"这类投票混在同一列里，读者分不出哪些是文章、哪些是广告。｜证据：`renders/sspai-com-home.html` 第 91 行 `g-banner`/`g-editors`/`g-promo-rail`/`g-campaigns` 全是 `<div class="defrow">`，四组内无任何 `<h2>/<h3>`（组名只存在于 class 里）；渲染图顶部即这串无标题链接（含尾随标签"开学季""会员文章""众测""708 位派友参与"）。｜层级：model（分组未给 `_title`）＋renderer（无标题分组之间无区域分隔，F-031 §5）｜建议：给四个分组补 `_title`（如"今日推荐/编辑部精选/正在众测/精选专题"），渲染器对相邻无标题区块输出区域分隔。
- [minor] 现象：整页没有任何图片——feed 卡片、会员社区精选都只有文字，而源站每张卡片都有封面缩略图。｜证据：对 `renders/sspai-com-home.html` grep `<img` 只命中 CSS 行，正文无 `<img>`；渲染图全页为纯文字。｜层级：capture（`corpus` 不记录 img src，T-109 已知 ticket）｜建议：按 T-109 补采集 img src；本期属已知限制。
### 通过（设计如此，不必改）
- feed 区 12 张卡片同形（标题＋时间＋作者），3 列网格整齐；两张投票卡把"点击了解详情"作为卡内链接而不是伪造按钮，合理。
- "会员社区精选"两张卡内的 "参与讨论" 是链接、"关注" 无目标保持文本/链接观感，符合 F-031 §4；feed 切换用 radio 正确。

## sspai-com/post-114716（k=sspai-com/post-114716）
- [minor] 现象：文章顶部只有一行裸的 ISO 日期 `2026-09-18`，没有任何标签，读者不知道它是发布日期还是更新时间。｜证据：`renders/sspai-com-post-114716.html` 第 91 行 `<h1 …>本周看什么 | 最近值得一看的 9 部作品</h1><div class="fact"><span class="val">2026-09-18</span></div>`；模型 `post-114716.json:10-12` 的 `_datetime`。｜层级：renderer（无日期本地化/无标签）｜建议：渲染为"2026 年 9 月 18 日"或加"发布"前缀。
- [minor] 现象（与 sspai home 同类）：正文通篇无图（本应是图文影评）。｜证据：渲染图整篇为文字列，看不到任何海报/剧照；`corpus` 无 img src（T-109）。｜层级：capture｜建议：随 T-109 补图；本期记为已知限制。
### 通过（设计如此，不必改）
- 长文按阅读宽度单列堆叠（导语 → 9 部作品各自 `_title`＋短评信息行 → 更多 → 预告/资讯），符合 F-031 §2"长文本＝序列堆叠"；每部作品的关键词/又名/片长/观看渠道是带中文前缀的事实（"片长：40 分钟左右（单集）× 6 集"），不是裸值；`豆瓣链接`/`来源` 是有目标的链接。

## taobao-com/home（k=taobao-com/home）
- [blocker] 现象：四个会场区块（百亿补贴·买贵必赔 / 领券中心 / 国家补贴 / 淘宝秒杀）渲染成一格格只有价格的空卡片——`¥14999 / ¥6299 / ¥4999 / ¥9999`、`¥10800 / ¥6380`、`¥21800 / ¥20411`、`¥6999 / ¥652`，没有商品名、没有图、没有描述，看起来就是四排空盒子加几个数字；价格脱离商品后语义不成立。｜证据：`renders/taobao-com-home.html` 第 91 行 `<div class="cards product-cards"><div class="item"><article class="node depth-3"><div class="fact"><span class="val">¥14999</span></div></article></div>…`（四个区块同构）；模型 `taobao-com/home.json:679-704`、`:715-728`、`:769-782`、`:793-806` 的 `_items` 成员**只有 `_price`**；`corpus/taobao-com/home/meta.json` 的 `qualityFlags:["artifact_cap_exceeded"]`，且采集不存 img src（商品名在图内）→ 根因在 capture。｜层级：model（把只有价格、不可互换的成员塞进 `_items` 生成 product-cards）＋capture（无名称/图片）｜建议：渲染器对"无 `_name/_title` 的成员"不得生成商品卡（`render.mjs:522-527` 的 cards 分支应跳过或降级为价格列表）；模型侧这些成员在补到名称前不应进 `_items`，并在失败日志记一条采集缺口。
- [major] 现象：`更多低价商品` 这个入口渲染成 promo 横幅，并且**丢掉了链接**（不可点）。｜证据：同一 HTML 尾部 `<section class="block"><div class="promo"><span class="promo-label">更多低价商品</span></div></section>`，而模型 `home.json:813-820` 该节点有 `_action.to=https://www.taobao.com/`；`render.mjs:555-559` 的 promo 分支只输出 `promo-label`，丢弃了 `linkTo`。｜层级：renderer（promo 分支丢链接，与 B1 同源）｜建议：`bareTitle` 走 promo 时必须保留 `linkTo`（或让这类节点不进 promo 分支）。
- [minor] 现象：搜索框旁的"搜索""搜同款"渲染为纯文本 `<span class="action-plain">`，没有任何控件观感，看起来像标签而不是可点的搜索/同款入口。｜证据：同一 HTML `<span class="action-plain">搜索</span>`、`<span class="action-plain">搜同款</span>`。｜层级：renderer｜建议：无目标但仍应保持"可点观感"的控件用 `.ctl` 样式（F-031 §4），至少与正文文本区分。
- [minor] 现象："猜你喜欢"的 27 个商品各自成为一个整行 block（h3 标题 + 下一行裸价格），单列堆叠、右侧大片空白，价格既不与标题同行也无标签，页面下半部看起来像未完成。｜证据：HTML 中每个商品为独立的 `<section class="block"><article class="node depth-2"><h3 class="title"><a …>九九卡100元…</a></h3><div class="fact"><span class="val">¥100</span></div></article></section>`。｜层级：model（未作为同质集合）＋renderer（未聚成卡片网格）｜建议：把这些商品编成同质 `_items` 让引擎聚成卡片网格，或至少把价格并入标题同一行。
### 通过（设计如此，不必改）
- 热词/站点入口/类目控件条（`.controls` 里的 `.ctl` 链接）成行成组，成员同类可比，符合 F-031 §1；促销轮播 5 帧用 deflist（label＝会场名、value＝促销语）层级清楚。
- 淘宝直播只有两个入口链接；`百亿补贴 · 买贵必赔` 等区块标题是链接而不是纯标题；无伪造按钮、无空链接。

---

### 汇总（本组独立发现）
- blocker：3 —— ①控件被 promo 分支吃掉（36kr 站内搜索 / huawei 重置 / mi15 四个控件 / taobao 更多低价商品）；②mi15 单一 action-only 子节点（用户评价）被静默丢弃；③taobao 四会场＝只有价格的空卡片。
- major：3 —— ①iphone-17 对比表行标题是裸英文键；②mi15 两个价格无标签；③sspai home 顶部无标题扁平混合列表。
- minor：11 —— 见各页条目。
- 修复优先级建议：先改 `render.mjs` 的 `bareTitle`/`actionKids` 两处（B1、B2、taobao 丢链接、若干控件观感一次解决），再处理 iphone-17 对比表行标题取 `_title`，其余属模型侧策展回改（价格标签、分组标题、taobao `_items`）。

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "9 页逐页看渲染 PNG 并交叉核对渲染 HTML/模型/render.mjs，产出按页面组织的缺陷清单，每条含现象、可核查证据（HTML/模型行号）、层级与具体改法；另给出 blocker/major/minor 计数与修复优先级。"
    }
  ],
  "changedFiles": [],
  "testsAddedOrUpdated": [],
  "commandsRun": [
    {
      "command": "node m1/eval/pipeline.mjs",
      "result": "not-run",
      "summary": "任务明令禁止运行（会写渲染产物）；未运行，也未运行任何构建/测试命令"
    }
  ],
  "validationOutput": [
    "36kr-com-search-viz：g-submit 渲染为 <div class=\"promo\"><span class=\"promo-label\">站内搜索</span></div>（控件→promo 横幅）",
    "huawei-cn-search-laptop：g-reset 渲染为 <div class=\"promo\"><span class=\"promo-label\">重置</span></div>；分页为无目标 chip 1..8",
    "mi-com-product-detail-mi15：grep 用户评价 / comment/21096 / g-reviews 全部 0 命中 → reviews 节点被丢弃；g-cart/g-like 等 4 个控件为 promo 横幅；两个价格为裸 ¥1439/¥2999",
    "apple-com-cn-iphone-17：renders html 正文存在 cmp-row\">display 与 cmp-row\">buy（裸英文键当行标题）",
    "apple-com-macbook-air：正文无 cmp-row/cmp-col 标记（仅 CSS），机型对比未成表格；模型 :713-745 未标 _rel.compare",
    "taobao-com-home：4 个会场区块的 cards 成员只含 <span class=\"val\">¥…</span>；更多低价商品为 promo 且丢失 _action.to",
    "sspai-com-home：g-banner/g-editors/g-promo-rail/g-campaigns 全为无标题 defrow；正文无 <img>",
    "gov-uk-register-birth-abroad：help 的 3 项列表按 .linklist{columns:2} 排成 1|2 两栏；邮箱文本重复出现"
  ],
  "residualRisks": [
    "本环境无 bash/ImageMagick，无法裁切 corpus/*/full.png 做局部高清对照；apple-com/macbook-air 整页缩至 311px 宽，细字无法逐字阅读，该页结论依赖渲染 HTML 与模型（机型对比条目已标 [uncertain]）。",
    "我无写入工具，findings-4.md 未直接落盘，内容由运行时按 output 路径持久化；请父代理确认文件已写入。",
    "所有结论基于当前 m1/curated/renders/*.html 与 m1/curated/*.json 的这一版；若 P2 修复后重新渲染，缺陷状态需重跑复看。"
  ],
  "noStagedFiles": true,
  "diffSummary": "只读复核，未修改任何文件（无编辑工具被调用）",
  "reviewFindings": [
    "blocker: render.mjs:555-559 - 控件节点被 bareTitle→promo 分支吃掉（36kr 站内搜索、huawei 重置、mi15 立即领取/修改/加入购物车/喜欢、taobao 更多低价商品），控件也不像控件",
    "blocker: render.mjs:533-547 - 单一 action-only 子节点既不渲染（length<2）又被 continue 跳过，mi15 的 reviews（用户评价，含 to）被静默丢弃",
    "blocker: taobao-com/home.json:679-806 - 四会场 _items 成员只有 _price，渲染成一格格只有价格的空卡片（根因 capture 无名称/图片）",
    "major: apple-com-cn/iphone-17.json:742-836 + render.mjs:344 - 对比表行标题输出内部键 display/chip/camera/battery/ai/buy",
    "major: mi-com/product-detail-mi15.json(product) - ¥1439 与 ¥2999 并列无任何标签，无法区分现价/原价",
    "major: sspai-com/home.json + renders html - 顶部 4 组无标题，17 条链接扁平混合（文章/推广/投票）无法区分",
    "minor: gov-uk 列表 columns:2 造成 3 项拆成两栏；邮箱重复；Fees 的 'per certificate £50' 孤立片段与 £150 层级倒置",
    "minor: huawei 分页渲染为无目标 chip（且公理 §8 说不表达分页）；taobao 搜索/搜同款为纯文本 action-plain",
    "minor: mi15 商品名 h1/h2 重复、底部 assurances 成一行密集 chip、主图未满幅",
    "minor: taobao 猜你喜欢 27 个商品各自整行 block、裸价格、右侧大片空白",
    "minor: sspai home / post-114716 全页无图片（capture T-109）；post-114716 顶部裸 ISO 日期 2026-09-18",
    "minor[uncertain]: macbook-air 机型对比未成表格（成员缺 _rel.compare，renderer 只读成员级标记），与 iphone-17 形态不一致"
  ],
  "manualNotes": "任务要求把结果写到 .scratch/06-visual-review/findings-4.md，但本次运行未提供任何写入/编辑工具（只有 read/grep/find/ls/watchdog_diff/contact_supervisor）。按运行时 override（review-only 优先、返回完整产物由运行时落盘），findings-4.md 全文已在上方给出，请父代理确认已持久化。未做任何修改、未运行任何命令、未触碰 corpus/ 与代码。"
}
```

FINDINGS_DONE group=4 pages=9 blockers=3 majors=3 minors=11