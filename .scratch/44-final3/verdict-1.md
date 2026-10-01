# 组 1 终审（第三轮·只看图）· verdict-1

对象：`m1/curated/renders/<key>.png`（与同目录 HTML 同源，哈希门禁已核）。
11 页：36kr-com/home、airbnb-com/room-28871、apple-com/home、aws-amazon/ec2-on-demand、github-com/login、
huawei-cn/consumer-phones、learn-microsoft/vm-sizes、mi-com-search-earbuds、sspai-com/matrix、sspai-com-u-jtc092al、taobao-com/home

## 证据方法（图片预算 8，实用 2 张 + 3 项零成本量测，未超限）

1. **首屏拼版**（1 张）：11 页各裁 `1280×1000+0+0` → 360px 宽，4×3 拼版（`.scratch/44-final3/tmp/sheet_top.png`）。
2. **全页缩略拼版**（1 张）：11 页整页 `-resize 300x`，6×2 拼版（`.scratch/44-final3/tmp/sheet_full_s.png`）。
3. **零成本量测 A · 证据同步**：读 `m1/curated/renders/manifest.json`（generatedAt `2026-10-01T08:28:48Z`），
   逐页 sha256 比对——**11/11 页 HTML 与 PNG 双向哈希都与清单一致**（无"改了码没重拍"的假图）。
4. **零成本量测 B · 浏览器几何**（playwright，只读，未跑 pipeline）：逐页加载 HTML，量 `<img>` 数量 / 裂图数 /
   最大图高 / 文档高 / H1–H3 字号（脚本 `.scratch/44-final3/tmp/measure.mjs`）。
5. 结构计数：`grep -o 'class="cards"|class="block"|class="deflist'`；H1 文本与 `corpus/<k>/dom.html` 互核。

### 量测 B 结果（硬数字）

| 页 | 文档高 | img 数 | 裂图 | 最大图高 | H1 字号 | 备注 |
|---|---|---|---|---|---|---|
| 36kr-com/home | 7611 | 15 | 0 | 379 | 32 | 由 0→15 张 |
| airbnb-com/room-28871 | 7979 | 5 | 0 | 1121 | 32 | 5 张 1280 宽满幅，**首尾相接无空隙** |
| apple-com/home | 5368 | 24 | 0 | 264 | 32 | — |
| aws-amazon/ec2-on-demand | 3657 | 0 | 0 | 0 | 32 | 定价表页，无图合理 |
| github-com/login | 900 | 0 | 0 | 0 | 32 | 内容约 340px，短登录页正常 |
| huawei-cn/consumer-phones | 11332 | 51 | 0 | 677 | 32 | 图册已补齐 |
| learn-microsoft/vm-sizes | 2732 | 0 | 0 | 0 | 32 | **源站 2 张图未挂（采集缺口）** |
| mi-com-search-earbuds | 4972 | 20 | 0 | 318 | 32 | — |
| sspai-com/matrix | 2341 | 0 | 0 | 0 | 32 | 源站仅侧栏 1 图，不算缺陷 |
| sspai-com/u-jtc092al | 1590 | 0 | 0 | 0 | 32 | 源站无大图 |
| taobao-com/home | **16601** | 18 | 0 | **677** | 32 | **18 张 677×677 单列竖排** |

全 11 页 **0 裂图**；H1 32 / H2 23 / H3 18 三级字号一致，层级未乱。

---

## 36kr-com/home
1. **一句话**：基本可以有小问题（**文字墙已消**：15 张缩略图已挂到 feed/热榜条目，裂图 0）。
2. 最刺眼：
   - **[minor] H1 直接印 SEO `<title>`：`36氪_让一部分人先看到未来`（含下划线拼接符）**。图上看到什么：页面最大字号就是这行，位于左上角当站名用；真 36kr 首页从不显示它。归属：**model**（`_title` 取 `<title>`）。核实：`corpus/36kr-com/home/dom.html` 的 `<title>` 逐字相同，且模型 `_intent` 明确写「父代理裁定·轮 6」⇒ **这是已裁定项、非新问题**，但读起来仍不像产品页。建议：若允许翻案，H1 用站名（源站 `<img alt="36氪">` 即站名证据）。
   - **[minor] 首屏 featured 区是 `deflist`（名 + 图 两列/堆叠），与下方 `.cards` 卡片语言不一致**。图上看到什么：featured 图与卡片区风格割裂（featured 图贴文字、卡片区有边框圆角）。归属：renderer。建议：featured 也走卡片或图带。
   - **[已核实修好]** 图片补齐（0→15）、热榜序号 `<span class="rank">1..8` 在位、元数据 `class="meta"` 与摘要不同级。
3. **只允许改一处**：H1 换成站名/真实栏目标题（一次消掉"SEO 标题当门面"的观感）。

## taobao-com/home
1. **一句话**：**明显说不过去**——「猜你喜欢」18 件商品渲染成**单列 677×677 巨图**，页面被撑到 **16601px**（真淘宝是同屏 5 列小卡）。
2. 最刺眼：
   - **[blocker] 商品流不是网格而是单列巨图**。图上看到什么：全页缩略里从 y≈2550 起是一长串**一张接一张的近 700px 方图**，一直坠到页底，中间没有并排卡片。归属：**renderer/model**。实测：18 张图全 `677×677`，y 从 2550 递增到 15784，步长≈777（`measure.mjs`）；HTML 里 `class="cards"` **0 个**、`class="block"` **35 个`** ⇒ 每件商品各自成一个整宽 `section.block`，未进 `.cards` 网格。源模型 `_lines` 的「猜你喜欢」`_items` 18 件形状各异（`_name`+`_price`+`_image`），被引擎当成有序序列逐块摊平。建议：让"价格+图+名"的同形条目走 `product-cards` 网格（`render.mjs:313` 已有 `form==='product-cards'` 分支，说明能力在、只是没命中阈值）。
   - **[minor] 首屏（搜索框/chip/分类）本身尚可**：`淘宝网` 标题 + 搜索水印 + 宝贝/天猫/店铺 chip + 分类词块，与真淘宝顶部结构近似。归属：OK。
   - **[minor] 商品图 `alt=""`**（源站无 alt）——不显示缺陷，但无障碍上无文本。归属：capture。
3. **只允许改一处**：把「猜你喜欢」变回多列商品卡网格（消掉 16601px 长卷与巨图）。

## airbnb-com/room-28871
1. **一句话**：基本可以有小问题（**轮 36 的 484px 死白带已消**：5 张照片首尾相接）。
2. 最刺眼：
   - **[major] 照片墙仍是 5 张 1280 宽满幅巨图竖排，不是"1 大 4 小"画廊**。图上看到什么：卧室→街景→城堡→床→建筑，一张接一张占满整宽，页高 7979px。归属：**renderer/model**（源站是网格画廊，模型只按顺序给了 5 张 `_image`）。实测：5 张图 y=185/1273/2394/3515/4598，相邻边距≈185/0/0/0 ⇒ **已无空隙**（轮 36 的 y4145–4628 白带消失）。建议：画廊成组降高。
   - **[minor] 内容单列、右半页空**：预订卡与正文都靠左，右栏空。归属：renderer（需右栏轴信号）。
3. **只允许改一处**：照片墙成组（1 大 4 小）。

## apple-com/home
1. **一句话**：**像真产品**（页面形态与 apple.com 首页最接近的一张，24 图、裂图 0）。
2. 最刺眼：
   - **[minor] hero 是深色大块**：`Apple` H1 下 iPhone 18 Pro / Watch Series 12 为暗底营销图，缩略下近黑。归属：asset（源站真图本身暗底）。无打回点。
   - 结构正常：6 格 App Store 图块 + 多张 promo 卡（Trade In / Upgrade / Carriers / MacBook Air / Apple Card），节奏对。
3. **只允许改一处**：无（保持）。

## aws-amazon/ec2-on-demand
1. **一句话**：**像真产品**（一张按需定价数据页，0 图合理）。
2. 最刺眼：
   - **[minor] 纯表格长页**：`Amazon EC2 按需定价` + 分组标题（`数据传输` / `在同一 AWS 区域内传输数据`）层级清楚。图上看到什么：美东/美西分列的价目表，行密度正常。归属：OK。
3. **只允许改一处**：无（保持）。

## github-com/login
1. **一句话**：**像真产品**（GitHub 登录就是这种极简短页）。
2. 最刺眼：
   - **[minor] 无品牌标识（GitHub 用内联 SVG，`<img>` 计 0）**：图上看到什么：只有 `Sign in to GitHub` + 用户名/密码 + Continue with Google/Apple + Sign in + Forgot password?/passkey/Create an account。归属：asset（SVG 标识未纳入）。真页左上角有 GitHub 标记。建议：可补 SVG 标。
3. **只允许改一处**：无（可补一个 GitHub 标识）。

## huawei-cn/consumer-phones
1. **一句话**：**像真产品**（51 张产品图已补齐，图册形态与华为商城分类页接近）。
2. 最刺眼：
   - **[minor] 页高 11332px、图很多**：`华为手机` H1 + `HUAWEI Mate XT 2 非凡大师` hero + `Mate 系列` 等分组，商品卡带图。归属：OK。最大图 677×677（折叠屏 hero）。
   - **[minor] 分组间图量不均**：部分机型有图、部分只有名。归属：asset/capture（懒加载）。
3. **只允许改一处**：无（保持）。

## learn-microsoft/vm-sizes
1. **一句话**：基本可以有小问题（Azure VM 尺寸表页，文字/表格准确，但**源站 2 张图未挂**）。
2. 最刺眼：
   - **[minor] 源站 2 张说明图（YouTube 选择指南缩略图、系列分解图）未渲染**（0 `<img>`）。图上看到什么：`Sizes for virtual machines in Azure` + `Name structure breakdown` + `List of VM size families by type` 三块纯表。归属：**capture**（懒加载 `data-src`，属已登记采集缺口）。建议：归入 capture 缺口清单，不算 bug。
3. **只允许改一处**：无（缺图已归 capture）。

## mi-com-search-earbuds
1. **一句话**：**像真产品**（20 张耳机商品图，卡片网格正常，最大图 318px）。
2. 最刺眼：
   - **[minor] 首个卡片标题带"订金"尾缀**：`耳机新品1元权益定金（不发货） 订金`。图上看到什么：卡片标题后跟一个孤立的"订金"词。归属：model（价格/单位标签拼接）。建议：并入价格或去掉。
   - 其余：筛选 chip + 商品卡（REDMI Buds 8 Pro/8/青春版…）节奏正常。
3. **只允许改一处**：修卡片标题尾缀"订金"。

## sspai-com/matrix
1. **一句话**：基本可以有小问题（社区文章流，形态接近少数派 Matrix；源站仅侧栏 1 图，0 图不算缺陷）。
2. 最刺眼：
   - **[minor] 纯文字列表密度高**：`Matrix 社区` + 分区 chip + 一行行"标题 + 作者 + 时间"。图上看到什么：三列标题交错、每行末尾灰色元数据。归属：OK。多行标题（H3 高 57px 换行）无碍。
3. **只允许改一处**：无（保持）。

## sspai-com/u-jtc092al
1. **一句话**：基本可以有小问题（作者页，1590px 短页，源站无大图，0 图合理）。
2. 最刺眼：
   - **[minor] 页面偏短、下半空白多**：`MaxChow 的动态 - 少数派` + `成就与徽章`/`创作文章` 等块，内容到 y≈1000 后基本结束。归属：model（源站内容本就少）。建议：无需改。
3. **只允许改一处**：无（保持）。

---

## 汇总（组 1，11 页）
- **像真产品 5**：apple-com/home、aws-amazon/ec2-on-demand、github-com/login、huawei-cn/consumer-phones、mi-com-search-earbuds
- **基本可以有小问题 5**：36kr-com/home、airbnb-com/room-28871、learn-microsoft/vm-sizes、sspai-com/matrix、sspai-com/u-jtc092al
- **明显说不过去 1**：taobao-com/home

### 本轮新发现（非旧问题复述）
- **[new blocker] taobao 猜你喜欢 = 单列 677px 巨图，页高 16601px**（renderer/model；证据见该页）。
- 其它均为已裁定项（36kr H1）或已登记 capture 缺口（learn-microsoft 缺 2 图），不重复计。

### 组 1 已核实"真的修好了"
图片补齐（36kr 0→15、taobao 0→18、huawei 51、mi 20、apple 24）、**11/11 页 0 裂图**、
airbnb 死白带消失、热榜 `rank` 序号在位、H1/H2/H3 字号层级一致。

FINAL3_DONE group=1 pages=11 looks_real=5 minor=5 rejected=1 new_blockers=1 new_majors=0
