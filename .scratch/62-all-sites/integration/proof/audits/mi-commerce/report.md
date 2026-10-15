# Xiaomi commerce baseline audit

**Status: diagnosed, needs fixes; full visual acceptance INCOMPLETE.** All four assigned pages were inspected, no pages are clean. This is initial diagnosis, not acceptance of future repairs.

## Evidence and scope

- Immutable baseline: `403cd5be096db89b428e130ad57cca730b425fdc`.
- Local evidence root: `/home/z/vibe/autofe-worktrees/62-all-sites/audit-mi-commerce/.scratch/62-all-sites/audit-mi-commerce`.
- Source/models/assets/owning Docs/gallery remain unchanged. Ticket: `/home/z/vibe/autofe-worktrees/62-all-sites/audit-mi-commerce/.scratch/62-all-sites/audit-mi-commerce/ticket.md`.
- 16 full-height renders captured at2560/1920/1440/390; actual image inspection at2560/1440/390 plus original1440 source for every page.1920 visual inspection remains incomplete.
- 18 image reads, 2 sequential offline browser jobs. No overflow, broken images or images larger than natural pixels in any of16 page/width pairs.50 declared search images source-attributed,214 existing target URLs source-matched; four model validators passed. These are necessary diagnostics, not visual PASS.

## Per-page coverage

| Page | Render heights2560 /1920 /1440 /390 | Inspected regions and result |
|---|---|---|
| `mi-com/home` | 3901 / 3901 / 3901 / 1363px | identity/slogan + all7 media bands + source footer; render footer/navigation missing. **NEEDS_FIX** |
| `mi-com/search-earbuds` | 3729 / 3729 / 3729 / 12943px | all tools,20 results, page controls,10 recommendations, source header/footer. **NEEDS_FIX** |
| `mi-com/search-phone` | 4322 / 4322 / 4322 / 14808px | search/tools,20 results,10 recommendations, original pagination/header/footer. **NEEDS_FIX** |
| `mi-com/shop-category-list` | 3284 / 3284 / 3284 / 4372px | all10 categories and source header/footer; source grouping compared. **NEEDS_FIX** |

## Findings and ownership

All paths below are relative to the evidence root unless explicitly source/model paths. Severity reflects baseline acceptance impact, not permission to repair outside the lane.

### MI-E1 — HIGH / engine
- **Pages / criterion:** mi-com/search-earbuds, mi-com/search-phone, mi-com/shop-category-list — Coherent whole-page alignment across mixed forms.
- **Location:** main > .node.depth-0 > .title; .depth-1.w-narrow / .w-wide; category first phones section.
- **Render/geometry:** At 2560 H1 box x=960,w=640; search tools x=840,w=880; results x=664,w=1232. Category phones x=840,w=880, other nine categories x=664,w=1232. At 1920 these x values are 640/520/344; at 1440 400/280/104. Mobile all sections x=16. Title text is left-aligned inside its inset box, not centered inside a deliberately different composition.
- **Source comparison:** 1440 originals keep category headings/tiles and search filters/product frame at common x=107; no corresponding first-category-only indentation. Centered desktop outer whitespace is legitimate; local form-driven edge jumps are not.
- **Evidence:** `geometry.json`, `search-earbuds-2560-sheet.png`, `search-phone-2560-sheet.png`, `shop-category-list-2560-sheet.png`, `shop-category-list-source-sheet.png`.
- **Falsifiable improvement:** At desktop widths, title, related search tools/results and peer category headings use one justified page-level frame/edge irrespective of local form. Preserve mobile x=16 and brand variation; no blanket text centering.

### MI-E2 — HIGH / engine
- **Pages / criterion:** mi-com/search-earbuds, mi-com/search-phone — Readable density and compact utilities.
- **Location:** $.conditions._items (earbuds); $.filters.promo/installment/in-stock (phone); generated bool controls / stack blocks.
- **Render/geometry:** Earbuds three small checkboxes consume a 226.78px section with ~81.59px row pitch; first product grid begins y=623.63. Phone filter region is 418.16px tall and results begin y=595.75. Both retain unnecessarily separate boolean rows on 390.
- **Source comparison:** Original 1440 utility toolbar at y≈304 places sort, delivery and three independent checkboxes together; none needs a full section-sized vertical slot.
- **Evidence:** `geometry.json`, `runtime.json`, `search-earbuds-2560-sheet.png`, `search-earbuds-390-sheet.png`, `search-phone-2560-sheet.png`, `source-actions-footer-crops.png`.
- **Falsifiable improvement:** Independent short filters share a compact wrapping utility row, preserve labels/inputs, and avoid section-sized gaps. Recheck result-start position and readable wrapping at 390; do not compress product facts.

### MI-E3 — HIGH / engine
- **Pages / criterion:** mi-com/search-earbuds, mi-com/search-phone, mi-com/shop-category-list — Paired surface/foreground contrast.
- **Location:** a.self-link; .linklist li.go > a; --accent on white cards/surface.
- **Render/geometry:** Computed foreground rgb(255,103,0) (#ff6700) on rgb(255,255,255) gives 2.920:1. Product title links are 17.92px/650, category list links 16px, category linked H1 32px/750. Ratio is below even the 3:1 large-text benchmark, and below 4.5:1 normal text. Visually pale orange dominates several long category lists.
- **Source comparison:** Original uses orange as brand accent and small prices/selected labels, but predominantly neutral product/category names. Preserve orange branding; do not use the accent as every low-contrast text foreground.
- **Evidence:** `contrast.json`, `runtime.json`, `search-phone-2560-sheet.png`, `shop-category-list-390-sheet.png`.
- **Falsifiable improvement:** Use a readable foreground/surface pair for linked names and controls while retaining brand accent distinction and click affordance. Demonstrate measured contrast for actual rendered text sizes and surfaces.

### MI-E4 — MEDIUM / engine
- **Pages / criterion:** mi-com/home — Site identity/hierarchy without arbitrary enlarged prose.
- **Location:** $._primary=_summary; .hero.fact-hero .fact .val; m1/render.mjs:492-498 sentence heuristic.
- **Render/geometry:** Home H1 is 32px/750; full sentence summary is also 32px/700, 608px wide at desktop and two prominent lines on 390. It competes with the identity above the source image stories.
- **Source comparison:** The sentence is real source footer slogan at bottom (source-actions-footer-crops.png), not a source giant leading headline. Home banners/legitimate centered whitespace themselves are not defective.
- **Evidence:** `runtime.json`, `home-2560-sheet.png`, `home-390-sheet.png`, `source-actions-footer-crops.png`.
- **Falsifiable improvement:** Preserve the real sentence but give prose a clearly subordinate readable scale; keep a compact meaningful hierarchy without inventing a banner title or forcing a site-specific exception.

### MI-E5 — MEDIUM / engine
- **Pages / criterion:** mi-com/search-earbuds, mi-com/search-phone — Cohesive image/title/action grouping and preserved source affordance.
- **Location:** results/recommendation card figure images versus title self-links.
- **Render/geometry:** 0/20 earbuds and 0/30 phone rendered images have a containing anchor. Corresponding title links remain correct, so the destination is not entirely lost, but the dominant product visual no longer activates the card destination.
- **Source comparison:** All 50 declared search images have exact source URL/data-src matches whose containing anchors equal the existing model action target. Main 200x200 source product photos are inside buy-page anchors (e.g. phone source image index174 in anchor172; earbuds image178 in anchor176).
- **Evidence:** `runtime.json`, `declared-image-provenance.json`, `provenance.json`, `search-phone-2560-sheet.png`.
- **Falsifiable improvement:** Associate each product visual and title with its existing captured destination, without new URLs, duplicate invented actions, image enlargement or disconnected controls; inspect keyboard/click affordance after repair.

### MI-E6 — HIGH / engine
- **Pages / criterion:** mi-com/shop-category-list — Readable directory density and closed shared-axis decisions.
- **Location:** m1/render.mjs:renderList (private cols heuristic); m1/axis.mjs:nodePlan widthTier/items; category linklists.
- **Render/geometry:** TV, computing, wearables and audio short destination lists remain single-column; computing consumes 738.56px and audio 825.56px at desktop with most of the 1232px frame empty. Other same-role categories use many compact columns. RenderList privately chooses cols only if every label <=12 characters; one longer product name collapses a whole list. Axis width tier is evaluated separately and first phones is inset.
- **Source comparison:** Original has consistently grouped category grids; model members are lightweight name+captured-destination entries, not heterogeneous narratives. Existing owning rule says column decisions must be shared and evaluated before width tier.
- **Evidence:** `geometry.json`, `shop-category-list-2560-sheet.png`, `shop-category-list-1440-sheet.png`, `shop-category-list-source-sheet.png`, `m1/render.mjs:127-137`, `m1/axis.mjs:805-815`.
- **Falsifiable improvement:** Shared semantic axis plan owns directory column/wrapping decisions and its resulting frame. A slightly longer but ordinary product label must wrap readably within a consistent compact directory, not collapse the entire group; no renderer-private/site-specific presentation bypass.

### MI-C1 — HIGH / content
- **Pages / criterion:** mi-com/home, mi-com/search-earbuds, mi-com/search-phone, mi-com/shop-category-list — Faithful facts/targets and complete compact utility/footer regions.
- **Location:** All four curated model roots: no header or footer groups.
- **Render/geometry:** Home consists of identity/slogan plus seven pixel bands; other pages terminate at products/recommendations/categories. There are no rendered site utility navigation or footer regions in any of the four pages. Home has zero actions.
- **Source comparison:** All four full captures include real navigation, contact/service/legal footer facts and targets. Visible exact examples: home 小米商城 node56 -> https://www.mi.com/shop, 申请售后 node546 -> https://www.mi.com/service/aftersale/front, 小米之家 node564 -> https://www.mi.com/service/mihome/list. Corresponding aftersale indices are664/700/823 on earbuds/phone/category. Footer phone numbers950816/950818, opening times and applicability restrictions are captured facts; absence is not a footer-density success.
- **Evidence:** `provenance.json`, `home-source-sheet.png`, `search-earbuds-source-sheet.png`, `search-phone-source-sheet.png`, `shop-category-list-source-sheet.png`, `source-actions-footer-crops.png`.
- **Falsifiable improvement:** Restore source-backed utility/footer groups with exact facts/targets (not a generic site-name template). Engine then renders them compactly using existing grammar; do not reconstruct missing lazy-loaded marketing products or unknown banner click endpoints.

### MI-C2 — HIGH / content
- **Pages / criterion:** mi-com/search-earbuds, mi-com/search-phone, mi-com/shop-category-list — Forms and preserved source actions.
- **Location:** phone $.query has expose/search but no _action; earbuds/category lack source search composite.
- **Render/geometry:** Phone renders only a bare empty search input; submit count0. Earbuds/category render no search input or submit. These are content omissions, not an engine swallowing an already-declared submit.
- **Source comparison:** Captured form#J_searchForm has action //search.mi.com/search, method=get, keyword search input and input[type=submit]. Source cleaned indices112/115/117 on both searches;111/114/116 on category. Screenshot has a visible search icon. Capture DOM placeholder is 耳机 while the screenshot visibly displays 冰箱; it does not establish whether that pixel text is a placeholder or input value. Neither supports inventing a current 手机 default value.
- **Evidence:** `provenance.json`, `runtime.json`, `source-actions-footer-crops.png`, `search-earbuds-source-sheet.png`.
- **Falsifiable improvement:** Model the real captured search affordance and submit target in the closed grammar, render label/submit together, preserve query parameter name, and distinguish captured placeholder/current value from requested page keyword. No guessed live endpoint or fake working JS.

### MI-C3 — HIGH / content
- **Pages / criterion:** mi-com/search-phone — Faithful page controls and targets.
- **Location:** Phone model after $.results: missing pagination group.
- **Render/geometry:** After all20 phone results, rendering goes directly to recommendations with no page numbers/previous-next controls. Earbuds already preserves two page labels as controls.
- **Source comparison:** Phone source y=2589 has selected1 plus2,3 and next/previous arrows. Nodes537/538/539/540 and source crop prove presence. Source anchors use javascript:void(0), with no captured navigable URL.
- **Evidence:** `provenance.json`, `source-actions-footer-crops.png`, `search-phone-2560-sheet.png`.
- **Falsifiable improvement:** Preserve real page labels/current-state and available affordances using existing action grammar; do not manufacture page URLs or promise live pagination not provided by static rendering.

### MI-C4 — HIGH / content
- **Pages / criterion:** mi-com/shop-category-list — Faithful source grouping/meaning.
- **Location:** $.audio._items[24..26] (JSON text lines1052/1062/1072); $.smart-home._items.
- **Render/geometry:** 智能家庭, 小爱音箱, 家庭屏 appear at the end of 耳机 音箱; 智能 路由器 section has only8 entries. Texts/targets exist but categorization is changed.
- **Source comparison:** All three source anchors are under source div[8] 智能 路由器: indices694/714/718, y5226/5387/5548. Original audio ends with Xiaomi Sound 2 Max before 健康 儿童. Native-readable source grouping crop shows the three entries in smart-home grid.
- **Evidence:** `provenance.json`, `category-source-grouping-crops.png`, `shop-category-list-2560-sheet.png`, `shop-category-list-390-sheet.png`.
- **Falsifiable improvement:** Move those three existing complete entries to their source smart-home group and preserve source order/targets. Do not duplicate them or infer a new taxonomy.

### MI-C5 — MEDIUM / content
- **Pages / criterion:** mi-com/search-earbuds — Source image attribution and cohesive recommendation cards.
- **Location:** $.recommended._items[0..9]: no _image.
- **Render/geometry:** All10 recommendation cards are text/price/rating/cart boxes, whereas the corresponding phone recommendations retain photos. Earbuds model has only20 result images.
- **Source comparison:** Source recommendation image rows514/524/.../604 are140x140; each alt (trimmed) uniquely equals a recommendation name, and containing href equals its existing model action. Their data-src records real180x180 thumbnail URLs. Full screenshot contains lazy-load placeholders, so it cannot prove these photos painted at capture time; source metadata does prove their exact attribution, within owning image threshold.
- **Evidence:** `earbuds-missing-recommendation-images.json`, `provenance.json`, `search-earbuds-2560-sheet.png`, `search-earbuds-source-sheet.png`.
- **Falsifiable improvement:** Use only exact source-attributed existing captured assets where available; preserve recommendations as cohesive image/title/facts/actions. Do not invent replacement imagery or fetch externally under this audit. Disclose any unavailable asset/capture instead of silently claiming full image fidelity.

## Preserved legitimate design / limits

- Initial immutable-baseline diagnosis only. No repair or final combined-revision independent acceptance was performed; every page has material findings and broader delivery remains INCOMPLETE.
- 1920 images captured but not visually read. Geometry/style probes cover all four widths; 2560/1440/390 and1440 original source images were actually inspected. Exact 1920 readable whole-height experience review remains required.
- 18 image reads used (16 full-height sheets +2 native-readable source crops);2 sequential local browser jobs. No new network capture/live target activation, keyboard screen-reader audit, or external execution.
- Full-height sheets preserve every vertical pixel range but tool display rescales large sheets. Native-readable crops strengthen footer/search/grouping evidence; exhaustive small-print legal text proof remains unverified.
- 50 declared search images have direct exact source URL/data-src + containing-target attribution;214 declared target URLs have exact visible source href matches. This does not prove exhaustive source-to-model text/fact/control coverage; known omissions are recorded.
- Original home y≈4400–6360 has a documented lazy-loading blank capture area. Banner copy exists only as pixels, not DOM-backed textual facts; do not transcribe or invent unknown banner targets. Tiny mobile pixel copy is a source/capture limitation, not permission to enlarge images.
- Category70x70 thumbnail images are below the owning100x60 main-content-image threshold; their omission is not raised as a mandatory image-restoration defect. Later category/recommendation source placeholders must not be treated as lost painted photos.
- Existing imgattr CLI skips already-populated targets (best-not-targetable) and can match repeated main/recommendation business keys. Its diagnostic output is preserved but is not complete attribution proof. Direct declared-image checks and exact recommendation alt/size/containing-target evidence are provided separately.
- Strict normalized desktop pixel-equality checks were false; those results are retained and not used to infer visual equivalence or PASS.
- No source/model/asset/owning-Doc changes, dependency changes, staging, commits or source discard. Applicable parent policy was supplied; no additional AGENTS.md/CLAUDE.md found in target/ancestor-to-worktree paths.

## Handoff schema

The required handoff payload is embedded here because the runtime override makes this Markdown path the authoritative findings destination. No alternate findings file supersedes it.

```json
{
  "pages": [
    "mi-com/home",
    "mi-com/search-earbuds",
    "mi-com/search-phone",
    "mi-com/shop-category-list"
  ],
  "coveredHashes": {
    "baselineCommit": "403cd5be096db89b428e130ad57cca730b425fdc",
    "manifest": "/home/z/vibe/autofe-worktrees/62-all-sites/audit-mi-commerce/.scratch/62-all-sites/audit-mi-commerce/hashes.json",
    "manifestSha256": "86c95c641ddc485a8b3b7df4a4cc77c03415eabdc01972b68dfa73f0db32a7de",
    "modelAndHtml": {
      "m1/curated/mi-com/home.json": "28496a85d79000301a392f3107b0f2f613c1c209a03474ecc21f00ee5f2f1930",
      "m1/curated/renders/mi-com-home.html": "dd1a3275d07219b322387af350b5d0eff642ea8ab61b04aacfe3b040f3deaa29",
      "m1/curated/mi-com/search-earbuds.json": "9b315263f4c447e4e7c7b005c486579e9204f54e987c0a33658d6aa8728ed81e",
      "m1/curated/renders/mi-com-search-earbuds.html": "6474c30b2162938c2555c90de579ae078c55957e26163b5e205359813a2eacf1",
      "m1/curated/mi-com/search-phone.json": "b2ca85c2466f4ec12a86671bdab17982f8040bd7d25c52b95d448cf52ff5e6f1",
      "m1/curated/renders/mi-com-search-phone.html": "0cfdab6131e9947472922c18568c4bf9178243d476b0978eebbb42ac935e87d1",
      "m1/curated/mi-com/shop-category-list.json": "8c21524ebcba9d20b25b9e5d977fa02e62418574d940700f964dd95c341368ba",
      "m1/curated/renders/mi-com-shop-category-list.html": "2b2cb169748c68c3b611cce8c70079464c7a53401b809a48d00d291d538cf735"
    }
  },
  "coverage": [
    {
      "page": "mi-com/home",
      "baselineVerdict": "NEEDS_FIX",
      "visual2560": "whole-height sheet inspected; main content crop includes all regions to page end",
      "visual1440": "whole-height rendered sheet inspected and full original source sheet compared",
      "visual390": "whole-height sheet inspected (every vertical range); readable text/product density checked",
      "visual1920": "INCOMPLETE: screenshot captured, geometry/style probes only; image not read",
      "geometryWidths": [
        2560,
        1920,
        1440,
        390
      ],
      "heights": {
        "2560": 3901,
        "1920": 3901,
        "1440": 3901,
        "390": 1363
      },
      "overflow": "0 at all widths",
      "brokenImages": 0,
      "enlargedBeyondNaturalImages": 0,
      "tables": "none in model/render; not applicable",
      "footer": "source compared; missing render/model is MI-C1, not clean footer coverage",
      "findings": [
        "MI-E4",
        "MI-C1"
      ]
    },
    {
      "page": "mi-com/search-earbuds",
      "baselineVerdict": "NEEDS_FIX",
      "visual2560": "whole-height sheet inspected; main content crop includes all regions to page end",
      "visual1440": "whole-height rendered sheet inspected and full original source sheet compared",
      "visual390": "whole-height sheet inspected (every vertical range); readable text/product density checked",
      "visual1920": "INCOMPLETE: screenshot captured, geometry/style probes only; image not read",
      "geometryWidths": [
        2560,
        1920,
        1440,
        390
      ],
      "heights": {
        "2560": 3729,
        "1920": 3729,
        "1440": 3729,
        "390": 12943
      },
      "overflow": "0 at all widths",
      "brokenImages": 0,
      "enlargedBeyondNaturalImages": 0,
      "tables": "none in model/render; not applicable",
      "footer": "source compared; missing render/model is MI-C1, not clean footer coverage",
      "findings": [
        "MI-E1",
        "MI-E2",
        "MI-E3",
        "MI-E5",
        "MI-C1",
        "MI-C2",
        "MI-C5"
      ]
    },
    {
      "page": "mi-com/search-phone",
      "baselineVerdict": "NEEDS_FIX",
      "visual2560": "whole-height sheet inspected; main content crop includes all regions to page end",
      "visual1440": "whole-height rendered sheet inspected and full original source sheet compared",
      "visual390": "whole-height sheet inspected (every vertical range); readable text/product density checked",
      "visual1920": "INCOMPLETE: screenshot captured, geometry/style probes only; image not read",
      "geometryWidths": [
        2560,
        1920,
        1440,
        390
      ],
      "heights": {
        "2560": 4322,
        "1920": 4322,
        "1440": 4322,
        "390": 14808
      },
      "overflow": "0 at all widths",
      "brokenImages": 0,
      "enlargedBeyondNaturalImages": 0,
      "tables": "none in model/render; not applicable",
      "footer": "source compared; missing render/model is MI-C1, not clean footer coverage",
      "findings": [
        "MI-E1",
        "MI-E2",
        "MI-E3",
        "MI-E5",
        "MI-C1",
        "MI-C2",
        "MI-C3"
      ]
    },
    {
      "page": "mi-com/shop-category-list",
      "baselineVerdict": "NEEDS_FIX",
      "visual2560": "whole-height sheet inspected; main content crop includes all regions to page end",
      "visual1440": "whole-height rendered sheet inspected and full original source sheet compared",
      "visual390": "whole-height sheet inspected (every vertical range); readable text/product density checked",
      "visual1920": "INCOMPLETE: screenshot captured, geometry/style probes only; image not read",
      "geometryWidths": [
        2560,
        1920,
        1440,
        390
      ],
      "heights": {
        "2560": 3284,
        "1920": 3284,
        "1440": 3284,
        "390": 4372
      },
      "overflow": "0 at all widths",
      "brokenImages": 0,
      "enlargedBeyondNaturalImages": 0,
      "tables": "none in model/render; not applicable",
      "footer": "source compared; missing render/model is MI-C1, not clean footer coverage",
      "findings": [
        "MI-E1",
        "MI-E3",
        "MI-E6",
        "MI-C1",
        "MI-C2",
        "MI-C4"
      ]
    }
  ],
  "findings": [
    {
      "id": "MI-E1",
      "owner": "engine",
      "severity": "high",
      "pages": [
        "search-earbuds",
        "search-phone",
        "shop-category-list"
      ],
      "criterion": "Coherent whole-page alignment across mixed forms",
      "location": "main > .node.depth-0 > .title; .depth-1.w-narrow / .w-wide; category first phones section",
      "render": "At 2560 H1 box x=960,w=640; search tools x=840,w=880; results x=664,w=1232. Category phones x=840,w=880, other nine categories x=664,w=1232. At 1920 these x values are 640/520/344; at 1440 400/280/104. Mobile all sections x=16. Title text is left-aligned inside its inset box, not centered inside a deliberately different composition.",
      "source": "1440 originals keep category headings/tiles and search filters/product frame at common x=107; no corresponding first-category-only indentation. Centered desktop outer whitespace is legitimate; local form-driven edge jumps are not.",
      "evidence": [
        "geometry.json",
        "search-earbuds-2560-sheet.png",
        "search-phone-2560-sheet.png",
        "shop-category-list-2560-sheet.png",
        "shop-category-list-source-sheet.png"
      ],
      "fixCriterion": "At desktop widths, title, related search tools/results and peer category headings use one justified page-level frame/edge irrespective of local form. Preserve mobile x=16 and brand variation; no blanket text centering."
    },
    {
      "id": "MI-E2",
      "owner": "engine",
      "severity": "high",
      "pages": [
        "search-earbuds",
        "search-phone"
      ],
      "criterion": "Readable density and compact utilities",
      "location": "$.conditions._items (earbuds); $.filters.promo/installment/in-stock (phone); generated bool controls / stack blocks",
      "render": "Earbuds three small checkboxes consume a 226.78px section with ~81.59px row pitch; first product grid begins y=623.63. Phone filter region is 418.16px tall and results begin y=595.75. Both retain unnecessarily separate boolean rows on 390.",
      "source": "Original 1440 utility toolbar at y≈304 places sort, delivery and three independent checkboxes together; none needs a full section-sized vertical slot.",
      "evidence": [
        "geometry.json",
        "runtime.json",
        "search-earbuds-2560-sheet.png",
        "search-earbuds-390-sheet.png",
        "search-phone-2560-sheet.png",
        "source-actions-footer-crops.png"
      ],
      "fixCriterion": "Independent short filters share a compact wrapping utility row, preserve labels/inputs, and avoid section-sized gaps. Recheck result-start position and readable wrapping at 390; do not compress product facts."
    },
    {
      "id": "MI-E3",
      "owner": "engine",
      "severity": "high",
      "pages": [
        "search-earbuds",
        "search-phone",
        "shop-category-list"
      ],
      "criterion": "Paired surface/foreground contrast",
      "location": "a.self-link; .linklist li.go > a; --accent on white cards/surface",
      "render": "Computed foreground rgb(255,103,0) (#ff6700) on rgb(255,255,255) gives 2.920:1. Product title links are 17.92px/650, category list links 16px, category linked H1 32px/750. Ratio is below even the 3:1 large-text benchmark, and below 4.5:1 normal text. Visually pale orange dominates several long category lists.",
      "source": "Original uses orange as brand accent and small prices/selected labels, but predominantly neutral product/category names. Preserve orange branding; do not use the accent as every low-contrast text foreground.",
      "evidence": [
        "contrast.json",
        "runtime.json",
        "search-phone-2560-sheet.png",
        "shop-category-list-390-sheet.png"
      ],
      "fixCriterion": "Use a readable foreground/surface pair for linked names and controls while retaining brand accent distinction and click affordance. Demonstrate measured contrast for actual rendered text sizes and surfaces."
    },
    {
      "id": "MI-E4",
      "owner": "engine",
      "severity": "medium",
      "pages": [
        "home"
      ],
      "criterion": "Site identity/hierarchy without arbitrary enlarged prose",
      "location": "$._primary=_summary; .hero.fact-hero .fact .val; m1/render.mjs:492-498 sentence heuristic",
      "render": "Home H1 is 32px/750; full sentence summary is also 32px/700, 608px wide at desktop and two prominent lines on 390. It competes with the identity above the source image stories.",
      "source": "The sentence is real source footer slogan at bottom (source-actions-footer-crops.png), not a source giant leading headline. Home banners/legitimate centered whitespace themselves are not defective.",
      "evidence": [
        "runtime.json",
        "home-2560-sheet.png",
        "home-390-sheet.png",
        "source-actions-footer-crops.png"
      ],
      "fixCriterion": "Preserve the real sentence but give prose a clearly subordinate readable scale; keep a compact meaningful hierarchy without inventing a banner title or forcing a site-specific exception."
    },
    {
      "id": "MI-E5",
      "owner": "engine",
      "severity": "medium",
      "pages": [
        "search-earbuds",
        "search-phone"
      ],
      "criterion": "Cohesive image/title/action grouping and preserved source affordance",
      "location": "results/recommendation card figure images versus title self-links",
      "render": "0/20 earbuds and 0/30 phone rendered images have a containing anchor. Corresponding title links remain correct, so the destination is not entirely lost, but the dominant product visual no longer activates the card destination.",
      "source": "All 50 declared search images have exact source URL/data-src matches whose containing anchors equal the existing model action target. Main 200x200 source product photos are inside buy-page anchors (e.g. phone source image index174 in anchor172; earbuds image178 in anchor176).",
      "evidence": [
        "runtime.json",
        "declared-image-provenance.json",
        "provenance.json",
        "search-phone-2560-sheet.png"
      ],
      "fixCriterion": "Associate each product visual and title with its existing captured destination, without new URLs, duplicate invented actions, image enlargement or disconnected controls; inspect keyboard/click affordance after repair."
    },
    {
      "id": "MI-E6",
      "owner": "engine",
      "severity": "high",
      "pages": [
        "shop-category-list"
      ],
      "criterion": "Readable directory density and closed shared-axis decisions",
      "location": "m1/render.mjs:renderList (private cols heuristic); m1/axis.mjs:nodePlan widthTier/items; category linklists",
      "render": "TV, computing, wearables and audio short destination lists remain single-column; computing consumes 738.56px and audio 825.56px at desktop with most of the 1232px frame empty. Other same-role categories use many compact columns. RenderList privately chooses cols only if every label <=12 characters; one longer product name collapses a whole list. Axis width tier is evaluated separately and first phones is inset.",
      "source": "Original has consistently grouped category grids; model members are lightweight name+captured-destination entries, not heterogeneous narratives. Existing owning rule says column decisions must be shared and evaluated before width tier.",
      "evidence": [
        "geometry.json",
        "shop-category-list-2560-sheet.png",
        "shop-category-list-1440-sheet.png",
        "shop-category-list-source-sheet.png",
        "m1/render.mjs:127-137",
        "m1/axis.mjs:805-815"
      ],
      "fixCriterion": "Shared semantic axis plan owns directory column/wrapping decisions and its resulting frame. A slightly longer but ordinary product label must wrap readably within a consistent compact directory, not collapse the entire group; no renderer-private/site-specific presentation bypass."
    },
    {
      "id": "MI-C1",
      "owner": "content",
      "severity": "high",
      "pages": [
        "home",
        "search-earbuds",
        "search-phone",
        "shop-category-list"
      ],
      "criterion": "Faithful facts/targets and complete compact utility/footer regions",
      "location": "All four curated model roots: no header or footer groups",
      "render": "Home consists of identity/slogan plus seven pixel bands; other pages terminate at products/recommendations/categories. There are no rendered site utility navigation or footer regions in any of the four pages. Home has zero actions.",
      "source": "All four full captures include real navigation, contact/service/legal footer facts and targets. Visible exact examples: home 小米商城 node56 -> https://www.mi.com/shop, 申请售后 node546 -> https://www.mi.com/service/aftersale/front, 小米之家 node564 -> https://www.mi.com/service/mihome/list. Corresponding aftersale indices are664/700/823 on earbuds/phone/category. Footer phone numbers950816/950818, opening times and applicability restrictions are captured facts; absence is not a footer-density success.",
      "evidence": [
        "provenance.json",
        "home-source-sheet.png",
        "search-earbuds-source-sheet.png",
        "search-phone-source-sheet.png",
        "shop-category-list-source-sheet.png",
        "source-actions-footer-crops.png"
      ],
      "fixCriterion": "Restore source-backed utility/footer groups with exact facts/targets (not a generic site-name template). Engine then renders them compactly using existing grammar; do not reconstruct missing lazy-loaded marketing products or unknown banner click endpoints."
    },
    {
      "id": "MI-C2",
      "owner": "content",
      "severity": "high",
      "pages": [
        "search-earbuds",
        "search-phone",
        "shop-category-list"
      ],
      "criterion": "Forms and preserved source actions",
      "location": "phone $.query has expose/search but no _action; earbuds/category lack source search composite",
      "render": "Phone renders only a bare empty search input; submit count0. Earbuds/category render no search input or submit. These are content omissions, not an engine swallowing an already-declared submit.",
      "source": "Captured form#J_searchForm has action //search.mi.com/search, method=get, keyword search input and input[type=submit]. Source cleaned indices112/115/117 on both searches;111/114/116 on category. Screenshot has a visible search icon. Capture DOM placeholder is 耳机 while the screenshot visibly displays 冰箱; it does not establish whether that pixel text is a placeholder or input value. Neither supports inventing a current 手机 default value.",
      "evidence": [
        "provenance.json",
        "runtime.json",
        "source-actions-footer-crops.png",
        "search-earbuds-source-sheet.png"
      ],
      "fixCriterion": "Model the real captured search affordance and submit target in the closed grammar, render label/submit together, preserve query parameter name, and distinguish captured placeholder/current value from requested page keyword. No guessed live endpoint or fake working JS."
    },
    {
      "id": "MI-C3",
      "owner": "content",
      "severity": "high",
      "pages": [
        "search-phone"
      ],
      "criterion": "Faithful page controls and targets",
      "location": "Phone model after $.results: missing pagination group",
      "render": "After all20 phone results, rendering goes directly to recommendations with no page numbers/previous-next controls. Earbuds already preserves two page labels as controls.",
      "source": "Phone source y=2589 has selected1 plus2,3 and next/previous arrows. Nodes537/538/539/540 and source crop prove presence. Source anchors use javascript:void(0), with no captured navigable URL.",
      "evidence": [
        "provenance.json",
        "source-actions-footer-crops.png",
        "search-phone-2560-sheet.png"
      ],
      "fixCriterion": "Preserve real page labels/current-state and available affordances using existing action grammar; do not manufacture page URLs or promise live pagination not provided by static rendering."
    },
    {
      "id": "MI-C4",
      "owner": "content",
      "severity": "high",
      "pages": [
        "shop-category-list"
      ],
      "criterion": "Faithful source grouping/meaning",
      "location": "$.audio._items[24..26] (JSON text lines1052/1062/1072); $.smart-home._items",
      "render": "智能家庭, 小爱音箱, 家庭屏 appear at the end of 耳机 音箱; 智能 路由器 section has only8 entries. Texts/targets exist but categorization is changed.",
      "source": "All three source anchors are under source div[8] 智能 路由器: indices694/714/718, y5226/5387/5548. Original audio ends with Xiaomi Sound 2 Max before 健康 儿童. Native-readable source grouping crop shows the three entries in smart-home grid.",
      "evidence": [
        "provenance.json",
        "category-source-grouping-crops.png",
        "shop-category-list-2560-sheet.png",
        "shop-category-list-390-sheet.png"
      ],
      "fixCriterion": "Move those three existing complete entries to their source smart-home group and preserve source order/targets. Do not duplicate them or infer a new taxonomy."
    },
    {
      "id": "MI-C5",
      "owner": "content",
      "severity": "medium",
      "pages": [
        "search-earbuds"
      ],
      "criterion": "Source image attribution and cohesive recommendation cards",
      "location": "$.recommended._items[0..9]: no _image",
      "render": "All10 recommendation cards are text/price/rating/cart boxes, whereas the corresponding phone recommendations retain photos. Earbuds model has only20 result images.",
      "source": "Source recommendation image rows514/524/.../604 are140x140; each alt (trimmed) uniquely equals a recommendation name, and containing href equals its existing model action. Their data-src records real180x180 thumbnail URLs. Full screenshot contains lazy-load placeholders, so it cannot prove these photos painted at capture time; source metadata does prove their exact attribution, within owning image threshold.",
      "evidence": [
        "earbuds-missing-recommendation-images.json",
        "provenance.json",
        "search-earbuds-2560-sheet.png",
        "search-earbuds-source-sheet.png"
      ],
      "fixCriterion": "Use only exact source-attributed existing captured assets where available; preserve recommendations as cohesive image/title/facts/actions. Do not invent replacement imagery or fetch externally under this audit. Disclose any unavailable asset/capture instead of silently claiming full image fidelity."
    }
  ],
  "engineFindings": [
    "MI-E1",
    "MI-E2",
    "MI-E3",
    "MI-E4",
    "MI-E5",
    "MI-E6"
  ],
  "contentFindings": [
    "MI-C1",
    "MI-C2",
    "MI-C3",
    "MI-C4",
    "MI-C5"
  ],
  "status": "DIAGNOSED_NEEDS_FIX; FULL_ACCEPTANCE_INCOMPLETE",
  "report": "/home/z/.pi/agent/sessions/--home-z-vibe-autofe--/subagent-artifacts/outputs/cb0e12c1-b85a-4cb1-a055-55bf9c1b0c52/audit-mi-commerce.md",
  "limits": [
    "Initial immutable-baseline diagnosis only. No repair or final combined-revision independent acceptance was performed; every page has material findings and broader delivery remains INCOMPLETE.",
    "1920 images captured but not visually read. Geometry/style probes cover all four widths; 2560/1440/390 and1440 original source images were actually inspected. Exact 1920 readable whole-height experience review remains required.",
    "18 image reads used (16 full-height sheets +2 native-readable source crops);2 sequential local browser jobs. No new network capture/live target activation, keyboard screen-reader audit, or external execution.",
    "Full-height sheets preserve every vertical pixel range but tool display rescales large sheets. Native-readable crops strengthen footer/search/grouping evidence; exhaustive small-print legal text proof remains unverified.",
    "50 declared search images have direct exact source URL/data-src + containing-target attribution;214 declared target URLs have exact visible source href matches. This does not prove exhaustive source-to-model text/fact/control coverage; known omissions are recorded.",
    "Original home y≈4400–6360 has a documented lazy-loading blank capture area. Banner copy exists only as pixels, not DOM-backed textual facts; do not transcribe or invent unknown banner targets. Tiny mobile pixel copy is a source/capture limitation, not permission to enlarge images.",
    "Category70x70 thumbnail images are below the owning100x60 main-content-image threshold; their omission is not raised as a mandatory image-restoration defect. Later category/recommendation source placeholders must not be treated as lost painted photos.",
    "Existing imgattr CLI skips already-populated targets (best-not-targetable) and can match repeated main/recommendation business keys. Its diagnostic output is preserved but is not complete attribution proof. Direct declared-image checks and exact recommendation alt/size/containing-target evidence are provided separately.",
    "Strict normalized desktop pixel-equality checks were false; those results are retained and not used to infer visual equivalence or PASS.",
    "No source/model/asset/owning-Doc changes, dependency changes, staging, commits or source discard. Applicable parent policy was supplied; no additional AGENTS.md/CLAUDE.md found in target/ancestor-to-worktree paths."
  ]
}
```

## Acceptance evidence

- **Changed files:** only lane-local evidence scripts/data/screenshots and appended lane Ticket, plus this runtime report. Tracked project/source diff is empty; preexisting untracked corpus/active-work/packet records preserved.
- **Tests added:** no project tests. Diagnostic capture/provenance/runtime scripts reside exclusively in lane evidence.
- **Commands:** capture.mjs and runtime-check.mjs passed; sheets.py passed; provenance.mjs passed; four validate.mjs calls passed; two existing imgattr CLI commands exited0 with partial/skip results (not full attribution PASS); direct50-image and214-target checks passed; normalized desktop pixel-equality check failed; git diff --check passed; git diff --cached --name-only empty.
- **Nonblocking diagnostic setup mistakes retained:** optional bs4 inspection unavailable (no installation); imgattr --help returns64 usage; first exact recommendation-alt check failed on trailing source whitespace then trimmed-alt/size/target check uniquely matched10/10.
- **No staged files:** verified empty index diff. Final independent technical/experience reviewer gate remains pending and cannot be satisfied by this worker.

**Recommended routing:** engine owns MI-E1..E6; content owns MI-C1..C5. Repairs require source-backed models/shared grammar, then final-revision fresh whole-height review, including readable1920 coverage and seven accepted-reference regressions.
