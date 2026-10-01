# 组 4 · 终审（第三轮，看图为主）

判据：**这页现在像一个真实上线的产品页吗？还有哪里会被当场打回？**

- 组 4 页面（10）：36kr-com/search-viz、apple-com-cn/iphone-17、apple-com/macbook-air、
  bilibili-com/video-bv1gj411x7h7、grafana-play/play-home、huawei-cn/search-phone、
  mi-com/product-detail-mi15、sspai-com/home、sspai-com/post-114716、stripe-docs/payments
- 截图源：`m1/curated/renders/*.png`（16:28，与 HTML 同版本；`--check-shots` 通过 v=mup9vnyf）。
  每页 model mtime ≤ html mtime，渲染未过期。
- 预算：图片读取 **8 张**（6 张短页整图 + 2 张 composite：apple 双页 / sspai 双页）。
- 自我量测（非印象）：容器 trim 实测 1060px（x110–1170，左右各 110）；grafana 内容底 y≈414/900。

**先说"这一夜已修"的核实结论（逐项）**
- 满幅图带 ✅（mi15 hero / bilibili 播放器 / apple hero / sspai 文章 banner 均满幅）。
- 动作并排 + 主次 ✅（mi15 `加入购物车` 实心 + `喜欢` 描边；bilibili `发送` 实心 + 礼仪/登录/注册）。
- chip 样式 ✅（36kr / huawei 类别 / stripe 均有胶囊）。
- 容器收缩 ✅（多页实测同一 1060 测度，未再出现整页贴边）。
- 搜索框水印 + 提交 ⚠️ 部分：36kr 有「站内搜索」按钮；**huawei 只有水印、无提交按钮**（源站有，见 #6）。
- 价格去重 ✅（mi15 现在只出现 `¥1439`/`¥2999` 各一次，无重复）。
- `<img>` 无裂图 ✅（10 页 `src=""`/`undefined` 计数 0）。
- 图片补齐 ⚠️ 部分（详见 #1/#5/#7）：36kr 0→9，但源站 25 张；apple 仍 11/19；huawei/grafana/stripe 仍 0。
- sspai 文章标题 `👀 N 部作品推荐`：**已核实为源站原文字面量**（`corpus/sspai-com/post-114716/dom.html` `👀 N 部作品推荐`），**不是泄漏/改写，勿当 bug**（纠正上轮 §10）。

---

## 1. 36kr-com/search-viz — 基本可以（有小问题）
1. **缩略图只补了前 9 张，后 12 张仍纯文字**（model|capture，最刺眼）：图上第 1–3 行 9 张卡片都有配图，
   第 4 行往下（林晓赐离职 / Kimi K3 / WAICA / 这个机器人的手 / … / 跳出工具思维）**全是无图卡片**，
   同一网格里有图/无图混排，一眼就是"半成品"。
   **证据**：渲染 HTML `<img>` = **9**；源站 `corpus/36kr-com/search-viz/dom.html` 有 **25** 个
   `img.scaleBig`，且**全部是直接 `src`（`img.36krcdn.com/...`），不是懒加载 `data-src`** ⇒
   这条**不能用"懒加载采集缺口"解释**，属 model 只挂了 9 个图节点（或采集 img 节点只有 9 个）。
   建议：把 25 张缩略图全部回挂（无图才降级），否则有图/无图混排仍会被打回。
2. **（轻）底部还有两条纯标题行**（"知乎、豆瓣、小红书…" / "跳出工具思维…"）与有图卡片同网格，放大了上面的割裂感。

**只允许改一处** → 第 1 条：补齐 25 张缩略图（这是本页唯一"像半成品"的源头）。
正面：H1「数据可视化相关文章_36氪」、搜索框水印 +「站内搜索」按钮、筛选 chip 已收进描边容器、排序胶囊、三栏卡片 + 日期，均像真站。

## 2. apple-com-cn/iphone-17 — 基本可以（有小问题）
1. **正文文字块小、左对齐、右侧大片留白**（renderer）：`神谕幻彩 / RMB 6799 起… / 24 期 / 用 iPhone 13…` 挤在左侧小字，
   右侧约 500px 全空；真 Apple 页这里是整幅居中大字。测度：文字块约占容器左 6 成。归属 renderer（measure/居中策略）。
2. **正文图片稀薄**（capture|model）：HTML 仅 11 张 `<img>`，源站 `dom.html` 78 张（多为 localnav/lazy webp）。
   归属待核（懒加载采集缺口）。
3. 正面：H1「iPhone 17」、满幅 hero（配色扇形图）、「先刷重点 / 显示屏 / Center Stage 前置摄像头」章节层级，
   highlights 已是"文左图右"交替，无裂图。

**只允许改一处** → 第 1 条：正文文字块居中/放大到 Apple 的整幅节奏。

## 3. apple-com/macbook-air — 基本可以（有小问题）
1. **M5 徽标仍是一枚孤立小方块**（model）：`Get the highlights.` 区里，M5 黑方块单独浮在右侧、四周大留白，
   与相邻文字/图不成组。归属 model（徽标未挂到对应节点）。建议：并入对应文案或放大成整幅块。
2. **正文文字块同样小、左对齐**（renderer）：`Might takes flight. / From $1299 …` 左对齐小字，右留白。
3. **图片 19 张 vs 源站 96 张**（capture|model）：正文图像稀薄。
   正面：满幅 hero、章节（Design / Performance / AI / macOS / Continuity…）如真站，tagline 忠于源文。

**只允许改一处** → 第 1 条：M5 徽标归位/放大。

## 4. bilibili-com/video-bv1gj411x7h7 — 基本可以（弹幕区明显说不过去）
1. **「弹幕」被渲染成一整墙竖排纯文本**（model|renderer，最刺眼）：图上「弹幕」标题下是 **~50 行**无结构的行
   （`传送00:01` / `跳下北泽:00:00` / `愤怒的小鸟大电影原声` / `《143人正在被骗》` …），像日志转储，不像弹幕。
   源站弹幕是覆在播放器上的飘屏（DOM 里有 `danmaku` 相关节点）⇒ overlay 被拍平成列表。**上轮已报、本轮未修**。
   建议：收敛为少量示例 + 「弹幕已省略」，或改成带时间码的规范列表。
2. **统计行日期带秒**（renderer）：`2020-01-01 07:43:23`，真站通常只到日。（轻）
3. 正面：满幅播放器海报、H1、统计行、评论输入「请先登录或注册」+`发送`(实心)/`弹幕礼仪`/`登录`/`注册`、
   `弹幕列表填充中…` 占位、尾部统计与「47篇笔记 / 65人正在看」——播放器与评论区很像真站。

**只允许改一处** → 第 1 条弹幕墙（这是本页唯一会被当场打回的模块）。

## 5. grafana-play/play-home — 明显说不过去（根因 capture，但观感打回）
1. **面板体全缺，页面只剩 11 个面板名字框**（capture）：图上就是 `Stats` 标题 + 工具条胶囊
   （Last 6 hours / Refresh / Enter edit mode / Edit）+ 2 条链接 + 11 个描边盒（Introduction / Color background / … / Emoji in stat names），
   没有任何图/表/数值。源站只有 `Loading plugin panel…`（已记采集缺口）⇒ 归属 capture。
2. **缺失面板没有任何降级提示**（renderer）：上轮建议的"面板数据未采集"占位**未落地**，盒子只有名字 ⇒
   观感是"坏掉的空 dashboard"，不是"被截断的页"。归属 renderer。
3. **尾部 ~486px 空白**（renderer|capture）：实测整页内容 trim 到 **y≈414**（图 900 高），下 486px 全空。
   可能是面板组容器预留高度或 body min-height。归属 renderer（建议确认是否空容器占位）。

**只允许改一处** → 第 2 条：给缺失面板加明确降级占位（成本最低，把"坏页"变"可解释页"）。

## 6. huawei-cn/search-phone — 基本可以（有小问题）
1. **搜索框只有水印、无提交按钮**（model，会被扣分）：图上文本框 `请输入关键字` 旁**没有**「搜索」按钮，
   而 36kr 同类页已有「站内搜索」。**源站有按钮**：`corpus/huawei-cn/search-phone/dom.html` 含
   `header-search class="btn-open-search" … <span class="iconfont icon-search">` 与
   `hcomponent-cn-searchresult-v2-search-btn` ⇒ 属 model 漏挂控件。建议：补可见提交按钮。
2. **结果条目无缩略图**（model|capture）：标题 + 摘要 + `来源：…`，纯文字（本页 HTML `<img>`=0）。归属待核。
3. （轻）**两条同名结果**（capture）：第 6/7 条都叫「华为磁吸手机支架 - 华为官网」但摘要不同——源站若即重复则非 bug。
   正面：H1「搜索结果」、类别单选 chip（全部3562 / 产品与解决方案160 / 服务支持1443 / 技术探讨181 / 新闻与活动330）+`重置`、
   「3562 条结果」、10 条结果列表、分页 1…357——很像真搜索结果页。

**只允许改一处** → 第 1 条：搜索框补提交按钮。

## 7. mi-com/product-detail-mi15 — 明显说不过去（下半页）
1. **hero 以下右半页整片空白**（model|capture，最刺眼）：满幅 hero 之后，购买信息只占**左侧约 480px**，
   容器宽 1060（实测 x110–1170），右侧约 580px 全空。
   **证据**：源站 `corpus/mi-com/product-detail-mi15/dom.html` 有 `img-left` + 2 处 `class="right"` 双栏 + **41** 张 `<img>`；
   渲染 HTML 只有 **1** 张 `<img>`（仅 hero）⇒ 右栏图库整列缺失（两栏被压成一栏）。**上轮已报、本轮未修**。
   建议：给出双栏信号（左文右图库），否则"产品详情页"右半页空白必被打回。
2. **slug 与内容不符**（model/元数据，已知 ticket）：页 slug 为 `mi15`，实际内容是
   `米家宠物空气净化器`（`meta.json` title=「米家宠物空气净化器立即购买-小米商城」）⇒ slug 误导（待更名）。
3. 正面：满幅 hero、角标（源图自带像素，勿当 bug）、**价格已去重**（`¥1439`/`¥2999` 各一次）、
   动作并排主次（`加入购物车`实心 + `喜欢`描边）、`用户评价` 入口仍在。

**只允许改一处** → 第 1 条：下半页双栏（右栏图库），否则右半页空白就是最低成本打回点。

## 8. sspai-com/home — 基本可以（有小问题）
1. **文本链接区混入一枚孤立描边按钮**（renderer，最刺眼）：`iPhone 精选配件` 旁一行 `点击购买` 描边按钮，
   而同区 `YooClaw C-ONE` / `口袋先知墨水瓶` / `白描PDF 鸿蒙版` … 都是纯文本行 ⇒ 排版不一致。**上轮已报、未修**。
   建议：链接列表统一为"标题 + 行内链接"。
2. **卡片行高/图比不齐**（renderer，轻）：上排三卡与后两卡行高、图比不同。
3. 正面：H1 `少数派 - 高效工作，品质生活`、三栏图片卡网格缩略图齐全、话题 tab（推荐/全部内容/话题讨论/热门内容/关注）、
   第二排卡片行——整体很像真站。

**只允许改一处** → 第 1 条：链接列表排版统一（去掉那枚孤立按钮）。

## 9. sspai-com/post-114716 — 像真产品
1. **结构完整**：H1「本周看什么 | 最近值得一看的 9 部作品」+ 满幅 banner + 元信息（`2026-09-18` /
   `少数派编辑部 等 4 位作者` / `16 分钟阅读`）+ 正文小节（`👀 N 部作品推荐`、`[英剧] 流人 第六季`…）+
   关键信息行（`关键词：剧情/惊悚` / `又名` / `片长` / `豆瓣链接` 按钮）+ 引用评论，读起来就是一篇真文章页。
2. **`👀 N 部作品推荐` 已核实为源站原文**（`dom.html` 字面量），**非改写/泄漏**（纠正上轮 §10 的 `»` 前缀疑点）。
3. （轻）**图片 10 张 vs 源站 35 张**（capture|model）：中下段图像稀薄；正文总高 12401px。

**只允许改一处** → 无强需求（第 3 条可选）。

## 10. stripe-docs/payments — 像真产品
1. **结构完整**：H1「付款 | Stripe 文档」+ 引导语「使用 Stripe 开始接受支付。」+ 实心 CTA「查找您的用例」+
   筛选 chip 组 + 各 H2 区块（支付选项 / 支付方式 / 支付之外 / 平台和市场 / 更多指南），
   内含 deflist、三卡行、成组 chip——就是一篇真 docs 页。
2. **（轻）`最热门` 出现两次**（hint + 第一个 chip）：源站 `dom.html` 也有 `最热门` 标签 + ContentTab-chip ⇒
   疑似源站结构（active tab 名 + chip），**倾向非 bug**，仅观感重复。
3. **（轻）页首 chip 组描边框**：单独一个描边盒子只包 5 个胶囊，上下留白略大（源站为用例 tab/导航）；可接受。

**只允许改一处** → 无强需求（第 2 条可去掉重复 hint）。

---

## 汇总（组 4 · 10 页）
- **像真产品（2）**：sspai-com/post-114716、stripe-docs/payments。
- **基本可以有小问题（6）**：36kr-com/search-viz、apple-com-cn/iphone-17、apple-com/macbook-air、
  bilibili-com/video-bv1gj411x7h7、huawei-cn/search-phone、sspai-com/home。
- **明显说不过去（2）**：grafana-play/play-home（capture 根因）、mi-com/product-detail-mi15（下半页右半空白）。
- **新 blocker：0**。
- **新 major：1** — 36kr/search-viz 缩略图只补 9/25，且**源站是直接 `src` 非懒加载** ⇒ 不能用采集缺口解释，
  混排观感是"半成品"（model 漏挂图节点；建议核实源站 25 张全部回挂）。
- **仍会打回的 carryover major（非本轮新增）**：bilibili「弹幕」竖排文本墙（上轮已报未修）；
  mi15 下半页右 2/3 空白（上轮已报未修）。
- **capture 标注（非 bug）**：grafana 面板体缺失；apple 两页正文图稀薄（11/19 vs 78/96，疑 lazy）；
  bilibili/mi15 图库稀薄；huawei 两条同名结果。
- **已核实为"非 bug"**：sspai 文章 `👀 N 部作品推荐`（源站原文）；mi15 hero 角标（源图自带像素）；
  stripe `最热门`×2（源站结构）。
- 图片读取：8 张（6 整图 + 2 composite），符合 ≤8 预算；另做 5 次 trim/数值实测。

FINAL3_DONE group=4 pages=10 looks_real=2 minor=6 rejected=2 new_blockers=0 new_majors=1
