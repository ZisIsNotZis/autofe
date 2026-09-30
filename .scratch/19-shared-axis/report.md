# 轮 19 · 抽出共享「轴决策层」（`m1/axis.mjs`）

> 状态：**已完成**。最后一行 `AXIS_DONE ...` 即完成标记。
> 修复对象（轮 18 已用实现证明、父代理已 grep 复核）：`selectForm`/`comparable`/`compareSetVerdict`
> 及一批共享常量/谓词在 `m1/render.mjs` 与 `m1/render-text.mjs` **各有一份**、`m1/model-lib.mjs` 里 0 份。
> F-031 宣称「轴语义表现中立」，实现上它却困在 HTML 渲染器里；第二个目标只能靠**复制**通过。
> 约束：纯重构（行为不变）、不 import 任何渲染器、不新增语法/保留键、只碰 `m1/**` 与 `.scratch/**`、看图 0 张、未 git 提交。

## 1. 共享层清单与位置

新文件 **`m1/axis.mjs`**（唯一写入的共享实现；**只** import `./model-lib.mjs`，绝不 import 任何渲染器）。
`render.mjs` 与 `render-text.mjs` 改为 `import { … } from './axis.mjs'`，各自的副本全部删除。
共 **23 个导出**：

| 类别 | 导出 | 原 dup 位置 |
|---|---|---|
| 形态/轴决策 | `selectForm`、`comparable`（含 `shapeKeys`/`textLenOf`/`jaccardOf`）、`compareSetVerdict`（含 `compareRowKeys`/`compareHasCell`/`compareStats`/`COMPARE_MIN_FILL=0.4`）、`isPositionalKey` | 两渲染器各一份 |
| 共享谓词与取词 | `labelOf`、`labelTextOf`、`isLabelOnlyItem`、`isProseItem`、`isImageOnlyItem` | 两渲染器各一份 |
| 共享常量与降级 | `CURRENCY_GLYPH`、`ROLE_UNIT`、`META_KEYS`、`LIST_QUALIFIER`、`hasOwnUnit`、`hasTarget`、`hrefOf`（`key:`→`#`） | `render.mjs`（`hasTarget`/`hrefOf` 仅 HTML 侧有，一并上移） |

- `render.mjs` 顶层（不再每次 `renderNode` 重建）改用共享常量；`roleFact` 仍在本文件（它依赖 HTML 的 `fmt`/`esc`，属表现）。
- `render-text.mjs` 不再从 `render.mjs` 重抄任何轴函数；`ROLE_LABEL`（纯文本角色中文名）仍是文本目标私有。
- 复核：`grep` 两渲染器已无 `function selectForm|comparable|compareSetVerdict|compareRowKeys|compareStats|compareHasCell|shapeKeys|textLenOf|jaccardOf|isProseItem|isLabelOnlyItem|isImageOnlyItem`，
  也再无 `const CURRENCY_GLYPH|ROLE_UNIT|META_KEYS|LIST_QUALIFIER|COMPARE_MIN_FILL|hasTarget|hrefOf|labelOf|labelTextOf|isPositionalKey` 的本地定义。
  （`render.mjs` 里残留的 `const labelOfKey = (c) => FIELDS[c]?.label …` 是**列名标签**的局部 helper，与 `labelOf` 无关。）

## 2. 逐页 body-identity 比对结果（HTML）

方法：对 42 个 exemplar 模型 `node m1/render.mjs <model> <out>`，与 `git show HEAD:m1/curated/renders/<dash>.html`
比对，**剥掉 `<style>…</style>` 后整个 body 逐字节相等**（style 块由本文件内嵌、与轴决策无关，单独说明仍逐字节未变）。
结果 **42/42 identical**：

| 页 | HTML body | 文本产物 |
|---|---|---|
| 36kr-com/home | ✅ identical | ✅ identical |
| 36kr-com/information-technology | ✅ identical | ✅ identical |
| 36kr-com/search-ai | ✅ identical | ✅ identical |
| 36kr-com/search-viz | ✅ identical | ✅ identical |
| airbnb-com/room-28871 | ✅ identical | ✅ identical |
| aliyun-com/home | ✅ identical | ✅ identical |
| aliyun-com/product-ecs | ✅ identical | ✅ identical |
| apple-com-cn/iphone-17 | ✅ identical | ✅ identical |
| apple-com/home | ✅ identical | ✅ identical |
| apple-com/ipad-air | ✅ identical | ✅ identical |
| apple-com/iphone-16 | ✅ identical | ✅ identical |
| apple-com/macbook-air | ✅ identical | ✅ identical |
| aws-amazon/ec2-on-demand | ✅ identical | ✅ identical |
| bilibili-com/home | ✅ identical | ✅ identical |
| bilibili-com/read-home | ✅ identical | ✅ identical |
| bilibili-com/video-bv1gj411x7h7 | ✅ identical | ✅ identical |
| github-com/login | ✅ identical | ✅ identical |
| gov-uk/ni-rates-letters | ✅ identical | ✅ identical |
| gov-uk/register-birth-abroad | ✅ identical | ✅ identical |
| grafana-play/play-home | ✅ identical | ✅ identical |
| huawei-cn/consumer-phones | ✅ identical | ✅ identical |
| huawei-cn/home | ✅ identical | ✅ identical |
| huawei-cn/search-laptop | ✅ identical | ✅ identical |
| huawei-cn/search-phone | ✅ identical | ✅ identical |
| learn-microsoft/vm-sizes | ✅ identical | ✅ identical |
| linear-app/home | ✅ identical | ✅ identical |
| mi-com/home | ✅ identical | ✅ identical |
| mi-com/product-detail-mi15 | ✅ identical | ✅ identical |
| mi-com/search-earbuds | ✅ identical | ✅ identical |
| mi-com/search-phone | ✅ identical | ✅ identical |
| mi-com/shop-category-list | ✅ identical | ✅ identical |
| sspai-com/home | ✅ identical | ✅ identical |
| sspai-com/matrix | ✅ identical | ✅ identical |
| sspai-com/post-102392 | ✅ identical | ✅ identical |
| sspai-com/post-114699 | ✅ identical | ✅ identical |
| sspai-com/post-114716 | ✅ identical | ✅ identical |
| sspai-com/u-jtc092al | ✅ identical | ✅ identical |
| stripe-com/pricing | ✅ identical | ✅ identical |
| stripe-dashboard/login | ✅ identical | ✅ identical |
| stripe-docs/payments | ✅ identical | ✅ identical |
| taobao-com/home | ✅ identical | ✅ identical |
| xiaomi-account/login | ✅ identical | ✅ identical |

补充证据：`git diff --name-only -- 'm1/curated/renders/*.html' | grep -v index.html` = **0**（42 个产物一个字节都没变）。
唯一被 `--shots` 改写的 `m1/curated/renders/index.html` 只是画廊卡片的缓存串 `?v=<token>`（42 行插入/42 行删除，无内容语义变化），由收尾命令 `--shots` 例行重建产生。

## 3. 文本产物 identity 结果

方法：改前把 `.tmp/text-renders/*.txt`（42 个）备份到 `/tmp/ax19/text-before/`；改后重新
`node m1/render-text.mjs m1/curated/<model> <out>` 并逐字节比对。结果 **42/42 identical**（见上表第三列）。

## 4. 两目标一致性断言（第 6 道门禁）

新增 `m1/eval/axis-selftest.mjs`（**18 条断言**，已跑全绿；接入 `pipeline.mjs` 作**第 6 道门禁**，失败即退出码 1）。
它同时是**防复发**装置，因为「复制」正是本缺陷的通过方式：

- **A. 单一实现（静态，防复发，4 条）**：解析两个渲染器源码，断言
  ① 都 `from './axis.mjs'` 导入；② 都**不再**出现 23 个共享名中的任何一个本地定义
  （`function NAME` 或 `const NAME =`）。**任何人再把函数抄回渲染器，这条门禁立刻失败**。
- **B. 对比集判定一致（7 条）**：对构造模型同时跑 `render(model, {}, report)` 与 `renderText(model, {}, report)`，
  断言两目标的**降级清单逐元素相同**（`key|entities|reason`），并覆盖全部 6 种理由：
  `no-comparable-attribute` / `member-has-no-name` / `member-is-a-control` /
  `degenerate-no-shared-attribute` / `degenerate-fill-rate:0.30` / `fewer-than-2-entities`，
  外加一个**真表**（两目标都不降级、都排成对比表）。
- **C. 形态名一致（7 条）**：对构造集合断言共享 `selectForm` 判出的**形态名**与预期一致，**且两个目标都渲染出该形态**
  （table / prose / seq / image-strip / stack）；再断言 `comparable`/`compareSetVerdict` 与形态闸门口径一致。

为何能断言「同一轴决策」：`render.mjs` 与 `render-text.mjs` 都只从 `axis.mjs` 取 `selectForm`/`compareSetVerdict`（A 已证无私有副本），
所以「两目标对同一节点得出同一形态名/同一降级理由」是构造性成立；B/C 再用**行为**把它钉住（构造模型 + 输出签名）。

## 5. 度量耦合修法（`pageText` 只剥良构标签）

- 改法：`m1/eval/metrics.mjs` 的 `pageText()` 第二个替换由 `/<[^>]*>/g` 改为 **`/<[a-zA-Z/][^>]*>/g`**（只剥良构标签）。
  旧规则会把任何 `<…>` 之间的内容当标签抹掉：若某事实文本**自身**含尖括号（如 `age < 18 or age > 65`），
  会被抹成 `age <> 65` 而误判「未渲染」——纯文本目标尤其会触发（它输出未转义的事实文本）。
- 断言（两条，加在 `m1/eval/metrics-selftest.mjs`）：
  1. 事实文本含 `<`/`>`（`age < 18 or age > 65`）经**文本目标**渲染后 `factFidelity === 1` —— 旧规则下**必然 <1**（可证伪）。
  2. 只在标签/属性里出现的值（`<div data-x="999">` 中的 `999`）**不算**已渲染 —— 防止有人把标签剥离整个删掉。
- 残留（诚实）：新规则下**良构**的 `<tag>` 形文本仍会被当标签剥掉（如事实恰好是 `<limit>`）；这是「HTML 去标签」与「事实文本」
  之间无法完全消解的歧义，本轮按任务给定的正则取值，不做过度设计。

## 6. 仍不可共享的部分与理由（表现层留在表现层）

**本就该是表现层（不该上移）**：
- **HTML 专有的表格生成**：`renderRun`/`renderSelectTable`（`<table class="data">`、行内 `<input type=radio|checkbox>`、`row-ops` 单元格）——轴决策（是否表格、列怎么来）已在 `axis.mjs`，剩下的全是 HTML 元素与 class。
- **文本表格的对齐**：`dispWidth`/`padEnd`/`textTable`（宽字符宽度、列宽、`-` 分隔线）——纯文本版式，HTML 无此概念。
- **`offer` 的呈现方式**：`_amount` 的 `qualifier === 'list'`（**判定**已共享为 `LIST_QUALIFIER`）；HTML 用 `<div class="fact was">` + CSS `text-decoration:line-through`，文本用 `(原价) ` 前缀——同一决策的两种呈现。
- **转义/布尔/媒体文案**：`esc`/`decodeEntities`、`yes|no` vs `是|否`、`video`/`image`/`ref` 的元素与文案——各自目标的写法。
- **`_primary` 主指槽位**：HTML 用 `hero fact-hero` 放大槽，文本用 `★ 主指:`——呈现不同。

**仍是「决策」但本轮**未列入授权清单**、故按原样保留（如实记录，不静默扩大范围）**：
- 分组逻辑 `groupKind`/`seqGroups`（compare/prose/plain 连续段合并 + 单成员对比标记落空判定）——两渲染器各一份，**是决策**，与 `compareSetVerdict` 同族，应可上移；
- `actionVisible`/`itemScope`（`_action.when` 的作用域求值）——两渲染器各一份，**是决策**；
- `_primary` 的解析与「隐藏以避免重复」——两渲染器各一份，**是决策**；
- `REF_LABELS`/`indexRefLabels`（`key:` 标签索引）、`pageText`（度量可见文本）——前者是模型级索引，后者是度量口径，均与渲染目标无关，也可上移。

判断依据：**「对所有目标都必须相同」的判定/取值 = 该上移；「仅某一目标的元素、class、版式、字符」= 表现层**。
上表第一组满足「另一个目标没有对应概念」（HTML 元素 vs 文本版式），故留在各自目标；第二组满足「两个目标确实各写了一遍同一判断」，是可上移的技术债，但不在本轮授权范围内。

## 7. 门禁原文

收尾命令 `node m1/eval/pipeline.mjs --shots`：

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
视觉自查: 42/42 干净
[pipeline] 截图 42 张, 画廊 v=muons1jg
```

`node m1/eval/axis-selftest.mjs`：18/18 断言通过（见 §4）。
`node m1/eval/metrics-selftest.mjs`：含 §5 两条新断言，全通过。
无暂存文件（`git diff --cached --name-only` 为空）；未 git 提交；看图 0 张（本任务无需读图）。

---

AXIS_DONE shared=23 html_identical=42/42 text_identical=42/42 consistency_assertions=18 fidelity=42/42 audit=clean
