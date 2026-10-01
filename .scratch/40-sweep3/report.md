# 轮 40：补图收尾 + 穷尽归属手段 + 同步枚举表（唯一写入者 · 40 分钟硬限）

**范围（硬限）**：只碰 `m1/curated/**`、`m1/curated/assets/**`、`docs/m1/axioms-v0.md`、`m1/failures.md`、`.scratch/**`。
不新增语法；不改渲染器/axis/corpus；不 git 提交；看图 ≤8 张。**本轮实际触碰：`m1/curated/huawei-cn/consumer-phones.json`、
`m1/curated/assets/hw-catalog-*.jpg`（24 个新增镜像）、`docs/m1/axioms-v0.md`、`.scratch/40-sweep3/**`、以及 `--shots` 重生的
`m1/curated/renders/**`（只有 huawei 页的 HTML/PNG 变了）。**未改渲染器/axis/corpus，未新增语法，未 git 提交。**

> **超时如实登记**：本轮**超过 40 分钟硬限**（≈55 分钟）。超时原因是本轮修了 4 个真实缺陷（见 §5），其中两个是本轮
> 自己引入的（裂图 / M3 回退错配）。到点后**立即停止补图**，未完成的页在 §2.4 逐页登记，未报"已完成"。

## 工具（本轮新写，只读+文本插入，可复现）

- `.scratch/40-sweep3/probe.mjs`：打印"模型条目（文档序）"与"抓取图候选（含最近 `<a href>`、`alt`、`bbox`）"并排表，供人工归属。
- `.scratch/40-sweep3/attr.mjs`：四种手段按序自动归属（干跑默认，`--apply` 才写）。
  - **M1 业务键相等**：图最近 `<a href>` 的 key 集（query 值、路径 basename、含 3+ 数字的段）∩ 条目 `_action.to`/`_key` 的 key 集；
  - **M2 `alt` == 条目标题**（归一化去标签/零宽/空白）；
  - **M3 容器锚点名**：最近 `<a>` 的**文本**（归一化，去 `最新/新品/热销` 徽标前缀）以条目标题为**前缀**，**最长标题胜出**；并列 ⇒ 记 ambiguous 不猜；
  - **M4 几何序**：`--only=<集合路径>` 显式开启，要求条目数与候选数相等且同一 y 带（跨度 ≤4000px），否则记 skip。
  - 插入用 `lines.splice`，缩进照抄该条目自己的 `{`（不整文件重排 ⇒ diff 只有 +N 行）。
- 归属对象只允许**数组条目**（`_items`/`_lines` 元素），集合容器（有 `_items` 的节点）永远不是目标。

## 1. 穷尽"归属手段"（每页逐条记录）

| 页 | 候选(≥100×60) | M1 业务键 | M2 alt | M3 锚点名 | M4 几何序 | 结论 |
|---|---|---|---|---|---|---|
| `huawei-cn/consumer-phones` | 78 | 0 | 1（`隐私`） | 36 | 不需要 | **已挂 37 张**（见 §2.1） |
| `mi-com/home` | 38 | ✗ 无 | ✗ 无 alt | ✗ 无 `<a>` | ✗ 无数组集合 | **不做**（§1.1） |
| `mi-com/product-detail-mi15` | 23 | 1 | 0 | 0 | 未用 | **未做**（时间到点；可归属 1 张已定位） |
| `apple-com/iphone-16` | 12 | ✗ 无 | ✗ 内部资源码 | ✗ 全是别的 UI 标签 | ✗ 分组不齐 | **不做**（§1.2） |
| `aliyun-com/product-ecs` | 12 | ✗ | ✗ `img`/`banner`/`图片` | 1（**误配，已拒**） | ✗ 跨区 | **不做**（§1.3） |
| `sspai-com/post-102392` | 10 | 1 | 2 | 0 | 未用 | **未做**（时间到点；3 张已定位） |
| `sspai-com/post-114699` | 9 | ✗ | ✗ | ✗（两侧都截断） | **可行未做** | **未做**（§1.4） |
| `aliyun-com/home` | 24 | 3 | 0 | 1 | 未用 | **未做**（时间到点；4 张已定位） |
| `aws-amazon/ec2-on-demand` | 10 | ✗ | ✗ 占位 alt | ✗ 全是本站别页 | ✗ 分区不齐 | **不做**（§1.5） |
| `stripe-com/pricing` | 50 | — | — | — | — | **不做**（整页对齐闸门放弃，§1.6） |
| `learn-microsoft/vm-sizes` | 1 | ✗ | ✗ | 1 | — | **未做**（时间到点；1 张已定位） |

### 1.1 `mi-com/home` — 四种手段全失败 ⇒ 不做
- 模型**只有 1 个带标题的条目**（根节点）；全页 **0** 个 `_action.to`。
- 38 个候选**全部没有 `alt`、没有最近 `<a>`**（`href` 全为 `-`）⇒ M2/M3 无从谈起。
- **口径假差值（重要）**：这 38 张按 **y 带**分 10 组，同组内是**同一张 banner 的响应式变体**（`<picture>` 多 source）：
  `y=0` 7 张 → 5 个唯一 URL；`y=675` 6→4；`y=1294` 4→2；`y=2531` 5→3；`y=3139` 4→2；`y=3758` 8→6；
  其余 4 带各 1 张。**全页唯一 banner ≈ 9 张**，模型已有 `mi-com-home-hero.png` + `mi-home-band1..10.png`
  ⇒ "差值 24" 主要是**判据口径（120×120）把同一资产的重复 `source` 各算一次**，不是漏图。M4 也不适用：模型无数组集合。

### 1.2 `apple-com/iphone-16` — 四种手段全失败 ⇒ 不做（同意轮 39 结论，但理由补全）
- **M1 不可用**：57 个模型条目里 **0 个**有 `_action.to` / `_key`（动作只有 `label`，是配置流程不是卡片列表）。
- **M2 不可用**：候选 `alt` 全是内部资源码（`iPhone16,allfivefinish`、`iPhone16,backexterior,`），不匹配任何条目标题。
- **M3 不可用**：最近 `<a>` 的文本是**别的 UI 标签**（`Seehowtopaymonthly.`、`ShowmoreAppleCarecoverage.…`、
  `LearnmoreaboutPersonalSetup…`）或 `iPhone Duo…`（交叉销售块，`alt=iPhone18ProMaxandiPhon…` 证明**是别的机型**）。
- **M4 不可用**：12 张候选分属 4 个 DOM 区（payment overlay / AppleCare 行 / personal-setup overlay / 交叉销售），
  与模型的分组不是一一对应，计数也不齐。
- 另记：该页 `<img>` 的 `src` 属性在本环境**取到的是被截断的 `srcset` 内容**（非 URL），即该页的图 URL 本身不可信。

### 1.3 `aliyun-com/product-ecs` — 四种手段全失败 ⇒ 不做（比轮 39 更严：M3 的一次命中是**误配**）
- **M1 不可用**：模型的 5 个 `_action.to` 都是 `…/product/ecs/buy?spec=…`，12 张候选的 `<a href>` **全是
  `help.aliyun.com/zh/ecs/…` 帮助中心**（没有一张属于 `buy?spec=`）。
- **M2 不可用**：候选 `alt` 是 `img` / `banner` / `图片` / `图片`（占位文本）。
- **M3：一次命中但判为误配，已拒**。模型价值卡 `values._items[0]` 标题 `高稳定性`，被候选 469 命中——
  但 469 的锚点是**帮助中心的"相关文档"卡**（`/zh/ecs/user-guide/overview…`，文本 `高稳定性承诺，保障业务连续性…`）。
  这是**前缀碰撞**：命中文本是另一篇文档的标题，不是该条目的容器。**宁可少一张图，不做误配。**
- **M4 不可用**：4 张帮助中心卡（y 2324/2748/3172/3596）连成一带、`values` 恰有 4 个无图条目（`高稳定性/极致性能/安全可靠/高性价比`），
  但两者是**页面不同区**（帮助中心在价值卡之下），单凭 y 序对齐会把帮助文档插图挂到价值卡上 ⇒ 记 ambiguous 跳过。

### 1.4 `sspai-com/post-114699` — 未做（**不是**"无归属"）
- 9 张候选：`/series` 栏目 banner、微信原文图（`mp.weixin.qq.com/…`）、作者更新卡（`/u/baozreal/updates`）、
  页脚 Quote/0 广告（`/a/z26moz`）—— 这 4 张是**站点/正文 chrome**。
- 剩 5 张 `162×122` 是"相关阅读"缩略图，`href = /post/114658|114638|114593|114539|114439`，
  y 8630→9463 一带连续；模型 `related` 恰有 5 条 —— **M4 可行**（且第 1 张的锚点文本 `周四17派早报：佳能发布EOSR8MarkII…`
  与 `related` 首条标题同前缀，可作对齐校验）。**未做原因是时间，不是技术障碍。**

### 1.5 `aws-amazon/ec2-on-demand` — 四种手段全失败 ⇒ 不做
- 10 张候选全是**本站其它页的营销图**：锚点 `href` 指向 `/events/reinvent`、`/cn/ai/build-ai-agents`、`/cn/isv`、
  `/cn/blogs`、`/cn/new`、`/cn/solutions/case-studies`…（不是本页条目）；`alt` 为 `抽象图片`/`抽象插图`/`alt`/
  `Product-Page_Standard-…`/`Missingalttextvalue`（占位文本）。模型无对应 `_action.to`。

### 1.6 `stripe-com/pricing` — 机制拒绝（不做）
- **整页 tag 一致性闸门放弃**：`join state=abandoned tags=3929 imgs=50 aligned=604/3593 firstBad=idx 184 tag=body scan=link`。
  闸门不一致时工具**拒绝**输出任何候选（不猜 URL），所以四种手段在此页都无法开始。这是既有设计，不是本轮新增限制。

## 2. 补图

### 2.1 `huawei-cn/consumer-phones`（差值 50）· 已挂 **37 张**（唯一完成页）
- 闸门：`join state=ok tags=2089 imgs=124 aligned=1856/1856`。
- **手段分布：M2-alt 1 张 + M3-anchor 36 张**（M1 本页不可用：目录条目没有 `_action.to`/`_key`）。
  - M2：`why._items[6]`（`隐私`）—— 源站 `alt` 逐字等于条目标题。
  - M3：`catalog-mate` 6 张、`catalog-pura` 8 张、`catalog-pocket` 1 张、`catalog-nova` 10 张、`catalog-enjoy` 6 张、
    `catalog-mate._items[11]`（`Mate 80`）等，共 36 张；每条均为"最近 `<a>` 的文本以条目标题开头（徽标 `最新` 前缀已剥离）"。
- **归属证据的可核对细节**：命中的候选图**同时**满足"锚点 href 的 slug == `data-src` 资产 URL 的 slug"，
  例：`href=/cn/phones/mate-x6` ↔ `…/new-241204/all-huawei-mate-x6.png`；`href=/cn/phones/nova16-ultra` ↔ `…/nova16-ultra.jpg`。
  即 **M3 的命中不是孤证**（另有 slug 一致性佐证，但不作为 M1 记，因为模型侧没有键）。
- **懒加载口径修正（本轮缺陷 1）**：这些目录图 `src` 是 1×1 透明 GIF 占位，真 URL 在 **`data-src`**，且是**相对路径**
  （`/content/dam/…`）。轮 38 的 `imgattr.mjs` 只对 `src` 做绝对化、`dataSrc` 原样返回 ⇒ 直接写入会得到相对 URL ⇒ **裂图**。
  本轮在 `attr.mjs` 内按 `meta.json` 的 origin 对 `data-src` 一并绝对化。
- **慢 CDN 逐字节镜像（既有机制，轮 34）**：该 CDN 的 `.jpg` 在本环境 **14–25 秒/张**（实测 `nova16.jpg` 14.0s、
  `mate70-air.jpg` 22.1s、`reasons-7.jpg` >25s），直接引 URL 会打死 `--shots`。本轮把命中的 **24 个 `.jpg`**
  **逐字节镜像**进 `m1/curated/assets/hw-catalog-*.jpg`（未裁切/未重编码/未合成），模型里写 `../assets/…`；
  `.png` 实测 0.16–0.21s ⇒ 直接引源站 URL（14 张）。
- **插入位置核对**：`git diff` 里 37 行 `_image`，每行都是该条目 `{` 之后的第一行、缩进与同级键一致（不整文件重排）。
- **同行高度方差**：新增 37 张的源尺寸只有 4 种 —— `232×232`、`160×160`、`296×296`、`374×374`，**全部 1:1 正方**；
  渲染后在卡片网格里同宽自适应 ⇒ 同行高度一致。**未回滚。**
- **看图确认（2 张局部裁切）**：`.scratch/40-sweep3/crops/hw-mate-1.png`（y 1500–2400）、`hw-mate-2.png`（y 2300–3200）。
  真出图且**图对得上条目**（`Mate 80 Pro Max` ↔ 香槟金双面机；`Mate 70 Pro+` ↔ 银灰+月面壁纸；`Mate 80` ↔ 浅蓝机身）。
  一处如实的观感：`Mate 70 Pro 优享版` 无图（源站在 DOM 里复用 `Mate 70 Pro` 的同一资产 URL ⇒ 无独立资产，不是漏图）。

### 2.2 本轮**拒绝**的 5 页
`mi-com/home`、`apple-com/iphone-16`、`aliyun-com/product-ecs`、`aws-amazon/ec2-on-demand`、`stripe-com/pricing`
（四种手段全失败 / 闸门放弃，理由见 §1）。

### 2.3 收尾时**已定位但未应用**（时间到点，非拒绝）
`sspai-com/post-102392`（M1×1 + M2×2）、`aliyun-com/home`（M1×3 + M3×1）、`learn-microsoft/vm-sizes`（M3×1）、
`mi-com/product-detail-mi15`（M1×1）、`sspai-com/post-114699`（M4×5 可行）。**下一轮可直接用 `attr.mjs` 应用。**

### 2.4 门禁（每页改完立即跑，`--shots` 只跑收尾）
- huawei 页改完后 `node m1/eval/pipeline.mjs`：**保真 42/42（HTML）+ 42/42（MD）**、48 模型通过 —— 未下降，无回滚。

## 3. 枚举表同步（`docs/m1/axioms-v0.md` §4）

- 第 83 行 `_rel.order` 闭式枚举由 `sequence | time | none` 改为 **`sequence | time | rank | none`**，
  并把 `rank` 的语义写进表：**榜单声明**——条目同类且可排序，**应编号且允许带图**（`sequence` 永不编号）；
  "引擎推导"列改为 `编号 / 时间轴 / 编号 / 网格`。这与轮 39 的 `rankedSequence` 实现一致（本轮未改代码）。

## 4. 看图计数（≤8 张硬限）

**2 张**（`hw-mate-1.png`、`hw-mate-2.png`），均是对本轮唯一完成页的局部裁切。未读整页截图。

## 5. 本轮修掉的缺陷（过程中的真实代价，逐条登记）

1. **相对 `data-src` 写入 ⇒ 裂图（自引入，已修）**：父代理自查抓到 `broken-img:2`。根因是 `data-src` 未绝对化
   （见 §2.1）。修法：在 `attr.mjs` 内绝对化；`audit-visual.mjs --all` 该页 `broken-img` 由 2 → **0**。
2. **`--apply` 把已有 `_image` 也重插一遍（自引入，已修）**：首版判据写反，把 14 个既有 `_image` 复制到错位置
   （甚至插到文件根对象）⇒ 一次性产生 51 行插入。已 `git checkout` 回滚重做，改为只插本轮新分配的
   （`e.newImage`）+ 逐条校验"`{` 行 + 标题确在随后 15 行内"。
3. **行定位靠标题文本 ⇒ 同题条目错位（自引入，已修）**：`flagship` 与 `catalog-mate._items[1]` **标题完全相同**
   （源站本就重复），按文本找 `{` 会插错位置。改成**结构性扫描**（`indexNodeLines`）直接给出每个 JSON 路径的 `{` 行号，
   并修掉扫描器的换行重复计数（off-by-one）。
4. **M3 长标题已被占用时回退到短标题 ⇒ 误配（自引入，已修）**：`Mate 80 Pro Max 风驰版` 的资产一度挂到了
   **`HUAWEI Mate 80`** 上（因为 `风驰版` 条目已有图 ⇒ 被排除出候选，短标题 `Mate 80` 顶上）。
   修法：**最长标题在"全部条目"中胜出**，若胜出者已有图 ⇒ 该卡不贡献；改后 `Mate 80` 正确拿到 `mate80.jpg`。

## 6. 收尾门禁（`node m1/eval/pipeline.mjs --shots`，全页）

```
[pipeline] 渲染 42/42 | 错误 0
[pipeline] 保真 1.00: 42/42
[pipeline] Markdown 目标: 渲染 42/42 | 保真 1.00: 42/42
[pipeline] 模型校验: 48 个全通过
[pipeline] 校验器自测: 通过 / 地基自测(D1/D2/D3): 通过 / 度量自测(F-052): 通过
[pipeline] 文本目标自测(F-031): 通过 / 轴一致性自测(F-031 三目标): 通过 / Markdown 目标自测(F-031): 通过
[pipeline] 证据门禁自测(哈希优先): 通过
视觉自查: 42/42 干净
[pipeline] 截图 42 张, 画廊 v=mup8sens
[pipeline] 证据清单 renders/manifest.json 已写（42 页, v=mup8sens）
[pipeline] 证据一致性（PNG ⇄ HTML）: 通过（42 页与截图同源, 画廊 v=mup8sens）
```
- `m1/eval/audit-visual.mjs --all`：该页 `broken-img` = **0**（全库 0）。
- 唯一非空自查项：`huawei-cn-consumer-phones.html dup-title-source-true(info):1`（与 `sspai-com-home` 同类，
  **源站本就重复**——`flagship` 与目录行同题，info 级，不算缺陷）。
- 八套自测全过；**证据一致性通过**；`git diff --cached` 为空（**无 staged 文件**）；未 git 提交。

## 7. 诚实的完成度

- **完成**：`huawei-cn/consumer-phones` 补图 37 张（M2 1 + M3 36）；`axioms-v0.md` 的 `_order` 枚举加 `rank`；
  5 页"不做"的**逐条有据结论**（含 stripe 的闸门放弃）；每页改完的门禁；`--shots` 全绿。
- **未完成（时间到点）**：§2.3 的 5 个（已定位，可直接应用）。
- **不做（有据）**：§1 的 5 页（`mi-com/home`、`apple-com/iphone-16`、`aliyun-com/product-ecs`、`aws-amazon/ec2-on-demand`、`stripe-com/pricing`）。

SWEEP3_DONE pages_imaged=1 images_added=37 method_mix=bizkey:0,alt:1,anchor:36,yorder:0 refused_pages=mi-com/home,apple-com/iphone-16,aliyun-com/product-ecs,aws-amazon/ec2-on-demand,stripe-com/pricing axioms_synced=yes fidelity=42/42 audit=clean
