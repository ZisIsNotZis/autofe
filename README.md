# AutoFE

Intent-driven frontend: a business/intent intermediate language plus an isomorphic engine that renders it to a frontend form, decoupled from presentation.

Status: design + M0 (corpus & capture pipeline). No engine yet.

- Design basis: `docs/design-basis.md`
- Provenance (superseded draft): `docs/sources/draft-doubao.md`
- M0 ticket/spec: `.scratch/01-corpus-pipeline/spec.md`
- Capture pipeline: `tools/capture/` (see `tools/capture/README.md`)

The capture pipeline uses the on-disk `chrome-headless-shell` and `playwright-core`; no browser download. Corpus page captures are regenerable and not committed.
