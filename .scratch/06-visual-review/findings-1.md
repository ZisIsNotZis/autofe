## 组 1 视觉复核

方法说明：本次只能用整页 PNG（read 图像，长页会被降采样）逐页目视，无 bash/ImageMagick 可用，因此没有做局部裁切放大；所有坐标均为目视近似值。缺陷层级按 `m1/curated/<k>.json` 与 `m1/curated/renders/<k>.html` 的实际标记判断。

```markdown
# 组 1 视觉复核

## 36kr-com/home（36kr-com/home）
### 通过（设计如此，不必改）
- 页面骨架正确：h1 → 热搜/头条 chip 条 → 「最新文章」3 列文章网格（行=可比、同形：标题/摘要/来源·时间）→ 「查看更多」→ 专题/快讯/推荐/企业号/24小时热榜，层级清晰。
- 分栏节奏合理：3 列卡片高度接近、无空块、无重复块、无裸露内部标识符；chip 与文章卡两种形态没有互相混入。
- 无图：源站列表项有配图但本渲染 0 图，属已知采集缺口（T-109 / nodes.json 未记 img src），本页正文可读，不单列为缺陷。

## airbnb-com/room-28871（airbnb-com/room-28871）
- [major] 现象：标题+「共享/添加至心愿单」下面第一行是一串未分隔的图片替代文字——「「舒适的双人房」图片 1 市中心客房 Reguliersdwarst 的Edwinsguesthouse 「舒适的双人房」图片 4 「舒适的双人房」图片 5」，既不是图、也不是内容，读起来像乱码（夹生英文串）。｜证据：render 顶部第 3 行（标题 y≈50、按钮 y≈95 之下）；`m1/curated/airbnb-com/room-28871.json` 的 `gallery._items` 5 项只存 `_name`＝图片 alt。｜层级：model（+capture 无图源）｜建议：`gallery` 不要作为 chip/条目集合——补截图派生图墙（等宽满幅），或删除该行只留「显示所有照片」控件。
- [major] 现象：`4.86`、`815` 两个无标签无单位裸数字各自独占一行，紧接着又是一句「评分为 4.86 星（满分 5 星）。」；「总体评分」区把 `4.86`、`815` 又输出一遍——同一事实页面出现两遍，且第一遍是裸数字。｜证据：render y≈205-250 与 y≈1215-1250；model 中 `overview.rating._rating/_rating-count` 与 `_detail.text` 并存，另有 `overall` 区重复。｜层级：model（同一事实两处）+ renderer（`_rating`/`_rating-count` 无标签单位）｜建议：renderer 输出「4.86 分 · 815 条评价」，model 去掉与之重复的 `_detail` 句子。
- [major] 现象：评分分布被排成一行连续文字——「5 星，88% 的评价 4 星，11% 的评价 3 星，1% 的评价 2 星，0% 的评价 1 星，0% 的评价」，无法扫读，且末句「0% 的评价」被截断。｜证据：render y≈1330 整行。｜层级：renderer（该集合应渲染为多行/条形，而非行内连排）｜建议：按星档渲染为表格行或条形，每档一行。
- [major] 现象：页尾 10 行「地段 616 / 待客之道 582 / 共用空间 57 / 步行便利程度 161 / 洁净程度 220 …」：数字没有单位，且这一整块没有任何标题，直接跟在有标题的评分列表后面（只有一片空白），按 F-031 §5 会被读成评分列表的下属内容。｜证据：render y≈1560-1930，其上前一个标题是「总体评分」（y≈1210），二者之间无 `hr.region`、无小标题；model 中这些项无 `_title`。｜层级：renderer（缺区域分隔）+ model（无标题/单位）｜建议：补区块标题（如「住客最常提到的」）与单位「616 条评价」。
- [minor] 现象：「房客」下面是一个空的无占位文本框（值「1 位客人」以纯文字留在框外），用户看到的是「1 位客人 + 一个空框」。｜证据：render y≈1080-1130。｜层级：renderer｜建议：把当前值或占位放进控件。
### 通过（设计如此，不必改）
- 入住/退房日期已用原生 `input[type=date]` 且各自带「入住日期 / 退房日期」标签（F-031 §6 已修复）。
- 房源亮点（标签 + 说明）成行、睡眠空间、便利设施 chip 条、「查看可订状态/举报此房源」控件、房东区（Edwin / 超赞房东·16 年出租经验）都合理，无形态分裂/重复块。

## apple-com/home（apple-com/home）
- [major] 现象：「Buy」「View pricing」「Apply now」被渲染成整行、浅底带边框的方框，文字左对齐——视觉上就是空白输入框（源站是蓝色胶囊按钮）；而同一页同一层级的「Learn more」却是深色实心胶囊，两种形态并存，用户无法判断「Buy」能不能点。｜证据：render y≈170 / y≈450 / y≈590 / y≈878 / y≈1088 的宽方框 vs y≈238 的深色胶囊。｜层级：renderer（无目标动作降级为 `action-plain` 时的样式）｜建议：`action-plain` 改成贴合内容的可点击观感（inline-block、按钮底色），不要整行铺满的输入框样式；并统一同级动作形态。
- [major] 现象：整页 0 张图片——源站 Apple 首页是产品主视觉图片墙（每张卡片都配一张大图），渲染物只剩文字卡与控件，页面观感从「产品橱窗」变成「文字目录」。｜证据：render 全页无 `<img>`（`m1/curated/apple-com/home.json` 全文无 `_image`/`image`）。｜层级：capture（img src 未采集，T-109）+ model（未采用 mi-com 那种截图派生资产）｜建议：按 mi-com 先例用截图派生满幅图带（`_image.source=screenshot`），否则在交付说明里明确记为 capture 缺口。
- [minor] 现象：「Endless entertainment.」3 列网格里同排按钮基线不齐（如「See the schedule」明显高于同排两个「Stream now」），行内底部参差。｜证据：render y≈1540-1630。｜层级：renderer｜建议：卡片内容底对齐/按钮贴卡片下沿。
### 通过（设计如此，不必改）
- h1「Apple」→ 产品区块 → 「Endless entertainment.」h2 的管辖范围清晰；3 列卡片行内同形同粒度；页尾 chip 条（Sabrina Carpenter…/Programs）是链接样式、未伪装成标题；未出现纯标题块冒充章节标题（T-106 未复发）。

## bilibili-com/home（bilibili-com/home）
- [blocker] 现象：页面唯一的一张图片（被放在标题「第五人格亲密之月」之下、占据首屏）实际是**站点顶部导航条截图**：里面是「首页/番剧/直播/游戏中心…搜索框/登录/大会员/消息/动态/收藏/历史/创作中心/投稿」+「动态/热门/番剧…」+「登录后你可以：免费看高清视频 / 多端同步播放记录」，真正的活动主视觉只剩最底几像素的绿色。标题说的是轮播活动，图给的却是导航+登录浮层，主视觉与标题互相矛盾，且导航本属 v0 明确不表达的「导航历史」（axioms §8）。｜证据：`m1/curated/assets/bilibili-banner.png`（我读到的内容即上述导航条）；render 中该图位于 y≈180-290，而其上是 `<h2 class="title">第五人格亲密之月</h2>`（render HTML 第 91 行 `group g-banner`）。｜层级：model（资产选错）+ capture（裁切带宽错误，把 header 带当成轮播带）｜建议：重裁轮播横幅的完整区域（活动主视觉主体，不含或另置导航带）；若确实拿不到活动图，就把该节点降级为 promo 且不加假标题。
- [major] 现象：页面最上面是一个空白方框（无标签、无占位、无提示），看不出是搜索框还是坏掉的控件；模型注释里写明「框内灰字是轮播的热搜提示」，渲染物里这个提示完全不存在。｜证据：render y≈95-143 的空框；render HTML 第 91 行 `<span class="expose expose-query"><input type="text" name="query" data-type="text" aria-label="query"></span>`；`bilibili-com/home.json` 的 `search` 只有 `_expose{name:"query",type:"text"}`，无 `_label`。｜层级：renderer（`_expose` 不输出可见标签/占位）+ capture（热搜灰字未采集）｜建议：renderer 用 `_label`/`_name` 渲染可见 label 或 placeholder；模型给该节点补标签。
- [minor] 现象：视频卡标题是浏览器默认的蓝色下划线链接，与 36kr/apple 渲染物里的深色粗体标题形态完全不一致，整页像未套样式的 HTML。｜证据：render 全部 11 张卡的标题（y≈383 起）均为蓝色下划线。｜层级：renderer（链接默认样式）｜建议：卡片标题走站点标题样式，链接观感另做。
- [minor] 现象：视频卡全部没有封面图（源站每张卡带封面），卡片只剩标题/时长/UP主/播放数，密排文字块。｜证据：render 3 列卡片区全无 img。｜层级：capture（T-109）｜建议：同 mi-com 用截图裁切派生封面，或明确记为 capture 缺口。
- [minor] 现象：末行直播卡（「这个维什戴尔跳舞好有劲！」+「直播中」+「团播」+「SG·次元姬  1.9万」）与视频卡同处一个行布局，字段集合不同形（无时长、多出「直播中」），该行高度参差；按 F-031「同一行＝可比」，直播卡不该和视频卡同行。｜证据：render y≈1655-1855，同行另一张卡是普通视频卡。｜层级：model（live 卡混进 `feed._items`）｜建议：直播卡单独成组或补齐同形字段。
### 通过（设计如此，不必改）
- h1 用源站标题、11 张视频卡行=可比、字段「标题 → 时长 → UP主·时间 → 播放·弹幕」顺序稳定，日期混用（09-15 / 11小时前 / 昨天）经比对属源站真实，不是渲染错误。

## grafana-play/play-home（grafana-play/play-home）
- [blocker] 现象：主体区块的 11 个面板名被渲染成**无分隔的行内文字连成一句**——「Introduction Color background The Basics Color value Horizontal with graph Horizontal Text mode name Auto grid Value only No text Emoji in stat names」；读者完全无法分辨这是 11 个面板，看着像一句截断的英文句子。｜证据：render y≈307-350；`m1/curated/grafana-play/play-home.json` 的 `panels._items` 是 11 个只有 `_name` 的条目且 `_rel.order="sequence"`。｜层级：renderer（纯 `_name` 的序列项走了行内文本分支）｜建议：序列项渲染为独立块（列表/网格），至少每项自带边界分隔。
- [major] 现象：面板体全部丢失——源站每个面板内部有可见文本「Loading plugin panel…」（我看过源站整页：`corpus/grafana-play/play-home/full.png`，Introduction / The Basics / Horizontal / Text mode… 等面板体都是这行字），渲染物只剩面板名，导致整页主体（约 500px 高）全白，页面像一个空壳。loading 状态按 axioms §3.1 也必须可表达。｜证据：corpus 源站截图各面板体；render y≈370 以下全白。｜层级：capture/model（面板体文本未采集、loading 状态未建模）｜建议：把面板体文本作为事实/状态采集渲染。
- [minor] 现象：工具栏 3 个控件（Last 6 hours / Refresh / Enter edit mode）与 2 条 Grafana 官方横幅同样渲染为蓝色描边胶囊，控件与内容条同形，层级不分。｜证据：render y≈137-195（控件）与 y≈195-280（横幅）。｜层级：renderer｜建议：控件与 promo 条用不同形态。
### 通过（设计如此，不必改）
- h1「Stats」、事实「Time range selected: Last 6 hours」、两条横幅都是带真实 `to` 的可点链接（render HTML `data-verb`/`href`），未把左侧导航/面包屑编码进模型（符合 axioms §8）。

## huawei-cn/search-phone（huawei-cn/search-phone）
- [major] 现象：筛选区下方的「重置」被渲染成整行浅底方框，与上方真正的输入框（「请输入关键字」）外观近似——看起来像被禁用/空白的表单字段，而不是可点的控件。｜证据：render y≈300-360 的宽方框；对照 y≈90-125 的真实输入框。｜层级：renderer（`action-plain` 样式）｜建议：重置用按钮/链接形态、宽度贴合内容，别整行铺满。
- [minor] 现象：结果标题一律是默认蓝下划线链接（10 条），与 36kr/apple 渲染物里的深色标题不一致。｜证据：render y≈410/525/650… 全部标题。｜层级：renderer｜建议：统一标题样式。
- [minor] 现象：分页「1 2 3 4 5 … 357」是裸数字行，无「页码」提示，省略号与 357 之间只有空白分隔。｜证据：render y≈1785。｜层级：renderer｜建议：加页码语义/明确分隔（或标注「第 1 页，共 357 页」）。
### 通过（设计如此，不必改）
- h1「搜索结果」、带标签的搜索输入框、「类别」筛选 5 个选项（带结果计数 3562/160/1443/181/330）、「3562 条结果」、结果列表「标题/摘要/来源」、分页都在；第 5、9 条只有标题+来源属源站本身无摘要，不是漏渲染。

## mi-com/search-earbuds（mi-com/search-earbuds）
- [major] 现象：左侧竖排 4 个空白文本框：模型里「促销 / 分期 / 仅看有货」是 `_expose{type:"bool"}` 的开关，却被渲染成空文本输入框（应是勾选框）；「收货地」的当前值「北京 北京市」以纯文字贴在框外，框内空空。用户看到的是「北京 北京市 + 一个空框」「仅看有货 + 一个空框」，像坏掉的表单，无法判断哪个能点、当前勾了什么。｜证据：render y≈170-460 的四个空框；`search-earbuds.json` 的 `conditions._items[*]._expose.type == "bool"`，`delivery` 只有 `_label`+`_place`。｜层级：renderer（`bool` 未渲染 checkbox、值未进控件）+ model（值/标签未上控件）｜建议：按 `_expose.type` 渲染真实控件（bool→checkbox、text→input/select），标签与当前值都放在控件上。
- [minor] 现象：商品卡的价格对（¥369 / ¥399、¥229 / ¥249、¥99 / ¥119）用相同字重字号并列，分不清现价与原价（源站有主次/划线）。｜证据：render 第 1-3 行卡片（y≈515-620）。｜层级：renderer｜建议：现价强调、原价弱化或划线。
- [minor] 现象：「加入购物车」同样渲染为整行浅底框（同 apple 的 Buy / huawei 的 重置），控件观感弱。｜证据：render 猜你喜欢各卡（y≈1400 起）。｜层级：renderer｜建议：同 action-plain 修复。
- [minor] 现象：商品卡全部没有商品图（源站每卡一张），卡片偏空。｜证据：render 商品网格全无 img。｜层级：capture（T-109）｜建议：补截图派生缩略图或记为 capture 缺口。
### 通过（设计如此，不必改）
- h1「所有产品-小米商城」、带「分类」标签的筛选行、3 列商品网格（行=可比、同形：标题/价格/补贴）、「1 2」分页、「猜你喜欢」区（标题/价格/好评数/加入购物车）都成体系，无重复块/空块。

## sspai-com/matrix（sspai-com/matrix）
- [major] 现象：「我来说一说 / 更多一派讨论」下方是一个整行浅底框，里面只有一句「快速投票：换机只选512GB 起步？」，没有选项、没有可点观感——既是空控件又像空输入框；源站这是带选项的投票组件。｜证据：render y≈1355-1400 的宽框。｜层级：model/capture（投票选项未采集）+ renderer（无内容块仍画出控件框）｜建议：补齐选项按真实控件渲染；拿不到选项就不要输出这个框（或按 F-030/promo 处理）。
- [minor] 现象：3 列文章卡网格的左侧有一条贯穿全区的竖直细线，每行在行首有一个孤立的黑色圆点，圆点与卡片行首不同高——这是 `_rel.order="time"` 的时间轴导轨叠在网格布局上，看着像残留装饰线。｜证据：render x≈90 的竖线 + y≈155/270/390/515/645/775/905/1030 的圆点。｜层级：renderer｜建议：网格布局不绘制时间轴导轨，或让导轨只作用于序列布局。
### 通过（设计如此，不必改）
- h1「Matrix 社区」+ 三个标签页控件（精选/热门/随便看看，形态如控件）、3 列条目（行=可比、同形：标题/日期/作者）、「值得关注」（名称+简介）与「专栏推荐」（名称+关注人数）两区层级清晰、无重复；标题里的「…」属源站截断。

## sspai-com/u-jtc092al（sspai-com/u-jtc092al）
- [major] 现象：「成就与徽章」下 5 个同形事实（名称+数值）被竖排成 5 个大区块：「成为少数派 / SINCE 2025 / 529 天」「创作文章 / 25」「文章阅读量 / 23535」「获得充电 / 4」「获得徽章 / 暂无徽章 / 0」，每块之间留出约 60px 空白、整区占掉近半页，数字孤零零一行。按 F-031 §2，这 5 项同形、同粒度、紧凑 ⇒ 应成行（可比），不该堆成 5 个区块。｜证据：render y≈370-900；`m1/curated/sspai-com/u-jtc092al.json` 该节点 `_items` 为 5 个同形条目。｜层级：renderer（可比闸门未把该集合排成行）｜建议：渲染为一行并列的统计块（名称+数值），或至少压缩为紧排定义列表。
- [minor] 现象：「获得徽章」同时输出「暂无徽章」与「0」，同一事实说两遍（0 枚 = 暂无徽章）。｜证据：render y≈855-895；model 同一条目里 `_count:0` 与 `_detail:"暂无徽章"` 并存。｜层级：model｜建议：二者取一。
- [minor] 现象：「动态」列表 10 条的日期时间列不对齐（「07/27 08:27」在 x≈600，而「04/23 08:56」在 x≈700），日期被长短不一的标题推着走，看起来像是标题的一部分。｜证据：render 动态各行右侧日期位置逐行漂移。｜层级：renderer｜建议：日期固定列（右对齐或独立列）。
### 通过（设计如此，不必改）
- h1「MaxChow 的动态 - 少数派」、作者身份块（MaxChow / 少数派作者 / 关注）、「动态」逐条列表（可点标题 + 日期 + 行分隔线）都合理，未出现重复块或裸露内部标识符。

FINDINGS_DONE group=1 pages=9 blockers=2 majors=12 minors=13
```

补充两点给 P2 修复者的说明：

1. **跨页同一缺陷（值得优先在 renderer 一次性修）**：无目标/无 href 的 `_action` 被渲染成「整行浅底方框」，在 apple（Buy/View pricing/Apply now，最严重）、huawei（重置）、mi（加入购物车）三页复现，观感等同输入框，违反 F-031 §4「控件必须像控件」。同一 renderer 分支还让「纯 `_name` 条目集合」输出成无分隔行内文字（grafana 面板名、airbnb 图墙 alt），建议一并检查该分支的分隔与形态。
2. **图片缺口**：airbnb/bilibili/mi/apple 四页 0~1 张图，其中 apple 首页、bilibili 视频流在源站是图像主导（F-031 §7）。bilibili 唯一那张图还是取错的导航条带；这属于 capture 侧 T-109 + 资产裁切的问题，建议与「是否统一采用 mi-com 截图派生资产」一起定夺。