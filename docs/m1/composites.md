# M1 复合元语（Schema 式）设计

状态：**设计稿，只做设计**。本轮不改模型、不改代码（`m1/render*.mjs`、`m1/axis.mjs`、`m1/model-lib.mjs`、`m1/validate.mjs` 一律不动）、不建 `m1/composites.json`、不跑 pipeline、不提交 git。
依据（读过的原文）：`docs/m1/axioms-v0.md`（§0 封闭语法 / §1 保留键 / §2 类型化值 / §5 条件 / §6.1 `_expose` / §8 不作表达）、`docs/m1/layout-axes.md`（F-031 轴语义、§3.3 数据表成立条件）、`docs/m1/m4-composites-proposal.md`（5 原语提案 + 被拒 7 候选）、`m1/vocab*.json`、`m1/validate.mjs`、`m1/model-lib.mjs`、`m1/axis.mjs`、`.scratch/decisions-for-user.md`「用户裁定记录」。
逐字口径：见文末附录 C（用户裁定原文摘录）。

---

## 0. 结论摘要

1. **复合元语 = 声明式类型 + schema，不是宏、不做展开。** 实例就是原节点；类型定义在闭式注册表里；校验器把实例投影到 schema 上逐项检查。"缺少必需的部件" = **schema 声明的必需字段在实例里缺失**——这是硬错误，不是引擎猜测。
2. **类型名用保留键 `_composite`**（对比 `_component` / `_kind` 后推荐；理由见 §2.3）。取值是闭式枚举，注册表 `m1/composites.json` 是可审查的单一真相源。
3. **校验语义**：硬错误 = 声明与结构矛盾（未知类型 / 缺必需部件 / 字段类型不符 / 出现 schema 未声明字段 / 复合件嵌套 / 表行字段集不一致）；警告 = 结构合法但引擎会走编排启发式（只给名称没给默认值 ⇒ 走"名称→水印"；声明了状态但下游无人引用）。
4. **路径引用**：条件语法新增"点路径"命名空间——`search.query` / `form.size` / `/login.identifier` 解析到**树路径**终端的 `_expose` 或角色事实；裸标识符仍是 fact 名（现状不变）。跨复合件引用允许；**本轮不为 secret 做特殊保护**（记为可选加固）。
5. **本轮命名 5 个类型**：`search`、`form`、`table`、`login`、`paginator`（合计 **29 个 schema 字段槽**）。`offer` **不并入 `form`、本轮不升类型**（其功能核心已被 M4-a 的 `qualifier: "list"` 闭式表达覆盖；升类型的触发条件见 §5.6）。
6. **迁移面**：42 策展页里有 **18 页**含可升级实例；现有 **57 个 `_expose`** 中约 **38 个**会归入复合件（login 8 / form 25 / search 5，含重叠；`search` 的 5 个里有 1 个与 form 同页、迁移时归 form），**19 个**维持裸 `_expose`；**136 个 `_fields` 节点**里有 **11 个集合节点**直接满足 table schema，**1 个**（aws `data-transfer`）当前字段集不一致，必须先在模型侧修好（否则 schema 会硬报错）——这正是"声明可被校验"的第一个真实收益。
7. **最大单点收益**：`table` 的 schema 立刻暴露 aws 一页的**行字段缺失**（引擎此前静默填空格掩盖了它）；`search` 的名称/默认值拆分立刻暴露 **5 处明确的 placeholder-写进-`_label`**（另有 1 处 `_label` 语义可商、1 处占位文案写在 `_summary`）的语义混用（§5.1 / `[A.6]`）。

---

## 1. 定义与心智模型

### 1.1 一句话

> **复合元语是一个"类型"。实例用 `_composite: "<类型>"` 声明自己的类型；类型在闭式注册表里定义 schema（必需部件 / 可选部件 / 允许部件 / 它向页面引入的状态 / 渲染提示）；校验器按 schema 校验每个实例。**

它**不是**：
- 不是宏（macro）：没有"展开式"，没有替换，没有恒等展开，没有递归。引擎渲染读的仍然是**实例节点本身**；schema 不参与渲染值，只参与**校验**与**编排提示**。
- 不是新的表达力：schema 不能用语法表达不出的事实；它只会让"声明了某个类型却填不满它"从**静默**变成**报错**（与 M4 提案的 `_macro` 相比，这里连"恒等展开"都不要，只保留"类型 + 校验"）。
- 不是 UI 组件：schema 里没有 class、没有布局参数、没有样式；渲染提示只说**语义**（如"名称在无默认值时可作水印"），怎么画由渲染器决定（axioms §0「无 UI 词」）。

### 1.2 实例 vs 类型定义

| | 类型定义（type） | 实例（instance） |
|---|---|---|
| 是什么 | 注册表里的一条记录（`m1/composites.json#search`） | 模型里一个带 `_composite: "search"` 的节点 |
| 谁写 | 一次性、全站共享、走审查（语法/词表变更） | 每次策展写它 |
| 基数 | 1 | N（每个搜索框一个实例） |
| 内容 | 字段名、必需性、类型、允许集、默认值、暴露状态、渲染提示 | 用**既有键**（`_label`、`_expose`、`_items`、`_action`…）填这些字段 |
| 校验 | 被引用 | 被投影到 schema 上检查 |
| 渲染 | 只有提示作用 | 引擎直接渲染的节点 |

关系类比：类型 ≈ JSON Schema 里的 `object` 定义（`required: [...]`、`properties`、`additionalProperties: false`），实例 ≈ 一份被校验的 JSON 文档。**"缺少必要的部件"**就是 `required` 列出的属性在文档里不存在——以前我们**没有类型**，所以无从判断一个 `search` 节点是不是"完整的搜索"；现在有了。

### 1.3 为什么这比"引擎按形状猜"更强

现状的四个实测代价（数字与命令见附录 A）：

1. **同形不同义**：布局引擎用形状相似度（Jaccard ≥ 0.6）猜"这些成员可比吗"。F-031 记录 `_items` 里的集合有 55/98（宽松口径）或 23 个（引擎自身判据）不可比 ⇒ 猜错就要降级 + 回改模型。
2. **猜错只降级，不报错**：`_rel.compare` 20 处标记里只有 1 处真的渲染成对比表（`[A.1]`），其余 19 处静默退化。**没有任何一处告诉模型作者"你的声明没生效"**。
3. **数据缺陷被掩盖**：`aws-amazon/ec2-on-demand.data-transfer._items` 7 行里 2 行缺一列（附录 A.5），引擎**静默填空白格**；只有把"每行字段集一致"写成 schema 硬条件，这个缺陷才会变成一条带路径的错误。
4. **同一件事跨页不一致**：华为两页都是"关键字 + 类别"的搜索面板，但字段名、`_expose` 挂载位置、提交动作挂载位置各写各的（`query.submit` vs 面板级 `_action`）。

**声明可被校验**的直接收益（都可机检）：
- **完备性**：缺件 = 错误，路径精确到 `<path>.<field>`；
- **一致性**：同类型的两个实例必须满足同一份 schema（跨页 DOM 结构签名可断言 ≥ 0.9）；
- **可审计**：每个类型在词表里声明了它暴露什么状态 ⇒ 引擎不会凭空发明一个状态，模型也不能声明一个引擎不认识的状态；
- **可回归**：新增一个策略/原语，先改 schema + fixtures，再改模型，错误在 CI 阶段而不是视觉评审阶段暴露。

---

## 2. schema 的表达形式

### 2.1 类型注册表放在哪里

**建议 `m1/composites.json`**（本轮只描述形状，不创建文件）。理由：与现有闭式词表同一形态（`vocab.json` / `vocab-fields.json` / `vocab-context.json` / `vocab-role-labels.json`），可以像它们一样被 `model-lib.mjs` 一次读入、被 `validate.mjs` 消费、被 code review diff。

建议形状（**示意，不是本轮产物**）：

```jsonc
{
  "$comment": "Composite TYPE registry. Closed: an instance's _composite value must be a key here. Adding/removing a type is a GRAMMAR+VOCABULARY change (axioms §0): failure log -> review first.",
  "version": "0",
  "composites": {
    "search": {
      "intent": "一个检索框：有名称、可选默认值，向页面引入查询状态",
      "fields": {
        "name":    { "key": "_label",  "required": true,  "type": "text", "role": "name",   "note": "可访问名称；源站没有可见名称时用闭式词表兜底（D-3）" },
        "default": { "key": "_default","required": false, "type": "text", "role": "value",  "render": "watermark-fallback" },
        "query":   { "key": "<child>", "required": true,  "expose": { "name": "*", "type": "text" }, "addressable": true },
        "scope":   { "key": "<child>", "required": false, "shape": "expose-collection" },
        "submit":  { "key": "_action", "required": false, "action": { "verbs": ["submit", "navigate", "open"] } }
      },
      "forbid": ["_composite"],
      "render": { "watermarkFromName": true }
    }
    // form / table / login / paginator …
  }
}
```

设计要点：
- **`composites` 的键就是闭式枚举**：模型写 `_composite: "searchx"` 是硬错误，不需要第二份枚举（避免 `vocab.json` 与注册表双写）。
- **`fields` 的键是"schema 字段名"（语义槽）**，`"key"` 是它在实例里对应到的**既有语法键**。绝大多数槽复用既有键（`_label`/`_expose`/`_items`/`_action`/`_rel`），只有"默认值"需要新保留键 `_default`（见 §2.4）。
- **`forbid`** 声明该类型子树内禁止出现的键（所有类型都禁 `_composite`，即**不嵌套**）。

### 2.2 一个字段怎么被描述

每个字段槽用下面这组描述符（全部可选，出现即约束）：

| 描述符 | 取值 | 语义 |
|---|---|---|
| `required` | `true` / `false` | 实例缺它就是硬错误（这就是"缺少必需部件"） |
| `key` | 保留键名 / `"<child>"` | 字段在实例里落在哪；`"<child>"` = 任意命名子节点 |
| `type` | `§2` 的封闭类型化值 | 值的形状；不符 = 硬错误 |
| `action.verbs` | 闭式动词子集 | `_action.verb` 必须落在集合内 |
| `expose` | `{name, type, multiple?}` | 该字段**向页面引入的状态**（`name:"*"` = 沿用实例里声明的名字） |
| `addressable` | `true`（默认）/ `false` | 能否被点路径引用（§4） |
| `allowed` | 闭式集合（如 `vocab-fields.json` 的键） | 字段值的允许集；不在集合内 = 硬错误 |
| `render` | `"watermark-fallback"` 等 | 引擎编排提示（语义级，不含样式） |
| `min` / `max` | 整数 | 基数（如 `form.fields.min = 2`） |

**默认值**是字段描述符（`default` 槽），不是类型级常量：只有声明了 `default` 槽的类型才能填默认值，且默认值必须是 §2 的封闭类型化值。

### 2.3 类型名怎么进语法：`_composite` vs `_component` vs `_kind`

| 候选 | 直译 | 读感 | 风险 | 结论 |
|---|---|---|---|---|
| **`_composite`** | 复合件 | "这是一个复合元语/元件" | 与全部文档术语（复合元语、composite）一致；**无 UI 词**；值域是类型名，读作 `_composite: "search"` = "这是一个 search 类型的复合件" | **推荐** |
| `_component` | 组件 | 像前端 UI 组件（React component） | 违反 axioms §0「角色/动词/谓词全部是业务语义，无 UI 词」；会把业务类型误读成实现结构 | 拒绝 |
| `_kind` | 种类 | 像一个自由标签 | 不携带"有 schema、可校验、有暴露状态"的语义；容易被当成随手标注 ⇒ **半逃生口** | 拒绝 |

**推荐 `_composite`。** 判据：① 读起来是"类型/元件"；② 不引入 UI 词；③ 与用户否掉的 "macro" 在语感上正好相反——macro 像黑魔法，composite 像把已知部件组成一个有类型的东西；④ 与 `_expose`/`_fields`/`_items` 的既有构词法一致（下划线保留键 + 名词）。

### 2.4 schema 需要的最小语法增量

| 增量 | 性质 | 为什么必须 |
|---|---|---|
| 保留键 `_composite` | 语法（保留键 +1，`RESERVED` 集 +1） | 实例声明自己的类型 |
| 保留键 `_default` | 语法（保留键 +1） | 名称与默认值是两个部件（用户语：搜索框"应该有一个名称和一个默认值"）；现状 `_label` 同时被当成名称与 placeholder，无法区分（§5.1 证据） |
| 保留键 `_empty` | 已存在 | table 空态复用 |
| 保留键 `_ref` | 已是角色 `ref`（`isRoleKey`） | paginator 指向被分页集合 |
| 关系谓词 `_rel.detail` | 语法（`_rel` 谓词 +1） | m4 提案的 qa 处置，与复合元语无强耦合；可独立进退（**不阻塞本轮**） |

**不需要**（本轮明确不做，避免膨胀）：
- 不新增语义角色；
- 不新增值类型 `record`（m4 提案 §4 曾建议）：D-2 的口径是"点路径访问子属性"，**不需要**把"提交载荷"再打包成一个新值类型；`form` 的状态 = 其字段暴露的并集（§5.2）。若将来确需"整体载荷"作为一个事实，再走词表变更。
- 不加任何布局/样式键。

---

## 3. 校验语义

### 3.1 错误形态

现有校验器产出 `{path, message}`（`m1/validate.mjs`）。建议**增加 `code` 字段**，让错误可被门禁与 fixtures 按码断言：

```jsonc
{ "code": "E_COMPOSITE_MISSING_REQUIRED",
  "path": "/search",
  "message": "composite \"search\" is missing required field \"name\" (schema m1/composites.json#search.fields.name)" }
```

### 3.2 硬错误（阻断；声明与结构矛盾，schema 可判定）

| 错误码 | 触发 | 例 |
|---|---|---|
| `E_COMPOSITE_UNKNOWN_TYPE` | `_composite` 取值不在注册表键集 | `_composite: "searchbox"` |
| `E_COMPOSITE_MISSING_REQUIRED` | schema `required:true` 的字段缺失 | `search` 没有 `_label`（名称） |
| `E_COMPOSITE_BAD_FIELD` | 字段存在但类型/基数不符 | `default` 不是封闭类型化值；`form.fields` 只有 1 个 |
| `E_COMPOSITE_NOT_ALLOWED` | 出现 schema 未声明的字段槽 | `search` 子树里写 `_items`（未声明 `rows`） |
| `E_COMPOSITE_NESTED` | 复合件子树里再有 `_composite` | `form` 里嵌 `search` |
| `E_COMPOSITE_EXPOSE_MISSING` | schema 强制暴露某状态而实例没声明 | `login` 没声明 `signed-in` |
| `E_COMPOSITE_ROWS_INCONSISTENT` | `table` 各行 `_fields` 键集不一致，**或某行整块缺 `_fields`**（轮 49 修：F-091.a） | aws `data-transfer`（7 行里有 2 行少一列）；构造 1 行有列 + 1 行无 `_fields` 也必须报错，不得静默通过 |
| `E_COMPOSITE_FIELD_UNDECLARED` | `table` 字段不在 `vocab-fields.json`，或类型不符 | 新字段未登记 |
| `E_COMPOSITE_ACTION_CARDINALITY` | `form`/`login` 的提交动作 ≠ 1 | 0 个或 2 个 `submit` |
| `E_COMPOSITE_REF_UNRESOLVED` | `paginator._ref` 解析不到本页集合 | 引用悬空 |

### 3.3 警告（不阻断；结构合法，但引擎会走启发式或声明冗余）

| 警告码 | 触发 | 处置 |
|---|---|---|
| `W_COMPOSITE_NAME_ONLY_WATERMARK` | 有名称、无默认值 | 引擎可把名称水印在框内（用户的启发式）；模型可补 `_default` 或不补 |
| `W_COMPOSITE_STATE_UNREFERENCED` | 声明的暴露状态全页无人引用 | 提示模型/引擎；不改渲染 |
| `W_COMPOSITE_NAME_FALLBACK` | 源站无可见名称，名称来自闭式词表兜底（D-3 A） | 记录可访问性来源，不阻断 |
| `W_COMPOSITE_ROWS_TOO_FEW` | `table` 只有 1 行（如 learn-microsoft 的两个 n=1 族） | 提示"这更像 deflist 而非表"，由策展裁量（**轮 49 已实现**：`validate()` 返回 `warnings`，`validateFiles` 打印，pipeline 汇总可见；不阻断、不影响退出码） |

### 3.4 "缺少必需的部件"在 schema 里怎么表达（直接回答用户疑问）

用户原话：*"什么叫做缺少必要的部件？"* 答案分三层：

1. **schema 声明部件**：每个类型有 `fields`，其中 `required: true` 的是**必需部件**。例如 `login` 的必需部件 = `identifier`（账号位）、`secret`（密码位）、`submit`（提交动作）、`signed-in`（它暴露的门禁状态）。
2. **实例填部件**：模型里这个节点用既有键把部件填上；部件名是**语义槽**（identifier/secret/submit），不是 UI 控件名。
3. **校验器报缺件**：任何 `required` 槽缺失 ⇒ `E_COMPOSITE_MISSING_REQUIRED`，路径指向实例节点，消息点名缺的是哪个槽。**这就是"缺少必要的部件"的可机检形式。**
   - 反例：`bilibili-com/video-bv1gj411x7h7.danmaku` 只有一个弹幕输入框 + 一个动作，没有 `secret`、没有 `signed-in` ⇒ 它**不能**声明 `login`（会报缺件），只能保留裸 `_expose`；这防止"页面凭空多出一个门禁状态"的假声明（m4 §4.5 反例）。
   - 同理 `form` 的必需部件含"≥2 个输入字段 + 恰 1 个提交"，`search` 的必需部件含"名称 + 查询位"，`table` 的必需部件含"行集合 + 逐行一致的声明字段集"。

**硬/警告的分界判据**：该条件能否**不用启发式**判定？能 ⇒ 硬错误（schema 是事实）；必须靠阈值/偏好判定 ⇒ 警告（引擎编排）。例："每行字段集一致"可判定 ⇒ 硬错误；"名称水印是否省空间"是编排 ⇒ 警告。

---

## 4. 路径引用

### 4.1 现状（实现事实）

- 条件表达式微语法（axioms §5）允许 path token 匹配 `[A-Za-z][A-Za-z0-9_.\[\]-]*`，即**语法上已经能写点路径**（`m1/model-lib.mjs#tokenize`、`parseExpr`）。
- 但 `validate.mjs#checkExpr` 与 `scopeFor` 只把 **head**（`rp.split(/[.\[]/)[0]`）拿去查作用域，作用域 = 角色名 + `_expose.name` + `vocab-context.json` 的名字。因此 `search.query` 现在能解析（head `search`… 但 `search` 通常不是 fact 名）——**实测：现有语料 0 处点路径条件**，因为路径只被 `_primary`/`ref`/`_action.to` 使用，而 `resolvePath` 已经支持 `a.b.c` 与 `a[0].b`。
- `{"ref": "/a/b"}`、`_primary` 用的是**树路径**（`resolvePath` / `resolveWithParent`），与条件的 **fact 名**命名空间是两套。

### 4.2 设计（双命名空间）

条件 / 引用里的路径按形态分流：

| 形态 | 解析 | 作用 |
|---|---|---|
| 裸标识符 `size` | fact 名（角色 / `_expose.name` / context） | **现状不变**，兼容全部既有语料 |
| 含 `.` 或 `[` 的 `a.b.c` | **树路径**，从当前节点相对解析（`resolvePath` 已实现） | D-2 的"点 A 点 B 点 C 访问子属性" |
| 以 `/` 开头 `/a/b` | **树路径**，从文档根解析（`resolvePath` 已实现） | 跨故事线/跨复合件引用 |

- **终端必须是 `_expose` 声明或角色事实**（即"有值可读"）；指向一个纯命名子组是错误（`E_PATH_NOT_A_FACT`）。
- **值语义**：终端是 `_expose` 时，值 = 该输入位当前值；未提交/未选择 = 未定义（axioms 既有语义：未定义 ⇒ 条件不成立）。
- **作用域**：相对路径从**写出该条件的节点**解析；路径可以向上穿过祖先、也可以穿过复合件边界。示例：
  - `form.size == "L"`（同页条件引用表单字段）
  - `search.query != ""`（引用搜索框当前输入）
  - `/login.identifier != ""`（绝对路径跨故事线）
  - `count(/results.pagination._items) > 1`（`count()` 接受树路径）
- **跨复合件引用的边界**：只允许引用**声明过的部件**（schema 的字段槽）；引用复合件内部没有字段语义的命名子组（如 `login.alternatives` 的具体条目）不赋予值。

### 4.3 secret 保护：本轮不做，记为可选加固

用户裁定：*"像 login 的密码这种保护属于 edge case，可以有，但不是重点，暂时不保护问题也不大。"*

- 本轮：`addressable` 默认 `true`，`login.secret` 也可被条件路径引用（语法上允许）。
- **可选加固（后续一轮，一条规则）**：schema 给 `secret` 槽标 `sensitive: true`，校验器拒绝任何条件/引用路径的终端落在 `sensitive` 字段上（`E_COMPOSITE_SENSITIVE_REF`）。加密钥零成本、可回退。
- 无论加固与否：secret 是**输入位**不是事实，渲染器契约（axioms §9「渲染每一个事实」）不要求渲染它的值；m4 §4.5 已把它写成静态检查项。

---

## 5. 五个原语的 schema 草案

每个原语给出：**必需字段 / 可选字段 / 暴露状态 / 渲染提示 / 证据 / 反例**。证据里的"页数/次数"全部可用附录 A 的命令复现；口径：42 策展页（`m1/curated/**/*.json`）+ 6 手写模型页（`m1/models/**/*.json`）。

跨原语共同约束（一次写入 §2 注册表，五类共享）：
- **不嵌套**：`_composite` 子树里不得再出现 `_composite`；
- **字段作用域**：一个实例的字段 = 它自己的子树**减去**任何嵌套复合件的子树（为兼容现状：`mi-com/search-phone` 的字段在 `filters.*` 一层之下、`mi-com/search-earbuds` 的 `sort` 与 `filters` 同级）；
- **状态必须声明**：引入交互的类型必须有一个 `expose` 槽；未声明 = 硬错误（对应 axioms §6.1 "复合原语必须声明它向页面引入的状态"）；
- **动作按 F-020 挂载**：包含 ≠ 同一，子件的动作不得提升为复合件的动作。

### 5.1 `search`（检索框）

**定位**：单个查询位的搜索框（用户原话：*"一个搜索框本身肯定是一个复合元语，它应该有一个名称和一个默认值"*）。带 ≥2 个字段的面板归 `form`（§6.2 决策 D-B）。

| 字段槽 | key | 必需 | 类型/形状 | 说明 |
|---|---|---|---|---|
| `name` | `_label` | ✅ | `text` | 可访问名称；源站无可见名称 ⇒ 闭式词表兜底（D-3） |
| `default` | `_default`（新） | — | `text` | 默认值；**缺省不是错误**，引擎可按启发式把名称水印在框内 |
| `query` | 命名子件 | ✅ | `_expose {type:"text"}` | 查询位；`addressable: true` |
| `scope` | 命名子件 | — | `_expose` + `_items` | 搜索范围选择（如"宝贝/天猫/店铺"） |
| `submit` | `_action` | — | `verb ∈ {submit, navigate, open}` | 提交动作 |

**暴露状态**：`query`（及其它字段）的 `_expose.name`；下游可用 `search.query` 或裸名引用。
**渲染提示**：`watermarkFromName: true`（有名称无默认值 ⇒ 名称水印在框内；也可输出为可见标签——**由编排引擎决定**，用户明示）。
**证据**：搜索位出现在 8 页（`36kr-com/search-ai`、`36kr-com/search-viz`、`bilibili-com/home`、`bilibili-com/read-home`、`huawei-cn/search-laptop`、`huawei-cn/search-phone`、`mi-com/search-phone`、`taobao-com/home`）`[A.2]`。**单查询位**（本类型）3 页：`bilibili-com/home`、`bilibili-com/read-home`、`taobao-com/home`（后者另带 `scope`）`[A.2]`。
**现状混用证据**（`[A.6]`）：`_label` 今天同时承担名称与 placeholder——`bilibili-com/home.search._label = "磊哥游戏"`（抓取时的轮播热搜占位文案，见其 `_intent`）、`36kr query._label = "请输入关键词"`、`huawei query._label = "请输入关键字"`、`sspai discussion.input._label = "说点什么..."`、`mi query._label = "站内搜索"`；而 `airbnb booking.*._label = "入住日期"/"退房日期"/"房客"` 是真名称；`taobao` 把占位文案放在 `_summary`、干脆没有 `_label`。**这正是"名称 / 默认值"必须拆成两个部件的实测依据。**
**归类口径**：按 §6.1 的实测，`_expose` 里 5 个检索位落在 4 页（`[A.4]`）；其中 **3 页**是可直接归 `search` 的单查询位（bilibili×2、taobao）；`mi-com/search-phone` 的 `keyword` 与同页 `filters` 的 5 个字段同属一个搜索区，迁移时应整体归 `form`（其字段作用域覆盖 `query` + `filters`），因此 `search` 类型的直接实例为 **3 页**。
**反例**：`bilibili-com/video-bv1gj411x7h7.danmaku`（弹幕输入框）**不是** `search`——没有检索语义；保留裸 `_expose`。单个输入框但语义不是检索的（如评论框）同理。

### 5.2 `form`（多字段面板：查询/筛选/预订/评论）

| 字段槽 | key | 必需 | 类型/形状 | 说明 |
|---|---|---|---|---|
| `fields` | 子树内 `_expose` | ✅ | `min: 2` | 一次提交一起上行的字段集合 |
| `submit` | `_action` | ✅ | `verb ∈ {submit, operate, select}`，恰 1 个 | 字段或面板节点上的提交动作 |
| `name` | `_label` | — | `text` | 面板名称 |
| `reset` | 子件 `_action` | — | 任意动词 | 清除/重置（不合并进提交） |
| `state` | （派生） | ✅（派生） | 字段暴露的并集 | 每个字段的 `_expose.name` 是页面状态 |

**暴露状态**：字段暴露的并集；**不**新增 `record` 值类型（§2.4）。下游可用 `form.size` / `size` 引用。
**渲染提示**：一个控件组（fieldset 语义），提交控件在组内（消除 F-031 §6"两个无归属的日期"同类问题）；字段按文档顺序。
**证据**：**12 个 ≥2 暴露子件的面板**（11 策展 + 1 手写模型）`[A.3]`，其中非 login 的 **8 页**：`36kr-com/search-ai`、`36kr-com/search-viz`（query+search-type+sort）、`airbnb-com/room-28871`（check-in/check-out/guests）、`huawei-cn/search-laptop`、`huawei-cn/search-phone`（keyword+category）、`mi-com/search-earbuds`（category+sort，+3 个 bool 条件）、`mi-com/search-phone`（query + filters 下 5 字段）、`sspai-com/post-114699`（comment+comment-sort）；另有手写模型 `m1/models/ant-design/components-table`（selected+new-first-name）。归类计数：**57 个 `_expose` 中 25 个落在 form 面板**（8 页）`[A.4]`。
**反例**：
- **单字段面板不是 form**（`min: 2` 拒绝）——单字段搜索框是 `search`；
- `apple-com/iphone-16.steps`（6 步配置器）**不是**一个 form：每步独立决策、跨步定价在后端、不是一次提交携带全部字段（m4 §4.1 反例，实测键集 Jaccard 中位 0.74）；
- `apple-com/ipad-air._lines[1]` 颜色选择器、`36kr-com/information-technology.channels` 频道条、`aliyun-com/home.products.tabs` 标签条：只有一个选择位或已由 `_items`+`_expose` 确定性表达 ⇒ 维持裸 `_expose`（19 个"其他"暴露位，12 页）`[A.4]`。

### 5.3 `table`（声明字段的数据表）

| 字段槽 | key | 必需 | 类型/形状 | 说明 |
|---|---|---|---|---|
| `rows` | `_items` | ✅ | 行集合 | 每行一条记录 |
| `columns` | 每行 `_fields` | ✅ | 键集完全一致；键 ∈ `vocab-fields.json` | 列 = 声明字段；`additionalProperties: false` |
| `identity` | `_name`/`_title` | 有名字时✅ | `text` | 身份列 |
| `selection` | `_expose` | — | `type ∈ {ref, list}`（可 `multiple`） | 选中集合 = 被选行 `_key` 列表 |
| `empty` | `_empty` | — | 故事线节点 | 空态 |
| `row-actions` | 行内命名子件 | — | 各自 `_action` | 行操作（F-020：挂在行上） |

**暴露状态**：`selection`（行的业务 `_key` 列表）。
**渲染提示**：列 = 身份列 + 声明字段（列名走 `axis.mjs#columnLabel`，**绝不印内部键**）；横向不换行；成立条件沿用 `layout-axes.md §3.3`（无身份列时 ≥2 属性列；单列是列表、身份列+1 属性列是 deflist，都不是表）。
**证据**：4 个策展页含 `_fields`（共 **136 个 `_fields` 节点**）：`aliyun-com/product-ecs`（5）、`aws-amazon/ec2-on-demand`（76）、`gov-uk/ni-rates-letters`（32）、`learn-microsoft/vm-sizes`（23）`[A.5]`；另有手写模型 `m1/models/ant-design/components-table`（9）。**带 `_fields` 的集合节点 14 个**：**11 个**字段集一致 ⇒ 直接满足 schema；**1 个不一致**（`aws-amazon/ec2-on-demand.data-transfer._items`：7 行里 2 行只有 `transfer-tier`，缺 `data-transfer-price`）；**2 个只有 1 行**（learn-microsoft `families-by-type.fpga-accelerated`、`families-by-type.storage-optimized`）⇒ `W_COMPOSITE_ROWS_TOO_FEW`。
**收益**：把"字段形状相似 ≥0.6 ⇒ 表格"的启发式换成**声明**；把 aws 一页的**行缺列**从"引擎静默填空白格"变成**带路径的错误**；选中集合状态可被条件引用（m4 §0 缺陷 1 的前置修复）。
**反例**：`huawei-cn/consumer-phones`、`mi-com/*`、`apple-com/*` 的机型卡列表**不是** table——没有一致领域字段集（m4 实测 Jaccard 0.44–0.92 波动）；`aliyun-com/product-ecs.scale`（`regions|zones` 两字段单节点）**不是**表节点（没有行集合）；`stripe-com/pricing` 价格档位同理。

### 5.4 `login`（门禁块）

| 字段槽 | key | 必需 | 类型/形状 | 说明 |
|---|---|---|---|---|
| `identifier` | 命名子件 | ✅ | `_expose {type:"text"}` | 账号位 |
| `secret` | 命名子件 | ✅ | `_expose {type:"text"}`，`sensitive: true` | 密码位（渲染成密码控件；值类型仍是 text） |
| `submit` | `_action` | ✅ | `verb: "submit"`，恰 1 个 | 提交登录（**只认 `verb:submit`**；轮 49 裁定 A） |
| `state` | `_expose` | ✅ | `{name: "signed-in", type: "bool"}` | **唯一对外状态**（名字固定，这就是"必须声明它暴露的状态"的机检形式；复合件的 `_expose` 是**声明状态**，不渲染成控件，见下） |
| `alternatives` | 命名子件 | — | `_items` + 各自 `_action` | 第三方入口（**不新增角色**，避免语义角色膨胀） |
| `signup` | 子件 `_action` | — | `navigate`/`open` | 注册入口 |
| `forgot` | 子件 `_action` | — | `navigate`/`open` | 找回密码 |
| `remember` | 命名子件 | — | `_expose {type:"bool"}` | 记住我（如 stripe-dashboard） |

**暴露状态**：`signed-in`（未登录 = 未定义 ⇒ 依赖它的条件不成立）。与 `vocab-context.json` 的注入事实 `signed-in` 同名；优先级按已实现的 P1 = **最近声明祖先链 > 上下文注入**。
**渲染提示**：门禁块 = 字段组 + 提交 + 第三方入口行 + 注册入口；`secret` 渲染为密码控件。

**`_expose` 的双重语义（轮 49 ≥5.4 补充，F-092）**：`submit` 槽只认 `verb:submit`——`operate` 是**通用动词**（执行某控件），放进 submit 动词集会让任意被 operate 的控件冒充提交动作；实测三张策展登录页的提交**全部**是 `verb:submit`，而 `operate` **全部**是额外登录方式（github 的 passkey、小米的扫码登录）。passkey/扫码/第三方入口是**命名子件**（各自带 `_action`），不是 submit 的替代形态。同理，`state` 槽的 `_expose` 写在**复合件节点**上：对**普通节点** `_expose` = 用户要填的**输入位**（渲染成控件）；对**复合件** `_expose` = 该复合件对外**声明的状态/输出**（可被 `_when`/路径引用），**不是输入位**（复合件的输入是它 schema 里的 `fields`）。所以登录块声明 `signed-in` 后，页面上**不会**多出一个 `signed-in` 复选框（若多出，就是语义错误）。这条区分由 `m1/axis.mjs#exposeRendersAsControl` 与三个目标共享。
**证据**：**3 个策展页**真实含登录块——`github-com/login`（`login.identifier` + `login.secret` + submit + Google/Apple 第三方 + passkey + signup + forgot）、`stripe-dashboard/login`（email/password/remember-me）、`xiaomi-account/login`（account/password/agreement）`[A.2]`；**8 个 login 字段 `_expose`**`[A.4]`。抓取层 `type=password` support 层 8 页（组件文档 demo），真实登录页仅 `passport-baidu/login`（未策展，m4 §4.5 已记录）。相对 M4 提案"证据缺口"，本轮已有 **3 个策展页**（补样本已完成，C1 ≥3 站成立：github.com / stripe.com / xiaomi.com）。
**反例**：只提供"登录/注册"入口动作的节点（`bilibili-com/video-bv1gj411x7h7` 的登录/注册对）**不是** `login`——没有 `secret`、没有 `signed-in` ⇒ 缺必需部件被拒绝；否则会制造**假门禁**，让下游条件被"未定义"污染。

### 5.5 `paginator`（分页 / 继续）

| 字段槽 | key | 必需 | 类型/形状 | 说明 |
|---|---|---|---|---|
| `ref` | `_ref` | ✅ | `{ref: "/<collection>"}` | 被分页的集合（校验器已能解析 `ref`） |
| `items` | `_items` | ✅* | 页目标集合 | 数字页/下一页（*与 `more` 至少一个） |
| `more` | 子件 `_action` | ✅* | `submit`/`operate` | "加载更多"继续模式 |
| `page` | `_expose` | — | `{name:"page", type:"text"}` | 当前页标识 |
| `count` | `_count` | — | `num`（`unit:"页"`） | 总页数 |

**暴露状态**：`page`。**渲染提示**：数字页码项无捕获地址 ⇒ 保持控件观感，**不造 `<a href>`**（F-031 §4）。
**证据**：**3 个策展页**`[A.2]`——`huawei-cn/search-laptop.results.pagination`（7 项，`_primary` = 当前页）、`huawei-cn/search-phone.results.pagination`（同上，共 357 页）、`gov-uk/ni-rates-letters.pagination`（源站 `<nav aria-label="Pagination">` 的 Next 控件，已捕获真实地址）。关闭 axioms §8「分页控件不作表达」的最大缺口。
**反例**：`36kr-com` 的 17 项频道 chip 条、`sspai-com/matrix.feed.more`（"加载更多"动作挂在提要上但**没有** `_ref` 指向被分页集合 ⇒ 应作为普通 `_action` 或补 `_ref` 后升级）、站点多级菜单——没有 `_ref` 一律拒绝。

### 5.6 `offer`：不并入 `form`，本轮不升类型

- **不并入 `form`**：`offer` 是价格/优惠块（金额语义，无输入、无提交），`form` 是输入面板（有 `_expose`、有提交）。两者在**轴**上不同（钱 vs 输入），强行合并会把"每张商品卡都多一层 form"变成膨胀。
- **本轮不升类型**：`offer` 的核心价值是"引擎不得做金额比较"。这一点 **M4-a 已用现有键实现**：`m1/axis.mjs` 的 `LIST_QUALIFIER = 'list'`（`_amount` 带显式限定词才渲染删除线），引擎不再比较金额。剩下的 `_price`/`_amount`/`_duration` 是**角色事实**，已经被 axioms §2 覆盖。
- **若升级的触发条件**（写进未来一轮的判据）：① `qualifier` 的**闭式枚举**（`vocab.qualifiers: ["list","from","per-unit","per-period","tax-incl"]`）先落地（现在是自由文本 = 半逃生口）；② 出现 **≥3 站**需要"到手价 + 原价 + 条件"三件套同框；③ 出现至少 1 个"引擎无法从角色事实判定哪个是主价"的实例。届时 schema 槽为：`price`(✅) / `original`(—, 需 `qualifier:"list"`) / `condition`(—, `_detail`) / `installment`(—, `_duration`) / `currency`(✅, ISO 4217 枚举)。
- **D-6 口径**：币种是**标准枚举**（源语只存币种）；字形（`$`/`¥`/`US$`）与精度是**呈现/品牌层**，不进 schema。`m1/axis.mjs` 的 `CURRENCY_GLYPH` 是"默认品牌风格"，不是元语事实。

---

## 6. 与现有实现的关系与迁移

### 6.1 现状盘点（可复现，命令见附录 A）

| 指标 | 数值 | 命令 |
|---|---|---|
| 策展页 | 42（23 站） | `[A.0]` |
| `_expose` 节点 | **57**（25 页） | `[A.3]` |
| `_expose` 类型分布 | text 46 · bool 8 · date 2 · num 1 | `[A.3]` |
| `_fields` 节点 | **136**（4 页：aliyun 5 / aws 76 / gov-uk 32 / learn-microsoft 23） | `[A.5]` |
| ≥2 暴露子件的面板 | 12（11 策展 + 1 模型） | `[A.3]` |
| 带 `_fields` 的集合节点 | 14（11 一致 · 1 不一致 · 2 单行） | `[A.5]` |
| 迁移候选页并集 | **18** | `[A.4]` |

### 6.2 可升级清单与预估收益

**（a）`table` —— 4 页**（收益最高：暴露真实数据缺陷 + 消灭形状启发式）

| 页 | 现节点 | schema 结论 |
|---|---|---|
| `aliyun-com/product-ecs` | `instances._items`（4 行，cpu|memory 一致，有名字） | ✅ 直接升级 |
| `aws-amazon/ec2-on-demand` | `region-egress`（67 行一致）、`same-region`（2 行一致） | ✅ 升级；`data-transfer`（7 行不一致）**先修模型** |
| `gov-uk/ni-rates-letters` | `employee-rates`（16 行一致）、`employer-rates`（16 行一致） | ✅ 直接升级 |
| `learn-microsoft/vm-sizes` | 9 个族集合（8 一致 + 2 单行） | ✅ 升级；单行族出 `W_COMPOSITE_ROWS_TOO_FEW`（轮 49 已补警告通道并升级这两个族） |

预估收益：**11/14 个集合节点**受 schema 保护（行缺列从此硬报错）；`_rel.compare`/形状启发式的误判面缩小 4 页。

**（b）`login` —— 3 页**（收益：`signed-in` 从"上下文常量"变成"页面可达状态"）

`github-com/login`、`stripe-dashboard/login`、`xiaomi-account/login`；吸收 **8 个 `_expose`**。预估收益：门禁状态可被下游条件引用；`secret` 的 `sensitive` 标记为后续加固留位。

**（c）`form` —— 8 页**（吸收 **25 个 `_expose`**）

`36kr-com/search-ai`、`36kr-com/search-viz`、`airbnb-com/room-28871`、`huawei-cn/search-laptop`、`huawei-cn/search-phone`、`mi-com/search-earbuds`、`mi-com/search-phone`、`sspai-com/post-114699`。预估收益：面板级分组 + 提交归属唯一化；`query.submit` 这类"哨兵子节点"消失；华为两页结构签名一致。

**（d）`search` —— 3 页**（吸收 **4 个 `_expose`**；另有 1 个检索位 `mi-com/search-phone.keyword` 与 form 同页，归 form）

`bilibili-com/home`、`bilibili-com/read-home`、`taobao-com/home`（后者带 `scope`）。预估收益：名称/默认值拆分 + 水印启发式落地；消除 5 处明确的 placeholder-写进-`_label` 的语义混用（`[A.6]`）。

**（e）`paginator` —— 3 页**

`huawei-cn/search-laptop`、`huawei-cn/search-phone`、`gov-uk/ni-rates-letters`。预估收益：`page` 状态可用；"查看更多"的静默丢弃有归属。

**迁移页并集 = 18 页**（login 3 ∪ form 8 ∪ search 3 ∪ table 4 ∪ paginator 3；去重 4 页：huawei 两页在 form+search+paginator、`mi-com/search-phone` 在 form+search、`gov-uk/ni-rates-letters` 在 table+paginator）`[A.2]`。

### 6.3 不能升级 / 不该升级（理由）

| 对象 | 数量 | 为什么不能/不该 |
|---|---|---|
| 裸 `_expose` 非复合件 | **19 个**（12 页，`[A.4]`） | 频道条、tab 条、颜色/机型选择器、弹幕框、评论框、支付区：单字段或已由 `_items`+`_expose` 确定性表达；包成复合件是膨胀 |
| 商品卡列表（华为/小米/苹果） | 多页 | 无一致领域字段集（Jaccard 0.44–0.92 波动）⇒ 不满足 table 的 `columns` 一致条件 |
| apple 配置器 6 步 | 1 页 | 每步独立决策、跨步定价在后端 ⇒ 不满足 `form` 的"一次提交"必需部件 |
| `aws data-transfer` | 1 节点 | 行字段集不一致 ⇒ schema 会硬报错；**先修模型**（补齐缺列）再升级 |
| bilibili 弹幕登录入口 | 1 处 | 无 `secret`/`signed-in` ⇒ `login` 缺件被拒；否则制造假门禁 |
| 面包屑 | 14/36 exemplar 页 | axioms §8 明示"导航历史不作表达"，本轮不动（保留为"已声明的不作表达"） |
| `offer` | 41 价格节点 | 本轮不升类型（§5.6）；角色事实 + `qualifier:list` 已覆盖正确性 |

### 6.4 迁移顺序与每步验收标准

**每步共同的退出条件（三目标一致性）**：
`node m1/eval/pipeline.mjs` 退出码 0；HTML / 纯文本 / Markdown 三目标**事实保真 1.00**；`m1/eval/three-target-preview.mjs` 抽样的复合件在三个目标里**决策相同、画法不同**。

| 步 | 内容 | 验收标准（可测量） |
|---|---|---|
| **S0 模型侧修缺陷（无语法增量）** | ① aws `data-transfer` 补齐缺列；② 把 6 处 placeholder 从 `_label` 迁到 `_default`（或补 `_label` 为真名称） | ① `aws data-transfer` 各行 `_fields` 键集一致（`[A.5]` 命令输出 `uniqFieldSets=1`）；② 42 页保真仍 1.00；③ 渲染 diff 为 0 或逐处有据（placeholder 展示不变） |
| **S1 注册表 + 校验器（零实例）** | 建 `m1/composites.json`；`validate.mjs` 增 `code` 与 composite 规则；新增 fixtures（缺件 / 未知类型 / 嵌套 / 表行不一致 / 双提交 / 悬挂 `_ref`） | ① 新 fixtures **全部报预期错误码**（`validate-selftest` 绿）；② 42 页仍 `ok`（0 个实例 ⇒ 0 个新错误）；③ 未知类型 fixture 报 `E_COMPOSITE_UNKNOWN_TYPE` |
| **S2 `table`（4 页）** | 给 11 个合格集合节点加 `_composite: "table"`；`data-transfer` 维持裸 `_fields` 直至 S0 完成 | ① schema 校验通过率 11/11；② 三目标保真 1.00；③ 列名只来自 `vocab-fields.json`（无内部键上屏）；④ 行缺列构造 fixture 报 `E_COMPOSITE_ROWS_INCONSISTENT` |
| **S3 `login`（3 页）** | 3 页加 `_composite: "login"` + `signed-in`；`secret` 标 `sensitive` | ① `signed-in` 被 `_when` 引用的构造用例**渲染出来**（当前会静默消失的 bug 不再出现）；② 缺 `secret` 的 fixture 报 `E_COMPOSITE_MISSING_REQUIRED`；③ 三目标保真 1.00 |
| **S4 `search`（3 页）** | 3 页加 `_composite: "search"`；拆名称/默认值 | ① 无默认值的实例出 `W_COMPOSITE_NAME_ONLY_WATERMARK`（警告不阻断）；② `search.query` 点路径条件解析成功（新增路径 fixture）；③ 保真 1.00 |
| **S5 `form`（8 页）** | 8 页加 `_composite: "form"`；提交动作唯一化 | ① 每个面板恰 1 个提交控件（DOM 计数断言）；② 华为两页结构签名一致（≥0.9）；③ 单字段/双提交 fixture 报错；④ 保真 1.00 |
| **S6 `paginator`（3 页）** | 3 页加 `_composite: "paginator"` + `_ref` | ① `_ref` 解析到本页集合（校验器既有能力）；② 无捕获地址的页码渲染为**非链接**；③ 保真 1.00 |

**回退**：每步是独立提交粒度；schema 校验可整体关闭（注册表为空 ⇒ 零实例 = 零行为变化），因此任一步失败可只回退该步。

---

## 7. 反例与滥用（防止复合元语变成逃生口）

1. **不要为"凑数"包复合件**：一个节点只因碰巧有两个事实，不构成 `form`；schema 的 `min`/`required` 就是拒绝闸门。
2. **复合件不得新增表达力**：实例只能用既有键填 schema 槽；schema 里出现任何"新语义角色/新值类型/样式参数"都是**语法变更**，必须走失败日志 + 审查（axioms §0）。
3. **不得嵌套**：`_composite` 子树内再出现 `_composite` = `E_COMPOSITE_NESTED`。原因：嵌套会让"字段作用域"和"状态归属"无法判定，也是宏式黑魔法的入口。
4. **不得把内容形状做成复合件**：`prose`（正文序列）、`qa`（问答折叠）、`image-gallery`（图墙）、`timeline`、`compare`、`control-bar` 由引擎按**确定性形状**处理（m4 §5.5 已逐条拒绝）。它们的正确处置是修引擎/修数据，不是加类型——**复合元语只收"有类型、有字段、有状态"的东西**。
5. **不得按站点/品牌建类型**（如 `mi-search`、`stripe-login`）：类型是跨站复用单元；站点差异属于实例数据。反例证据：M4 只升 5 类、拒 7 类，是"具名库有总量上限"的可核查交代。
6. **不得用复合件替代缺失的模型字段**：复合件是"声明完整"，不是"猜出缺失"。`aws data-transfer` 缺列必须补数据，不能用 schema 宽容掉。
7. **不得把渲染偏好写进 schema**：颜色/圆角/水印样式是 M5 品牌层；schema 的 `render` 只能是语义提示（"名称可作水印"），且必须可被编排引擎覆盖。
8. **单实例热点**：一个类型若只有 1 个实例且无状态，应降级为配方文档（M4 判据 C1/C6）。当前 5 类的实例数：search 3 / form 8 / table 4 / login 3 / paginator 3，均 ≥3 页。

---

## 8. 仍待人类决定的问题（≤3 条）

> 只列**产品取舍**；可由用户裁定口径直接推出的一律不列（如 `_default` 保留键的必要性、点路径、secret 暂不保护、币种枚举、名称→水印启发式）。

### D-A 类型注册表的扩展政策：全局闭式 5 类，还是允许按域扩展？
- **背景**：`search/form/table/login/paginator` 是"页面功能"类型；将来可能出现域相关类型（如电商 `offer`、内容站 `article-body`）。这决定注册表会不会膨胀。
- **选项 A（建议）**：**全局闭式**。注册表的键就是引擎认识的全部类型；新增类型 = 词表+语法变更（失败日志 → 审查）。理由：与 axioms §0 一致；防膨胀；引擎可以对每个类型写死编排策略。
- **选项 B**：**允许按域扩展**（如 `m1/composites/<domain>.json` 覆盖/追加）。理由：域团队自治。代价：引擎策略必须做成插件化，且"同形异名"类型会扩散。
- **选项 C**：折中——全局注册表 + 域**实例化**（域只能填已声明类型的默认值/允许集，不能加类型）。
- **不决定的后果**：S1 注册表结构无法定稿；先按 A 实现（默认闭式），B/C 都可后向兼容地追加。

### D-B `search` 与 `form` 的边界：多字段搜索面板归谁？
- **背景**：8 个面板里，华为/36kr/mi 的"关键字 + 类别/排序/条件"既是"搜索"又是"表单"。当前设计把**单查询位**归 `search`、**≥2 字段**归 `form`（§5.1/§5.2）。这会让"搜索体验"被拆成两个类型观察。
- **选项 A（建议）**：保持拆分（`search` = 单查询位；`form` = 多字段面板）。理由：类型小而稳；`search` 能表达"名称→水印"这类只对检索框成立的编排；多字段面板的编排（提交/重置）与搜索不同。
- **选项 B**：`search` 允许带 `filters`（≥1 个附加字段），即搜索 = `search` 的超集；`form` 只收非检索面板（预订/评论）。
- **选项 C**：合并为一个类型 `form`，`search` 只是 `form` 的一个角色标记。
- **不决定的后果**：不阻塞 S4/S5，先按 A 迁移；B/C 会改变"华为两页"的归类型，重做成本约 8 页的声明位（低）。

### D-C 严格 schema 与既有语料的冲突如何处置？
- **背景**：`table` 的"逐行字段集一致"若为硬错误，`aws data-transfer` 立刻失败；若为警告，缺陷继续被掩盖。同理 `form` 的"≥2 字段"会让单字段面板（若有人误标 form）失败。
- **选项 A（建议）**：**硬错误 + 修模型**（S0 先补齐 aws 缺列）。理由：schema 的价值就是让缺陷暴露；用户口径是"缺少必需的部件"要看得出来。
- **选项 B**：**硬错误 + 显式例外清单**（在注册表里为已知缺陷留一条 `known-defects` 记录，附 ticket 与期限）。理由：不阻塞迁移节奏，同时不静默。
- **选项 C**：降为警告。理由：零阻塞。代价：回到"猜"，schema 名存实亡。
- **不决定的后果**：不阻塞 S1（校验器可先实现，规则可配），但阻塞 S2 的"11/11 通过率"口径——先按 A，若要 B 需给 aws 一条带期限的例外。

---

## 附录 A：可复现命令

> 全部在仓库根 `/home/z/vibe/autofe` 执行；只读，不改文件。

### A.0 规模
```bash
find m1/curated -name '*.json' | wc -l        # 42
find m1/models  -name '*.json' | wc -l        # 6
```

### A.1/2.3 形态与 compare 命中（复用引擎逻辑，沿用 m4 附录 A.1）
```bash
# 见 docs/m1/m4-composites-proposal.md 附录 A.1；`compare-table` 命中 1
```

### A.2 每类原语的策展页清单
```bash
cd /home/z/vibe/autofe
node -e '
const fs=require("fs"),path=require("path");
function files(root){const o=[];for(const s of fs.readdirSync(root)){const d=path.join(root,s);if(!fs.statSync(d).isDirectory())continue;for(const f of fs.readdirSync(d))if(f.endsWith(".json"))o.push([s,f.replace(".json",""),path.join(d,f)]);}return o;}
const c={search:new Set(),form:new Set(),table:new Set(),login:new Set(),paginator:new Set()};
for(const [site,page,f] of files("m1/curated")){const k=site+"/"+page,m=JSON.parse(fs.readFileSync(f,"utf8"));
 (function w(x,p){if(Array.isArray(x))return x.forEach((y,i)=>w(y,p+"["+i+"]"));if(!x||typeof x!=="object")return;
  if(x._expose&&/search|query|keyword/i.test(x._expose.name)&&!/\._items\[/.test(p))c.search.add(k);
  if(Array.isArray(x._items)&&x._items.some(i=>i&&i._fields))c.table.add(k);
  if(/pagination|pager/i.test(p)&&(Array.isArray(x._items)||x._action))c.paginator.add(k);
  if(/(^|\.)login(\[|\.|$)/i.test(p)&&x._expose)c.login.add(k);
  Object.entries(x).forEach(([kk,v])=>w(v,p?p+"."+kk:kk));})(m,"");
}
// form：子树里 >=2 个暴露字段且不是 login
for(const [site,page,f] of files("m1/curated")){const k=site+"/"+page,m=JSON.parse(fs.readFileSync(f,"utf8"));let hit=false;
 (function w(x,p){if(Array.isArray(x))return x.forEach((y,i)=>w(y,p+"["+i+"]"));if(!x||typeof x!=="object")return;
  const ek=Object.entries(x).filter(([q,v])=>!q.startsWith("_")&&v&&typeof v==="object"&&v._expose);
  if(ek.length>=2&&!/login/i.test(p))hit=true;Object.entries(x).forEach(([q,v])=>w(v,p?p+"."+q:q));})(m,"");
 if(hit)c.form.add(k);}
for(const [n,s] of Object.entries(c))console.log(n.padEnd(10),s.size,[...s].sort().join(" | "));
console.log("UNION",new Set([...Object.values(c)].flatMap(s=>[...s])).size);'
```

### A.3 `_expose` 总数 / 页数 / 类型分布 + 面板数
```bash
cd /home/z/vibe/autofe
node -e '
const fs=require("fs"),path=require("path");let n=0,pp=0,t={},panel=0;
function files(root){const o=[];for(const s of fs.readdirSync(root)){const d=path.join(root,s);if(!fs.statSync(d).isDirectory())continue;for(const f of fs.readdirSync(d))if(f.endsWith(".json"))o.push(path.join(d,f));}return o;}
for(const f of files("m1/curated")){const m=JSON.parse(fs.readFileSync(f,"utf8"));let c=0;
 (function w(x){if(Array.isArray(x))return x.forEach(w);if(!x||typeof x!=="object")return;
  if(x._expose){c++;t[x._expose.type]=(t[x._expose.type]||0)+1;}
  const ek=Object.entries(x).filter(([k,v])=>!k.startsWith("_")&&v&&typeof v==="object"&&v._expose);if(ek.length>=2)panel++;
  Object.values(x).forEach(w);})(m);n+=c;if(c)pp++;}
console.log("expose",n,"pages",pp,"types",JSON.stringify(t),"panels>=2",panel);'
# curated 期望：expose 57 / pages 25 / types {"text":46,"bool":8,"date":2,"num":1} / panels>=2 11
# 含手写模型 m1/models 时：expose 66 / pages 27 / panels>=2 12（正文口径：57 与 12 分别指策展 `_expose` 与“策展+模型”面板）
```

### A.4 57 个 `_expose` 归入哪类复合件（login/form/search/其他）+ 迁移页并集
```bash
cd /home/z/vibe/autofe
node -e '
const fs=require("fs"),path=require("path");
function files(root){const o=[];for(const s of fs.readdirSync(root)){const d=path.join(root,s);if(!fs.statSync(d).isDirectory())continue;for(const f of fs.readdirSync(d))if(f.endsWith(".json"))o.push([s,f.replace(".json",""),path.join(d,f)]);}return o;}
const b={login:0,form:0,search:0,other:0},pg={login:new Set(),form:new Set(),search:new Set(),other:new Set()};
for(const [site,page,f] of files("m1/curated")){const k=site+"/"+page,m=JSON.parse(fs.readFileSync(f,"utf8"));const ex=[];
 (function w(x,p,anc){if(Array.isArray(x))return x.forEach((y,i)=>w(y,p+"["+i+"]",anc));if(!x||typeof x!=="object")return;
  if(x._expose)ex.push({p,name:x._expose.name,anc});
  Object.entries(x).forEach(([q,v])=>w(v,p?p+"."+q:q,[...anc,{p,ek:Object.entries(x).filter(([a,z])=>!a.startsWith("_")&&z&&typeof z==="object"&&z._expose)}]));})(m,"",[]);
 for(const e of ex){let t="other";
  if(e.anc.some(a=>/login|sign-in/i.test(a.p)))t="login";
  else if(e.anc.some(a=>a.ek.length>=2))t="form";
  else if(/search|query|keyword|article-search/i.test(e.name))t="search";
  b[t]++;pg[t].add(k);}}
console.log(JSON.stringify(b),Object.fromEntries(Object.entries(pg).map(([k,v])=>[k,[...v].sort()])));'
# 期望：{"login":8,"form":25,"search":5,"other":19}
# 迁移页并集见 A.2 的 UNION=18（search∪form∪table∪login∪paginator 去重后）
```

### A.5 `_fields` 节点数与"表格资格"
```bash
cd /home/z/vibe/autofe
node -e '
const fs=require("fs");
let keys=0,nodes=0;const per={};
for(const k of ["aliyun-com/product-ecs","aws-amazon/ec2-on-demand","gov-uk/ni-rates-letters","learn-microsoft/vm-sizes"]){const m=JSON.parse(fs.readFileSync("m1/curated/"+k+".json","utf8"));let n=0;
 (function w(x){if(Array.isArray(x))return x.forEach(w);if(!x||typeof x!=="object")return;if(x._fields){n++;keys+=Object.keys(x._fields).length;}Object.values(x).forEach(w);})(m);nodes+=n;per[k]=n;}
console.log("_fields nodes",nodes,"keys",keys,JSON.stringify(per));'
# 期望：nodes 136 / keys 357 / {aliyun 5, aws 76, gov-uk 32, learn-microsoft 23}
node -e '
const fs=require("fs");
let tot=0,uniform=0,inconsistent=0,oneRow=0;const bad=[];
for(const k of ["aliyun-com/product-ecs","aws-amazon/ec2-on-demand","gov-uk/ni-rates-letters","learn-microsoft/vm-sizes"]){const m=JSON.parse(fs.readFileSync("m1/curated/"+k+".json","utf8"));
 (function w(x,p){if(Array.isArray(x))return;if(!x||typeof x!=="object")return;
  for(const arr of ["_items","_lines"]){const its=x[arr];if(!Array.isArray(its))continue;const f=its.filter(i=>i&&i._fields);if(!f.length)continue;tot++;
   const uniq=new Set(f.map(i=>Object.keys(i._fields).sort().join("|"))).size;
   if(uniq>1){inconsistent++;bad.push(k+"."+(p?p+".":"")+arr);}else if(its.length<2)oneRow++;else uniform++;}
  Object.entries(x).forEach(([q,v])=>w(v,p?p+"."+q:q));})(m,"");}
console.log(JSON.stringify({collectionNodesWithFields:tot,uniformTable:uniform,inconsistent,oneRow,bad}));'
# 期望：tot 14 / uniform 11 / inconsistent 1（aws data-transfer）/ oneRow 2
```

### A.6 搜索框的"名称 vs 占位"混用证据
```bash
cd /home/z/vibe/autofe
node -e '
const fs=require("fs");
const rows=[["bilibili-com/home","search"],["bilibili-com/read-home","search"],["36kr-com/search-ai","query"],["huawei-cn/search-laptop","query"],["mi-com/search-phone","query"],["sspai-com/post-114699","discussion.input"],["airbnb-com/room-28871","booking.check-in"]];
for(const [k,p] of rows){const m=JSON.parse(fs.readFileSync("m1/curated/"+k+".json","utf8"));let c=m;for(const s of p.split("."))c=c&&c[s];
 console.log(k,"\t",p,"\t_label=",JSON.stringify(c?._label??null),"\t_expose=",JSON.stringify(c?._expose??null));}'
```

### A.7 校验/保真门禁（迁移各步验收）
```bash
node m1/validate.mjs $(find m1/curated -name '*.json')   # 期望全部 ok
node m1/eval/pipeline.mjs                                 # 期望退出码 0（三目标保真 1.00）
```

---

## 附录 B：本轮数字备查

- 策展 42 页 / 23 站；手写模型 6 页。
- `_expose` 57（25 页）；类型 text 46 · bool 8 · date 2 · num 1。
- ≥2 暴露子件的面板 12（11 策展 + 1 模型）。
- 57 个 `_expose` 归类：login 8（3 页）· form 25（8 页）· search 5（3 页单查询位 + 1 重叠页）· 裸 `_expose` 19（12 页）。
- `_fields` 节点 136（aliyun 5 / aws 76 / gov-uk 32 / learn-microsoft 23）；字段键合计 357。
- 带 `_fields` 的集合节点 14：11 合格 · 1 字段集不一致（aws `data-transfer`）· 2 单行（learn-microsoft fpga/storage）。
- 迁移候选页并集 18；按类型：search 3 / form 8 / table 4 / login 3 / paginator 3。
- 5 个原语 schema 字段槽合计 **29**（search 5 / form 5 / table 6 / login 8 / paginator 5）。
- `offer` 41 个价格节点：本轮不升类型。

## 附录 C：用户裁定原文（口径来源，`.scratch/decisions-for-user.md` 末尾）

- D-1：*"Macro 听着非常像黑魔法……复合元语不是本身就是一个组件信息的感觉吗？它没有参数校验之类的吗？什么叫做缺少必要的部件？我觉得这种复合元语应该本身就类似于 Schema 的感觉。"*
- D-2：*"复合元语只是把一堆元语封装成一个复合元语，它也有字段、词汇……你完全可以通过这种点 A 点 B 点 C 的方式访问到里面的子属性。像 login 的密码这种保护属于 edge case，可以有，但不是重点，暂时不保护问题也不大。"*
- D-3：*"一个搜索框本身肯定是一个复合元语，它应该有一个名称和一个默认值。如果没有给默认值、只给了名称，可以考虑把名称当作默认值水印在框内节省空间……得看你的页面编排引擎怎么思考。"*
- D-6：*"显示 USD 也好、显示 $ 也好，不都是一个风格吗……更像是一种风格/用户偏好，而不是在源语里写死的。源语里撑死就是币种，币种可能是一个标准枚举。"*

COMPOSITES_DESIGN_DONE primitives=5 schema_fields=29 migration_pages=18 decisions=3

---

## 9. 实现状态（轮 47：S0 + S1）

**本轮落地的**（S1 = 注册表 + 校验器 + 路径引用，零实例；front-matter 的"本轮不改代码"仅适用于轮 47 之前的**设计稿**轮次）：

- **注册表** `m1/composites.json`：5 个类型（`search`/`form`/`table`/`login`/`paginator`），共 **29 个字段槽**，按 §2.2 的描述符（`required`/`key`/`type`/`action.verbs`/`expose`/`allowed`/`addressable`/`min`/`sensitive` 等）。键集即闭式枚举；`model-lib.mjs` 一次读入导出 `COMPOSITES`。
- **语法增量**：`_composite`、`_default` 加入 `RESERVED`（`m1/model-lib.mjs`）。`_default` 是 §2.4 的第二个保留键；本轮无实例，渲染层对它的支持排在 S4。
- **校验器**（`m1/validate.mjs`）：错误对象新增 `code`；复合件按 schema 投影逐项校验，实现的硬错误码：
  `E_COMPOSITE_UNKNOWN_TYPE` / `E_COMPOSITE_MISSING_REQUIRED` / `E_COMPOSITE_BAD_FIELD` / `E_COMPOSITE_NOT_ALLOWED` / `E_COMPOSITE_NESTED` / `E_COMPOSITE_EXPOSE_MISSING` / `E_COMPOSITE_ROWS_INCONSISTENT` / `E_COMPOSITE_FIELD_UNDECLARED` / `E_COMPOSITE_ACTION_CARDINALITY` / `E_COMPOSITE_REF_UNRESOLVED`。
  **"缺少必需的部件" = `required:true` 的槽在实例里不存在**（§3.4）：缺 `name`/`secret` 之类报 `E_COMPOSITE_MISSING_REQUIRED`；缺**固定名**的对外状态（如 `signed-in`）报 `E_COMPOSITE_EXPOSE_MISSING`；提交动作数 ≠ 1 报 `E_COMPOSITE_ACTION_CARDINALITY`。
- **路径引用**（§4.2 双命名空间）：条件 token 若为裸标识符仍按 fact 名解析（`E_EXPR_PATH`，现状不变）；含 `.`/`[` 的 token 或 `/…` 绝对路径按**树路径**解析（相对写出条件的节点，可逐级向上穿到祖先；`/` 从文档根），解析不到报 `E_PATH_UNRESOLVED`，终点不是 `_expose`/角色事实/集合报 `E_PATH_NOT_A_FACT`。现有语料 0 处点路径条件，故零回归。
- **自测** `m1/eval/composite-selftest.mjs`：19 条断言（14 拒 + 5 收），接入 `m1/eval/pipeline.mjs` 作为**第 11 道自测**。
- **S0.1（模型侧）**：`aws-amazon/ec2-on-demand.data-transfer` 7 行的 `_fields` 键集补齐为一致（`uniqFieldSets=1`）。

**与设计的差异（逐条登记，均不改变本轮行为——零实例）**：

1. **`login.secret` 的暴露类型是 `secret`，不是正文 §5.4 写的 `text`。** 依据：轮 46 已把 `secret` 加入闭式值类型，且 3 张策展登录页（github/stripe/xiaomi）实测都用 `_expose{type:"secret"}`；用 `secret` 才能把"密码位"与"账号位"分开计数，缺 `secret` 才可机检（S3 验收）。记入 `failures.md` F-089。
2. **S0.2（6 处 placeholder 从 `_label` 拆出）本轮未做模型迁移。** §6.4 S0 要求把它迁到 `_default` 且"placeholder 展示不变"，但渲染器画出 `_default`（名称水印回退）属于**渲染语义变更**，与本轮"不得改渲染器语义"冲突；且受影响的 6 个策展文件不在本轮写入白名单内（白名单只含 `aws-amazon/ec2-on-demand.json`，仅 S0.1）。本轮只把 `_default` 的**语法与注册表槽**备好，迁移顺延到 S4（S4 本就要拆名称/默认值）。
3. **S0.1 的空格表示**：分组行缺失的 `data-transfer-price` 补为 `{"text":""}`（**显式空**，不编造金额）。配套：table 校验把"声明字段里的空文本"视为**空格**而非类型不符；渲染侧新增共享判定 `axis.hasValue`（`null`/`undefined`/空文本/空列表 ⇒ 无值），三目标同判 ⇒ 显式空不会把源站分组行变成"缺价数据行"（轮 35 规则保留）。约定见 §10。
4. **`E_COMPOSITE_NOT_ALLOWED` 的投影口径**：只把**结构槽键**（`_items`/`_fields`/`_action`/`_expose`/`_ref`/`_count`/`_empty`/`_default`）当作"字段槽"检查；`_label` 是通用角色事实、不算槽标记，故登录页子节点的 `_label` 不会被误报。
5. **`paginator.items`/`more` 的"至少一个"** 用注册表的 `requireOneOf` 表达（§5.5 的 `✅*`），缺两者时报 `E_COMPOSITE_MISSING_REQUIRED`。

### 9.1 S2（轮 48）：`table` 首次真实迁移 —— 11 个实例

**已迁移**（加 `_composite: "table"`，4 页 11 个集合节点）：

| 页 | 集合节点 | 行数 |
|---|---|---|
| `aliyun-com/product-ecs` | `instances` | 4（有身份列 `_name`）|
| `aws-amazon/ec2-on-demand` | `region-egress` / `same-region` | 67 / 2 |
| `gov-uk/ni-rates-letters` | `employee-rates` / `employer-rates` | 16 / 16 |
| `learn-microsoft/vm-sizes` | `general-purpose` / `compute-optimized` / `memory-optimized` / `gpu-accelerated` / `high-performance-compute` / `name-structure-breakdown` | 4 / 2 / 5 / 4 / 3 / 3 |

**验收（全绿）**：① 4 文件 schema 校验 `ok`（11/11 实例通过，0 个 `E_COMPOSITE_*`）；② 三目标**零渲染变化**——`render*.mjs`/`axis.mjs` 不读 `_composite`，逐页 HTML（剥 `<style>` 前后）与 HEAD **逐字节一致**，文本/Markdown 同；③ 列名仍只来自 `vocab-fields.json`（`axis.columnLabel`，无内部键上屏）；④ 行缺列负例报 `E_COMPOSITE_ROWS_INCONSISTENT`（实测）。

**schema 的价值证据（首次真实校验）**：11 个实例本身均已一致 —— 迁移**零报错**正说明 schema 只拒绝真缺陷而不误伤（若集合真缺列，硬报错；`aws data-transfer` 的类型混用列早已在轮 47 S0.1 修好）。负例实测：删一列 ⇒ `E_COMPOSITE_ROWS_INCONSISTENT`；加未声明列名 / `money` 列塞 `text` ⇒ `E_COMPOSITE_FIELD_UNDECLARED`。

**未迁移与理由**（诚实优先，详见 `failures.md` F-090）：
- `aws-amazon/ec2-on-demand.data-transfer`：§6.4 S2 明写"维持裸 `_fields` 直至 S0 完成"——本轮范围只含 `region-egress`/`same-region`，不迁移。
- `learn-microsoft…storage-optimized` / `fpga-accelerated`（各 1 行）：§6.2(a) 设计它们应出 `W_COMPOSITE_ROWS_TOO_FEW`，但该校验器**只有错误通道、无警告通道**（`validate.mjs`），升 table 会被静默接受而零提示 ⇒ 不迁移（与 §6.4 S2 的"11 个合格集合节点"计数一致），保留裸 `_fields`。
- **schema 缺口（F-090.b）**：行一致性只比对带 `_fields` 的行；某行**整块 `_fields` 缺失**不被捕获（负例 `row_without_fields.json` = `ok`）。未放宽任何条件。

### 9.2 S3（轮 49）：`login` 首次真实迁移 + schema 补漏 + `_expose` 双重语义

**A. 补两个 schema 漏洞（F-091）**
- **漏洞 A（静默接受 = 漏洞）**：`table` 行一致性只比对带 `_fields` 的行；某行**整块缺 `_fields`** 时静默通过。**修**：`withF.length && noFields.length` ⇒ 硬报错 `E_COMPOSITE_ROWS_INCONSISTENT`。
- **漏洞 B（无警告通道）**：设计 §3.3 的 `W_COMPOSITE_ROWS_TOO_FEW` 无处输出，轮 48 因此拒绝迁移两个单行族。**修**：`validate()` 返回 `warnings`；`validateFiles()` 打印（不改退出码）；`pipeline.mjs` 汇总打印 `[pipeline] 模型校验警告（不阻断）: N 条`。
- **升级**：`learn-microsoft/vm-sizes.{storage-optimized,fpga-accelerated}`（各 1 行）升 `_composite:"table"`，校验 `ok` 且**实测打印两条警告**。
- **门禁**：`composite-selftest.mjs` 23→24 条（新增整行缺 `_fields` 拒例 + 单行正例/两行反例）。

**B. `login` 3 页迁移（F-092）**
- 给 `github-com/login`、`stripe-dashboard/login`、`xiaomi-account/login` 加 `_composite:"login"` + `_expose:{name:"signed-in",type:"bool"}`；`secret` 槽用轮 46 的封闭值类型 `secret`（`type="password"`，值不回显）。3/3 通过 schema。
- **注册表收窄（裁定 A）**：`login.submit.verbs` 由 `["submit","operate"]` 收窄为 `["submit"]`。理由：`operate` 是**通用动词**，放进 submit 槽会让任意被 operate 的控件冒充提交——github 的 passkey / 小米的扫码登录就是被这条卡住的；实测三页提交**全部**是 `verb:submit`，`operate` **全部**是额外登录方式。**这是收紧而非放宽表达力**（"恰 1 个 submit" 变成精确保证）。
- **`_expose` 双重语义（裁定 A）**：普通节点 `_expose` = 输入位（画控件）；复合件 `_expose` = 声明状态/输出（**不画控件**，可被路径引用）。落地为 `axis.mjs#exposeRendersAsControl`，**三目标共同消费**（`nodePlan.choice`）。对既有 42 页**零影响**（全库 0 个节点同时带 `_composite`+`_expose`）。
- **验收（全绿）**：① 3 文件 schema `ok`；② 三目标**逐字节不变**（HTML 剥 `<style>` 后 body、text、Markdown 与 HEAD 一致）；③ `signed-in` 可被 `_when` 引用（构造用例：true⇒可见，false/undefined⇒不可见）；④ `axis-selftest.mjs` 新增 U0–U4（129 条断言）且已证伪（临时反转规则 ⇒ U0/U1/U3 失败，已撤销）。

## 10. 空值约定：`{text:""}` = 已声明但为空（轮 47 S0.1）

**约定**：一个**已声明但内容为空**的字段槽写成空的封闭类型化值——`{"text": ""}`（空文本）或 `{"list": []}`（空列表）。它表示"这一格在源站就是空的"，**不是**未声明、也**不是**编造。

**为什么需要它**：`table` schema 要求 `columns`（每行 `_fields` 的键集）**完全一致**（§5.3）。`aws-amazon/ec2-on-demand.data-transfer` 的两行源站分组行第二格为空（§6.3），若不补键则行键集不一致（schema 硬报错）；补一个真实金额又是编造。显式空是唯一既满足"键集一致"又不撒谎的写法。S2 迁移 `table` 时会大量用到：**空单元格一律写 `{"text": ""}`**。

**判定（语义，非某个渲染器的偏好）**：`m1/axis.mjs#hasValue(v)` 是唯一的"有值"判定——
- `null` / `undefined` ⇒ 无值；
- 空文本（`{"text": ""}`）/ 空列表（`{"list": []}`）⇒ 无值；
- 其余类型化值（含 `{"num": 0}` / `{"money": 0}` / `{"bool": false}`、非空 text/list）⇒ 有值；非类型化对象（节点）⇒ 有值（由调用方决定）。

**三个目标都消费它**（§6.4 S0 的"渲染 diff 为 0"）：HTML 的分组行判定 `tableRowLabel(rp, it)`、文本/Markdown 的同一行判定与单元格取值，全部走 `hasValue`。因此一轮 35 的规则（"唯一值在第一列的行 = 源站自己的分组行，画成跨列表头"）在补列**之后仍然成立**：`aws data-transfer` 的两行仍旧渲染 `<tr class="row-group"><th colspan="2">…</th></tr>`，而真正有价的行是普通数据行。

**校验器侧**：`table` 的 `E_COMPOSITE_FIELD_UNDECLARED` 对"声明字段里的空文本"**豁免类型检查**（空文本在 money/text 列里都合法），因为 `{"text": ""}` 是空格而不是 `money`/`text` 的值类型冲突。

**门禁**：`m1/eval/axis-selftest.mjs` T0–T3b（`hasValue` 真值表、共享行判定、HTML 仍出跨列分组行、有真实值出普通数据行、text/Markdown 同判定）；已做证伪（临时让空文本算有值 ⇒ T0/T1/T2 失败，已撤销）。
