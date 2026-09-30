# 轮 15 · `table` 第 3 个 exemplar 站点采样（收窄版）

目标：补 **1 个新站点**（非现有 exemplar 域）的**只读真实数据表页**，作为 M4 `table` 原语 C1（≥3 exemplar 站）的第二/第三站证据。

## 1. 候选与选择（最多 3 个，选第一个 robots 允许者）

| # | 候选 | 域 | 是否新域 | 判定 |
|---|---|---|---|---|
| 1 | Google Cloud VM instance pricing | `cloud.google.com` | 新域 | robots 预检 **DENY**（`robots_unavailable`，两次连接超时 —— 本网络到 cloud.google.com 不可达或超时） |
| 2 | Azure VM sizes 规格表 | `learn.microsoft.com` | 新域 | robots 预检 **ALLOW** ⇒ **选定**（第一个允许者，按纪律立刻播种实采） |
| 3 | Azure VM pricing (Linux) | `azure.microsoft.com` | 新域 | robots ALLOW，但按纪律**不再比较**，未采 |

**为什么选 `learn.microsoft.com/en-us/azure/virtual-machines/sizes`**
- 域新：现有 exemplar 域中无 `learn.microsoft.com`（非 gov-uk / aws.amazon.com / aliyun-help / stripe 系）。
- 场景顶流：Microsoft 官方产品文档，云基础设施规格表的行业参照。
- 内容形态：只读**规格表**（VM size → vCPU / 内存 / 临时盘 / 网络带宽 等），多行多列 + 真表头，属任务要求的“规格表/价目表/公共数据表”。
- 语义来源：Microsoft Learn 由 markdown 表格生成 ⇒ 预期是真 `<table><thead><th>`，而非组件 demo 或灰底 `<td>` 表头（后者正是 `help.aliyun.com` 规格表无法成表的根因）。

先用 `--dry-run` 做 robots 预检（临时 sites 文件，不写仓库）：见下，GCP DENY / learn-microsoft ALLOW / azure ALLOW。

## 2. robots 预检输出（原文）

```
taxonomy: 10 archetypes from tools/capture/archetypes.md
selection: 3 pages / 3 sites / 1 archetypes
  robots.txt fetch attempt 1 failed (fetch failed; cause: UND_ERR_CONNECT_TIMEOUT)
  robots.txt fetch attempt 2 failed (fetch failed; cause: UND_ERR_CONNECT_TIMEOUT)
DENY  gcp-cloud/vm-instance-pricing [table-heavy/admin] <- robots_unavailable
ALLOW learn-microsoft/vm-sizes [table-heavy/admin]
ALLOW azure-microsoft/vm-pricing-linux [table-heavy/admin]
```

## 3. 播种（只新增，未覆盖任何既有页）

- `tools/capture/sites.json`：新增 site `learn-microsoft`（`tier: "exemplar"` + 一行 `justification` + page `vm-sizes`，`archetype: "table-heavy/admin"`）；`notes` 追加轮 15 记录；`droppedCandidates` 新增 1 条 `cloud.google.com/compute/vm-instance-pricing`（`robots_unavailable`）。
- 覆盖校验：`find corpus -name meta.json -newer corpus/learn-microsoft/vm-sizes/meta.json` → **空**（本次运行只写了这一个页面目录）；`corpus/gov-uk`、`corpus/aws-amazon`、`corpus/github-com` 等的 meta 时间戳全部早于本次运行。

## 4. 实采结果与结构证据

命令：`node tools/capture/index.mjs --page learn-microsoft/vm-sizes`

```
selection: 1 pages / 1 sites / 1 archetypes
OK     [1/1] learn-microsoft/vm-sizes [table-heavy/admin] nodes=917 dom=2270 ax=2316
done: ok=1 partial=0 failed=0; failures recorded=11
```

页面：`corpus/learn-microsoft/vm-sizes/`（`dom.html` 92 567 B / 914 行；`nodes.json`、`a11y.json`、`full.png`、`viewport.png`、`jsonld.json`、`meta.json`）

| 证据 | 值 |
|---|---|
| `grep -c '<table' dom.html` | **8** |
| `grep -c '<th' dom.html` | **32**（= 24 个 `<th>` 表头格 + 8 个 `<thead>`） |
| `<th>…</th>` 完整表头格数 | **24** |
| `grep -c '<tr' dom.html` | **31**（= 8 表头行 + 23 数据行） |
| `<td>` 数据格 | 69 |
| 表头文本（前 6 个 `<th>`） | `["Category","Description","Links","Family","Workloads","Series List"]` |
| `dom.html` 字节数 | 92 567 |
| HTTP / 最终 URL | 200；`https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview?tabs=breakdownseries%2C…`（同 host，tab 内容全部已渲染） |
| 控制台错误 | 0（`meta.errors` 为空） |
| qualityFlags | `artifact_cap_exceeded`（PNG/附件体积，非空壳；`domElements=2270`、`renderedNodes=2400+`） |

**表结构（8 张表，全部真表头）**

```
0) rows=4  hdr=[Category, Description, Links]        # 分类说明：Type / Series / Size
1) rows=5  hdr=[Family, Workloads, Series List]       # A/B/D/E/F/G/H/L/M/N 族（General purpose 等）
2) rows=3  hdr=[Family, Workloads, Series List]       # Compute optimized
3) rows=6  hdr=[Family, Workloads, Series List]       # Memory optimized
4) rows=2  hdr=[Family, Workloads, Series List]       # Storage optimized
5) rows=5  hdr=[Family, Workloads, Series List]       # GPU accelerated
6) rows=2  hdr=[Family, Workloads, Series List]       # FPGA accelerated
7) rows=4  hdr=[Family, Workloads, Series List]       # HPC
```

数据行样例（table 1，原文）：

```
["A-family","Entry-level economical","Av2-series End of Life A-family series"]
["B-family","Burstable","Bsv2-series Basv2-series Bpsv2-series End of Life B-family series"]
["D-family","Enterprise-grade applications Relational databases In-memory caching Data analytics",
 "Dsv7 and Ddsv7 series … End of Life D-family series"]
```

判定：**有真表头的多行多列表**，只读、规格/目录型产品数据（Azure VM 尺寸族 → 工作负载 → 系列），非组件 demo、非 `<td>` 灰底伪表头（后者是 `help.aliyun.com/ecs-instance-families` 成不了表的根因：224 表 / 0 `<th>`）。

## 5. 失败与替代

- `cloud.google.com/compute/vm-instance-pricing`：**未采**。robots 预检两次连接超时（`UND_ERR_CONNECT_TIMEOUT`）⇒ `robots_unavailable`（网络不可达，不是站点拒绝）；已记入 `sites.json` 的 `droppedCandidates`。
- `azure.microsoft.com/en-us/pricing/details/virtual-machines/linux/`：robots **ALLOW**，未采（纪律：第一个允许者即停止比较）。若本轮采到的页不可用，它是现成的下一步候选（同为新域、同为价目表；但 Azure 定价页是 React 客户端渲染，存在 div 网格而非真 `<table>` 的风险，需先验证）。
- 未使用任何伪造数据；以上数字全部由 `corpus/learn-microsoft/vm-sizes/dom.html` 直接统计。

## 6. 对 `table` 策展层 C1 的更新结论

- **采集/证据层：C1 达标（3 个不同 exemplar 域）** — `www.gov.uk`（NI 费率表）、`aws.amazon.com`（EC2 价目表）、`learn.microsoft.com`（Azure VM 规格表，真 `<thead>/<th>`，8 表 / 24 表头格）。此前 `help.aliyun.com` 因 0 `<th>` 无法成表，不计入。
- **渲染/策展层：尚需一次策展** — 本轮只交付采集证据，未建模型。关键有利点：该页**表头词汇只有 3 个**（`Family` / `Workloads` / `Series List`），且 7 张族表**列集合完全一致** ⇒ 列声明成本极低（对比 aliyun 的 76 个列标签的词汇爆炸）。相比之下 AWS 页渲染不出表的根因是模型未声明结构化列，本页只要声明这 3 列即可成表。
- 因此 `table` 原语在**数据层**已解除第 3 站的证据阻塞；**门禁层**是否达标取决于下一轮把 `learn-microsoft/vm-sizes` 策展进模型（预计 1 页 / 3 列）。

TABLE_SAMPLE_DONE page=learn-microsoft/vm-sizes th=24 c1_ready=yes

