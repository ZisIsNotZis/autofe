# 轮 33 修复报告（证据门禁哈希化 + 剩余无图页补图）

唯一写入者：worker。改动文件（计划）：`m1/eval/pipeline.mjs`、`m1/eval/shots-selftest.mjs`（新增自测）、
`m1/curated/<site>/<page>.json`、`.scratch/33-fix/**`。未改渲染器/axis/corpus；未新增保留键/语法；未 git 提交。

## 1.（P0）证据一致性门禁：哈希优先，mtime 只作提示

- 判定只保留两条：`sha256(当前 HTML) ≠ manifest.pages[dash].html.sha256` ⇒ 失败 `html changed since shots`；
  `sha256(当前 PNG) ≠ manifest.pages[dash].png.sha256` ⇒ 失败 `png changed since shots`（轮 32 的理由串
  `png changed since manifest` 统一改名）。**mtime 不再是任何失败理由**，只在横幅里提示「HTML 比 PNG 新 N 秒」。
- 新增 `m1/eval/shots-selftest.mjs`，在临时目录里构造一页 fixture，**直接跑真实的 `pipeline.mjs --check-shots`**
  （不复制判定逻辑）：① 改 HTML 内容 ⇒ 退出码 1 且点名 `demo-com/page — html changed since shots`；
  ② 用相同字节重写 HTML（`cat` 同内容）并把 mtime 推后 30 秒 ⇒ **退出码 0**（这正是轮 32 会误报的场景）；
  ③ 改 PNG 字节 ⇒ 退出码 1 且理由 `png changed since shots`。已接为 pipeline 的**第 8 道自测门**（原七道不变）。
- 复现旧误报（HEAD 版 `pipeline.mjs` 对同一 fixture）：

```
--- OLD code, byte-identical restore: exit=1
   ✗ demo-com/page — png older than html
--- NEW code, byte-identical restore: exit=0
[pipeline] 证据一致性（PNG ⇄ HTML）: 通过（1 页, 画廊 v=fx）
   · 提示（不判失败）: demo-com/page — HTML 比 PNG 新 30 秒（两向哈希都与清单一致，仅提示）
```

- 真实仓库实证：`cat m1/curated/renders/sspai-com-home.html > 同文件`（字节不变、mtime 比 PNG 新 92 秒）后
  `node m1/eval/pipeline.mjs --check-shots` ⇒ **通过**（sha 前后都是 `69bcc59f397f776b…`），并打印提示行。
- 路径与排除规则（供其它工具参照）：清单落盘在 **`m1/curated/renders/manifest.json`**（与它描述的渲染物同目录）；
  `m1/curated/renders/**` 是生成物而非策展模型，pipeline 的校验门用
  `find m1/curated -maxdepth 2 -name '*.json' -not -path '*/renders/*'` 排除它 —— 但 `m1/curated/<site>/*.json` 会被收进去。

## 2.（P1）剩余无图页补图（4/4 页都有图了，共 49 张）

方法照 `.scratch/26-images/report.md` / 轮 29（**未重新发明**）：`.scratch/26-images/imgmap.mjs`（4 个函数逐字复制自
`m1/extract/extract.mjs`）读 `dom.html`+`nodes.json`，跑**整页 tag 一致性闸门**；内容图判据 = 轮 30 放宽后的
「条目**首个视觉元素**的图片且 `w≥120 且 h≥120`」；图标/装饰跳过并计数；归属用 **DOM 证据**（卡内 `<a href>` 的业务键
/ 源站 alt / bbox y 相邻序），**不猜 URL、不从截图转写文字**。每页做完先落盘再下一页。

| 页 | 闸门 | 候选/新增 | 归属证据 | 跳过 |
|---|---|---|---|---|
| huawei-cn/consumer-phones | `ok tags=2089 imgs=124 resolved=124` | 6 | 5 张 Mate 系列产品图：卡内 `<a href>` 的商品 slug（`mate-xts-ultimate-design` 等）与模型条目名一一对应，且 **URL 路径自带同一 slug**（双证据）；1 张「通信」理由图：源站 `alt` == 条目名 | 118 张（1×1 懒加载 data: 占位 + <120 图标）；**8 张内容图因 CDN 响应 8–60 秒未挂**（见下） |
| mi-com/search-earbuds | `ok tags=790 imgs=85 resolved=85` | 20 | 每张图最近 `<a href>` 的 `product_id` == 模型条目 `_action.to` 的 `product_id`，**20/20 全等且顺序一致**（照轮 29 search-phone 同法） | 65 张（站标/图标/角标）；**「猜你喜欢」10 张 140×140 是 1×1 `data:` 占位**（真 URL 在 `data-src`，而机制只读 `src`）⇒ 未挂 |
| sspai-com/home | `ok tags=641 imgs=57 resolved=57` | 13 | banner 5：`<a href>` slug == `bn-*` 且源站 alt == 条目名；editors 5：`<a href>` == `ed-*` 的 `to`；feed 3：**源站 alt 逐字 == feed 条目 `_title`** | 13 张（右列推广/众测/侧栏 widget/1×1 占位；其中 4 张 499×282 属 `/t/<话题>` 集合图，**无对应模型节点**，不新增节点） |
| sspai-com/post-114716 | `ok tags=821 imgs=35 resolved=35` | 10 | 首图 1 张：源站 alt 逐字 == 文章 `_title`；正文 9 张：**每张条带图的 y 紧跟对应作品标题的 y**（标题 y 1389/2582/3844/5113/6319/7552/8820/10131/11397 → 图 y 1471/2663/3925/5195/6400/7634/8901/10212/11478，逐一同序相邻），与模型 `_lines[2..10]` 九部作品一一对应 | 广告位（398×398 钢化膜）、作者头像（16–40px）、讨论区小图 |

**看图自查（≤8 张，本轮共用 5 张局部图，存 `.scratch/33-fix/crops/`）**：
- `mi-com-search-earbuds-small.png`：3 列 × 20 张耳机商品图全部真出图，型号与条目逐一对上；
- `huawei-cn-consumer-phones-small.png`：Mate 系列 5 张产品图真出图（Mate XTs / Mate XT 2 / X7 / RS / 80 Pro Max 风驰版 / 80 Pro），「为什么选择华为手机」行「通信」出图；
- `sspai-com-home-small.png`：5 张 banner + 5 张编辑部卡 + 3 张内容流图全部真出图，**图片内容与卡片标题对得上**（如 watchOS 27 卡出的是三只手表截图、8 月音乐精选卡出的是现场音乐会照）；
- `sspai-post-top.png` / `sspai-post-strip.png`：首图是本期「本周看什么 260918」大图；`[英剧] 流人 第六季` 出的是 SLOW HORSES 海报（与作品名一致）、`[英剧] 翠鸟谋杀案` 出的是 MARBLE HALL MURDERS 海报 ⇒ **这独立验证了「按 y 相邻序配对」的映射是对的**，不是顺序猜测。

### 2 处如实偏离（不是技术障碍的掩盖）

1. **cdnfile.sspai.com 有防盗链**：无 `Referer` 直接取图 **403**，带 `Referer: https://sspai.com/` 才 200
   （实测：`no-referer: 403 / with-referer: 200`；浏览器里同一 URL `naturalWidth=0`）。直接写源站 URL 会让渲染页
   出现**裂图**，`audit-visual` 的硬门禁 `broken-img` 立刻报警（实测 13 张全挂，见下）。**处置**：把源站真实图
   **按字节镜像**到 `m1/curated/assets/`（仓内既有机制，如 `../assets/airbnb-room-photo-1.png`、`../assets/mi-home-band1.png`），
   模型 `_image.image` 指向本地资产。图仍是源站真实图（未裁切、未改码、未合成变体），只换了取图通道。
   ```
   ⚠ sspai-com-home.html  ... broken-img:2      ← 直接写源站 URL 时的自查结果（硬缺陷）
   · sspai-com-home.html  dup-source-true(info):3 ← 改为本地资产后：干净
   ```
2. **consumer.huawei.com 部分 JPEG 在本环境极慢**（实测 `kv-mate-xt-2-…jpg` 594 KB / 58 s、`design.jpg` 20 s、
   `battery.jpg` 13 s、`camera.jpg` 20 s、`reliable.jpg` 8 s、`ai.jpg` 8 s；而同站 `.png` 是 0.17–0.24 s）。
   写进模型后 `page.goto` 等 `load` 事件 **30 秒超时**，直接打死截图/自查门禁
   （实测：`audit-visual` 在该页 30.6 s 超时 `TimeoutError`）。**处置**：该页只挂**同源、同判据、响应 <1 s** 的 6 张
   （5 张 Mate 产品图 + 1 张「通信」理由图），**8 张慢图未挂并在上表点名**；候选清单与实测耗时留在
   `.scratch/33-fix/rows_huawei-consumer-phones.json` / 本报告。这不是「源站没有图」，是本环境到该 CDN 的链路问题。

### 「字面 N」核实（`sspai-com/post-114716`）——**源站原文如此，保留不编造**

`corpus/sspai-com/post-114716/dom.html` 里源站自己就写着该标题，共 **3 处**：
```
class="post__body__extend__item__title" id="ss-hId-1">👀 N 部作品推荐</h2>
<span class="text">👀 N 部作品推荐</span>
```
⇒ 模型 `_lines[1]._title = "👀 N 部作品推荐"` 与源站逐字一致（源站模板里的占位符没有填数），**保留**，未编造数字。

## 3. 收尾门禁（本轮改动全部在位时跑）

`node m1/eval/pipeline.mjs --shots`（exit 0，51 s）：
```
[pipeline] 渲染 42/42 | 错误 0
[pipeline] 保真 1.00: 42/42
[pipeline] Markdown 目标: 渲染 42/42 | 保真 1.00: 42/42
[pipeline] 模型校验: 48 个全通过
[pipeline] 校验器自测: 通过 / 地基自测(D1/D2/D3): 通过 / 度量自测(F-052): 通过
[pipeline] 文本目标自测(F-031): 通过 / 轴一致性自测(F-031 三目标): 通过 / Markdown 目标自测(F-031): 通过
[pipeline] 证据门禁自测(哈希优先): 通过          ← 本轮新增的第 8 道自测门
视觉自查: 42/42 干净
[pipeline] 截图 42 张, 画廊 v=mup0bhb3
[pipeline] 证据清单 renders/manifest.json 已写（42 页, v=mup0bhb3）
[pipeline] 证据一致性（PNG ⇄ HTML）: 通过（42 页与截图同源, 画廊 v=mup0bhb3）
```

## 4. 纪律

- 改动文件：`m1/eval/pipeline.mjs`（哈希优先判定 + 提示行 + 第 8 道门）、`m1/eval/shots-selftest.mjs`（新增自测）、
  4 个 `m1/curated/<site>/<page>.json`（**纯新增 `_image`**）、`m1/curated/assets/sspai-*.{webp,jpg,png}`（23 个新增资产）、`.scratch/33-fix/**`。
  另 pipeline `--shots` 重生了 `m1/curated/renders/**`、`m1/eval/m3-final.json`、`renders/manifest.json`（收尾门禁的必然产物）。
- **未改**渲染器（`m1/render*.mjs`）、`m1/axis.mjs`、`corpus/**`；未新增保留键/语法；**未 git 提交、无 staged 文件**。
- `git diff` 4 个模型：+199 行、**0 行删除**（`pipeline.mjs` 除外）。

## 未做 / 局限

- huawei-cn/consumer-phones 的 Mate 面板 14 条里只有 5 条有图（源站只给可见的几张真 URL），
  「为什么选择华为手机」7 条里只有 1 条有图 ⇒ 这两组**局部有图**（按「跳过并如实计数」的判据，未用 `data-src` 补，
  因为机制只读 `src`；要用 `data-src` 属扩机制，需批准）。
- 8 张慢 JPEG 未挂（见 §2.2），若父代理要全量，需要在更快的链路上重跑，或批准把慢图也镜像成本地资产。
