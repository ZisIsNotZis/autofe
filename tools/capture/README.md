# tools/capture — M0 corpus capture pipeline

Renders a stratified page set headlessly and stores DOM + accessibility tree + JSON-LD +
screenshots + per-element geometry/style, all aligned. Node only, no dependencies: it uses
the already-installed browser and `playwright-core` from disk and installs nothing.

Ticket: `.scratch/01-corpus-pipeline/spec.md` (M0). Design context: `docs/design-basis.md` §7–§8.

## Usage

```bash
# pilot (11 pages, 10 archetypes — see pilot.json)
node tools/capture/index.mjs --pilot

# one page (also re-runs / overwrites its directory)
node tools/capture/index.mjs --page element-plus/button

# a slice of the seed
node tools/capture/index.mjs --archetype table-heavy/admin --limit 5

# the full corpus (~107 pages / 38 domains)
node tools/capture/index.mjs

# resume a long run: skip pages that already have meta.json
node tools/capture/index.mjs --skip-existing

# decide without capturing: robots decision per page
node tools/capture/index.mjs --dry-run
```

Flags: `--pilot`, `--site <slug>`, `--page <site>/<page>`, `--archetype <name>`, `--limit n`,
`--out <dir>` (default `corpus`), `--sites <file>`, `--pilot-file <file>`, `--min-delay-ms n`,
`--max-page-bytes n` (default 2000000; 0 disables), `--skip-existing`, `--include-skipped`,
`--dry-run`, `--no-retry-pass`, `--retry-pass-delay-ms n`, `--strict` (exit 1 if any page
failed/partial), `--quiet`. Env overrides: `AUTOFE_CHROME_PATH`, `AUTOFE_PLAYWRIGHT_CORE`.

Exit code: 0 when the run completed (page failures are data, recorded in
`corpus/failures.json`), 1 only on a pipeline error or with `--strict`.

## Output layout

`corpus/<site-slug>/<page-slug>/`:

| File | Content |
|---|---|
| `meta.json` | url, redirectedUrl, capturedAt, title, viewport{w,h}, userAgent, status, errors, plus archetype, robots decision, redirect, counts, artifact cap, qualityFlags, timings |
| `dom.html` | serialized DOM after render, cleaned (see below) |
| `a11y.json` | accessibility tree from CDP `Accessibility.getFullAXTree` |
| `jsonld.json` | `application/ld+json` blocks + best-effort microdata (`itemscope`/`itemprop`) |
| `full.png` | full-page screenshot, document CSS pixels, `deviceScaleFactor 1` |
| `viewport.png` | viewport screenshot (1440×900) at scroll (0,0) |
| `nodes.json` | array, one entry per **laid-out** element |
| `nodes.json` entry | `domPath`, `cleanedPath`, `cleanedIndex`, `tag`, `role`, `name`, `text`, `bbox{x,y,w,h}`, `styles{fontSize,fontWeight,color,backgroundColor,display,position,opacity}`, `visible` |

Alongside the page directories:

- `corpus/failures.json` — flat list of failures, upserted per `(site,page)`; a successful
  re-run clears that page's stale entries. Never silently dropped.
- `corpus/run-report.json` — per-page results, options, archetype coverage, quality-flag counts,
  artifact-size distribution, host-pacing log, retry pass.
- `corpus/robots-dry-run.json` — last `--dry-run` output (gitignored; regenerate with `--dry-run`).
- `corpus/_evidence/` — alignment and determinism evidence from the verify tools.

## Join keys (DOM ↔ nodes ↔ a11y ↔ screenshot)

- `domPath` — index path in the **live rendered DOM** (`html/body[1]/div[3]/a[0]`; index = position
  among element siblings). Resolves in the live DOM only.
- `cleanedPath` / `cleanedIndex` — position in the **delivered `dom.html`**. These are produced by
  cloning the cleaned tree, parsing that serialization back with `DOMParser`, and walking the parsed
  tree (`extractCleanedDom`), so they resolve in the delivered file **by construction** — the live
  DOM can contain markup an HTML parser repairs differently (nested `<a>`, blocks in inline
  elements, elements outside `<body>`), and paths derived from the live tree do not survive that.
  `meta.counts.domReparseDuplicates` records how many markers the re-parse duplicated (adoption
  agency) on a page.
- `a11y.json[].domIndex` — same value as `nodes.json[].cleanedIndex`; the join key for the
  accessibility tree.
- Entries are **excluded** from `nodes.json` when they have no position in the parsed `dom.html`,
  and the reason is counted separately: `meta.counts.adExcludedNodes` (inside a dropped ad subtree)
  and `meta.counts.nodesWithoutDomPath` (markup the HTML parser dropped or relocated).
- `verify-alignment.mjs` re-parses `dom.html` in a browser and asserts, for every entry, that
  `cleanedPath` resolves, that its tag matches, and that `cleanedIndex` equals the element's
  pre-order index in that parse — plus a sample of `a11y.json[].domIndex` values resolved the same
  way and checked against the tag implied by the AX role. Any mismatch is a blocker.

**Document scope of `a11y.json`**: only the main frame is persisted. `meta.frames` lists every
frame with `depth`, `url`, `origin` and `crossOrigin` (CDP frame ids are deliberately not stored —
they are not run-stable), and AX nodes attributed to any other frame are dropped and summarised in
`a11y.json.framesExcluded` / `meta.counts.a11yFrameNodesExcluded`. Pages that embed a cross-origin
frame are flagged `cross_origin_frame` so third-party frame content is never silently persisted —
we did not ask to crawl it, and it has no counterpart in `dom.html`/`nodes.json`. Measured on the
seed pages checked, Chromium attributes 0 AX nodes to those frames (tdesign.tencent.com embeds
`tdesign.gtimg.com/site/spline/data/index.html`: 1 frame listed, 0 nodes persisted), so the
exclusion is defensive.

`role`/`name` come from the real accessibility tree when the element is in it
(`meta.counts.axMatchedNodes`, `axCoverageRatio`); otherwise a simplified in-page fallback is used
(aria-label/-labelledby/alt/value/placeholder/name-from-content plus implicit tag roles).
`text` is `innerText`, whitespace-collapsed, capped at 1000 chars (the artifact cap can lower it).
Only the top document is walked: iframe content is present in `a11y.json` (CDP pierces frames) but
not in `nodes.json`/`dom.html`.

## Acquisition rules

- **robots.txt** (RFC 9309 subset): user-agent groups, `Allow`/`Disallow` with `*` and `$`,
  longest-match wins, allow wins ties, `Crawl-delay`. Rules appearing before the first `user-agent`
  line are ignored, and rule specificity counts the path only (`$` excluded).
  `404/410/other-4xx` → no restriction; `401/403` → disallowed; `5xx`/network error after 2 retries
  → **disallowed and recorded** (`robots_unavailable`), never crawled on a guess.
- **robots.txt redirects are followed only within the same origin**, at most 3 hops. A cross-origin
  redirect is recorded and treated as unavailable (`robots_cross_origin_redirect`) rather than
  applying another host's rules to this host. Measured effect on this seed: three JD hosts redirect
  to a non-robots resource (`h5st.m.jd.com` error page; `http://www.jd.com/` homepage), so those
  pages are excluded and recorded; `item.jd.com` is unaffected.
- **Browser fallback for robots.txt**: if Node cannot fetch it (this environment intermittently
  times out on `echarts.apache.org` and `mui.com` while Chromium succeeds), the same GET is retried
  through the browser's network stack, still paced and still rejecting cross-origin redirects
  (`meta.robots.fetchedVia` is `node` or `browser`).
- **robots governs the top-level navigation only**, and both URLs of that navigation are checked:
  the requested URL before the browser starts, and the **final URL** the navigation settled on. If
  the redirect target is disallowed, the capture is abandoned with `robots_redirect_disallowed`,
  artifacts are discarded, and nothing is written (`failures.json` keeps `requestedUrl` + the
  matched rule). The URL is re-read immediately before anything is written and re-checked if it
  moved in between (a main-frame `framenavigated` log is kept in `meta.redirect.navigationLog`); an
  allowed late move is recorded as `late_navigation`, a denied one discards the capture.
  **Not robots-checked**: the subresource requests the rendering engine makes on its own (scripts,
  stylesheets, images, fonts) and any frame URLs — robots.txt regulates crawling URLs, not the
  engine's subresource fetches, so the capture behaves like a normal browser there. Frame content
  is not persisted (see the a11y document scope above).
- **Per-host pacing ≥ 1.5 s** between any two requests to the same host (robots fetch, navigation
  and retries all pass through one `HostThrottle`); a larger `Crawl-delay` raises that host's floor,
  and a `Crawl-delay` above 30 s skips the host with a recorded reason. `run-report.json.hostPacing`
  logs the actual gap for every request.
- **One browser, one context, sequential pages**; navigation timeout 45 s, one retry on navigation
  failure, `load` then best-effort `networkidle` then a 1.2 s settle.
- **Retry pass** (default on): after the main pass, pages that failed for a *transient* reason
  (`robots_unavailable`, `navigation_failed`, `suspicious_empty_render` — anti-bot shells) get
  exactly one more attempt after a 5 s pause with the robots cache dropped. A robots denial, a 404
  or a redirect denial is never retried. Recorded in `run-report.json.retryPass`.
- Comparisons are made at 1440×900, `deviceScaleFactor 1`, `zh-CN`, `Asia/Shanghai`,
  colour-scheme light, `prefers-reduced-motion: reduce` (all in `meta.context`).

## Cleaning rules (`dom.html`)

`analyzeDom()` is the single source of truth for what leaves the DOM: it marks dropped elements
with `data-af-hidden`, and the serializer only removes those, strips tracking attributes and
comments, and keeps everything else.

Dropped: `script`, `style`, `noscript`; ad containers **and their whole subtree** (doubleclick,
googlesyndication, adsystem, admaster, miaozhen, pos.baidu, alimama, tanx, cpro, `ins.adsbygoogle`,
`*google_ads_iframe*`); subtrees with no layout box (`display:none`) unless they are structural
(`table/tr/td/col/option/img/…` and everything inside `<head>`) or contain a laid-out descendant.
Stripped: tracking attributes (`on*`, `data-{spm,track,analytics,ga,gtm,click,report,stat,bi,log,
event,beacon,utm}*`) and HTML comments.

Three deliberate, reviewable choices:

1. **`<head>` is retained** although it is not rendered — provenance for the capture.
2. **`visibility:hidden`/`opacity:0` elements that still occupy layout are kept**, in `dom.html` and
   in `nodes.json` with `visible: false`. This is what makes the `visible` field meaningful
   (laid-out vs painted) instead of always-true, and it preserves exactly the state carriers M1
   needs (collapsed menus, tabs, modals). The spec's "drop hidden nodes" rule is applied to
   *unrendered* (`display:none`/boxless) subtrees.
3. **Ad containers are dropped with their descendants**, so no `nodes.json` entry can point into a
   removed subtree.

## Determinism and normalization

`meta.normalizations` lists everything applied: reduced-motion, an animation/transition freeze
injected as an **init script** (so it applies before page scripts and the animation offset is always
0), light colour scheme, and scroll reset. Launch flags add `--disable-lcd-text
--disable-font-subpixel-positioning --force-color-profile=srgb` for stable text rendering.
`meta.errors` is sorted because console events arrive asynchronously. No requests are blocked or
rewritten during capture.

`verify-determinism.mjs` compares two captures: JSON structurally, `dom.html` as text, PNGs
byte-wise first and then over **every** pixel, requiring all three budgets (max channel delta,
differing fraction, diff-box area fraction) to hold before a PNG diff counts as rendering noise.
Its output lists the ignored volatile fields and why.

## Failure recording

A page is `ok`, `partial` (captured, but e.g. a screenshot or a11y snapshot failed, or a
cross-host redirect was recorded) or `failed` (no usable capture). `meta.json.status` is always the
HTTP status; capture state lives in the run report and in `meta.qualityFlags`.

Quality flags: `suspicious_empty_render` (no rendered nodes; or <20 chars of body text with <100
nodes; or a page whose scripts threw and which rendered fewer than 150 nodes and 300 chars — this
is what catches SPA shells and failed-JS pages that return HTTP 200 and render nothing usable),
`ax_coverage_low` (a11y match ratio < 0.6 on a page with ≥50 nodes, i.e. the join is low fidelity
and the fallback roles dominate), `dom_changed_during_capture` (more than 1 % of *laid-out* elements
appeared after the analysis pass, i.e. the page re-rendered mid-capture; script/style injections do
not count, and sub-threshold loss is still visible as `counts.nodesWithoutDomPath`),
`cross_origin_frame` (a third-party frame is embedded; its content is not persisted),
`late_navigation` (the URL moved after the robots check and was re-checked), `asset_load_failed`
(a same-host stylesheet/script failed at the network layer or returned ≥400 — such a page renders
degraded, so it is recorded as `partial`, not `ok`), `artifact_cap_exceeded` (below).

**Terminal failures discard artifacts**: for `robots_*`, `navigation_failed`, `http_error` and
`capture_failed`, any directory from an earlier successful run is removed so `failures.json` can
never point at stale data; the entry records `discardedStaleArtifacts`. Failures that keep partial
artifacts set `partialArtifacts: true` instead.

## Artifact cap

`--max-page-bytes` (default 2 MB) bounds each page's artifacts. The PNG pair is the alignment anchor
and is never modified; the cap acts on the JSON only, in order: `nodeTextCappedAt200Chars`,
`nodeTextCappedAt64Chars`, `a11yIgnoredNodesTrimmed` (ignored AX nodes reduced to
id/parentId/role/childIds/domIndex). Mitigations and the resulting `meta.artifactCap` (including the
json/image split) are recorded, and pages still over the cap keep every artifact and are flagged
`artifact_cap_exceeded`. `tools/capture/report.mjs` prints the size distribution.

`nodes.json` and `a11y.json` are written compact (pretty-printing them nearly doubled their size);
`meta.json`, the run report and the evidence files stay pretty-printed.

Measured on the full seed (97 captured pages, 350.7 MB total): mean 3.62 MB, median 2.18 MB,
p90 7.04 MB, max 25.8 MB, 53 pages flagged `artifact_cap_exceeded`. Composition: `nodes.json`
≈36 %, `full.png` ≈30 %, `a11y.json` ≈23 %, `viewport.png` ≈6 %, `dom.html` ≈5 %.

**A `<2 MB/page` average is not reachable while keeping complete evidence.** The 30 k-node component
docs pages (semi-design/table: 17.8 MB of `nodes.json`) and image-heavy long pages (`full.png` up to
8.8 MB) are inherent; PNGs alone average ≈1.5 MB/page. Two configurable knobs are provided for that
trade-off — `--max-page-bytes` (JSON ladder + flag) and `--max-full-png-height` (truncates `full.png`
to N px of document height, records it in `meta.artifactCap.fullPngHeight` and flags the page
`fullpage_screenshot_truncated`; nodes below the cut are reported by the alignment verifier as
`nodesBelowCapturedHeight`). Both default to complete evidence; choosing truncation is a policy
decision for the corpus owner.

## Verification

- `verify-alignment.mjs <page-dir>` — four independent checks with an explicit verdict, blockers and
  warnings:
  1. **domResolution** — re-parse `dom.html` in a browser and assert every `cleanedPath` resolves
     with the right tag, that `cleanedIndex` matches the pre-order index of that element, and that a
     sample of `a11y.json[].domIndex` resolves to a tag consistent with the AX role (blocker).
  2. **colour grid** — 5×5 grid across the whole box (1 px inset, not the 10 % inset used before,
     which could hide a large offset) inside each solid-colour node vs its computed background,
     with same-size controls above/below that must not match; `--min-fraction` defaults to 0.6.
     Non-matching candidates are explained
     (`translucent-overlay`, `ancestor-transparent`, `covered-by-later-node`,
     `covered-by-overlapping-node`, `fixed-or-sticky-relayout`, `near-match`, `non-discriminating`,
     `low-coverage`); `unexplained` is the alarm signal (blocker).
  3. **painted feature** — for image-like elements, the ink centroid must lie inside the bbox and the
     ink extent within `--feature-tolerance` px; this catches many-px offsets on image-heavy pages
     (blocker when one fails).
  4. **frame anchor** — `viewport.png` vs the top of `full.png`. `< 0.99` is a warning: full-page
     capture re-lays out sticky/fixed and viewport-sized content, so this anchor is weak on pages
     with such elements (arco-design measured 0.970 in a 462×292 region).
  Also reports **shift sensitivity**: the smallest offset the matched elements actually detect —
  measured (each candidate's grid is re-sampled at 1,2,3,…,256 px offsets until the match fraction
  drops below `--min-fraction`), with the analytic bound `ceil(min(w,h)·(1−minFraction))` as a
  fallback for elements larger than the ladder. That is "alignment proven to within X px", warning
  when coarser than `--max-shift-sensitivity` (default 16). The measured threshold is far tighter
  than the old `min(w,h)/2` estimate: the pilot reports 1–16 px. The same offset-ladder reasoning
  is why `minFraction` was raised: with a full-box grid the detectable offset is
  `min(w,h)·(1−minFraction)`, so a low threshold silently weakens the claim.
- `verify-determinism.mjs --pair A:B [--pair C:D]` — see above; exits non-zero only on a real
  difference.
- `test-guards.mjs` — 22 checks against a local server + stub robots, no external network:
  redirect-target robots denial recorded + artifacts discarded (cross-host *and* same-host-to-
  disallowed-path), cross-host redirect captured and recorded, `robots.txt` cross-origin redirect
  not followed, stale-artifact discard on `http_error`, sparse-render-with-page-error recording,
  same-host stylesheet error ⇒ `partial` + `asset_load_failed`, third-party frame content not
  persisted + `cross_origin_frame` flag, and the robots-parser rules (pre-`user-agent` rules
  ignored, `$` excluded from specificity, product-token matching, plain disallow still blocks).
- `report.mjs [--corpus corpus] [--json]` — per-archetype coverage, failure breakdown, size
  distribution and quality-flag counts from `run-report.json` + `failures.json`.

## Known limitations

- Single-pass capture at scroll (0,0): lazy content that requires scrolling is not triggered.
- `position: fixed`/`sticky` elements can be painted at a different document position in `full.png`
  than in the live DOM (viewed by the verifier as `fixed-or-sticky-relayout` and a weak frame anchor).
- The a11y join depends on what Chromium exposes: heavily presentational pages can have low coverage
  (arco-design docs: 0.26, flagged `ax_coverage_low`).
- `nodes.json` `text` is capped (1000 chars, lower under the artifact cap); container text therefore
  repeats its children's text.
- A robots.txt that is unreachable from both Node and the browser denies the host for that run
  (recorded, never guessed).
- Pages driven by timers rather than CSS (a JS carousel that advances on `setInterval`) can still
  differ between runs: the freeze stops CSS animations, not JavaScript. Observed on
  `mi-com/home`, whose hero carousel had advanced to a different slide on a second capture; the
  determinism pair used for acceptance (`element-plus/button`, `arco-design/components-table`) is
  byte-identical.
