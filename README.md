# AutoFE

Intent-driven frontend: a business/intent intermediate language plus an isomorphic engine that renders it to a frontend form, decoupled from presentation.

Status: M1–M3 done — closed grammar (`docs/m1/axioms-v0.md`) + isomorphic renderer (`m1/render.mjs`) + **42 curated exemplar models**; M4 composite primitives (`form`/`table`/`offer`/`paginator`/`login`) in progress as **behavior-only** changes, awaiting the `_macro` reserved-key decision (`.scratch/decisions-for-user.md` D-1).

- Design basis: `docs/design-basis.md`
- Provenance (superseded draft): `docs/sources/draft-doubao.md`
- M0 ticket/spec: `.scratch/01-corpus-pipeline/spec.md`
- Capture pipeline: `tools/capture/` (see `tools/capture/README.md`)

The capture pipeline uses the on-disk `chrome-headless-shell` and `playwright-core`; no browser download.

Corpus layout (`corpus/`):

- `corpus/<site>/<page>/` — page captures (`meta.json`, `dom.html`, `a11y.json`, `jsonld.json`,
  `full.png`, `viewport.png`, `nodes.json`). Regenerable and gitignored (`.gitignore` keeps only the
  evidence below + `failures.json` + `run-report.json`).
- `corpus/failures.json` — every failed page with stage/reason/message (never silently dropped).
- `corpus/run-report.json` — per-page results, archetype coverage, quality flags, artifact sizes,
  per-host pacing log, retry pass.
- `corpus/_evidence/` — alignment and determinism evidence produced by the verify tools.

Tools: `tools/capture/index.mjs` (capture), `verify-alignment.mjs`, `verify-determinism.mjs`,
`test-guards.mjs`, `report.mjs` — see `tools/capture/README.md`.

## 当前状态与门禁命令

**42 页策展模型**（exemplar 层，23 站；第 43 页 `aliyun-help/ecs-instance-families` 有意推迟到 M4-b `table` 原语的后续裁定）。
当前门禁全绿：

- 事实保真 **42/42 = 1.00**（模型 → 渲染，逐事实）
- 视觉自查 **42/42 干净**（9 类缺陷自审）
- 模型校验 **47 个全通过** + 校验器自测（坏样例必被拒）
- 地基自测（`_expose` 作用域 / `compare` 位置无关 / 无金额算术）全通过

门禁命令：

```sh
node m1/eval/pipeline.mjs            # 渲染 + 保真 + 校验 + 自查（快，约 1 分钟）
node m1/eval/pipeline.mjs --shots    # 追加全页截图 + 画廊（约 3 分钟）
node m1/validate.mjs <model.json>…   # 单模型语法/语义校验
```

保真/自查/自测入口：`m1/eval/metrics.mjs`（事实保真）、`m1/eval/source-coverage.mjs`（源覆盖，告警）、
`m1/eval/audit-visual.mjs`（视觉自查）、`m1/eval/validate-selftest.mjs`、`m1/eval/foundation-selftest.mjs`。

- 活跃工作与轮次进展：`.scratch/active-work.md`
- 待用户拍板的决策（含 `_macro` 保留键）：`.scratch/decisions-for-user.md`
- 表达失败日志（F-0xx）：`m1/failures.md`
- M3 验收报告（快照口径提示见文首）：`m1/eval/m3-report.md`
