# 终审（第三轮 · 看图）· group=3

对象：`m1/curated/renders/<key>.png|.html`（manifest v=`mup9vnyf`）。
**哈希门禁**：10/10 页 `sha256(PNG)==manifest.png.sha256` 且 `sha256(HTML)==manifest.html.sha256` ⇒ 下面看到的图就是当前产物，无 stale shot。
图片预算 8 张，实用 6（1 首批拼版 + 4 分页拼图 + 1 杂项拼图）；另做零成本量测（页高/死白带/`<img>`/`background-image` 枚举 + corpus `nodes.json` bbox 比对）。
归属层：renderer / model / capture / asset。

---

## 昨夜修复的复核（先说结论，逐条）

| 声明已修 | 本组实测 | 判定 |
|---|---|---|
| 图片补齐（多页 0→有图） | 36kr-search-ai 0→**9**、bilibili-read-home 0→**19**、sspai-114699 0→**5**、mi-home 7 保持 | ✅ 部分生效 |
| 满幅图带 | mi-home 7 条 band 干净、无导航条混入 | ✅ 修好（旧 finding#2 消失） |
| 动作并排 + 主次 | aliyun 4×`立即购买` 并排 + 页尾深色主 CTA；huawei `重置` chip | ✅ |
| chip 样式 | mi-shop 手机系列 chip 圆角胶囊到位 | ✅（但见 36kr 残留） |
| 容器收缩 / 搜索框水印+提交 | 36kr 与 huawei 搜索框、`站内搜索`/`请输入关键字` 水印在 | ✅ |
| 标题层级 | 36kr H1=`人工智能相关文章_36氪`（=源站 title）；**mi-home H1 仍整条 title** | ⚠ 部分 |
| 价格去重 | aliyun 每实例卡只剩一个价（¥99 / ¥1438.68 / ¥3459.9） | ✅ |
| gov-uk 正文测度 + 引导语紧邻列表 | 引导句后**紧跟** bullets（两处都对） | ✅ 修好（旧 blocker 消失） |
| 可见标签不降级成水印 | stripe `邮件地址`/`密码` 现在是独立可见 label | ✅ |
| `<img>` 无裂图 | 本组 33 张 `<img>` 全部加载（远程图也出像素） | ✅ |
| **图片补齐（apple / aliyun / huawei / mi-shop）** | `<img>=0`、`background-image=0`、`figure=0`，源站分别有 44 / 54 / 19 / 167 个 img 节点 | ❌ **未修** |

---

## 1. 36kr-com/search-ai — 基本可以有小问题
- 一句话：搜索列表页骨架与 3 张卡片配图已到位，**查询词 / 图片两项旧问题确已修好**；但筛选/排序仍渲染成「一排没选中的伪单选圆点」，一眼像后台控件。
- 最刺眼：
  1. **[major · model] 导航与排序被渲染成 radio 圆圈，且无 active 态。** 图上：`○ 文章 ○ 快讯 ○ 直播 ○ 视频 ○ 专题 ○ 作者 ○ 项目 ○ 企业号`；下一行 `○ 相关性 ○ 发布时间`，全部是空心圆 + 圆角描边胶囊，没有任何一项被选中。源站核实（`corpus/36kr-com/search-ai/dom.html`）：导航是纯文本 tab `<ul class="kr-search-result-nav"><a href="/search/articles/人工智能"><li class="search-result-nav-item active weight-bold ">文章</li></a>…`，排序是 `<span class="relative active weight-bold">相关性</span><span>|</span><span class="publish-time ">发布时间</span>`——**源站没有任何 form 控件、且 `文章`/`相关性` 是 active 加粗**。渲染 HTML 里是 `<fieldset class="expose chipbar"><label class="choice"><input type="radio" name="search-type" value="文章"> 文章</label>…`，`.choice` 只加描边胶囊、**没有 `appearance:none`**，故浏览器默认圆点照出。⇒ 昨夜"chip 样式"只做了一半：胶囊有了，圆点与选中态没处理。建议：导航/排序按 tab 文本排版，active 项加粗，不要生成 `<input type=radio>`。
  2. **[minor · model] 日期仍是源站 ISO 串且同页重复**（`2026-09-15`）：源站即如此（`kr-flow-bar-time`），属已登记延期项，不判 bug。
  3. **[已核对·保真] 搜索框已带 `value="人工智能"` 与 `sr-only` 文本**，查询词不再丢失（旧 finding#2 修好）。图片：3 张卡片均出图（旧 finding"文字墙"修好）。
- 只允许改一处：**去掉筛选/排序前的伪 radio 圆点、恢复 `文章`/`相关性` 的 active 加粗**（把"后台控件"观感一次消掉）。

## 2. aliyun-com/product-ecs — 基本可以有小问题
- 一句话：**价格去重已生效**（每卡单价）、动作并排，文本骨架可信；但整页**零图片**，且"客户/地域/可用区"三行读数仍像参数残渣。
- 最刺眼：
  1. **[major · asset/capture] 源站有 54 个 img 节点（12 个 ≥120px，含 1111×586 hero、696×400 卡片图），渲染 `<img>=0`、`background-image=0`。** 图上：从 `安全可靠的云服务器 ECS` 标题到四列实例卡到 `产品动态`，**没有任何图像块**——云产品页缺 hero，观感立刻掉档。建议：按同批 apple/mi 的 imgmap 判据补 hero + 实例卡图（若属懒加载 `data-src` 需先补采，并登记为 capture-gap）。
  2. **[minor · model] 规模区仍把一段话拆成"总结 + 两行裸读数"。** 图上：`已为全球 500 万客户提供算力服务。` / `29 地域` / `90 可用区`。源站是同一段 `p`「在全球29个地域、90个可用区提供高效、稳定的计算服务。已为全球500万客户提供算力服务…」。建议：合成"数字+标签+说明"的统计块，别让句子与字段前后颠倒。
  3. **[已核对·保真] `g9i实例` 无价（源站无金额）**、价格小数位 `¥3459.9` 与 `¥1438.68` 不同（源站即如此）——不判 bug。价格去重已修好。
- 只允许改一处：**补 ECS 主视觉图**（0→1 张就能把"纯文字云页"拉回产品页）。

## 3. apple-com/iphone-16 — 明显说不过去
- 一句话：**整页仍然零张产品图**（旧 blocker 未修），`Buy iPhone 16` 页面里看不到一台 iPhone。
- 最刺眼：
  1. **[blocker · asset] `<img>=0` / `background-image=0` / `figure=0`，而源站 `corpus/apple-com/iphone-16/nodes.json` 有 44 个 img（13 个 ≥120px，含 1264×711 hero）。** 图上：`Buy iPhone 16` → `Apple Intelligence and Siri AI` → `Carrier Deals` → COLOR radio → Storage → `Get $35–$885 credit…` 全是文字/表单，**无一张产品图**。这是本组唯一会被当场打回的一张。建议：至少补 hero 与机型缩略图（同批 mi-home / apple-home 已有可用手法）。
  2. **[minor · model] 配置项用 `○ Ultramarine …` radio 行降价呈现**（源站是色板/卡片），且 `Storage. How much space do you need?` 下只剩单行 `Storage 128GB $799 or $33.29 per month for 24 months`，没给出可选档位——疑为配置项未策展全（需与 corpus 核对，不确定是否 capture）。
  3. **[capture · 已知] FAQ 无答案**：旧记录已登记（折叠答案未采集），不判 bug；但"半截内容"观感仍在。
- 只允许改一处：**补 iPhone 16 主视觉图**（其余都是次要）。

## 4. bilibili-com/read-home — 基本可以有小问题
- 一句话：封面图**确实补上了**（19 条 ⇄ 19 张，1:1），但封面被放大到远超源缩略图尺寸，页面被拉到 **14394px**，仍像超长单栏文字流。
- 最刺眼：
  1. **[major · renderer/asset] 封面被放大 2~3 倍，源素材只有 234×176。** 渲染 `<img src="https://i2.hdslb.com/bfs/note/…@234w_176h_1c.webp">`（URL 明确请求 234×176），而全局 CSS 是 `img{width:100%;height:auto}` ⇒ 图上第 1 条 `我收容了100位粉丝…` 的封面横跨约 650px。源站 `nodes.json` 里图片节点几乎全是 `24×24`（头像）+ 一个 `117×88`，**没有 ≥120px 的封面**。结果：像素化放大 + 每条条目被大图撑高。建议：封面按源缩略图尺寸（≤234px）内联，别 `width:100%`。
  2. **[minor · model] 摘要仍过长**：`自学画画好不容易，我把工作多年所积累到的绘画素材都整理打包好了，涵盖（线稿、色卡、笔刷、软件、资料等等）自取请 保存!!!` —— 旧记录项，未修。
  3. **[minor · model] 统计行是无标签裸数字**：`薄荷青苹果汽水 2410 4969 3`（作者 阅读 评论？）。建议补标签或省略。
- 只允许改一处：**封面上限宽度**（按 234px 缩略图渲染），它同时消掉"像素放大"与"页面被撑到 1.4 万像素"。

## 5. gov-uk/register-birth-abroad — 基本可以有小问题
- 一句话：**旧 blocker（引导句被 `_detail` 插断）确已修好**，正文测度与 gov.uk 结构都在；但句内链接仍被升格成页面级深色实心按钮。
- 最刺眼：
  1. **[major · model/renderer] 句内链接渲染成整块深色按钮。** 图上：`This birth certificate should be accepted in the UK, for example when you:` 后紧跟 bullets（✅ 顺序对了），但紧接的 `If it's not in English, you'll need to have it translated by an approved translator.` 下方，`approved translator` 变成一个深色实心按钮；第二段 `You can still apply for a UK passport even if you do not register the birth in the UK.` 下方 `apply for a UK passport` 同样。源站两者都是 `<a class="govuk-link">` **行内链接**。真 gov.uk 从不出现这种主色大按钮。建议：句内 `_action` 用行内链接样式，只有真正的 start button 用实心。
  2. **[minor · model] Fees 区 `£50 per certificate` 被提到句前，与句内重复。** 图上：`Fees` 下第一行 `£50 per certificate`，下一句又完整 `It costs £150 … - it costs £50 per certificate.`（源站该节只有一个 `p`，`£150` 才是头条价）。价格去重在 aliyun 生效，此处仍有 hoist 重复。
  3. **[已核对·修好] 两处"引导句 → bullets"顺序均正确**（旧 blocker 消失）。
- 只允许改一处：**句内链接改行内样式**（深色大按钮是这一页最不像 gov.uk 的点）。

## 6. huawei-cn/search-laptop — 基本可以有小问题
- 一句话：结果页骨架、类别 chip、分页齐整；但结果区**仍缺 `相关性` 排序控件**，且结果卡无产品缩略图。
- 最刺眼：
  1. **[major · model] 排序控件仍缺。** 图上：`类别` chip 行之后直接 `80 条结果` 然后结果卡，**没有"相关性/升降序"**。源站核实：`corpus/huawei-cn/search-laptop/dom.html` 存在 `filter-sortby` 区（`sortbyDown/sortbyUp` 图标 + `相关性` 文本，`grep 相关性` =1 次命中）⇒ 源站有、模型未策展。旧 finding 未修。
  2. **[minor · asset] 结果卡无缩略图**：源站 19 个 img 但均 <120px（小图/图标），渲染 0 图——属源站小图，观感可接受，记 minor。
  3. **[已核对·保真] 类别前的 radio 圆圈**（`全部 (80)` 等）源站即 `type="check-box" class="radio checked"`，**勿误判**；空搜索框源站无 value，**勿误判**。
- 只允许改一处：**补回 `相关性` 排序控件**（搜索页缺排序是内容缺口）。

## 7. mi-com/home — 基本可以有小问题
- 一句话：7 条满幅图带干净无导航条混入（旧 finding 修好），本组最有"官网首屏"气质；但 H1 仍是整条 `<title>`，标题与首图间留白偏大。
- 最刺眼：
  1. **[minor · model] H1 仍直接打印源站 `<title>`**：`Xiaomi官方网站 | 以人为中心，构建"人车家全生态"`，下面还粘一行口号 `让全球每个人都能享受科技带来的美好生活`。真站首页从不显示这两行（title 只是 SEO）。标题层级昨夜部分修（36kr 已可），mi 未改。建议：H1 取 `Xiaomi` / "首页"，口号降为副文案。
  2. **[minor · renderer] H1 与首条图带之间 ~158px 死白**（量测：全白行段 `y137–295` 宽 158px）。图上标题下是大片空白才到 SKYNOMAD 车图。建议：收紧标题区下边距。
  3. **[已核对·修好] 图带无 chrome 混入**（旧 finding#2 "裁进导航条"消失）；`y≈4400–6360` 采集空洞属 capture（模型已注明）。
- 只允许改一处：**H1 不再打印整条 `<title>`（含 `|` 与口号）**。

## 8. mi-com/shop-category-list — 基本可以有小问题
- 一句话：类目总览结构清楚、手机节系列 chip 样式到位；但条目顺序仍是抓取序（命名混排/疑似重复），且零类目图标。
- 最刺眼：
  1. **[minor · model] 节内条目顺序像原始抓取序**：`电视` 下 `S Pro RGB-Mini LED / S Mini LED 2026 / 小米电视SPro MiniLED2026 / 旗舰系列S Pro Mini LED / 巨幕影院-REDMI MAX …` 命名风格混排、疑似重复。旧 finding#2 未修（未排序/未分组）。
  2. **[minor · asset] 零图片**：源站 167 个 img 但全为 <120px 小图标，渲染 0 图——类目缺小图标，可接受但记 minor。
  3. **[已核对] `全部商品分类` = 源站 `<title>`**（去掉 `-小米商城`），处理正确；手机节 chip 样式（旧"chip 样式"声明）确已到位。
- 只允许改一处：**类目条目按产品线分组排序**（顺序乱是最扎眼处）。

## 9. sspai-com/post-114699 — 像真产品
- 一句话：派早报文章页，H1/作者/时间/责编/三栏 news 卡结构完整，配图 5 张，读起来就是真实文章页。
- 最刺眼（均为 minor，不构成打回）：
  1. **[minor · model] meta 略碎**：`派早报 / 周五 18 / 少数派编辑部 2026-09-18 / 08:17 8 分钟阅读 / 本文责编：@北鸣` 分多行，`周五 18` 与 `2026-09-18` 语义重复。建议：合并作者+日期一行。
  2. **[已核对] 作者 `少数派编辑部` 属白名单 `capture-gap`**（43-integrity §4c：corpus 两文件 0 次命中）——不判改写。
  3. **[已核对] 标题去 `- 少数派` 后缀**，符合既有规则。
- 只允许改一处：**合并作者/日期 meta 行**（纯观感，非必须）。

## 10. stripe-dashboard/login — 基本可以有小问题
- 一句话：登录骨架完整，**可见字段标签已还原（旧 finding 修好）**；仍缺 `还没有 Stripe 账户？` 引导句，且同页两个标题。
- 最刺眼：
  1. **[minor · model] 引导句仍丢失**：图上底部动作行 `登录`(深色) / `忘记密码？` / `创建账户` 并排；源站是 `还没有 Stripe 账户？<a href="/register">创建账户</a>`（`dom.html` 逐字）。建议：保留引导句（真站登录页都有）。
  2. **[minor · renderer] 标题双写**：`Stripe 登录`(H1) + `登录您的账户`(H2)，一屏两行近义标题。建议：H2 降为副文案或去重。
  3. **[已核对·修好] `邮件地址`/`密码` 已是独立可见 `<span class="deflabel">` + `aria-label`**（旧"标签降级成水印"修好）；`忘记密码？`(链接)、`登录`(主按钮)、`创建账户`(链接) 并排与主次均已成立。
- 只允许改一处：**补回 `还没有 Stripe 账户？` 引导句**。

---

## 汇总（group=3）

- 判定分布：像真产品 **1**（sspai-114699）；基本可以有小问题 **8**（36kr / aliyun / bilibili / gov-uk / huawei / mi-home / mi-shop / stripe）；明显说不过去 **1**（apple-iphone-16）。
- **未修复的旧 blocker（1 条，最重要的行动项）**：`apple-com/iphone-16` 整页零产品图（源站 44 img / 13 张 ≥120px，渲染 `<img>=0`、无 background、无 figure）。同因页还有 `aliyun-com/product-ecs`（54 img）缺 hero —— 属 **asset/capture** 层。
- **新发现 major（1 条）**：`bilibili-com/read-home` 封面以 234×176 源缩略图被 `img{width:100%}` 放大 2~3 倍（像素化 + 页面 14394px）。属 **renderer/asset**。
- **新增 minor（若干）**：36kr 伪 radio 圆点无 active 态、huawei 仍缺排序、gov-uk 句内链接成大按钮、mi-home H1 仍为整条 title、mi-shop 顺序乱、bilibili 摘要过长/裸统计数字。
- **已核对为修好**：36kr 查询词 `人工智能` 保留 + 卡片配图；gov-uk 引导句紧邻列表；stripe 可见字段标签；mi-home 图带无导航条；aliyun 每卡单价；chip 胶囊样式。
- **已核对为保真、勿误判**：huawei 类别前 radio 圆圈（源站 `type="check-box"`）、huawei 空搜索框（源站无 value）、aliyun `g9i` 无价、36kr/huawei 绝对日期、bilibili 源站缩略图本身只有 24×24。
- **风险**：36kr/bilibili 出图依赖**远程热链**（`img.36krcdn.com` / `i2.hdslb.com`），本例哈希门禁通过说明当前网络可达；一旦离线，这些 `<img>` 会变裂图（renderer/asset 层的可复现性风险）。

FINAL3_DONE group=3 pages=10 looks_real=1 minor=8 rejected=1 new_blockers=0 new_majors=1
