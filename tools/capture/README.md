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

# everything in sites.json (the full-corpus run, ~97 pages / 36 domains)
node tools/capture/index.mjs

# decide without capturing: robots decision per page
node tools/capture/index.mjs --dry-run

# verification (see "Verification" below)
node tools/capture/verify-alignment.mjs corpus/element-plus/button
node tools/capture/verify-determinism.mjs <dirA> <dirB>
```

Flags: `--pilot`, `--site <slug>`, `--page <site>/<page>`, `--archetype <name>`, `--limit n`,
`--out <dir>` (default `corpus`), `--sites <file>`, `--pilot-file <file>`, `--min-delay-ms n`,
`--include-skipped`, `--dry-run`, `--no-retry-pass`, `--retry-pass-delay-ms n`, `--strict`
(exit 1 if any page failed/partial), `--quiet`.

Env overrides for other machines: `AUTOFE_CHROME_PATH`, `AUTOFE_PLAYWRIGHT_CORE`.

Exit code: 0 when the run completed (page failures are data, recorded in
`corpus/failures.json`), 1 only on a pipeline error or with `--strict`.

## Output layout

`corpus/<site-slug>/<page-slug>/`:

| File | Content |
|---|---|
| `meta.json` | url, redirectedUrl, capturedAt, title, viewport{w,h}, userAgent, status, errors, plus archetype, robots decision, counts, timings, normalizations, qualityFlags |
| `dom.html` | serialized DOM after render, cleaned (see below) |
| `a11y.json` | accessibility tree from CDP `Accessibility.getFullAXTree` |
| `jsonld.json` | `application/ld+json` blocks + best-effort microdata (`itemscope`/`itemprop`) |
| `full.png` | full-page screenshot, document CSS pixels, `deviceScaleFactor 1` |
| `viewport.png` | viewport screenshot (1440×900) at scroll (0,0) |
| `nodes.json` | array, one entry per visible element: `domPath`, `tag`, `role`, `name`, `text`, `bbox{x,y,w,h}`, `styles{fontSize,fontWeight,color,backgroundColor,display,position,opacity}`, `visible` |

Alongside the page directories:

- `corpus/failures.json` — flat list of failures, upserted per `(site,page)`; a successful
  re-run clears that page's stale entries. Never silently dropped.
- `corpus/run-report.json` — per-page results, options, per-archetype selection, host-pacing log.
- `corpus/robots-dry-run.json` — last `--dry-run` output (robots decision per seeded page).
- `corpus/_evidence/` — alignment and determinism evidence produced by the verify tools.

## Acquisition rules (as implemented)

- **robots.txt** (RFC 9309 subset): user-agent groups, `Allow`/`Disallow` with `*` and `$`,
  longest-match wins, allow wins ties, `Crawl-delay`. Our product token is
  `AutoFE-Research-Bot` in the UA string
  `Mozilla/5.0 (…) Chrome/151.0.0.0 Safari/537.36 AutoFE-Research-Bot/0.1`.
  Decisions use the path+query. `404/410/other-4xx` → no restriction; `401/403` → disallowed;
  `5xx`/network error after 2 retries → **disallowed and recorded** as `robots_unavailable`
  (never crawled on a guess). A `Crawl-delay` above `--max-crawl-delay` (default 30 s) skips
  the host and records it instead of ignoring the directive.
- **Per-host pacing ≥ 1.5 s** between any two requests to the same host (robots.txt fetch,
  navigation and retries all pass through the same `HostThrottle`). A larger `Crawl-delay`
  raises that host's floor. `run-report.json.hostPacing.pacedRequests` logs the actual
  gap for every request as evidence.
- **One browser, one context, sequential pages**; navigation timeout 45 s, one retry on
  navigation failure, `load` then best-effort `networkidle` then a 1.2 s settle.
- **Retry pass** (default on): after the main pass, pages that failed for a *transient* reason
  (`robots_unavailable`, `navigation_failed`) get exactly one more attempt after a 5 s pause,
  with the robots cache dropped so `robots.txt` is re-fetched. A robots denial, a 404 or an
  empty render is never retried. The pass is recorded in `run-report.json.retryPass`
  (`attempted` / `recovered` / `stillFailing`) and in each recovered page's `retriedAfter`.
  The network here is genuinely flaky: `echarts.apache.org` succeeded, timed out, then
  succeeded again across three consecutive runs.
- Comparisons are made at 1440×900, `deviceScaleFactor 1`, `zh-CN`, `Asia/Shanghai`,
  colour-scheme light, `prefers-reduced-motion: reduce` (all recorded in `meta.context`).

## Cleaning rules (dom.html)

Dropped: `script`, `style`, `noscript`; ad containers/iframes (doubleclick, googlesyndication,
adsystem, admaster, miaozhen, pos.baidu, alimama, tanx, cpro, `ins.adsbygoogle`,
`*google_ads_iframe*`); elements with no layout box, `display:none` or `visibility:hidden`
**unless** they have a visible descendant or are structural (`table/tr/td/col/option/img/…`,
and everything inside `<head>`); tracking attributes (`on*`, `data-{spm,track,analytics,ga,gtm,
click,report,stat,bi,log,event,beacon,utm}*`); HTML comments. Kept: classes, semantic
attributes, text, image `src`/`alt`.

Two deliberate, reviewable choices worth knowing:

1. **`<head>` is retained** (title/meta/link) although it is not rendered — it is provenance
   for the capture. Everything else follows the spec's "drop hidden nodes" rule.
2. **HTML comments are dropped** — non-rendering noise, sometimes very large.

Dropped nodes are marked once in `analyzeDom()` (`data-af-hidden`) and removed by the
serializer, so there is a single source of truth for "what leaves the DOM"
(`meta.counts.cleanedElements` / `droppedFromDom`).

## Determinism / normalization

`meta.normalizations` lists everything applied: reduced-motion, an animation/transition freeze
injected as an **init script** (so it applies before page scripts and the animation offset is
always 0), light colour scheme, and scroll reset. Launch flags add
`--disable-lcd-text --disable-font-subpixel-positioning --force-color-profile=srgb` so text
rendering is stable. No network requests are blocked or rewritten.

`domPath` is the index path from `documentElement` (`html/body[1]/div[3]/a[0]`; the index is the
position among element siblings). It always addresses the **live rendered DOM**; because
`dom.html` drops unrendered nodes, a `domPath` from `nodes.json` may not resolve verbatim in
`dom.html` — the closest surviving ancestor is the prefix that still resolves.

`a11y.json` is a trimmed tree (`id,parentId,childIds,ignored,role,name,description,value,
properties,domIndex`). Two notes: CDP node ids are not run-stable, so ids are re-assigned in
pre-order DFS; and `domIndex` is the element's index in the **cleaned** DOM order (i.e. into
`dom.html`), because both the CDP `backendDOMNodeId` and the raw live-DOM index move when a page
injects an extra script/style. Visible `nodes.json` entries appear in the same relative order.

Capture-time approximations, stated rather than implied:

- `nodes.json.name`/`role` come from the real accessibility tree when the element is in it
  (`meta.counts.axMatchedNodes`); otherwise a simplified in-page fallback is used (aria-label /
  aria-labelledby / alt / value / placeholder / name-from-content, plus implicit tag roles).
- `nodes.json.text` is `innerText` whitespace-collapsed and capped at 1000 chars.
- Only the top document is walked: elements inside iframes are in `a11y.json` (CDP pierces
  frames) but not in `nodes.json`/`dom.html`.
- Lazy-loaded content that requires scrolling is not triggered; captures are single-pass at
  scroll (0,0).

## Failure recording

A page is `ok` (no failures), `partial` (captured, but e.g. a screenshot or a11y snapshot
failed, or the request was redirected cross-host) or `failed` (no usable capture).
`meta.json.status` is always the HTTP status; capture state lives in `result.status` of the
run report and in `meta.qualityFlags`. Guarded conditions:

- `suspicious_empty_render` — fewer than `minVisibleNodes` (10) visible nodes, or <20 chars of
  body text with <100 nodes. This is what catches SPA shells that return HTTP 200 and render
  nothing. **Such pages are failures, never quiet successes** (this is how the Ant Design Pro
  preview site was caught).
- `cross_host_redirect` — the final host differs from the requested host (e.g. a search page
  that lands on a login page); the capture is kept but the redirect is recorded.

Every failure entry records `stage`, `reason`, `message`, `url`, `partialArtifacts`. When a page
fails at `robots`/`navigation` but a directory from an earlier successful run exists, the entry
also sets `staleArtifactsFromEarlierRun: true` so the leftover files are not mistaken for the
current run's output.

## Verification

- `verify-alignment.mjs <page-dir>` — samples a 5×5 grid inside each solid-colour node's `bbox`
  in `full.png` and compares with the computed background colour, with same-size controls above
  and below the element that must *not* match. Non-matching candidates are explained
  (`translucent-overlay` from a pseudo-element, `ancestor-transparent`, `covered-by-later-node`,
  `non-discriminating`, `low-coverage`) rather than merely counted; `unexplained` is the only
  alarm signal. Also checks that the top of `viewport.png` equals the top of `full.png`
  (proves `full.png` is anchored at document origin).
- `verify-determinism.mjs <dirA> <dirB>` — compares two captures of the same page: file sets,
  JSON structurally, `dom.html` as text, PNGs byte-wise with an exact pixel diff when they are
  not byte-equal. Volatile fields are listed explicitly in the output
  (`ignoredVolatile`), including why `counts.domElements` is not structural.
