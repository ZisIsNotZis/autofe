# 修复报告 1（R1 控件被吞 / R2 标识符泄漏）

范围：只修「控件被吞 / 内部标识符泄漏」根因族（R1、R2 + 同族顺手项）。唯一写入者：本 worker。
起点：checkpoint `77cf57a`（上一修复者超时前已提交部分 `m1/render.mjs` + 模型改动）。本轮先**核验**该基线，再补齐残留，**不扩范围**。

## 分片进展（每片一行：改了什么 → 门禁结果）
- 分片 0（核验基线）：逐条核对 checkpoint 已提交状态 —— R1 的 `.controls` 控件条 + `bareTitle && !node._action`、R2 的 `actionHtml` 禁 verb、`renderDeflist` 空标签列、页头根 `_brand` 去重 **均已落地**；定位到唯一残留 R2 泄漏向量：`actionKids` 工具条的 `a.label ?? a.verb`。→ 未改代码。
- 分片 1（R2 收口）：`m1/render.mjs` 工具条删除 verb 兜底（无 `label` 即不渲染该工具，工具全空则不出 `<div class="toolbar">`）。→ 门禁绿：`保真 1.00: 36/36` + `视觉自查: 36/36 干净`。
- 分片 2（同族复核）：`renderDeflist` 空标签列、页头 `_brand` 与根元行重复 —— 已确认修复，无需再改。→ 门禁绿。
- 分片 3（跨页复核）：逐页核对 R1 全部受影响页面 + 全库自动扫描（见下）。→ 门禁绿。

## 已修（逐条：findings 来源 → 文件/规则改动 → 如何在截图上验证）

### R1 控件被 promo 分支吞掉【blocker】
- 来源：findings-2（huawei consumer-phones 购买）、findings-3（36kr search-ai 站内搜索、apple iphone-16 Continue/Save for later、aliyun 按钮）、findings-4（36kr search-viz、huawei 重置、mi15 立即领取/修改/加入购物车/喜欢、taobao 更多低价商品）。
- 改动（`m1/render.mjs`，checkpoint 已落地，本轮核验）：
  1. `bareTitle` 增加 `&& !node._action` —— **有 `_action` 的节点永远不是 promo**；
  2. 在 promo 判定之前先输出块级控件条：`titleText && (titleIsControl || linkTo) && 其余为空` → `<div class="controls"><a class="ctl" href>…</a>|<span class="ctl">…</span></div>`（有真实目标⇒`<a class="ctl" href>`；无目标⇒保持控件观感的 `<span class="ctl">`，不再是整行浅灰空框）。
- 截图/HTML 验证（当前 `m1/curated/renders/*.html`）：
  - 36kr `search-ai` / `search-viz`：`<section class="group g-submit"><div class="controls"><span class="ctl">站内搜索</span></div>`
  - huawei `search-laptop` / `search-phone`：「重置」→ `<div class="controls"><span class="ctl">重置</span>`
  - huawei `consumer-phones`：`class="ctl"…>购买<` 共 **37** 处（1 处带 `href`，36 处 `.ctl` 观感）
  - mi15：`立即领取 / 修改 / 加入购物车 / 喜欢` 各为 `<span class="ctl">…</span>`
  - apple `iphone-16`：`Save for later` / `Continue` → `<div class="controls"><span class="ctl">…`
  - linear：`Contact sales` → `<a class="ctl" href="https://linear.app/contact-sales">Contact sales</a>`
  - taobao：`更多低价商品` → `<a class="ctl" href="https://www.taobao.com/">更多低价商品</a>`
- 未回归的证据：`grep 'class="promo'` 仅剩 4 页（apple iphone-17/ipad-air/macbook-air、bilibili home），且这些 promo 均是"确实只有标题、无动作"的块（见"未修/降级"）。

### R2 内部动词泄漏【blocker】
- 来源：findings-2（sspai post-102392 `operate`）、findings-3（aliyun product-ecs 三个 `buy`）；同一根因也命中 36kr/home 的 `open` 序列。
- 改动（`m1/render.mjs`）：
  1. `actionHtml`（checkpoint 已落地，本轮核验）：`if (!a.label) return '';` —— **无 `label` 绝不打印 `verb`**；文案只取 `a.label`，不再 `a.label ?? a.verb`。
  2. **`actionKids` 工具条（本轮修）**：删除 `const copy = a.label ?? a.verb;`，改为无 `label` 即跳过该工具、`filter(Boolean)` 且工具全空不出容器。这是 R2 根因在代码里最后一处相同向量。
  3. 模型侧同轮补 `label`（checkpoint 已落地，本轮核验）：aliyun `product-ecs` 三个实例动作补 `label:"立即购买"`；sspai `post-102392` 的 `operate` 补 `label:"充电"`。
- 截图/HTML 验证：aliyun `product-ecs` → `verb-buy" href="…?spec=e|u2a|c9i|g9i">立即购买`（无裸 `buy`）；sspai `post-102392` → `<h2…>充电鼓励</h2><span class="action-plain">充电</span>`（无裸 `operate`）。
- 全库扫描：`grep -rE '>(buy|operate|open|navigate|subscribe|toggle|select|follow|search|reset|submit|filter)<'` → 0 命中。

### 同族顺手项（第 3 分片，checkpoint 已落地，本轮核验）
- findings（deflist 无由缩进，来自组内同类）：`renderDeflist` 标签为空时不再输出空 `<div class="deflabel">`（`.deflabel{min-width:130px}` 的缩进随之消失）。验证：`grep -rn '<div class="deflabel"></div>' renders/` → 0。
- findings（aliyun product-ecs「阿里云」出现两遍，来自组内同类）：页头已渲染根 `_brand`，根节点 meta 行 `if (f.key === '_brand' && depth === 0) continue;` 同一事实只渲染一处。验证：`grep -c 阿里云 renders/aliyun-com-product-ecs.html` → **1**。

## 未修/降级（原因）
1. **集合/表格/chips 形态丢弃带 label 的 `_action`（既有缺陷，非本轮根因）**：当集合项同时有 `_name` 和带 `label` 的 `_action` 时，`renderChips`/`renderDeflist`/`renderList`/`renderControls`/对比表用**条目自身的 `_name`** 作为控件文字/链接，动作的 `label`（如 aliyun「查看详情」、huawei「了解更多」、apple「Listen now」）被丢弃。全库自动扫描命中约 30 处（aliyun home、apple home/ipad-air/ipad-air-cn/macbook-air、grafana play-home、huawei home、sspai home/u-jtc092al、stripe pricing）。**层级**：renderer（集合形态的动作渲染策略），**根因与 R1 的 promo 分支不同**；已确认在 checkpoint 之前就存在（非本轮回归）。**为何不做**：本轮被刻意收窄到 R1/R2，此项属新机制、改动面大（会触达多个集合形态的共用逻辑），超出授权范围 —— 留待独立一轮，不要静默扩范围。
2. **apple iphone-17 / ipad-air / macbook-air 里若干 `promo-label`（R7 族）**：本轮中途发现（如 iphone-17 「A19 芯片」「Apple 智能」被渲染成 promo 条），已按父代理指示**停止**——属 fix-2 范围，不在本轮授权内。
3. **bilibili home 的 promo（第五人格亲密之月）**：根因在 capture（取到的是导航条带截图，findings-1 blocker），checkpoint 已移除该错图资产；本轮不动。

## 需要人类决策
1. **控件文字取「条目自身 label」还是「动作 label」**：集合形态里，条目 `_name` 与动作 `_label` 是两份不同内容（F-022 认定 label 是内容）。是统一为渲染动作 `label`、还是以条目 `_name` 为准（现状）？这会改变多处集合的可见文案与产物观感，属需确认的渲染契约取舍 —— 不静默决定，交父代理/人定夺后另开一轮（对应"未修/降级 1"）。

## 门禁结果（pipeline 最后输出原文）
命令：`node m1/eval/pipeline.mjs`（exit=0）
```
[pipeline] 渲染 36/36 | 错误 0
[pipeline] 保真 1.00: 36/36
· huawei-cn-consumer-phones.html                dup-source-true(info):1
· sspai-com-home.html                           dup-source-true(info):2

视觉自查: 36/36 干净
```
（`dup-source-true(info)` 为既有 info 级条目，非失败。）

FIX1_DONE fixed=4 deferred=2 decisions=1 fidelity=36/36 audit=clean
