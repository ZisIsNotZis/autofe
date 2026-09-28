# M3 报告：自动抽取 vs 人工编码（结构质量指标版）

前置：F-023 根因修正后重抽 6 页；新指标 `m1/eval/structure.mjs`（intent 覆盖 / chrome 动作比 / 松散动作比 / 截断率）。
对照 = 源覆盖告警（high/med）+ 结构质量。

## 对照表

| 页面 | AUTO warn | AUTO 结构 | HAND warn | HAND 结构 |
|---|---|---|---|---|
| apple | high 55 / med 31 | intCov 1.0 trunc 0.55 groups 19 | high 64 / med 50 | intCov 1.0 trunc 0.35 groups 8 |
| antd | **high 4** / med 0 | intCov 0.91 trunc 0.49 groups 102 | high 279 / med 17 | intCov 0.73 trunc 0.60 groups 11 |
| linear | **high 9** / med 2 | intCov 1.0 trunc 0.47 groups 10 | high 138 / med 5 | intCov 1.0 trunc 0.33 groups 5 |
| stripe | **high 37** / med 10 | intCov 1.0 trunc 0.21 groups 30 | high 138 / med 45 | intCov 1.0 trunc 0 groups 4 |
| sspai | **high 2** / med 0 | intCov 1.0 trunc 0.24 groups 7 | high 7 / med 0 | intCov 1.0 trunc 0.13 groups 4 |
| aliyun | **high 44** / med 134 | intCov 1.0 trunc 0.28 groups 16 | high 60 / med 145 | intCov 1.0 trunc 0 groups 4 |

## 结论（修正此前的悲观判断）

1. **自动抽取在覆盖率上全面优于人工编码**——每页告警都更低。antd 4 vs 279 的原因是人工只编码了 3 行示例而自动抽了全部行。
2. **结构质量指标显示自动草稿并不"脏"**：intent 覆盖 0.91–1.0、chrome 动作 0、松散动作 0。此前"文本扫货"的判断在 pickText 修复后不再成立（残留问题是体量大：antd 草稿 102 个组 vs 人工 11 个）。
3. **人工编码的真实优势只剩两个**：故事策展（选哪 3 行、哪个是主指）与截断率较低（但指标的假阳性未排除——合法的部分引用也会命中前缀，见下）。
4. **两个指标的局限**：`truncR` 会把"合法的部分引用"误报为截断（软信号）；`looseR` 会把无目标的服务端动作误报为松散（antd 人工 0.667 即此假阳性）。

## 定案：M3 的正确形态是"自动起草 + 策展"

- 自动抽取**不是**人工编码的替代品，是**前置**：机器先抽全量，策展者（人或 AI 辅助）做选择、定主指、修截断。
- 人工从"从零编码"变为"策展自动草稿"——这正好兑现原始愿景里"AI 委派脚本、人审脚本"的分工。
- 规模化路径：对 104 页全量跑抽取 → 冻结快照 → 每页人工/辅助策展 → 覆盖率声明。

## 已知边界
- `truncR`/`looseR` 为软信号（有假阳性），只作趋势参考。
- F-023 根因已更正：mid-animation 捕获（非采集截断上限）；采集侧"等文本稳定"改进记入 capture 待办。
