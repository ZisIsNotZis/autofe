# 06 · 轮 6 修复报告（策展正确性 + F-042）

作者：worker（唯一写入者）。任务书：`.scratch/06-visual-review/rounds.md`「轮 6（策展正确性 + F-042）」。
背景：`.scratch/07-m4/fix-report-5.md`（M4-a）、`m1/failures.md` F-040/F-041/F-042。
硬限：40 分钟，分片落盘。

## 0. 结论

| 项 | 结果 |
|---|---|
| `_rel.compare` 复核 | 19 处标记：保留 3（真对照表：airbnb aspects / stripe plans / iphone-17 which-iphone）· 删除 16 · ipad-air `sizes` 实体/属性分层 |
| 显式降级清单 | 6 条 → **0 条** |
| `_primary` | 删除 30 处指向节点/内联对象的声明；保留 11 处角色事实；未新增 |
| F-042 | 条目级 `_action.when` 求值（作用域同 `_when`）+ 4 条构造断言 |
| 门禁 | 保真 1.00 **36/36** · 视觉自查 **36/36 干净** · 模型校验 **42/42** · 校验器自测 / 地基自测通过 · 截图同版本 v=muocjo44 |

## 1. 分片进展

- [切片 A] 读 rounds.md / fix-report-5.md / failures.md F-042；盘点全库 `_rel.compare`（19 处标记 / 9 文件）与 `_primary`（44 处）。
- [切片 B] 实现引擎 F-042（render.mjs）+ 地基自测断言。
- [切片 C] 逐标记裁定并改模型；`_primary` 清理。
- [切片 D] 门禁 + 视觉自查。

（后续切片追加在本文末尾）

## 2. [切片 B] F-042 · 条目级 `_action.when` 求值

**改动（`m1/render.mjs`）**
- 新增 `actionVisible(a, scope)`：与节点级 `_when` **同一条求值路径**（`parseExpr`→`evalExpr`；解析失败留给校验器，不猜）。
- 新增 `itemScope(it, chain, ctx)`：`{...ctx.values, ...scopeFor([...chain, it], ctx.values)}`——与 `renderNode` 的 `scope` 构造逐字一致（作用域语义一致：笼统默认 < 链上声明 < 上下文注入）。
- 把 scope 线穿进所有读条目 `_action` 的路径：`itemExtra(it, scope)`、`renderList/renderSeq/renderChips/renderDeflist/renderControls(items, chain, ctx)`、`renderCompareTable` 表头、以及 `renderNode` 尾部的 `actionKids` 工具栏。
- `renderControls`：条件不满足时**只隐藏控件、保留条目名**（条目名是内容，不是动作）。未命中时渲染为无目标的 `<span class="ctl">名</span>`。

**断言（`m1/eval/foundation-selftest.mjs`，4 条全绿）**
```
ok   F-042 item action with an unmet condition is hidden
ok   F-042 item action with the condition met renders
ok   F-042 a suppressed control still shows the member name, without its action
ok   F-042 the condition met restores the control target
```
覆盖两条条目路径：`deflist`（`itemExtra`）与 `controls`（`renderControls`）。作用域用上下文注入 `{role:'admin'}` 验证（同一注入语义即 D1 的后端已知态）。

**校验器**：条目 `_action.when` 走的是既有 `checkNode(..., nodeChain)` → `checkExpr(a.when, ..., nodeChain)`，链含祖先 ⇒ 名字可解析（本轮不改校验器）。

## 3. [切片 C] 逐个 `_rel.compare` 标记的裁定（19 处标记 / 9 文件）

判据：源站 `corpus/<k>/nodes.json|dom.html` 是否呈现「列=实体、行=属性」的可对照结构。是 ⇒ 成表；不是 ⇒ 删标记（引擎退回正确形态）。

### 删除（16 处标记；源站不是对照实体）

| 文件 · 节点 | n | 源站证据（corpus 抓取） | 裁定 |
|---|---|---|---|
| bilibili-com/home · `feed` | — | 视频卡片流（标题/UP主/播放/时长），点是「看什么」不是「比什么」 | 删；渲染 `cards` |
| apple-com/home · `tiles` | 6 | 六张产品磁贴（promo 网格） | 删；产品卡 |
| apple-com/home · `tv` | 9 | Apple TV+ 片单轮播（片名/类型/看点） | 删 |
| apple-com/home · `services` | 9 | 服务内容轮播，成员只有名 + 动作 | 删（降级消除） |
| aliyun-com/product-ecs · `values` | 4 | 四个价值支柱（`h3 高稳定性/极致性能/安全可靠/高性价比` @ y=410 并排） | 删；渲染 deflist |
| aliyun-com/product-ecs · `instances` | 4 | 一排「限1件 e实例… 实例:2核2G … ￥99/1年起」报价卡 | 删；产品卡（唯一可比属性是报价卡自身的规格，需新增域字段＝词汇变更，见下） |
| apple-com/ipad-air · `_lines[2] m4` | 2 | 两条对 M1 的量化倍数（2.3x/4x） | 删；deflist |
| apple-com/ipad-air · `_lines[5] sizes` | 5 | `button 11” model`+`button 13” model`（成对 button）+ 三列显示特性 `strong/figure` | 删 + **实体/属性分层**（见下） |
| apple-com/ipad-air · `_lines[9] cameras` | 3 | 前摄/后摄/麦克风三条规格 | 删；deflist |
| apple-com/macbook-air · `_lines[1].sizes` | 2 | 13”/15” 两个尺寸名 | 删（降级消除） |
| apple-com/macbook-air · `_lines[1].gallery` | 3 | 三张图注，且两个「MacBook Air 13”」重名 | 删（原表列头重名） |
| apple-com/macbook-air · `_lines[2] performance` | 4 | 4 条基准倍数/续航 | 删 |
| apple-com/macbook-air · `_lines[7] upgrade` | 4 | 换新的四项卖点 | 删 |
| apple-com-cn/iphone-17 · `_lines[2].colors` | 5 | 五张色卡 | 删（降级消除） |
| apple-com-cn/iphone-17 · `_lines[4].modes` | 4 | 四种拍摄模式 | 删 |
| apple-com-cn/iphone-17 · `_lines[8] upgrade-compare` | 6 | 「将 iPhone 17 与下列 iPhone 比比看」的六张优点卡（对照对象是选择器里的旧机型） | 删 |

### 保留（3 处真对照表；列=实体，行=属性）

| 文件 · 节点 | 实体 | 属性行 | 证据 |
|---|---|---|---|
| airbnb-com/room-28871 · `reviews.aspects` | 6 个分项（干净卫生…） | `_rating`（4.8/4.9…） | 每一项都有同型评分 |
| stripe-com/pricing · `plans` | 标准定价 / 定制化定价 | `_detail`（每笔交易）+ 价格（表头） | 两项并排费率为源站核心 |
| apple-com-cn/iphone-17 · `_lines[11]`（`cmp-iphone-17`/`cmp-iphone-air` 上各带标记） | iPhone 17 / iPhone Air | display/chip/camera/battery/ai 子节点 | 源站「看看哪款 iPhone 适合你」两张机型卡 |

### ipad-air `sizes` 的实体/属性分层

- 原：一个 `_rel.compare` 单元把「11”/13” 两个型号」与「True Tone / P3 wide color / Full lamination 三条显示特性」混成 5 列 ⇒ 成表但语义错。
- 改：`sizes._items` 只留两个型号（11” 带 `_detail: 2360x1640 display resolution`），三条显示特性移入同段落子节点 `display`（`_intent` 说明是这块屏的共享属性）；两处都不再声明 compare。
- 视觉复核（`/tmp/ipa-sizes.png`，#sizes 元素截图）：型号与显示特性分行呈现，**不再有错误的 5 列对照表**。

## 4. [切片 C] `_primary` 重新声明

规则（本轮任务书 §2）：只在确要突出主事实时声明，且必须指向**角色事实**（`_summary`/`_price`/…），不得指向节点或内联对象。

- **删除 30 处**指向命名子节点 / 内联对象的声明（`featured`/`feed`/`results`/`overview`/`hero`/`values`/`panels`/`flagship`/`product`/`articles`/`news`/`body`/`phones`/`plans`/`_items[0]` 等）。这些声明渲染器本就忽略（hero 只在解析到**角色键**时才生效），是「说得不真」的死声明。
- **保留 11 处**指向角色事实者：`_price`×4（iphone-17 / ipad-air / iphone-16 / macbook-air）、`_summary`×5（iphone-16×2 / gov-uk / linear-app / mi-home）、`_price`（gov-uk）、`_title`（bilibili video）。
- 未新增：无「抓取背书 + 明确主事实」的页面不发明 hero（避免凭空改变视觉）。**未改校验器**（把「_primary 必须是角色事实」上升为校验规则属语法/门禁强化，按纪律留待人类决策——见 §7）。

## 5. [切片 D] 门禁原文（`node m1/eval/pipeline.mjs --shots`）

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
[pipeline] 截图 36 张, 画廊 v=muocjo44
```

**显式降级清单 前后对比**：6 条 → **0 条**。
```
改前：aliyun instances / apple-home services / macbook-air sizes / iphone-17 colors ×2 / iphone-17 upgrade-compare
改后：（无）
```
对照表数：13 → 3（全部为真对照：airbnb aspects · stripe plans · iphone-17 which-iphone）。

## 6. [切片 D] 视觉自查（read 了哪张图，改动后）

- `/tmp/ipa-sizes.png`（ipad-air `#sizes`）：型号与显示特性已分层，错误的 5 列表格消失。
- `/tmp/apple-tiles.png`（apple-home `#tiles`）：六张产品磁贴恢复为卡片网格（不是对照表）。
- 全程 `--shots` 后门禁「视觉自查 36/36 干净」。

## 7. 未做 / 需要人类决策 / 新记录

- **未做（预算）**：36kr 三页 SEO 串接 H1 改人读标题（home `36氪_让一部分人先看到未来`、search-ai `人工智能相关文章_36氪`、search-viz `数据可视化相关文章_36氪`）。抓取背书只到「源站 `<title>` 本身即该串接串」；改成「去后缀」或「换分隔符」属**标题策略**选择，非纯事实修正 ⇒ 留待人类决策。mi15 assurance chip 连排同未处理（优先级低于可见正确性）。
- **需要人类决策**：① 「`_primary` 必须解析到角色事实」是否上升为校验器硬规则（本地已把模型清干净，可直接加规）；② 36kr 标题策略；③ aliyun `instances` 的实例规格（2核2G）若要成对照行，需在 `vocab-fields.json` 新增域字段（词汇变更）。
- **未新增失败模式**：本轮无新缺陷（F-043 未启用）。F-042 已关闭。
- **纪律**：未改 `corpus/`；未从截图转写文字；未引入 HTML/CSS 逃生口；未 git 提交（`git diff --cached` 空）；改 HTML 后已 `--shots`（截图与 HTML 同版本 v=muocjo44）。

FIX6_DONE compare_fixed=3 compare_removed=16 primary=30 f042=done fidelity=36/36 audit=clean
