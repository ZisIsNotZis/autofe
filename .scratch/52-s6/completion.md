# 轮 52：S6 定稿 + 状态报告刷新 — 完成记录

## 任务 1 S6 定稿
- [x] `docs/m1/composites.md §9.5`：**迁移进度总表**（A 已迁移 27 实例/16 页；B 未迁移 10 人次逐条原因：语义不匹配/缺必需槽/采集缺口/设计推迟；C 不该升级清单；D 注册表格式整理说明）。
- [x] `m1/composites.json` 压回紧凑格式：**340 → 73 行（9551 → 8170 字节）**，`JSON.parse` 深比较 `parse-equal: true`。
  - `.scratch/52-s6/compact.mjs` 在 `5663da6`（轮 50 版）上**逐字节复现**旧格式后，才应用到当前文件。
  - `validate.mjs` 仍 48/48 `ok`；`composite-selftest` 仍 32/32；pipeline 仍全绿。
- [x] `m1/failures.md`：新增「复合元语 S0–S5 小结」段（F-089…F-094 要点，无新臆测）。

## 任务 2 状态报告
- [x] `.scratch/state-report.md` 重写（7 节，覆盖旧版）。数字全部来自本机只读命令（§7 八条）。

## 验证
- `node m1/eval/pipeline.mjs --shots` → **EXIT 0**：HTML 42/42 · MD 42/42 · 模型 48 · 11 自测全过 · 警告 10 · 采集未命中 0 · 视觉 42/42 干净 · 证据一致性通过。
- `node m1/eval/pipeline.mjs --check-shots` → EXIT 0（把 pipeline 生成的 gallery/manifest 还原到 HEAD 后复验一致）。

## 写入面
- 改动：`docs/m1/composites.md`、`m1/composites.json`（仅格式）、`m1/failures.md`、`.scratch/state-report.md`、`.scratch/52-s6/**`。
- pipeline `--shots` 生成的 `renders/index.html` + `manifest.json` 已 `git checkout` 还原（页面 HTML/PNG 逐字节未变）。
- 无 staged 文件；未 git 提交；未改模型/渲染器/axis/校验语义。
