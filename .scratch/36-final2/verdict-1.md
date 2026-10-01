# 组 1 终审复验（轮 36-final2 · 只读 · 看图为主）

对象：`m1/curated/renders/<key>.png`（哈希门禁保证与同目录 HTML 同源；实测 HTML→PNG 拍摄间隔 21–34s，同批）。
11 页：36kr-com/home、airbnb-com/room-28871、apple-com/home、aws-amazon/ec2-on-demand、github-com/login、
huawei-cn/consumer-phones、learn-microsoft/vm-sizes、mi-com/search-earbuds、sspai-com/matrix、sspai-com/u-jtc092al、taobao-com/home

## 证据方法（预算 8 张图，实际用 2 张 + 2 项零成本量测）

1. **首屏拼版**（1 张）：11 页各裁 `1280×900+0+0` → 400px 宽，4×3 拼版（`.scratch/36-final2/tmp/sheet_top.png`）。
2. **全页缩略拼版**（1 张）：11 页整页 fit 300×950，6×2 拼版（`.scratch/36-final2/tmp/sheet_full.png`）。
3. **零成本量测 A · 死白带**：逐行暗像素（<235）计数，找 ≥80px 全白行段（下表）。
4. **零成本量测 B · 图片覆盖**：`corpus/<k>/nodes.json` 里 `tag==img && bbox.w≥120 && bbox.h≥120` 的**源站内容图数量**
   ⇄ 渲染 HTML 的 `<img>` 数。T-109 说明 nodes.json 的 img 只有 bbox，故按「≥120px 的图节点」作为**上界**计数，
   归因仍以源站 `alt` + DOM 路径为准（下文逐条给 alt/路径）。
5. 文字级事实用 grep/`<title>` 与 corpus 比对（不转写截图）。

### 量测 A：死白带（无 30% 空尾）

| 页 | 页高 | 首内容 y | 尾白 | 内部 ≥80px 白带 |
|---|---|---|---|---|
| 36kr-com/home | 4671 | 48 | 92 | 无 |
| airbnb-com/room-28871 | 7976 | 48 | 92 | **y4145–4628（484px）**、y1053–1272（220px） |
| apple-com/home | 5368 | 51 | 124 | 无 |
| aws-amazon/ec2-on-demand | 3657 | 48 | 92 | 无 |
| github-com/login | 900 | 51 | **559** | 无（内容仅占 340/900） |
| huawei-cn/consumer-phones | 6084 | 48 | 92 | 无 |
| learn-microsoft/vm-sizes | 2732 | 51 | 92 | 无 |
| mi-com/search-earbuds | 5064 | 48 | 92 | 无 |
| sspai-com/matrix | 2341 | 48 | 92 | 无 |
| sspai-com/u-jtc092al | 1590 | 48 | 128 | y913–993（81px） |
| taobao-com/home | 4357 | 48 | 148 | 无 |

（轮 34 的 mi 页尾 30% 死白已消失；组 1 内 10/11 页尾白 ≤148px，唯一大带是 airbnb 中段 484px。）

### 量测 B：图片覆盖（源站内容图 ⇄ 渲染 `<img>`）

| 页 | 源站 ≥120px 图节点 | 渲染 `<img>` | 判定 |
|---|---|---|---|
| taobao-com/home | **18**（200×200，`img.alicdn.com/bao/uploaded/i*/O1CN…`，DOM `div[4]/div[1]/div[2]/div[0]/div[0]/div[0]/div[4]/div[0]`） | **0** | 缺口 |
| 36kr-com/home | **26**（5×720×300 轮播图 + 145×145 列表缩略图） | **0** | 缺口 |
| learn-microsoft/vm-sizes | **2**（688×430 `YouTube video for selecting the right size for your VM.`；655×214 `Graphic showing a breakdown of the DCadsv5 VM size series…`） | **0** | 缺口 |
| sspai-com/matrix | 1（268×170，`…/aside[1]/div[0]/div[1]/img`，侧栏位） | 0 | 源站即文字流，**不算缺陷** |
| sspai-com/u-jtc092al | 0（20 个 img 节点全 <120px：头像/图标） | 0 | 源站无大图，**不算缺陷** |
| aws / github-login | 5 / 0 | 0 | 定价表、登录取 0 图合理（github 用 SVG 标识，非 `<img>`） |
| apple/home | — | 24 | 到位 |
| huawei/consumer-phones | — | 14 | 到位（轮 34 慢图镜像已生效） |
| mi/search-earbuds | — | 20 | 到位 |
| airbnb/room-28871 | — | 5 | 到位（分辨率问题见该页） |

---

## 36kr-com/home
1. **一句话**：明显说不过去（**整页零张图**，是本次 11 页里最像"爬下来的文字墙"的一张）。
2. 最刺眼：
   - **[blocker] 源站 26 张内容图一张没挂，页面全是文字**。图上看到什么：首屏是 `36氪_让一部分人先看到未来` 大标题 + 5 条圆点链接 + "最新文章"三列纯文字卡（每张卡＝标题+摘要+一行灰色元数据），往下"专题推荐/最新快讯/推荐直播/企业号/24小时热榜"全是文字与虚线行；**整页找不到一个图像块**。归属：**model/asset**（源站素材在，未挂）。证据：corpus img 节点 `(720,300)` y=224 五张轮播位、`(145,145)` 列表缩略图（alt 逐字为条目名，例：`用AI为患者定制“大脑地图”，「曦嘉医疗」完成数千万元Pre-A轮融资｜36氪首发`、`量子软件公司获中国移动超亿元投资，国产全栈量子软件加速落地丨36氪首发`；DOM 路径 `…/div[1]/div[1]/ul[0]/li[N]` 与模型 feed 条目同序）。建议：按轮 33 的 imgmap 判据把 145×145 缩略图挂到对应 feed 条目（源站 alt 逐字等于条目标题，天然可归因）。
   - **[major] H1 直接印源站 `<title>`：`36氪_让一部分人先看到未来`（含下划线拼接符）**。图上看到什么：页面最大字号就是这行，且出现在左上角像站名；真站首页从不显示它（它只是 SEO 标题）。归属：**model**（`<title>` 提到 H1 位）。核实：`corpus/36kr-com/home/dom.html` 的 `<title>` 逐字相同，且 nodes.json 无 heading 收录该串 ⇒ 是模型自造层级，不是渲染错。建议：H1 用站名（源站 `<img alt="36氪">` 即站名证据）或该页真实栏目标题；`<title>` 不当 H1。
   - **[已确认修好]** 元数据层级与热榜序号：渲染 HTML 里 `<div class="meta">来自主题：…<span class="sep">·</span>作者`（与摘要不同级），热榜 `class="rank">1..8` 在位 ⇒ 轮 35 两项生效。
3. **只允许改一处**：挂图（把 145×145 列表缩略图与 5 张轮播图按 alt 归因挂上）。它一次消掉"文字墙"这个最大观感差。

## taobao-com/home
1. **一句话**：明显说不过去（**零张图**的电商首页——真淘宝首页是图片主导）。
2. 最刺眼：
   - **[blocker] 18 张 200×200 商品图全部未挂**。图上看到什么：顶部 `淘宝网` + 搜索框 + 一排筛选 chip，然后"猜你喜欢"下面是一大块**三列纯文字链接**（月饼/冰皮月饼/榴莲冰皮月饼…），页面下半是"最新资讯/淘宝百科"长段文字；**没有任何商品卡画面**。归属：**model/asset**。证据：corpus 18 个 img 节点 200×200，src 全为 `https://img.alicdn.com/bao/uploaded/i*/O1CN…`（商品主图域），DOM 集中在 `div[4]/div[1]/div[2]/div[0]/div[0]/div[0]/div[4]/div[0]/div[N]`（同一卡容器、y=628 与 y=942 两行）。
   - **[minor] 分类词墙的密度**：`猜你喜欢` 下的三列链接是源站"分类词"而非商品，但没有任何视觉分隔，读起来像 SEO 堆词。归属：model。建议：与商品图卡分开成组（补图后问题自然缓解）。
3. **只允许改一处**：把 18 张 alicdn 商品图挂到对应卡片（同一证据链，零猜测）。

## airbnb-com/room-28871
1. **一句话**：基本可以但有小问题（首屏像房源页，中段有 484px 空带）。
2. 最刺眼：
   - **[major] 照片墙被拆成"孤立整宽巨图"，中间 484px 全白**。图上看到什么：全页缩略里 5 张照片一张接一张铺满整宽（卧室→街景→城堡→床→建筑），靠上位置还有 220px 空带；两张照片之间没有 1 大 4 小的画廊结构。归属：**renderer/model**。量测：y4145–4628（484px）、y1053–1272（220px）纯白行段（量测 A）。
   - **[minor] 页高 7976px 且内容单列**。图上看到什么：照片与文字都靠左，右侧留白大。归属：renderer（预订卡做右栏需新的轴信号）。⚠️ 本轮**未**在 native 分辨率复核"右半页全空"的具体比例，仅由缩略图与行白带推断。
   - **[已确认修好]** 轮 32 的输入控件（入住/退房 `mm/dd/yyyy` + 日历）在首屏图中可见。
3. **只允许改一处**：照片墙成组（1 大 4 小画廊），顺带吃掉 484px 空带。

## apple-com/home
1. **一句话**：像真产品（页面形态与 apple.com 首页最接近的一张）。
2. 最刺眼：
   - **[minor] hero 是深色大块**。图上看到什么：`Apple` H1 下列着深色 iPhone 18 Pro 大图、Apple Watch Series 12 深色条；在 400px 缩略下近黑，看不出机模细节。归属：asset（源站真图本身是暗底营销图，24/24 图渲染、无裂图）。建议：无需改；若有预算可核 dark 图对比度。
   - 结构：6 格 App Store 图块 + 多张 promo 卡（Trade In / Upgrade / Carriers / MacBook Air / Apple Card），节奏正常；尾白 124px。无打回点。
3. **只允许改一处**：无（保持）。

## aws-amazon/ec2-on-demand
1. **一句话**：像真产品（一张窄价格表 + 分组行，形态可信）。
2. 最刺眼：
   - **[minor] 横向利用率低**。图上看到什么：`Amazon EC2 按需定价` H1 下是单一长表（定价 USD 列），左右留白多、页高 3657 里几乎全是表行；真 AWS 价目页有页眉/侧导航与说明段。归属：renderer/model（源站页面本身也以表为主）。
   - **[已确认修好]** 轮 35 的分组行与第二表 h2 复读：渲染为 `<tr class="row-group"><th colspan=…>`，不再画成"右格为空的数据行"。
3. **只允许改一处**：无（保持）。

## github-com/login
1. **一句话**：像真产品（表单控件与文案齐备），但页面只占首屏上半。
2. 最刺眼：
   - **[minor] 内容只占 340/900px，下方 559px 空白**。图上看到什么：白色页面上 `Sign in to GitHub` 标题 + 用户名/密码输入框 + `Continue with Google`/`Continue with Apple` 深色按钮 + `Sign in` + 右侧 `Forgot password?`，再往下整片空白。归属：renderer（真 GitHub 登录页有页脚/法务链接）。建议：给登录页补页脚区。
   - **[minor] 缺站点标识**。图上看到什么：完全没有 GitHub mark。归属：model（源站用 inline SVG，corpus `tag==img` 计数 0，所以不是采集漏图）。建议：可按源站 SVG 语义记一个 `_brand`，不新增语法。
3. **只允许改一处**：补页脚，让页面不再"半张纸"。

## huawei-cn/consumer-phones
1. **一句话**：像真产品（图到位、节奏正常，本组最干净的一张）。
2. 最刺眼：
   - **[minor] 顶部导航是一排小号 chip**。图上看到什么：`华为手机` H1 下一行 `Mate 系列 / Pura 系列 / Pocket 系列 / nova 系列 / 畅享系列 / 机型` 与"查看更多"小胶囊。归属：renderer（站点类目 tab 与动作混在一行）。建议：类目 tab 与"查看更多"动作分离。
   - **[已确认修好]** 轮 34 的 8 张慢图镜像生效：14 张图全部本地出图、页尾白 92px、无裂图。
3. **只允许改一处**：无（保持）。

## learn-microsoft/vm-sizes
1. **一句话**：基本可以但有小问题（正文那张"VM size 系列拆解"示意图缺了）。
2. 最刺眼：
   - **[major] 源站 2 张内容图未挂**。图上看到什么：全页缩略里 `Sizes for virtual machines in Azure` 下全是文字与窄列表格，没有任何图。归属：**model/asset**。证据：corpus img 节点 `(688,430)` alt=`YouTube video for selecting the right size for your VM.`（DOM `…/p[3]/span[0]/a[0]/img[0]`）、`(655,214)` alt=`Graphic showing a breakdown of the DCadsv5 VM size series…`（DOM `…/div[10]/section[1]/p[1]/span[0]/img[0]`）⇒ 后者是正文示意图，与"结构拆解"章节直接相关。
   - **[待复核·不作为判据]** 顶部 `Name structure breakdown` 表在 400px 缩略下疑似出现 `A-`/`Ac` 这类被截断的列头。**本轮图预算内未放大到 native 核实，故不判定为缺陷**，登记为下一轮复核项（rgba/列宽）。
3. **只允许改一处**：挂上 `(655,214)` 那张 DCadsv5 结构示意图（正文语义直接相关）。

## mi-com/search-earbuds
1. **一句话**：像真产品（20 张商品图 3 列网格 + 猜你喜欢，电商列表页形态完整）。
2. 最刺眼：
   - **[minor·待复核] 首行促销图位置可疑**。图上看到什么：`耳机商品 8折优惠` 区第一张是一张蓝色卡片（"8折优惠 / 最高省 600 元"），与左右两张 `REDMI Buds 6 Pro 冰釉白`、`REDMI Buds 6 白色` 商品图并排，像把广告位图当成了商品首图。归属：model（缺口或误挂）。⚠️ 未在 native 放大核对这条图与条目名的对应关系。
   - 正面：轮 33 的 20 张归属（`product_id` 全等且同序）在图上成立——型号与图对得上；页尾白 92px。
3. **只允许改一处**：核实并纠正首行那张促销图（若确为广告位则移出商品网格）。

## sspai-com/matrix
1. **一句话**：像真产品（源站 Matrix 本身就是文字流，无图不是缺陷）。
2. 最刺眼：
   - **[minor] 无图是源站形态**。图上看到什么：`Matrix 社区` + `发现/热门/标签/最新` chip + 十余条"标题 / 作者 / 阅读数 / 时间"文字卡。核实：corpus 46 个 img 节点里仅 1 张 ≥120px（268×170，位于 `…/aside[1]/div[0]/div[1]/img`，侧栏位，模型未收录侧栏 ⇒ 属**已知的范围取舍**，非渲染丢图）。归属：capture/范围（标注 **capture/scope**，非 bug）。
   - 页尾白 92px，节奏正常。
3. **只允许改一处**：无。

## sspai-com/u-jtc092al
1. **一句话**：基本可以但有小问题（H1 又是 `<title>` 直出；左列统计区偏"数据库感"）。
2. 最刺眼：
   - **[major·与 36kr 同族] H1 = `MaxChow 的动态 - 少数派`**。图上看到什么：最大字号就是这行带 ` - ` 拼接的 SEO 标题。归属：**model**（与 36kr 同一取标题路径）。建议：H1 用"用户名 + 动态"或源站真实页面标题。
   - **[minor] 左列"成就与荣誉"是纯标签—数字列表**。图上看到什么：`成就 / 成为少数派 SINCE 2013 / 创作文章 2000 / 文章阅读量 4619000 / 获得充电 … / 获得喜欢 418 / 获得收藏 …`，其中有一项数字看起来是 `0`，无单位、无图标。归属：model（源站是徽章墙）。建议：徽章做成图标/徽章组，或补单位。
3. **只允许改一处**：H1 改为页面真实标题（去掉 `<title>` 直出）。

## 组级结论

- **唯一"会被当场打回"的类别**：**内容图覆盖**。组 1 的 11 页里 7 页 `<img>`=0，其中 **taobao（18 张源站商品图）、36kr（26 张源站缩略/轮播图）、learn-microsoft（2 张源站内容图）有可归因的真实素材却没挂**，taobao 与 36kr 因此退化成文字墙。证据链现成（alt 逐字等于条目名 / 同一卡容器 / 商品图域），按轮 33 的方法即可挂。
- **第二族**：**H1 直出 `<title>`**（36kr `36氪_让一部分人先看到未来`、sspai-u `MaxChow 的动态 - 少数派`）：`_`、` - ` 这类拼接符暴露采集痕迹，是"一眼假"的高频点。
- 前轮修复**实测生效**并可在渲染 HTML/PNG 中复核：36kr 元数据 `.meta`+`·` 与热榜 `rank 1..8`、aws `row-group` 分组行、mi 满幅图带（页尾 30% 死白消失）、huawei 14 张图（8 张慢图镜像）、airbnb 预约输入控件、sspai/36kr 图归属页。
- 已知**采集缺口**（标注 capture，非 bug）：grafana 面板体、留出集 3 页 URL 本机取不到、huawei 慢链路（已镜像，本轮无影响）。

FINAL2_DONE group=1 pages=11 looks_real=6 minor_issues=3 rejected=2 new_blockers=2 new_majors=3
