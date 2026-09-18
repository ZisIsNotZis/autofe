# 01 — Corpus & capture pipeline (M0)

Status: claimed
Need-review: yes
Need-test-cases: yes (pilot run is the test)

## Objective

Build the M0 corpus groundwork for AutoFE: a page-archetype taxonomy, a stratified page set, and a reproducible capture pipeline that renders each page headlessly and stores DOM + accessibility tree + JSON-LD + screenshots + geometry/style, all aligned.

Non-goals: extracting the business model from pages (that is M1+); multi-device capture; legal review of the corpus.

## Environment facts (verified 2026-09-18)

- Node v24.18.1.
- Headless browser binary already on disk — do not download one:
  `~/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell` (Google Chrome for Testing 151.0.7922.34).
- `playwright-core` already on disk (loads via `require`):
  `/home/z/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core`.
  Launch with `chromium.launch({ executablePath: <binary> })`.
- Network: github.com unreachable; pypi/npm/aliyun mirrors and most CN sites reachable. Network is flaky — retry.
- Do NOT `npm install` a browser. Prefer using the on-disk playwright-core via an absolute `require`/`NODE_PATH`, or a thin local shim.

## Capture output layout

`corpus/<site-slug>/<page-slug>/` containing:

- `meta.json` — url, redirectedUrl, capturedAt, title, viewport {w,h}, userAgent, status, errors.
- `dom.html` — serialized DOM after render, with `<script>/<style>/<noscript>` removed and tracking attributes (`data-*` analytics, `on*`) stripped; layout-affecting attributes and classes kept.
- `a11y.json` — accessibility tree (Playwright `accessibility.snapshot()` or CDP `Accessibility.getFullAXTree`).
- `jsonld.json` — extracted `application/ld+json` / schema.org blocks.
- `full.png`, `viewport.png` — full-page and viewport screenshots.
- `nodes.json` — array, one entry per *visible* element, each with:
  `domPath` (stable index path from `documentElement`), `tag`, `role`, `name` (accessible name), `text` (trimmed), `bbox {x,y,w,h}`, `styles` (fontSize, fontWeight, color, backgroundColor, display, position, opacity), `visible`.
  This entry is the alignment anchor: it links DOM ↔ geometry ↔ style ↔ screenshot region.

## Cleaning rules

Drop: script, style, noscript, hidden nodes (`display:none`, `visibility:hidden`, zero-size), tracking `data-*`/`on*`, ad iframes (best effort). Keep: semantic attributes, classes (needed for computed-style interpretation), text, images' `alt`/`src`.

## Acquisition rules

- Respect `robots.txt` (basic allow/deny for the path) and a per-host delay ≥1.5 s.
- One browser, sequential or low concurrency per host; per-page timeout; retry once on network failure.
- Record failures in a top-level `corpus/failures.json` — never silently drop.
- Curation: site access is best-effort; unreachable pages are recorded as failures, not retried forever.

## Stratification

Cover these page archetypes (target ~10+ pages each, ≥100 total, across ≥25 domains, CN-first since some global sites are unreachable):

`landing/home`, `product-detail`, `category/list`, `search-results`, `article/editorial`, `docs/design-system`, `dashboard/data-viz`, `form/checkout/settings`, `profile/account`, `table-heavy/admin`.

Seed domains (extend as reachable; record what you drop): baidu.com, cn.bing.com (search results), zhihu.com, juejin.cn, zcool.com.cn, huaban.com, 36kr.com, sspai.com, bilibili.com, douban.com, taobao.com, jd.com, xiaomi.com, huawei.com, aliyun.com, cloud.tencent.com, ant.design, arco.design, tdesign.tencent.com, semi.design, element-plus.org, getbootstrap.com, tailwindcss.com, mdn? (unreachable), react.dev? (unreachable), etc.

The taxonomy + seed list lives in `tools/capture/archetypes.md` and `tools/capture/sites.json`; keep it a data file, not hardcoded.

## Deliverables

- `tools/capture/` — the pipeline (Node, uses the on-disk browser + playwright-core).
- `tools/capture/sites.json`, `tools/capture/archetypes.md`.
- `corpus/failures.json` + captured pages.

## Acceptance (pilot gate)

1. Run the pipeline end-to-end on a pilot of ~10 pages spanning ≥5 archetypes.
2. Output conforms to the layout above; `nodes.json` `bbox` matches `full.png` coordinates within a few px for a spot-checked node.
3. Re-running a single page yields a structurally identical output (timestamps may differ).
4. Failures are recorded, not hidden.
Then report: pilot coverage, spot-check evidence, blockers, and whether to scale to the full set.

## Decisions (append-only)

- 2026-09-18 — Storage: page captures stay gitignored (regenerable + third-party trademarks); `corpus/_evidence/` + `corpus/failures.json` are tracked acceptance evidence. `run-report.json` is untracked (transient per-run); the durable summary is `corpus/_evidence/corpus-summary.json`.
- 2026-09-18 — Size policy: keep full-fidelity artifacts; do NOT enable the `--max-page-bytes` / `--max-full-png-height` truncation ladder by default. Mean 3.62 MB/page (337 MB total) is acceptable for a local, regenerable corpus; truncating would weaken the M1+ acceptance evidence. Revisit only if disk/CI bounds require it.
- 2026-09-18 — F1 independently verified: `cleanedPath` resolves against `dom.html` for 1442/351/18065/943 nodes on element-plus/sspai/arco/juejin (0 mismatch, 0 missing) using an independent resolver (`.tmp/verify-join.mjs`, not the project verifier).
- 2026-09-18 — Corpus size accounting (three different, all correct numbers; quote the measure next to the number): 337 MB = `du -sh corpus` (disk blocks); 351.79 MB = apparent byte total of every file under `corpus/`; 350.68 MB = sum of `meta.artifactBytes` over the 97 captured pages (excludes `failures.json`, `run-report.json` and `_evidence/`). The earlier "337 MB total" in the size-policy entry is the `du` figure.
