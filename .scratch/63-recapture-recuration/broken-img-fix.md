# 63 · Broken-img fix (5 pages, 35 refs → 31 local assets)

Worker: broken-img-fixer. Completed 2026-10-16 (round 63). Budget: well under 40 min, 0 screenshot reads (≤2 allowed).

## Task
Eliminate audit-visual `broken-img` warnings on mi-com/search-earbuds, mi-com/search-phone, sspai-com/home, sspai-com/matrix, stripe-docs/payments by making every referenced image actually load.

## Diagnosis (measured, probe `.scratch/63-recapture-recuration/probe-broken.mjs`)
audit-visual caps `broken` at 2 unique srcs per page, so its counts (×2/×2/×1/×2/×1) under-report. Strict headless probe (networkidle + 2.5 s) measured the real failures: search-earbuds 5, search-phone 4, home 5, matrix 20, payments 1 = **35 refs, 31 unique URLs**.

- mi-com: every failing src is **protocol-relative** (`//cdn.cnbj1.fds.api.mi-img.com/…`); under the audit's `file://` render URL these resolve to `file://cdn…` and never load. Fully-qualified `https://` neighbours on the same pages load fine.
- sspai-com: ALL `cdnfile.sspai.com` refs fail in the headless audit (home 5/5, matrix 20/20), although the same URLs download fine with browser-like headers (server-side slowness/refusal of the headless fetch, not hotlink 403).
- stripe-docs/payments: single hero PNG from `b.stripecdn.com` intermittently exceeds the audit's load window (flaky CDN latency) — flagged by audit-visual, loaded under the stricter probe.

## Method (per task contract)
1. Download each URL with browser-like headers (Chrome UA + per-site referer: mi.com / sspai.com / docs.stripe.com) to `m1/curated/assets/`.
2. Verify with file(1): real image, nonzero dimensions (31/31 passed — **no crop fallback needed**; no CDN refused).
3. Repoint the model's `_image.image` value to `../assets/<name>` (raw-string replace, fail-loud on any miss; `alt` untouched).
4. Re-render the 5 pages with `node m1/render.mjs <model> m1/curated/renders/<site>-<page>.html` (single-page idempotent render — full pipeline NOT run, renders/manifest untouched, per ticket).

Asset naming follows the round-62 provenance rule, verified against `.scratch/62-all-sites/…/asset-provenance.json` (46d4bcfd2844, b2a4a48da7f3): `62-<site>-<page>-<sha256(canonicalURL)[:12]>.<ext>`. Canonical URL = protocol-relative `//` → `https://`, `&amp;` → `&`. The task brief's "sha8" refers to this same URL-hash rule; existing convention is 12 hex chars and was kept.

The 4 mi URLs shared by both search pages are localized ONCE (named by search-earbuds, their first page) and referenced by both models — one asset per URL, no duplicated bytes.

## Per-image record (31 assets, 35 refs)

| Original URL (truncated) | Used by | Dims | Size |
|---|---|---|---|
| `https://cdn.cnbj1.fds.api.mi-img.com/nr-upload-outer/B952B560DC8D1292F1613BC54D5E3BFB_1779938025614.jpg?thumb=…` | mi-com/search-earbuds + mi-com/search-phone | 180x180 | 10.3K |
| `https://cdn.cnbj1.fds.api.mi-img.com/nr-upload-outer/6D988AF01A1A0C244DB3E3F969A7FB00_1783927130235.jpg?thumb=…` | mi-com/search-earbuds + mi-com/search-phone | 180x180 | 4.9K |
| `https://cdn.cnbj1.fds.api.mi-img.com/nr-pub/202510092003_f37d9cd49380a0d4a612afbe18a6c949.png?thumb=1&w=180&h=…` | mi-com/search-earbuds + mi-com/search-phone | 180x180 | 2.8K |
| `https://cdn.cnbj1.fds.api.mi-img.com/nr-pub/202309131502_65ed927493748e27caf09d80f448c479.png?thumb=1&w=180&h=…` | mi-com/search-earbuds + mi-com/search-phone | 180x180 | 4.4K |
| `https://cdn.cnbj1.fds.api.mi-img.com/mi-mall/8c27c25b38dc7c000dd26d23739f951d.jpg?thumb=1&w=180&h=180&f=webp&q…` | mi-com/search-earbuds | 180x180 | 1.3K |
| `https://cdnfile.sspai.com/2026/10/16/article/119830f3-d0b6-4a82-89f1-4b47b0e9f47d.jpg?imageMogr2/auto-orient/t…` | sspai-com/home | 1176x1176 | 176K |
| `https://cdnfile.sspai.com/2026/10/15/article/a167992a-18e6-45ed-825d-3a3bfbd054cf.png?imageMogr2/auto-orient/t…` | sspai-com/home | 1176x1176 | 256.3K |
| `https://cdnfile.sspai.com/2026/10/6/article/160f7248-cb0d-a300-1a80-bf76c03bae11.jpeg?imageMogr2/auto-orient/t…` | sspai-com/home | 1176x1176 | 62K |
| `https://cdnfile.sspai.com/2026/10/6/article/8cdbbdd1-bad3-8516-599c-59a668ed414a.jpeg?imageMogr2/auto-orient/t…` | sspai-com/home | 1176x1176 | 16K |
| `https://cdnfile.sspai.com/2026/10/6/article/94410757-3b66-b0f9-05e7-2013e332ab8c.jpeg?imageMogr2/auto-orient/t…` | sspai-com/home | 1176x1176 | 33.3K |
| `https://cdnfile.sspai.com/2026/10/15/a3a3a10c2752036bd1607547919c225d.png?imageMogr2/auto-orient/thumbnail/!64…` | sspai-com/matrix | 640x400 | 44.4K |
| `https://cdnfile.sspai.com/2026/10/13/17e02621360b9347dba24752baa7ccc7.JPG?imageMogr2/auto-orient/thumbnail/!64…` | sspai-com/matrix | 640x400 | 15.4K |
| `https://cdnfile.sspai.com/2026/10/12/be8692285d8613e9259d3b40c5e438e1.png?imageMogr2/auto-orient/thumbnail/!64…` | sspai-com/matrix | 640x400 | 16.6K |
| `https://cdnfile.sspai.com/2026/10/15/a072770925ccbf88051296d36823d629.jpg?imageMogr2/auto-orient/thumbnail/!64…` | sspai-com/matrix | 640x400 | 36.4K |
| `https://cdnfile.sspai.com/2026/10/11/6891981b6bbb88e3d2d88d5c9c846377.png?imageMogr2/auto-orient/thumbnail/!64…` | sspai-com/matrix | 640x400 | 12.1K |
| `https://cdnfile.sspai.com/2026/10/10/f95935228eb68ed701f01ca054820a20.png?imageMogr2/auto-orient/thumbnail/!64…` | sspai-com/matrix | 640x400 | 38.2K |
| `https://cdnfile.sspai.com/2026/10/13/121ff18d36193b3bd6a0fd587750ff19.png?imageMogr2/auto-orient/thumbnail/!64…` | sspai-com/matrix | 640x400 | 18.6K |
| `https://cdnfile.sspai.com/2026/10/12/82bc7d63870043e9094c24baf1fd4f5b.jpeg?imageMogr2/auto-orient/thumbnail/!6…` | sspai-com/matrix | 640x400 | 45.4K |
| `https://cdnfile.sspai.com/2026/10/11/bc30a9255ce834da343cfd07fa306206.png?imageMogr2/auto-orient/thumbnail/!64…` | sspai-com/matrix | 640x400 | 7.5K |
| `https://cdnfile.sspai.com/2026/10/03/08d5a0d46e137dca4382e753381d5da6.png?imageMogr2/auto-orient/thumbnail/!64…` | sspai-com/matrix | 640x400 | 9.1K |
| `https://cdnfile.sspai.com/2026/10/06/2f04485696bfdb90744fe37e9d4d980f.jpg?imageMogr2/auto-orient/thumbnail/!64…` | sspai-com/matrix | 640x400 | 37.4K |
| `https://cdnfile.sspai.com/2026/10/04/c9c12c10c23b4246d9d51c55f248afde.jpg?imageMogr2/auto-orient/thumbnail/!64…` | sspai-com/matrix | 640x400 | 10.4K |
| `https://cdnfile.sspai.com/2026/09/28/746ee75438a1e13f3385f29dc0eeb19e.jpg?imageMogr2/auto-orient/thumbnail/!64…` | sspai-com/matrix | 640x400 | 5.6K |
| `https://cdnfile.sspai.com/2026/09/28/4954de97df34cad93a3df1da3281759b.jpg?imageMogr2/auto-orient/thumbnail/!64…` | sspai-com/matrix | 640x400 | 23.8K |
| `https://cdnfile.sspai.com/2026/09/27/f51bac9c18112048e910ea0da33cb90b.jpg?imageMogr2/auto-orient/thumbnail/!64…` | sspai-com/matrix | 640x400 | 49.2K |
| `https://cdnfile.sspai.com/2026/09/27/a7002aaeb3e69f804244d012040ba7c9.png?imageMogr2/auto-orient/thumbnail/!64…` | sspai-com/matrix | 640x400 | 10.2K |
| `https://cdnfile.sspai.com/2026/09/27/b0f185aea4d2ecef0026b46ba18ec47a.jpg?imageMogr2/auto-orient/thumbnail/!64…` | sspai-com/matrix | 640x400 | 13.2K |
| `https://cdnfile.sspai.com/2026/09/26/072f7cde523b2279f5d32497310f63d2.png?imageMogr2/auto-orient/thumbnail/!64…` | sspai-com/matrix | 640x400 | 8.3K |
| `https://cdnfile.sspai.com/2026/09/23/9bb0500f08b7b4839037b5231cfe15b1.png?imageMogr2/auto-orient/thumbnail/!64…` | sspai-com/matrix | 640x400 | 14.3K |
| `https://cdnfile.sspai.com/2026/10/8/article/c09d5d8c-8318-4425-8f28-0529c960fa01.jpg?imageMogr2/auto-orient/th…` | sspai-com/matrix | 536x340 | 13.4K |
| `https://b.stripecdn.com/docs-statics-srv/assets/payments-hero.84c749136bfe3d7c2b8495ef295c6d89.png` | stripe-docs/payments | ? | 471.8K |

Crop fallback: unused (0 crops; no bbox needed).

## Verify (all commands run 2026-10-16, post-edit)

- `node m1/eval/audit-visual.mjs` on the 5 renders: **5/5 clean, broken-img gone** (sspai home keeps its pre-existing `dup-source-true(info)`, info-level, not an image issue).
- Full board: `audit-visual --all` **36/40 clean** (was 32/40); remaining ⚠ (apple airpods-pro img-variance, huawei home img-variance, huawei search fabricated-buttons) are other pages, untouched.
- Strict probe: **0 broken images** on all 5 renders (audit cap would have hidden any residue).
- `node m1/validate.mjs` ×5 models: **VALID**; the mi pages' `W_COMPOSITE_NAME_ONLY_WATERMARK` reproduces on the HEAD copy (`git show HEAD:…`) — pre-existing.
- `node m1/eval/capture-integrity.mjs --only mi-com/search-earbuds,mi-com/search-phone,sspai-com/home,sspai-com/matrix,stripe-docs/payments`: **0 unmatched** (unchanged from baseline). Safety proved up front: `_image.image` is not a scanned fact (`pushFact` drops object role values; existing `../assets/` refs already passed), so repointing cannot affect the gate.
- Render diff (pre-edit snapshot vs post): only `src=` attribute values changed on every page — no other render output moved.

## Files changed (mine)
- Models: m1/curated/{mi-com/search-earbuds,mi-com/search-phone,sspai-com/home,sspai-com/matrix,stripe-docs/payments}.json (image values only; 5/4/5/20/1 refs)
- Renders: m1/curated/renders/{mi-com-search-earbuds,mi-com-search-phone,sspai-com-home,sspai-com-matrix,stripe-docs-payments}.html (regenerated via render.mjs)
- Assets: m1/curated/assets/62-… (31 new files)
- Work record: this file + map-broken-imgs.mjs + probe-broken.mjs

## Notes / risks
- b.stripecdn.com timed out on re-download attempts after the first success; the stripe asset reuses the first successful download of the exact URL payload (PNG 2000×962, verified). The local asset removes the flaky network dependence.
- The shared working tree carries other round-63 workers' uncommitted edits (112 files, incl. superseded `62-recovered-sspai-com-matrix-*` refs in git diff that are NOT in the current model); my edits are pure string replacements, proven by the render diff.
- sspai render now loads 30 images from local disk instead of the network; if cdnfile URLs are wanted as live sources later, that is a separate decision.
