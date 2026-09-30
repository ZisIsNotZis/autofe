# 12 · 让 `table` 在策展层真正成立（模型声明结构化列）

背景（父代理实测）：策展层目前**只有 gov.uk 一页真的渲染出数据表**。
- `aws-amazon/ec2-on-demand`：源站 3 张价目表、67 个区域行，但模型用了 `_name`+`_price`，**未声明结构化列 ⇒ 引擎渲染不出表**。
- `learn-microsoft/vm-sizes`：新采（8 表 / 24 个 `<th>` / 表头 `Family`/`Workloads`/`Series List`），**尚未策展**。

## 任务
1. **修 aws 页**：去 `corpus/aws-amazon/ec2-on-demand/nodes.json|dom.html` 核对每个区域行的真实字段（如 region / vCPU / memory / price-per-hour），在 `m1/vocab-fields.json` 声明对应域字段（含列标签，必须有抓取背书），把 `_name`+`_price` 改为 **`_fields` 结构化行**，使引擎渲染出**真 data 表**。金额**不得换算/四舍五入**，逐字照抓取。
2. **策展 `learn-microsoft/vm-sizes`**：7 个 family 表共用 3 列表头（Family/Workloads/Series List）⇒ 声明 3 个域字段；另有 `Category/Description/Links` 表按同样方式处理。纪律不变：`_intent` 必填、抓取即真相、不得从截图转写。
3. **纳入门禁**：`learn-microsoft/vm-sizes` 加进 `m1/eval/m3-scale.json`（`tier: "exemplar"`）⇒ 门禁 **41 → 42 页**。
4. **文档同步**：全库页数引用改为 **42**（README / `docs/**` / `m1/eval/m3-report.md` / `.scratch/**`），不留过期数字。
5. **验收**：`node m1/eval/pipeline.mjs --shots` → **42/42 保真 1.00** + **视觉自查 42/42 干净** + 模型校验全通过 + 两套自测通过；并用 grep 证明 gov-uk / aws / learn-microsoft **三页都渲染出 `<table class="data">`**，数量与源站表格数对得上。
6. **看图自查**：read 这 3 页截图确认表格形态（列对齐、表头可读）。

## 纪律
单写入者；**40 分钟分片**；每片先落盘 `.scratch/12-table-curation/report.md`；不得改 `corpus/`；不得 git 提交；新失败模式记 `m1/failures.md`（F-051 起）。可用 `.scratch/11-table-sample/report.md` 作为输入。
最后一行：`TABLE_CURATE_DONE aws=<done|no> azure=<done|no> gate_pages=<n> tables_rendered=<n> fidelity=42/42 audit=clean|not-clean`。
