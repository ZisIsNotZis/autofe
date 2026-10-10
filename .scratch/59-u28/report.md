# 轮 59 · U-28 孤儿事实修复 + 第 17 道门禁"容器水平界内"断言

## 1. U-28：`12 mo.` 孤儿块并入价格行（axis 层规则，零模型改动）

- **缺陷**：ipad-air 根节点的分期时长 `_duration:{num:12,unit:'mo.'}` 被归为 meta 类，渲染成独立 `<div class="meta">12 mo.</div>` 块，落在容器左界外（x≈18px）。
- **规则（非特例，同族全适用）**：`m1/axis.mjs` nodePlan 新增 `installmentCarrierOf` —— 当 `_duration` 是 `{num, unit∈(mo./months/期/月)}` 形态，且**同节点**存在价格行（可见 `_price`/`_amount` 事实，或提到 `/mo.`、`/月`、月供、每月、分期、Lease、Installment 的 `_summary`/`_text`/`_detail`），时长改为 `category:'installment'` + `attachTo:<承载事实>`，不再单独成块；各目标把画进承载行**同一行**。bilibili 视频时长 `{text:'03:33'}`（无 num/unit）与无价格行的时长保持 meta 原状。
- **命中面（全库仅此 3 处同类）**：apple-com/ipad-air `12 mo.`、apple-com/macbook-air `12 mo.`、apple-com-cn/iphone-17 `24 期`（源站原句本就同行：`…or $62.41/mo. for 12 mo. Lease…`、`RMB 284/月 (24 期) 起`）。
- **呈现**：HTML 行内 `<span class="installment"><span class="sep">·</span> 12 mo.</span>`（弱化如 meta）；text/md 接在承载行行尾。三个目标同一 axis 决策、各自形态。

## 2. 第 17 道门禁：容器水平界内断言（可失败）

`m1/eval/layout-selftest.mjs` 新增 e 组 + 3 条负例。**口径（静态 HTML 近似，无浏览器布局）**：
1. **结构**：body 的顶层可见节点必须全部位于容器 `<main>` 之内——容器外顶层可见节点必然越出容器左右界（U-28 孤块正是此形态）；script/style 不算可见。
2. **逃逸声明**：margin 的水平分量为负且幅度 > 容差 **26px**（容器 padding 24px + 2px）即违规。满幅 hero 的 100vw 靠 ≤24px 负边距补偿容器 padding（`.strip margin:48px -24px 0`），属声明 bleed（c 组已单独管辖裸 strip 位置），在容差内放行；`-999px` 级逃逸必失败。
3. 覆盖：样式表规则 + 全部 72 页范例产物 + 内联 style；负例 N5（内联 -999px）/ N6（容器外顶层节点）/ N7（样式表规则）。

**先制造失败实测**：向真实产物 `apple-com-ipad-air.html` 注入 `<div style="margin-left:-999px">probe</div>` ⇒ 门禁失败并点名 `apple-com-ipad-air.html: 内联 margin-left:-999px` ⇒ 撤销（字节级还原） ⇒ 通过。

## 3. 亲眼确认（截图裁剪，≤3 张预算内看了 2 张）

- before：`.scratch/59-u28/before-orphan.png` —— `12 mo.` 孤悬页面最左缘（x≈18px），与句子分家。
- after：`.scratch/59-u28/after-merged.png` —— `· 12 mo.` 弱化同行接在 `…with Apple Upgrade` 之后，无孤儿、无越界。
- 客观像素佐证：重渲染后全页左边距带（x∈8..70, y∈400..1600）暗像素行 **0**（修前 3 行）；页高 9188→9162（恰为移除的孤块高度）。

## 4. 全量验证

- `node m1/eval/pipeline.mjs --shots`：**全绿** —— 模型校验 48 个全通过；渲染 42/42、保真 1.00 42/42（HTML）+ 42/42（Markdown）；17 道自测全过（第 17 道含新断言）；视觉自查 42/42 干净；截图 42 张 + 画廊 + 证据一致性通过（v=mv1ri296）。
- 受影响单测逐一复核：foundation / axis / text / md / composite / control-render / metrics 全 PASS；bilibili 渲染产物 meta 分组逐字未变。
- 未改模型（`m1/curated/**/*.json` 零改动）、未新增保留键、未 git 提交。

## 5. 变更文件

- `m1/axis.mjs`：`installmentCarrierOf` + nodePlan 归属后处理（分组决策，三目标共享）。
- `m1/render.mjs`：facts 循环画行内 installment、跳过独立条目；`factHtml/inlineLinkFactHtml` 增行内尾注参数；`.fact .installment` CSS。
- `m1/render-text.mjs` / `m1/render-md.mjs`：同一决策的行尾形态。
- `m1/eval/layout-selftest.mjs`：e 组容器界内断言 + N5/N6/N7 负例。
- `m1/curated/renders/**`：42 页 HTML/PNG 重渲染（其中 3 页内容变化，其余为样式表哈希更新）。
- `.scratch/54-user-review/findings.md`（U-28 回填）、`.scratch/59-u28/**`（本报告 + 截图）。
