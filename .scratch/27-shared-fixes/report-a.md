# 轮 27a · 共享渲染缺陷修复（动作主次/并排 + 图片画框 + 空盒）

## 片 0 · 先测量（不拍脑袋）

命令：`git log --oneline -3`（HEAD = `ccf09f2`）、逐页 `node m1/render.mjs …`、
playwright 量测 `naturalWidth/Height` + `getBoundingClientRect`。

### 1. 主次信号：**模型里没有"谁是主 CTA"的标记**（结论：`primary_rule=defined`）

- 全库扫 `>1` 个动作的节点：**108 个**。规则面（`_action.verb`）闭式词表：
  内置 `navigate open submit select toggle operate` + 领域 `buy preorder add-to-cart compare follow share configure`。
- 实测 miss 的这处（`apple-com/home.json`，`_lines[0] iphone-18-pro`）：

```jsonc
{ "_title": {"text":"iPhone 18 Pro"}, "_image": {...},
  "_action": { "verb": "open", "label": "Learn more", "to": ".../iphone-18-pro/" },   // 元素自身的动作
  "buy":     { "_title": {"text":"Buy"}, "_action": { "verb":"buy","label":"Buy","to":".../buy_iphone/iphone_18_pro" } } }
```

  - 条目自身的 `_action` = `Learn more`（`open`，跳产品页）= **元素自己的链接**（axioms §6 F-020："卡片自己的动作是查看详情"）；
  - 子节点 `buy` 的 `_action` = `Buy`（`buy`）= **元素内部的按钮**（axioms §6 例子原文：`"buy": {"_intent":"买是另一个故事", …}`）。
- 也就是说：**模型有的不是"主/次"标记，而是"两个元素"**；主次是**渲染强调规则**要补的那一层。当前渲染恰好把它读反了：
  - 自身的 `_action` 走 `renderAction()` → `.action`（**黑色实心**）；
  - 子控件走"只有标题且标题就是控件"分支 → `.controls > .ctl`（**浅色小胶囊**）；
  - 两者还分别落在 `namedChildren` 段与文章末尾 ⇒ **竖着两行**。
- 因此定一条**最小语义规则**（写进 `docs/m1/layout-axes.md §4.1`，是渲染强调规则、不是语法变更）：
  1. 同一元素（节点）的全部控件渲染为**一行**：自身 `_action` + 内部控件子节点（`_action`-only 子节点、以及"标题即自身控件且无其它内容"的子节点）；
  2. **主 CTA** = 该行中**第一个承诺型动词**（`buy`/`preorder`/`add-to-cart`/`submit`）⇒ 实心（`.action`）；
  3. 否则 = **元素自身的 `_action`**（元素自己就是那个动作）⇒ 实心；
  4. 否则 = **该行第一个**；其余一律次要（描边 `.ctl`）。
- 实测该规则只改这一处强调：`apple-com/home` 三个 hero 的 `Buy` 变实心、`Learn more` 变描边（源站即如此）；其余页面自身的动作本来就是唯一动作 ⇒ 仍是实心，与现状一致。

### 2. 图片画框：两处真实缺陷（结论：`image_fill=yes`）

playwright 量测全部 42 页渲染（`naturalWidth/Height` vs `clientWidth/Height`）：

- **CROP（擦除内容）** `.cards .item img{height:150px;object-fit:cover}`：`aliyun-com-home` 6 张 +
  `apple-com-home` 16 张（6 个 tile 1262×580 + 10 个 Apple TV 1250×668 被压成 318×150，两侧裁掉）。
- **NARROW（小、四周留白）**：`bilibili-com-home` 的横幅 `516×290` 放在 **1060** 宽容器里 ⇒ 就是用户说的
  "小、居中、四周大片灰底"。`apple-com/home` 三张 hero 实测 3008×580 → 1060×204，**本来就是铺满的**（`width:100%` + 比例一致），
  所以那条观感来自 NARROW 页与 150px 卡片图，不是 hero 本身；本轮按同一规则统一修两处。
- **未改**：`.defval` 里的行内缩略图（apple 服务区 470×264 缩略图挨着按钮，不是内容主视觉），报告里说明。

### 3. 空 promo 盒：全库只有 8 个，**全部**是"集合成员只有标题"（结论：`empty_promo=fixed`）

临时探针（`.scratch/27-shared-fixes/probe-render.mjs`，收尾删除）统计 `bareTitle` 命中：

```
up-display "Bigger, brighter Liquid Retina display."   img=false   macbook-air
up-ai      "Fly through demanding AI tasks up to 9.5x..."  img=false   macbook-air
up-camera  "12MP Center Stage camera with Desk View."  img=false   macbook-air
cont-calls "Answer calls and texts"                    img=false   macbook-air
size-p3    "P3 wide color"                             img=false   ipad-air
size-13    "13” model"                                 img=false   ipad-air
hl-chip    "A19 芯片"                                   img=false   apple-com-cn/iphone-17
hl-ai      "Apple 智能"                                 img=false   apple-com-cn/iphone-17
```

- 8/8 是 `_lines`/`_items` 的**普通成员**（名字就是它的内容，只是没有 `_detail`），**没有一个是带图的广告位**。
- 规则：`bareTitle` 分支只在**源站有图**时成立（T-106 广告位）；没有图 = 不是广告位 ⇒ 按普通文本渲染（标题即内容），**绝不渲染成空盒子**。

## 片 1 · 实现（唯一写入者，只碰 render.mjs / axis.mjs / docs / failures / .scratch）

| 文件 | 改动 |
|---|---|
| `m1/axis.mjs` | 新增共享决策 `COMMIT_VERBS` / `isInnerControlChild()` / `actionRowOf()`；`nodePlan()` 输出 **`actionRow`**（一行控件 + `primary` 标记 + `verb`）与 **`rowConsumed`**（被该行吃掉的子节点） |
| `m1/render.mjs` | ① `renderActionRow()` 画这一行（主 CTA = `.action` 实心 / 其余 `.ctl` 描边）；移除 HTML 私有的 `.toolbar` 分支（改由 `actionRow` 统一）② `bareTitle` 仅在源站有图时成立 ③ 图片 CSS：`.cards/.run/.fact img{width:100%;height:auto}`，删除 `height:150px;object-fit:cover`；删除死 CSS `.toolbar/.tool/.promo-label` |
| `docs/m1/layout-axes.md` | 新增 §4.1（动作成一行 + 主 CTA 规则，含"为什么不是自身动作一律为主"的实测论据）、§5.1（空 promo 盒）、§7.1（图片铺满/不裁剪） |
| `m1/failures.md` | F-058（主次颠倒 + 多动作竖排）、F-059（图片被 cover 裁剪/小图不铺满）、F-060（空 promo 盒） |

## 片 2 · 逐页行为变化（与 `HEAD` = `ccf09f2` 对比）

- **`<style>` 全 42 页都变**（图片规则 + `.controls` 规则）：图片铺满/不限高是样式面改动，正文不变。
- **正文变**：**23 页**，全部可归因到"动作行"或"空 promo 盒"两条规则：

  | 类别 | 页面 |
  |---|---|
  | 空 promo 盒 → 正常条目（**3 页 8 处**） | `apple-com/ipad-air`(2)、`apple-com/macbook-air`(4)、`apple-com-cn/iphone-17`(2) |
  | 动作成一行 / 主次重排（**23 页**，与上表有重叠） | `apple-com/home`、`apple-com/iphone-16`、`aliyun-com/home`、`airbnb-com/room-28871`、`bilibili-com/video-*`、`github-com/login`、`huawei-cn/consumer-phones`、`huawei-cn/search-laptop`、`huawei-cn/search-phone`、`linear-app/home`、`mi-com/product-detail-mi15`、`mi-com/search-earbuds`、`mi-com/search-phone`、`sspai-com/home`、`sspai-com/matrix`、`sspai-com/post-114699`、`stripe-dashboard/login`、`xiaomi-account/login`、`36kr-com/search-ai`、`36kr-com/search-viz` |
  | **图片铺满（正文不变、样式变）** | `bilibili-com/home`（516×290 横幅 → 1060 宽）、`aliyun-com/home` + `apple-com/home`（16:9/1262×580 图不再被裁成 318×150）等所有带图页 |

- 典型 diff（`apple-com/home` hero 1）：`<section class="group g-buy"><div class="controls"><a class="ctl">Buy</a></div></section>…<a class="action verb-open">Learn more</a>`
  ⇒ **`<div class="controls"><a class="ctl">Learn more</a><a class="action verb-buy">Buy</a></div>`**（一行、Buy 实心）。

## 片 3 · 看图自查（4 张，≤6）

1. `apple-com/home` 顶部动作区：**`Learn more`（描边）+ `Buy`（实心）同一行** ✓，源站语义一致；
2. `apple-com/home` 图片区：三张 hero 均 1060 宽铺满、按自身比例（无灰底留白、无下方死白）；
   ⚠ 第二张 iPhone Duo 电话本体仍然"小、居中、大片浅灰"——**实测那 3008×580 图本身就是这样构图的**（图像内容，非排版留白），引擎已按容器宽铺满；
   `bilibili-com/home` 才是真正的"小图不铺满"（516→1060 已修）。
3. `stripe-com/pricing` 页尾多动作：`立即开始` 实心主 CTA（行内唯一），条目动作 `了解更多`/`阅读文档` 为描边 ✓；
4. `apple-com/ipad-air`：`13” model` / `P3 wide color` 由灰盒变为正常小标题条目 ✓。

## 片 4 · 收尾门禁

`node m1/eval/pipeline.mjs --shots`：**HTML 保真 42/42 = 1.00** · **MD 42/42 = 1.00** · **模型 48 全通过** ·
七套自测（校验器 / 地基 D1-D3 / 度量 F-052 / 文本 F-031 / 轴一致性 F-031 / Markdown F-031）全过 ·
**视觉自查 42/42 干净**（唯一输出是 1 条 `dup-source-true(info)`）· 截图 42 张 + 画廊重建。
图片复测：42 页 **0 张被裁、0 张未铺满**。

## 残余风险 / 未做

- **无承诺动词时的主 CTA 归属**：`apple-com/home` iPhone Duo 行是 `Learn more`(open) + `View pricing`(open)，
  两者都是导航动词 ⇒ 按规则主 = 元素自身（`Learn more` 实心）。若人审认为应轮到 `View pricing`，需要模型给出信号
  （新保留键属语法变更，本轮明确不做）——**记在此处，不改规则**。
- **`.defval` 行内缩略图**保持自身宽度（图 + 控件成一行），未铺满容器：这是行内小图，不是区块主视觉。
- `render-text.mjs` / `render-md.mjs` 仍把动作分组画成自己的一行（`plan.toolbar` 未动）：本轮是 HTML 呈现规则修复，
  共享决策已在 `axis.mjs`（`actionRow`），另两个目标是否跟进属下一轮范围。
