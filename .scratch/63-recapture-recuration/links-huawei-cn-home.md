# links · huawei-cn/home · round 63 link-coverage closure

Baseline: `node m1/eval/link-coverage.mjs --only huawei-cn/home` → 2 wrong-target findings (matches /tmp/links-now.json). `node m1/validate.mjs m1/curated/huawei-cn/home.json` → ok. `node m1/eval/capture-integrity.mjs --only huawei-cn/home` → 0 unmatched.

## Finding · business._items[5]._name → 智能汽车解决方案业务 (model-level wrong-target + its render echo)

- Model before fix: `business._items[5]._action.to = https://auto.huawei.com/cn/?utm_medium=ownmedia&utm_source=huaweicorp&utm_campaign=alwayson`.
- Capture (`corpus/huawei-cn/home/dom.html`): exactly ONE anchor for this text — text `智能汽车解决方案业务`, href `https://auto.huawei.com/cn/?utm_medium=ownmedia&utm_source=huaweicorp&utm_campaign=alwayson-module` (absolute in source, no `alwayson` without `-module` anywhere on the page).
- Decision: stale model target (pre-recapture value) → **model FIXED verbatim from capture** (branch 1): `_action.to` → `…alwayson-module`. Second finding (`render-owner-unverified`, render href `…alwayson` with `&amp;` entities) is the same stale URL echoed by the stale committed render; it cannot exist after re-render.

## Verification (2026-10-16 round 63)

- `node m1/validate.mjs m1/curated/huawei-cn/home.json` → ok.
- `node m1/eval/capture-integrity.mjs --only huawei-cn/home` → 0 unmatched.
- `node m1/render.mjs m1/curated/huawei-cn/home.json /tmp/render-huawei-home.html`; `node m1/eval/metrics.mjs … /tmp/render-huawei-home.html corpus/huawei-cn/home` → **factFidelity 1**.
- checkPage with the fresh /tmp render → **findings 0, linked 42/42**. With the stale committed render → 1 transitional anchor-dropped on the same text (old render still carries `alwayson`); clears when the parent regenerates renders at integration.

## Proposed link-coverage-allow entries
None — model fix + integration re-render close the page; no URL was constructed.
