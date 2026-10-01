# 轮 29：3 页图片 + 1 个带源站 UI 的资产（worker，唯一写入者）

**范围**：`mi-com/search-phone`、`huawei-cn/home`、`bilibili-com/home` 三页补**源站真实图**，
外加把**带源站 UI 像素**的 `bilibili-video-player.png` 换掉。只改 `m1/curated/<site>/<page>.json`、
`m1/curated/assets/**`、`.scratch/**`；未碰渲染器/axis/corpus，无新语法，无 git 提交。

## 方法（照轮 26b/28，未重新发明）
- 复用 `.scratch/26-images/imgmap.mjs`（其 4 个函数逐字复制自 `m1/extract/extract.mjs`）读 `dom.html` +
  `nodes.json`，跑**整页 tag 一致性闸门**（`cleanedIndex` 与 dom.html 扫描 tag 序列逐项对齐）。三页**全部 ok**：
  - mi-com/search-phone `tags=826 imgs=119 resolved=119 unattributed=0`
  - huawei-cn/home `tags=494 imgs=18 resolved=18 unattributed=0`
  - bilibili-com/home `tags=1221 imgs=53 resolved=53 unattributed=0`
- **内容图判据**：`nodes.json` 的 img `bbox`，只取 `w ≥ 200 且 h ≥ 120`；图标/装饰/懒加载占位跳过并计数。
- **URL 绝对化**按 `meta.json` 的 origin（F-025）；**未发明 URL**、未从截图转写文字、未合成 CDN 变体后缀。
  （唯一例外说明见 §4：候选变体只在 capture 里出现过 3 个，全部逐一实测，未自造。）
- **归属核对**（不看索引先后）：
  - 新增 `.scratch/29-images/attrib.mjs`：按 dom.html 的 tag 流重建嵌套，报出每个 img 的**最近 `<a href>`**，
    用 href 里的业务键（mi `product_id` / bilibili `BV` 号 / `live.bilibili.com/<房间号>` / huawei 卡片链接）
    与模型条目的 `_action.to` 对照。
  - huawei 页该脚本的锚点归属**整体错位一格**（卡片 DOM 是 `img` 与 `<a>` 平行而非包含），故 huawei 只用
    **同卡片内的 alt 文本 = 模型条目文本**这条证据（并在原文里逐卡核对，见 §2）。
  - bilibili 用**双证据**：卡片 alt（= 视频标题）**与** href 里的 BV 号，11/11 全对上。

## 1) mi-com/search-phone（源站 119 `<img>`；nodes.json 119 img）
内容图 **20** 张（4 列 × 5 行，全部 200×200）。归属证据 = 每张图的最近 `<a href>` 的 `product_id`，
与模型 `results._items[*]._key`（`mi-<product_id>`）**逐条全等**，且 DOM 顺序与模型顺序一致：

| DOM 序 | cleanedIndex | href 里的 product_id | 模型条目 |
|---|---|---|---|
| 0 | 174 | 1230809235 | Xiaomi 18 Pro系列 9.9元预约福袋 |
| 1 | 185 | 1230803526 | Xiaomi 15 Ultra 12GB+256GB |
| 2 | 208 | 1230808328 | REDMI Note 17 Pro 8GB+128GB |
| 3 | 227 | 1230808907 | Xiaomi 18 Fold 16GB+512GB |
| 4 | 244 | 1230805810 | Xiaomi 17 Ultra 12GB+512GB |
| 5 | 263 | 1230802686 | Redmi Note 14 5G 8GB+256GB |
| 6 | 278 | 1230800929 | Redmi Note 13 Pro 12GB+256GB |
| 7 | 297 | 1230801727 | Xiaomi Civi 4 Pro 12GB+512GB |
| 8 | 316 | 1230802937 | Xiaomi 15 Pro 12GB+256GB |
| 9 | 331 | 1230802679 | Redmi Note 14 Pro 12GB+256GB |
| 10 | 350 | 1230802290 | Redmi K70 至尊版 12GB+512GB |
| 11 | 371 | 1230802683 | Redmi Note 14 Pro+ 16GB+512GB |
| 12 | 388 | 1230801079 | Xiaomi 14 12GB+256GB |
| 13 | 408 | 1230802946 | Xiaomi 15 12GB+256GB |
| 14 | 427 | 1230805813 | Xiaomi 17 Ultra 徕卡版 16GB+512GB |
| 15 | 444 | 1230803209 | REDMI K80 Pro 16GB+512GB |
| 16 | 463 | 1230803367 | Redmi 14C 4GB+128GB |
| 17 | 480 | 1230808645 | REDMI K100 Pro Max 12GB+256GB |
| 18 | 499 | 1230804969 | Xiaomi 17 12GB+256GB |
| 19 | 519 | 1230804977 | Xiaomi 17 Pro Max 12GB+512GB |

**新增 20 张**；跳过 99 张（34×34 满减/服务图标、27×18+55.5×18 促销角标、90×90 站标、「猜你喜欢」轮播
**140×140 < 200 判据**的 10 张商品图、页脚 85×28 认证标）。源站这些商品图 alt 为空，故 `_image` **只写
`image`，不编 alt**（渲染器对空 alt 输出 `alt=""`）。

## 2) huawei-cn/home（源站 18 `<img>`；10 张内容图）
**新增 6**，跳过 4：

| 节点 | cleanedIndex | 证据 |
|---|---|---|
| `hero._items[0]` hero-mate-xt-2 | 135 | 可见首屏（x=0）slide，src `mate-xt2-pc-v2.jpg` + alt “HUAWEI Mate XT 2” |
| `hero._items[1]` hero-hdc-2026 | 121 | src `hc2026-kv-banner-pc.jpg` + alt “华为全联接大会2026”（同源重复帧 148 在 x=1440 未挂） |
| `featured._items[0]` 天津滨海农商银行 | 242 | 卡内 alt = 条目标题；同卡 `<a href>` = e.huawei.com/…/tianjin-binhai-…（人工核原文确认） |
| `featured._items[1]` 华为乾崑，守护200万份信任 | 254 | 卡内 alt 逐字 = 条目标题 |
| `featured._items[2]` 2026国际数字能源展 | 267 | 卡内 alt = “International Digital Energy Expo (IDEE) 2026”（源站英文 alt） |
| `featured._items[3]` HUAWEI WATCH 6 Pro | 279 | 卡内 alt = “Watch 6 pro” |

跳过（reason）：108（Mate XT 轮播重复克隆）、148（HDC 重复克隆）、126/153（HDC slide 上的
`hc2026-slogan-pc-cn-svg.svg` “智启新未来”叠字，属同一 slide 的组成件）；另 8 张 <200×120 图标已按判据跳过
（78 华为 logo、185/193/201/209/217/225 六业务图标、369 在线客服）。

## 3) bilibili-com/home（源站 53 `<img>`；51 张 ≥200×120）
**新增 11**（10 张视频卡封面 + 1 张直播卡封面）= 模型 `feed._items` 全部 11 条都有图。
归属**双证据**（alt 标题 + href 的 BV 号）逐条全对：

| cleanedIndex | alt（= 模型 `_name`） | href | 模型条目 |
|---|---|---|---|
| 600 | 当你带着大运误闯魔族腹地时！ | /video/BV1Dzej6JEG5 | v-bv1dzej6jeg5 |
| 642 | 【JO家日常】#13 … | /video/BV1LZYf65Epq | v-bv1lzyf65epq |
| 684 | 都在做AI手机…【差评君】 | /video/BV1chew68EEw | v-bv1chew68eew |
| 726 | 老辈子手搓还有人看吗？ | /video/BV1Qyen6aELC | v-bv1qyen6aelc |
| 768 | 这才是正确的粤语读音？… | /video/BV1yreG6aE99 | v-bv1yreg6ae99 |
| 810 | 新角色【大肥鱼】 | /video/BV1xRer6jENr | v-bv1xrer6jenr |
| 852 | 《原神》7.1版本… | /video/BV1znY96NEvn | v-bv1zny96nevn |
| 894 | 曾靠剧情火爆全球的游戏… | /video/BV19Fe36rEEK | v-bv19fe36reek |
| 936 | 中国模特勇闯欧洲时装周… | /video/BV1Q6eE64EeE | v-bv1q6ee64eee |
| 978 | 这什么物价？！… | /video/BV1SAYd6sEtv | v-bv1sayd6setv |
| 1018 | （alt 空）直播封面 | //live.bilibili.com/1939977064 | live-1939977064 |

跳过 40 张：163–217 的 **28 张 1689×158 顶部动效粒子帧**、221（162×78 站标）、456/465/483/492/501/510/519/528
（横幅轮播的**其它** 8 帧，模型只有一个 `banner` 节点，当前展示的 474 = 第五人格亲密之月 未动）、537/546
（轮播无限循环克隆）、1043（12×12 图标）。**Top 条 160（1440×155，`mirror_report_banner`）无模型节点，未挂**
（按纪律不新增节点）。

## 4) bilibili 播放器资产（`bili_asset=replaced`）
- **原资产**：`m1/curated/assets/bilibili-video-player.png`（978×550，2026-09-30 从 `video-bv1gj411x7h7/full.png`
  裁切）。像素里烙着源站 UI：左上「✕ 登录 免费看高清视频 [试看30秒]」条、橙色弹幕浮字
  「pcl2过来的《千万别点》/《三角符文第三章预告》」+ 黑边 —— 与 `.scratch/25-quality/findings-4.md`
  的 blocker 条目（层级 asset）一致。**我已亲眼复核该 PNG，描述属实。**
- **处置（换成源站真实封面 URL）**：`bilibili-com/video-bv1gj411x7h7.json` 的根 `_image` 改为 capture 里的
  **`og:image`**：`https://i1.hdslb.com/bfs/archive/5242750857121e05146d5d5b13a47a2a6dd36e98.jpg@1200w_630h`
  （`dom.html` 里 `<meta property="og:image">`，同页 `og:image:alt` = “【官方 MV】Never Gonna Give You Up -
  Rick Astley_哔哩哔哩_bilibili”，与模型 `_title` 一致 ⇒ 归属可证；`og:url` = `/video/BV1GJ411x7h7/`，同片）。
- **删掉旧资产文件**：`rm m1/curated/assets/bilibili-video-player.png`（已无引用；grep 全仓只剩 curation log 的文字
  提及）。它在 HEAD 里有副本，`git checkout -- m1/curated/assets/bilibili-video-player.png` 可一键还原。
- **渲染复核（看图）**：换后首屏是官方 MV 首帧（Rick Astley 本人），**无登录条、无弹幕文字、无试看角标**。
- **残余（如实）**：该封面自身带**左右近黑留白**——MV 是 4:3，B 站封面画布是 16:9。实测该视频封面 capture 里
  **全部 3 个变体都带**：`@.webp` 1920×1080、`@1200w_630h` 1120×630、`@57w_57h.webp` 57×32，
  中缝扫描线在两侧 ~13–15% 处是 (13,15,12)。这是**源站素材自身的编码留白，不是我们截播放器界面留下的黑边**；
  没有"干净无留白"的真实封面可选。**未自行合成 CDN 裁切变体后缀**（如 `_1c` 4:3 裁切）——那属于自造 URL。
  若父代理判定必须去净留白，选项是：① 本地裁 4:3 派生素材（派生资产，需批准）；② 按任务书 fallback 删图只留
  “视频位置”语义。当前按任务书优先级（“优先改用源站真实 poster/封面 URL”）保留真封面。

## 硬门禁（`node m1/eval/pipeline.mjs --shots`，本轮改动全部在位时跑）
- 渲染 **42/42**（错误 0）| **HTML 保真 42/42 (1.00)** | **Markdown 保真 42/42 (1.00)**
- 模型校验 **48 全通过**；七套自测全通过（校验器 / 地基 D1·D2·D3 / 度量 F-052 / 文本 F-031 / 轴一致性 / Markdown）
- **视觉自查 42/42 干净**（无 `img-variance` 等硬缺陷）
- 取消回滚项：无（没有一页因补图导致保真/视觉下降）
- **看图自查 5 张**（`convert` 局部裁切，存 `.scratch/29-images/crops/`）：
  - `mi-com-search-phone.png`：3 张商品卡真出图，产品与条目对得上，尺寸合理，无裂图；
  - `huawei-cn-home.png`：Mate XT 2 首屏大图真出图；
  - `bilibili-com-home.png`：横幅正常（本次未动）；`bili-home-feed.png`：**6 张视频卡封面真出图，且与卡标题一一对应**；
  - `bilibili-com-video-bv1gj411x7h7.png`：官方 MV 首帧，源站 UI 像素已消失。
- URL 存活：本轮新增的 **38 条 URL 全部可达**（HTTP 206/200；清单 `.scratch/29-images/urls-checked.txt`）。

## 纪律
- `git diff`：4 个模型**纯新增 `_image` 键**（mi +60 行 / huawei +24 行 / bili-home +43 行）+ 1 处**替换**（bili video
  `_image.image`/`alt` 各 1 行）+ 1 个**资产文件删除**；**无删事实、无新语法、无 git 提交、无 staged 文件**。
- pipeline 重生成的 `m1/curated/renders/**`、`m1/eval/m3-final.json` 已 `git checkout` 还原（照轮 28 纪律，工作树
  只留模型/资产改动 + `.scratch/29-images/`）。**要发布新渲染，请再跑一次 `node m1/eval/pipeline.mjs --shots`**；
  本轮的新鲜截图证据留在 `.scratch/29-images/crops/`。

## 任务书与证据的偏差（如实）
- 任务书第 3 项写「**`bilibili-com/home`** 的播放器资产」，但其像素描述（登录条 + 弹幕 + 黑边）与搜索路径
  （`corpus/bilibili-com/home/dom.html` 找 og:image/poster）自相矛盾：`home.json` 唯一的图是**干净**的
  `bilibili-banner.png`（第五人格亲密之月，无 UI 像素），而带该 UI 的资产 `bilibili-video-player.png`
  只被 `bilibili-com/video-bv1gj411x7h7.json` 引用（= `.scratch/25-quality/findings-4.md` 的 blocker）。
  处置：**两件都做实**——bilibili home 补 11 张真实封面 URL（对应 findings-2 的 major「视频卡无封面」），
  视频页换掉带 UI 的资产（对应 findings-4 的 blocker）。`home/dom.html` 里没有 og:image/poster（`grep` 为 0），
  只有**视频卡封面 URL**，与任务书「或视频卡封面 URL」一致，故用在 home 的 `feed` 上。

## 计数（判据口径：`w ≥ 200 且 h ≥ 120` 为内容图，其余为跳过）

| 页 | 源站/nodes img | 内容图 | 本次新增 | 图标/装饰跳过 | 其它跳过 |
|---|---|---|---|---|---|
| mi-com/search-phone | 119 | 20 | 20 | 89 | 10（猜你喜欢 140×140 <200 宽） |
| huawei-cn/home | 18 | 10 | 6 | 8 | 4（轮播重复克隆 2 + 同 slide 叠字 2） |
| bilibili-com/home | 53 | 51 | 11 | 2 | 40（动效帧 28 + 横幅其它帧 8 + 克隆 2 + 无模型节点 2） |

**合计新增 37 张源站真实图；`_image` 计数 0 的页（mi search-phone / huawei home / bilibili home）均已 ≥1。**

## 未做 / 局限
- mi「猜你喜欢」10 张商品图（140×140）按 `w ≥ 200` 判据**未挂**（源站封面尺寸本身偏小）；若要挂需放宽判据（须批准）。
- bilibili home 顶部 `mirror_report_banner` 条（160）与 28 张动效粒子帧无对应模型节点，未挂（未新增节点）。
- huawei 首屏轮播的第二张（HDC）在第一屏外，属轮播态；已按模型节点回挂其源站 slide 图。
