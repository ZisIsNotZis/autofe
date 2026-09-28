# M1 公理 v0.1（AutoFE 元语第一版）

状态：v0.1——经 6 个 exemplar 页面（apple 购买向导、antd 大表格、linear 落地页、stripe 定价、sspai 文章、aliyun-ecs 产品页）手写编码验证；每处变更都有失败日志条目（F-001..F-019）。**本语法写不出来的东西进失败日志，不是发明新字段的理由。**
配套：`m1/vocab.json`（角色/动词词表）、`m1/schema.json`（机器校验）、`m1/failures.md`（失败日志）。

## 0. 设计纪律

- **封闭语法**：模型里出现的每个键要么是本文件的保留键，要么是子节点命名键，要么是词表内的角色。_validator_ 拒绝一切其他键；被拒即失败日志条目。
- **无 UI 词**：角色、动词、谓词全部是业务语义。布局/样式/组件形态由引擎决定。
- **一次性组合 = 内联嵌套**，不产生新原语（无逃生口）。复合原语推迟到 M4。
- **同构纯函数**：同一 model + context 必须产出逐字节相同的渲染。

## 1. 文档与节点

根节点就是一个节点（页面本身是一条故事线）。

```jsonc
{
  "_intent": "让访客理解 iPhone 16 的差异点并预购",   // 本故事线的意图（故事线节点必有）
  "_primary": "specs._chip",                        // 主指：本故事线要传达的那一个点（相对路径）
  "_key": "product-iphone-16",                      // 业务身份（跨故事线共享时用）
  "_when": "region == CN",                          // 业务条件：何时相关（可选）
  "_title": { "text": "iPhone 16" },                // 事实：角色 → 类型化值
  "_price": { "money": 5999, "currency": "CNY" },
  "specs":  { "_intent": "硬件差异点", "lines": [ /* … */ ] },  // 子节点 = 命名子组
  "_lines": [ /* 有序子故事线，数组顺序 = 同级优先级 */ ],
  "_items": [ /* 同质集合元素（列表/表格行） */ ],
  "_action": { "verb": "preorder", "to": "https://…", "when": "stock > 0" },
  "_rel":   { "compare": true, "order": "time" }
}
```

**保留键（封闭集合）**

| 键 | 含义 | 约束 |
|---|---|---|
| `_intent` | 本节点为何存在 / 要传达什么 | 故事线与命名子组必填 |
| `_primary` | 主指：本故事线唯一要传达的点 | 相对路径；至多一个 |
| `_key` | 业务身份；同 key = 同一元素 | 引用与状态按它归一 |
| `_when` | 业务条件（何时相关） | 表达式见 §5 |
| `_action` | 本元素的动作 | **至多一个**（公理层） |
| `_rel` | 关系约束（语义谓词） | 见 §4 |
| `_lines` | 有序子故事线 | 数组顺序 = 同级优先级 |
| `_items` | **并行实例集**（可互换的同类实例——故事结构声明，非表现声明） | 顺序语义由 `_rel.order` 定；**同质性与形态由引擎启发式发现**（F-018）：字段形状相似→同段；字段多→表格，少→卡片。业务永远不说"表格" |
| `_expose` | 本节点的交互产出一个事实（选择 / 输入 / 登录态） | `{name, type}`；`name` 是页面内声明的标识符，见 §6.1 |
| `_<role>` | 事实：词表内的语义角色 → 类型化值 | role ∈ vocab.roles |

**非保留键** = 命名子组（子节点）。**对象键的插入顺序 = 同级优先级**（序列化必须保序）。

## 2. 类型化值（封闭集合）

| 类型 | 形状 |
|---|---|
| 文本 | `{"text": "…"}` |
| 数值 | `{"num": 6.1, "unit": "inch"}` |
| 金额 | `{"money": 5999, "currency": "CNY"}` |
| 时间 | `{"date": "2026-09-18"}`（ISO 8601） |
| 布尔 | `{"bool": true}` |
| 图像 | `{"image": "url", "alt": "…"}` |
| 引用 | `{"ref": "key:product-16"}` 或 `{"ref": "/lines[2]"}` |

## 3. 角色词表 v0（`vocab.roles`）

identity: `title` `name` `label` `subtitle`
description: `summary` `detail` `text`
classification: `category` `tag` `status`
quantity: `count` `measure`
money: `price` `amount`
time: `datetime` `duration` `deadline`
attribution: `author` `source` `brand` `provider`
media: `image` `video` `icon`
judgement: `rating` `rating-count`
reference: `ref`
place: `place`

新增角色 = 语法变更，必须走失败日志 → 审查，不得编码时即席添加。

## 4. 关系谓词 v0（`_rel`，语义，不是表现）

| 谓词 | 语义 | 引擎推导 |
|---|---|---|
| `compare: true` | 这些子项必须**一起被考虑** | 并排/对照 |
| `order: "sequence"` \| `"time"` \| `"none"` | 项序有意义（步骤 / 时间线 / 无序） | 编号 / 时间轴 / 网格 |
| `level: n` | 相对强调层级（同级内的档位，配合数组顺序） | 字号/密度梯度 |

不设 `expandable`/`scrollable`——那是表象，由嵌套深度与上下文推导（§3.4）。

## 5. 条件表达式 v0

`_when` 与 `_action.when` 共用同一微语法，只允许：
`<path> <op> <literal>`，op ∈ `== != > < >= <=`；组合仅 `and` / `or` / `( )`；
path 解析到本节点或祖先的 `_<role>` 事实，**或本节点 / 祖先链上由 `_expose` 声明的事实**；literal 是数字 / 字符串 / 布尔。
示例：`stock > 0`、`finish == "Pro"`、`signed-in == true and region == CN`。

## 6. 动作 v0（`_action`）

`{ "verb": V, "to"?: target, "when"?: expr, "params"?: {name: type} }`
- `verb` ∈ `vocab.verbs`；v0 内置：`navigate` `open` `submit` `select` `toggle` `operate`
- 业务动词（`buy` `preorder` `follow`…）进领域词表文件，属**词表变更**（记日志），不是语法变更
- `to`：内部 `key:` / 绝对路径 `/`，或外部 URL；无跳转省略
- `params`：`operate` 的输入schema（名称→类型），类型取 §2 的封闭集合

**"带一个按钮的卡片" ≠ "就是一个按钮的卡片"（F-020）**：动作挂在元素上，包含 ≠ 同一。一张可乐卡片即使视觉上只有一个"买"按钮，故事层也是两个元素——卡片自己的动作是"查看这瓶可乐的更多信息"，"买"是子元素的动作。卡片级"点看详情"必须显式建模为卡片自己的 `_action`，不得省略后由引擎猜测；引擎降级时内层命中优先（design-basis §3.5）。

```jsonc
{ "_key": "coke-330", "_intent": "这张卡片就是这瓶可乐", "_title": { "text": "可口可乐 330ml" },
  "_price": { "money": 3, "currency": "CNY" },
  "_action": { "verb": "open", "to": "key:coke-330-detail" },   // 卡片自身 = 查看详情
  "buy": { "_intent": "买是另一个故事", "_title": { "text": "购买" }, "_action": { "verb": "buy" } } }
```

## 6.1 暴露事实（`_expose`）：登录态、页面选择、输入的统一机制

- 带 `_items` 的组：`_expose` 使其成为**单选**；暴露的事实取所选条目的 `_name`（无则 `_title`）的文本值，事实名 = `name`。
- 无 `_items`：自由输入，类型取 `type`（§2 封闭集合）。
- **`name` 是领域标识符，不是词表角色**（F-010）：语义角色封闭、领域标识符开放但必须声明。
- **选择是引擎的，选项集合与依赖是模型的。** 条件可引用暴露的事实（未选时为未定义 → 不成立）。
- 复合原语（M4）的义务由此而来：**复合原语不仅要能展开成公理，还必须声明它向页面引入的状态**。登录模块暴露 `signed-in`，是这一机制的典型。
- 归属判据（写入 design-basis §3）：两种用户需要不同的信息或动作 → 故事；只是形式与侧重不同 → 引擎。

## 7. 身份 / 地址 / 引用（§3.2 的落地）

- **身份** = `_key`（业务键）。同 key 的两个节点是同一元素，状态共享。
- **地址** = 树路径（`specs._screen`、`lines[2]`）。路径不是身份。
- **引用**：`{"ref": "key:x"}`（跨故事线）或 `{"ref": "/a/b"}`（同文档绝对路径）。
- 校验器必须解析全部 `_primary` / `ref` / `_when` 路径，解析失败 = 阻断。

## 8. 已知不作表达（v0 明确不做，进了也不算失败）

导航历史（面包屑）、分页控件、用户运行时覆盖状态、i18n 资源、动画。

## 9. 渲染器契约（最小渲染器，v0）

- 输入：通过校验的 model + 固定 context（桌面 1440、单一中性品牌）。
- 输出：单个自包含 HTML；**同输入逐字节同输出**。
- 必须渲染**每一个事实**，不得丢弃；`_primary` 成为主视觉；`_lines` 顺序成为区块顺序；`_rel.compare` 并排；`order=time` 时间轴；`_action` 成为可操作元素；`_when` 为假时该节点不渲染。
- 纯函数、无 AI、无运行时网络。
