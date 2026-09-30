# 轮 18 · 第二个渲染目标（纯文本）：用实现检验「一份元语渲染到任意前端形态」

> 状态：已跑完。最后一行 `TEXT_RENDER_DONE ...` 即完成标记。
> 新增：`m1/render-text.mjs`、`m1/eval/text-selftest.mjs`；修改：`m1/eval/pipeline.mjs`（加第 5 道门禁）。
> 写报告之外还产出：`.tmp/text-renders/*.txt`（42 个策展模型的文本产物）。**未改 `m1/render.mjs` 语义、未改 42 个模型、未改 `corpus/`、未新增语法、未 git 提交。**

## 0. 目标与约束

核心主张：**同一份业务元语（蓝图）能渲染到任意前端形态**。此前只有 HTML 一个目标，主张未被检验。本轮写第二个渲染器 `m1/render-text.mjs`，输入**同一份模型**，输出**纯文本**。

**硬约束**：文本渲染器只允许 `import ./model-lib.mjs`，**绝对不得 import `./render.mjs`**。
结果：**可以在不 import render.mjs 的前提下写出来**——代价是把「引擎侧轴决策」整套**重抄**进文本渲染器（§2 泄漏清单就是这份重抄的账）。这本身证明：**轴语义目前活在 HTML 渲染器里，而不是共享模型层里**。

CLI：`node m1/render-text.mjs <model.json> <out.txt>`。

## 1. 文本目标的轴语义映射（F-031）

| F-031 轴语义 | 文本表达 |
|---|---|
| 行 = 可比（成员可横向对照） | 文本表：成员为**列**（有属性时按属性成行对齐） |
| 数据表（`_fields`，行=记录） | 文本表：成员为**行**、已声明属性为**列** |
| 堆叠（不可比） | 竖排分节，**每节自带标题**（`##`），无标题块用 `----` 区域分隔 |
| 对比集 `_rel.compare` | 文本表：**实体为列**、共享属性为行（表头含名/标签/价格/副标题/摘要/控件/嵌套集合） |
| 图片 | `[图片] <alt>`；空 alt 仍输出 `[图片]`（F-055 不消失） |
| 控件（`_action.label`） | `[标签]`；标题本身是控件时输出 `[标题]` 而非标题 |
| `_expose` 组 | 单选 `( ) 选项`；多选 `[ ] 选项`；无 `_label` 时输出 `单选`/`可多选`（**绝不印内部 expose 名**） |
| `_rel.level ≥ 2` | 缩进的 `参考:` 分节 |
| `_when` / `_action.when` | 与 `model-lib.scopeFor` 相同的链式作用域求值 |

## 2. 语义泄漏清单（本轮最重要的产出）

**问题**：为了写文本渲染，我**必须**知道的、模型里没有、只活在 `render.mjs` 里的「HTML 专有」信息有哪些？

| # | 必须知道的信息 | 实现位置（file:line） | 模型里有吗 | 是否应上移 model-lib | 理由 |
|---|---|---|---|---|---|
| 1 | 表单选择启发式 `selectForm`（table/chips/cards/deflist/accordion/stack/seq…） | `render.mjs:113` | 无（F-030 规定由引擎自判） | **应上移** | 第二个目标必须复刻同一套轴决策，否则**同一模型在不同目标间形态漂移**。「引擎职责」≠「HTML 渲染器私有」 |
| 2 | 可比性判据 `comparable()` 及其阈值（`avgSim≥0.6`、`maxLen≤400`、长度比≤4、`childCount≤2`） | `render.mjs:230` | 无 | **应上移** | 任何目标做「行 vs 堆叠」都要它 |
| 3 | 对比集成表判据 `compareRowKeys/compareStats/compareSetVerdict` + `COMPARE_MIN_FILL=0.4`（退化判据） | `render.mjs:424–476` | 只有 `_rel.compare` 布尔 | **应上移** | 规则已在 `layout-axes.md §3` 文档化，但**实现只在渲染器**；文本目标必须逐字重抄才能给出同样的降级理由 |
| 4 | 货币字形 `CURRENCY_GLYPH` | `render.mjs:26` | 只有 ISO 币种码 | **应上移**（M5 品牌层已登记「货币字形」） | 显示层常量，不属于任何单一目标 |
| 5 | `LIST_QUALIFIER = 'list'`（`_amount.qualifier==='list'` = 原价标记） | `render.mjs:30` | 值里有 `qualifier:"list"`，但**含义只写在渲染器注释** | **应上移**（`vocab.qualifiers` 闭式化） | 这是**模型级词表魔数**：别的目标会把 `list` 当前缀印出来、或把它当普通限定词 |
| 6 | `ROLE_UNIT`（`_rating→分`、`_rating-count→条评价` 兜底单位） | `render.mjs:269` | 无 | **应上移**（`vocab-units.json`，active-work 已登记） | 避免「裸数字无归属」，是语义不是版式 |
| 7 | `isProseItem` + 连续 `_text` 段落合并（P3） | `render.mjs:109` / `renderNode` | 有 `_text`，无合组规则 | **应上移** | 「段落不是区块」是语义 |
| 8 | `_primary` 主指：解析 + **在原位置隐藏避免重复** | `render.mjs:570–579` | `_primary` 在模型 | **应上移** | 「主指只出现一次」是语义；文本里我复刻成 `★ 主指:` |
| 9 | 链接目标合法性白名单 `hasTarget` + `key:`→`#锚点` 归一 `hrefOf` | `render.mjs:359–361` | 有 `to` | **应上移** | 目标归一应在共享层；文本也需判断「有没有可跳转目标」 |
| 10 | `key:` 引用的标签索引 `REF_LABELS`/`indexRefLabels` | `render.mjs:243` | 有 `_key`/`_title` | **应上移** | `model-lib` 有 `findKey` 但无标签索引，每个目标都得自己建 |
| 11 | 表格列名规则（身份列=成员名必含；列名只用已声明域字段，**绝不印内部键**） | `render.mjs:298–328` + `layout-axes.md §3.3` | 部分（`vocab-fields.json` 已共享） | 实现**应上移** | 规则共享、实现私有，导致重抄 |
| 12 | `META_KEYS`（哪些角色进 meta 行） | `render.mjs:602` | 无 | 可留在渲染器，但需共享才一致 | 纯版式分组，目标差异可接受 |

**一句话结论**：模型声明了「**是什么**」（`_items`/`_lines`/`_rel.compare` 布尔/角色事实），但「**这些集合该排成行还是堆叠、对比集是不是真表、主指藏在哪**」这套**轴决策**至今**只存在于 `render.mjs`**。第二个目标不共享它，就只能重抄。这正是「一份元语渲染到任意形态」主张**目前最脆的地方**——元语够用，但**轴语义没被上移到共享层**。

## 3. 度量是否 HTML 耦合？（本轮第二个诚实发现）

**做法**：把 `m1/eval/metrics.mjs` 直接指向文本产物（它按文件读、`pageText()` 去标签、`indexNorm()` 归一后判「已渲染」）。

```
node m1/eval/metrics.mjs m1/curated/<k>.json .tmp/text-renders/<dash>.txt   # 对 42 页全跑
```

**结果**：**可以测，且测出了东西**——文本产物 **42/42 事实保真 1.00**。更关键的是，**它第一遍就把我文本移植里的 7 处真实漏项抓了出来**（`_summary`/`_tag`/`_price` 对比表表头缺失、控件只印 label 丢内容名、实体嵌套集合未进列），每处都给出 `path := "value"`：

- `aliyun-com/product-ecs`、`apple-com-cn/iphone-17`：对比表表头字段缺失；
- `apple-com/home`、`bilibili-com/video-*`、`gov-uk/ni-rates-letters`、`grafana-play/play-home`：控件/选项的**内容名**被 `[label]` 覆盖而丢失。

**结论**：`metric_coupled = no`。保真度量**不绑 HTML，绑「读者可见文本」**——它能同时给 HTML 与文本目标当门禁。这正是「同一份模型可跨目标」的正面证据。

**残留耦合（仍在，但不影响保真）**：
1. `pageText()` 用 `/<[^>]*>/g` 去标签——若某事实文本**自身**含 `<…>` 对，会被当标签抹掉（可能掩盖一个真缺失）。文本目标没有这个假设。
2. 「已渲染」的边界判定 `<>` 分隔符是为 HTML 标签边界调的；纯文本里无标签，边界退化为空白/标点。本轮 42/42 未触发误判。
3. `storyline`（Kendall tau）需要 `corpus/<k>/nodes.json`（源站派生），与渲染目标无关，不是耦合。

## 4. 42 页文本产物里最不像人读的 5 处

| 页 | 现象 | 归因 |
|---|---|---|
| `taobao-com/home` | 四个会场区块只剩裸价格：`# 百亿补贴 · 买贵必赔` 下连着 `¥14999 / ¥6299 / ¥4999…`，**没有商品名** | **模型语义缺失**（采集未拿到商品名，R6 已知缺陷）；文本只是把它暴露得更刺眼。其内部标识符 `search-scope`/`feed-category` 一度被印成分组标题，已修为不印内部名 |
| `mi-com/home` | 主视觉区 10 张全宽图全部退化为裸 `[图片] ×10`，位置与内容全丢 | **文本目标局限 + 采集无 alt**：源站无可读文本背书（F-025 禁截图转写），文本无法还原图序 |
| `apple-com/iphone-16` | 选项把 label 与 detail 直接连成一句：`( ) Select a smartphone Answer a few questions to get your estimate.` | **文本目标局限**：无视觉容器分隔名与说明；HTML 里是两个 span |
| `huawei-cn/consumer-phones` | 45 个产品逐条竖排，每个产品下跟一枚 `[购买]`；源站是横向对比 | **文本目标 + 模型**：模型把产品放 `_lines`（异质声明），文本按声明竖排；横向对照轴没被激活 |
| `aliyun-com/product-ecs` | 对比表表头把「名+价格+摘要+控件」串成一整行，单行极长 | **文本目标局限**：文本表单元格不能内部分行/换行 |

（另：`mi-com/product-detail-mi15` 里 `[加入购物车]` 等原先被渲染成 `###` 标题，已修为 `[标签]`——本清单定稿前的自查修正。）

## 5. 自测（第 5 道门禁）

`m1/eval/text-selftest.mjs`：**13 条构造断言**（≥6 达标），覆盖 表格 / 堆叠 / 图片退化（含空 alt 不消失）/ 控件 `[标签]` / 单选 `( )` / 多选 `[ ]` / `_when` 作用域（祖先事实 + 祖先 `_expose` 名）/ 对比集成列 / `level≥2 参考` / 文本保真走同一度量。已接入 `pipeline.mjs` 作**第 5 道门禁**（失败即 pipeline 退出码 1）。

## 6. 交付与验证

- 文本渲染：`42/42` 无异常（`.tmp/text-renders/`）。
- 文本保真（`metrics.mjs` 指向 `.txt`）：`42/42` 事实保真 `1.00`。
- HTML 侧未被触碰：`pipeline.mjs` 全绿（42/42 保真 + 48 模型校验 + 四套自测）。
- 未 git 提交；无暂存文件。

---

TEXT_RENDER_DONE models=42/42 leaked_semantics=12 metric_coupled=no selftest=13 fidelity=42/42 audit=clean
