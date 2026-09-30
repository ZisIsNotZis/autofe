# 09 · 新 exemplar 页策展（36 → 42 页）

来源：轮 9/11 采集（`.scratch/08-exemplar-expansion/report.md`）。这些页是为 M4 的 `table`/`login` 原语补的**证据样本**，现需策展进 `m1/curated/` 并纳入门禁。

## 待策展页面（6 个，全部 `corpus/` 已有四件套）
| # | 页面键 | 站点层 | 它提供的证据 | 注意 |
|---|---|---|---|---|
| 1 | `gov-uk/ni-rates-letters` | gov-uk（exemplar） | 真数据表：2 个 `<table>` / 42 个 `<th>` | 表格语义标准样本 |
| 2 | `aliyun-help/ecs-instance-families` | aliyun-help（exemplar，新站点） | 规格表：224 个 `<table>` / 1340 行 / **0 个 `<th>`（粗体 `<td>` 当表头）** | **表头语义存疑**：策展时不要把它当成"标准表头"证据；写入 `_intent` 说明这一事实 |
| 3 | `aws-amazon/ec2-on-demand` | aws-amazon（exemplar，新站点） | 价目表：3 个 `<table>` / 9 个 `<th>` | 价格事实必须有抓取背书，不得换算 |
| 4 | `stripe-dashboard/login` | stripe-dashboard（exemplar，新站点） | 登录：`type=password` + Google/通行密钥/SSO + 创建账户 | 不得提交凭据、不得采"登录后"内容 |
| 5 | `xiaomi-account/login` | xiaomi-account（exemplar，新站点） | 登录：`type=password` + 支付宝/微信/QQ/微博 + 扫码/手机号 tab | 同上 |
| 6 | `github-com/login` | github-com（exemplar，新站点） | 登录：`type=password` + 4 个 `<form>` | 同上 |

## 要求
1. **流程**：先用 `m1/extract/extract.mjs` 生成草稿（若支持新页），再人工策展成 `m1/curated/<site>/<page>.json`。遵守既有纪律：抓取即真相、不得从截图转写文字、每个组/故事线必须有 `_intent`、闭式语法（未知键/非法类型是硬错误）、`_expose` 只声明真正暴露的字段。
2. **不得预埋 M4 原语**：用**当前**语法（角色/域字段/`_expose`/`_rel`）如实建模；原语是后续 M4-b 的事。若某结构当前语法表达不了，就在报告里记「当前语法缺口」并说明，不要造键。
3. **纳入门禁**：把 6 页加进 `m1/eval/m3-scale.json`，`tier: "exemplar"`（保持既有字段格式），使 pipeline 覆盖 **42 页**。
4. **同步所有"36 页"引用**：`README.md`、`m1/eval/m3-report.md`、`docs/**`、`.scratch/active-work.md` 等凡引用页数/分母处一律更正为 42，并注明"轮 9/11 补样本所致"。**禁止留下过期数字**。
5. **门禁**：`node m1/eval/pipeline.mjs --shots` → **42/42 保真 1.00** + **视觉自查 42/42 干净** + 模型校验全通过 + 校验器自测/地基自测通过。
6. **看图自查**：新页渲染后必须自己 read 截图（尤其 3 个表格页与 3 个登录页），确认表格/表单形态合理，并在报告里写"我读了哪张图、看到什么"。
7. 表格页要留意：`_fields`（域字段）声明需在 `m1/vocab-fields.json` 里有对应条目（含列标签），新增字段必须有抓取背书；登录页的输入框用 `_expose`，标签必须来自抓取（不得自己编"用户名/密码"这类文案，除非抓取里有）。

## 纪律
单写入者；40 分钟分片（6 页可能需 2 轮，若超时就**只交付已完成的页并如实报数**）；每片先落盘 `.scratch/09-new-exemplar-curation/report.md`；不得改 `corpus/`；不得 git 提交；新失败模式记 `m1/failures.md`（F-044 起）。

## 产出
`.scratch/09-new-exemplar-curation/report.md`：逐页（草稿→策展要点→抓取依据→抽图所见）/ 语法缺口清单 / 页数与文档同步情况 / 未完成页与原因 / 门禁原文。
最后一行：`CURATE_DONE pages=<n>/6 total_gate=<n> fidelity=1.00 audit=clean|not-clean docs_updated=<yes|no>`。
