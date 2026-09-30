# 轮 20 · 清掉剩余的「重复决策」技术债（上移到 `m1/axis.mjs`）

> 状态：**进行中**（收尾门禁结果待追加）。最后一行 `AXIS2_DONE ...` 即完成标记。
> 对象（轮 19 报告 §6 如实登记的剩余债）：分组逻辑 `groupKind`/`seqGroups`、控件可见性与作用域
> `actionVisible`/`itemScope`、`_primary` 解析与「隐藏被主事实占用的槽位」、`REF_LABELS`/`pageText` 一类共享工具。
> 约束：纯重构（行为不变）；只碰 `m1/**` 与 `.scratch/**`；不 import 渲染器；不新增保留键/语法；看图 0 张；未 git 提交。

## 0. 基线（改动前）

- HTML：`git show HEAD:m1/curated/renders/<dash>.html` → `/tmp/ax20/html-before/`（42 个）
- 文本：`node m1/render-text.mjs m1/curated/<k>.json /tmp/ax20/text-before/<dash>.txt`（42 个）
- 基线校验和：text `b734ed62…`、html `dff2b28c…`（各 42 文件 md5 聚合）
- 旧代码（HEAD）与改后代码在同一 42 模型上的对比集降级清单：**0/42 分歧**（纯重构）。

## 1. 上移清单（`m1/axis.mjs` 新增 5 个导出）

| 上移的东西 | 新导出（`m1/axis.mjs`） | 原 dup 位置（各一份） | 说明 |
|---|---|---|---|
| 分组逻辑 `groupKind`/`seqGroups`/`groupForms` | `seqGroupsOf(items, node, degradations)` | `render.mjs`、`render-text.mjs` | 把有序集合切成连续段（compare/prose/plain）、判定「孤立的 compare 标记成员若是集合则降为 plain」、为每段选形态、并把对比集显式降级理由写进报告。返回 `{groups:[{kind,items,form}], order}` |
| 控件可见性与作用域 | `actionVisible(a, scope)`、`itemScope(it, chain, ctx)` | `render.mjs`、`render-text.mjs` | `_action.when` 的作用域求值（不可解析的表达式交给校验器、保持可见，F-042）与成员作用域（context + 祖先链 + 自身 `_expose`） |
| `_primary` 解析与槽位有效性 | `primarySlot(node, headingKey)` | `render.mjs`、`render-text.mjs` | 解析到角色事实、且「主事实就是本节点自己的标题槽」时不另开槽（不重复）。返回 `{holder,key,value}` 或 null；**隐藏的存储方式仍各目标私有**（HTML `{keys,nodes}`，文本 `Set`） |
| `key:` → 标签索引 | `buildRefLabels(model)` | `render.mjs`（`REF_LABELS`/`indexRefLabels`） | 走全模型建 `_key → 标题/名` 映射；`render.mjs` 只保存结果（`let refLabels`，不再有 `REF_LABELS`/`indexRefLabels`），`fmt()` 读它 |
| 可见文本口径 `pageText` | `pageText(html)` | `m1/eval/metrics.mjs`（唯一定义） | 度量「事实是否可见」的口径（剥 style/script 体与属性、只剥良构标签）。上移后 `metrics.mjs` 改为 import；**口径只存在一处** |

另外顺手删掉 `render.mjs` 的 `_action` 可见性**内联副本**（`let show=…`），改为调用共享 `actionVisible`；
并删除 `render.mjs` 里已死的 `resolvePath` import。两个渲染器各自删除了 `actionVisible`/`itemScope`/
`groupKind`/`seqGroups`/`REF_LABELS`/`indexRefLabels` 的本地定义。

## 2. 逐页 identity 结果（42/42，HTML 剥 `<style>` 后 body 逐字节 + 文本逐字节）

方法：对 42 个 exemplar 模型重渲染到 `/tmp/ax20/html-after`、`/tmp/ax20/text-after`，与 §0 基线 `diff -rq`。
改后实际用 `diff` 比（HTML 未动 `<style>`，整文件即字节相等）：

| 页 | HTML | 文本 | 页 | HTML | 文本 |
|---|---|---|---|---|---|
| 36kr-com/home | ✅ | ✅ | mi-com/home | ✅ | ✅ |
| 36kr-com/information-technology | ✅ | ✅ | mi-com/product-detail-mi15 | ✅ | ✅ |
| 36kr-com/search-ai | ✅ | ✅ | mi-com/search-earbuds | ✅ | ✅ |
| 36kr-com/search-viz | ✅ | ✅ | mi-com/search-phone | ✅ | ✅ |
| airbnb-com/room-28871 | ✅ | ✅ | mi-com/shop-category-list | ✅ | ✅ |
| aliyun-com/home | ✅ | ✅ | sspai-com/home | ✅ | ✅ |
| aliyun-com/product-ecs | ✅ | ✅ | sspai-com/matrix | ✅ | ✅ |
| apple-com-cn/iphone-17 | ✅ | ✅ | sspai-com/post-102392 | ✅ | ✅ |
| apple-com/home | ✅ | ✅ | sspai-com/post-114699 | ✅ | ✅ |
| apple-com/ipad-air | ✅ | ✅ | sspai-com/post-114716 | ✅ | ✅ |
| apple-com/iphone-16 | ✅ | ✅ | sspai-com/u-jtc092al | ✅ | ✅ |
| apple-com/macbook-air | ✅ | ✅ | stripe-com/pricing | ✅ | ✅ |
| aws-amazon/ec2-on-demand | ✅ | ✅ | stripe-dashboard/login | ✅ | ✅ |
| bilibili-com/home | ✅ | ✅ | stripe-docs/payments | ✅ | ✅ |
| bilibili-com/read-home | ✅ | ✅ | taobao-com/home | ✅ | ✅ |
| bilibili-com/video-bv1gj411x7h7 | ✅ | ✅ | xiaomi-account/login | ✅ | ✅ |
| github-com/login | ✅ | ✅ | gov-uk/ni-rates-letters | ✅ | ✅ |
| gov-uk/register-birth-abroad | ✅ | ✅ | grafana-play/play-home | ✅ | ✅ |
| huawei-cn/consumer-phones | ✅ | ✅ | huawei-cn/home | ✅ | ✅ |
| huawei-cn/search-laptop | ✅ | ✅ | huawei-cn/search-phone | ✅ | ✅ |
| learn-microsoft/vm-sizes | ✅ | ✅ | linear-app/home | ✅ | ✅ |

`diff -rq` 结论：HTML **42/42 identical**、文本 **42/42 identical**（无一行差异输出）。
`git diff --name-only -- 'm1/curated/renders/*.html' | grep -v index.html` = 0（产物一个字节未变）。

## 3. 判定为「属于表现层、不上移」的清单与理由

判断依据（同轮 19）：**「对所有目标都必须相同」的判定/取值 = 上移；「仅某一目标的元素、class、版式、字符」= 表现层**。

| 留在各自目标 | 位置 | 为什么是表现层 |
|---|---|---|
| HTML 表格生成 | `render.mjs` `renderRun`/`renderSelectTable`（`<table class="data">`、行内 `<input type=radio/checkbox>`、`row-ops` 单元格、`<thead>` 空表头抑制） | 「是否成表、列怎么来」是决策（`selectForm`/`compareRowKeys` 已共享）；剩下的是 HTML 元素与 class，文本目标没有对应概念 |
| 文本表格对齐 | `render-text.mjs` `dispWidth`/`padEnd`/`textTable`（宽字符宽度、列宽、`-` 分隔线） | 纯文本版式；HTML 无此概念 |
| `offer` 的呈现 | `render.mjs` `<div class="fact was">` + CSS `line-through`；`render-text.mjs` `(原价) ` 前缀 | 「原价」判定已共享为 `LIST_QUALIFIER`；两种呈现是各自的写法 |
| 转义 / 布尔 / 媒体文案 | `esc`/`decodeEntities`、`yes|no` vs `是|否`、`video`/`image`/`ref` 的元素与文案 | 各目标字符与元素不同 |
| `_primary` 主指槽**显示** | HTML `hero fact-hero]` 放大槽 vs 文本 `★ 主指:` | 「槽位是否有效、隐藏哪个键」已共享为 `primarySlot`；**呈现**不同 |
| 角色文案 | `render.mjs` `roleFact`（依赖 HTML `fmt`/`esc`）；文本 `ROLE_LABEL` 中文字典 + `roleFact` | 目标语言/写法不同 |
| 控件显示 | HTML `<span class="ctl">`/`<a class="ctl">`；文本 `[标签]` | 可见性/作用域已共享（`actionVisible`/`itemScope`）；显示不同 |
| `_primary` 隐藏的**存储** | HTML `Map<node,{keys,nodes}>`；文本 `Map<node,Set>` | 数据结构是各渲染器内部实现，非语义 |

**观察到的、仍重复但不属本轮四类、故未动**（如实登记，不扩大范围）：
- `render.mjs`/`render-text.mjs` 的 `cellOf`（对比表格取值 + `only`/`rich` 判据）与 `childLabel`（行标题解析）逻辑相同。
  它们与 `compareRowKeys`/`compareHasCell`（已共享）相邻，是同族的**下一批**可上移债务；本轮授权仅限四类，未动。
- `render.mjs` 的 `similar`/`discoverRuns`（F-018 同构段启发式）只存在于 HTML 目标（`renderRun` 是 HTML 表格的一部分），
  文本目标没有对应路径 ⇒ 不是「两个目标各写一遍」，无漂移风险。

## 4. 门禁扩展（第 6 道门禁 `m1/eval/axis-selftest.mjs`）

在原 18 条基础上新增：
- **A2 结构断言（8 条）**：两个渲染器源码不得出现「内联手写判据」——`_rel.compare`（分组）、`typeof *. _primary`（主指槽规则）、
  `resolveWithParent(`（主指解析）、`._action.when`（控件可见性）。这是对「复制不只是具名函数」的补强。
- **A3 度量断言（2 条）**：`metrics.mjs` 必须 `import { pageText } from '../axis.mjs'`，且不得再本地定义 `pageText`。
- **A1 具名断言**扩充 `SHARED_NAMES`：新增 `seqGroupsOf`/`actionVisible`/`itemScope`/`primarySlot`/`buildRefLabels`/`pageText`
  与内部名 `groupKind`/`seqGroups`/`indexRefLabels`/`REF_LABELS`；定义检测由 `(function|const)` 收紧为 `(function|const|let|var)`。
- 断言计数改为在 `check()` 内自增（不再手写公式，避免数错）。

**可证伪性实测**（门禁必须能失败）：临时往 `render-text.mjs` 追加 `const groupKind = …` → 门禁 FAIL
（`keeps no private copy … re-derived: groupKind`）；追加 `const probeCmp = (n) => Boolean(n._rel?.compare)` → 门禁 FAIL
（`does not re-derive the compare grouping`）。两次都随后还原。

**门禁原文**：

```
$ node m1/eval/axis-selftest.mjs
（29 条断言全 ok，节选见 §6）
轴一致性自测: 全部通过 (29 条断言)
```

## 5. 行为差异（两渲染器对同一模型给出不同决策）

**0 个**。用两侧都接受 `report` 的入口（HTML `renderWithAudit().degradations` vs 文本 `renderText(...,report)`）
在 42 个策展模型上比对降级清单（`key|entities|reason`）：`0/42 分歧`。
（过程中一次 `1/42` 是**我测试脚本的错**：`renderWithAudit(model,ctx)` 返回 `{html,degradations}`、并不写入外部数组——
不是渲染器的行为差异；改用返回值后归零。故不登记 `m1/failures.md`。）

## 6. 收尾门禁

`node m1/eval/pipeline.mjs --shots`（退出码 0）：

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
[pipeline] 文本目标自测(F-031): 通过
[pipeline] 轴一致性自测(F-031 两目标): 通过
· sspai-com-home.html                           dup-source-true(info):2
视觉自查: 42/42 干净
[pipeline] 截图 42 张, 画廊 v=muonytjt
```

`node m1/eval/axis-selftest.mjs` = **29/29 断言通过**（A1 具名 4 + A2 结构 8 + A3 度量 2 + B 动态 9 + C 动态 6）。

改动文件（`git status --short`）：`m1/axis.mjs`、`m1/render.mjs`、`m1/render-text.mjs`、`m1/eval/axis-selftest.mjs`、
`m1/eval/metrics.mjs`，以及门禁例行的 `m1/curated/renders/index.html`（仅画廊缓存串 `?v=` 变更，42 行换 42 行）、
`m1/curated/renders/aliyun-com-home.png`（截图非确定性，非内容变更）。`git diff --cached --name-only` 为空（**无暂存文件**）；
未 git 提交；看图 0 张。

## 7. 判定为「属于表现层、不上移」的计数

§3 表列 8 项（HTML 表格生成、文本表格对齐、offer 呈现、转义/布尔/媒体文案、`_primary` 显示、角色文案、控件显示、`_primary` 隐藏存储）。

---

AXIS2_DONE lifted=6 left_as_presentation=8 html_identical=42/42 text_identical=42/42 behavior_diff=0 fidelity=42/42 audit=clean

