# 0 · The route

**Goal (one line):** business intent in, a faithful and well-composed frontend out — one model, three
targets, one decision layer, proven on a curated gallery of real pages.

**Mode:** open (public repository, each milestone is a release). **Budget:** default ¥100; no
user-set budget recorded. Current spend is unknown to this session; re-read the provider surface
before acting on a cost decision.

## Done

### M1 · The gallery — 40 real pages, rendered and reviewable *(delivered; user review pending)*

- **What the user can see:** `m1/curated/renders/index.html` (the gallery),
  `m1/curated/renders/sbs/index.html` (original | rendered pairs), and a README that states what the
  engine does today.
- **What it proves:** 40 captured pages across 19 sites; closed grammar and validator; three targets
  from one decision layer; page prototypes and frames; composites; design language; 18 self-tested
  gates, each with a negative control; hash-bound screenshot evidence.
- **Acceptance met:** the round-63 independent review accepted the technical/source criteria; S1–S7
  fixed the composition/design defects the user named; `pipeline --shots` exits 0.
- **Open:** the user's own verdict on the 7 pages named in round 58 and the rest of the gallery. This
  is `need_user_review` — a perceptual judgement; no later work is allowed to claim it passed.
- **Known holes at delivery:** the dashboard page had names but no values (fixed by M2 in the same
  release window); `_region` inferred; capture gaps; brand layer incomplete (see
  `docs/9_IMPLEMENTATION.md` §4).

### M2 · Dashboards become declarable — the Grafana Stats page carries its measured values *(delivered; user review pending)*

**Why this milestone.** The gallery contains exactly one dashboard page. It is the only archetype
with no expression, its captured stat values are dropped, and the README already promises dashboards
as the next gap. Fixing it is quality-first (D-4): no new sites, one existing page made whole.

**What the user will see.** `grafana-play/play-home` rendered as a dashboard: each panel with its
real stat values and units, introduced by the captured prose, composed as a stat wall rather than a
list of names. The gallery and the original | rendered pair refresh. The README's "what it can do
now" gains the dashboard capability; the status paragraph stops being a stale checkpoint.

**Milestone acceptance.** All of:

1. A page whose own level is dominated by a collection of named, unit-bearing stat members resolves
   to the `dashboard` prototype — never `table`, never `default`.
2. The stat value + unit + name appear in all three targets, in the same decision, with no new
   reserved key or vocabulary role.
3. Every captured stat value on the Grafana page is in the model and the render; values are traceable
   to `corpus/grafana-play/play-home/nodes.json`; nothing is invented or back-filled from a picture.
4. `pipeline --shots` exits 0; the dashboard page's HTML and Markdown fidelity are 1.00; existing 40
   pages are unchanged except the dashboard page (byte-for-byte evidence).
5. An independent visual reviewer has seen the page at full height beside its source and reports no
   blocker; the page is added to the user's review surface.

**Delivery record.** Implemented with existing closed semantics (no new key/role); 33 captured
readings and the intro/basics prose curated from `nodes.json`; 39/40 other pages byte-identical in
all three targets; `pipeline --shots` exit 0 with an empty `AUTOFE_*` environment. Independent
review verdict: **REJECT** on three framed empty panels; fixed with a general body-less-panel rule
(title-only dashed bar), plus row-gap / equal-height / banner-band / 390-column fixes; re-check
verdict **ACCEPT** (blocker gone, no new blocker). The page is now 1280×2000 and 390×4204. Known
losses declared: F-101 (trailing-zero precision), F-102 (uncaptured colour/sparkline options and the
three empty panel bodies). User verdict still open.

## Current

No milestone is sliced past M2. The user's verdict on M1+M2 is the open gate; the next route is
shaped by it. Work that did not depend on it was finished in the same release: the browser toolchain
no longer carries a developer path (WP2.5) and a flaky image-timing assertion in the taste gate was
removed (F-103).

### Workset M2 · one implementation lane (single writer)

- [x] **WP2.1 · Engine: dashboard prototype + stat presentation**
  - *Makes true:* `axis.mjs` resolves a stat-dominated page to `dashboard`; a named+measured,
    childless collection renders as a stat grid; HTML, text and Markdown all carry the same values.
  - *Must not:* add a reserved key, a vocabulary role, a per-site class or a styling escape; change
    any other page's decisions.
  - *Where:* `m1/axis.mjs`, `m1/render.mjs` (+ CSS), `m1/render-text.mjs`, `m1/render-md.mjs`,
    `m1/eval/composition-selftest.mjs`, `m1/eval/axis-selftest.mjs`, `docs/m1/composition.md`.
  - *AC1:* synthetic positive (name+measure collection on a dataset page) → `dashboard`; negative
    (name-only collection, or a page-level table) → not `dashboard`; self-test fails if the rule is
    inverted.
  - *AC2:* cross-target assertion: the same stat name, value and unit are present in all three
    outputs; a renderer dropping the unit fails the self-test.
  - *AC3:* 40 existing pages' HTML/text/Markdown are byte-identical before/after, except the Grafana
    page (record the diff).
  - *AC4:* stat grid at 1160 / 852 / 390 widths: 3 / 2 / 2 columns (1 below 360px), no horizontal overflow, no image
    upscaling.
- [x] **WP2.2 · Curation: Grafana page from capture**
  - *Makes true:* the page's captured intro prose, toolbar, banners and all 11 panels are modelled;
    the 5 value-bearing panels carry their 33 stat name/value/unit pairs.
  - *Must not:* invent a panel value, complete a truncated one, or model a panel body the capture
    does not contain; empty panels are named and explained, not filled.
  - *Where:* `m1/curated/grafana-play/play-home.json`, `m1/curated/curation-log-*.md`,
    `m1/failures.md` if a grammar gap is found.
  - *AC1:* every stat pair in the captured panels is present in the model and the render; a count is
    recorded and re-checkable from `nodes.json`.
  - *AC2:* `node m1/validate.mjs` `ok`; capture-integrity 0 unmatched; HTML and Markdown fidelity
    1.00.
  - *AC3:* every target/link/image is verbatim from the capture; no site-specific key or CSS.
- [x] **WP2.3 · Evidence and release**
  - *Makes true:* gallery, side-by-side, manifest, README and `docs/9_IMPLEMENTATION.md` reflect the
    new state, and the quick start runs from a fresh clone.
  - *Where:* `m1/curated/renders/`, `README.md`, `README.zh-CN.md`, `docs/9_IMPLEMENTATION.md`,
    `docs/0_ROADMAP.md`.
  - *AC:* `pipeline --shots` exit 0; manifest binds new PNG ⇄ HTML; gallery index includes the page;
    README quotes only measured numbers; release report named in the commit.
- [x] **WP2.5 · Runnable release: browser resolution without a developer path**
  - *Makes true:* a fresh clone can run the full gate pass after the documented browser install;
    no eval/capture tool carries a developer-specific `playwright-core` or Chrome path, and no
    environment variable is required when `tools/capture/node_modules` + a Playwright browser exist.
  - *Where:* a shared browser resolver, `m1/eval/*.mjs`, `tools/capture/lib/browser.mjs`,
    `tools/capture/index.mjs`, both README quick starts, `CONTRIBUTING.md`.
  - *AC:* `node m1/eval/pipeline.mjs` with an empty `AUTOFE_*` environment exits 0 in this tree;
    `node tools/capture/index.mjs --dry-run` resolves robots without env; a missing browser or
    `playwright-core` fails with one actionable message, not a stack trace; no render/model change
    (40 pages byte-identical).
- [x] **WP2.4 · Independent visual review (fresh context, never the worker)**
  - *Makes true:* an agent does the user's visual job before the user is asked to look.
  - *AC:* reads the dashboard at full height beside its source and the refreshed gallery; lists every
    seeable defect; 0 blocker remains before the user review. Any fix re-runs WP2.1–2.3 gates.

## Next, not yet sliced

The far route stays unwritten until a fact clears it. The facts already on record that will shape it:

- `_region` as a declared semantic (instead of an inferred two-zone frame) — cleared only if a real
  page's region order cannot be derived faithfully.
- Capture fidelity (panel options, node image `src`/`alt`, 1000-char text cap, hidden inputs) — a
  capture-side change; a page that currently lies because of it names the workpackage.
- A closed chart/series primitive — only if the corpus gains real chart data, not stat panels.
- M5 brand layer (currency glyph/precision, type scale, radius tokens) after the user's review says
  the pages are compositionally acceptable.

## Rejected routes (recorded so they are not paid for twice)

- **Dashboard as escaped SVG/HTML or an image** — ends the closed-grammar claim. Rejected.
- **A chart key with no typed data** — same escape by another name. Rejected.
- **Filling the Grafana page from its screenshot** — capture is truth; a value not in the capture is
  not a fact. Rejected.
- **Filing the dashboard under `table` to avoid a frame** — the prototype would then not describe the
  page. Rejected.
- **Growing the corpus for coverage before the dashboard is whole** — D-4. Deferred.
- **Claiming the user's review passed from a green pipeline** — only the user's eye closes it.
  Forbidden.
