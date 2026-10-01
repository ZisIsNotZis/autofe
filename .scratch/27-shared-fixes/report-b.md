# 轮 27b · 共享渲染缺陷修复（动作行三目标共享 / chip / 空框 / 搜索框 / 标题层级）

## 片 0 · 先测量（不拍脑袋）

`HEAD` 仍是 `ccf09f2`；逐页 `node m1/render.mjs|render-text.mjs|render-md.mjs`，比对 before/after
（`.scratch/27-shared-fixes/{before,after}/`）。

1. **动作行只有 HTML 消费**（实测）：`grep -n actionRow m1/render*.mjs` ⇒ `render.mjs` 有 `plan.actionRow`，
   `render-text.mjs`/`render-md.mjs` **0 次**。两目标各自分组：
   - 自身 `_action` 单独一处（`actionText`）；
   - `plan.toolbar` 只在 `length >= 2` 时另起一行 ⇒ **单个 toolbar 子控件被丢弃**；
   - "标题即自身控件"的子节点按普通子节点渲染（`[title]`）⇒ 与自身动作**分成两处**。
   证据：`apple-com/home` 文本目标改前 `[Learn more]` 与 `[Buy]` 分处两行/两段；`36kr/search-ai` 的
   `[站内搜索]` 改前缩进 depth 2（子节点），改后与输入框同属一行。
2. **chip 无视觉样式**（实测 HTML）：`.chip-item{display:block;padding:4px 0}` 只有间距，**无背景/边框/圆角**。
   `stripe-com/pricing` 得到 `<div class="chips"><span class="chip-item">IC+ 定价</span>…`（连成一串裸文字）；
   `aliyun-com/home` 6 个 ISO/PCI 认证同理。
3. **容器比内容宽 ⇒ 空框**（实测 HTML）：`fieldset.expose.chipbar` 是**块级** ⇒ 铺满 1100 宽；
   `apple-com/ipad-air` 5 个单选组、`36kr` search-type/sort 两行、`huawei` `类别` 都是"外框很宽、内容只剩左侧"。
4. **搜索框**（实测 HTML）：
   - 标签走 `<span class="deflabel">请输入关键词</span>` **外置**，不是 placeholder；
   - `.expose{display:block}` ⇒ 输入框独占一整行，提交控件（`<span class="action-plain">站内搜索</span>`）
     另起一行；`bilibili-com/home` 搜索框标签「磊哥游戏」外置。
5. **标题层级**（实测）：
   - `36kr-com/{home,information-technology,search-ai,search-viz}` `_intent` 都已注明"无可见标题 ⇒ 取文档 `<title>`"（合规）；
   - `mi-com/home` 用文档 `<title>` 但 `_intent` **未注明来源**（不合规——须补记）；
   - `mi-com/shop-category-list` 用文档 `<title>`「全部商品分类-小米商城」，而 `nodes.json` 里
     **「全部商品分类」是可见文本** ⇒ 应按既有裁定用可见文本；
   - `linear-app/home` 的 `_summary`（一句导语）被 `_primary` + `.hero.fact-hero` 按 **2em** 渲染 ⇒ H1 字号塌到导语。

## 片 1 · 实现（唯一写入者）

| 文件 | 改动 |
|---|---|
| `m1/axis.mjs` | `choicePlan` 输入类型新增共享判定 **`labelAsPlaceholder`**（`text`/未声明类型且有名 ⇒ 标签作水印）；`nodePlan` **移除 `toolbar` 字段**（内部仍由 `actionRowOf` 用，外部统一从 `actionRow` 取） |
| `m1/render-text.mjs` | 新增 `actionRowText(row)`：**一行并列**，多控件行的共享主 CTA 前缀 `*`；`renderNode` 改为消费 `plan.actionRow` + `rowConsumed`，删除私有 toolbar/自身动作分支；标题即控件时**不再吞掉**其余控件（`titleIsControl` 的行照画） |
| `m1/render-md.mjs` | 新增 `actionRowMd(row)`：同一行内联链接，多控件行的主 CTA 加粗；同样消费 `plan.actionRow` + `rowConsumed`、同样保留 titleIsControl 后的行 |
| `m1/render.mjs` | CSS：`.chips .chip-item` 加背景/边框/圆角/内边距（`.chips-rows .chip-item` 仍为纯文字行）；`fieldset.expose.chipbar{display:inline-block;max-width:100%}` 按内容收缩；`span.expose.expose-input` 行内化使提交控件与输入框同栏；`.hero.fact-hero.hero-prose .val` 把**长句导语**从 2em 降为 1.15em；输入 `labelAsPlaceholder` ⇒ 输出 `placeholder`（不再外置 `deflabel`）；删 `plan.toolbar` 过时注释 |
| `m1/eval/axis-selftest.mjs` | 新增 A4（三目标都消费 `plan.actionRow`、无私有 `actionKids/actionRowOf/plan.toolbar`）与 H0–H5（构造模型 + 全库 68 个多控件行的**分组与主次**三目标一致） |
| `m1/curated/mi-com/home.json` | `_intent` 补记 H1 来源（无可见标题 ⇒ 文档 `<title>`） |
| `m1/curated/mi-com/shop-category-list.json` | `_title` 改用可见文本「全部商品分类」；`_intent` 记明来源与修正 |
| `docs/m1/layout-axes.md` | §4.2 动作行三目标共享 / §5.2 容器按内容收缩 / §6.1 搜索框水印与提交控件 / §5.3 标题来源与导语字号 |
| `m1/failures.md` | F-061 actionRow 只有 HTML 消费；F-062 chip 无样式；F-063 块级 chipbar 空框；F-064 搜索框标签外置/提交控件另起一行；F-065 导语按 H1 字号 |

## 片 2 · 逐页行为变化（与 `HEAD` = `ccf09f2` 对比）

- **text/MD 目标**：所有"一节点多动作"的页面（17 页 68 行，H4/H5 计数）动作分组与主次与 HTML 对齐；
  受影响代表：`apple-com/home`（`[Learn more] *[Buy]`）、`apple-com-cn/iphone-17`、`bilibili-com/video-*`、
  `36kr-com/search-*`、`huawei-cn/search-*`、`stripe-com/pricing`、`mi-com/search-*` 等。
- **HTML**：`.chip-item` 全部变胶囊；`chipbar` fieldset 收缩；搜索框变 `placeholder` + 同栏提交控件；
  `linear-app/home` 导语降字号；`mi-com/shop-category-list` H1 改「全部商品分类」。

## 片 3 · 证伪（F-040，必做一次）

临时在 `render-md.mjs` 里加私有 `actionKids`（只保留行内第一个控件）⇒
`node m1/eval/axis-selftest.mjs` 报 3 条 FAIL：
`render-md.mjs keeps no private action grouping`、`H3 … primary bold once — line=null`、
`H5 … 17 pages mismatched`；撤销后恢复 **全部通过（86 条断言）**。

## 片 4 · 收尾门禁（已运行）

`node m1/eval/pipeline.mjs --shots`：

- HTML 保真 **42/42 = 1.00**；Markdown 目标 **42/42 = 1.00**；模型校验 **48 个全通过**；
- 七套自测全过：校验器 / 地基 D1-D3 / 度量 F-052 / 文本 F-031 / 轴一致性 **F-031 三目标（86 条断言）** / Markdown F-031；
- 视觉自查 **42/42 干净**（唯一输出 1 条 `dup-source-true(info)`）；截图 42 张 + 画廊重建。

**一处必要修正（保真回退后的补正）**：最初只把标签写成 `placeholder`（不再外置 `deflabel`）⇒ HTML 保真掉到 30/42
（`_label` 不再是可见文本，度量口径 `pageText` 不看属性）。改为 **水印 + 屏幕阅读器标签**：`placeholder` 保留，
同时输出 `<span class="deflabel sr-only">`（视觉隐藏、文档里保留名称）⇒ 保真回到 42/42，且比"只有 placeholder"
更符合可访问性（placeholder 不能单独充当 label）。`_label` 事实未丢、未改度量口径（未碰 `metrics.mjs`，超出本轮文件范围）。

## 片 5 · 看图自查（6 张）

- `aliyun-com/home`：6 个 ISO/PCI 认证成为可辨胶囊，且**换行成两行**（长列表不挤成一行）✓；
- `stripe-com/pricing`：`IC+ 定价 / 交易量折扣 / …` 成为胶囊 ✓；
- `apple-com/ipad-air`：单选组 fieldset 由满宽（1060）**收缩到 662**，右侧不再空一大片 ✓；
- `36kr-com/search-ai`：H1 可见；输入框水印 + `站内搜索` 提交控件同栏 ✓；
- `huawei-cn/search-laptop`：`类别` chipbar 缩到 864，不再满宽空右半 ✓；
- `linear-app/home`：H1 仍是最大字号，导语降为可读导语（不再 H1 字号）✓；`Get started` 实心 + `Contact sales` 描边同一行 ✓。

## 残余风险 / 未做

- **对比表实体的多控件**：`_rel.compare` 实体在三个目标里都按表头单元渲染（每个实体只取其自身动作一枚
  `ctl`），**不**画实体的 `actionRow`。这是对比表既有形态（不属于本轮三目标分组缺陷），本轮未改；
  `apple-com-cn/iphone-17` 的 iPhone Air 行即此类。H4/H5 计数已显式排除对比表实体，避免把该既有形态误判为分组不一致。
- **chip 长列表换行**由 `.chips{flex-wrap:wrap}` 保证；本轮只加视觉样式，未改分组。
