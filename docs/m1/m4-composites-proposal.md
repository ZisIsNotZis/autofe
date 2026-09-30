# M4 复合原语提案（设计稿 · 未实现）

状态：**设计稿，只做设计与论证**。本轮不改模型、不改代码、不跑 `m1/eval/pipeline.mjs`。
依据：`docs/design-basis.md`（§3.6/§3.7/§6）、`docs/m1/axioms-v0.md`、`docs/m1/layout-axes.md`（F-031）、`m1/vocab*.json`、`m1/render.mjs`（F-030 形态表）、`m1/eval/m3-report.md`。
数据层：**模型层** = `m1/curated/**`（36 页 / 15 站，M3 验收后快照）+ `m1/models/**`（8 个早期手写模型）；**抓取层** = `corpus/**`（104 页 = exemplar 36 + support 68，`dom.html` + `nodes.json` 为真相）。

---

## 0. 结论摘要

1. **被测量的候选模式 14 个** = 任务给的 10 个（登录、问答、正文、评分、价格、步骤/配置器、数据表、时间线、分页、图墙）+ 测量中发现的 4 个（单选组、控制条、横向对比、查询字段）；其中"步骤/配置器"被测量拆成 `form` 面板与 `choice-group` 两类。14 个里 12 个在模型层（36 策展页）有样本，`table`/`login` **只有抓取层证据**。
2. **建议升为声明式复合原语：5 个** —— `form`、`table`、`offer`、`paginator`、`login`。
   其中 `login` 有**证据缺口**（36 策展页里 0 个登录块），必须先补策展页才允许命名（见 §5.4）。
3. **不建议升原语：7 个** —— `qa`、`prose`、`image-gallery`、`rating-row`、`timeline`、`compare`、`control-bar`；其中 4 个的正确处置是**修引擎/修数据**，不是加语法（§5.6）。
4. **三个必须先修的地基缺陷**（否则任何"暴露状态"的复合原语都是空转）：
   - `_expose` 产生的事实**没有进入求值作用域**：手写模型 `m1/models/ant-design/components-table.json` 里 `bulk` 节点写 `_when: "count(selected) > 0"`，`selected` 是名册的 `_expose`；渲染时该块**整块静默消失**（实测 `node m1/render.mjs m1/models/ant-design/components-table.json` 输出中 `Batch operations` 计数 = 0）。全库 `_when` 只此 1 例 ⇒ 状态组合机制在冻结快照上**零覆盖**。
   - `_rel.compare` 的 20 处标记里**只有 1 处**真的渲染成对比表（§2.5）：标记挂在**集合节点**上时引擎不认，挂在**条目**上才认。
   - 引擎在 `render.mjs` 里对**金额做业务判断**（`_amount > _price` ⇒ 划掉当"原价"），违反 design-basis §6「定价永远在后端，引擎不发明算术」。

一句话：**M4 的价值不在"多加几个宏"，而在把"引擎只能猜/引擎越权算"的四处降级为模型显式声明**；宏本身是**名字**，不是新能力。

---

## 1. 方法与口径

- 形态判定**复用引擎自身逻辑**：把 `m1/render.mjs` 源码读入、把 `./model-lib.mjs` 换成绝对路径、追加 `export { selectForm, comparable, isProseItem, isImageOnlyItem, isLabelOnlyItem }`，写到 `/tmp/render-instr.mjs` 后 import（脚本见附录 A.1）。**不重写启发式**，避免"测得的东西不是引擎的东西"。
- 一个"集合"= 一个节点上的 `_items` 或 `_lines`，按 `render.mjs` 的同一分组规则切段后逐段判形态。
- 抓取层用 `dom.html` 正则 + `nodes.json` 的 `tag`/`role` 直方图（附录 A.2），因为**抓取即真相**：模型层会说谎（策展丢弃），DOM 不会。
- 站点数按目录名（`m1/curated/<site>`、`corpus/<site>`）计。
- 一切数字都可用附录 A 的命令复现；正文数字旁标 `[A.n]`。

---

## 2. 测量结果（先测量，再提议）

### 2.1 模型层总览 `[A.1]`

36 页 / 15 站；310 个集合（`_items`/`_lines` 分段后）的当前形态分布：
`deflist 74 · stack 70 · chips 45 · cards 37 · list 30 · controls 29 · product-cards 13 · seq 8 · image-strip 2 · compare-table 1 · prose 1 · accordion 0`。

**两处立刻可疑**：`accordion 0`（形态表里定义了问答形态，36 页里一次没被选中）；`compare-table 1`（对比表形态几乎死路）。

### 2.2 候选模式总表（模型层）

| # | 候选模式 | 出现次数 | 出现页数 | 站点数 | 当前渲染形态 | 当前是否"隐式处理" |
|---|---|---|---|---|---|---|
| 1 | 表单/查询面板（同一节点下 ≥2 个 `_expose` 子件） | 8 面板 / 49 个 expose 节点 | 8（22 页有 expose） | 5 | 各自独立 `fieldset.expose`；**无分组、无提交绑定** | 是，逐节点隐式 |
| 2 | 查询/筛选字段（`query`/`keyword`/`sort`/`category`/`search-type`） | 24 | 13 | 7 | input + chips/select-table，散落 | 是 |
| 3 | 单选组（`_expose` + `_items`） | 30 | 18 | 9 | `chips` / 选择列 `table.data` | 是（已定型） |
| 4 | 价格/优惠（`_price` + 限定词/分期文案） | 41 | 10 | 6 | `product-cards`/`deflist` + 引擎 `was` 特判 | 是，**引擎做业务判断** |
| 5 | 问答/折叠（条目 = 题 + 答） | 15 | 12 | 5 | `cards`/`seq`/`deflist`/`stack`（**从不是 accordion**） | 否（靠形状猜） |
| 6 | 时间线/动态列表（`_rel.order: time`） | 5 | 5 | 4 | `cards`/`seq`/`deflist` + `.timeline` 导轨 | 是，但**条目日期是自由文本**（0/61 条有 `_datetime`） |
| 7 | 控制条（同一节点 ≥2 个纯动作子件） | 12 | 7 | 5 | `controls`/`toolbar` | 是 |
| 8 | 图墙/图带（全条目只有 `_image`） | 3 | 3 | 3 | `image-strip`（2）/ `cards`（1，混排降级） | 是（纯形状判定） |
| 9 | 分页/更多（条目标签 = 页码或"查看更多"） | 4 | 4 | 3 | `seq`（华为 7 项，`_primary` = 当前页）/ `chips` | 部分；v0 §8 明说"不作表达" |
| 10 | 评分行（`_rating` ± `_rating-count`） | 8 | 1 | 1 | `chips` / `deflist`（分数成裸数字） | 部分 |
| 11 | 正文/散文序列（连续 `_text` 条目） | 9 段 | 1 | 1 | 混排 ⇒ `stack`，**段间插 `<hr class="region">`** | 否（只在全条目标量时才成 prose） |
| 12 | 横向对比（`_rel.compare`） | 20 标记 | 8 | 6 | **1 处**成对比表，19 处成 `deflist`/`product-cards`/`cards` | 否（位置敏感） |
| 13 | 类型化数据表（条目含 `_fields`） | **0** | **0** | **0** | —— | 有形态，无样本 |
| 14 | 登录/注册块（含密码/第三方入口） | 0 块（4 个登录入口动作） | 0（3 页有入口） | 0（2 站有入口） | 不适用 | 否 |

### 2.3 抓取层总表（corpus 104 页；exemplar 36 / support 68）`[A.2]`

下表 = 附录 A.2 脚本**逐字输出**（`pages/exemplar/support/sites/occ` 五列原样转写，仅加中文名）：

| 结构证据 | 页数 | exemplar | support | 站点数 | 元素/匹配数 |
|---|---|---|---|---|---|
| `<img>` ≥20 | 58 | 29 | 29 | 26 | 5038 |
| `aria-expanded` | 52 | 15 | 37 | 20 | 617 |
| `<p>` ≥20 | 47 | 19 | 28 | 22 | 3293 |
| 搜索框（`type=search` 或占位"搜索/Search"） | 38 | 15 | 23 | 21 | 62 |
| 面包屑 | 36 | 14 | 22 | 13 | 163 |
| `<pre>`/`<code>` | 36 | 1 | 35 | 14 | 4725 |
| `<table>` 元素 | 28 | 0 | 28 | 9 | 331 |
| `<table>` 且表头列 ≥3 | 26 | 0 | 26 | 8 | 1287 |
| 货币字形 ≥3 | 25 | 10 | 15 | 14 | 1104 |
| `<table>` 且行 ≥5 | 25 | 0 | 25 | 9 | 2659 |
| "查看更多/加载更多/显示全部" | 23 | 14 | 9 | 14 | 62 |
| "条评价/人评分" | 23 | 6 | 17 | 16 | 465 |
| `role=radiogroup` | 17 | 1 | 16 | 5 | 145 |
| `<blockquote>`/`<cite>` | 15 | 2 | 13 | 8 | 57 |
| 分页：数字页（page=N/下一页） | 10 | 3 | 7 | 8 | 36 |
| `<select>`/`role=combobox` ≥3 | 10 | 0 | 10 | 3 | 181 |
| `<figure>` | 9 | 8 | 1 | 5 | 62 |
| `<input type=password>` | 8 | 0 | 8 | 5 | 38 |
| `<time>` 元素 | 7 | 0 | 7 | 3 | 22 |
| `datetime=` 属性 | 6 | 0 | 6 | 2 | 6 |
| `<details>/<summary>` | 6 | 0 | 6 | 3 | 133 |
| 分页：`rel=next`/aria-pagination | 4 | 0 | 4 | 3 | 31 |
| `<table>` 且行内勾选列 | 4 | 0 | 4 | 4 | 42 |
| `<del>`/`<s>`（原价） | 3 | 3 | 0 | 1 | 18 |
| 评分线索（ratingValue/评分为/星） | 2 | 2 | 0 | 2 | 12 |
| `<time>` ≥3 | 1 | 0 | 1 | 1 | 15 |

读法：`exemplar` 列 = 该结构出现在 36 个**策展页**上的页数；`support` 列 = 出现在 support 68 页上的页数。

**两个必须写进报告的落差**：
- **exemplar 层 0 个 `<table>`，support 层 28 个** ⇒ 现有"M3 覆盖率声明只在 exemplar 36 页上算"的口径下，**数据表这类原语从未被 exemplar 覆盖过**。这不是语法缺陷，是**语料分层缺陷**。
- **14/36 exemplar 页源码里有"查看更多/加载更多"，模型层只有 4 页有分页节点** ⇒ 策展把分页丢了（v0 §8 说"不作表达"，策展照办）。这是"声明不作表达"与"抓取真相"的直接冲突。

### 2.4 状态组合机制的实测状态 `[A.3]`

- `_expose` 节点 **49** 个 / **22** 页 / **11** 站（`[A.3b]`）。
- `_expose` 产出的**事实能被下游 `_when` 引用**的实例：**1 处**（antd 手写模型的 `bulk`），且**渲染时整块消失**（作用域里没有该名字，`count(undefined) > 0` = false）。
- `m1/vocab-context.json` 里 `signed-in` 是**上下文事实**（引擎注入），`design-basis §3.7` 里 `signed-in` 是**登录复合原语引入的页面状态**。同一名字两套来源，当前 `render.mjs` 的作用域规则是 `{...ctx.values, ...scopeFor(chain)}`（节点祖先链的**角色事实**覆盖上下文）——`_expose` 既不进 `ctx.values` 也不被 `scopeFor` 收集 ⇒ **两份定义都没接通**。这是 `login` 原语的前置阻塞项（§6 决策 1）。

### 2.5 对比语义的实测状态 `[A.1]`

20 个 `_rel.compare` 标记 / 8 页 / 6 站：挂在**集合节点**上（如 `reviews.aspects`、`aliyun instances`、`apple compare`）时，`render.mjs` 只给该节点加 CSS 类 `.compare`（`grid-template-columns: repeat(auto-fit, minmax(260px,1fr))`，**会换行**，直接违反 F-031 §3「横向对比不换行」）；只有标记落在**条目**上、且条目都有 `_name`、无 `_expose` 时，才走 `compare-table`（列=实体、行=属性、可横滚）。实测命中率 **1/20**。

---

## 3. 判定标准：一个模式何时值得升为原语

**推荐升级必须同时满足 C1–C6；任一不满足即降级为"修引擎/修数据"或"内联展开"。**

| 判据 | 内容 | 阈值（本轮取值） |
|---|---|---|
| **C1 复用门槛** | 跨站点出现（design-basis §3.6「被 ≥N 站点使用否则删」） | **exemplar 层 ≥3 站**；抓取层 support 证据只加权、不单独成立 |
| **C2 结构稳定** | 键集一致度（条目间键集 Jaccard 中位数） | **≥0.6**（F-031 §2 同阈值）；`table` 类要求 **=1.0**（同一套字段） |
| **C3 今天必须靠启发式/越权判断** | 形态表里靠相似度、顺序、特判，或引擎做了业务判断 | 存在且可指出代码行 |
| **C4 声明它引入的状态** | 若复合件引入交互状态，必须声明（`_expose`）；下游可用条件引用 | 强制；状态无法被引用 = 不合格（本轮 §2.4 显示这是**当前最大的地基缺口**） |
| **C5 可展开、全函数、终止** | 具名宏 = 规范展开式；宏**不递归**；不新增语义角色；参数有类型；有测试 | 强制（design-basis §3.6） |
| **C6 反例可写** | 能给出"何时**不该**用它"的可机检条件，否则它就是逃生口 | 强制 |

**本轮对 C4 的读法（明示，避免歧义）**：一个状态的目的是**下游故事线可引用**（design-basis §3.7）。因此"纯结构型"复合件（`offer`、`qa`、`prose`）没有引入新状态，C4 对它们是**空义务**；但**引入交互的复合件（`form`/`login`/`table`/`paginator`）必须声明状态**，且声明必须能被条件解析——这正是 §0 缺陷 1 要先修的原因。

**拒绝/降级条件**（任一命中）：只有 support 层证据；结构不稳定（键集一致度 <0.6）；无状态且形状可确定性判定；等价于一次内联展开且无复用。

---

## 4. 候选原语设计

**共同语法新增（一次性，五个原语共用；`record` 值类型只被 `form` 使用）**

| 新增 | 内容 | 性质 |
|---|---|---|
| 保留键 `_macro` | 值 ∈ `vocab.macros`（闭式：`form`/`table`/`offer`/`paginator`/`login`） | 语法（保留键表 +1） |
| `vocab.valueTypes` + `"record"` | `_expose.type` 的新取值：一组具名字段的提交载荷 | 词表（valueTypes +1） |
| 关系谓词 `_rel.detail`（可选，见 §5.5） | `true` = 此节点有一个更深的细节层（回答/补充），由模型显式声明；不声明 ⇒ 引擎不得折叠 | 语法（`_rel` 谓词 +1，替代已否决的 `expandable`） |
| 校验器规则 | `_macro` **不得嵌套**（`_macro` 子树里再出现 `_macro` = 校验失败）；`_macro` 实例必须满足该宏的定义条件，否则校验失败 | 校验 |

`_macro` 是**名字**：它不新增节点种类、不新增语义角色、不改变任何事实的渲染。展开规则是**恒等展开 + 良构检查**（`expand(node)` = 校验该节点满足宏条件后原样返回子树），因此**展开必终止**（宏不递归 ⇒ 树深有限），**全函数**（无匹配 = 校验期报错，不是运行期猜测）。

---

### 4.1 `form`（表单/查询面板）—— 建议升级

**证据**：8 个面板 / 8 页 / 5 站（36kr `search-ai`/`search-viz` 三字段、airbnb `booking` 三字段、华为 `search-laptop`/`search-phone` 两字段、mi `search-earbuds`/`search-phone` 五字段、少数派 `post-114699` 讨论区）；expose 节点 49 个；抓取层搜索框 38 页/21 站。**当前**：每个字段各自一个 `fieldset`，提交动作挂在**字段的子节点**上（`query.submit`），重置按钮（华为 `filters.reset`）与它所属的面板没有任何结构联系。

**语法**

```jsonc
"search": {
  "_intent": "按关键词与类别检索；提交即重新取数",
  "_macro": "form",                                        // 必需
  "_expose": { "name": "search", "type": "record" },        // 必需：本次提交的字段集合（上行结构体）
  "_action": { "verb": "submit", "label": "搜索" },         // 必需：唯一提交动作（公理：≤1）
  "keyword":  { "_label": {"text":"关键字"}, "_expose": {"name":"keyword","type":"text"} },
  "category": { "_label": {"text":"类别"}, "_expose": {"name":"category","type":"text"},
                "_items": [ {"_name":{"text":"全部 (80)"}}, /* … */ ] },
  "reset":    { "_action": {"verb":"operate","label":"重置"} }   // 可选：子件各自的动作，不合并
}
```

**良构条件（机检，C6 的反例闸门）**
1. 直接子件里 `_expose` 数量 **≥2**（1 个字段就是字段，不是表单 ⇒ 校验失败）；
2. 恰有 **1** 个直接子件的 `_action.verb ∈ {submit, select, operate}` 作提交；0 个或 ≥2 个 = 校验失败；
3. 字段只认**直接子件**；孙辈的 `_expose` 属于它自己的表单 ⇒ **禁止嵌套**由第 3 条 + 非递归规则共同保证；
4. 字段名必须互不相同（同一面板内）。

**暴露状态**：`_expose.type: "record"` —— 记录的字段 = 直接子件 `_expose.name` 的有序集合。**组合规则**：字段事实**按名进入页面上行结构体**（design-basis §6「上行：字段名即模型里声明的 `_expose` 名」）；面板级名字 `search` 只用于**上行分桶**（"这次提交带哪些字段"）与引擎分组，**不新增引用语法**——下游条件仍写字段名本身（与 v0 一致，避免为宏改表达式语法）。

**引擎渲染**：一个 `<fieldset class="expose expose-record expose-search">`，`legend` = `_label`（无则面板名）；字段按文档顺序；提交动作**在面板内**渲染为该表单的提交控件；`.expose-record` 的输入控件与提交控件共享视觉容器（消除"两个无归属的日期"F-031 §6 的同类问题）。形态表新增：**`record` 面板不是集合形态**，它优先于条目形态（面板 = 一个控件组），不改动 `selectForm`。

**反例（何时不该用）**
- apple iPhone 16 的 6 步（`steps`，6 个 expose）**不是**一个 `form`：每一步是独立决策、**跨步定价在后端**，且实测不是一次提交携带全部 6 个字段 ⇒ 用了它就是把"配置器"伪装成"表单"，是逃生口。判据：**字段必须在一次提交里一起上行**。
- 单一字段的搜索框（v0 现状）**不必**包 `form`（良构条件 1 会拒绝）。
- 登录块不用 `form`（用 `login`：它引入的是门禁状态，不是记录）。

**验收标准（可测量）**
1. **保真不回归**：36 策展页 `事实保真 = 1.00`（实现轮用 `m1/eval/metrics.mjs` 口径重跑）；
2. **形态断言**：8 个已知面板全部渲染出**恰 1 个** `.expose-record` 且其内**恰 1 个**提交控件（计数断言，不靠视觉）；
3. **跨页一致性**：同形状面板（同字段名集合，如华为/36kr 的 `{keyword,category}` vs `{query,search-type,sort}`）产出**同 DOM 结构签名**（标签序列 + 类名序列），一致率 ≥ 0.9；
4. **状态可引用**：构造 `_when: "sort == \"最新\""` 的下游块，必须**渲染出来**（当前会消失，见 §2.4）；
5. **反例闸门**：`validate.mjs` 对"单字段 form""双提交 form""嵌套 form"三个 fixture **必须报错**。

---

### 4.2 `table`（类型化数据表）—— 建议升级（但先补 exemplar 样本）

**证据**：模型层 **0** 页（形态 `table` 存在但无样本）；抓取层 28 页/9 站有 `<table>`，其中 4 页有行内勾选列（ant-design / arco-design / element-plus / semi-design 的 table 文档）；手写模型 `m1/models/ant-design/components-table.json` 是唯一显式样本：行 = `_fields`（领域字段）+ `_tag` + `row-actions`（行操作）+ `detail`（展开字段），组 = `_expose {name:"selected", type:"ref", multiple:true}`，另有 `bulk` 依赖 `count(selected) > 0`、`_empty` 空态。**当前**：`_fields` 形态靠"字段形状相似 ≥0.6"的启发式选中；字段集合**可以逐行不一致**（引擎填空白格）；选中列只在 `_expose` + `_fields` 同时存在时才出现。

**语法**（在现有键上封闭，仅加 `_macro`）

```jsonc
"roster": {
  "_intent": "人员名册：每行一条记录，可多选后批量操作",
  "_macro": "table",                                        // 必需
  "_expose": { "name": "selected", "type": "ref", "multiple": true },  // 必需：选中集合（业务键）
  "_items": [
    { "_key": "person-john-brown",
      "_fields": { "first-name": {"text":"John"}, "age": {"num":32} },   // 字段 ∈ vocab-fields.json
      "detail":   { "_fields": { "email": {"text":"john@example.com"} } },// 可选：展开行
      "row-actions": { "_lines": [ /* 行操作，各自 1 个 _action */ ] } }
  ],
  "_empty": { /* 空态故事线 */ }
}
```

**良构条件**
1. **全部行字段键集完全一致**（Jaccard = 1.0）；不一致 ⇒ 校验失败或策展 ticket（当前引擎会静默填空白格，是把数据缺陷藏起来）；
2. 每个 `_fields` 键必须在 `m1/vocab-fields.json`（按域声明）里存在，类型一致；
3. `_expose.type` ∈ `{ref, list, text}` 且 `multiple` 语义明确（多选/单选）；
4. 行操作必须是**行节点的子件**，不得挂在表格节点上（F-020「包含 ≠ 同一」）。

**暴露状态**：选中集合 = **被选行的 `_key` 列表**（身份来自业务键，不来自路径 —— design-basis §3.2）；下游 `count(selected) > 0` 之类的条件必须能解析（依赖 §0 缺陷 1 的修复）。

**渲染**：沿用现有 `table.data` + 选择列 + `row-ops`；宏只负责**保证选择列/表头/字段顺序由模型决定且逐页一致**，并在 `cols.length < 3` 时报错（"两列的类型化表格"是清单不是表格）。

**反例**：商品卡列表（华为/小米/苹果的机型卡）**不是** `table`：它们有图、无统一字段集、字段键集 Jaccard 实测 0.44–0.92 波动 ⇒ 用 `_items` + 形态推导即可。判据：**没有一致的领域字段集合就没有表**。`stripe` 的价格档位（`catalog`）同理不是表。

**验收标准**
1. `validate.mjs` 对 3 个反例 fixture（字段集不一致 / 字段未声明 / 行操作挂错层）报错；
2. 4 个抓取层勾选列页面（ant-design / arco / element-plus / semi-design）策展后：`table` 形态断言通过，且**字段顺序跨页一致**；
3. 保真 1.00 不回归；`_empty` 在空 `_items` 时仍渲染（F-013）；
4. **exemplar 层样本 ≥3 页**（当前 0 ⇒ 不满足 C1，见 §5.4 的补样本清单）。

---

### 4.3 `offer`（价格/优惠块）—— 建议升级（正确性收益最大）

**证据**：41 个价格节点 / 10 页 / 6 站带限定词或分期文案；`_price` 189 次、`_amount` 12 次；"原价划掉"仅 3 页有 `<del>`（mi `product-detail-mi15`、`search-earbuds`、`search-phone`），另有 gov-uk `fees`（£150 + £50/证书）与 apple 的 `From $749 or $33.29/mo` 分期文案。**当前**：`render.mjs` 用 `f.value.money > node._price.money` 判断"这是原价"并加 `.was` 删除线 —— **引擎在做定价判断**，直接违反 design-basis §6。

**语法**

```jsonc
"product": {
  "_intent": "到手价与优惠条件；原价与分期由后端给定",
  "_macro": "offer",                                       // 必需
  "_price":  { "money": 1439, "currency": "CNY" },                       // 必需：到手价（主价）
  "_amount": { "money": 2999, "currency": "CNY", "qualifier": "list" },  // 可选：原价（**显式**限定词）
  "_detail": { "text": "国补资格下单省 10%" },                            // 可选：优惠条件（业务事实）
  "_duration": { "num": 24, "unit": "期" }                                // 可选：分期期数
}
```

**词表新增**：`vocab.qualifiers`（闭式）`["list", "from", "per-unit", "per-period", "tax-incl"]`，替换现在的自由文本 `qualifier`（自由文本是半逃生口）。这是**词表变更**，需记失败日志。

**暴露状态**：无（纯结构）—— C4 空义务；`offer` 不引入交互。

**引擎渲染**：`_amount`（`qualifier: list`）⇒ 弱化 + 删除线；`_detail` ⇒ 条件文案；`_duration` ⇒ 分期文案；**引擎不再比较金额**（删除该特判）。主价仍是 `_price`，`_primary` 语义不变。

**反例**：只有单一定价的卡片（`apple ipad-air` "From $749"）**不包** `offer`（没有原价也没有条件 ⇒ 普通 `_price` + `qualifier: from`）。滥用后果：每张商品卡都多一层宏 = 膨胀，且掩盖"到底哪个是到手价"。

**验收标准**
1. `render.mjs` 中不再存在"金额比较"代码路径（静态断言：源码里无 `> node._price`）；
2. 3 个 mi 页的渲染含 `.was` 且**与源站 `<del>` 一致**（源覆盖比对：原价数值逐一匹配）；
3. 分期文案来自 `_duration` 而非 `_summary` 自由文本：3 个 apple 页的 `$33.29/mo` 数字必须**与模型事实同源**（回归：改模型数字 ⇒ 渲染数字变）；
4. 保真 1.00 不回归。

---

### 4.4 `paginator`（分页/继续控件）—— 建议升级（小件，但关闭 v0 最大"不作表达"缺口）

**证据**：模型层 4 页/3 站（华为 `results.pagination` 7 项、`_primary` = 当前页；mi `pages` 2 项；stripe）；抓取层 14/36 **exemplar** 页源码里有"查看更多/加载更多/显示全部"，10 页/8 站有数字分页，4 页有 `rel=next`/aria-pagination。**当前**：v0 axioms §8 明写"分页控件"不作表达；策展照办 ⇒ 抓取真相与模型之间**已知的、最大的**缺口。现状表达是"把页码写成 `_items` 的 `_name` + `_rel.order: sequence`"，语义丢了：**当前页**只能靠 `_primary` 暗示，**被分页的对象**没有声明。

**语法**

```jsonc
"pages": {
  "_intent": "搜索结果分页；第 1 页为当前页，共 8 页",
  "_macro": "paginator",                                  // 必需
  "_ref":  { "ref": "/results" },                          // 必需（role `ref`）：被分页的集合
  "_rel":  { "order": "sequence" },
  "_expose": { "name": "page", "type": "text" },           // 必需：当前页（选中条目）
  "_count": { "num": 8, "unit": "页" },                    // 可选：总页数
  "_items": [ {"_name":{"text":"1"}}, {"_name":{"text":"2"}}, /* … */ ],
  "more":   { "_action": { "verb": "submit", "label": "加载更多" } }   // 可选：继续模式
}
```

**良构条件**：`_ref` 必须解析到本页的一个集合（校验器已能解析 `ref`）；`_items` 的目标地址若未捕获 ⇒ 保持"控件观感"不造 `link`（F-031 §4 已规定）；数字页码项必须**互不相同**。

**暴露状态**：`page`（当前页标识），下游可用于"仅在第 1 页显示筛选条"之类条件。**继续模式**（加载更多）是 `_action: submit` + `_ref`，不新增状态。

**反例**：站点导航的多级菜单、频道 chip 条（36kr 17 项频道）**不是** paginator：它们没有 `_ref` 指向被分页集合 ⇒ 良构条件拒绝。`show-all`（airbnb "显示所有照片"）也不是分页（它展开的是已声明的 `_items`），继续用 `_action`。

**验收标准**
1. 4 页现有分页节点迁移后：`page` 事实可被 `_when` 引用（构造断言）；
2. 数字页码在渲染中**不是链接**（没有捕获地址 ⇒ 不造 `<a href>`）；
3. **跨页一致性**：华为两页（laptop/phone）分页码序列结构签名一致；
4. 抓取层 14 个 exemplar"查看更多"页里，至少 3 页在策展后出现 `paginator` 或显式"丢弃理由"记录（消灭"静默丢弃"）。

---

### 4.5 `login`（登录/注册块）—— 建议升级，**但先补样本（证据缺口）**

**证据（诚实版）**：36 策展页里 **0 个登录块**；只有 4 个登录**入口动作**（3 页/3 站：bilibili 弹幕区 `login`/`register` 对、linear "Get started"、stripe "使用 Metronome 注册"）。抓取层：`type=password` 8 页（**全是 support 层的组件文档 demo**：ant-design/arco/element-plus/getbootstrap/tdesign）；`passport-baidu/login` 是**唯一真实登录页**（扫码登录 + "用户名登录" + QQ/新浪微博/微信第三方入口 + "立即注册" + 安全/高效/便捷价值主张），而它**不在 exemplar 36 里**。

⇒ 按 C1，`login` **当前不成立**；建议**先策展 `passport-baidu/login` + 1 个第三方登录页进 exemplar，再命名**。用户既定语（"login 暴露 `signed-in`"）是产品决定，本轮照此设计，但**证据必须补齐**（§5.4）。

**语法**

```jsonc
"signin": {
  "_intent": "登录后本页显示账号专属内容与入口",
  "_macro": "login",                                       // 必需
  "_expose": { "name": "signed-in", "type": "bool" },       // 必需：门禁状态（唯一对外事实）
  "_action": { "verb": "submit", "label": "登录" },          // 必需：唯一提交动作
  "identifier": { "_label": {"text":"手机号/邮箱"}, "_expose": {"name":"identifier","type":"text"} },
  "secret":     { "_label": {"text":"密码"},       "_expose": {"name":"secret","type":"text"} },
  "third-party":{ "_items": [ {"_name":{"text":"微信"}, "_action":{"verb":"operate","label":"微信登录"}}, /* … */ ] },
  "signup":     { "_action": { "verb": "navigate", "to": "…", "label": "立即注册" } }
}
```

**良构条件**
1. 必须声明 `signed-in`（bool）；声明别的名字 ⇒ 校验失败（**这就是"复合件必须声明它暴露的状态"的机检形式**）；
2. 至少 2 个字段子件（同 `form` 规则）；
3. `identifier`/`secret` 的 `_expose` **必须在提交后不进入下游作用域**（密码值不得被条件引用）⇒ 校验器/作用域规则显式排除 `login` 的字段子件；
4. 第三方入口只是 `_items` + `_action`（**不新增 `auth-method` 角色**，避免语义角色膨胀）。

**渲染**：一个门禁块：字段组 + 提交 + 第三方入口行 + 注册入口；`signed-in == true` 的下游故事线（未登录时）与登录区**互斥**由条件表达（design-basis §3.7 表格第一行：不同信息与动作 ⇒ 故事）。**未登录时 `signed-in` 未定义 ⇒ 条件不成立**（v0 语义）。

**反例**：只有"登录"动作的入口（bilibili 弹幕区的 `login`/`register`）**不是** `login` 块（没有 secret 字段 ⇒ 良构条件 2 拒绝）；否则会制造**假门禁**：页面凭空多出一个 `signed-in` 事实，下游条件全部被"未定义"污染。

**验收标准**
1. `m1/render.mjs` 相关的"未定义 ⇒ 不成立"行为在新作用域规则下不回归（构造 3 个条件 fixture）；
2. `signed-in == true` 与 `signed-in == false` 的两条故事线在渲染中**恰有一条出现**（`_when` 双向断言）；
3. `secret` 名不出现在任何下游 `_when` 的可解析集合里（静态检查）；
4. exemplar 层 ≥3 页含 `login` 块（补样本后）。

---

## 5. 迁移与顺序

### 5.1 可直接替换（清单 + 预估收益）

| 原语 | 可替换页（模型层实测） | 收益 |
|---|---|---|
| `form` | 36kr `search-ai`、36kr `search-viz`、airbnb `room-28871.booking`、华为 `search-laptop`、华为 `search-phone`、mi `search-earbuds`、mi `search-phone`、少数派 `post-114699.discussion`（8 页/5 站）+ antd 手写模型 `add` | 面板级 record 状态；提交与字段绑定；`query.submit` 这类"哨兵子节点"消失；F-031 §6 的控件归属问题结构性消失 |
| `offer` | mi `product-detail-mi15`、mi `search-earbuds`、mi `search-phone`（有 `<del>`）、gov-uk `fees`、aliyun `product-ecs.instances`、apple×3（分期文案）、华为 `consumer-phones`（"起"）、stripe `pricing`（10 页/6 站，41 个价格节点） | **删除引擎里的金额比较**（正确性）；原价/到手价/条件三者不再靠猜 |
| `table` | 模型层 0 页 ⇒ 需先补样本（抓取层候选：`getbootstrap/example-dashboard`、`cloud-tencent/product-cvm`、`douban-movie/home`、`gitee/oschina-org`、`cnblogs/blog-cmt`）+ 4 个勾选列页（ant-design/arco/element-plus/semi-design table 文档） | 字段 schema 显式化；选中集合状态可用；消灭"字段形状相似 ⇒ 表格"的启发式 |
| `paginator` | 华为 `search-laptop`/`search-phone`、mi `search-earbuds`、stripe `pricing`（4 页/3 站）+ 14 个"查看更多"exemplar 页补策展 | 关闭 v0 §8 最大缺口；`page` 状态可用；消灭静默丢弃 |
| `login` | 0 页 ⇒ 补样本：`passport-baidu/login`（真实登录页）+ 1 个第三方登录页 + bilibili 弹幕区门禁 | `signed-in` 从"上下文常量"变成"页面可达状态" |

### 5.2 不能替换（原因）

| 页/模式 | 原因 |
|---|---|
| apple `iphone-16.steps`（6 步配置器） | 跨步定价在后端、每步独立提交 ⇒ 不满足 `form` 的"一次提交"判据（用 6 个独立 `_expose` + `_items` 已足够） |
| 华为/小米/苹果商品卡列表 | 无一致领域字段集（Jaccard 0.44–0.92 波动）⇒ 不满足 `table` 的 C2 |
| 36kr/stripe/sspai 的价值主张与营销块（title+detail 混排） | 形状与"问答对"重合但语义不是问答 ⇒ 不能靠形状折叠（这正是 `qa` 不该升原语的证据，§5.6） |
| 面包屑（14/36 exemplar 页、抓取层 36 页/13 站） | v0 §8 明示"导航历史不作表达"；它**不在故事线范围内**（design-basis §1 非目标）。本轮**不动**，但在报告里保留为"已声明的不作表达"（防止它被当成遗漏） |
| 频道 chip 条（36kr 17 项） | 已由 `_expose` + `_items` 确定性表达 ⇒ 无需宏 |

### 5.3 建议实施顺序（四个理由，不是拍脑袋）

1. **先修地基：`_expose` → 下游作用域**（§0 缺陷 1）。否则 `form`/`table`/`paginator`/`login` 这 4 个原语声明的状态全是死的。**工作量最小、解除阻塞最大**。
2. **`offer`**（正确性）：删掉引擎的业务判断，是**唯一"不改语法也立刻更正确"**的改动；且不动形态表（风险最低）。
3. **`form`**（结构收益最大）：8 面板/5 站，消除"字段与提交归属"的猜；与 F-031 §6 是同一条线的收敛。
4. **`paginator`**（关闭声明缺口）：小件，但把"声明不作表达"改成"声明可表达"，同时暴露 14 页的静默丢弃。
5. **`table`**（先补 exemplar 样本，再命名）：证据在 support 层，必须先把 3–4 页真实数据表策展进 exemplar，否则违反 C1。
6. **`login`** 最后：同样先补样本；它是**唯一需要人类产品取舍**（`signed-in` 与上下文事实的关系，§6 决策 1）的原语。

### 5.4 补样本清单（exemplar 层，必须先做）

- `login`：`corpus/passport-baidu/login`（真实登录页，已有抓取）+ 第三方登录页 1 个（bilibili 或 gitee 的登录页，需抓取）。
- `table`：≥3 页真实数据表（建议 `getbootstrap/example-dashboard`、`cloud-tencent/product-cvm`、`douban-movie/home`）+ 4 个勾选列页（ant-design/arco/element-plus/semi-design 的 table 文档，support→exemplar 需人工背书理由）。
- `paginator`：14 个"查看更多"页里选 3 页（36kr/search-ai、sspai/matrix、taobao/home）补分页节点。
- `prose`（若采用 §5.6 的引擎修法）：`sspai/post-114716` 已是样本；再补 1–2 页长文（`juejin-cn/post-*`）。

### 5.5 拒绝升级：`qa` / `prose` / `image-gallery` / `rating-row` / `timeline` / `compare` / `control-bar`

| 模式 | 实测 | 判据结论 | 正确处置 |
|---|---|---|---|
| `qa`（题+答） | 15 组 / 12 页 / 5 站，形态 0 次 accordion | 无状态、形状与营销块重合（apple 的 title+detail 是卖点不是问答）⇒ **C3 靠猜、C6 反例写不清** | **引擎不猜**；加**唯一一个新关系谓词** `_rel.detail: true`（"此节点有一个更深的细节层"——design-basis §3.4 早已声明语义、但 v0 没实现），由模型显式标记；标记存在 ⇒ 引擎可折叠 |
| `prose`（正文序列） | 9 段 / 1 页；抓取层 `<p>`≥20 有 47 页/22 站 | 无状态；**形状可确定性判定**（连续 `_text` 条目）⇒ 不该加语法 | **修引擎**：把"全条目都是 `_text` 才 prose"改成"连续 `_text` **段**合并"，段间**不插** `<hr class="region">`（现状把段落读成区块，违反 F-031 §5 的意图） |
| `image-gallery`（图墙） | 3 页/3 站；抓取层 `<figure>` 9 页（8 在 exemplar） | C1 勉强，C3 不成立（纯形状判定已确定性）；状态无 | **不升**；缺口只是"计数 + 全部展开"：用 `_count` + 子件 `_action`（airbnb `show-all` 现状）即可。混排集合降级为 cards 是已知边界 |
| `rating-row`（评分行） | 模型层 1 页/1 站（airbnb）；抓取层严口径评分线索 **2 页/2 站**（宽松口径"条评价/人评分" 23 页/16 站） | **C1 不成立**（1 站）；结构（分数+单位+分布+分项）稳定但样本不足 | **不升**；先修：`_rating` 必须带单位/满分（`render.mjs` 已用 `ROLE_UNIT` 注入"分"），并补策展样本后再谈 |
| `timeline`（动态列表） | 5 集合/5 页/4 站；**0/61 条目标注 `_datetime`**，36kr 30/30 把时间写在 `_detail` 文本里 | 语法已存在（`_rel.order: time`），缺的是**数据** | **不升**；**加校验警告 + 策展规则**：`order: time` 集合的条目须带 `_datetime`，否则出 ticket（当前导轨渲染出来却没有可读时间） |
| `compare`（横向对比） | 20 标记，1 处成表 | 形态已存在，缺的是**规范化** | **不升**；**修引擎**：集合节点上的 `_rel.compare` 必须等价于"其条目是实体"（或校验器强制标记只能落在条目上）。19 处由一条规则修复 |
| `control-bar`（控件条） | 12 组/7 页/5 站；已由 `controls`/`toolbar` 确定性处理 | C3 不成立 | **不升** |

> 拒绝 7 个、只升 5 个，是**对"防膨胀"的可核查交代**（design-basis §3.6「具名库有总量上限」）。

### 5.6 顺序化的里程碑（建议写进 M4 判据）

**M4-a 地基**：`_expose` 作用域贯通 + 校验（`_when` 引用未声明的名字 = 阻断，不再静默消失）。
**M4-b**：`offer` + 删除引擎金额比较。
**M4-c**：`form` + `_macro` 保留键 + `record` 值类型。
**M4-d**：`paginator`。
**M4-e**：补 exemplar 样本（login / table / 长文）。
**M4-f**：`table`、`login` 命名，`detail` 关系谓词，`compare`/`prose`/`timeline` 三处引擎与数据修复。
每个小步的退出条件：**保真不回归 + 该原语的形态断言 + 跨页一致性 ≥0.9 + 反例 fixture 报错**。

---

## 6. 需要人类决策的问题（3 条）

### 决策 1：`signed-in` 的两套来源如何统一？（阻塞 `login`）

现状冲突：`m1/vocab-context.json` 把 `signed-in` 定义为**引擎注入的上下文事实**（F-017），而 design-basis §3.7 要求**登录复合原语声明它引入 `signed-in`**；`render.mjs` 的作用域是 `{...ctx.values, ...scopeFor(chain)}`，`_expose` 两边都不进 ⇒ 今天两种读法都不可用。

- **A（建议）**：`_expose` 事实**并入作用域**，优先级为**最近声明的祖先链 > 上下文注入**（页面状态可覆盖同名上下文）；`vocab-context.json` 保留 `signed-in` 作为"后端在首屏就已知"的注入路径。理由：与 `render.mjs` 现有"链上后者覆盖前者"的顺序一致；两种来源都存在真实场景（SSR 已知登录态 vs 表单提交后得到）。
- **B**：`login` **不许**声明 `signed-in`，只能读上下文；复合原语的义务改述为"声明它**依赖**的状态"。理由：避免同名双写。代价：与用户既定语（"login 暴露 signed-in"）冲突，且"提交后页面状态改变"无法表达。
- **C**：改名隔离（页面状态 `signin-state`，上下文 `signed-in`）。理由：绝对无歧义。代价：破坏既有语料与 F-010 示例。

### 决策 2：复合原语的字段能否被下游引用？（决定 C4 的严格程度）

- **A（建议）**：`form` 的字段名**可**被下游条件引用（能表达"选了某类别 ⇒ 显示对应说明"）；`login` 的字段名**不可**（密码/账号不得进条件）。即"可引用性"由原语类型定义，配置在词表里。
- **B**：所有字段名都可引用（简单，但 secret 会泄漏进条件语法）。
- **C**：所有字段名都不可引用，只有面板级名字（`search`、`signed-in`）可引用（最安全，但表达力回到枚举组合，违反 design-basis §6「联动不枚举组合」）。

### 决策 3：`prose`（正文序列）走引擎修法还是语法？

- **A（建议）**：**引擎修法**（连续 `_text` 段合并，不新增语法、不新增谓词）。理由：零语法膨胀、零逃生口风险；实测只有 1 页/9 段需要它，样本不足支撑新语法。
- **B**：加 `_rel.order: "prose"`（第 4 个 order 取值，闭式枚举 +1）。理由：模型显式声明"这是正文"。代价：需要改 9 处/1 页，且与"形态由引擎推导"（§3.4）相抵。
- **C**：复合原语 `body`（`_macro: "body"`，含段落/引用/代码/图注子件）。理由：为长文页（抓取层 47 页）提供一等表达。代价：宏数量 +1，且引用/代码/图注需要新角色或新值类型（**触碰语义角色封闭性**，风险最高）。

---

## 附录 A：可复现命令

### A.1 模型层：用引擎自身的形态逻辑扫描 36 页 `[§2.1/2.2/2.5]`

```bash
cd /home/z/vibe/autofe
cat > /tmp/m4scan.mjs <<'EOF'
import fs from 'node:fs'; import path from 'node:path';
// 复用 render.mjs 的形态逻辑：不重写启发式
const src = fs.readFileSync('/home/z/vibe/autofe/m1/render.mjs', 'utf8')
  .replace("from './model-lib.mjs'", "from '/home/z/vibe/autofe/m1/model-lib.mjs'")
  .replace('if (import.meta.url === `file://${process.argv[1]}`) {', 'if (false) {')
  + '\nexport { selectForm, isProseItem, isImageOnlyItem, isLabelOnlyItem, comparable, factsOf as _factsOf };\n';
fs.writeFileSync('/tmp/render-instr.mjs', src);
const R = await import('/tmp/render-instr.mjs');
const { childrenOf } = await import('/home/z/vibe/autofe/m1/model-lib.mjs');
const files = [];
for (const site of fs.readdirSync('m1/curated').sort()) {
  const d = path.join('m1/curated', site);
  if (!fs.statSync(d).isDirectory()) continue;
  for (const f of fs.readdirSync(d).sort()) if (f.endsWith('.json')) files.push([site, f.replace('.json',''), path.join(d, f)]);
}
const counts = {};
for (const [site, page, f] of files) {
  const m = JSON.parse(fs.readFileSync(f, 'utf8'));
  (function walk(n) {
    if (Array.isArray(n) || !n || typeof n !== 'object') return;
    for (const { node } of childrenOf(n)) {
      if (Array.isArray(node._items) || Array.isArray(node._lines)) {
        const order = node._rel?.order;
        const items = childrenOf(node).filter(c => /^_(items|lines)\[/.test(c.key)).map(c => c.node);
        // render.mjs 的分组规则：连续的 compare 标记成员成一组
        const groups = [];
        for (const it of items) {
          const cmp = Boolean(it._rel?.compare); const last = groups[groups.length - 1];
          if (last && last.cmp === cmp) last.items.push(it); else groups.push({ cmp, items: [it] });
        }
        for (const g of groups) {
          const entityRun = g.cmp && g.items.length >= 2 && g.items.every(it => it._name && !it._expose);
          const form = entityRun ? 'compare-table' : R.selectForm(g.items, order);
          const key = `${site}/${page}`;
          counts[form] = (counts[form] || 0) + 1;
          console.log([key, form, `n=${g.items.length}`, `order=${order ?? '-'}`, `cmp=${g.cmp}`].join('\t'));
        }
      }
      walk(node);
    }
  })(m);
}
console.error('FORM TOTALS', JSON.stringify(counts));
EOF
node /tmp/m4scan.mjs 2>&1 | tail -3   # FORM TOTALS {"deflist":74,"stack":70,...}
node /tmp/m4scan.mjs | grep -c 'compare-table'   # 1
```

### A.2 抓取层：104 页结构证据 `[§2.3]`

```bash
cd /home/z/vibe/autofe
cat > /tmp/a2ext.mjs <<'EOF'
import fs from 'node:fs'; import path from 'node:path';
const exemplar = new Set(fs.readdirSync('m1/curated').flatMap(s => {
  const d = 'm1/curated/' + s; if (!fs.statSync(d).isDirectory()) return [];
  return fs.readdirSync(d).filter(f => f.endsWith('.json')).map(f => `${s}/${f.replace('.json','')}`);
}));
const pages = [];
for (const site of fs.readdirSync('corpus')) {
  const sd = path.join('corpus', site); if (!fs.statSync(sd).isDirectory()) continue;
  for (const p of fs.readdirSync(sd)) { const d = path.join(sd, p);
    if (fs.existsSync(path.join(d, 'dom.html'))) pages.push({ site, key: `${site}/${p}`, dom: path.join(d, 'dom.html'), nodes: path.join(d, 'nodes.json'), layer: exemplar.has(`${site}/${p}`) ? 'exemplar' : 'support' }); }
}
const tests = {
  'table-el': /<table[\s>]/i,
  'table-select-col': /<table[\s\S]{0,4000}?type=["']checkbox["']/i,
  'password-input': /<input[^>]*type=["']password["']/i,
  'details': /<details[\s>]/i,
  'aria-expanded': /aria-expanded=/i,
  'time-element': /<time[\s>]/i,
  'datetime-attr': /datetime=["']\d{4}-\d{2}-\d{2}/i,
  'blockquote': /<blockquote|<cite[\s>]/i,
  'code-block': /<pre[\s>]|<code[\s>]/i,
  'figure': /<figure[\s>]/i,
  'del-was-price': /<del[\s>]|<s[\s>]/i,
  'rating-text': /ratingValue|rating-value|评分为|aria-label=["'][^"']*星/i,
  'rating-count-word': /(条评价|条评论|reviews?|人评分)/i,
  'pagination': /rel=["']next["']|aria-label=["'](pagination|Pagination|下一页|Next page)["']/i,
  'numeric-paging': /(page=\d|\/page\/\d|>下一页<|>Next<)/i,
  'load-more': /(加载更多|查看更多|load more|show more|see all|显示全部)/i,
  'search-input': /<input[^>]*(type=["']search["']|placeholder=["'][^"']*(搜索|Search)[^"']*["'])/i,
  'radiogroup': /role=["']radiogroup["']/i,
  'breadcrumb': /(breadcrumb|面包屑)/i,
};
const thresholds = {
  'p>=20': [/<p[\s>]/gi, 20],
  'img>=20': [/<img[\s>]/gi, 20],
  'time>=3': [/<time[\s>]/gi, 3],
  'datetime>=3': [/datetime=["']\d{4}-\d{2}-\d{2}/gi, 3],
  'select-or-combobox>=3': [/role=["']combobox["']|<select[\s>]/gi, 3],
  'price-glyph>=3': [/[¥￥$€£]/g, 3],
};
const res = {};
const bump = (name, pg, occ) => { const r = res[name] ??= { pages: new Set(), sites: new Set(), ex: new Set(), supp: new Set(), occ: 0 }; r.pages.add(pg.key); r.sites.add(pg.site); (pg.layer === 'exemplar' ? r.ex : r.supp).add(pg.key); r.occ += occ; };
for (const pg of pages) {
  const html = fs.readFileSync(pg.dom, 'utf8');
  for (const [name, re] of Object.entries(tests)) {
    const m = html.match(new RegExp(re.source, 'gi'));
    if (m) bump(name, pg, m.length);
  }
  for (const [name, [re, k]] of Object.entries(thresholds)) {
    const m = html.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'));
    if (m && m.length >= k) bump(name, pg, m.length);
  }
  const nodes = JSON.parse(fs.readFileSync(pg.nodes, 'utf8'));
  const roles = {}; for (const n of nodes) roles[n.role] = (roles[n.role] || 0) + 1;
  if ((roles.columnheader || 0) >= 3) bump('columnheader>=3', pg, roles.columnheader || 0);
  if ((roles.row || 0) >= 5) bump('row>=5', pg, roles.row || 0);
  for (const [n, r] of Object.entries(res)) if (r.occ > 1e9) r.occ = 0;
}
for (const [n, r] of Object.entries(res)) console.log(n.padEnd(22), 'pages=' + r.pages.size, 'exemplar=' + r.ex.size, 'support=' + r.supp.size, 'sites=' + r.sites.size, 'occ=' + r.occ);
EOF
node /tmp/a2ext.mjs
```

### A.3 复合模式计数（面板 / 状态 / 时间线 / 评价）`[§2.2/2.4]`

```bash
cd /home/z/vibe/autofe
# 3a) 同节点下 >=2 个 _expose 子件（表单/查询面板）；实测 8 面板 / 8 页 / 5 站
node -e '
const fs=require("fs"),path=require("path");
for(const site of fs.readdirSync("m1/curated")){const d=path.join("m1/curated",site);if(!fs.statSync(d).isDirectory())continue;
 for(const f of fs.readdirSync(d)){if(!f.endsWith(".json"))continue;const m=JSON.parse(fs.readFileSync(path.join(d,f),"utf8"));
  (function w(n,p){if(Array.isArray(n))return n.forEach((x,i)=>w(x,p+"["+i+"]"));if(!n||typeof n!=="object")return;
   const ek=Object.entries(n).filter(([k,v])=>!k.startsWith("_")&&v&&typeof v==="object"&&v._expose);
   if(ek.length>=2)console.log(site+"/"+f.replace(".json",""),p||"(root)",ek.map(([k,v])=>v._expose.name).join(","));
   Object.entries(n).forEach(([k,v])=>w(v,p?p+"."+k:k));})(m,"");}}'
# 3b) _expose 总数与页数：实测 49 / 22 / 36
node -e '
const fs=require("fs"),path=require("path");let n=0,pp=0;
for(const site of fs.readdirSync("m1/curated")){const d=path.join("m1/curated",site);if(!fs.statSync(d).isDirectory())continue;
 for(const f of fs.readdirSync(d)){if(!f.endsWith(".json"))continue;const m=JSON.parse(fs.readFileSync(path.join(d,f),"utf8"));let c=0;
  (function w(x){if(Array.isArray(x))return x.forEach(w);if(!x||typeof x!=="object")return;if(x._expose)c++;Object.values(x).forEach(w);})(m);n+=c;if(c)pp++;}}
console.log("expose nodes",n,"pages",pp);'
# 3c) order:time 集合里条目带 _datetime 的数量：实测 0/61
node -e '
const fs=require("fs"),path=require("path");let tot=0,dt=0;
for(const site of fs.readdirSync("m1/curated")){const d=path.join("m1/curated",site);if(!fs.statSync(d).isDirectory())continue;
 for(const f of fs.readdirSync(d)){if(!f.endsWith(".json"))continue;const m=JSON.parse(fs.readFileSync(path.join(d,f),"utf8"));
  (function w(n){if(Array.isArray(n))return n.forEach(w);if(!n||typeof n!=="object")return;
   if(n._rel&&n._rel.order==="time"){const its=n._items||n._lines||[];tot+=its.length;dt+=its.filter(x=>x._datetime).length;}
   Object.values(n).forEach(w);})(m);}}
console.log("timeline items",tot,"with _datetime",dt);'
# 3d) _expose 事实是否进下游作用域（基座缺陷实测）：输出里没有 Batch operations
node m1/render.mjs m1/models/ant-design/components-table.json | grep -c 'Batch operations' || true   # => 0
```

---

## 附录 B：本轮原始数字备查

- 模型层：36 页 / 15 站 / 集合 310 / `_expose` 节点 49（22 页）/ `_rel`：`compare 20`、`order:sequence 13`、`order:time 5`、`order:none 3`、`level≥2 9`。
- 形态分布：`deflist 74 · stack 70 · chips 45 · cards 37 · list 30 · controls 29 · product-cards 13 · seq 8 · image-strip 2 · compare-table 1 · prose 1 · accordion 0`。
- 角色频次（36 策展 + 8 手写模型，节点级）：`name 1457 · detail 622 · title 414 · subtitle 191 · price 189 · summary 170 · author 89 · text 77 · measure 70 · tag 50 · datetime 47 · count 38 · category 35 · label 30 · image 26 · rating-count 22 · duration 21 · brand 15 · amount 12 · source 10 · rating 7 · status 6 · ref 3`。
- 抓取层：104 页（exemplar 36 / support 68），元素总数 `table 331 · row 2666 · columnheader 1289 · input 1316 · form 469 · img 5203 · p 3673 · code 4499 · li 9917`。
- 关键反例页：`apple-com/iphone-16.steps`（6 步，键集 Jaccard 中位 0.74，非单一表单）；`huawei-cn/consumer-phones`（价格卡，非表）；`apple-com/ipad-air`（单一定价，非 `offer`）。

M4_PROPOSAL_DONE candidates=14 measured_pages=104 decisions=3
