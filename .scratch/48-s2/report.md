# 轮 48：复合元语 S2 —— `table` 首次真实迁移

状态：**完成**（11/11 迁移，4/4 页零渲染回退，门禁全绿）

## 范围与结果

| 项 | 结果 |
|---|---|
| 迁移实例 | **11/11**：`aliyun…instances`(4) · `aws…region-egress`(67)/`same-region`(2) · `gov-uk…employee-rates`(16)/`employer-rates`(16) · `learn-microsoft…general-purpose`(4)/`compute-optimized`(2)/`memory-optimized`(5)/`gpu-accelerated`(4)/`high-performance-compute`(3)/`name-structure-breakdown`(3) |
| schema 校验 | 4 文件 **`ok`**，0 个 `E_COMPOSITE_*`（11 实例全通过） |
| 渲染回退 | **零**：4 页 HTML（剥 `<style>` 前后）+ 文本 + Markdown 与 HEAD **逐字节一致** |
| 页数 | **4/4** 保真 42/42 |
| `{"text":""}` 显式空 | **0 处用到**——11 个集合每行键集本就完整，无缺列，未编造任何值 |
| 未迁移 | `aws…data-transfer`、`learn-microsoft…storage-optimized`、`fpga-accelerated`（理由见下） |

## 做了什么（最小改动）

每个目标集合节点首行插入一行 `"_composite": "table",`，**未改任何其他内容**。
`git diff --stat`：4 个模型 JSON 共 **+11 行**（`aliyun +1 / aws +2 / gov-uk +2 / learn +6`），
另有 `docs/m1/composites.md`（§9.1）与 `m1/failures.md`（F-090）。

## 渲染 diff 证据（升级前 vs 升级后）

- 方法：HEAD 版模型与改后模型各渲染三目标；HTML 剥 `<style>…</style>` 后比较。
- 结果：`aliyun/aws/gov-uk/learn` 四页 `full-html-identical=True`、`body-after-strip-identical=True`；
  文本、Markdown `cmp` 全部 `same`。
- 原因（可证）：`render.mjs`/`render-text.mjs`/`render-md.mjs`/`axis.mjs` 对 `_composite`
  的引用计数为 **0**（`grep -c`）——`_composite` 是**校验/编排**键，不进渲染值。
- 收尾 `--shots` 曾重生成 `renders/**`（含 2 页与本任务无关 PNG 的截图抖动）；
  已 `git checkout -- m1/curated/renders/` 复原，`--check-shots` 仍**通过** ⇒ 我的改动**未触动任何 HTML**。

## schema 抓到了什么（首次真实校验的价值证据）

**11 个实例本身零报错**——这本身是结论：§1.3 承诺的"行缺列从静默填空格变成带路径错误"
在真实语料上**只拦缺陷、不误伤**（这 11 个集合每一行 `_fields` 键集本就一致）。

**负例实测**（`.scratch/48-s2/neg/`，均为改后模型派生，不放宽 schema）：

| 负例 | 报码 |
|---|---|
| 删 `employer-rates` 第 4 行的一列 | `E_COMPOSITE_ROWS_INCONSISTENT`（路径 `employer-rates`） |
| `instances` 加未声明列名 `bogus-col` | `E_COMPOSITE_FIELD_UNDECLARED`（`instances._fields.bogus-col`） |
| `same-region` 的 `money` 列塞 `{"text":"free"}` | `E_COMPOSITE_FIELD_UNDECLARED`（值类型不符） |

即：**缺列 / 缺列名 / 列值类型不符**三种数据缺陷现在都是**带路径的硬错误**，而升级前它们会被引擎静默填空白格掩盖。

## 未迁移（诚实优先）

1. **`aws-amazon/ec2-on-demand.data-transfer`** —— §6.4 S2 明写"维持裸 `_fields` 直至 S0 完成"；
   本轮任务范围只点名 `region-egress`/`same-region`。该集合 7 行在轮 47 S0.1 已补齐一致，但本轮不动。
2. **`learn-microsoft…storage-optimized`（1 行）、`fpga-accelerated`（1 行）** —— 设计 §3.3/§6.2(a)
   称它们应出 `W_COMPOSITE_ROWS_TOO_FEW` 警告，但**`validate.mjs` 只有错误通道、没有警告通道**
   （`grep W_COMPOSITE` = 0 命中）。若升 table，它们会被**静默接受、零提示**——既拿不到设计的警告，
   又违背 §5.3"单列/极短更像 deflist"的裁量。故**不迁移**，保留裸 `_fields`
   （与 §6.4 S2 的"11 个合格集合节点"计数一致）。要落地该警告 = 给校验器加警告通道，
   而 `validate.mjs` **不在本轮写入白名单**，未做。

## schema 的两处缺口（登记，未放宽任何条件）

- **F-090.a**：无警告通道（见上）。设计的 4 条 `W_COMPOSITE_*` 全未实现；本轮**如实登记**而非私加。
- **F-090.b**：table 行一致性只比对**带 `_fields` 的行**；某行**整块 `_fields` 缺失**不被捕获
  （负例 `row_without_fields.json` = `ok`）。即 schema 能抓"缺列"，抓不到"缺整行字段块"。

## 最终门禁（`node m1/eval/pipeline.mjs --shots`，退出码 0）

```
渲染 42/42 | 保真 1.00: 42/42
Markdown 目标: 42/42 | 保真 1.00: 42/42
模型校验: 48 个全通过
校验器自测: 通过 · 地基自测: 通过 · 度量自测: 通过 · 文本目标自测: 通过
轴一致性自测(三目标): 通过 · Markdown 目标自测: 通过
证据门禁自测: 通过 · 归属工具自测: 通过
采集↔模型一致性(F-078): 通过（页面 42 | 事实 4076 | 参与判定 3660 | 未命中 0）
采集一致性自测: 通过 · 图片不放大自测(F-082 · 第10道): 通过
复合元语自测(轮47 · 第11道): 通过 (19/19)
视觉自查: 42/42 干净
证据一致性（PNG ⇄ HTML）: 通过（42 页与截图同源, 画廊 v=mupb4pfo）
```
（收尾 `--shots` 后已复原 `renders/**`，`--check-shots` 单独复验仍通过。）

## 写入的文件（白名单内，无 git 提交）
- `m1/curated/aliyun-com/product-ecs.json`、`m1/curated/aws-amazon/ec2-on-demand.json`、
  `m1/curated/gov-uk/ni-rates-letters.json`、`m1/curated/learn-microsoft/vm-sizes.json`
- `docs/m1/composites.md`（§9.1）、`m1/failures.md`（F-090）
- `.scratch/48-s2/**`（本报告 + before/after/head/neg 证据）
- **未改**：`m1/composites.json`（schema 无需微调）、渲染器、`axis.mjs`、`validate.mjs`。
