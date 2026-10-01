# 轮 50 / S4 — `search` + `paginator` 迁移（终稿）

结果：`search` **2/3**、`paginator` **2/3**（余下 2 页按"缺必需槽 ⇒ 不迁移并说明"处理）。
裁定 A 已落地：**槽位角色**（state|field|pointer）取代轮 49 的宽规则。

## 1. 依据
`docs/m1/composites.md` §5.1/§5.4/§5.5、§6.2(d)(e)、§6.4 S4/S6、§3.3/§9、§10；轮 50 父代理裁定 A。

## 2. 冲突（已按轮 49 方式上报并拿到裁定 A）
- **A · search**：`query` 是节点**自身**的 `_expose`。加 `_composite:"search"` 后，轮 49 的"复合件 `_expose` 一律是 state"规则把输入框整个吞掉（before `<input name="query" placeholder="磊哥游戏">` ⇒ after 只剩 `<div class="fact">磊哥游戏</div>`）。
- **B · paginator**：三页都没有 `_ref`；补 `_ref` 会把内部集合路径印上屏（`<a class="ref" href="#-contribution-rates">/contribution-rates</a>`）。
- **裁定 A**：角色由 **schema 槽位**决定，不由"是不是复合件"决定：`state`⇒不画控件、`field`⇒照旧画控件、`pointer`⇒不作为事实渲染。取代轮 49 宽规则。

## 3. 落地
- `m1/composites.json`：5 类型 **30 槽位**补 `role`（`login.state`=state、`search.query`=field、`paginator.ref`=pointer，其余交互面=field）；`$comment` 记录角色语义。原描述符 `role:"name"/"value"` 被渲染角色取代（`key` 已可定位名称槽）。
- `m1/axis.mjs`：`slotRoleOf` + `exposeRendersAsControl`（仅 `field` 槽画控件）+ `refRendersAsFact`（`pointer` 槽不入 `facts.list`）；`nodePlan` **三目标共同消费**（未改三个渲染器文件）。
- `m1/validate.mjs`：实现 §6.4 S4① 已定义警告 `W_COMPOSITE_NAME_ONLY_WATERMARK`（注册表 `render:"watermark-fallback"` 驱动，非硬编码），不阻断。

## 4. 迁移实例（4 页，全部 schema `ok` + 三目标逐字节不变）
| 页 | 键 | 警告 |
|---|---|---|
| `bilibili-com/home.search` | `_composite:"search"` | 1 条 `W_COMPOSITE_NAME_ONLY_WATERMARK` |
| `bilibili-com/read-home.search` | `_composite:"search"` | 1 条同上 |
| `huawei-cn/search-laptop.results.pagination` | `_composite:"paginator"` + `_ref:{ref:"/results"}` | — |
| `huawei-cn/search-phone.results.pagination` | 同上 | — |

逐页比对（HTML 剥 `<style>` 后 body / text / Markdown）与 HEAD **逐字节一致**；3 张 login 页同样逐字节一致（零影响）。`m1/curated/renders/**` 的 42 个页面产物**零变更**（只有 `--shots` 的 gallery/manifest 更新）。

## 5. schema 抓到了什么（search/paginator 首次真实遇到）
1. **`search` 缺 `name`**：`taobao-com/home._lines[0]` 无 `_label`（源站把热搜占位放 `_summary`，§5.1 `[A.6]` 早记过）⇒ `E_COMPOSITE_MISSING_REQUIRED`；补 `_label` 会新增可见标签/水印 ⇒ **不迁移**。（另附 `E_COMPOSITE_NOT_ALLOWED`：该实例的 `_items` 无槽。）
2. **`paginator` 缺可解析的 `_ref`**：`gov-uk/ni-rates-letters.pagination` 是**页面级 Next**（多页指南），本页没有代表"被分页页面序列"的集合节点；`_ref:{ref:"/"}` 实测 `E_COMPOSITE_REF_UNRESOLVED`（`ref /: empty`）；唯一能解析的路径是页内表格（`/employee-rates`）但那不是被翻页对象 ⇒ **不迁移**（不编造目标）。
3. **槽位语义歧义（已裁定）**：同一 `_expose` 键在 search（输入）与 login（状态）里语义相反 ⇒ schema 必须显式声明槽位角色；`_ref` 是角色事实（会渲染）而非纯结构键 ⇒ 需 `pointer` 角色。
4. **与实测冲突**：轮 49 的"复合件 ⇒ state"宽规则与 search 的输入槽实测冲突（吞控件）；裁定后由 schema 角色取代。

## 6. 验收（`node m1/eval/pipeline.mjs --shots`）
- HTML 保真 **42/42 = 1.00**；Markdown 目标 **42/42 = 1.00**；模型校验 **48 个全通过**。
- **警告通道可见**：4 条（2 条 `W_COMPOSITE_NAME_ONLY_WATERMARK` + 2 条 `W_COMPOSITE_ROWS_TOO_FEW`），不阻断。
- **十一道自测全过**：含 `axis-selftest` **135 条**（129→135，新增 V0–V5）与 `composite-selftest` **26 条**（24→26）。
- **反向证伪**：把 `search.query.role` 临时标成 `state` ⇒ V0/V1/V2 失败（3 条），撤销后 135 全过。
- 视觉自查 **42/42 干净**；采集↔模型一致性 **未命中 0**；证据一致性（PNG ⇄ HTML，v=mupc8ei4）**通过**。
- 未 git 提交；无暂存文件。

## 7. 残余 / 建议
- `gov-uk` paginator：若要迁移，需要模型侧有"被分页的页面序列"节点（或 schema 允许 `ref` 指向页面级导航的显式形式）——属**模型/语法**决定，未自行发明。
- `taobao` search：若要迁移，需要源站可见名称或闭式词表兜底名称落到可访问名称上（会改变渲染），同属待裁定项。

S4_DONE search=2/3 paginator=2/3 warnings=[W_COMPOSITE_NAME_ONLY_WATERMARK×2,W_COMPOSITE_ROWS_TOO_FEW×2] not_migrated=[taobao-com/home._lines[0],gov-uk/ni-rates-letters.pagination] schema_catches=4 fidelity=42/42 audit=clean
