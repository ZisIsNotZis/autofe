# 63 · Round-62 asset regeneration (32 references, 9 models)

Worker: curation-worker (assets). Completed 2026-10-16 18:06 +0800. Budget: ~35 min, 3 screenshot reads (≤4), batched via scripts.

## Task
Regenerate the 32 lost `../assets/62-*.png|.webp` files referenced by 9 curated models
(huawei-cn/consumer-phones, huawei-cn/search-laptop, learn-microsoft/vm-sizes, linear-app/home,
mi-com/search-earbuds, sspai-com/post-102392, sspai-com/post-114699, sspai-com/u-jtc092al,
stripe-docs/payments). Models are the SSOT for the file names; derivation rules recovered from
`.scratch/62-all-sites/integration/proof/content/content/asset-provenance.json` (round-62 provenance:
105 entries; the 32 referenced ones carry original URL, alt, old bbox, old derivation method).

## Method (per task contract: crop from fresh capture, never upscale — F-082)
- **Match** each reference in the FRESH capture (2026-10-16): `nodes.json` img nodes joined to
  `dom.html` srcs with the round-26b scanner (verbatim `scanElementTags`/`absolutizeSrc` semantics),
  whole-page `cleanedIndex` alignment gate passed on all 9 pages.
- Join repairs found necessary (vs round-62 behavior): relative srcs absolutize against the
  **directory-form** base URL (`…/sizes/` + `media/x.png`); lazy images join on `data-src` when `src`
  is a data: placeholder; same-URL product cards disambiguated by the **enclosing card anchor href**
  (consumer-phones: item 10 "HUAWEI Mate 70 Pro 优享版" → card `/cn/phones/mate70-pro-youxiangban`,
  DOM title+price ¥6199 起 verified); URL-less region crops (linear demo divs) matched by exact
  `cleanedPath` (page layout pixel-identical to round-62: fresh y == old y on all 5).
- **Crop**: ffmpeg (ImageMagick absent on this machine; ffmpeg crop is the same lossless region copy)
  `crop=floor(w):floor(h):round(x):round(y)` from `full.png`; `.webp` outputs via libwebp `-lossless 1`.
  Output dims = floored bbox ≤ painted box ≤ source (no upscale; output dims also equal round-62's
  shipped asset dims in all matched cases).
- Scripts (work record): `regen-assets-match.mjs` (matching, evidence → /tmp/asset-matches.json),
  `regen-assets-crop.mjs` (cropping + sha256 + flatness scan → /tmp/asset-crops.json).

## Results: 29 regenerated, 3 not regenerable from the fresh capture

| Asset | Source page | Match | Fresh bbox (x, y, w×h) | Crop box | Verify |
|---|---|---|---|---|---|
| `../assets/62-huawei-cn-consumer-phones-5b5d6ddeacea.png` | `huawei-cn/consumer-phones` | url | (639.97, 2584, 160×160) | (640, 2584, 160×160) | OK — 160×160 ≤ bbox, no upscale; flatness std 87.5,89.0,79.2; spot-check passed (sheet A/B) |
| `../assets/62-huawei-cn-search-laptop-d3f37165db2d.png` | `huawei-cn/search-laptop` | url | (488.94, 743.66, 78.75×100) | (489, 744, 78×100) | OK — 78×100 ≤ bbox, no upscale; flatness std 52.8,36.3,52.4; spot-check passed (sheet A/B) |
| `../assets/62-huawei-cn-search-laptop-d07372fe2736.png` | `huawei-cn/search-laptop` | url | (488.94, 965.19, 78.75×100) | (489, 965, 78×100) | OK — 78×100 ≤ bbox, no upscale; flatness std 78.2,88.4,92.4; pixel-scan only |
| `../assets/62-huawei-cn-search-laptop-25a7edb74e77.png` | `huawei-cn/search-laptop` | url | (488.94, 1186.72, 78.75×100) | (489, 1187, 78×100) | OK — 78×100 ≤ bbox, no upscale; flatness std 56.7,54.7,50.8; pixel-scan only |
| `../assets/62-huawei-cn-search-laptop-483d7c298376.png` | `huawei-cn/search-laptop` | url | (488.94, 1408.25, 78.75×100) | (489, 1408, 78×100) | OK — 78×100 ≤ bbox, no upscale; flatness std 71.7,55.3,58.8; pixel-scan only |
| `../assets/62-huawei-cn-search-laptop-bf445fa113c9.png` | `huawei-cn/search-laptop` | url | (488.94, 1629.78, 78.75×100) | (489, 1630, 78×100) | OK — 78×100 ≤ bbox, no upscale; flatness std 99.8,98.7,95.9; pixel-scan only |
| `../assets/62-huawei-cn-search-laptop-f117a9f99bfc.png` | `huawei-cn/search-laptop` | url | (488.94, 2058.22, 78.75×100) | (489, 2058, 78×100) | OK — 78×100 ≤ bbox, no upscale; flatness std 17.7,22.4,31.5; pixel-scan only |
| `../assets/62-huawei-cn-search-laptop-2cdf522d2b97.png` | `huawei-cn/search-laptop` | url | (488.94, 2279.75, 78.75×100) | (489, 2280, 78×100) | OK — 78×100 ≤ bbox, no upscale; flatness std 88.3,79.9,70.1; pixel-scan only |
| `../assets/62-learn-microsoft-vm-sizes-46d4bcfd2844.png` | `learn-microsoft/vm-sizes` | url | (376, 789.59, 688×430.75) | (376, 790, 688×430) | OK — 688×430 ≤ bbox, no upscale; flatness std 67.2,72.5,84.9; spot-check passed (sheet A/B) |
| `../assets/62-learn-microsoft-vm-sizes-a4669a60fcd7.png` | `learn-microsoft/vm-sizes` | url | (392, 2007.33, 655.97×214.67) | (392, 2007, 655×214) | OK — 655×214 ≤ bbox, no upscale; flatness std 60.3,60.3,60.3; pixel-scan only |
| `../assets/62-linear-demo-0.png` | `linear-app/home` | region-dim | (60, 527, 1320×720) | (60, 527, 1320×720) | OK — 1320×720 ≤ bbox, no upscale; flatness std 21.5,21.7,22.2; spot-check passed (sheet A/B) |
| `../assets/62-linear-demo-1.png` | `linear-app/home` | region-dim | (48, 2925.72, 1344×626) | (48, 2926, 1344×626) | OK — 1344×626 ≤ bbox, no upscale; flatness std 19.1,19.2,21.2; pixel-scan only |
| `../assets/62-linear-demo-2.png` | `linear-app/home` | region-dim | (48, 4129.64, 1344×633) | (48, 4130, 1344×633) | OK — 1344×633 ≤ bbox, no upscale; flatness std 8.0,10.3,10.8; spot-check passed (sheet A/B) |
| `../assets/62-linear-demo-3.png` | `linear-app/home` | region-dim | (48, 5400.56, 1344×632) | (48, 5401, 1344×632) | OK — 1344×632 ≤ bbox, no upscale; flatness std 13.5,13.5,13.6; pixel-scan only |
| `../assets/62-linear-demo-4.png` | `linear-app/home` | region-dim | (48, 6642.48, 1344×592) | (48, 6642, 1344×592) | OK — 1344×592 ≤ bbox, no upscale; flatness std 24.4,21.4,21.2; pixel-scan only |
| `../assets/62-mi-com-search-earbuds-d3fb80bc6cc0.webp` | `mi-com/search-earbuds` | url | — | — | **NOT regenerated** (NOT_CROPPABLE): bbox {"x":-838,"y":2845,"w":140,"h":140} outside captured full.png 1440x3991 (offscreen carousel item; pixels not captured) |
| `../assets/62-mi-com-search-earbuds-46ec0f329cbf.webp` | `mi-com/search-earbuds` | url | — | — | **NOT regenerated** (NOT_CROPPABLE): bbox {"x":-342,"y":2845,"w":140,"h":140} outside captured full.png 1440x3991 (offscreen carousel item; pixels not captured) |
| `../assets/62-mi-com-search-earbuds-877a40ecb953.webp` | `mi-com/search-earbuds` | url | (154, 2845, 140×140) | (154, 2845, 140×140) | OK — 140×140 ≤ bbox, no upscale; flatness std 25.0,24.9,25.9; spot-check passed (sheet A/B) |
| `../assets/62-mi-com-search-earbuds-bf98db6e1e7c.webp` | `mi-com/search-earbuds` | url | (402, 2845, 140×140) | (402, 2845, 140×140) | OK — 140×140 ≤ bbox, no upscale; flatness std 55.9,65.0,82.2; pixel-scan only |
| `../assets/62-mi-com-search-earbuds-356b6df0db98.webp` | `mi-com/search-earbuds` | url | (650, 2845, 140×140) | (650, 2845, 140×140) | OK — 140×140 ≤ bbox, no upscale; flatness std 10.5,10.5,10.5; spot-check passed (sheet A/B) |
| `../assets/62-recovered-sspai-com-post-102392-ca24cb3e108d.png` | `sspai-com/post-102392` | url | (380, 1729.55, 679.98×98.25) | (380, 1730, 679×98) | OK — 679×98 ≤ bbox, no upscale; flatness std 32.8,33.0,32.2; spot-check passed (sheet A/B) |
| `../assets/62-recovered-sspai-com-post-102392-3b701a022274.png` | `sspai-com/post-102392` | url | (380, 1922.39, 679.98×206.61) | (380, 1922, 679×206) | OK — 679×206 ≤ bbox, no upscale; flatness std 96.7,96.3,96.1; pixel-scan only |
| `../assets/62-recovered-sspai-com-post-102392-e18bd7f117f1.png` | `sspai-com/post-102392` | url | (380.02, 2324.39, 679.97×140.02) | (380, 2324, 679×140) | OK — 679×140 ≤ bbox, no upscale; flatness std 31.7,31.4,30.3; pixel-scan only |
| `../assets/62-recovered-sspai-com-post-102392-b706ea74e3d8.png` | `sspai-com/post-102392` | url | (380.03, 2559, 679.94×153.33) | (380, 2559, 679×153) | OK — 679×153 ≤ bbox, no upscale; flatness std 74.2,69.4,65.6; pixel-scan only |
| `../assets/62-recovered-sspai-com-post-114699-60a0194657d1.png` | `sspai-com/post-114699` | url | (413, 3199.97, 614×244) | (413, 3200, 614×244) | OK — 614×244 ≤ bbox, no upscale; flatness std 49.8,48.9,49.6; spot-check passed (sheet A/B) |
| `../assets/62-recovered-sspai-com-post-114699-7a7278dfc412.png` | `sspai-com/post-114699` | url | (380, 3970.13, 679.98×355.33) | (380, 3970, 679×355) | OK — 679×355 ≤ bbox, no upscale; flatness std 47.1,47.7,40.2; pixel-scan only |
| `../assets/62-recovered-sspai-com-post-114699-f1d98ed9df56.png` | `sspai-com/post-114699` | url | (336, 56, 768×330) | (336, 56, 768×330) | OK — 768×330 ≤ bbox, no upscale; flatness std 57.1,47.3,38.9; pixel-scan only |
| `../assets/62-recovered-sspai-com-u-jtc092al-342d9f595639.png` | `sspai-com/u-jtc092al` | url | (426, 88, 100×100) | (426, 88, 100×100) | OK — 100×100 ≤ bbox, no upscale; flatness std 67.5,47.3,20.1; spot-check passed (sheet A/B) |
| `../assets/62-recovered-sspai-com-u-jtc092al-0a82e438340e.png` | `sspai-com/u-jtc092al` | url | (812, 599.5, 80×60) | (812, 600, 80×60) | OK — 80×60 ≤ bbox, no upscale; flatness std 60.0,53.7,43.0; spot-check passed (sheet A/B) |
| `../assets/62-recovered-sspai-com-u-jtc092al-99d1ee415770.png` | `sspai-com/u-jtc092al` | url | (812, 778.5, 80×60) | (812, 779, 80×60) | OK — 80×60 ≤ bbox, no upscale; flatness std 60.0,53.7,43.0; spot-check passed (sheet A/B) |
| `../assets/62-recovered-sspai-com-u-jtc092al-0c54e4954054.png` | `sspai-com/u-jtc092al` | url | (812, 957.5, 80×60) | (812, 958, 80×60) | OK — 80×60 ≤ bbox, no upscale; flatness std 74.7,64.8,49.1; pixel-scan only |
| `../assets/62-stripe-docs-payments-90c09fe726e7.png` | `stripe-docs/payments` | NOT_FOUND | — | — | **NOT regenerated** (NOT_FOUND): no fresh img with src=https://b.stripecdn.com/docs-statics-srv/assets/payments-hero.84c749136bfe3d7c2b8495ef295c6d89.png |

## Not regenerated — for parent adjudication (no substitute invented)
1. **`../assets/62-mi-com-search-earbuds-d3fb80bc6cc0.webp`** — model `recommended._items[1]` (米家智能血压计).
   URL present in fresh DOM, node bbox `(-838, 2845, 140×140)` — **offscreen left of the 1440px carousel**;
   pixels not captured in `full.png`. Round-62 fetched it from the CDN; crop-from-capture cannot.
2. **`../assets/62-mi-com-search-earbuds-46ec0f329cbf.webp`** — model `recommended._items[3]` (小米手环11 标准版).
   Same: bbox `(-342, 2845, 140×140)`, offscreen.
3. **`../assets/62-stripe-docs-payments-90c09fe726e7.png`** — model `/_lines[0]._image` (payments hero).
   URL `https://b.stripecdn.com/docs-statics-srv/assets/payments-hero.84c74….png` still in `dom.html`
   (`<img class="HeroSection-right-image">`), but the node is pruned from `nodes.json` (alt="") and the
   hero slot in `full.png` is **blank white** (visually verified, density scan negative) — image never
   painted at capture (lazy-load miss). No pixels exist in the capture to crop.

Options for the parent: (a) re-capture those pages/sections and re-run this regeneration for the 3,
(b) accept models rendering without them at next integration, (c) authorize CDN retrieval for these 3
as round-62 did. No model JSON or shared file was touched by this worker.

## Verification
- All 29 outputs exist at exactly the referenced paths; dims ≤ bbox (upscale=false everywhere);
  `.webp`×3 decode as webp 140×140, lossless.
- Flatness scan (lazy-placeholder guard): no flat crops; lowest std = linear demo-2 (8.0) and
  mi-com `356b6df0db98` (10.5) — both legitimately light images (dark-UI demo, MI-logo product image
  the fresh page actually paints for REDMI Buds 8 Pro; capture = truth, F-025).
- Visual spot-check (12 crops via 2 contact sheets + stripe area read; each crop paired with its
  capture context at bbox+50px): linear demo-0/2, sspai post-102392 figure, sspai post-114699 LUMIX
  photo, u-jtc092al avatar + 2 near-identical VLOO thumbnails on distinct cards, huawei 优享版 card
  (green Mate art), search-laptop row, learn-microsoft video still, mi-com 眼镜 Pro + Buds 8 Pro —
  all content and edge alignment correct.
- `git status`: only new local files under `m1/curated/assets/62-*` (gitignored by design,
  `.gitignore:16`) + scripts/report in `.scratch/63-recapture-recuration/`. No model JSON or shared
  file edited; no staged files from this worker; nothing committed.

## Notes / limits
- Regenerated crops come from the 2026-10-16 capture, so bytes differ from the lost round-62 files
  (17 of which were CDN-retrieved originals, thumbnailed). This is the intended consequence of
  D-63a (fresh capture = truth); 15 of 32 were screenshot-crops in round-62 and reproduce the same
  boxes (pages static between captures: sspai ×3, linear ×5 boxes byte-identical in coordinates).
- huawei consumer-phones: capture painted the real product art despite `lazy="loading"` attrs
  (std 87.5 confirms content, spot-check confirms).
