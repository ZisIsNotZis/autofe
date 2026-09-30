# 轮 13 · 度量诚实性修复（F-052）

目标：修 `m1/eval/metrics.mjs` 的保真分母盲区——`_fields` 里的 `{money}`/`{list}` 值不计入事实集，
导致表格式页面（aws 价格、vm-sizes 链接格）的保真声明高估覆盖。口径只加严格，不放宽。

## 1. 口径改动前后（逐页差异）

改动：`factValues` 里 role 事实与 `_fields` 条目改走**同一个** `pushFact` 遍历——
`text|date` 取字面、`money` 取 `String(money)`、`num` 取 `String(num)`、`list` 逐元素递归。
旧代码的 `_fields` 分支只覆盖 `text|date|num`，`money`/`list` 静默漏项（F-052）。

| 页面 | 旧 facts | 新 facts | 旧 fid | 新 fid |
|---|---|---|---|---|
| aws-amazon/ec2-on-demand | 81/81 | **155/155** | 1.00 | **1.00** |
| learn-microsoft/vm-sizes | 37/37 | **196/196** | 1.00 | **1.00** |
| 其余 40 页 | 不变 | 不变 | 1.00 | 1.00 |

- 全库事实总数：**3739 → 3972（+233）** = aws 74 个 `{money}` + vm-sizes 159 个 `{list}` 元素。
- 保真门禁：**42/42（1.00）→ 42/42（1.00）**，**没有下降**。原因见下节。
- 未改动的 40 页事实数逐页一致（差分脚本只报出上表两页），口径收紧没有波及它们。

## 2. 新缺失事实的归属判定与处置

新纳入分母的 233 个值**无一缺失**（`factsRendered == factsTotal`，missing 为空）。逐类核查：

- **aws 74 个价格**（含 2 个 `money: 0`）：渲染器在表格里输出 `每 GB $0` / `$0.0116` 等，
  `norm()` 去掉 `$`/空白后与 `String(money)` 相符 ⇒ 真实已渲染，非渲染器缺陷，**无需修渲染器**。
- **vm-sizes 159 个链接格文本**（`Series List`/`Links` 列的 `{list}` 元素）：渲染器以 chip 输出
  每个元素文本 ⇒ 已渲染。注意：**链接目标**（`<a href>`）仍无表达位，属 F-053，本轮只在度量侧
  确认取值文本已计入，不改语法。
- **无需显式排除任何事实**（`excluded_with_reason=0`）：没有"内部 marker 不该渲染"的新增项。
- **无模型缺陷**（不该有的字段）在本轮新增面内被发现。
- **渲染器修复数 `renderer_fixes=0`**：本次没有需要看图确认的渲染器改动。

> 诚实声明：本轮数字**没有下降**。这是因为 233 个新增项在既有渲染里本就存在，只是此前不进分母。
> 覆盖声明因此**变强而非变弱**：同样的 1.00 现在覆盖 233 个更多的值。

## 3. 自测断言

新增 `m1/eval/metrics-selftest.mjs`（并由 pipeline 作为第 4 道门禁执行）：

1. `money/num _fields cells are in the fact denominator` —— 构造 2 行价目表，`factsTotal === 7`。
2. `a fully rendered model keeps fidelity 1.00`。
3. **`a _fields money value absent from the render ⇒ fidelity < 1.00`**（F-052 防复发核心断言）：
   把渲染 HTML 里的 `$9.99`/`$19.99` 抹掉，保真必须 < 1。
4. `the missing money fact is reported by path` —— missing 里出现 `_fields.price`。
5. `list _fields elements are in the fact denominator`（`factsTotal === 6`）+
   `a _fields list element absent from the render ⇒ fidelity < 1.00`。

pipeline 门禁新增一行：`[pipeline] 度量自测(F-052): 通过`，失败即 `process.exit(1)`。

## 4. 文档同步

- `m1/eval/rubric.md`：新增「事实保真分母口径」小节，写明计入/不计入及理由。
- `m1/eval/m3-report.md`：在保真声明处标注新口径与事实数更新。
- `m1/failures.md`：F-052 状态 → 已修；新增 F-054（短数值子串过匹配，遗留局限）。

## 5. 门禁原文

```
[pipeline] 渲染 42/42 | 错误 0
[pipeline] 保真 1.00: 42/42
[pipeline] 模型校验: 48 个全通过
[pipeline] 校验器自测: 通过
[pipeline] 地基自测(D1/D2/D3): 通过
[pipeline] 地基自测: 全部通过
[pipeline] 度量自测(F-052): 通过
视觉自查: 42/42 干净
```

（含 `--shots` 的收尾门禁见第 6 节追加。）

<!-- SLICE 2 appended below -->

## 6. 收尾门禁（`node m1/eval/pipeline.mjs --shots`，退出码 0）

```
[pipeline] 渲染 42/42 | 错误 0
[pipeline] 保真 1.00: 42/42
[pipeline] 模型校验: 48 个全通过
[pipeline] 校验器自测: 通过
[pipeline] 地基自测(D1/D2/D3): 通过
[pipeline] · stripe-com/pricing · n=2 · degenerate-no-shared-attribute
[pipeline] 地基自测: 全部通过
[pipeline] 度量自测(F-052): 通过
视觉自查: 42/42 干净
[pipeline] 截图 42 张, 画廊 v=muolqy7n
```

- 单独跑三套自测：度量自测 8/8、校验器自测 12/12、地基自测全部通过。
- 视觉：**未修渲染器 ⇒ 未看图（0 张，≤4 上限内）**。
- 未提交 git（`git status` 无 staged）。

## 7. 文件清单

- 改：`m1/eval/metrics.mjs`（`pushFact` 统一遍历）、`m1/eval/pipeline.mjs`（接入度量自测门禁）、
  `m1/eval/rubric.md`、`m1/eval/m3-report.md`、`m1/failures.md`（F-052 已修 + F-054）。
- 新增：`m1/eval/metrics-selftest.mjs`；报告 `.scratch/13-metric-honesty/report.md`。
- 流水线再生：`m1/eval/m3-final.json`、`m1/curated/renders/index.html`（画廊版本/事实数）。
- 未碰：`corpus/`、保留键/语法、词表。

## 8. 结论

保真口径只加严不放宽：分母纳入 `_fields` 的 `{money}`/`{list}`（+233 项），43 项中 42 页仍是
1.00，唯一变化的两页新增值**本就已渲染** ⇒ 无新缺失、无渲染器缺陷、无需显式排除。诚实声明：
本轮数字**没有下降**，因为盲区是"漏计"而非"错计"；证明强度因此变强（同样的 1.00 覆盖更多值）。
F-053（格级链接目标）保持未修，作为需人类裁定的原语级项登记。

METRIC_DONE fidelity_before=42/42 fidelity_after=42/42 renderer_fixes=0 excluded_with_reason=0 audit=clean
