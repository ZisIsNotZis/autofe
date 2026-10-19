# AutoFE

Intent-driven frontend: a business/intent intermediate language plus an isomorphic engine that renders it to a frontend form, decoupled from presentation.

Status: M1–M3 implementation and 42 curated exemplar models are present. `m1/axis.mjs` shares decisions across HTML, text and Markdown renderers; `m1/composites.json` declares composite types. The latest round-62 visual repair is a WIP checkpoint with an incomplete gate, **not** M4 acceptance or a publication-ready release. Earlier accepted results are recorded in `.scratch/state-report.md`; rerun the gates below for this revision.

- Design basis: `docs/design-basis.md`
- A curated exemplar render: `m1/curated/assets/62-linear-demo-0.png` (round-62 WIP, not M4 acceptance)
- Provenance (superseded draft): `docs/sources/draft-doubao.md`
- M0 ticket/spec: `.scratch/01-corpus-pipeline/spec.md`
- Capture pipeline: `tools/capture/` (see `tools/capture/README.md`)

The capture pipeline uses the on-disk `chrome-headless-shell` and `playwright-core`; no browser download.

Corpus layout (`corpus/`):

- `corpus/<site>/<page>/` — page captures (`meta.json`, `dom.html`, `a11y.json`, `jsonld.json`,
  `full.png`, `viewport.png`, `nodes.json`). Regenerable and gitignored (`.gitignore` keeps only the
  evidence below + `failures.json`; `run-report.json` is transient and ignored).
- `corpus/failures.json` — every failed page with stage/reason/message (never silently dropped).
- `corpus/run-report.json` — transient per-run results, including quality flags and retry details (not tracked).
- `corpus/_evidence/` — alignment and determinism evidence produced by the verify tools.

Tools: `tools/capture/index.mjs` (capture), `verify-alignment.mjs`, `verify-determinism.mjs`,
`test-guards.mjs`, `report.mjs` — see `tools/capture/README.md`.

## 当前状态与门禁命令

当前 HEAD 是轮 62 视觉修复的未完成检查点，门禁尚未验收；以下命令用于重新检查当前修订版，不应把旧报告中的通过数字当作本轮结果。

门禁命令：

```sh
node m1/eval/pipeline.mjs            # 渲染 + 保真 + 校验 + 自查（快，约 1 分钟）
node m1/eval/pipeline.mjs --shots    # 追加全页截图 + 画廊（约 3 分钟）
node m1/validate.mjs <model.json>…   # 单模型语法/语义校验
```

保真/自查/自测入口：`m1/eval/metrics.mjs`（事实保真）、`m1/eval/source-coverage.mjs`（源覆盖，告警）、
`m1/eval/audit-visual.mjs`（视觉自查）、`m1/eval/validate-selftest.mjs`、`m1/eval/foundation-selftest.mjs`。

- 活跃工作与轮次进展：`.scratch/active-work.md`
- 决策记录（D-1 `_macro` **已被用户否决**，改为 Schema 式复合元语，见裁定记录）：`.scratch/decisions-for-user.md`
- 表达失败日志（F-0xx）：`m1/failures.md`
- M3 验收报告（快照口径提示见文首）：`m1/eval/m3-report.md`
