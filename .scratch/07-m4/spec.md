# 07 · M4 前置：引擎基础缺陷修复（M4-a）

来源：`docs/m1/m4-composites-proposal.md`（测量自 36 策展页 + 104 抓取页）+ 父代理独立复核（三条全部复现）。
性质：**这些是与我们自己的公理冲突的引擎缺陷，不是新产品决策**，因此无需等待用户即可修。

## D1（blocker）`_expose` 事实不进作用域 ⇒ 状态相关块静默消失
- 实证：`m1/models/ant-design/components-table.json` 的 `bulk` 块 `_when: "count(selected) > 0"` 渲染为 **0 次**（`grep -c 'Batch operations'` → 0）；全库 `_when` 用量仅此 1 处，属潜伏缺陷。
- 要求：
  1. `_expose` 声明的事实（如 `selected`、`signed-in`）**并入求值作用域**，优先级：**祖先链上最近声明 > 上下文注入**（与 render.mjs 现有"链上后者覆盖前者"一致）；
  2. **校验器硬规则**：`_when` 里出现的名字必须能在作用域内解析（未声明的名字 ⇒ 硬错误），杜绝"静默不渲染"。
- 验收：构造断言——antd 模型在 `selected` 非空时出现该块；注入 `count(selected)=0` 时不出现；`_when` 引用未知名字时 `validate.mjs` 报错。

## D2（major）`_rel.compare` 命中不稳定，违反 F-031 §3
- 实证：compare 标记 20 处，仅 8 个模型文件渲染出 `cmp-table`；其余落到 `deflist/product-cards/cards`；集合级标记只加了外层 CSS 网格。
- 要求：`_rel.compare` 的语义**与位置无关**——只要一组条目被标为对比实体（≥2 个），就必须渲染为对比表（列=实体、行=属性、不换行可横滚）；无法成表时（缺可对照属性）必须记录**显式降级理由**，不得静默变形。
- 验收：全库 compare 标记的集合 **100% 渲染为 cmp-table**，或出现在审计输出的"显式降级"清单里。

## D3（major）引擎在做价格比较 ⇒ 违反 design-basis §6
- 实证：`m1/render.mjs:508` 用 `f.value.money > node._price.money` 决定是否画删除线"原价"。
- 要求：**引擎不做任何业务算术/比较**。金额之间的比较若要有意义，必须由后端/模型以显式事实表达（例如 `_price` 带 `qualifier: "was"` 或独立的 `_compare-at` 事实），渲染器只负责呈现。若现有语料没有该事实，则**删除该分支**（宁可少一个删除线，也不越权计算）。
- 验收：`grep` 渲染器无 money 数值比较；法务口径：引擎层 0 处业务算术。

## 附带（同轮，若预算允许）
- `M4-a.4` 抓取层证据缺口（写 ticket，不实现）：exemplar 层 0 个 `<table>`（28 页全在 support 层）；14/36 exemplar 有"查看更多"但仅 4 页建模分页；`passport-baidu/login` 是唯一真实登录页且不在 exemplar 36 内 ⇒ **M4 的 `table`/`login` 原语要先补 exemplar 样本**。

## 父代理临时裁定（待用户确认，记为 provisional）
- **P1 = 决策1 方案 A**：`_expose` 事实并入作用域，优先级"最近声明祖先链 > 上下文注入"；`vocab-context.json` 保留 `signed-in` 作为后端已知态的注入路径。
- **P2 = 决策2 方案 A**：字段可引用性由**原语类型**定义并写入词表（`form` 字段可引用；`login` 字段不可引用，防 secret 进条件语法）。
- **P3 = 决策3 方案 A**：`prose` 走**引擎修法**（连续 `_text` 段合并），不新增语法/谓词（样本仅 1 页 9 段，不足支撑新语法）。
- 三条都会在用户回来后请其确认；若被否决，仅影响 M4 原语实现，不影响 M4-a 基础修复。

## 纪律（沿用）
单写入者；40 分钟分片；每片先落盘 `fix-report-5.md`；收尾 36/36 + 自查干净；改模型过 `validate.mjs`；不得动 corpus/；不得引入逃生口；不得自行提交；新失败模式记 `m1/failures.md`。
