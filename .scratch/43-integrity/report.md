# 轮 43 — 第 9 道门禁：采集↔模型一致性（capture-integrity）

> 目的（F-078）：`保真度` 只校验「模型事实是否出现在渲染里」，从不校验「模型事实是否来自抓取」。
> `aliyun-com/product-ecs` 价格 1238/1385 事件证明 **F-025「抓取即真相」此前没有门禁在守**。
> 本轮新增第 9 道门禁 `m1/eval/capture-integrity.mjs` + 声明式白名单 + 自测 + pipeline 接线。

状态：**完成**。`node m1/eval/pipeline.mjs --shots` ⇒ 退出码 0。

## 1. 规范化规则表（实现于 `capture-integrity.mjs` 头注释；两侧同规则）

| 规则 | 内容 |
|---|---|
| R1 HTML 实体 | `&amp; &quot; &apos; &lt; &gt; &nbsp;` 与数字实体 `&#39;`/`&#x27;`/`&#NNN;` 解码为字符 |
| R2 全/半角 | 全角 U+FF01..FF5E → ASCII（−0xFEE0）；U+3000 → 空格 |
| R3 大小写 | ASCII 小写 |
| R4 空白/标点/符号/不可见 | 空白、`\p{P}`、`\p{S}`（含货币 `￥¥$€£`、`+%°`）、不可见格式符 `\p{Cf}`（零宽空格/连接符、软连字符、BOM）、emoji 变体选择符 U+FE00–FE0F 一律丢弃，不构成断点 |
| R5 数字（数值比较） | 抓取侧抽取**整数字令牌**解析为浮点；`99`⇄`￥99.00`、`3459.9`⇄`3459.90`、千分位 `1,438.68`、货币符号/代码、`2`⇄`2核2G` 均命中。令牌边界=数字串本身，故 `99` **不会**命中 `1990`。 |
| R6 日期多形态 | `YYYY年M月D日` / `YYYY-M-D` / `YYYY/M/D` / `YYYY.M.D` 归一到同一 8 位键（`2026-09-18`⇄`2026年09月18日`） |

抓取侧 haystack = `dom.html` 可见文本（去 style/script）+ **文本属性**（`alt`/`title`/`aria-label`/`content`/`placeholder`/`value`，不含 `class`/`id`/`href`/`src`）+ `nodes.json` 的 `name`/`text`。

**修复实现中的自身缺陷**：初版 `compactIndex` 按 UTF-16 码元迭代，代理对 emoji 被拆成两个孤立代理，`\p{S}` 无法匹配 ⇒ 带 emoji 的源文本与「去掉 emoji 的模型值」判为不等。改为按**码点**迭代后消除（`sspai-com/matrix` 两条因此归位）。

## 2. 最小信息量阈值（防假阳性）

| 阈值 | 规则 | 理由 |
|---|---|---|
| T1 数字 | `num`/`money` 仅当 `|值| ≥ 10` 参与 | 0–9 与 <10 小数（`1`、`2`、`0.5`）在边距/类名/序号/计数里随处可见，命中证明不了溯源 |
| T2 文本/日期 | 压紧后 ≥ 2 字符且含 ≥1 个字母（`\p{L}`，含 CJK）；纯拉丁/数字需 ≥3 字符 | 单字符（`a`、`笔`）、纯数字文本（`357`、`15%`）排除；2 个汉字信息量与 3+ ASCII 相当 |

被阈值排除的值**不计入扫描分母**（诚实分母，不注水）。

## 3. 首轮扫描统计（给用户看的诚实数字）

| 指标 | 值 |
|---|---|
| 扫描页数 | 42（exemplar） |
| 事实值总数 | 4073 |
| **参与判定**（过阈值） | **3659** |
| 阈值排除 | 414 |
| **未命中** | **44** |
| ├ 真错（模型值与抓取不符） | **3**（已全部修正） |
| ├ 合法转换（进白名单） | **37** |
| ├ 采集缺口（待采集，附证据） | **4** |
| └ 未处置（门禁失败） | **0** |

> 说明：规范化规则（尤其 R4 不可见格式符 + 码点迭代）把首扫未命中从 54 降到 44；剩余 44 条逐条处置如下。

## 4. 逐页处置

### 4a. 真错 ⇒ 按抓取改正（3 条，`m1/curated/linear-app/home.json`）
| 路径 | 旧（错） | 新（按 corpus） | 抓取原文 |
|---|---|---|---|
| `proof._summary` | `world-class teams` | `world-class product teams` | `...principles of world-class product teams.` |
| `proof._lines[1]._detail` | `ship with high standards` | `ship with high velocity` | `...teams ship with high velocity.` |
| `changelog._items[1]._title` | `Ride rows reset fix` | `Reset dimmed ride rows` | `[generic] Reset dimmed ride rows` |

（价格类真错本轮未复现：`aliyun-com/product-ecs` 的 99/1438.68/3459.9 全部数值命中抓取，见首扫 0 数字未命中——第 37b 轮的修正已生效。）

### 4b. 合法转换 ⇒ 白名单（37 条，`m1/eval/capture-integrity-allow.json`，`kind:"conversion"`）
- **正文省略上标脚注标记**（源站 `<sup>` 数字导致压缩串多出数字）：apple 各页 13 条。
- **多单元格/多分句以 `·` 拼接**（源站分列单元格）：apple 7 条。
- **分期/价格文案改写**（合并官网两行价格）：apple `._summary` 3 条。（apple 计 23 条）
- **正文编辑性改写/缩写**（保留全部数字与事实点，非逐字）：`aliyun-com/product-ecs` 4、`sspai-com/post-102392` 5、`gov-uk` 1、`linear-app` agents 尾句 1、`stripe-com/pricing` 1。
- **元数据聚合/栏目名合成**：`36kr-com/home` `_source` 1、`36kr-com/information-technology` `资讯频道` 1、`sspai meta._detail` 1。

### 4c. 采集缺口 ⇒ 采集待办（4 条，`kind:"capture-gap"` + `evidence`）
| 页 | 值 | 证据 |
|---|---|---|
| `linear-app/home` | 客户 logo `Vercel` / `Figma` / `Coinbase` | `dom.html`/`nodes.json` 0 次命中；同排 `OpenAI`/`Ramp` 有文本节点 ⇒ 疑内联 SVG 未渲染为文本 |
| `sspai-com/post-114699` | 作者 `少数派编辑部` | 两文件 0 次命中（作者区未产出文本节点） |

## 5. 接线与自测
- pipeline 新增 **第 9 道门禁**（`capture-integrity.mjs`，不通过即失败）+ **第 9 套自测**（`capture-integrity-selftest.mjs`，17 断言：构造 1238 未命中⇒必报、1438.68 归一命中、全/半角与实体、日期、文本属性、T1/T2 阈值、白名单理由强制、缺口证据强制）。
- 复用 `metrics.mjs` 的 `factValues`/`suppressedNodes`（改导出，行为不变）⇒ 「什么算一个事实」只有一处定义。

## 6. 收尾复跑（`node m1/eval/pipeline.mjs --shots`）
- 保真 HTML **42/42** · Markdown **42/42** · 模型校验 **48** · **九套自测** · 视觉自查 **42/42 干净** · 证据一致性**通过** · 采集↔模型一致性**通过**。
- 首轮扫描：42 页 / 4073 事实 / 参与判定 3659 / 未命中 0（真错 3 已修、白名单 37、采集缺口 4）。

## 7. 待办
- **采集缺口 4 条**（上表）：需补采 `linear-app` 客户 logo 的 SVG 文本/`aria-label`、`sspai` 作者区文本；补采后应能移出 `capture-gap`。
- 全库其余 68 个 support 页未纳入本门禁（门禁只跑 exemplar 42 页；扩到 support 需另立一轮，避免本轮范围膨胀）。

## 8. 残余风险
- 白名单 37 条中约 27 条是**正文非逐字**（编辑性改写/缩写）。这是策展风格，但确实无法逐字溯源；`白名单条数 = 无法逐字溯源的事实数`已如实计入。若要「正文也必须逐字」，需另立一轮回改这些正文（超出本轮 40 分钟与授权）。
- T1 阈值（|值|≥10）使 <10 的金额（如 `money:9.9`/`0.09`）不参与判定——已知覆盖缺口，已在规则表说明。
