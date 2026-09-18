# AutoFE

Intent-driven frontend: a business/intent intermediate language plus an isomorphic engine that renders it to a frontend form, decoupled from presentation.

Status: design + M0 (corpus & capture pipeline). No engine yet.

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
