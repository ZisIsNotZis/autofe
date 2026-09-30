# 轮 12 · 让 `table` 在策展层真正成立（分片报告）

单写入者 / 每片落盘。输入：`.scratch/11-table-sample/report.md`、`m1/vocab-fields.json`、`m1/curated/gov-uk/ni-rates-letters.json`（表页范式）。
父代理裁定：**采纳 A（引擎放宽，带条件）**——规则写进 `docs/m1/layout-axes.md`、给爆炸半径枚举、零发明列、构造断言、收口 F-046.3。

## 分片进展

| 片 | 内容 | 状态 |
|---|---|---|
| A | 核对 aws 抓取真相（否证 spec 前提：源站只有 2 列） | ✅ 落盘（见下 §1） |
| B | Azure `learn-microsoft/vm-sizes` 策展 + 门禁 41 → 42 + 文档同步 | ✅ |
| C | F-051 引擎规则（`renderRun`）+ 明文规则 + 4 条构造断言 + 影响面枚举 | ✅ |
| D | 门禁 `--shots`、grep 证据、逐文件 diff、抽图自查、报告 | ✅ |

## 1. aws 抓取真相（否证 spec §任务 1 的前提）

`corpus/aws-amazon/ec2-on-demand/dom.html`：`<table>` = **3**，每张**只有 2 列**，无 vCPU/内存/每小时列（spec 里的 `region / vCPU / memory / price-per-hour` 是**推测**，抓取里不存在 ⇒ 不采信）。

| # | 源站表头（逐字） | 行数（含表头） |
|---|---|---|
| 0 | `["", "定价"]` | 9 |
| 1 | `["数据自 Amazon EC2 传出至", ""]` | 68（67 区域行） |
| 2 | `["在同一 AWS 区域内的本地区域和可用区之间传输的数据，从本地区域中的 Amazon EC2“传入”和“传出”", "定价"]` | 3 |

源站自身模板（`data-pricing-markup`，HTML 转义）证明价格单元格 = 单位 + 价：`<td>每 GB {bulkPriceOf!…}</td>`。表 0 段首两行是**源站自己的分组行**（第二格为空）。

## 2. aws 域字段（5 个，全部有抓取背书；金额逐字、零换算）

| 域字段 | 类型 | 列标签 | 背书 |
|---|---|---|---|
| `transfer-tier` | text | **（空）** | 表 0 表头第一格 `<th></th>` ⇒ **保持空标签，不补词** |
| `data-transfer-price` | money/USD | `定价` | 表 0/表 2 表头第二格 `定价` |
| `egress-destination` | text | `数据自 Amazon EC2 传出至` | 表 1 表头第一格 |
| `egress-price` | money/USD | **（空）** | 表 1 表头第二格 `<th></th>` ⇒ 空标签 |
| `local-zone-direction` | text | `在同一 AWS 区域内的本地区域和可用区之间传输的数据，从本地区域中的 Amazon EC2“传入”和“传出”` | 表 2 表头第一格 |

**逐字数值证据**（源站 `USD&nbsp;<v>` 出现次数；渲染值原样、无换算无四舍五入）：
`0.09`(1) → 每 GB $0.09；`0.085`(1) → 每 GB $0.085；`0.07`(1) → 每 GB $0.07；`0.05`(2) → 每 GB $0.05；`0.02`(1) → 每 GB $0.02；`0.01`(2) → 每 GB $0.01。67 个区域名逐字（含 `AWS European Sovereign Cloud（德国）`、`美国西部（威瑞森）- 西雅图` 这类全角/半角混排原样）。
**已记录显示差异（非本轮范围）**：`money: 0` 由引擎打印为 `$0`（源站 `USD 0.00`）——数值精确、无舍入，尾随 `.00` 与货币字形（USD→$）是既有引擎约定（M5 品牌层），全库一致；另记于 §7 残余风险。

## 3. Azure 三列声明与证据（零发明列）

`corpus/learn-microsoft/vm-sizes/dom.html`：`<table>` = **8**。列集合只有两种，全部取自抓取 `<th>`：

- 表 0（`Category/Description/Links`，3 行数据）→ 域字段 `category`(Category) / `description`(Description) / `links`(Links)；
- 表 1–7（`Family/Workloads/Series List`，共 20 行数据）→ 域字段 `family`(Family) / `workloads`(Workloads) / `series-list`(Series List)。

单元格值逐字（`<br>` 分段原样保留为 `list`，多值格子渲染为逐条 pill）：`Workloads`/`Series List`/`Links` 为 `list`，`Family`/`Category`/`Description` 为 `text`。**未新增/未遗漏任何列**；7 张族表共用同一组 3 列（与 §11 报告的"列集合完全一致"一致）。节标题取源站 H1/H2/H3 原文（`Sizes for virtual machines in Azure`、`VM size and series naming`、`Name structure breakdown`、`List of VM size families by type`、`General purpose` … `High performance compute`）。

## 4. F-051 规则与爆炸半径枚举（父代理条件 1/2/3）

**规则（`docs/m1/layout-axes.md §3.3`，非代码注释）**：数据表 = **身份列（成员 `_name`/`_title`，有则必含）+ 已声明属性列**。有身份列 ⇒ 属性列 ≥2；无身份列 ⇒ 属性列 ≥2 且至少一列有已声明列标签。反例：单列不是表（是列表）；没有声明列的"看着像表"不是表；身份列 + 1 属性列是 deflist。**成表不得丢名**。旧阈值"≥3 列"删除。
`m1/render.mjs::renderRun` 实现要点：`named` ⇒ `cols` 前置 `_name` 身份列；`attrs.length >= 2 && (named || attrs.some(c => FIELDS[c]?.label))`。

**会改变形态的集合（枚举，非"实测为零"）**

| 集合 | 成员 | 改前 | 改后 | 结论 |
|---|---|---|---|---|
| `aws-amazon/ec2-on-demand` `data-transfer` / `region-egress` / `same-region` | 7 / 67 / 2 | 卡片（1 列 ⇒ product-cards） | **3 张 2 列表** | **翻表**（源站 1:1） |

**因此不翻表的集合（逐个理由）**

| 集合 | 列 | 为何不翻表 |
|---|---|---|
| `gov-uk/ni-rates-letters` `employee-rates`/`employer-rates` | 4（无身份列） | 本来就有 ≥2 列 ⇒ **仍是表，且字节不变** |
| `aliyun-com/product-ecs` `.instances`（4 成员，各 `[cpu,memory]`） | 2 + 名字 | **不经 `renderRun`**：`_rel.compare` 判据成立 ⇒ `cmp-table`（实测渲染仍是 1 张 `cmp-table`） |
| `aliyun-com/product-ecs` `.scale`（`[regions,zones]`） | 2 | **命名子节点**，走 `renderBodyLead` 事实位，不走 run |
| `m1/models/aliyun-com/product-ecs`、`m1/models/ant-design/components-table` | 2 / — | 前者 compare、后者 `_expose`（`renderSelectTable`），都不经 `renderRun` |
| 其余 38 页 | — | 无 `_fields` 集合，不走该分支 |

**逐文件渲染 diff（权威证据）**：改动前把 41 页全部渲染到 `/tmp/before`，改动后渲染到 `/tmp/after` 逐字节比较 ⇒ **只有 `aws-amazon/ec2-on-demand` 一页变化**（其余 40 页含 gov-uk 字节相同）；`git status` 侧证：`m1/curated/renders/*.html` 只有 `aws-amazon-ec2-on-demand.html`（M）与新页 `learn-microsoft-vm-sizes.html`（??）+ 自写产物 `index.html`（M）。

**构造断言（`m1/eval/foundation-selftest.mjs`，父代理条件 4）**：① 2 列已声明 ⇒ 出表；② 单列 ⇒ 非表；③ 身份列 + 1 属性列 ⇒ deflist；④ 带名成员成表**保留身份列**（`<td>e4</td>` 仍在）。

## 5. 三页 `<table class="data">` 计数对照（grep 证据，父代理条件 7）

| 页 | 渲染 `<table class="data">` | 源站 `<table>` | 逐表行数对照 |
|---|---|---|---|
| `gov-uk/ni-rates-letters` | **2** | 2 | 未变（字节相同） |
| `aws-amazon/ec2-on-demand` | **3** | 3 | 表头/行数逐张一致：`['', '定价']`+8 行 ↔ 源 9 行（其中 1 行段落渲染为 `_summary`）；`['数据自 Amazon EC2 传出至','']`+68 行 ↔ 源 68；`[…同区域…,'定价']`+3 行 ↔ 源 3 |
| `learn-microsoft/vm-sizes` | **8** | 8 | 7 张族表 + 1 张分类表，表头逐字 `Category/Description/Links`、`Family/Workloads/Series List` |

`tables_rendered` 真数 = **13**（gov-uk 2 + aws 3 + Azure 8）。

## 6. 文档同步清单（41 → 42，父代理/spec §任务 4）

| 文件 | 改动 |
|---|---|
| `README.md` | 状态行 `42 curated exemplar models`；"**42 页策展模型**（23 站；第 43 页 `aliyun-help` 推迟）"；保真 `42/42`；视觉自查 `42/42` |
| `docs/m1/layout-axes.md` | **新增 §3.3**（数据表成立条件 + 反例 + 删除旧阈值的论据 + 影响面） |
| `docs/m1/m4-composites-proposal.md` | 数据层：轮 15 后 42 页/23 站；口径提示：门禁 42 页（目标 43） |
| `m1/eval/m3-report.md` | 顶部口径提示（轮 15 策展 1 页 ⇒ 42 页/23 站）；严口径终值节标题改 42 |
| `.scratch/active-work.md` | 每轮硬判据 42/42；现况 42 页/42/42 干净/47 校验；门禁口径 42；"进行中"改轮 15 |
| `.scratch/decisions-for-user.md` | 当前状态 42/42；门禁 36 → 41 → 42（目标 43） |
| `.scratch/0{5,6,7}-*/spec.md` | 口径提示改 42 页/42/42 |
| `.scratch/{09,10}/report.md`、`.scratch/07-m4/fix-report-{10,11}.md`、`.scratch/06-visual-review/verification-4.md` | **加一行顶部口径提示**（当前分母 42），**不改写**其内的历史运行输出/过去时记录——改写会伪造当时的证据；剩余 `41` 全部落在这些带提示的历史快照里（`grep` 复核） |

## 7. 抽图所见（3/4 张，裁切局部；父代理条件 5）

| 图 | 裁切 | 所见 |
|---|---|---|
| `/tmp/s-aws.png`（aws 渲染 1280×1150+0+380） | 表 0 尾部 + 表 1 前 20 行 | 表 0 末 4 行 `每月前 10TB \| 每 GB $0.09`（`$0.085`/`$0.07`/`$0.05` 逐字）；h3「数据自 Amazon EC2 传出至」下的表头行 `数据自 Amazon EC2 传出至` + 空第二格，随后 67 区域行两列对齐、右列价格整齐 |
| `/tmp/s-gov.png`（gov-uk 1280×1000+0+380） | 雇员表 16 行 + 雇主表头 | 4 列表头 `Category letter \| £129 to £242… \| £242.01 to £967… \| Over £967…` 完整可读，列对齐；**无回归** |
| `/tmp/s-azure.png`（azure 1280×1100+0+300） | 分类表尾部 + General purpose / Compute optimized / Memory optimized | 三列 `Family \| Workloads \| Series List` 表头可读，列对齐；`Family` 列窄导致 `A-\nfamily` 折行（可接受）；`Workloads`/`Series List` 多值格渲染为逐条 pill，与源站 `<br>` 分段一致 |

## 8. 未完成与原因

- **F-052（度量漏洞，未修）**：`_fields` 的 `money`/`list` 值不进保真计数 ⇒ aws 事实数 154 → 81、Azure 37；"保真 1.00"不再覆盖 74 个价格与 71 个列表格。本轮以 `grep` 逐格 + 截图兜底，不擅自改度量口径（同 F-047/D-1 属待裁项）。
- **F-053（格级链接无表达位，未修）**：Azure `Series List`/`Links` 的锚点目标（多为站点相对路径，F-049 未关）如实丢弃并登记。
- aws 表 0 的源站分组行（加粗、第二格空）**已按源站原样建模为两行空价格行**；但"加粗"这一视觉层级无表达位（未新增语法）。
- 未做：`aliyun-help/ecs-instance-families`（0 `<th>`，F-046.2 未解）——第 43 页，仍推迟。

## 9. 门禁原文

```
[pipeline] 渲染 42/42 | 错误 0
[pipeline] 保真 1.00: 42/42
[pipeline] 模型校验: 48 个全通过
[pipeline] 校验器自测: 通过
[pipeline] 地基自测(D1/D2/D3): 通过
[pipeline] 显式降级清单（compare 标记但成不了对比表）:
[pipeline] · stripe-com/pricing · n=2 · degenerate-no-shared-attribute
dup-title: 华为磁吸手机支架 - 华为官网
· sspai-com-home.html                           dup-source-true(info):2

视觉自查: 42/42 干净
[pipeline] 截图 42 张, 画廊 v=muolbhgc
```
`node m1/eval/validate-selftest.mjs` → 校验器自测 12/12 通过；`node m1/eval/foundation-selftest.mjs` → 地基自测: 全部通过（含 F-051 四条）。
`git diff --cached --stat` 为空（无暂存文件）；未 `git commit`；未改 `corpus/`。

TABLE_CURATE_DONE aws=done azure=done gate_pages=42 tables_rendered=13 fidelity=42/42 audit=clean
