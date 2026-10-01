# 轮 38：系统性补图（唯一写入者 · 40 分钟硬限）

**范围（硬限）**：只碰 `m1/curated/<site>/<page>.json`、`m1/curated/assets/**`、`.scratch/38-images-sweep/**`。
不得改渲染器 / axis / corpus；不得新增语法；看图 ≤8 张；不得 git 提交。**本轮未改渲染器/axis/corpus，未新增语法，未 git 提交。**

## 方法（复用轮 26b/28/29/33 机制，未重新发明）

- `.scratch/26-images/imgmap.mjs`（4 个函数逐字复制自 `m1/extract/extract.mjs`）读
  `corpus/<page>/dom.html` + `nodes.json`，跑**整页 tag 一致性闸门**（`cleanedIndex` 与 dom.html 扫描 tag 序列逐项对齐，
  不一致整页放弃，绝不猜 URL）。
- 本轮新写的两个只读小工具（**不新造判据**）：
  - `.scratch/38-images-sweep/imgattr.mjs`：闸门 + 每个 img 的 `src`（按 `meta.json` origin 绝对化）、
    **最近 `<a href>`**（轮 29 attrib.mjs 的栈式祖先法）、容器 class、bbox、源站 alt。
  - `.scratch/38-images-sweep/match.mjs`：候选图（含 href/alt）与模型条目 `_action.to` 并排打印，供人工归属。
  - `.scratch/38-images-sweep/patch.mjs`：**只在"业务键相等"时插入 `_image`** —— 取候选图最近 `<a href>` 的
    query 键（taobao 用 `id=`），在模型里找 `_action.to` 带**同一个键**的条目，把 `_image` 插在它的 `_action` 之前；
    找不到就 SKIP（不按索引猜）。
- 内容图判据：`bbox` 满足 **`w≥120 ∧ h≥120`**；图标/装饰/角标/广告位跳过并计数。
- 图片一律写**源站 URL**（未发明、未裁切、未合成变体）。取图通道实测：
  `curl -s -o /dev/null https://img.36krcdn.com/...` → `200 image/webp`（无 Referer 也 200），
  `img.alicdn.com` 同样直取成功 ⇒ 本轮**不需要**镜像进 `m1/curated/assets/`（无轮 33 那种 403 防盗链）。

## 1. 普查（只读，42 个策展页）

逐页统计：抓取侧 = `corpus/<page>/nodes.json` 里 `w≥120 ∧ h≥120` 的 img 节点数（内容图候选）；
模型侧 = 该页模型里 `_image` 出现次数。命令：`node .scratch/38-images-sweep/survey.mjs`（`survey_pages=42`）。

| 页 | 抓取候选 | 已挂 | 差值 | 全部 img 节点 |
|---|---|---|---|---|
| huawei-cn/consumer-phones | 78 | 28 | +50 | 124 |
| bilibili-com/home | 51 | 24 | +27 | 53 |
| **36kr-com/home** | 26 | 0 | **+26** | 43 |
| mi-com/home | 38 | 14 | +24 | 51 |
| mi-com/product-detail-mi15 | 23 | 2 | +21 | 40 |
| **taobao-com/home** | 18 | 0 | **+18** | 79 |
| apple-com/iphone-16 | 13 | 0 | +13 | 44 |
| aliyun-com/product-ecs | 12 | 0 | +12 | 54 |
| 36kr-com/information-technology | 10 | 0 | +10 | 27 |
| 36kr-com/search-ai | 10 | 0 | +10 | 25 |
| 36kr-com/search-viz | 10 | 0 | +10 | 25 |
| sspai-com/post-102392 | 9 | 0 | +9 | 18 |
| sspai-com/post-114699 | 9 | 0 | +9 | 38 |
| aliyun-com/home | 24 | 16 | +8 | 241 |
| aws-amazon/ec2-on-demand | 5 | 0 | +5 | 12 |
| stripe-com/pricing | 4 | 0 | +4 | 50 |
| learn-microsoft/vm-sizes | 2 | 0 | +2 | 2 |
| linear-app/home | 1 | 0 | +1 | 35 |
| sspai-com/matrix | 1 | 0 | +1 | 46 |
| stripe-dashboard/login | 1 | 0 | +1 | 1 |
| stripe-docs/payments | 1 | 0 | +1 | 1 |
| bilibili-com/read-home | 0 | 0 | 0 | **38** |
| sspai-com/home | 26 | 26 | 0 | 57 |
| sspai-com/post-114716 | 20 | 20 | 0 | 35 |
| 其余 18 页（gov-uk×2 / github 登录 / xiaomi 登录 / grafana-play / mi 搜索页×3 / huawei 搜索页×2 / sspai u-jtc092al / apple-com/home 等） | — | 见 survey.mjs 输出 | ≤0 | — |

**待补清单（差值 ≥2 且抓取侧 ≥2，按差值降序）= 17 页**：
`huawei-cn/consumer-phones(50)`、`bilibili-com/home(27)`、`36kr-com/home(26)`、`mi-com/home(24)`、
`mi-com/product-detail-mi15(21)`、`taobao-com/home(18)`、`apple-com/iphone-16(13)`、`aliyun-com/product-ecs(12)`、
`36kr-com/information-technology(10)`、`36kr-com/search-ai(10)`、`36kr-com/search-viz(10)`、
`sspai-com/post-102392(9)`、`sspai-com/post-114699(9)`、`aliyun-com/home(8)`、`aws-amazon/ec2-on-demand(5)`、
`stripe-com/pricing(4)`、`learn-microsoft/vm-sizes(2)`。

> 差值口径的诚实说明：`apple-com/home`/`mi-com/search-phone`/`huawei-cn/home` 等已验收页的"抓取候选 > 已挂"
> 是**判据口径**造成的（轮 26b/30 用 `w≥200∧h≥120` 或"条目首个视觉元素"），不是漏图；普查口径（120×120）比
> 历史口径宽。本表只用于**排优先级**。

## 2. 逐页执行记录（每页：改模型 → 落盘报告 → `--shots` → read 局部确认）

### 2.1 `36kr-com/home`（差值 26）· 挂 14 张

- 闸门：`join state=ok tags=1423 imgs=43 aligned=1369/1369`。
- **归属证据（逐条，全部是"业务键相等"，不是索引先后）**：候选图最近 `<a href>` = `/p/<id>`（或
  `/topics/<id>`、`/live/detail/<id>`），模型条目 `_action.to` = `https://36kr.com/p/<同一个 id>`；**并且**源站 `alt`
  逐字 == 该条目 `_name.text`。双证据 14/14 全等。
  - `featured[0..4]`：`/p/3988716815242885`、`…/3988267049155330`、`…/3985907573881609`、`…/3975552848589056`、`…/3974164394438918`
  - `feed[0..5]`：`/p/3984230181010434`、`/p/3988814727773192`、`/p/3988854773545991`、`/p/3988846593161984`、
    `/p/3988842701208581`、`/v-video/3987304230229888`
  - `topics[0..1]`：`/topics/3969183264797184`、`/topics/3969055968064009`
  - `live[0]`：`/live/detail/3933303354408320`
- **未挂（逐类计数）**：12 个候选被跳过 —— 7 张 `adx.36kr.com/api/ad/click` 广告位、1 张 `GPT/Claude` 横幅的**重复**
  抓取（idx 281 与 326 同图）、1 张 `ai.36kr.com` 推广、1 张"36氪股票群"广告、1 张 `/information/qiyehao` 企服号
  横幅（**模型无对应节点**）；另有 **17 个 <120×120 的图标/站标**跳过。
- **`hot`（24小时热榜）故意不挂图**：`_rel.order=sequence` 的榜单，`axis.rankedSequence` 判据是
  「有成员带 `_image` 就不再编号」——给热榜挂图会把 1–8 的位次变没（保真下降）。这是**判据约束**，不是漏图。
- 看图确认（1 张局部图 `.scratch/38-images-sweep/crops/36kr-home-top.png`）：featured 5 张真出图
  （LLMs 演讲者 / 迷你主机 / 笔电上的脑图 / 机械臂 / 手机），feed 6 张真出图。**图片内容与条目对得上**。
- 一处如实记录的观感缺陷（未回滚，理由见下）：`featured` 的 `_name+_action` 形态被引擎判为 **deflist**，
  所以 5 张图落在"标签行右侧值列"里；源站是"大 banner + 2×2 小卡"，本渲染是 5 行同构值列 ⇒ 720×300 的主推图
  显示得比 145×145 的四张**小**，层级被压平。**这不是"同行卡片高度方差过大"**（每行自成一行，无同行对齐问题），
  保真 1.00 + 视觉自查干净，故未回滚；若要更好，需要渲染器的 hero/卡片分组（超出本轮授权）。

### 2.2 `taobao-com/home`（差值 18）· 挂 18 张

- 闸门：`join state=ok tags=1038 imgs=79 aligned=979/979`。
- **归属证据**：每张候选图最近 `<a href>` = `//item.taobao.com/item.htm?id=<商品号>&…`，模型 `_lines[8]._items[i]._action.to`
  带**同一个 `id=`**（脚本按 query 键相等匹配，**18/18 全中，0 SKIP**；不是按 DOM 顺序对位）。
- 自动插入核对（`git diff` 逐条目视）：插入行都紧跟该条目自己的 `_price`、位于**同一条目的 `_action` 之前**，
  例：`id=1073877587540` 的图插在 `¥100.0` 的商品条目里。
- 看图确认（1 张局部图 `.scratch/38-images-sweep/crops/taobao-recommend.png`）：推荐网格卡片真出商品图，且
  **图片内容与条目名对得上**（"四川精制家用食用盐深井盐…" ↔ 久大蓬基井盐 240×1 包包装照；
  "植物妈妈儿童保湿护肤面霜…" ↔ 植物妈妈"1抹爆水"广告图）⇒ **独立验证 id 配对是对的**。
- 未挂：61 个 <120×120 的站标/图标/角标跳过。
- 同行卡片高度方差：18 张全是 **200×200**（源站同尺寸）⇒ 无方差问题。

## 3. 诚实的边界（未做 / 不算缺陷）

- **`bilibili-com/read-home`：不是"有真图没挂"，也不是采集缺口（data-src 懒加载）= 0。**
  实测该页 38 个 img 节点 = **19× 24×24 头像**（`i2.hdslb.com/bfs/face/…`）+ **19× 117×88 缩略图**
  （`bfs/note/…`、`bfs/new_dyn/…`），**全部 `src` 有真 URL、0 个 `data-src` 空 src**。117×88 是**真内容图**但
  **低于 `w≥120 ∧ h≥120` 判据下沿**。故本轮按判据**不挂**，如实记为「判据下沿照片（差 32px 高度）」，不是缺陷也不是缺口；
  是否放宽阈值需要父代理裁定（会牵动既有 20+ 页口径）。
- **`capture_gaps = 0`**：本轮检查的页面里，没有"抓取图为 `data-src` 懒加载且无 `src`"的页（含上面 read-home 的反例核查）。
- `gov-uk`×2 / `github-com/login` / `xiaomi-account/login` / `grafana-play/play-home` / `stripe-dashboard/login` /
  `stripe-docs/payments`：源站文本形态本就无内容图（0 个 img 节点或仅 1×1 占位）⇒ **记"源站无内容图"，不算缺陷**。
- **本轮未完成**（时间到点）：待补清单 17 页里只做完 **2 页**（36kr-com/home、taobao-com/home）。
  未完成 15 页：`huawei-cn/consumer-phones`、`bilibili-com/home`、`mi-com/home`、`mi-com/product-detail-mi15`、
  `apple-com/iphone-16`、`aliyun-com/product-ecs`、36kr 三个子页、`sspai-com/post-102392`、`sspai-com/post-114699`、
  `aliyun-com/home`、`aws-amazon/ec2-on-demand`、`stripe-com/pricing`、`learn-microsoft/vm-sizes`。
  **未完成原因是时间，不是技术障碍**；机制与工具（`imgattr.mjs` / `match.mjs` / `patch.mjs`）已就位，
  36kr 三个子页与 sspai 两篇的归属证据与 36kr-com/home 同型（`/p/<id>` 或文章 id）。

## 4. 收尾门禁（`node m1/eval/pipeline.mjs --shots`，全页）

```
[pipeline] 渲染 42/42 | 错误 0
[pipeline] 保真 1.00: 42/42
[pipeline] Markdown 目标: 渲染 42/42 | 保真 1.00: 42/42
[pipeline] 模型校验: 48 个全通过
[pipeline] 校验器自测: 通过 / 地基自测(D1/D2/D3): 通过 / 度量自测(F-052): 通过
[pipeline] 文本目标自测(F-031): 通过 / 轴一致性自测(F-031 三目标): 通过 / Markdown 目标自测(F-031): 通过
[pipeline] 证据门禁自测(哈希优先): 通过
视觉自查: 42/42 干净
[pipeline] 证据一致性（PNG ⇄ HTML）: 通过（42 页与截图同源, 画廊 v=mup7az6o）
```
八套自测全过；证据一致性通过；无 staged 文件。`--shots` 重生的 `m1/curated/renders/**`（含
`bilibili-com-home.png`、`bilibili-com-video-bv1gj411x7h7.png` 两张**非本轮改动页**的 PNG 也随全量重截而变化，
HTML 字节未变）属任务要求的收尾步骤产物。

## 5. 看图计数（≤8 张硬限）

诊断 0 张 + 自检 2 张（36kr 顶部、taobao 推荐区）= **2 张**，未超限。
