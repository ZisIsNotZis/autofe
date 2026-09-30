# 独立验收（第 8 轮）· 验收对象：轮 12（`table` 原语在策展层成立）

独立视角，不采信修复者自述。基线：HEAD = `c0742b0`（`table round accepted`）。
时间纪律：≤25 分钟，≤4 张裁切图。每项完成即落盘。

## 骨架与状态

| # | 项 | 状态 |
|---|---|---|
| 1 | 门禁自跑（pipeline 42/42 + 48 模型 + 自测 + 自查干净） | ✅ 通过 |
| 2 | §3.3 规则与 `renderRun` 一致性 + 身份列强制（构造实验） | ✅ 通过 |
| 3 | aws 1:1 与 3 行逐字（含 `每 GB`/`USD`；空表头保持空白） | ✅ 通过（1 minor：USD→$） |
| 4 | Azure 列只来自抓取（模型列 ↔ 源站 `<th>` 对照） | ✅ 通过 |
| 5 | 爆炸半径（渲染 diff + aliyun 未翻 data 表） | ✅ 通过 |
| 6 | 文档页数一致性（未标注历史快照的过期数字） | ⚠ 1 minor |

图片预算：本轮 **0/4 张**（第 1–6 项全部可用文本/程序化对照完成，无需读图；已把预算留给真正需要的地方）。

---

## 1. 门禁自跑

独立运行 `node m1/eval/pipeline.mjs`（HEAD `c0742b0`），EXIT=0，原文：

```
[pipeline] 渲染 42/42 | 错误 0
[pipeline] 保真 1.00: 42/42
[pipeline] 模型校验: 48 个全通过
[pipeline] 校验器自测: 通过
[pipeline] 地基自测(D1/D2/D3): 通过
[pipeline] 显式降级清单（compare 标记但成不了对比表）:
[pipeline] · stripe-com/pricing · n=2 · degenerate-no-shared-attribute
[pipeline] 地基自测: 全部通过
dup-title: 华为磁吸手机支架 - 华为官网
· sspai-com-home.html                           dup-source-true(info):2

视觉自查: 42/42 干净
```

两套自测独立复跑：`node m1/eval/validate-selftest.mjs` → `校验器自测: 12/12 通过`（12 条全部 `ok`）；
`node m1/eval/foundation-selftest.mjs` → `地基自测: 全部通过`（含 F-051 四条、F-042、D1/D2/D3、offer/paginator/P3）。

**判定：✅ 与轮 12 自述一致**（42/42 保真 1.00、48 模型、两套自测通过、视觉自查 42/42 干净）。
降级清单仅剩 `stripe-com/pricing` 一条（既有、非本轮引入）。

## 2. §3.3 规则 ↔ renderRun 一致性

**规则文本**（`docs/m1/layout-axes.md §3.3`）逐条与 `m1/render.mjs::renderRun`（L276–302）对照：

| §3.3 规则 | renderRun 实现 | 一致 |
|---|---|---|
| 列 = 身份列 + 已声明属性列；属性列 = `_fields` 键 ∪ 非 name 角色事实 | `attrs = fieldKeys ∪ factsOf(非 _name/_title)`；`cols = named ? ['_name', ...attrs] : attrs` | ✅ |
| 有名字 ⇒ 身份列 + ≥2 属性列 | `named = run.some(_name ?? _title)`；`isTable = attrs.length>=2 && (named \|\| …)` | ✅ |
| 无名字 ⇒ ≥2 属性列且至少一列有已声明列标签 | `… || attrs.some(c => FIELDS[c]?.label)` | ✅ |
| 成表不得丢名 | `cols` 前置 `_name`；`valuesOf` 对 `_name` 输出成员名 | ✅ |
| 绝不把内部键印成列名 | 表头取 `FIELDS[c]?.label ?? ''` | ✅ |
| 单列不是表 | `attrs.length>=2` 门（1 列走 cards） | ✅ |

**构造实验**（`/tmp/verify5-identity.mjs`，直调 `render()`，独立于修复者的自测）：

| 构造 | 期望 | 实测 |
|---|---|---|
| A 有名字 + 2 已声明属性列 | 出表、身份列在 | `isTable=true`，`<td>e4</td>`/`<td>u2a</td>` 在，表头 `<th>Family</th><th>Workloads</th>` |
| B 无身份 + 2 列**均未声明**（无标签） | **不出表** | `isTable=false` → `class="cards"` |
| C 无身份 + 1 已声明 + 1 未声明 | 出表（第二支） | `isTable=true`；未声明列头为空 `<th></th>`（不印内部键） |
| D 有名字 + 1 属性列 | 不出表（deflist），保名 | `isTable=false`，`e4` 仍在 |

**判定：✅** 规则文本与实现逐条一致；**身份列确实被强制保留**（A 与 D 都证明「有名成员成表后名字仍在」）。
修复者自述的 F-051 四条断言与我的独立构造完全吻合。

## 3. aws 1:1 与逐字

独立脚本（`corpus/aws-amazon/ec2-on-demand/dom.html` ↔ `m1/curated/renders/aws-amazon-ec2-on-demand.html`）逐表比对：

| 表 | 源站数据行 | 渲染数据行 | 表头第一格 | 表头第二格 |
|---|---|---|---|---|
| 0 | 8 | 7 | `''`（空） | `定价` |
| 1 | 67 | 67 | `数据自 Amazon EC2 传出至` | `''`（空） |
| 2 | 2 | 2 | `在同一 AWS 区域内的本地区域和可用区之间传输的数据…` | `定价` |

**空表头保持空白**：三张表源站 `<th></th>` / `aria-label=""` 在渲染里均为 `<th></th>`，**未被补词** ✅（表 0 第一格、表 1 第二格）。

**抽 3 行逐字**（源站 → 渲染）：

| 源站（`&nbsp;` 归一化后） | 渲染 |
|---|---|
| `<td>每月随后的 40TB</td><td>每 GB USD 0.085</td>` | `<td>每月随后的 40TB</td><td>每 GB **$0.085**</td>` |
| `<td>AWS European Sovereign Cloud（德国）</td><td>每 GB USD 0.05</td>` | `<td>AWS European Sovereign Cloud（德国）</td><td>每 GB **$0.05**</td>` |
| `<td>非洲（开普敦）</td><td>每 GB USD 0.02</td>` | `<td>非洲（开普敦）</td><td>每 GB **$0.02**</td>` |

- **数值逐字**：0.085 / 0.05 / 0.02 / 0.01 与源站完全一致，无换算、无四舍五入 ✅；全表 67 个区域名逐字（含全角括号、`AWS European Sovereign Cloud（德国）`）✅。
- **`每 GB` 限定词**：源站有则渲染有、源站无（表 2）则渲染无 ✅。
- **⚠ USD 未逐字**：源站货币词是 `USD`，渲染输出 `$`（`每 GB USD 0.085` → `每 GB $0.085`）；且 `USD&nbsp;0.00`（免费档）→ `$0`（丢尾随 `.00`）。这是**全库一致的既有引擎约定**（报告 §2 已自认，标为 M5 品牌层），**非轮 12 引入**、非本次策展改动 —— 但与 spec「逐字照抓取」在**货币字形/尾零**上确实存在字面偏差。**记 minor（不阻塞）。**
- **观察（非缺陷）**：源站表 0 的整段说明行（`AWS 客户每月可免费将 100GB…`，跨列备注）被策展为 `_summary`，渲染为表上方 prose 事实块（页面确含原文）——**无事实丢失**，属已声明选择；源站分组行的 `<strong>` 加粗**无表达位**（已在报告 §8 登记）。

**判定：✅ 1:1 成立**（表 1/2 行级完全 1:1；表 0 唯一“差”是把跨列备注行移到 `_summary`）；金额词典逐字成立；空表头保持空白。

## 4. Azure 列只来自抓取

源站 `corpus/learn-microsoft/vm-sizes/dom.html`：`<table>` = 8，表头只有两组 —— `['Category','Description','Links']`（表 0）与 `['Family','Workloads','Series List']`（表 1–7）。

模型 `m1/curated/learn-microsoft/vm-sizes.json` 的 `_fields` 键 = `{category:3, description:3, links:3, family:20, workloads:20, series-list:20}`。`m1/vocab-fields.json` 声明的列标签对照：

| 模型域字段 | vocab `label` | 源站 `<th>` 逐字 | 一致 |
|---|---|---|---|
| `category` | `Category` | `Category` | ✅ |
| `description` | `Description` | `Description` | ✅ |
| `links` | `Links` | `Links` | ✅ |
| `family` | `Family` | `Family` | ✅ |
| `workloads` | `Workloads` | `Workloads` | ✅ |
| `series-list` | `Series List` | `Series List` | ✅ |

- **无发明、无遗漏的列**：模型只声明这 6 个字段，恰为源站两组 `<th>` 的并集 ✅。
- **渲染 1:1**：渲染出 **8** 张 `<table class="data">`，表头集合与行数（3,4,2,5,1,4,1,3）与源站逐张一致 ✅。
- **格值逐字**：8 张表全部单元格文本（空格归一化后）与源站**完全相同**（程序化全量比对）✅。

**判定：✅ 列只来自抓取，零发明零遗漏。**

## 5. 爆炸半径

- **提交 `c0742b0`（轮 12 接受）内 `m1/curated/renders/` 的改动**：仅 `aws-amazon-ec2-on-demand.html/png`（M）、`learn-microsoft-vm-sizes.html/png`（A）、`index.html`（M，画廊索引）。**其余 40 页渲染产物零变化** ✅。
- **工作区**：`git status --porcelain -- m1/curated/renders/` 为空，`git diff HEAD -- m1/curated/renders/` 为空 → 工作树与 HEAD 一致，无未提交改动 ✅。
- **aliyun 未被翻成 data 表**：`aliyun-com-product-ecs.html` 仍为 **6 个 `cmp-table`、0 个 `table class="data"`**，且该文件不在轮 12 改动清单中（字节未变）⇒ 实例集合仍是 compare 表、实例名仍在 ✅。
- 规则影响面与该提交的实际渲染 diff 一致（aws 1 页翻表 + 新增 azure 页）。

**判定：✅ 爆炸半径与自述一致。**

## 6. 文档页数一致性

`grep -rn "41 页\|41/41\|36 页\|36/36" README.md docs/ .scratch/*.md`（共 12 行命中），逐条判定是否**已标注历史快照**：

| 位置 | 内容 | 判定 |
|---|---|---|
| `docs/m1/m4-composites-proposal.md:5` | “快照 36 页…**轮 12 后为 41 页…轮 15…后为 42 页 / 23 站**” | ✅ 已标口径 |
| `…:7` | “**口径提示（轮 12 补记）**：本文全部测量基于 M4-a 快照…36/104 均指该快照” | ✅ 已标口径 |
| `…:40,43,100,359,430,588` | 该快照章节内的 36 统计 | ✅ 被 :7 的口径提示覆盖 |
| `.scratch/active-work.md:26` | “既有 **36 页**未动”（轮 9 历史叙述） | ✅ 历史语境正确 |
| `.scratch/active-work.md:29` | “门禁 36 → **41** 页”（轮 12 历史叙述） | ✅ 历史语境正确 |
| `.scratch/active-work.md:50` | “36/36 事实保真…**（M3 快照口径）**” | ✅ 已标口径 |
| `.scratch/active-work.md:70` | “重尾 triage（**41 页** archetype 覆盖诊断）” | ⚠ 边界：指 `.scratch/10-triage` 那份 41 页时的产物；作待办行时读作“当前分母”会误导 |
| `.scratch/decisions-for-user.md:32` | “先把 M4-b 原语在**现有 41 页**上做完并验收” | ❌ **未标注的过期数字**（当前门禁 42 页） |

- 门禁真实分母：`m1/eval/m3-scale.json` = `{support:68, exemplar:**42**}` ✅（与自述 42 一致）。
- **真缺陷（minor）**：`decisions-for-user.md:32` 的“现有 41 页”未标注为历史，应作 42；轮 12 报告 §6 声称“已同步 `decisions-for-user.md`”，但该行漏改 → 文档一致性动作不完全。
- 边界（minor，清单里列出）：`active-work.md:70` 的 41 页指 triage 产物分母，语义可辩，但呈现于“当前状态快照”易被读成当前分母。

**判定：⚠ 1 条未标注过期数字（minor），其余均属已标注历史快照。**

---

## 总体判定

**PASS**（0 blocker / 0 major / 3 minor）。

六项全部执行，无跳过。核心结论（不采信自述、独立复核）：
1. **门禁**：自跑 `pipeline.mjs` → 渲染 42/42 · 保真 1.00 42/42 · 模型校验 48 全通过 · 校验器自测 12/12 · 地基自测全通过 · 视觉自查 42/42 干净。与自述一致。
2. **规则有原则**：`layout-axes §3.3` 与 `renderRun` **逐条一致**（含“无身份列须有已声明标签”第二支与“成表不得丢名”）；构造实验证明**身份列确被强制保留**（有名 2 属性列 → 出表且 `<td>e4</td>` 在；无名未声明 2 列 → 不出表；有名 1 属性列 → deflist 且保名）。
3. **aws 1:1 + 逐字**：表 1/2 行级 1:1；金额与区域名逐字；`每 GB` 随源站有无；空表头 `<th></th>`保持空白。minor：货币词 `USD→$`、`0.00→$0`（全库既有约定，非轮 12 引入）。
4. **Azure 零发明列**：6 个域字段 ↔ 源站两组 `<th>` 逐字对应；8 表行数/表头 1:1；**全部单元格文本与源站完全相同**。
5. **爆炸半径受控**：轮 12 只改 aws 1 页 + 新增 azure 1 页 + 画廊索引；aliyun 仍 cmp-table、未翻 data 表。
6. **文档一致性**：唯一未标注的过期数字在 `.scratch/decisions-for-user.md:32`（“现有 41 页”）。

minor 汇总：
- m1 `decisions-for-user.md:32` 过期数字 41（应 42），未标注历史（文档一致性）。
- m2 aws 货币字形 `USD→$`、尾零 `0.00→$0` 非逐字（全库既有、已声明 M5，未阻塞）。
- m3 `active-work.md:70` “41 页 archetype 覆盖诊断”呈现于当前快照、易误读为当前分母（边界）。

VERIFY5_DONE verdict=PASS blockers=0 majors=0 minors=3 skipped=[]
