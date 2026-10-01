# 轮 51 / S5 — `form` 迁移 + 两页收口（终稿）

结果：`form` **1/8**（`airbnb-com/room-28871.booking`）；原 §6.2(c) 的 8 个"form"候选里 **6 个其实是 search**（"输入 + 产出的结果列表"，裁定 A.(3)）⇒ 其中 5 页升 `_composite:"search"`，1 页无输入节点不迁移；另 1 页评论框不迁移。`taobao` 迁移；`gov-uk paginator` 不迁移（缺口）。
**两项根因是 schema/校验器与实测不符**，已按父代理裁定 A 做**三项修正**（非放宽）。

## 1. 依据
`docs/m1/composites.md` §5.1/§5.2/§6.2(c)/§6.4 S5/§9；父代理**裁定 A**（四项口径：covered() 修正 / form.submit 可选至多 1 / 输入+结果归 search / 嵌套由外层槽位声明）。

## 2. 冲突与裁定（照前两轮方式上报，已拿到 A）
把 `_composite:"form"` 注入 8 个候选面板后 **0/8 通过**（逐页穷举含 ≥2 `_expose` 的节点）：
1. **`covered()` 漏认已声明的 `shape:"expose-collection"`**（`m1/validate.mjs:219`）：`search.scope` 声明了该形状却认不出 ⇒ 带选择控件的面板一律 `E_COMPOSITE_NOT_ALLOWED`。**这是校验器缺陷**（声明了不认），非 schema 太紧。
2. **`form.submit` 太刚**：`required:true` 恰 1（verbs `{submit,operate,select}`）——华为/小米/少数派无提交（即时生效），airbnb 有 2 个 `operate`。

## 3. 落地（修正 + 迁移）
- **`m1/validate.mjs`（裁定 A (1)(2)(4)）**
  - `covered()`：`_items` 覆盖 `shape ∈ {collection, expose-collection}`。
  - action 描述符新增 `atMost`（form.submit 用；login 仍 `cardinality:1`）。
  - 嵌套：收集节点时**在嵌套复合件边界停止**（内层子树移出外层字段作用域）；仅当外层 schema 有槽 `composite:"<type>"` 时嵌套合法，否则仍 `E_COMPOSITE_NESTED`。
- **`m1/composites.json`**
  - `form.submit`：`required:false`、`verbs:["submit"]`、`atMost:1`；新增 `form.pagination` 槽（`composite:"paginator"`）。
  - `search.results`：可选 `_items` 集合槽（`role:"field"`，照常渲染；唯一未被实例占用的声明位，见残余）。
  - `$comment` 记轮 51 三项修正。
- **迁移（7 页）**
  | 页 | 类型 | 结果 |
  |---|---|---|
  | `36kr-com/search-ai.query` | `search` | ✅ schema ok；三目标逐字节不变；1 水印警告 |
  | `36kr-com/search-viz.query` | `search` | ✅ 同上 |
  | `huawei-cn/search-laptop.query` | `search` | ✅ 同上 |
  | `huawei-cn/search-phone.query` | `search` | ✅ 同上 |
  | `mi-com/search-phone.query` | `search` | ✅ 同上 |
  | `airbnb-com/room-28871.booking` | `form` | ✅ schema ok；三目标逐字节不变 |
  | `taobao-com/home._lines[0]` | `search` | ✅ 补真实 `_label`；**渲染变更（唯一一处）** |
- **未迁移（有据）**：`mi-com/search-earbuds`（无输入节点 ⇒ 不像 search；字段是 `_items` 选择控件 + 结果/推荐列表 ⇒ 不像 form）、`sspai-com/post-114699.discussion`（评论框非检索 §5.1 反例；`_items`/`_empty` 在 form 无槽）、`gov-uk/ni-rates-letters.pagination`（`_ref` 目标集合不在模型里 ⇒ 不撒谎）。

## 4. 为什么把 composite 放在输入节点（说明理由）
裁定 A.(3) 说"输入 + 结果列表"归 `search`。`search` 的 `name` 槽是**必需**的 `_label`；把 composite 放在**页根**会迫使新增一个根级 `_label`，实测会渲染出**可见** `<div class="fact">请输入关键词</div>`（与已有 placeholder 重复）⇒ 违反"不许自编名称 + 逐字节不变"。放在**输入节点**（`query`，已具 `_label`+`_expose`）正好符合 §5.1"单个查询位的搜索框"、且是既有 `bilibili-com/home.search` 的先例；结果列表是输入节点的**兄弟**（`search.results` 槽为"结果在搜索节点内"的形态预留，当前无用例）。

## 5. taobao before/after（唯一渲染变更，有据）
证据：`corpus/taobao-com/home/dom.html` 的 `<input id="q" name="q" aria-label="请输入搜索文字" ...>`（源站真有可访问名，此前策展丢失）。
- HTML：`<input type="text" name="query" data-type="text">` → `<span class="deflabel sr-only">请输入搜索文字</span><input ... aria-label="请输入搜索文字" placeholder="请输入搜索文字">`（`sr-only` 不可见）。
- text：`__________ (新款围脖 围脖 iPhone 18 Pro) [text]` → `请输入搜索文字: __________ (...) [text]`；MD 同。
- 理由：补回源站本有的可访问名（**未自编**）。

## 6. 验收（`node m1/eval/pipeline.mjs --shots`）
- HTML 保真 **42/42=1.00**；Markdown **42/42=1.00**；模型校验 **48/48**。
- **警告 10 条**（8 × `W_COMPOSITE_NAME_ONLY_WATERMARK` + 2 × `W_COMPOSITE_ROWS_TOO_FEW`），不阻断且可见。
- **十一道自测全过**；`composite-selftest` **26 → 32**（新增 search scope 收下 / form 无 submit 收下 / form 恰 1 submit 收下 / form 声明 pagination 收下 / form 两 submit 拒 / form 未声明嵌套拒；原"search `_items` 未声明"改为 `_fields`，因 `search.results` 已声明 `_items`）。
- 视觉自查 **42/42 干净**；采集↔模型一致性 **未命中 0**；证据一致性通过（taobao 重拍）。
- 6 个纯 `_composite` 迁移页三目标（HTML 剥 `<style>` 后 body / text / MD）与 HEAD **逐字节一致**。
- 总 `_composite` 实例 **27**（search 8 · form 1 · table 13 · login 3 · paginator 2）。未 git 提交；无暂存文件。

## 7. 残余 / 建议
- **`search.results` 槽暂无实例**（裁定 A.(3) 要求声明，登记待用；非脚手架，是给"结果在搜索节点内"形态的表达位）。
- `mi-search-earbuds` / `sspai discussion` 若未来要迁移，需要 schema 能表达"字段为主的 `_items` 选择控件"（form 的字段集合槽）或"评论框"（新类型）——属**模型/语法**决定，未自行发明。
- `gov-uk paginator`：需模型侧有"被分页页面序列"节点，或 schema 允许页面级导航的显式形式——采集/模型缺口，未自行发明。

S5_DONE form=1/8 taobao=migrated govuk_paginator=not:model-gap total_composites=27 warnings=10 fidelity=42/42 audit=clean
