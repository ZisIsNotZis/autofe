# 06 · 轮 8 修复报告（收尾 12 个异质 `_items` 集合）

作者：worker（唯一写入者）。任务书：`.scratch/06-visual-review/rounds.md` 轮 7/轮 8 + 父代理本轮口头靶点。
背景：`.scratch/06-visual-review/fix-report-7.md` §4「剩余 12」。
硬限：30 分钟。分片先落盘。

## 0. 结论

| 项 | 结果 |
|---|---|
| 引擎判据 census（本轮起点） | `_items` 且 `selectForm→stack` 的非 expose 集合 = **12**（+1 个独立控件组豁免，共 13 行） |
| 回改为 `_lines`（有序序列） | **6** |
| 判据分析后**保留** `_items`（成员本就同形，紧凑度门槛误判） | **6** |
| census（本轮终点） | 非 expose 集合 = **6**（全部为「已判据分析、保留」项）+1 豁免 |
| 渲染语义 | 三个改动页面 render **逐字节相同**（sha256 见 §3/§5）；`_items[` 与 `_lines[` 在 `renderNode` 走同一条集合路径 |
| 成员 `_intent` | 6 个集合的 **29 个成员**全部补 `_intent`（`_lines[i]` 有子节点的成员由校验器强制，其余一并补齐） |
| 门禁 | 保真 1.00 **36/36** · 视觉自查 **36/36 干净** · 模型校验 **42/42** · 校验器自测/地基自测通过 · 截图 36 张（`v=muodghun`）。原文见 §6 |

## 1. 分片进展

- [切片 A] 读任务书/轮 7 报告；复现 census（复用 `render.mjs` 的 `selectForm`/`comparable`，不重写启发式）；逐个集合做引擎三判据分解。
- [切片 B] 6 处 `_items`→`_lines` + 29 个成员 `_intent`；校验 + render 逐字节对比；落盘本报告。
- [切片 C] 收尾门禁 `--shots` + 改动页面截图抽查。

## 2. 判据（可复现）

- 采用**引擎自身口径**：集合节点非 `_expose`、无 compare 标记、`n≥2`，且 `selectForm(members, order) === 'stack'`。
- 脚本：`/tmp/r7census.mjs`（全量，含 n=1 与 expose）、`/tmp/r7list.mjs`（非 expose/无 compare/n≥2）、`/tmp/r8diag.mjs`（把 `comparable` 的三个子判据拆开打印）。
- `comparable`（`render.mjs:202`）三个子判据：**同形** `avgSim = mean_jaccard(shapeKeys) ≥ 0.6`；**同粒度** `maxLen ≤ 400` 且 `maxLen/max(minLen,40) ≤ 4`；**紧凑** `max(childCount) ≤ 2`。
- 关键分辨：`childCount` 是**表现紧凑度门槛**（成员各带 >2 个子块就没法排成一行），**不是**成员异质的证据。因此「仅紧凑度失败」且 `avgSim = 1.000`（形状键逐字相同）的集合，`_items`（可互换同类实例）仍是**说真话**的声明——引擎的 `stack` 只是富成员的表现降级。这正是任务书点名的「成员本就同形，引擎判据误判」，故**保留不改**。

## 3. `_items` → `_lines` 回改逐条（6 条）

统一改法：集合节点 `_items` 改名 `_lines`，`_intent` 追加「原 `_items` 误标为可互换实例……回改为 `_lines`」的理由；每个成员补 `_intent`。
安全网：每页 `node m1/render.mjs <模型> f && sha256sum` 与回改前**逐字节相同** ⇒ 截图同物（形态不变，仅校正「声明」）。

| # | 页面 · 节点（census 路径） | 原→新 | 成员数 | 判据（为何不可比） | render |
|---|---|---|---|---|---|
| 1 | apple-com/ipad-air · `_lines[11]`（`_key: explore`，「机型对比」） | `_items`→`_lines` | 2 | 形状不同：iPad Air 带 `_tag`、iPad Pro 带独立 `buy` 子块；各带 7/8 个规格子块 | byte-identical |
| 2 | apple-com/iphone-16 · `compare`（「还在选型？一眼对比五款在售 iPhone」） | `_items`→`_lines` | 5 | 形状不同：部分带 `_tag`、iPhone Duo 多一个 `display` 子块；各带 4–5 个规格子块 | byte-identical |
| 3 | stripe-com/pricing · `catalog`（「按业务领域分组的产品费率表」） | `_items`→`_lines` | 4 | 分区而非可互换：三个业务域分组带 `_summary`、产品数 5/1/7，「更多」组无概述只有 3 个 | byte-identical |
| 4 | stripe-com/pricing · `catalog[0]._items[0].pricing`（「费率档位与争议处理规则」） | `_items`→`_lines` | 7 | 形状差异大（`avgSim = 0.56`）：多数带子列表+动作、数字钱包只有费率、支付优化是纯文本 | byte-identical |
| 5 | stripe-com/pricing · `enterprise`（「定制化方案、折扣与支持」） | `_items`→`_lines` | 6 | 粒度不同：前两条是带子列表的能力块（6/3 条），后四条是单行说明 | byte-identical |
| 6 | stripe-com/pricing · `report`（「ROI 研究报告与客户案例数据」） | `_items`→`_lines` | 5 | 粒度不同：首条是单份报告下载（无子列表），后四条是各带三条指标的客户案例 | byte-identical |

- 成员 `_intent` 示例（每条都写明该行「是什么 + 为何自成一行」）：`explore[1]` =「对照实体：iPad Pro（替代机型）——定位、起售价、独立购买入口与八项规格子块」；`catalog[3]` =「业务域分区：更多——其余三个产品（无概述）」；`report[0]` =「研究报告：集成 Stripe 带来 326% ROI——单份 PDF 下载（无子列表）」。29 条均如此按成员自身事实书写，**未从截图转写文字**。
- 未改 `corpus/`；未引入 HTML/CSS 逃生口；未改 `render.mjs` 语义；未 git 提交。

## 4. 未改项与判据分析（6 条，`_items` 保留）

下列集合**仅**失败于「紧凑度」子判据（`max(childCount) > 2`），**同形（`avgSim = 1.000`，形状键逐字相同）且同粒度**。它们是**同类可互换实例**（引擎的表现降级为纵向区块是设计使然），`_items` 是正确声明——为清零而改 `_lines` 反而是说假话。

| # | 页面 · 节点（census 路径） | n | avgSim | 粒度(ratio) | childCounts | 判定 |
|---|---|---|---|---|---|---|
| 1 | stripe-com/pricing · `included`（「开箱即用的能力清单」） | 8 | 1.000 | 0.38 | [4,4,4,3,4,3,3,3] | 同形能力分组，保留 |
| 2 | stripe-com/pricing · `catalog._lines[0]`（全球支付域的产品卡） | 5 | 1.000 | 1.23 | [5,4,4,4,5] | 同形产品卡，保留 |
| 3 | stripe-com/pricing · `catalog._lines[2]`（营收自动化域的产品卡） | 7 | 1.000 | 1.65 | [4,4,4,5,4,4,4] | 同形产品卡，保留 |
| 4 | stripe-com/pricing · `catalog._lines[2]._items[1].pricing`（Metronome 两档方案） | 2 | 1.000 | 1.15 | [2,4] | 同形方案卡，保留 |
| 5 | stripe-com/pricing · `catalog._lines[3]`（更多域的产品卡） | 3 | 1.000 | 0.75 | [5,4,5] | 同形产品卡，保留 |
| 6 | stripe-docs/payments · `_lines[6]`（「更多指南：按主题分组的文档入口」） | 5 | 1.000 | 0.20 | [4,3,4,4,4] | 同形主题分组，保留 |

**豁免（非异质，维持不变）**：`mi-com/search-earbuds.conditions`（n=3，成员级 `_expose` 的独立开关组）——`selectForm` 对含 `_expose` 的集合固定返回 `stack`（`render.mjs:90`），且 expose 分支只认 `node._items`（`:549-580`），改名会破坏单选渲染，故豁免。

**census 前后计数**（同一引擎口径，`/tmp/r7census.mjs` + `/tmp/r7list.mjs`）：

- 起点：`_items` stack 分组 **23**（含 n=1 与 expose）；非 expose/无 compare/n≥2 = **13** ⇒ 候选 **12**（+1 豁免）。
- 终点：`_items` stack 分组 **17**（−6）；非 expose/无 compare/n≥2 = **7** ⇒ 未回改 **6**（全部为本节「保留」项，各自有判据理由）+1 豁免。
- `m1/models/**` 复核：无「异质 `_items`」问题（flagged 的两处是 `_lines` 本身或 expose 控件组，`_lines` 的 stack 是预期的），未改动。

## 5. 我 read 的截图与所见（`--shots` 后，`v=muodghun`）

改动页面渲染逐字节不变（sha256：ipad-air `10d86b78…`、iphone-16 `b824410e…`、stripe-pricing `e02f06ab…` 前后同值），故截图与回改前同物；下面是我实际读取的裁切图与所见：

- `/tmp/fix8/c-stripe-catalog-top.png`（stripe-pricing，`.g-catalog` 起）：「所有产品的标准定价」→「全球支付」概述→「支付」产品卡（4 条能力 bullet）→分档费率（信用卡和借记卡 / 银行和其他支付方式 / 数字钱包 / 争议 / Smart Disputes 费用）各自成块、带子项与控件。分块序列清晰，无连排、无破图。
- `/tmp/fix8/c-stripe-catalog-end.png`（同页尾部）：Atlas / Workflows 产品卡 + 「随用随付」费率块（每月 1 万步 / HK$0.14 每增加一步），层级正常。
- `/tmp/fix8/c-stripe-enterprise-report.png`（`enterprise`+`report` 段）：「加入使用 Stripe 的顶级企业行列」下 6 条企业行（前两条带 chip 行、后四条单行说明，粒度差异肉眼可见）；「Stripe 的整体经济影响」下 326% ROI + 宝马/Amazon 案例各带三行指标表——正是 `_lines`（有序行序列）该有的样子。
- `/tmp/fix8/c-ipad-explore.png`（ipad-air `#explore`）：「Keep exploring iPad.」下 iPad Air、iPad Pro 两张规格卡，各带名称/概述/起售价/标签或子块/规格行/按钮；两条对照实体并列成序。
- `/tmp/fix8/c-iphone-compare.png`（iphone-16 `.g-compare`）：「Which iPhone is right for you?」下 5 款机型卡（Duo/18 Pro/Air/17/17e）各带标签、概述、起售价与 4–5 条规格，读作选型对照序列。
- `/tmp/fix8/c-docs-guides.png`（stripe-docs `_lines[6]`「更多指南」，**保留项**）：支付界面/管理支付/支付方式/API 基础知识/开始开发 五组，每组名 + chip 行；同形分组，保留下渲染良好。

结论：6 处 `_lines` 回改与 6 处「保留」项的视觉形态均**合理且未变**。

## 6. 门禁原文（`node m1/eval/pipeline.mjs --shots`）

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
[pipeline] 截图 36 张, 画廊 v=muodghun
```

- `validate.mjs` 对三个改动模型：`ok stripe-com/pricing.json` / `ok apple-com/ipad-air.json` / `ok apple-com/iphone-16.json`。
- 仅新增本报告与三个策展模型；未暂存（`git diff --cached` 为空）；`corpus/`、`tools/capture/` 未触碰。
- 说明：`--shots` 重生成产物 `m1/curated/renders/{index.html, aliyun-com-home.png}`（别名页截图字节随每次重拍变化，非本轮模型改动所致；aliyun 模型未改，其 HTML 逐字节不变）。

**残留**：`docs/m1/layout-axes.md §8` 的「12 个待回改」现为过期数字（本轮后非 expose 集合仅剩 6 个「已判据分析、保留」项）；本轮按文件范围纪律未改 `docs/`，留给父代理更新。

FIX8_DONE restructured=6 declined_with_reason=6 remaining=0 fidelity=36/36 audit=clean
