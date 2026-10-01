# 终审复验 · group=3（看图为主，只读）

- 证据口径：`m1/curated/renders/*.png`；核验 `sha256(PNG)==manifest.png.sha256 && sha256(HTML)==manifest.html.sha256` → **10/10 一致**（manifest v=`mup200ag`），所以下面看到的图就是当前产物。
- 图片预算：8 张（含 1 张 montage），已用 2（36kr、stripe+aliyun 拼图）。
- 归属层约定：renderer=渲染器排版/样式；model=策展模型结构/文本；capture=采集缺口；asset=图片素材。

---

## 1. 36kr-com/search-ai — 基本可以但有小问题

判定依据：搜索结果列表（3 列卡片、标题+摘要+日期）整体像真实列表页，H1 = 源站 `<title>`「人工智能相关文章_36氪」正确。

最刺眼：
1. **筛选/排序控件被渲染成"单选圆点 chip"，源站是纯文字 tab + 竖线分隔。**
   图上：`文章/快讯/直播/视频/专题/作者/项目/企业号` 每个词前面都有一个空心圆圈的胶囊，看上去像一排未选中的 radio；下一行 `相关性 / 发布时间` 同样各带一个圆圈。
   源站核实：`dom.html` 里是 `<li class="search-result-nav-item active">文章</li>` 等纯列表项，排序是 `<span>相关性</span><span>|</span><span>发布时间</span>`。
   归属：**model**（把无控件的导航项当成了 choice 控件）。建议：导航/排序按 tab 文本渲染（active 加粗即可），不要生成伪 radio 圆点与胶囊描边。
2. **搜索框为空水印，但这是"搜索完成"的页面。**
   图上：输入框只有灰色 `请输入关键词` 水印，右绿胶囊 `站内搜索`。
   源站核实：`<input placeholder="请输入关键词" value="人工智能">` → 查询词是 `人工智能`，被丢了。
   归属：**model**（控件只保留 placeholder，未承载 value）。建议：搜索控件带 `value=人工智能`，与 H1 对齐。
3. **日期以源站原样的 ISO `2026-09-15` 呈现，且大量同页重复。**
   图上：每张卡片底部裸一串 `2026-09-15`。源站核实：确实就是 `2026-09-15`（`kr-flow-bar-time`），不是渲染篡改；但真实 36kr 页面上是相对时间/月日。
   归属：**model**（日期本地化仍是已登记延期项）。建议：处于"可接受"档，除非统一做日期本地化。

只允许改一处：**去掉筛选/排序文本前的伪单选圆圈，按普通 tab 排版**（对"像不像真页面"的观感影响最大）。

---

## 2. stripe-dashboard/login — 基本可以但有小问题

判定依据：`Stripe 登录` + `登录您的账户` + 邮箱/密码 + 记住我 + 社交三按钮 + 主按钮，登录页骨架完整、留白合理。

最刺眼：
1. **输入框标签被降级成 placeholder。**
   图上：两个输入框里是灰色 `邮件地址` / `密码`，没有独立 label。
   源站核实：`dom.html` 有独立可见标签 `<span class="as-38">邮件地址</span>` 与 `密码`（label 结构），placeholder 是次要的。
   归属：**model**（可见 label 被当成 placeholder）。建议：保留字段标签行——登录表单缺标签是"假页面"最容易被打回的点之一。
2. **底部动作排成一行 chip，源站是"主按钮 + 链接 + 注册引导句"。**
   图上：`登录`（黑）/`忘记密码？`/`创建账户` 三个胶囊并排；`创建账户` 前丢掉源站的引导句 `还没有 Stripe 账户？`。
   源站核实：`还没有 Stripe 账户？<a href="/register">创建账户</a>`，以及 `忘记密码？` 是表单内链接。
   归属：**model/renderer**（登录 `login` 原语的布局尚未区分主按钮、次要链接、注册引导）。属于 M4 login 原语待办，不是回归。
3. Google/通行密钥/SSO 三按钮文字与源站一致（`Google`/`通行密钥`/`SSO`），无问题——记录为已核对项。

只允许改一处：**把邮箱/密码的可见标签还原成字段标签（而非 placeholder）**。

---

## 3. aliyun-com/product-ecs — 基本可以但有小问题

判定依据：H1/副标题/四条价值支柱/规模数字/四实例对比表/产品动态/主 CTA 全部有真实源站文本，不像编造。

最刺眼：
1. **规模区渲染成"一句总结 + 两个裸数字"，信息骨架断裂。**
   图上：
   ```
   已为全球 500 万客户提供算力服务。
   29 地域
   90 可用区
   ```
   源站核实：这些来自**同一段** advantages 文案「在全球29个地域、90个可用区提供高效、稳定的计算服务。已为全球500万客户提供算力服务，助力企业…」（`nodes.json` 里是同一条 `p paragraph`）。
   归属：**model**（把一个段落拆成 `_fields` regions/zones + `_summary`，渲染后顺序颠倒、字段无标签 → 读起来像参数残渣）。建议：改为"数字 + 标签 + 一句说明"的统计块，或直接保留原句。
2. **每张实例卡里价格出现两次且格式不一致。**
   图上：`e实例` 下大写 `¥99`，紧跟 `个人开发者必选 · ¥99.00/月`；u2a=`¥1238` / `¥1238.00/月`，c9I=`¥1385` / `¥1385.00/月`。
   归属：**model**（`_price` 与 `_summary` 并存，且总结里已含同额价格；`¥99` vs `¥99.00/月` 两种写法）。建议：价格只留一处（推荐 header 保持 `¥99.00/月`），同时统一小数位。
3. `g9i实例` 无价格只有 `中大型企业首选`（图上该列明显比其他列矮一截、对齐被打破）——**已在模型里写明源站该卡无金额**（corpus 核实为真），属**capture/源站事实**，不算 bug；但四列并排时视觉不齐。
   归属：capture/源站事实。建议：若要整齐，可给该列补一个"价格见购买页"的中性占位（需裁定，避免编造数字）。

只允许改一处：**把"29 地域 / 90 可用区 / 500 万客户"重做成有标签的统计块（含那句完整说明）**。

---

## 4. gov-uk/register-birth-abroad — 明显说不过去（一条硬伤，改法很小）

判定依据：正文测度（约 750px 栏宽）、Fees/How long it takes/Explore the topic 等 gov.uk 结构都在，语言是源站英文原句；但阅读顺序被打断。

最刺眼：
1. **列表引导句与自己的列表被一段无关句子隔开（同页出现两次）。**
   图上第一段：
   ```
   This birth certificate should be accepted in the UK, for example when you:
   If it's not in English, you'll need to have it translated by an approved translator.
   • apply for a passport
   • register with a school or doctor
   ```
   第二处同理：`You do not need to do this, but if you do:` → `You can still apply for a UK passport even if you do not register the birth in the UK.` → 才轮到两个 bullet。
   源站核实（`dom.html`/`nodes.json`）：`p`(…for example when you:) → `ul`(两个 bullet) → `p`(If it's not in English…) → `a`(approved translator)，即 detail 在 items **之后**。
   归属：**renderer**（节内字段顺序写死为 summary→detail→items→action，凡带"…："引导句 + `_items` 的 section 都会被插断）。
   建议：`_items` 渲染在 `_detail` 之前（或按 model 的书写顺序渲染）。
2. **句内链接被升格成页面级深色主按钮。**
   图上：正文中段的 `approved translator`、`apply for a UK passport` 是两个整块深色实心按钮（和页尾真正的 `Start now` 外观完全相同），而它们对应的句子本身已丢掉链接。
   源站核实：`<a class="govuk-link">approved translator</a>` / `apply for a UK passport` 都是行内链接。
   归属：**model+renderer**（`_action` 承载句内链接 + 全部 action 同一主色）。建议：句内链接用行内链接样式；只有真正的 start button 用实心。
3. **Fees 区把 `£50 per certificate` 单独提出来，遮住了 £150 这个真正的头条价。**
   图上：`Fees` 下第一行是 `£50 per certificate`，紧接着的句子里又完整重复 `…- it costs £50 per certificate.`；而 150 只出现在句子中。
   源站核实：源站该节只有**一个** `p`：`It costs £150 to register a birth with the UK authorities. You can also order a consular birth registration certificate - it costs £50 per certificate.`
   归属：**model**（`_price:150` + `_amount:50/per certificate` + 已含两者的 `_summary` 三层重复，且渲染取了次要项）。建议：删 `_amount`，`_price` 走 150，句子保留。

只允许改一处：**节内顺序 summary→items→detail**（一行渲染顺序，直接消灭两处"引导句悬空"）。

---

## 5. huawei-cn/search-laptop — 基本可以但有小问题

判定依据：搜索结果页骨架完整（H1 搜索结果 / 搜索框 / 类别过滤 / 结果计数 / 3 列结果卡 / 分页），文案全部来自源站。

最刺眼：
1. **排序控件丢失。**
   图上：结果区上面只有一行 `80 条结果`。
   源站核实：`<span id="resultCountTop">80</span><span>条结果</span>` 右侧紧跟 `filter-sortby`（`相关性` + 升降序图标）。
   归属：**model**（排序字段未策展）。建议：补一个排序控件，与 36kr 的排序同一处理。
2. 类别 chip 前的空心圆圈——**这次是源站自带的**：`<span type="check-box" class="radio checked">全部</span>`，所以图上 `○ 全部(80)` 属**保真**，不要当 bug（与 36kr 的伪 chip 不同，见第 1 页）。唯一小瑕疵是 `全部(80)` 少了源站的空格（`全部 (80)`），无碍。
3. 搜索框为空只有水印 `请输入关键字`——源站 `input` 就没有 value（`<input id="b-search" placeholder="请输入关键字">`），**capture/源站事实，不是缺陷**。
4. 分页是 `1 2 3 4 5 … 8` 纯数字圆胶囊，无上/下一页文案；每卡重复 `来源：消费者业务网站`——均源站有据，仅观感重复。

只允许改一处：**补回 `相关性` 排序控件**（搜索页缺排序是内容缺口，不是样式问题）。

---

## 6. apple-com/iphone-16 — 明显说不过去（零图片）

判定依据：文本内容齐全（Buy iPhone 16、配置选项、AppleCare 三档、Which iPhone is right for you? 机型对比、FAQ），但**整页 0 张图片**。

最刺眼：
1. **Apple 产品页没有任何产品图。** 图上从上到下全是文字：Prices/Finish/Storage 是 radio 列表，`Your new iPhone 16.` 区块只有一行字和 `Buy iPhone 16` 链接，`Which iPhone is right for you?` 是 6 段纯文字规格墙。
   核查：`m1/curated/renders/apple-com-iphone-16.html` 中 `<img>` = 0、`<figure>` = 0；`corpus/apple-com/iphone-16/nodes.json` 有 **44 个 img 节点**，但模型无 `_image`。
   归属：**asset**（该页未做图带/图位补齐；同组只有 mi-com/home 有 7 张图带）。建议：至少补 hero 与机型对比缩略图（可从 `corpus/.../full.png` 按 bbox 裁，mi-com/home 就是这么做的）。
2. **FAQ 只有问题没有答案。** 图上 `Frequently Asked Questions` 下是 8~9 条问句的裸 bullet 列表，全部无答案（折叠答案未采集，已知 gap）。归属：**capture**（+model 未降级）。建议：无答案时降级成"常见问题主题列表"或直接不渲染，避免"半截内容"观感。
3. 配置项 `COLOR ○ Ultramarine ○ Teal ○ Pink ○ White ○ Black`、`STORAGE ○ 128GB $799 or $33.29 per month…` 用 radio 圆点渲染——源站是可点选的色板/卡片，属 **renderer/model** 的降级（先把可用值列出来是可以接受的，但连价格一起挤进 radio 行后一行很长）。

只允许改一处：**补 iPhone 16 的主视觉图**（其余问题都是次要）。

---

## 7. bilibili-com/read-home — 明显说不过去（零图片 + 长摘要素墙）

判定依据：`推荐文章` + 搜索框 + 15+ 条专栏条目（标题/摘要/作者/数据）都在，但页面是**一整面纯文字**：单列、每条摘要 3~6 行、条目之间靠细线分隔。

最刺眼：
1. **没有任何封面图。** 图上 15 条卡片全部是"加粗标题 + 灰段落 + 作者/日期/数据"。
   核查：`renders/bilibili-com-read-home.html` `<img>` = 0；`corpus/bilibili-com/read-home/nodes.json` 有 38 个 img 节点。归属：**asset**（同上，图位/图带未补）。建议：每条至少一张封面缩略图（B 站专栏是图文卡片流）。
2. **摘要过长、密度失衡**，整页看起来像文章列表被倒进页面：`【校园版】…` 那条还把同一串外链 URL `https://picromelkim.us` 打印了三遍（源站如此，属**源站数据**），在无图片的加持下非常像垃圾页。归属：**model**（摘要应截断到 1~2 行）。建议：条目摘要限长。
3. 条目的统计行混排（如 `1.7万 116 文刊文章` 之类作者/阅读/评论连在一起），可读性差；属 model 排版细节。

只允许改一处：**补封面缩略图**（能把这一页从"文字墙"直接拉回"信息流"）。

---

## 8. mi-com/home — 基本可以但有小问题（本组最像真页的一张）

判定依据：7 条满幅图带（SKYNOMAD 小米澎程 / xiaomi 18 Fold / xiaomi 17 Ultra / xiaomi Pad 9 Pro Max / REDMI Turbo 5 Max / xiaomi Smart Band 10 Pro / xiaomi Sound 2 Max）裁切干净、无变形，拼起来就是小米官网首屏轮播的观感。

最刺眼：
1. **H1 是浏览器标题原样**：`Xiaomi官方网站 | 以人为中心，构建"人车家全生态"` 下面还粘着第二行 `让全球每个人都能享受科技带来的美好生活`。图上它占了页面最顶端两行黑体，是整页唯一"机器生成"痕迹。
   归属：**model**（`_title` 直接取 `<title>` + `_summary` 取副标题，渲染成 H1+副行）。建议：H1 取 `Xiaomi` 或"首页"，品牌口号降为副文案（36kr 的 `_36氪` 同族问题）。
2. **第 2 条图带是把源站的顶部导航条连橙色 logo 一起裁进来的**（图上紧贴标题下面那条：橙色方标 + `小米官网` + 一排被截断的导航词）。等于页面里又出现了一条"网页页眉"，且文字被裁半。
   归属：**asset/renderer**（band 裁切区间选到了 chrome）。建议：从下一张 band 起裁，或跳过该区间。
3. 页面**只有图片**：无 DOM 文本段落（除标题），也没有价格/商品卡；且 `y≈4400–6360` 是已记录的采集空洞（模型里已注明），所以正文自然偏短。归属：**capture**（已知，非缺陷）。

只允许改一处：**H1 不再打印整条 `<title>`（含 `|` 与口号）**。

---

## 9. mi-com/shop-category-list — 基本可以但有小问题

判定依据：`全部商品分类`（= 源站 `<title>` 全部商品分类-小米商城）+ 10 个类目节（手机/电视/家电/笔记本 平板 显示器/出行 穿戴/耳机 音箱/健康 儿童/生活 箱包/智能 路由器/电源 配件），手机节带系列 chip，其余为 1~4 列链接列表，是可信的"商品分类总览"页。

最刺眼：
1. **零图片**（源站 167 个 img 节点，`renders/*.html` `<img>`=0）：图上纯文字，没有类目图标/商品小图。归属：**asset**。建议：类目节补小图标（或明确声明该页按 sitemap 呈现）。
2. **同节内条目顺序像原始抓取序**，读起来乱：`笔记本 平板 显示器` 里 `Xiaomi Pad 9 Pro / Xiaomi Pad 9 / Xiaomi Pad 9 Pro Max / REDMIBookPro 16 2026 / REDMIBookPro 14 2026 / Xiaomi Book Pro 14 / REDMI K Pad 2 …`（平板与笔记本交错）；`电视` 里 `S Pro RGB-Mini LED / S Mini LED 2026 / 小米电视S Pro MiniLED2026 / 旗舰系列S Pro Mini LED …`（命名风格混排、疑似重复）。
   归属：**model**（未排序/未分组；源站命名就是这样，但策展应归组）。建议：按"产品线 → 代际"分组排序，并统一 `REDMIBook Pro 16` 这类空格写法。
3. 143 个 `<li>` 平铺，缺节内小标题（如"手机"下的"旗舰/中端"），页面很长但导航性弱。归属：**model**。

只允许改一处：**类目条目按产品线分组排序**（顺序乱是最扎眼的观感问题；图片属已知 asset 缺口）。

---

## 10. sspai-com/post-114699 — 未目视（8 张图片预算用尽），仅给出 HTML/model 层面的暂定判定

- 事实：`_title` = `派早报：欧盟拟禁止 13 岁以下儿童使用社交媒体等`（去掉源站 `<title>` 的 ` - 少数派` 后缀，符合标题带出处/去尾的既有规则）；结构 `meta / news / briefs / dynamics / missed / past-issues / support / discussion`，渲染出 4 个 `h2`、7 个 `h3`、28 条链接。
- 快照层面：`<img>` = 0（源站 38 个 img 节点）→ 若与 apple/bilibili 同因，则本页也缺图。**这一点需要补看一张图确认**。
- 暂定判定：**基本可以但有小问题**（依据：结构完整、标题处理正确；风险点是可能同样零图片）。

---

## 汇总（group=3）

- 判定分布：明显说不过去 **3**（gov-uk / apple-com-iphone-16 / bilibili-com-read-home）；基本可以但有小问题 **6**（36kr、aliyun、stripe、huawei、mi-com-home、mi-com-shop-category-list）+ sspai **暂定 1**；像真产品 **0**。
- **新的系统性 blocker（1 个族、影响 9/10 页）**：本组除 `mi-com/home` 外，**所有页面 `<img>` = 0**（apple 44、bilibili 38、mi shop-category 167、sspai 38、huawei/36kr/aliyun/gov-uk/stripe 同样有 img 节点）。归 **asset** 层，不是渲染器缺陷；但在 apple / bilibili 表现为"整页无图"，会被直接打回。
- **新的 blocker（个体）**：gov-uk 列表引导句被 `_detail` 插断（**renderer** 节内字段顺序），同页两次。
- **新的 major（2 条）**：36kr 搜索框丢失查询词 `人工智能`（源站 input 有 value）；huawei 结果区丢失 `相关性` 排序控件。
- 已核对为**保真、勿误判**：huawei 类别前的 radio 圆圈（源站 `type="check-box"`）、huawei 空搜索框（源站无 value）、aliyun `g9i` 无价格（源站无金额）、36kr 与 huawei 的 ISO/绝对日期（源站即如此）。
- capture 归属（不判 bug）：apple FAQ 无答案、mi-home `y≈4400–6360` 采集空洞（模型已注明）、grafana/留出集不在本组。

FINAL2_DONE group=3 pages=10 looks_real=0 minor_issues=6 rejected=3 new_blockers=2 new_majors=2
