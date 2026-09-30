# 轮 14 · 保真匹配精度（F-054）——报告

唯一写入者：worker（round-14）。范围：`m1/eval/**`、`m1/failures.md`、`.scratch/**`。

## 0. 起点

- `m1/eval/metrics.mjs` 的保真匹配 = `norm(render).includes(norm(value))`，`norm` 小写、解实体、**删除所有空白与标点**。
- F-054：极短数值（`{money: 0}`）只要页面任意位置有一个 `0` 即判“已渲染” ⇒ 可掩盖该格真缺。
- 起点门禁：`m1/eval/m3-final.json` = **42/42 页保真 1.00**（复算通过）。

## 1. 候选规则的设计与反例筛选（先测量再定稿）

我先实现了三种候选，并在 42 页实跑对比（探针脚本在 /tmp，不入库）：

| 变体 | 规则 | 42 页新增“缺失”事实 |
|---|---|---|
| A 朴素同类邻接（在 `norm` 串上查邻接，禁止 字母/数字/`.`/`,`） | 命中处左右字符不得是这四类 | **240**（几乎全是假缺失） |
| B 保留 `.`/`,` 的规范化串 + 同类邻接 | 同上 | **84**（假缺失） |
| C 数字/`.`/`,` 邻接（无字母类） | 同上 | **14**（含假缺失） |
| **D（采纳）** 原始 HTML 偏移 + **边类感知** | 见 §2 | **0** |

**A/B/C 为什么是错的（实测反例，逐条看过渲染原文）**：

1. `norm` 删空白/标点后，“以空格分隔”与“字母紧贴”不可区分。例：`_rating-count: "870"` 渲染为 `870人好评`、`_rating: "4.86"` 渲染为 `4.86星`、`scale._fields.regions: "29"` 渲染为 `29地域` —— 数字**确实**渲染了，CJK 量词紧贴其后；A/B/C 会把它们判成缺失。
2. 值自带的尾标点被 `norm` 删掉，命中点右侧残留的是**值自己的**句点。例：`_summary: "This table shows … to 5 April 2027."` 在我式 A/B/C 下命中后右邻是 `.`（句子句点）⇒ 假缺失。
3. 反之，`128GB $799 or $33.29 per month for 24 months` 这类**同一元素内空格分隔的相邻事实**，在规范化串里表现为 `…$799or$33.29…` ⇒ 也假缺失。

结论：邻接判定**必须在原始 HTML 偏移上做**（标签、空格、符号仍是分隔符），且**必须按命中边字符的类别分别定义**延续集。

## 2. 采纳的规则（`m1/eval/metrics.mjs`）

三处改动，**全部只会减少命中候选（严格收紧）**，不可能把“缺失”变成“已渲染”：

1. `pageText(html)`（新）：删 `<style>`/`<script>` 主体 → 标签折叠为 `<>`。
   *为什么*：`<td>0</td>` 若被样式表里的 `margin:0` 或标签属性 `class="depth-0"` 作证，F-054 的盲区就原样保留（实测：仅去掉 `$0` 后仍被 `depth-0` 证成“已渲染”）。折叠为 `<>` 而非删标签，是因为标签必须继续当**分隔符**，否则相邻元素的文本会粘连（`<td>2</td><td>4</td>` → `24` 会制造假缺失）。
2. `indexNorm`（新）：输出的可见字符序列与历史 `norm` **逐字节相同**（42 页渲染 + 边界用例实测 0 差异），额外给出「保留字符 → 原始偏移」映射。
3. `isRendered`（新）：逐次命中查**原始 HTML** 相邻字符；禁止的邻接类由值自身的边界字符决定——
   - 数字边：邻接数字不算；邻接 `.`/`,` **且其外侧仍是数字**才算数字延续（因此 `$0`、`870人`、`…2027.` 都仍是命中；`2026`、`10.5`、`1,000` 里的 `0` 不算）；
   - 非数字边：邻接字母不算（`Save` 命中 `Savechanges` 不算；命中 `Save changes` 算）；
   - 空白、标签、`$ % ° - : ( )` 与值自身的标点都是分隔符；多词值仍跨标点/标签匹配（`Pro further.` 在 `…>Pro further.<…` 仍算）。

**关键设计约束（实测反例驱动，见 §1）**：邻接判定必须在**原始 HTML 偏移**上做（空格/标签是真分隔符），且数字边**不能禁止字母**（否则 `870人`/`2 vCPU`/`29地域` 会变成 84 条假缺失）。

## 3. 前后逐页差异表（`node /tmp/f054/difftable.mjs`，前口径 = 轮 13 的 `norm(html).includes(norm(value))`）

| 页面 | 事实分母 | 前：缺失 | 后：缺失 | 前保真 | 后保真 |
|---|---|---|---|---|---|
| `36kr-com/home` | 157 | 0 | 0 | 1.00 | 1.00 |
| `36kr-com/information-technology` | 115 | 0 | 0 | 1.00 | 1.00 |
| `36kr-com/search-ai` | 73 | 0 | 0 | 1.00 | 1.00 |
| `36kr-com/search-viz` | 73 | 0 | 0 | 1.00 | 1.00 |
| `airbnb-com/room-28871` | 75 | 0 | 0 | 1.00 | 1.00 |
| `aliyun-com/home` | 177 | 0 | 0 | 1.00 | 1.00 |
| `aliyun-com/product-ecs` | 38 | 0 | 0 | 1.00 | 1.00 |
| `apple-com-cn/iphone-17` | 173 | 0 | 0 | 1.00 | 1.00 |
| `apple-com/home` | 64 | 0 | 0 | 1.00 | 1.00 |
| `apple-com/ipad-air` | 115 | 0 | 0 | 1.00 | 1.00 |
| `apple-com/iphone-16` | 122 | 0 | 0 | 1.00 | 1.00 |
| `apple-com/macbook-air` | 167 | 0 | 0 | 1.00 | 1.00 |
| `aws-amazon/ec2-on-demand` | 155 | 0 | 0 | 1.00 | 1.00 |
| `bilibili-com/home` | 58 | 0 | 0 | 1.00 | 1.00 |
| `bilibili-com/read-home` | 105 | 0 | 0 | 1.00 | 1.00 |
| `bilibili-com/video-bv1gj411x7h7` | 154 | 0 | 0 | 1.00 | 1.00 |
| `github-com/login` | 9 | 0 | 0 | 1.00 | 1.00 |
| `gov-uk/ni-rates-letters` | 147 | 0 | 0 | 1.00 | 1.00 |
| `gov-uk/register-birth-abroad` | 34 | 0 | 0 | 1.00 | 1.00 |
| `grafana-play/play-home` | 18 | 0 | 0 | 1.00 | 1.00 |
| `huawei-cn/consumer-phones` | 151 | 0 | 0 | 1.00 | 1.00 |
| `huawei-cn/home` | 29 | 0 | 0 | 1.00 | 1.00 |
| `huawei-cn/search-laptop` | 47 | 0 | 0 | 1.00 | 1.00 |
| `huawei-cn/search-phone` | 45 | 0 | 0 | 1.00 | 1.00 |
| `learn-microsoft/vm-sizes` | 196 | 0 | 0 | 1.00 | 1.00 |
| `linear-app/home` | 22 | 0 | 0 | 1.00 | 1.00 |
| `mi-com/home` | 2 | 0 | 0 | 1.00 | 1.00 |
| `mi-com/product-detail-mi15` | 21 | 0 | 0 | 1.00 | 1.00 |
| `mi-com/search-earbuds` | 122 | 0 | 0 | 1.00 | 1.00 |
| `mi-com/search-phone` | 92 | 0 | 0 | 1.00 | 1.00 |
| `mi-com/shop-category-list` | 161 | 0 | 0 | 1.00 | 1.00 |
| `sspai-com/home` | 86 | 0 | 0 | 1.00 | 1.00 |
| `sspai-com/matrix` | 83 | 0 | 0 | 1.00 | 1.00 |
| `sspai-com/post-102392` | 18 | 0 | 0 | 1.00 | 1.00 |
| `sspai-com/post-114699` | 55 | 0 | 0 | 1.00 | 1.00 |
| `sspai-com/post-114716` | 126 | 0 | 0 | 1.00 | 1.00 |
| `sspai-com/u-jtc092al` | 38 | 0 | 0 | 1.00 | 1.00 |
| `stripe-com/pricing` | 425 | 0 | 0 | 1.00 | 1.00 |
| `stripe-dashboard/login` | 11 | 0 | 0 | 1.00 | 1.00 |
| `stripe-docs/payments` | 62 | 0 | 0 | 1.00 | 1.00 |
| `taobao-com/home` | 136 | 0 | 0 | 1.00 | 1.00 |
| `xiaomi-account/login` | 15 | 0 | 0 | 1.00 | 1.00 |
| **合计（42 页）** | 3972 | 0 | 0 | 42/42 | 42/42 |

- 差异行：**无**（42 页前后逐页完全一致；新缺失事实数 = **0**）。
- 事实分母合计 3972（与轮 13 相同；`factValues` 未改）。
- 这不是“放宽回到 1.00”的结果：新规则是旧规则的**真子集**（先要求旧的子串命中，再追加边界条件），且下面 §4 证明门禁**现在能失败**。

## 4. 新缺失归属与处置

**新缺失 = 0 条 ⇒ 无渲染器缺陷、无显式排除、无需修渲染器。**

为满足“逐条判定”的要求，我把“被规则拒绝的候选”逐条看过渲染原文（探针 `/tmp/f054/ctx.mjs` 打印 ±70 字符上下文），结论如下：

| 候选（若按朴素同类邻接就会误报为缺失） | 渲染原文 | 判定 |
|---|---|---|
| `airbnb reviews._rating := "4.86"` | `评分为4.86星满分5星` | **确实渲染**（CJK 量词紧贴）⇒ 必须算命中 |
| `mi-com recommended[0]._rating-count := "870"` | `870人好评` | 确实渲染 ⇒ 必须算命中 |
| `aliyun-com/product-ecs scale._fields.regions := "29"` | `29地域` | 确实渲染 ⇒ 必须算命中 |
| `gov-uk employee-rates._summary := "…to 5 April 2027."` | 值自带尾句点 | 确实渲染 ⇒ 必须算命中 |
| `apple-com/iphone-16 steps._lines[1]._items[0]._summary := "or $33.29 per month for 24 months"` | `128gb $799 or $33.29 …`（空格分隔的相邻事实） | 确实渲染 ⇒ 必须算命中 |
| `mi-com search-earbuds amenities._count := "18"`（旧口径的隐患） | 样式表 `padding-left:18px` | **不可见内容不作证** ⇒ 新规则下这类不再冒充命中（正是本轮要修的过匹配） |

即：上面 5 条**不是缺陷、不是排除项**，而是“这类匹配必须成立”的证据；第 6 条是**过匹配面被真正移除**的证据。

## 5. 门禁可失败性证明（把“不会失败的门禁”变回门禁）

对 `aws-amazon/ec2-on-demand`（155 项事实，含 `data-transfer` / `region-egress` 两个 `{money: 0}` 格）：

```
clean    渲染 (m1/curated/renders/aws-amazon-ec2-on-demand.html) → 1.00  155/155  missing=[]
tampered 把两处 `$0` 从渲染页删掉：
  轮 13 口径（norm 子串包含）→ 1.00 155/155（渲染页里 `margin:0`/`depth-0`/其他数字里的 0 仍在 ⇒ **盲**）
  轮 14 口径                → 0.987 153/155，missing = [
      "data-transfer._items[1]._fields.data-transfer-price := \"0\"",
      "region-egress._items[0]._fields.egress-price := \"0\"" ]
```

（tamper 文件写在 `/tmp/f054/aws-tampered.html`，不入库；干净渲染页未被改动。）

## 6. 新自测断言（`m1/eval/metrics-selftest.mjs`，18 条，全过）

新增 10 条（全部使用真实 `render()` 输出或等价 HTML）：

| # | 断言 | 覆盖 |
|---|---|---|
| 1 | `{money: 0}` 的格子真的渲染为 `$0`（fixture） | 前置 |
| 2 | `0` 只出现在 `$0` 里 ⇒ **算**已渲染（保真 1.00） | 任务② |
| 3 | `0` 只出现在 `2026` 里 ⇒ **不算**（保真 <1.00 且点名 `_fields.price`） | 任务① |
| 4 | 同上，`10.5` | 边界右下角 |
| 5 | 同上，`1,000` | 千分位 |
| 6 | `0` 只出现在 `class="depth-0"` / 样式表 `padding:0` 里 ⇒ 不算 | 可见文本口径 |
| 7 | `870人好评` 里的 `870` ⇒ 算 | 防假缺失回归 |
| 8 | `87041人` 里的 `870` ⇒ 不算 | 过匹配 |
| 9 | 多词值 `Pro further.` 跨自身标点 ⇒ 算 | 防退化 |
| 10 | `Profurtherx` 里的 `Pro further` ⇒ 不算 | 词边界 |

断言 3–10 在轮 13 的旧口径下**全部失败**（旧 `norm` 删掉标点/空白后，`2026`/`10.5`/`1,000`/样式表/类名里都含 `0`）。

## 7. 收尾门禁

见 §8（`--shots` 追加）。

## 8. 收尾门禁（原文）

`node m1/eval/pipeline.mjs --shots`（截图 + 画廊重建，退出码 0）：

```
[pipeline] 渲染 42/42 | 错误 0
[pipeline] 保真 1.00: 42/42
[pipeline] 模型校验: 48 个全通过
[pipeline] 校验器自测: 通过
[pipeline] 地基自测(D1/D2/D3): 通过
[pipeline] 显式降级清单（compare 标记但成不了对比表）:
[pipeline] · stripe-com/pricing · n=2 · degenerate-no-shared-attribute
[pipeline] 地基自测: 全部通过
[pipeline] 度量自测(F-052): 通过
dup-title: 华为磁吸手机支架 - 华为官网
· sspai-com-home.html                           dup-source-true(info):2

视觉自查: 42/42 干净
[pipeline] 截图 42 张, 画廊 v=muom1psn
```

三套自测单独跑：度量自测 **18/18**、校验器自测 **12/12**、地基自测 **全部通过**；`node m1/eval/pipeline.mjs`（无截图）退出码 **0**。
看图：**0 张**——本轮**未改渲染器**、且新缺失 = 0（需要看图的场景不存在）；对“到底渲染没有”的判定我用的是渲染 HTML 的原文上下文（比看图更可复核）。

口径原文（`m1/eval/rubric.md`「已渲染」判定）：值的规范化文本在渲染页的**可见文本**里出现，且该次出现的**任一侧都不被同类的延续字符接上**。

## 9. 残余局限（如实）

1. **字母紧贴的数字仍算命中**：`norm` 之后 `0` 命中正文 `ID0`、`18` 命中正文 `…18px` 仍算“已渲染”。禁止它会把 `870人`/`2 vCPU`/`29地域` 判成缺失（实测 84 条假缺失），故保留为已知口径缺口。
2. **度量仍路径无关**：同页两个同值格，一格真缺、另一格真渲染时只报“已渲染”（aws 两个 `$0` 是已知例外）。真正的格级对齐需要渲染侧路径/列序信息，属 M4-b 之后的度量重构。
3. **“不可见内容不作证”的边界情形**：若将来渲染器把某事实只放进属性（如 `title=`/`alt=`），会因新口径报缺失。本轮 42 页无此形态（`image.alt` 与 `ref` 本就不在分母内）；新增自测第 6 条把该口径钉住。
4. 邻接判定在**原始 HTML**上做，因此对“同一元素内直接拼接”的相邻事实仍靠字符类别区分；若将来渲染器改成无空格拼接 `870人` 形态的量词再加字母数字后缀，需重估。

## 10. 文件清单

- 改：`m1/eval/metrics.mjs`（`pageText` + `indexNorm` + 边界感知 `isRendered`）、`m1/eval/metrics-selftest.mjs`（+10 断言）、`m1/eval/rubric.md`（「已渲染」口径 + 分母表新增一行 + 残余局限）、`m1/failures.md`（F-054 → 已修 · 部分）。
- 流水线再生（非人工编辑）：`m1/curated/renders/index.html`（画廊版本号/事实数）、`m1/eval/m3-final.json`（内容不变，git 无差异）。
- 未碰：`corpus/`、`m1/render.mjs`（渲染器零改动）、`m1/models/**`、`m1/curated/*.json`、语法/词表。
- 未提交 git（`git diff --cached` 为空）。

## 11. 结论

F-054 的过匹配面被真正移除且**可证**：门禁从“删除两格 `$0` 仍报 1.00”变为“报 0.987 并点名两格”。收紧过程中**没有**任何已渲染事实被误判（42 页前后逐页一致、新缺失 0），也没有为了保住 1.00 而放宽匹配（新规则是旧规则的真子集 + 可见文本约束）。

MATCH_DONE fidelity_before=42/42 fidelity_after=42/42 newly_missing=0 renderer_fixes=0 excluded=0 audit=clean
