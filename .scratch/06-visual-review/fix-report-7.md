# 06 · 轮 7 修复报告（模型卫生 + 三条父代理裁定）

作者：worker（唯一写入者）。任务书：`.scratch/06-visual-review/rounds.md`「轮 7 靶点」+「父代理裁定（轮 6 的三个待决项）」。
背景：`.scratch/06-visual-review/fix-report-6.md`（M4-a 后引擎忠实渲染声明）。
硬限：40 分钟，分片先落盘后继续。

## 0. 结论

| 项 | 结果 |
|---|---|
| 裁定 2 · `_primary` 必须解析到角色事实 | 校验器**硬规则** + 自测新增 2 条“必须被拒”断言（**12/12 通过**）；连带删掉 `m1/models/*` 5 处指向命名子节点的旧声明（渲染零变化） |
| 裁定 1 · 36kr 三页 H1 | 复核抓取得证：三页**均无可见标题** ⇒ 沿用文档 `<title>`，来源写进根 `_intent` |
| 裁定 3 · aliyun 实例规格域字段 | `vocab-fields.json` 新增 `cpu`/`内存`（含列标签与单位）；四卡补 `_fields` + 声明 `_rel.compare`；渲染成对比表（截图已确认） |
| `_items` 卫生回改 | census **23** 个非可比 `_items` 集合；其中 1 个是独立控件组（非异质，保留）；**回改 10**，**剩余 12** |
| 门禁 | 保真 1.00 **36/36** · 视觉自查 **36/36 干净** · 模型校验 **42/42** · 校验器自测 / 地基自测通过 · 截图 36 张（`v=muod0yem`） |
| 新失败模式 | 无（不启用）。F-043 为**词汇增长留痕**（非失败），见 `m1/failures.md` |

## 1. 分片进展

- [切片 A] 读任务书/裁定/背景；跑 census（复用 `render.mjs` 的 `selectForm`，不重写启发式）；三裁定抓取复核。
- [切片 B] 裁定 2/1/3 落地；门禁（无截图）全绿；落盘本报告。
- [切片 C] `_items` 卫生回改（先易后难，逐文件 render 字节对比作安全网）。
- [切片 D] 收尾门禁 `--shots` + 截图抽查。

## 2. [切片 B] 三条裁定落地

### 裁定 2 · `_primary` 硬规则（`m1/validate.mjs`）
- 规则：`_primary` 解析成功后，被解析对象必须是**封闭类型化值**（§2）——即一个**角色事实**；解析到节点或集合元素 = 硬报错。
- 断言（`m1/eval/validate-selftest.mjs` 新增 2 条 must-reject）：`_primary` 指向命名子节点、指向 `_items[0]` 各一条。自测 **12/12 通过**（10 拒 + 2 收）。
- 连带：新规则抓出 `m1/models/*`（手写模型，pipeline 也校验）5 处非法声明：`aliyun-com/product-ecs`=`values`、`ant-design/components-table`=`roster`、`apple-com/iphone-16`=`steps`、`sspai-com/post-102392`=`body`、`stripe-com/pricing`=`plans` ⇒ 按 F-041 既有判定**删除**（渲染器只对角色键主指生效，渲染零变化）。

### 裁定 1 · 36kr 三页 H1 来源（抓取复核 + `_intent` 注明）
- `home`：`dom.html` **无 `<h1>`**，首屏只有 36氪 logo（`img alt="36氪"`，非页面标题）。
- `search-ai`/`search-viz`：唯一 `<h1>` 是侧栏「36氪APP」下载卡；结果计数行 `<div class="total-count" style="visibility: hidden;">` **不可见**。
- ⇒ 三页均落裁定的例外分支：`_title` 沿用文档 `<title>`，根 `_intent` 注明“来源=文档标题，页面无可见 H1”。**未改标题文本**（无可见标题时不发明人读标题）。

### 裁定 3 · aliyun 实例规格域字段
- `m1/vocab-fields.json` 新增 `cpu`（label `CPU`, unit `核`）、`memory`（label `内存`, unit `GB`）。
- 抓取背书：`corpus/aliyun-com/product-ecs/nodes.json` 每卡有 `p 实例 : N核NG`（e=2核2G / u2a=2核4G / c9i=4核8G / g9i=2核8G）。
- 模型：`instances` 四卡补 `_fields`；节点补 `_intent` 说明 + `_rel.compare: true`。
- 渲染核对（截图 `/tmp/r7-aliyun-top.png`）：`instances` 变为对比表——表头列 `e实例/u2a实例/c9i实例/g9i实例`（各带价格、副述、立即购买控件），行 `CPU 2/2/4/2 核`、`内存 2/4/8/8 GB`。词汇变更记 `m1/failures.md` F-043。

## 3. census（回改依据，可复现）

- 判据（引擎自身的“自愈成序列”口径）：**非 `_expose`、非 `_rel.compare` 的 `_items` 集合，其 `selectForm` 返回 `stack`**（成员不同形/不同粒度/不紧凑 ⇒ 引擎已降级为纵向区块序列）。
- 复现脚本：`/tmp/r7census.mjs`、`/tmp/r7list.mjs`（把 `render.mjs` 源码注入 `selectForm`，不改启发式）。
- 实测：**23** 个；其中 `mi-com/search-earbuds.conditions` 是**成员级 `_expose` 的独立开关组**（非异质，引擎 stack 是设计使然），**保留不改** ⇒ 候选 **22**。
- 计数说明：`docs/m1/layout-axes.md §8` 的“55/98”是**轮 6 之前的旧测量**；按同一引擎口径现在的余额已缩小（脚本输出见上）。分母亦不同（旧口径含 `_lines` 分段与 expose 组）。
- 安全网：每回改后 `node m1/render.mjs <模型> f && diff` 与**回改前渲染逐字节相同**（`_items[` 与 `_lines[` 在 `renderNode` 走同一条集合路径）；不一致即回滚。全部 10 处均已 byte-identical。

## 4. `_items` → `_lines` 回改逐条（原键 → 新键 → 理由 → 抽图确认）

统一改法：把该节点的 `_items` 改名为 `_lines`（有序序列），并在节点 `_intent` 追加“原 `_items` 误标为可互换实例……回改为 `_lines` 有序序列”的理由。渲染逐字节不变 ⇒ 截图与回改前完全一致（无新增可见形态）。

| # | 页面 · 节点 | 原→新 | 理由（成员为何不可比） | render |
|---|---|---|---|---|
| 1 | apple-com/macbook-air · `_lines[3]` | `_items`→`_lines` | 四张 AI 要点卡不同粒度（前三名+述、末张只有名） | byte-identical |
| 2 | apple-com/macbook-air · `_lines[5]` | `_items`→`_lines` | Continuity 五项能力不同形（首项只有名） | byte-identical |
| 3 | apple-com/macbook-air · `_lines[7]` | `_items`→`_lines` | 换新四项升级仅一项带 `_detail`，另有折抵控件 | byte-identical |
| 4 | apple-com-cn/iphone-17 · `_lines[1]` | `_items`→`_lines` | 六条“先刷重点”卖点部分带 `_detail`，是章节高亮流；`order:sequence` 语义不变 | byte-identical |
| 5 | bilibili-com/read-home · `articles` | `_items`→`_lines` | 19 条长文卡片文本过长、部分带 `_source`，不可一行排比；`order:sequence` 语义不变 | byte-identical |
| 6 | huawei-cn/search-phone · `results` | `_items`→`_lines` | 10 条结果不同形（有的标题+摘要、有的标题+类别），且两条同名 | byte-identical |
| 7 | sspai-com/u-jtc092al · `_lines[2]` | `_items`→`_lines` | 五项创作数据量值角色混用 `_measure`/`_count`，粒度不一 | byte-identical |
| 8 | apple-com/ipad-air · `_lines[5]`（sizes） | `_items`→`_lines` | 两个型号带不同 `_detail`，不可一行紧凑排比 | byte-identical |
| 9 | apple-com/ipad-air · `_lines[5].display` | `_items`→`_lines` | 三条显示特性仅两条带 `_detail` | byte-identical |
| 10 | taobao-com/home · `_lines[7]`（促销会场） | `_items`→`_lines` | 六个会场不同形（会员带价格卡/会员带直播卡/只有名） | byte-identical |

**过程中修正 1 处误改**：脚本对 macbook-air「换新」节点取“intent 之后第一个 `_items`”时，误命中其**命名子节点 `selector`**（该子节点带 `_expose`，`_items`→`_lines` 会破坏单选渲染）。render 对比立即暴露，已回滚 `selector` 并改到该节点自身的集合。教训：文本回改必须以“改前后渲染逐字节相同”为安全网（本次生效）。

**剩余 12（未改，候选）**：`apple-com/ipad-air._lines[11]`、`apple-com/iphone-16.compare`、`stripe-com/pricing` 的 `included`/`catalog`/`catalog._items[0]`/`catalog._items[0]._items[0].pricing`/`catalog._items[2]`/`catalog._items[2]._items[1].pricing`/`catalog._items[3]`/`enterprise`/`report`、`stripe-docs/payments._lines[6]`。多数成员**带子集合**，改 `_lines` 后成员需补 `_intent`（校验器对 `_lines[i]` 有子节点的成员强制 `_intent`）；为在硬限内保证每处都有理由且不草率，本片未强推。（预算所限，如实报数。）

## 5. 门禁原文（`node m1/eval/pipeline.mjs --shots`）

```
[pipeline] 渲染 36/36 | 错误 0
[pipeline] 保真 1.00: 36/36
[pipeline] 模型校验: 42 个全通过
[pipeline] 校验器自测: 通过
[pipeline] 地基自测(D1/D2/D3): 通过
[pipeline] 显式降级清单（compare 标记但成不了对比表）:
[pipeline] 地基自测: 全部通过
dup-title: 华为磁吸手机支架 - 华为官网
· sspai-com-home.html                           dup-source-true(info):2
视觉自查: 36/36 干净
[pipeline] 截图 36 张, 画廊 v=muod0yem
```

- 校验器自测：`校验器自测: 12/12 通过`。
- 视觉抽查：`read /tmp/r7-aliyun-top.png`（aliyun `instances` 对比表，见 §2 裁定 3）；卫生回改的 10 处渲染与回改前**逐字节相同**（截图同物，无需重看）。
- 纪律：未改 `corpus/`；未从截图转写文字；未引入 HTML/CSS 逃生口；未 git 提交。

FIX7_DONE rulings=3/3 restructured=10 remaining=12 fidelity=36/36 audit=clean
