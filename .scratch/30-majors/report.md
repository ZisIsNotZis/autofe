# 轮 30：剩余 major + 链接样式（worker，唯一写入者）

**范围**：只改 `m1/render.mjs`、`m1/axis.mjs`、`docs/m1/layout-axes.md`、`m1/failures.md`、
`m1/curated/mi-com/search-phone.json`（第 6 项图片）、`.scratch/**`。**未改 `corpus/`**，无新模型键/语法，无 git 提交。

## 1) 链接样式（表现层，只改 CSS）— 已修
现象：标题/条目名渲染成浏览器默认的蓝字下划线（`<a class="self-link">`、`.linklist a{color:#0b62d0}`）。
- 加站点级规则（`m1/render.mjs` 样式块）：`a{color:inherit;text-decoration:none;cursor:pointer}` +
  `a:hover{text-decoration:underline}`；`a.ref`（行内引用）保留可辨色 `#0b62d0`。
- `.linklist a`、`.seq a` 由固定蓝改为继承文字色；`.ctl`/`.action`/`.cmp-tag` 的类样式优先级更高，不受影响。
- 可点击性靠 hover 下划线 + 指针，不靠默认蓝（任务要求）。**未动正文行内引用的可辨色**。
- 看图 1 张：`.scratch/30-majors/crops/mi-com-search-phone-reco.png`（轮 30 渲染的 mi 结果区裁切）——
  结果卡与「猜你喜欢」卡标题已是**深色、无下划线**（改前是蓝字下划线）。

## 2) 限定词位置 — 已修
`apple-com-cn/iphone-17`：`起 RMB 6799` → **`RMB 6799 起`**（与源站一致）。
- 共享决策 `axis.qualifierPlacement`（正则 `POSTPOSED_QUALIFIER`）：`起/含税/每月/每…/per…/each` **后置**，其余**前置**（默认）。
- 全库 qualifier 逐条前后对照（改前 → 改后）：

| 页 | 键 | 改前 | 改后 |
|---|---|---|---|
| apple-com-cn/iphone-17 | `_price` 起 (×3) | `起 RMB 6799` / `起 RMB 8799` | **`RMB 6799 起`** / **`RMB 8799 起`** |
| huawei-cn/consumer-phones | `flagship._price` 起 | `起 ¥19999` | **`¥19999 起`** |
| gov-uk/register-birth-abroad | `fees._amount` per certificate | `per certificate £50` | **`£50 per certificate`** |
| aws-amazon/ec2-on-demand | `_price` 每 GB (×72) | `每 GB $…` | **`$… 每 GB`** |
| apple-com/ipad-air | `_price` From (×3) | `From $749` | `From $749`（前置，不变） |
| apple-com/macbook-air | `_price` From (×3) | `From $1299` | `From $1299`（前置，不变） |
| stripe-com/pricing | `起始价：`/`3.4% +`/`2.2% +`/`+` | 前置 | 前置（不变） |
| mi-com/search-phone | `订金` | `订金 ¥9.9` | `订金 ¥9.9`（前置，不变） |
| mi-com/search-earbuds / product-detail-mi15 | `list` | 忽略（内部标记） | 忽略（不变） |

规则写进 `docs/m1/layout-axes.md §9.1`；日志 `m1/failures.md F-067`。

## 3) 价格重复 — 已修（含一处与任务书字面相反的取舍，理由如下）
`iphone-17` 摘要 `RMB 6799 起或 RMB 284/月 起` 与 hero `起 RMB 6799` 金额两遍。
- **保真门禁事实**：`_price`（money）只校验数字 `6799`；`_summary`（text）**逐字**校验整串。
  ⇒ 删掉摘要会保真 <1（不可接受）；删掉 hero 则 `6799` 仍由摘要承载，保真 42/42 不变。
- **取舍**：任务书字面写「优先保留更结构化的一处（hero/_price）」，但该选项与硬门禁冲突（会删掉逐字事实）。
  实际采用「优先保留**信息更全**的一处」：去掉重复的 hero 行，摘要（含 `RMB 284/月`）为唯一价格行。
  `_price` 事实仍在模型与页面上（由摘要承载），**未删任何模型事实**。
- 影响面：`apple-com-cn/iphone-17`、`apple-com/ipad-air`、`apple-com/macbook-air`（三页均属同一模式），
  hero 行去掉、摘要行保留；其余页无 `_summary` 复述主价，hero 照常。
- 结论：**已修**（金额只现一次；保真 42/42 保持）。实现 `m1/render.mjs` renderNode（`heroDup`）。

## 4) 裸数字无标签 — partial
- `axis.quantityLabel`：`_count/_measure/_rating/_rating-count/_stock` 等**数值角色事实**，在
  `vocab-role-labels.json` 有非空标签时前缀该标签；无标签不加。
- 效果例：bilibili 首页视频卡 meta `啊力解说 · 09-15` → `… · **数量** 20.2 万 · **规格** 155`；
  mi「猜你喜欢」`_rating-count` → `**评价数** 870 人好评`。
- **如实说明（partial 的原因）**：任务书举例是「播放 20.2万 / 弹幕 155」，但**共享词表**里 `_count`→「数量」、
  `_measure`→「规格」（**通用**标签），并不产出「播放/弹幕」这种**站点语义**标签。按纪律「没有词表标签的就不加（不发明）」，
  未改词表、未硬编码站点词。要得到「播放/弹幕」需要一次**词表/模型语义决策**（超出本轮渲染层范围）。

## 5) 重复块 — partial
- **已修**：标题去重（`docs/m1/layout-axes.md §9.4`）：与**祖先**逐字相同的标题不再画；与本页已出现标题逐字相同、
  且该节点**自身无事实**（纯分组标签）时也不再画。`stripe-docs/payments` 的「支付方式」h3 已去掉（h2 保留、
  分组控件「银行卡/银行借记/…」保留、文本仍在页面上，保真不受影响）。同节点**label+目标都相同**的控件也去重。
- **未合并（partial）**：`sspai-com/post-114699` 的「来源」是 **14 条目标各不相同的真实外链**（每条新闻一条），
  按「目标不同即不是重复」的规则**未合并**——合并会删掉 13 条真实链接（属"删事实换好看"）。
- 采用规则与理由如上；「来源」若要去噪，正解是**模型/表现降级为卡内小字链接**（评审原建议），非本轮去重范围。

## 6) mi 140px 商品图 — 已修
- 判据放宽为「条目**首个视觉元素**的图片且 `w≥120 且 h≥120`」；mi「猜你喜欢」10 张 140×140 全部满足。
- 归属核对（`dom.html` 的 `data-src` + 最近 `<a href>` 的 `product_id` + `alt`）：10/10 与模型条目**逐条全等**，
  与模型顺序一致（`rec-1230808886…rec-1230808165`）。URL = 源站 `data-src` 逐字绝对化（`https://cdn.cnbj1…thumb=1&w=180&h=180&f=webp&q=90`），**未发明**。
- `alt` 取自源站（= 条目名）。**一致性检查**：10 张均 1:1、同一缩略变体，渲染后同列等高；
  视觉自查硬门禁 T-105 `img-variance`（组内 `min/max<0.7` 即缺陷）在 `mi-com/search-phone` **未触发**（42/42 干净），无需回滚。
- `_image` 计数：该页由 20 → 30；条目卡「标题 + 主视觉图 + 价格 + 好评数 + 加入购物车」。

## 硬门禁（本轮改动全部在位时跑）
```
node m1/eval/pipeline.mjs --shots
[render 42/42 | 错误 0]  保真 1.00: 42/42   Markdown 1.00: 42/42   模型校验 48 全通过
七套自测全通过（校验器 / 地基 D1·D2·D3 / 度量 F-052 / 文本 F-031 / 轴一致性 / Markdown）
视觉自查: 42/42 干净   截图 42 张, 画廊 v=muoz0443
```
- 残留 `dup-title` 全为 `*-source-true(info)`（源站自身重复文本，非硬失败）：apple-com-cn/iphone-17「Apple 智能」、
  huawei-cn/consumer-phones「HUAWEI Mate XT 2 非凡大师」、huawei-cn/search-phone「华为磁吸手机支架 - 华为官网」、
  apple-com/macbook-air「MacBook Air 13”」、sspai-com/home 2 处。**无新增硬缺陷**。

## 纪律
- 改动面：`m1/render.mjs`（CSS + `fmt` 限定词 + hero 去重 + 角色标签 + 标题去重）、`m1/axis.mjs`
  （`qualifierPlacement`/`quantityLabel`/动作行同控件去重）、`docs/m1/layout-axes.md §9`、`m1/failures.md F-067/068/069`、
  `m1/curated/mi-com/search-phone.json`（+40 行：10 × `_image{image,alt}`）。
- **无删事实**、**无新语法/保留键**、**无 git 提交**；`m1/curated/renders/**`、`m1/eval/m3-final.json` 等生成物按纪律 `git checkout` 还原。

## 改动页计数
- **body 有变化 20/42**（其余 22 页只多了共享链接样式块）：
  airbnb-com-room-28871、apple-com-cn-iphone-17、apple-com-ipad-air、apple-com-iphone-16、apple-com-macbook-air、
  aws-amazon-ec2-on-demand、bilibili-com-home、bilibili-com-read-home、bilibili-com-video-bv1gj411x7h7、
  gov-uk-register-birth-abroad、huawei-cn-consumer-phones、huawei-cn-search-laptop、huawei-cn-search-phone、
  mi-com-search-earbuds、mi-com-search-phone、sspai-com-post-114699、sspai-com-post-114716、sspai-com-u-jtc092al、
  stripe-com-pricing、stripe-docs-payments。

## 未完成 / 局限（如实）
- 第 4、5 项为 **partial**：数值角色标签受共享词表所限只产出通用词；sspai「来源」因目标各异而保留。
- 第 3 项与任务书字面「优先保留 hero」相反（保真门禁所迫），已在 §3 与 `layout-axes §9.2` 说明。
- 第 6 项渲染顺序仍是「标题在上、图在下」（渲染器既有约定），源站是「图在上」；未改渲染顺序（超范围）。
