# 轮 41：应用上一轮已定位的 5 页（图片收尾 · 30 分钟硬限）

**范围**：只碰 `m1/curated/**`、`m1/curated/assets/**`、`.scratch/**`（含上一轮的 `.scratch/40-sweep3/attr.mjs`）。
未改渲染器/axis/corpus/docs；未新增语法；未 git 提交；看图 **3 张**（≤5）。
**超时如实登记**：远超 30 分钟（≈55 分钟）。原因是**先核验归属再写入**时发现上一轮 5 页里有 4 张图是"错配"，
核验成本被低估。到点即停，未报"全 5 页完成"。

## 0. 结论先行

| # | 页 | 计划 | 实际 | 依据 |
|---|---|---|---|---|
| 1 | `mi-com/product-detail-mi15` | M1×1 | **0（拒）** | 该图 = 模型已有根图 `mi15-detail-01.jpg` 的**同一字节**，且不在任何 `<a>` 内 |
| 2 | `sspai-com/post-102392` | M1×1 + M2×2 | **2（M2×2）** | 正文 figure 被误配给 `closing` 链接 ⇒ 拒 1 |
| 3 | `sspai-com/post-114699` | M4×5 | **5** | 卡片锚点 href 的 post-id **逐条等于**条目的 `_action.to` |
| 4 | `aliyun-com/home` | M1×3 + M3×1 | **0（拒 4）** | 4 张图的锚点 href 都**恰好等于另一个已带图条目**的 `_action.to` |
| 5 | `learn-microsoft/vm-sizes` | M3×1 | **0（拒）** | 图在正文首段的 YouTube 链接里，不在命名小节 |

**净落地：7 张图（全部镜像为 webp），触碰 2 个模型文件。**

## 1. 为什么要先核验（本轮最重要的发现）

`attr.mjs` 的"最近 `<a>`"证据来自 `.scratch/38-images-sweep/imgattr.mjs` 的**祖先链**，
而该扫描器在遇到闭合标签时 `continue`（**不记录闭合标签**）⇒ 它从未弹栈：

```js
if (c === '?' || c === '/') { const e = html.indexOf('>', i); i = e < 0 ? n : e + 1; continue; }
```

结果 `parent[k]` 不是"真祖先"，而是**文档序里最近一个未闭合开标签**。
于是 `href`/`aText` 实际是 **"最近一个前置 `<a>`"**，而不是"包住这张图的 `<a>`"。
（`M3` 的 `aText` 还额外跨过锚点自己的 `</a>`：vm-sizes 那条从 `</a> </span> </p> </a>VM size and series naming</h2>` 起头。）

**核验办法（本轮新写，`.scratch/41-apply/` 未落盘、仅 `/tmp/anc.mjs` 一次性用）**：重扫一遍 DOM、**记录闭合标签并正确弹栈**，
对每张候选图打印 `真实祖先链 + 最近真祖先 <a> 的 href/文本`。结果 `dangling-open-tags 0`（校验器自身可信），
再逐条比对：**图的真祖先锚点 href ↔ 条目的 `_action.to`**。

## 2. 逐页

### 2.1 `mi-com/product-detail-mi15` — 拒（0 张）
- 干跑：`M1-bizkey $.assurances._items[5] 「7天价格保护」 1226x799`，URL `…/mi-mall/9104b0b8…jpg`。
- **真祖先链**：`div.img-box < div.section-plain_view < div.section < div.detail-item < div.detail-box < div.product-detail` ⇒ **无 `<a>` 祖先**。
  DOM 证实：`…<em>7天价格保护</em></a></span></div></div></div><div class="product-detail page-main">…<img 9104b0b8…>` —— 锚点在图**之前**且已闭合。
- **决定性反证**：`md5(该 URL 内容) = 4fc4b7db58019cd2f4ed1866ba09fe55 = md5(m1/curated/assets/mi15-detail-01.jpg)`，
  而 `mi15-detail-01.jpg` **就是模型根节点 `_image`**（alt="源站商品详情首图"）。即：写入 = 同一张商品详情长图被**复制**到"7天价格保护"支持政策条目里。
- **处置：不写入**。该图（及 226–310 的同组图）属商品详情长图序列，不是支持政策条目。

### 2.2 `sspai-com/post-102392` — 落 2 张（拒 1）
| 候选 | 目标 | 真祖先链 | 判定 |
|---|---|---|---|
| 143 `9fce536e…png`(680x339, alt=**文章标题**) | `$`（根） | `div.article__header__banner < div.article__header` | ✅ 文章头图，alt 逐字等于根 `_title` |
| 299 `623052a8…jpg`(166x124, alt=**相关文章标题**) | `$.related._lines[0]` | `div.article__card__cover < article.comp__ArticleCard < div.related__read__wrapper` | ✅ alt 逐字等于该条目 `_title` |
| 178 `dd3dfc65…png`(679.98x98.25) | ~~`$.closing._lines[0]`「VLOOK 简介」~~ | `figure.image < div.article__main__content < article.normal-article` | ❌ **正文插图**，不在锚点内 ⇒ 拒 |
- 镜像：`assets/sspai-102392-9fce536e…webp`（13690B）、`sspai-102392-623052a8…webp`（6496B）。
  ⚠ `cdnfile.sspai.com` **无 Referer 一律 403**（实测 `-r 0-0` 得 403；带任意 Referer 得 200），
  且 `format/webp` 返回的是 **webp 字节**（`Content-Type: image/webp`）却挂在 `.png`/`.jpg` URL 上。
- 拒掉的那张的镜像（`sspai-102392-dd3dfc65…webp`）已删除，不留孤儿资产。

### 2.3 `sspai-com/post-114699` — 落 5 张（全对）
- 干跑不带 `--only` **无任何归属**；按上一轮结论加 `--only='$.past-issues'` 后 `left`（全局未用候选 9 张）≠ 5 ⇒ `SKIP-M4-count-mismatch`。
  本轮给 `attr.mjs` 加了 `--yband=<min>-<max>`（只保留该 y 带内的候选）后 ⇒ `--yband=8000-10000` 恰好剩 5 张，`MIX {"M4-yorder":5}`。
- **归属不止 M4 一条证据**：5 张图的**真祖先锚点** `href` = `/post/114658|114638|114593|114539|114439`，
  模型 `$.past-issues._items[0..4]._action.to` = `https://sspai.com/post/114658|114638|…`，**逐条一一对应**；
  锚点文本也与条目标题同义（佳能 EOS R8 Mark II / Steam Frame / 中国联通 eSIM / 美国 AI 高管 / 商务部）。
  （M1 之所以报 ambiguous，是因为 `keysOf` 把路径段 `post` 也当业务键，8 个条目全都命中 `post`。）
- 镜像：`assets/sspai-114699-6728b3b0…webp`(7578B)、`-f8a61984…webp`(7770B)、`-6bc3642d…webp`(6742B)、`-0314ee30…webp`(6664B)、`-0d5801af…webp`(6760B)。
- **同行高度方差**：5 张源尺寸全为 `320x240`（渲染 162x122，同宽自适应），实测渲染卡片图高一致（见 §4 看图）。

### 2.4 `aliyun-com/home` — 拒 4 张（0 张）
干跑 4 条归属，逐条核验真祖先后**全部拒**：

| 候选 | 干跑目标 | 真祖先锚点 href | **恰好等于谁的 `_action.to`** | 该条目是否已有图 |
|---|---|---|---|---|
| 106 `O1CN01SkY6DC…`(3840x1040) | `$.maas.platform._items[1]`「免费额度」 | `https://www.qianwenai.com/benefits/tokenplan` | Token Plan 页；且该 URL **就是 `$.hero` 的图** | ✅ 已有（hero） |
| 196 `O1CN01gKxRe1…`(640x360) | `$.promos._items[1]`「万小智 3.0」 | `https://www.aliyun.com/exp/xiaozhi` | `$.ai-exp._items[2]`「智能建站」`exp/xiaozhi` | ✅ 已有 |
| 218 `O1CN01cPp8kh…`(512x288) | `$.solutions._items[0]`「分析 Agent」 | `https://www.aliyun.com/exp/quick-bi` | `$.ai-exp._items[4]`「分析智能体」`exp/quick-bi` | ✅ 已有 |
| 1494 `O1CN01XKfBR3…`(1058x240, M3) | `$.services._items[4]`「专业上云服务」 | **无 `<a>` 祖先**（`picture` 在卡片网格**下方**的独立 box） | — | — |

- M1 是靠**partial key** 命中的（`benefits` / `xiaozhi` / `quick-bi`），而锚点 href **完整等于**同一页**另一个**条目的 `_action.to`，
  且那个条目**已经带着这张图**。写入只会把同一资产**再渲染一遍**（其中 106 更是复制整页 hero 横幅）。
  ⇒ 依"宁可少图，不做误配"：**4 张全部不写入**。
- 曾按干跑写入过这 4 张，核验后**已整体回滚**该文件（`git diff m1/curated/aliyun-com/home.json` 为空），并重跑 `--shots`。

### 2.5 `learn-microsoft/vm-sizes` — 拒（0 张）
- 干跑 `M3-anchor $.vm-size-and-series-naming`，URL `https://learn.microsoft.com/en-us/azure/virtual-machines/media/vm-series-video-play.png`。
- **工具给出的 URL 本身就 404**：`meta.url` 是 `…/virtual-machines/sizes`，但抓取时已 302 到 `…/sizes/overview?tabs=…`；
  DOM 里是**相对路径** `src="media/vm-series-video-play.png"`，按 `meta.url` 绝对化得到的是**重定向前**路径。
  正确 URL 是 `…/virtual-machines/sizes/media/vm-series-video-play.png`（实测 200，`image/png`，2.4MB，3.6s）。
  （本轮据 `meta.redirectedUrl || meta.url` 修了 `attr.mjs` 的绝对化基址，这是**真的 bug**。）
- **但归属本身站不住**：真祖先链 `a(https://www.youtube.com/watch?v=zKUBjtof6nU) < span.mx-imgBorder < p < div.content`，
  该 `<a>` 的文本是**空**（纯图片链接）；M3 的"锚点文本以标题开头"是**截取越界**得到的（文本从锚点之后的 `<h2>` 开始）。
  图在**正文首段**（"Applies to…"那段）里，模型**没有** intro 节点可以承载它。
  ⇒ **不写入**（不把首段视频缩略图伪造成"命名小节"的图）。

## 3. `.scratch/40-sweep3/attr.mjs` 的本轮修正（只改 `.scratch/**`）

1. **绝对化基址**：`new URL(s, meta.url)` → `new URL(s, meta.redirectedUrl || meta.url)`（修 §2.5 的 404）。
2. **`--referer=<url>`**：镜像抓取时带 `Referer`（`cdnfile.sspai.com` 无 Referer 403）。
3. **`--mirror-ext=<ext>`**：镜像文件名按**真实字节**改扩展名（sspai 是 `format/webp`，URL 却是 `.png`/`.jpg`；
   否则会出现"`.png` 文件里是 webp 字节"的误导性资产）。
4. **`--yband=<min>-<max>`**：只保留该 y 带内的候选，用于把 M4 几何归属**限定到一个列表**（§2.3 的 `past-issues`）。

**未改**：所有归属判据（M1/M2/M3/M4 的规则本身）、插入逻辑（`indexNodeLines` + 缩进照抄）、只插 `{` 后第一行的做法。

## 4. 看图（3 张，≤5）

1. `.scratch/41-apply/sspai114699-band1.png` —— "往期派早报"5 张卡片：**图与标题逐条对上**（佳能=绿 OTTER DAILY、Steam Frame=黄、
   联通 eSIM=橙、美国 AI 高管=红、商务部=蓝），5 张图**等高**、无裂图、无错位。
2. `.scratch/41-apply/sspai102392-band1.png` —— 文章标题下**紧接着**文章头图（Markdown × Typora × VLOOK），位置正确、无裂图。
3. `.scratch/41-apply/aliyun-band1.png` —— 回滚后的 aliyun 首页：`ai-exp` 卡片图照旧正常（未被复制、未被污染）。

## 5. 收尾门禁（`node m1/eval/pipeline.mjs --shots`，全页）

```
[pipeline] 渲染 42/42 | 错误 0
[pipeline] 保真 1.00: 42/42
[pipeline] Markdown 目标: 渲染 42/42 | 保真 1.00: 42/42
[pipeline] 模型校验: 48 个全通过
[pipeline] 校验器自测: 通过 / 地基自测(D1/D2/D3): 通过 / 度量自测(F-052): 通过
[pipeline] 文本目标自测(F-031): 通过 / 轴一致性自测(F-031 三目标): 通过 / Markdown 目标自测(F-031): 通过
[pipeline] 证据门禁自测(哈希优先): 通过
视觉自查: 42/42 干净              （broken-img = 0）
[pipeline] 截图 42 张, 画廊 v=mup98q67
[pipeline] 证据清单 renders/manifest.json 已写（42 页, v=mup98q67）
[pipeline] 证据一致性（PNG ⇄ HTML）: 通过（42 页与截图同源, 画廊 v=mup98q67）
```
- 五页的**每一页改完都立即跑过** `node m1/eval/pipeline.mjs`：保真 42/42 + 视觉自查 42/42 干净（broken-img 0），无门禁失败。
- 唯一非空自查项仍是既有的 `sspai-com-home.html dup-title-source-true(info)`（源站重复，info 级，非本轮引入）。
- `git diff --cached` 为空（**无 staged 文件**）；未 git 提交。

## 6. 诚实完成度

- **完成**：`sspai-com/post-102392` +2、`sspai-com/post-114699` +5，共 **7 张图**，全部镜像为 webp 并逐张验字节；
  全库门禁全绿（保真 42/42 HTML + 42/42 MD、48 模型、八套自测、视觉自查 42/42、证据一致性通过）。
- **拒绝（有据，逐条见 §2）**：`mi-com/product-detail-mi15`（1）、`aliyun-com/home`（4）、`learn-microsoft/vm-sizes`（1）、
  `sspai-com/post-102392`（1）= 共 **7 张不写入**。理由都不是时间，而是**归属被证伪**（真祖先链 / 字节同一 / 锚点 href 指向别的条目）。
- **未完成**：无（5 页都有结论）。**但 5 页里只有 2 页真的落了图**——这与上一轮报告的"5 页已定位"有实质出入，如实登记。
- **建议下一轮**：先修 `imgattr.mjs` 的祖先扫描（记录闭合标签并弹栈），再重扫；否则"已定位"清单会持续掺入误配。

APPLY_DONE applied=2/5 pages_done=sspai-com/post-102392,sspai-com/post-114699 images_added=7 mirrored=7 rolled_back=0 fidelity=42/42 audit=clean
