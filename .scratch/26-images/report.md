# 轮 26b：apple-com/home 图片回挂（worker，唯一写入者）

**范围（硬限）**：只做 `apple-com/home`，时间允许再 `apple-com/ipad-air`。其它页一律不碰。

## 方法（复用现成机制，未新造分析）
- 复用 `m1/extract/extract.mjs` 的图片解析（轮 16 实现）：`.scratch/26-images/imgmap.mjs` 原样复制
  了它的 4 个函数（`scanElementTags` / `decodeAttrEntities` / `absolutizeSrc` / `joinImageSrcs`），
  以复用**整页 tag 一致性闸门**：`cleanedIndex` 与 `dom.html` 扫描出的 tag 序列必须逐项对齐，
  否则整页放弃（绝不猜 URL）。
- **闸门结果**：`join state=ok tags=1749 imgs=31 resolved=31 unattributed=0` ⇒ 31/31 张 `<img>` 的 src
  都拿到了绝对 URL（F-025：`meta.json` 的 `origin` 绝对化）。
- **内容图判据**：`corpus/apple-com/home/nodes.json` 的 `bbox`，只取 `w ≥ 200 且 h ≥ 120` ⇒ 24 张
  （跳过 7 张 16–64px 图标/装饰、以及 3 张 `bbox=1×1` 的懒加载占位）。
- **归属判据**：不靠猜 `cleanedIndex` 的先后。先按 `bbox.y/x` + 图片 asset 路径里的产品名对齐，
  再对轮播类用**锚点可访问名**（`li[i]/a[0]` 的 `name`）反查条目名。

## 取了几张、挂在哪个节点
### 1. 三条满幅 Hero（整宽区块只剩文字 + 大片空白的主因）
| 节点 | cleanedIndex | src 路径含产品名 = 交叉证据 |
|---|---|---|
| `_lines[0]` iphone-18-pro | 1013 | `.../iphone-18-pro/a/hero_iphone_18_pro__...` ✓ |
| `_lines[1]` iphone-duo | 1031 | `.../iphone-duo/a/hero_iphone_duo_announce__...` ✓ |
| `_lines[2]` watch-series-12 | 1058 | `.../apple-watch-series-12/a/hero_apple_watch_series_12__...` ✓ |
（三张都在 `main/section[1]` 的 div0/1/2，与三条故事线文档顺序一致；`_image` 在 depth 0 = 满幅 hero。）

### 2. 六张产品磁贴 `_lines[3]._items[i]`
`main/section[2]/div[0..5]` 文档顺序 = 模型 `_items` 顺序，且 **URL 路径自带产品名**，6/6 完全对上：
tile-watch-ultra-4(1076)、tile-airpods-5(1089)、tile-upgrade(1106,`apple-upgrade`)、
tile-carrier-deals(1119,`carriers`)、tile-macbook-air(1132,`macbook-air-m5`)、tile-apple-card(1149,`apple-card`)。

### 3. 娱乐轮播 `_lines[4].tv._items[0..8]`（9 张）
**注意：DOM 顺序 ≠ 模型顺序**（模型里 `tv-friday-baseball` 排在第 5）。用锚点可访问名逐个对回：
li0 Friday Night Baseball(1195)→index4、li1 Slow Horses(1205)→0、li2 Formula 1(1216)→1、
li3 Ted Lasso(1226)→2、li4 MLS(1237)→3、li5 Mayday(1247)→5、li6 Widow's Bay(1258)→6、
li7 Dark Matter(1269)→7、li8 Last Seen(1280)→8。

### 4. 服务轮播 `_lines[4].services._items[*]`（6 张，源站 9 条中 3 条 bbox=1×1 未渲染）
`main/section[3]/div[0]/div[3]/ul[0]` 文档顺序与模型顺序一致；6 张里有一张 URL 带
`HI_BW_0217_artwork_...`（HIIT with Bakari 的 Fitness 课程封面）⇒ 与 svc-hiit 目的地
`fitness.apple.com/us/workout/hiit-with-bakari/...` 对上，佐证索引映射正确。
挂：svc-hello-kitty(1307)、svc-david-bowie(1321)、svc-powerwash(1349)、svc-hiit(1363)、
svc-balatro(1391)、svc-programs(1405)。**未挂**的 svc-sabrina / svc-a-list-pop / svc-new-music-daily
三张 `bbox=1×1`（源站未渲染），按判据跳过 —— 如实记为不完整。

## 结果（apple-com/home）
- 新增 `_image` 事实 **24 个**（模型内 `_image` 计数 0 → 24）；全部是**源站 URL**，无截图裁切、无发明 URL。
- 渲染截图自查（读图 4 张）：hero 三张真出图；6 张磁贴出图；**娱乐轮播 9 张海报出图，且海报上的片名与条目名逐一对上**
  （SLOW HORSES / F1 / TED LASSO / MLS / Friday Night Baseball / MAYDAY / Widow's Bay / DARK MATTER / LAST SEEN）
  ⇒ 这同时**独立验证了"按锚点可访问名回挂"的映射是对的**，不是顺序猜测。
- 门禁：`node m1/eval/pipeline.mjs` → 渲染 42/42、**HTML 保真 42/42 (1.00)**、**Markdown 保真 42/42 (1.00)**、
  模型校验 48 全通过、七套自测全通过、**视觉自查 42/42 干净**。
- `git diff`：纯新增 `_image` 键，无一处删事实、无语法新增、无 git 提交、无 staged 文件。

## 未做 / 跳过（如实）
- `apple-com/ipad-air`：**未做**，30 分钟硬限到点（先把 `home` 做完做实）。原因=时间，不是技术障碍。
- `services` 轮播只挂了 **6/9**：`svc-sabrina` / `svc-a-list-pop` / `svc-new-music-daily` 三张
  源站里 `bbox=1×1`（未渲染），按"w≥200 且 h≥120"判据跳过 —— 页面该行仍只有文字。
- 首页剩余 7 张 `<200×120` 的图标/装饰未挂（按判据，本就不该挂）。
