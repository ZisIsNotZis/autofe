# 组 2 · 终审复验（final2，只读）

对象：组 2 的 11 页。判据只有一条：**这张页面现在像一个真实上线的产品页吗？还有哪里会被当场打回？**

## 覆盖与预算（如实交代，影响置信度）
- 图片读取：**2/8**。两张 41% 缩放的 6 格 contact sheet（11 页**首屏**，各页前 1450px）。
- 因工具预算（soft limit）在准备第二轮**原生分辨率局部裁切**时被要求收尾，**未完成**"关键区域 1:1 复看"计划。
  ⇒ 体量大的页（stripe 17791px、apple 10291px、mi 6039px、aliyun 6283px、huawei 5225px）的**首屏以下**，
  本次是**结构性证据（渲染 HTML/DOM + playwright 实测包围盒）**而非看图，条目里逐条标注了证据层。
- 免费证据（未花图片预算）：
  1. **PNG ⇄ HTML 同源**：用 sha256 对 `m1/curated/renders/manifest.json` 逐页校验，**11/11 HTML 与 PNG 哈希均一致** ⇒ 上一轮的
     "提交截图旧于 HTML" blocker **已关闭**（本组独立确证）。
  2. 渲染 HTML grep（`img-alt` / `key:` / `type=radio` / `.rank` / `chip-item` / `<img`）。
  3. `node .scratch/35-typography/box.mjs <render.html> <selector>` 实测包围盒 + 字号（1280×900 口径，与证据截图同口径）。
  4. `corpus/<k>/dom.html`（源站）交叉核实（bilibili 搜索框水印）。
- 未做：pipeline、任何写入（本文件外）、git 操作、corpus/模型/文档改动。

---

## 1. 36kr-com/information-technology — 基本可以但有小问题
图上所见：H1「科技频道」+「资讯频道」+ 两行带边框的 chip、下面 3 列信息流卡（标题深色加粗、来源/时间一行更小更浅——层级成立）。
1. **[major] 频道导航做成了单选表单**：_现象_ `<fieldset class="expose chipbar expose-channel">` 内 17 个 `<input type="radio" class="choice">`；_图上_ 两行 85×40 带边框小盒（实测 y176 起、9 个/行），每个盒里是"圆圈+文字"，读起来是**表单**不是频道条（导航不是互斥选择）；_层_ model/renderer；_建议_ 频道走链接 chip（`<a class="chip">`），只有真互斥筛选（如 mi 的分类/排序）才用 radio。
2. **[minor] 卡片底对齐但内容顶对齐**：_图上_ 短卡（"140亿独角兽…"）底部一块白；_层_ renderer；_建议_ 网格 `align-items:start` 或统一摘要行数。
3. **[capture 待核] 全页 0 张 `<img>`**（grep imgs=0）：_图上_ 全部卡片纯文字；_源站是否有封面图本次未核（预算耗尽）_ ⇒ 标注 capture/asset，不要当渲染缺陷修。
**只允许改一处**：频道导航从 `fieldset+radio` 改成 chip 链接行（去掉单选圆点）。

## 2. aliyun-com/home — 像真产品（仅首屏复核）
图上所见：H1「阿里云计算，为了无法计算的价值」→ 「Token Plan 全面升级」促销块 → hero 图 → `立即订阅 / 在线咨询` → 「更懂模型、更新能力、热门 AI 应用免费体验」3×3 卡片（每卡有图+标题+说明+链接）——就是云厂商首页的样子。
1. **[minor] hero 图偏小、四周留白**：_图上_ 浅色截图悬浮在容器中、上下大留白，像插图不像首屏主视觉；_层_ renderer（`.defval img` 无宽度规则，图按自然尺寸出）；_建议_ 首屏主图升格为满幅图带（或至少与容器等宽）。
2. **[minor] `value="key:tab-featured"`**（1 处）：_DOM 内部键，页面不可见_；_层_ model；_建议_ 与 mi 一起清理（见 §11 备注）。
3. 首屏以下（认证 chips 分组标题、产品体系网格节奏）**本轮未复核**。
**只允许改一处**：hero 主图升格为满幅图带。

## 3. apple-com/ipad-air — 基本可以但有小问题（局部明显）
图上所见：H1「iPad Air」（2em，左上）+ 一张约 2200px 高的 hero 大图占满首屏（实测 "Get the highlights." 在 y2345 ⇒ hero 区 ~2200px）。
1. **[major] 首屏只有标题+图，没有一句话卖点/价格/购买**：_图上_ 标题很小、下半屏全是一张产品图；真站首屏有 tagline+价格+Buy；_层_ model（源站 hero 的文案节点未被收）/renderer；_建议_ hero 区补 tagline/CTA，或把 H1 与首屏图文并排成 hero 版式。
2. **[major] 「Two sizes. Infinite possibilities.」(y5725) 三行显示特性脱离卡片**：_现象_ `11" model`/`13" model` 两张卡（含图）之后，`True Tone`/`P3 wide color`/`Full lamination` 三个 **h4 与卡片同级挂在两卡之外**（HTML 结构实证），其中 `P3 wide color` 下面什么都不挂；_图上_ 两卡 height 不等（11" 有分辨率规格、13" 只有图）+ 后面三个孤立小标题；_层_ model/renderer；_建议_ 显示特性并进尺寸卡（或给它们一个组标题+组容器），这正是上一轮登记的未决项。
3. **[minor] 多条同级 `ctl` 描边链接**（5 处）+ hero 0 图旁无 CTA。_层_ renderer。
**只允许改一处**：把三行显示特性并回尺寸卡（消灭"标题下面没东西"）。

## 4. bilibili-com/home — 基本可以但有小问题
图上所见：H1「哔哩哔哩 (゜-゜)つロ 干杯~-bilibili」→ 搜索框 → 「第五人格亲密之月」满宽 banner → 3 列视频卡（每卡有真实封面。
1. **[major] 卡片顺序是"标题 → 时长 → 封面 → 元数据"**：_现象_ HTML 顺序 `h3.title` → `<div class="fact">07:47</div>` → 封面 `<img>` → `.meta`；_图上_ 时长(07:47)悬在标题与封面之间、封面不在卡顶；真站是封面在上、时长叠压封面右下、标题在下；_层_ renderer；_建议_ 卡内顺序改为 封面(+时长角标) → 标题 → 元数据。
2. **[minor] 播放/弹幕是裸数字**：_图上_ meta `啊力解说 · 09-15·20.2 万·155`；`155` 无任何标签（源站用图标）；_层_ model/renderer；_建议_ 用站点语义小标签或图标（播放/弹幕），**不要**再退回上一轮的通用"规格"。
3. **[capture，不是缺陷，勿修] 搜索水印 = 用户名「磊哥游戏」**：_源站实证_ `corpus/bilibili-com/home/dom.html` 的 `placeholder="磊哥游戏" title="磊哥游戏"` ⇒ 这是源站自己的热搜词水印；但输入框只有 253×42、**无提交按钮**（真站有大搜索条）_层_ renderer minor。
（首屏 H1 下无 logo/导航、右侧空一截，minor。）
**只允许改一处**：卡片里把封面提到标题之前（时长叠在封面右下）。

## 5. gov-uk/ni-rates-letters — 像真产品（本组最真）
图上所见：H1 → `Contribution rates` → 项目符号正文（正文测度窄，约 55% 宽 ✓）→ 表格（Category letter / £129 to £242… / £242.01 to £967… / Over £967 a week）→ 第二张表 `Employer National Insurance rates`。版式、层级、语气都像 GOV.UK。
1. **[minor] 数值列过宽、表头是长句**：_图上_ 3 个数据列被拉到 1280 满宽，`0% / 8% / 2%` 与列头距离远，横向扫读要数格子；_层_ renderer；_建议_ 数值列按内容定宽、长句表头换行。
2. **[minor] 页尾 `Next` 与 `Category letters` 两个同级白底胶囊**（上一轮结论；本次首屏截图未覆盖该段，未复核）。
**只允许改一处**：表格数值列定宽（让百分比成列、表头换行）。

## 6. huawei-cn/home — 明显说不过去
图上所见：H1「华为 - 构建万物互联的智能世界」→ **「1. HUAWEI Mate XT 2 了解更多」「2. 华为全联接大会 2026」** → 「我们的业务」7 枚胶囊 → 「推荐信息」。
1. **[major·本轮新引入（回归）] hero 被印成 1./2. 编号清单**：_现象_ `<div class="deflist ranked">` + `<span class="rank">1/2</span>`；编号只由 `order:"sequence"` 触发，是**轮 35 新增的 `sequence → 编号` 特性**的产物（轮 31 复验时该 hero 明确"序号消失"）；_图上_ 首屏两张大图前面挂着 `1.` `2.`，像图片列表而不是品牌 hero；_层_ renderer（+model 声明）；_建议_ hero 这类"并行推荐"不编号：要么模型改 `order` 语义、要么编号只在热榜类 `_rel.order=="sequence"` 且显式标注"排行"时启用。
2. **[major] hero 图不是图带**：_实测_ `.g-hero img` = 878×457，容器 1060、视口 1280 ⇒ 左右各约 190px 白（`.defval img` 无宽度规则）；_图上_ 两张 KV 悬浮在白色里像贴图；_层_ renderer；_建议_ hero 图走满幅图带（这页是图像主导页）。
3. **[已修 ✓]** 上一轮的"推荐信息 4 条塌成折叠 FAQ、图与链接全丢"**本轮已修**：HTML 实证 4 条 `.block`（h3 + 图 + fact + `了解更多`），实测 y1353/2291/2876/3462，高 920/567/568/1155。**但块高差近 2 倍**、图按自然尺寸（909/805/804/699）不缩放到容器 ⇒ 节奏不齐（minor，renderer）。
**只允许改一处**：去掉 hero 的 1./2. 编号（改回无序号 deflist），顺带让图带满幅。

## 7. linear-app/home — 基本可以但有小问题
图上所见：H1 + 导语（层级成立）→ `1–4.` 编号清单（Intake/Planning/AI/Build）→ `Purpose-built` 两段 → `Changelog` 项目符号 → `Powering the companies building the future`（OpenAI/Vercel/Figma/Coinbase/Ramp）→ `Get started`（实心）+ `Contact sales`（描边）✓ 主次成立。
1. **[minor] `Purpose-built` 两条是无标签 deflist**：_图上_ 缩进的两句孤立残句、无要点符号；_层_ renderer；_建议_ 无标签就不要 deflist。
2. **[minor] 客户名单是全宽带下划线的链接行**：_图上_ 像 5 行表格（明细线贯穿整页宽）而不是 logo 墙；_层_ model/renderer；_建议_ 用卡片/居中多列，或补 logo。
3. **[minor] 全页 0 图**（grep imgs=0）：纯文字落地页；_层_ asset。
**只允许改一处**：给 `Powering the companies…` 做真实 logo 墙（退一步也要去掉全宽下划线行）。

## 8. mi-com/search-phone — 基本可以但有小问题
图上所见：H1「所有产品-小米商城」→ 搜索框 → `全部/红米手机/小米手机` chip → `综合/新品/销量/价格` chip → `促销 / 分期 / 仅看有货` → `收货地 / 北京 北京市` → 3 列商品网格（20+ 张真图、尺寸一致、价格 ¥999 等）——商品区像商城了。
1. **[major] 三个复选框各占一整行**：_实测_ `促销` 在 y357（84×40），另两个各占下一行（HTML：三个独立 `group` g-promo/g-installment/g-in-stock）；_图上_ 三行"方框+一个词"，是**表单**不是筛选条；_层_ model/renderer；_建议_ 三个筛选项并进一行（与排序 chipbar 同段）。
2. **[minor] `收货地` 下"北京 北京市"读起来像重复**（HTML 两个 fact 节点）；_层_ model；_建议_ 合成一条（"收货地：北京 北京市"）。
3. **[minor·DOM 卫生] `value="key:cat-all" / key:sort-best …` 7 处内部键**：**页面不可见**（只在 `value` 属性里）；_层_ model；_建议_ 清掉，但**别当可见缺陷上报**。另：搜索框只有 input（253×42）+水印、**无提交按钮**（brief 说已加提交，本页/§4 均未见）⇒ minor。
**只允许改一处**：三个筛选复选框并成一行筛选条。

## 9. sspai-com/post-102392 — 基本可以但有小问题（本组最像真文章）
图上所见：大 H1（两行）→ chips + 元数据行 → 正文 → `以「反色」方式进行适配` / `以「替换」…` 小标题 → `2 分钟阅读 · MIT License` → `充电鼓励` → 一枚"充电"胶囊 → 页尾。
1. **[minor] 页尾无标题孤立条目收尾**：_实测_ `hr.region` y800 → `ul.linklist` y823（**只有 1 条**）→ `VLOOK 简介` 按钮；_图上_ 一条 `•` 加一个按钮，页面草草结束；_层_ model/renderer；_建议_ 给这条加"相关阅读"标题，或删掉孤立 bullet 只留按钮。
2. **[minor] 元数据与正文同色同重**（"2 分钟阅读 · MIT License"）；_层_ renderer；_建议_ 走 `.meta` 样式。
3. **[minor] `充电鼓励` 下孤零零一枚"充电"胶囊**，无说明；_层_ model/renderer。
**只允许改一处**：页尾那条相关阅读补标题（或删除）。

## 10. stripe-com/pricing — 明显说不过去
图上所见：H1「适配各规模企业的定价方案」→ `标准定价`（段落 + `3.4% + HK$2.35` + 说明）→ **黑色实心「立即开始」**（左靠，右侧约 65% 空白）→ `定制化定价`（段落 + 四枚 chip：IC+ 定价 / 交易量折扣 / 多产品组合折扣 / 特定国家/地区费率）→ **黑色实心「联系销售」**（同样左靠）→ `开箱即用的功能：` 一大串单列 deflist。
1. **[major] 两档定价是两个全宽文字块，CTA 同级**：_实测_ 两枚 `a.action.verb-open`：`立即开始` y313 100×44、`联系销售` y510 100×44，同款（CSS `a.action{background:#17212b;color:#fff}`）⇒ 主次不分 + 大片右白；全页共 **8 枚**同款实心黑 `.action`；_层_ model/renderer；_建议_ 两档并排成卡、只保留一枚实心主 CTA（联系销售降为描边/文本链接）。
2. **[major] 17791px 单列 deflist = 文档感**：_现象_ 全球覆盖/内置欺诈防范/优化结账流程… 全是"标签+说明"两列 deflist 纵向堆叠，没有卡片、没有对比表、没有 logo；_图上/实测_ 每段都左靠、右侧留白；_层_ model（源站卡片结构被拍平）；_建议_ 恢复卡片/多列网格，或至少给同组项做两列。
3. **[minor] 标题「开箱即用的功能：」带全角冒号**（未核源站是否原样）；_层_ model。
**只允许改一处**：两档定价并排成卡 + 只留一枚主 CTA。

## 11. xiaomi-account/login — 明显说不过去
图上所见：H1「小米账号」→ `登录` → `邮箱/手机号码/小米ID`+输入框 → `密码`+输入框 → 同意协议（带边框盒）→ `其他方式登录` + 4 枚第三方胶囊 → 行尾：`登录`(实心) `忘记密码？` `手机号登录` `扫码登录` `注册`。
1. **[major] 主提交键掉到第三方登录之后、混在次链接里**：_实测_ `.controls` 两行：y398 = `支付宝登录/微信登录/QQ登录/微博登录`，y451 = `登录/忘记密码？/手机号登录/扫码登录/注册` ⇒ 主操作在整块最末、且在第三方入口下方；_层_ model/renderer；_建议_ submit 留在表单流内（协议勾选之后、第三方登录之前）。
2. **[major] 密码框 `type="text"`**：_HTML 实证_ `<input type="text" name="password" …>` ⇒ 一旦输入即明文；真实登录页不会这样（缺 `_expose.type="password"` 的表达/渲染路径）；_层_ model/renderer。
3. **[minor] 没有"页"的容器**：输入框 253px vs 容器 1060px，内容止于 y≈490（页高 900），右侧与下方大片空白，像裸表单草稿；_层_ renderer。
**只允许改一处**：把「登录」提交键移回表单流并置为唯一实心主按钮（密码 `type=password` 同类同修）。

---

## 跨页
- **[已修 ✓·blocker 关闭]** 证据截图与 HTML 同源：`manifest.json` 的 html/png sha256 与磁盘文件**11/11 全部一致**（本轮独立复算）⇒ 上一轮四组共同登记的"PNG 旧于 HTML"作废。
- **[新 major·回归]** 轮 35 的 `order:"sequence" → 编号` 特性副作用：huawei hero 首屏被印成 `1.` `2.`（§6.1）。热榜编号是对的，hero 不该编号 ⇒ 建议给编号加"仅排行语义"的条件。
- **[brief 与实物不符]** "搜索框水印**+提交**"只在部分页落地：bilibili（253×42）、mi（253×42）都只有 input + 水印、无提交按钮。
- **[capture 说明]** grafana 面板体 / 留出集 3 页 URL 取不到 / 慢链路图 —— 本组未复现新的采集缺口；bilibili 水印「磊哥游戏」是**源站原值**（corpus 实证），请勿修。

## 汇总
- 像真产品：**2**（gov-uk/ni-rates-letters、aliyun-com/home〔首屏〕）
- 基本可以但有小问题：**6**（36kr-IT、apple-ipad-air、bilibili-home、linear-app、mi-search-phone、sspai-post-102392）
- 明显说不过去：**3**（huawei-cn-home、stripe-pricing、xiaomi-account/login）
- 全场最该先改的三处（若只允许三改）：① stripe 两档定价并排 + 唯一主 CTA；② xiaomi「登录」提交键回到表单流（同时 `type=password`）；③ huawei hero 去掉 1./2. 编号（回归）。
- 本卷**未复核**区域（预算所限，需下一轮或看图复核）：aliyun 首屏以下、apple "Two sizes" 以下的各区、stripe 中后段、mi 商品网格以下、bilibili banner 与卡序以外的中部、gov-uk 页尾按钮、36kr 卡流下半。

FINAL2_DONE group=2 pages=11 looks_real=2 minor_issues=6 rejected=3 new_blockers=0 new_majors=1
