# 轮 42：归属工具修正 + 既有归属复核（40 分钟硬限）

唯一写入者。范围：`m1/eval/imgattr.mjs`（新建）、`m1/eval/imgattr-selftest.mjs`（新建）、`m1/eval/pipeline.mjs`（注册自测门）、
`docs/m1/layout-axes.md`（§9.7）、`m1/failures.md`（F-081）、`.scratch/42-imgattr/**`。**未改渲染器/axis/corpus，未新增语法，看图 0 张（≤5），未 git 提交。**

> **超时如实登记**：本轮**超过 40 分钟硬限**（≈48 分钟）。超时在于"修正扫描器 + 建自测 + 逐条复核归属"三件事都是
> **先落盘再验证**，而模板/`<a>` 闭合语义上先踩了两个坑（见 §1.2 修正过程）。到点即停，未报"超出范围的完成"。

## 0. 结论先行

| 任务 | 结果 |
|---|---|
| 1 工具 | **`m1/eval/imgattr.mjs` 已建**；`dangling-open-tags=0`；4 手段（M1 业务键 / M2 alt==标题 / M3 **包含性**锚点名 / M4 几何序 y 带）；自带自测 13 条断言并注册为**流水线第 8 道自测门** |
| 2 复核 | huawei `consumer-phones` **37/37 通过，撤 0**；`36kr-com/home` 15/15、`taobao-com/home` 18/18 全量通过；轮 39 抽样 **5/5 通过**；**撤图总数 0** |
| 3 收尾 | `--shots`：42/42 HTML + 42/42 MD + 48 模型 + **八套自测** + 视觉自查 42/42 干净 + 证据一致性通过；F-081 已记 |

## 1. 任务 1：把修正后的扫描器提升为正式工具 `m1/eval/imgattr.mjs`

### 1.1 缺陷与修法（F-081 根因）

旧扫描器（`.scratch/38-images-sweep/imgattr.mjs`）的低层分词器把闭合标签**丢掉**（`c==='/' ⇒ continue`），
`tags[]` 只有开标签 ⇒ 祖先栈**从不弹栈** ⇒ `parent[k]` 是"文档序里**最近一个未闭合开标签**"= **最近的前置 `<a>`**，
不是"**包住这张图的 `<a>`**"。修法：

- `scanDom(html)`：**记录闭合标签并正确弹栈**，返回 `tags`（开/空标签，序 == capture 的 `cleanedIndex`）、`parents`、
  `closeEnd`（每个元素**真实 `</…>`** 的结束位置）、`dangling`、`unmatchedClose`。
- **`dangling-open-tags != 0` ⇒ CLI 退出码 2 并拒绝输出任何映射**（栈在撒谎，祖先链不可信）。
- 锚点可见文本按 `closeEnd` 截断（不再越过 `</a>` 吞下一个兄弟的文本）——旧 `textBetween(closeOf())` 会越界。
- 仍保留 round-26b 整页 tag 对齐闸门（`cleanedIndex` ⇄ 开标签序列）。

### 1.2 对外接口

```
node m1/eval/imgattr.mjs <corpus-dir> <model.json> [--minw=N] [--minh=N] [--only=<集合路径>] [--yband=min-max] [--json]
```
输出：**候选 ⇄ 条目映射**（每条一行：method / 条目 path / 标题 / 图尺寸 / bbox / 包含性锚点 href / 锚点可访问名 / alt / URL），
外加 SKIPPED 与 UNMATCHED 候选。导出 `scanDom/imageRows/attribute/modelEntries/keysOf/enclosingAnchor` 供脚本复用。

### 1.3 自测（`m1/eval/imgattr-selftest.mjs`，13 条断言，全部通过）

S1 嵌套 `<a>` ⇒ 最近包含者胜出；S2 **闭合 `<a>` 之后的图不得继承它**（本轮回归核心）；S3 未闭合标签被计数且不吞下一张卡；
S4 `<picture>` 多源 ⇒ 候选是 `<img>`、链过 `<picture>`；S5 条目内多图 ⇒ 都归该条目；S6 锚点文本不越界；S7 端到端 `attribute()`
（闭合锚点后的图**留空不误挂**，M3 只认包含性锚点名）。

> 建造中的两次真实修正（如实记录）：S1 最初假设"嵌套 `<a>` 内 img 归内层"，实测取到外层——因原片段把 img 放在内层 `</a>` **之后**；
> 改为 img 在内层内。S6 最初锚点名越界（旧 `closeOf` 无闭合 token 可找）——这正是必须记录 `closeEnd` 的原因。

## 2. 任务 2：复核既有归属

### 2.1 `huawei-cn/consumer-phones`（轮 40 的 37 张）— **37/37 通过，撤 0**

- 37 张 = 36（轮 40 记 M3 锚点名）+ 1（M2 alt）。**逐条复核**（`.scratch/42-imgattr/verify-huawei.mjs`，`dangling-open-tags=0`）：
  - **36 张 M3**：图确实在**其条目自己的商品卡**里——包含性 `<a href>` 与该卡**标题链**（可访问名 == 条目名）**同一 href**。
    例：`HUAWEI Mate X6` 图 `row#914` 的包含性锚点 `href=/cn/phones/mate-x6`，同 href 的标题链可访问名 = `HUAWEIMateX6`。
    （商品图链 `<a class=product-img>` 自身可访问名为**空**——`<img>` 无 alt；故按"同 href 标题链"判。
    证据：`.scratch/42-imgattr/report` 复核表，41 条 `card-href`。）
  - **1 张 M2**：`why._items[6]`「隐私」= 图 `reasons-7.jpg` 的 `alt` **逐字** `"隐私"`（M2 正当，与锚点无关）。
    顺带核实 `why` 其余 6 条（影像/设计/通信/可靠性/AI/续航）源站 `alt` 也各自逐字等于条目名——**全部正确**。
- **撤除 0 张**。

### 2.2 `36kr-com/home`（15）与 `taobao-com/home`（18）— 全量通过

- 36kr：15/15 PASS。taobao：18/18 PASS。taobao 证据示例：`$._lines[8]._items[0]` 的包含性 `<a href=…id=1073877587540…>`，
  与条目 `_action.to` 的 `id=1073877587540` **逐字相等**；图在锚点内（`aIdx>=0`）。
- **撤除 0 张**。

### 2.3 轮 39 六页 — 抽样 5 条，5/5 通过

| 页 | 条目 | 条目 `_action.to` | 图的包含性锚点 href | 结论 |
|---|---|---|---|---|
| bilibili-com/read-home | `$.articles._lines[0]` | `…/read/cv52753045/` | `…/read/cv52753045/` | ✅ 逐字相等 |
| bilibili-com/read-home | `$.articles._lines[1]` | `…/read/cv50900375/` | `…/read/cv50900375/` | ✅ |
| bilibili-com/read-home | `$.articles._lines[5]` | `…/read/cv52924412/` | `…/read/cv52924412/` | ✅ |
| bilibili-com/home | `$.feed._items[0]` | `…/video/BV1Dzej6JEG5` | `…/video/BV1Dzej6JEG5` | ✅ |
| 36kr-com/information-technology | `$.feed._items[0]` | `…/p/3988814727773192` | `…/p/3988814727773192` | ✅ |

（另全量核：`information-technology` 10/10、`search-ai` 9/9、`search-viz` 9/9、`bilibili-com/home` 11/11、`read-home` 19/19 通过。）
- **撤除 0 张**。

## 3. 任务 3：收尾门禁

`node m1/eval/pipeline.mjs --shots`（完整输出）：
```
[pipeline] 渲染 42/42 | 错误 0
[pipeline] 保真 1.00: 42/42
[pipeline] Markdown 目标: 渲染 42/42 | 保真 1.00: 42/42
[pipeline] 模型校验: 48 个全通过
[pipeline] 校验器自测: 通过 / 地基自测(D1/D2/D3): 通过 / 度量自测(F-052): 通过
[pipeline] 文本目标自测(F-031): 通过 / 轴一致性自测(F-031 三目标): 通过 / Markdown 目标自测(F-031): 通过
[pipeline] 证据门禁自测(哈希优先): 通过 / 归属工具自测(闭合标签): 通过   ← 新增第 8 道
视觉自查: 42/42 干净
[pipeline] 证据一致性（PNG ⇄ HTML）: 通过（42 页与截图同源, 画廊 v=mup9j5g3）
```
退出码 0。唯一非空自查项仍是既有 `sspai-com-home dup-title-source-true(info)`（源站重复，info 级，非本轮引入）。
`git diff --cached` 为空（**无 staged 文件**）；未 git 提交。

## 4. 诚实完成度

- **完成**：工具 + 自测 + docs §9.7 + F-081；huawei 37 张**逐条**复核、36kr 15 + taobao 18 **全量**、轮 39 **抽样 5**；全库门禁全绿。
- **撤图 0 张**——37 张 huawei 图经修正工具复核**全部成立**（轮 40 用的虽然是旧扫描器，但商品图恰在其**自己的** `<a>` 内，
  故未受"前置锚点"缺陷影响；`隐私` 走 M2 alt）。
- **未复核（如实登记）**：全库其余页的既有 `_image` 未逐条重扫；`huawei` 的 8 张**镜像资产**（`hw-hero-*` / `hw-reason-*`）因
  镜像名不含原始 basename 未被 URL 命中，但其中 7 张 `why` 已用源站 `alt==标题` 独立核实为正确。
- **看图 0 张**：本轮未新增/撤销任何图，无新增渲染观感需要确认。
- **残余风险**：`attribute()` 的 M3 依赖包含性锚点可访问名，商品图链自身名为空时需靠"同 href 标题链"佐证；已在复核脚本中显式实现。

IMGATTR_DONE tool=yes selftest=13 huawei_checked=37/37 huawei_removed=0 sampled_checked=5 removed_total=0 fidelity=42/42 audit=clean
