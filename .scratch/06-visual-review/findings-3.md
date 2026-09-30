# 组 3 视觉复核

审查范围：`m1/curated/renders/<k>.png`（9 页整页渲染）+ 对照 `m1/curated/<k>.json`、`corpus/<k>/full.png`、`m1/render.mjs`。只读；未修改任何文件（含 corpus/）。分辨率限制：渲染 PNG 以 500–1200px 宽呈现给视觉，个别细节标 `[uncertain]`。

---

## 36kr-com/search-ai（k=36kr-com/search-ai）

- [blocker] 现象：搜索页**没有搜索按钮**——关键词输入框（"请输入关键词"）下方是一条整幅浅灰圆角横幅，左对齐写着"站内搜索"，读起来像广告位/占位条，完全不像可点控件（且 promo 分支不输出 `<a>`，提交动作的链接目标丢失）｜证据：截图 y≈150 处整幅横幅；`m1/curated/36kr-com/search-ai.json:17-26`（`submit._title.text` == `_action.label` == "站内搜索"）；`m1/render.mjs:393-396`（label==title ⇒ titleIsControl）→ `render.mjs:556-559`（bareTitle ⇒ `<div class="promo">`，且该分支只输出 `promo-label`，不包 `<a>`）｜层级：renderer｜建议：label==title 的**动作节点**必须优先渲染为控件（`a.ctl`/控件条），promo 只留给"无动作的纯标题"；有 `to` 时控件必须是真的 `<a>`。

### 通过（设计如此，不必改）
- 20 条结果卡片三列同形（标题蓝链 + 摘要 + 日期），行内高度对齐、末行残缺不刺眼；"文章/快讯/…"与"相关性/发布时间"两组筛选用 radio 是合理的控件形态。

---

## aliyun-com/product-ecs（k=aliyun-com/product-ecs）

- [blocker] 现象：三张实例卡片的主按钮文案是英文动词 **`buy`**（"e实例/u2a实例/c9i实例"卡片各一个黑色 `buy` 按钮，同页底部按钮却是"立即购买"）——内部词表标识符直接漏到界面｜证据：截图三处 `buy`；`m1/curated/aliyun-com/product-ecs.json:88-90、104-106、120-122`（`_action:{verb:"buy"}` 无 `label`）；`m1/render.mjs:363` `const copy = a.label ?? a.verb`｜层级：renderer（回退策略）+ model（缺 label）｜建议：renderer 无 `label` 时**不得**打印 verb（改为用词表内的中文动作名或回退到卡片标题作链接）；同时模型侧补 `label:"立即购买"`。
- [major] 现象：品牌"阿里云"渲染两遍——页头一条（带下划线），摘要下方又出现一条孤零零的裸行"阿里云"｜证据：截图顶部与"随时获取更强劲…"下方各一处；`m1/curated/aliyun-com/product-ecs.json:10-12`（`_brand`）；`m1/render.mjs:432`（`META_KEYS` 含 `_brand`）+ `:441`（meta 行）+ `:677`（页头 brand）｜层级：renderer｜建议：页头已输出 `_brand` 时，根节点 meta 行跳过 `_brand`（同一事实不得两处渲染）。
- [minor] 现象：卡片里价格说两遍——"个人开发者必选 · ¥99.00/月"下面又一条"¥99"（u2a/c9i 同）｜证据：截图三张卡片；模型 `:86-93`（summary 内含价格 + 独立 `_price`）｜层级：model｜建议：摘要去掉金额，或渲染时抑制与 `_price` 重复的金额。
- [minor] 现象："产品动态"四条动态挤在**同一行连排、彼此无分隔**，读起来像一句话；模型声明的 `order: time` 在渲染中没有任何体现（无编号/无时间轴/无分隔）｜证据：截图"9代Intel实例g9i正式商业化 9代AMD实例g9a正式商业化 通用算力型实例u2a正式商业化 学生专属算力包正式商业化"；`aliyun-com/product-ecs.json:143-156`（`_rel.order:"time"` + 4 条纯 `_title`）；renderer 只在 `compare` 标记下处理集合关系｜层级：model/renderer｜建议：`order: sequence|time` 的集合必须渲染出顺序感（分隔/编号/时间轴），否则模型改回堆叠。

### 通过（设计如此，不必改）
- "高稳定性/极致性能/安全可靠/高性价比"用 deflist 两栏对齐（可比、同形），实例卡的 3+1 网格与"产品动态"标题分级都清楚；`_intent` 未泄漏。

---

## apple-com/iphone-16（k=apple-com/iphone-16）

- [blocker] 现象：下单主行动 **"Continue"** 与 **"Save for later"** 被渲染成两条整幅浅灰圆角横幅（"Save for later""Continue"），既不像按钮也不是内容块，读起来是两块空广告位；同时 promo 分支会把动作的 `to` 丢掉（此处模型无 `to`，但同一缺陷在任何有 `to` 的 label==title 控件上都会丢链接）｜证据：截图 "Need a moment?" 段下方两条整幅横幅；`m1/curated/apple-com/iphone-16.json`（`recap.save.save-later`、`recap.save.continue` 的 `_title` == `_action.label`）；`m1/render.mjs:393-396` → `:556-559`｜层级：renderer｜建议：与 36kr 同修（label==title 的控件走控件形态；promo 仅限无动作纯标题）。
- [minor] 现象：四个选择框（TRADE IN / PAYMENT / CARRIER / APPLE CARE COVERAGE）顶部都有一行**无字灰色表头带**｜证据：截图每个带 legend 的框顶部灰条；`m1/render.mjs:256` 无条件输出 `<thead><tr><th class="sel"></th><th>…` 而 `FIELDS`（`m1/vocab-fields.json`）中不存在 `_name/_detail/_subtitle` 的 label ⇒ 列名为空｜层级：renderer｜建议：所有列 label 皆空时不输出 thead（省掉灰带）。
- [minor] 现象："Which iPhone is right for you?" 五款机型字段键高度重合（battery/chip/camera/front 可对齐），却各堆成一段、属性名完全不出现（`display/battery/chip` 键名不渲染），读者无法横向对照；模型也没给 `_rel.compare`｜证据：截图五段规格；`iphone-16.json` `compare._items[0..4]`；`m1/render.mjs` 只在 `_rel.compare` 段走 `renderCompareTable`｜层级：renderer（自判可比）/model（补标记）｜建议：按 `docs/m1/layout-axes.md` §2 由引擎自判可比后走对比表，或模型侧补 `_rel.compare`。

### 通过（设计如此，不必改）
- 六步配置流程（Finish/Storage/Trade In/Payment/Connectivity/AppleCare）已按 F-031 反例**改为堆叠**、每块自带标题；颜色单选有 legend、只有一个选项的容量规格行没有硬塞成不可用单选；FAQ 折叠、Carbon/环保等段落层级清楚。

---

## bilibili-com/video-bv1gj411x7h7（k=bilibili-com/video-bv1gj411x7h7）

- [major] 现象：视频标题渲染**两遍**——顶部 H1 与视频下方又一次同样的大字标题"【官方 MV】Never Gonna Give You Up - Rick Astley"｜证据：截图两处；`m1/curated/bilibili-com/video-bv1gj411x7h7.json:4-7`（`_title` 只出现一次）+ `_primary: "_title"`；`m1/render.mjs:410-417`（`_primary` 指向 `_title` 时把标题事实塞进 hero 槽位，`hide` 只隐藏该**事实**、不隐藏**标题**，于是标题被输出两次）｜层级：renderer｜建议：`_primary` 命中 heading 键（`_title/_name`）时跳过 hero，或把 heading 一并视为已消费。
- [major] 现象：整页多处**无标签裸数字**——视频信息行"1亿 15万 0:33:03"、互动栏"293.3万 127.5万 154.3万 49.5万"、每张推荐卡"134.9万 981"，读者无法知道哪个是播放/弹幕/点赞/投币/收藏｜证据：三处截图；`…json:8-19`（`_count/_measure/_duration` 全是 text 值）、`:134-135`（四个数熔进**一个** `_measure.text`）、`:334-336`（卡片 `_measure:"134.9万 981"`）；`m1/render.mjs:432-441`（meta 行只输出值、不带角色标签）｜层级：renderer（标签）+ model（熔成一条）｜建议：meta 行按角色输出标签（播放/弹幕/点赞…）；模型把四个互动数拆成带标签的独立事实。
- [minor] 现象："弹幕列表"下只剩一行"弹幕列表填充中…"——源站**加载态文案**被当作内容事实渲染｜证据：截图"弹幕列表填充中…"；模型 `:116-123`（`_summary:"弹幕列表填充中..."`）｜层级：capture（应过滤瞬时加载态）/model（用状态表达）｜建议：采集侧丢弃 loading 文案，或用 empty/loading 状态而非事实。
- [minor] 现象：粉丝数"94.9万"出现两次（UP 主 meta 行 + "关注 94.9万"按钮内）｜证据：截图 y≈1150 与 y≈1200；模型 `:279-283`（`_count` 与含计数的 action label）｜层级：model｜建议：计数只在一处出现。

### 通过（设计如此，不必改）
- 播放器画面为截图派生资产（`../assets/bilibili-video-player.png`，含飘屏弹幕的**像素**、未转写文字）⇒ 合规；"字幕制作人"chips、"接下来播放"三列同形网格、"视频已失效"卡片按抓取照实渲染、日期与 UP 主位置都合理。

---

## huawei-cn/home（k=huawei-cn/home）

- [major] 现象：**新闻标题被渲染成控件条胶囊按钮**——"新闻动态"下 7 条长标题（20–29 字）各是一个带边框胶囊链接，两两一行、第二行起始错位；读者会把内容当成筛选项/按钮｜证据：截图"新闻动态"下的胶囊群；`m1/curated/huawei-cn/home.json:171-186`（`news._items[*]` = `_title` + 无 label 的 `_action`）；`m1/render.mjs:83`（"有 `_action` 的纯标签集合 ⇒ 'controls'"）先于 `:86-93`（长标签 ⇒ 'list'）判定，长标题的 list 分支永不生效｜层级：renderer｜建议：把长标签（≥16 字 / 以问号结尾）判定提到控件判定之前；只有短标签的动作集合才走控件条。
- [minor] 现象："新闻动态"标题下一条**孤立的裸日期**"2026-09-18"，无任何标签，读起来像无归属的数字｜证据：截图；模型 `:165-168`（区块级 `_datetime`）｜层级：model｜建议：给日期加位置/含义（如"当日发布"）或并入每条新闻。
- [minor][uncertain] 现象：整页**零图像**——源站首屏是两张横幅大图（模型 hero 只有文字 + "了解更多"动作），渲染只剩两个胶囊链接；怀疑是 `img src` 未入库（T-109）｜证据：截图无任何图片；`home.json` hero._items 无 `_image`｜层级：capture/model｜建议：按 `layout-axes` §7 补满幅图带（截图派生资产）；如确认 T-109 未关闭则记 capture。

### 通过（设计如此，不必改）
- "我们的业务"六项 chip 导航（短标签、同形紧凑）符合 layout-axes §2 的"真可比"；"推荐信息"四行 deflist（链接标题 + 描述）与"构建万物互联的智能世界"段落 + 按钮的层级都清楚。

---

## mi-com/home（k=mi-com/home）

- [major] 现象：页尾**约 1300px 纯空白**——图带 10 张资产里有 3 张是全白图，被当成正常图带渲染成空块｜证据：`m1/curated/assets/mi-home-band8.png`、`band9.png`、`band10.png` 三张我都逐张读图确认**纯白**（band7 = Sound 2 Max 有内容）；渲染截图内容止于 y≈1480/2000，其余 1/4 全白；源站整页截图 `corpus/mi-com/home/full.png` 同一区域本身就是空白（懒加载未渲染即截图）｜层级：capture（截图未触发懒加载）→ 渲染侧无防护｜建议：采集侧滚动/触发懒加载后再截全页；渲染侧跳过与相邻块几乎全白/完全相同的图片资产。
- [minor] 现象：源站页脚（站点导航、联系我们、950816、小米商城链接、备案信息）**完全缺失**｜证据：`corpus/mi-com/home/full.png` 底部有一整块页脚文本；`m1/curated/mi-com/home.json` 只有 `showcase` 图带，无 footer 节点｜层级：capture/model｜建议：补页脚故事线（导航/联系方式/备案）。

### 通过（设计如此，不必改）
- 图带是截图派生资产、`alt:""` 未转写任何文字 ⇒ 符合 F-025；各图带同宽（100%）满幅、无重复块，首屏"mi 导航条"烘进图片属允许的像素事实（任务书已确认合规）。

---

## mi-com/shop-category-list（k=mi-com/shop-category-list）

- [minor][uncertain] 现象：若干分组标题含**异常内部空格**——"笔记本 平板 显示器"、"生活 箱包"、"智能 路由器"、"健康 儿童"（其余分组标题无空格），疑为源站多行标题被合并时插入｜证据：截图四个 H2；无法在本次预算内核对 `corpus/mi-com/shop-category-list/nodes.json` 的原始分行｜层级：model/capture｜建议：核对抓取的原始分行，去掉空格或改成"·"。

### 通过（设计如此，不必改）
- 十个分组 × 短标签 chip 条（同类、同形、紧凑）完全符合 layout-axes §2 的"真可比"；无空块、无裸数字、层级清晰；长标签（如"Xiaomi 家庭屏 Mini"）换行也未压成"一行一两个字"。

---

## sspai-com/post-114699（k=sspai-com/post-114699）

- [major] 现象：评论区**丢失空态说明**——渲染里只有"说点什么..."输入框和"默认/热门"排序，模型里声明的"暂时还没有评论，先来评论一条吧"没有出现｜证据：截图评论段；模型 `m1/curated/sspai-com/post-114699.json:478-485`（`_items: []` + `_empty._summary`）；`m1/render.mjs:521`（`_empty` **只在 `form === 'table'` 分支**渲染，该节点不是表格形态）；`grep renders/sspai-com-post-114699.html "暂时还没有评论"` → **无匹配**（已核实）｜层级：renderer（F-013 的 `_empty` 对非表格形态不可达，违反"每个事实都必须渲染"契约）｜建议：集合为空时 `_empty` 对所有形态生效。
- [major] 现象：同一组"你可能错过的文章"**形态分裂**——前两条是胶囊链接，第三条"城市漫步指南 | 威海初秋，看海玩沙"渲染成整幅浅灰横幅（promo），看起来像广告位｜证据：截图该组；`m1/render.mjs:556-559`（第三条动作为无 label 的 `navigate` ⇒ `linkTo` 吃掉动作 ⇒ 其余为空 ⇒ bareTitle ⇒ promo），而前两条动作带 label ⇒ 走控件/胶囊｜层级：renderer｜建议：同前（promo 仅限无动作纯标题）；第三条是否与容器同宽受分辨率限制 `[uncertain]`，但**与同组前两条形态不一致**是明确的。
- [minor] 现象：7 条要闻里只有第 3 条（Mistral 那条）多出两个小控件"发表首评/来源"，同行其它卡片没有，行内不同形、该卡也更短导致行高参差｜证据：截图第一行第 3 张卡下方两个小胶囊；模型 `news` 第 3 项多一个 `comment` 子节点（`:77-83`），其余条目无｜层级：model（也可能是 capture 只在该条采到，`[uncertain]`）｜建议：这类入口要么全集合一致、要么上提为集合级控件。
- [minor] 现象：元信息行 `08:17 8分钟阅读` 两个不同含义的值连写无分隔｜证据：截图标题下第 4 行｜层级：model｜建议：用 meta 分隔符或标签。

### 通过（设计如此，不必改）
- 三栏要闻网格对"同形短摘要"是合理的行布局；"不妨一看的简讯"三列、"往期派早报"（带日期列）层级与形态都成立；`本文责编：@北鸮`、`11 位派友已充电` 等 meta 值都带上下文。

---

## stripe-docs/payments（k=stripe-docs/payments）

- [minor][uncertain] 现象：筛选组**组提示与第一个选项同名**——fieldset 顶部小字"最热门"，紧接着第一个单选项也写着"最热门"，读者连着看到两个相同标签｜证据：截图第一段字段组；`m1/curated/stripe-docs/payments.json:23-36`（`_summary:"最热门"` 与 `_items[0]._name:"最热门"`）｜层级：model（若源站确实如此则记 capture）｜建议：组提示换成真正的类别名（如"筛选/按场景"）或去掉。

### 通过（设计如此，不必改）
- 章节层级（支付选项/支付方式/支付之外/平台和市场/更多指南）清楚；deflist 行（链接标签 + 描述）、三张等高卡片、五个 chip 子组都符合 layout-axes；`_intent` 未泄漏；无空块、无裸数字、无重复块。

---

## 跨页结论（供 P2 修复排序）

1. **同一渲染器缺陷影响多页**：`label == _title/_name` 的动作节点被 promo 分支吞掉（36kr 搜索按钮、apple Save for later/Continue、sspai 第三条推荐）——修 `m1/render.mjs:556-559` 的分支条件即可三页同好，且能顺带避免"控件丢 `<a>`"。
2. **裸内部标识符**：`render.mjs:363` 的 `a.label ?? a.verb`（aliyun `buy`）——建议改为"无 label 不打印 verb"。
3. **事实两处渲染**：`_brand`（aliyun）与 `_primary == _title`（bilibili）都会把同一事实输出两遍。
4. **可渲染性缺口**：`_empty` 只在 table 形态可达（sspai 空评论区事实被静默丢弃）；`_rel.order` 无渲染分支（aliyun 产品动态）。
5. **capture 层**：mi-com/home 三张纯白图带（懒加载未加载即截图）+ 页脚缺失 + huawei 首页零图像（T-109）。

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "9 页逐页读图复核完成，产出按 task 结构的 findings；每条缺陷均给出截图现象 + 模型/渲染器行号或资产文件级证据，并标注 renderer/model/capture 层级与不确定项。"
    }
  ],
  "changedFiles": [],
  "testsAddedOrUpdated": [],
  "commandsRun": [
    {
      "command": "read m1/curated/renders/*.png（9 页）+ assets/mi-home-band{1,2,7,8,9,10}.png + corpus/mi-com/home/full.png",
      "result": "passed",
      "summary": "视觉判断完成；未运行任何会写产物的命令"
    },
    {
      "command": "grep '暂时还没有评论' m1/curated/renders/sspai-com-post-114699.html",
      "result": "passed",
      "summary": "无匹配 → 证实模型声明的空态事实未渲染"
    }
  ],
  "validationOutput": [
    "grep -n '_primary' m1/render.mjs:410-417 hero 由 _primary 事实构造且只 hide 事实 → _primary:'_title' 时标题二次输出（bilibili）",
    "grep -n '_empty' m1/render.mjs: render.mjs:282/521 两处均位于 form==='table' 分支 → 非表格集合的空态不可达",
    "grep -n 'label' m1/render.mjs:363 actionHtml 用 a.label ?? a.verb → verb 直接上屏（aliyun 'buy'）",
    "grep -n 'promo' m1/render.mjs:556-559 promo 分支不输出 <a>，条件为 depth>0 && titleText && 其余全空",
    "grep -n 'BASELINE' 未执行；未运行 m1/eval/pipeline.mjs（禁止）"
  ],
  "residualRisks": [
    "渲染 PNG 在视觉上被下采样（如 mi-com/home 1280x4779 → 536x2000），若干细节（sspai 第三条横幅的实际宽度、aliyun '产品动态' 左竖线来源）标 [uncertain]，未用 ImageMagick 裁切复核（本子代理无 shell 工具）。",
    "是否所有模型/渲染对都已同步：本轮未见模型含 '0:33:03' 之类渲染文本（疑为我看图误读），未发现渲染产物整体过期的确证，但也未系统核对 mtime。",
    "istock: 部分缺陷（hreflang 类似物）如 huawei 首页零图像的最終歸因取决于 T-109（采集是否记录 img src）是否已关闭。",
    "未独立复跑门禁（pipeline/audit-visual 会写渲染产物，任务明令禁止），因此'36/36 自查干净'这一基线与本轮视觉结论之间的差异（如空表头、promo 控件）未被自动化门禁捕获，属门禁覆盖缺口。"
  ],
  "noStagedFiles": true,
  "diffSummary": "只读复核，无代码/模型改动；未生成任何仓库内文件（findings 由 runtime 落到 outputs 路径）。",
  "reviewFindings": [
    "blocker: 36kr-com/search-ai — 搜索提交按钮被渲染成整幅 promo 横幅且丢链接（render.mjs:393-396 + 556-559）",
    "blocker: apple-com/iphone-16 — 主 CTA 'Continue'/'Save for later' 渲染成整幅横幅、无控件观感",
    "blocker: aliyun-com/product-ecs — 三个按钮文案是裸内部标识符 'buy'（render.mjs:363）",
    "major: aliyun — _brand 渲染两遍（meta 行 + 页头）",
    "major: bilibili-com/video-bv1gj411x7h7 — 标题因 _primary:'_title' 渲染两遍；多处无标签裸数字",
    "major: huawei-cn/home — 新闻长标题被渲染成控件条胶囊（render.mjs:83 先于 86-93）",
    "major: mi-com/home — 3 张纯白图带资产造成页尾约 1300px 空白（capture：懒加载未加载即截图）",
    "major: sspai-com/post-114699 — _empty 空态事实被静默丢弃（render.mjs:521）；同组推荐链接形态分裂",
    "minor×10: aliyun 价格重复/order 语义丢失；apple 空表头/对比被堆叠；bilibili 加载态文案/计数重复；huawei 裸日期/零图像；sspai 单卡多控件/元信息连写；stripe-docs '最热门' 自指；mi-com/shop-category-list 标题异常空格"
  ],
  "manualNotes": "最值得 P2 优先修的是单点、跨页收益最大的渲染器缺陷：(1) label==title 的动作节点走 promo（36kr/apple/sspai 三页受害）；(2) actionHtml 的 verb 回退（aliyun 'buy'）；(3) _primary 命中 heading 键导致标题重复 + _brand 两处渲染；(4) _empty 只在 table 形态可达。capture 侧两条：mi-com/home 懒加载空白图带、huawei 首页无图（T-109）。另请注意门禁缺口：视觉自查未捕获'空表头行'与'控件被渲染成横幅'两类问题，建议把两者加入 audit-visual 的检查项。"
}
```

FINDINGS_DONE group=3 pages=9 blockers=3 majors=7 minors=10