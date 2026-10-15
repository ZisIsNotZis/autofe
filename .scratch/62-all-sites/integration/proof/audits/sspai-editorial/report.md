# 少数派 editorial baseline audit

**Verdict: INCOMPLETE for visual delivery acceptance; confirmed defects on all five pages.** This is scoped baseline diagnosis, not acceptance of later fixes. Source/model/assets/owning Docs and generated gallery were read-only. No clean-page/PASS claim.

## Evidence and coverage

- Baseline: `403cd5be096db89b428e130ad57cca730b425fdc`.
- Machine handoff: `/home/z/vibe/autofe-worktrees/62-all-sites/audit-sspai-editorial/.scratch/62-all-sites/audit-handoff.json`.
- Ticket, screenshots, exact SHA-256 manifest, measurements and source inventories: `/home/z/vibe/autofe-worktrees/62-all-sites/audit-sspai-editorial/.scratch/62-all-sites/audit-sspai-editorial`.
- Existing local Playwright/headless-shell: three sequential one-browser/one-page jobs; eighteen image reads. No installation/setup rerun.
- All20 page-width geometries: no document overflow, broken images or image width greater than intrinsic width. These narrow successes do not establish whole-page acceptance.
- Validators: five curated models return `ok`; exposure navigation loss, source omissions and contrast failures survive this gate.

| Page |2560 whole height|1440 rendered/source|1920|390|
|---|---|---|---|---|
|`sspai-com/home`|Inspected|Whole-height comparison + targeted readable evidence|Geometry only; visual incomplete|Geometry + top/bottom; middle incomplete|
|`sspai-com/matrix`|Inspected|Whole-height comparison + targeted readable evidence|Geometry only; visual incomplete|Geometry + top/bottom; middle incomplete|
|`sspai-com/post-102392`|Inspected|Whole-height comparison + targeted readable evidence|Geometry only; visual incomplete|Geometry + top/bottom; middle incomplete|
|`sspai-com/post-114699`|Inspected|Whole-height comparison + targeted readable evidence|Geometry only; visual incomplete|Geometry + top/bottom; middle incomplete|
|`sspai-com/u-jtc092al`|Inspected|Whole-height comparison + targeted readable evidence|Geometry only; visual incomplete|Geometry + top/bottom; middle incomplete|

All2560 content regions were inspected; post102392 full viewport was additionally read because its cover extends beyond the main crop. All1440/source sheets preserve100% of image height. Long source pages require downscaled overviews plus readable targeted crops; exhaustive source fine-text review is not claimed.

## Engine findings

### E1 — high: Coherent whole-page/shared-axis alignment and image/title/actions grouping
- **Pages / location:** `sspai-com/home`, `sspai-com/matrix`, `sspai-com/post-102392`, `sspai-com/post-114699`, `sspai-com/u-jtc092al`; `main > article > h1.title; .depth-1.w-wide/.w-narrow; .meta; figure.strip`.
- **Rendered defect:** Root title takes a separate narrower axis on every page. Home/Matrix/news alternate wide collections with inset utility/readable sections. Article102392 separates title, cover, byline and body; user title sits120px right of profile/content edge.
- **Source / geometry:** Source portal deliberately has multiple columns; those are legitimate. Source article102392 title, cover and body all share x380/w680. The defect is introduced uncoordinated sibling-frame shifts, not centered whitespace or full-bleed itself. At2560 root h1 x960/w640 on all five. Home banner/editors/feed x664/w1232 vs promo/campaigns/tabs/friends depth-1 x840/w880. Matrix feed x664/w1232 vs filters/yipai/sidebar-derived sections x840/w880. News title x960, author x664, meta x840, news x664. Article102392 img x593/w1374, title x960/w640, byline x664/w1232, body x840/w880. User title x960 vs profile x840/w880. Same desktop shifts at1920/1440;390 collapses main sections to x16/w358.
- **Falsifiable repair criterion:** Shared decisions must establish an intentional page frame with heading/byline/controls on the corresponding content edge, and intentional consistent reading/cover grouping for articles. Preserve justified source columns and brand variation; do not fix by blanket centering or site-name CSS.
- **Evidence:** `measurements.json`, `focus.json`, `home-2560-main-full.png`, `matrix-2560-main-full.png`, `post-102392-2560.png`, `post-114699-2560-main-full.png`, `u-jtc092al-2560-main-full.png`, `home-axis-utilities.png`.

### E2 — high: Readable density; shared semantic axes/closed grammar
- **Pages / location:** `sspai-com/post-114699`; `news._items; .g-news .cards > .item; briefs._items`.
- **Rendered defect:** Seven article-body news sections become four-column cards with long paragraphs wrapping into narrow strips. They read as a dashboard rather than sequential editorial sections. Source paragraphs are also missing (separate C2).
- **Source / geometry:** Source news h2/body x380/w680, stacked in article order; readable first-two-section and Panasonic/Bose crops show this is long-form editorial prose, not compact comparable values. 2560/1920/1440 news title/prose lane inside each card is271.5px, grid1232px. First-row card heights roughly390–454px; section883px.390 stacks at332px internal width (body visual middle not fully inspected).
- **Falsifiable repair criterion:** Use existing semantic comparability/compactness rules to keep long editorial sections in reading order at a coherent reading width, not cramped four-way comparison; preserve all titles/actions/images. No model presentation escape hatch or site-specific rule.
- **Evidence:** `post-114699-source-flow.png`, `post-114699-source-product-images.png`, `measurements.json`, `focus.json`.

### E3 — medium: Readable density and compact utilities
- **Pages / location:** `sspai-com/u-jtc092al`; `_lines[2]._lines; .depth-1 statistics section`.
- **Rendered defect:** Five tiny statistical facts consume564px of vertical page height, pushing activity down to y979 on desktop. Large independent section gaps make a short profile panel look unfinished.
- **Source / geometry:** Original profile statistics occupy a compact120px-high panel (nodes bbox x406/y306/w628/h120); source ordered heterogeneous facts are not authority to relabel _lines as a comparable grid. Stats depth-1 h564 desktop and390; title/body insets are E1. Source panel120px. Value/title pairs are commonly separated into ~94px blocks in baseline.
- **Falsifiable repair criterion:** Keep ordered non-comparable facts sequential under the existing grammar, but give short title/value utility facts compact spacing and coherent grouping; avoid promoting them to large content chapters.
- **Evidence:** `u-jtc092al-source-profile.png`, `u-jtc092al-2560-main-full.png`, `measurements.json`, `focus.json`.

### E4 — medium: Compact utility density and image/title/action cohesion
- **Pages / location:** `sspai-com/home`; `banner._items; editors._items; .g-banner/.g-editors`.
- **Rendered defect:** Two five-item utility/image collections each use four cards plus an isolated second-row card. These two groups alone take1495px before narrower utilities; content feed begins y2033 on desktop. The extra trailing-row whitespace materially overgrows the portal utilities, beyond merely legitimate outer centered whitespace.
- **Source / geometry:** Source presents the banner as a horizontal carousel (all five source img boxes continue x481,959,1437,1915,2393) with one active478px square and adjacent editorial/promotional lanes. It does not display two full stacked 4+1 utility grids above the feed. At all desktop probes banner827.8px and editors667.5px tall; feed y2032.6.390 has full stacked collections, banner2337px and editors1739px; middle mobile rendering is not visually accepted.
- **Falsifiable repair criterion:** Reduce overgrown short utility/image grouping height while keeping every source item/action recoverable and image at or below natural dimensions. Balance compactness using general shared decisions; do not arbitrarily enlarge pictures or force a universal carousel/centering design.
- **Evidence:** `home-2560-main-full.png`, `home-1440-source-full.png`, `home-axis-utilities.png`, `measurements.json`.

### E5 — high: Paired surface/foreground contrast
- **Pages / location:** `sspai-com/home`, `sspai-com/matrix`, `sspai-com/post-102392`, `sspai-com/post-114699`; `a.self-link.nav and .linklist links on white`.
- **Rendered defect:** Small link/title text is bright pale blue on white. Computed normal/small-text contrast is3.056:1, below4.5:1 accessibility benchmark and visibly faint in actual cards.
- **Source / geometry:** Source mostly uses dark editorial titles and distinct compact controls. Preserve brand variation; this finding is about the paired foreground/background, not imposing a universal hue. rgb(0,151,255) / rgb(255,255,255); card font17.92px weight700 (below18.67px large-bold threshold); missed-story links16px. Examples on home, Matrix, related102392 and past-issues114699. User dynamic23.2px bold is large text and is NOT included in this small-text failure.
- **Falsifiable repair criterion:** Normal/small rendered link text must be legible on its actual surface (at least4.5:1 where applying AA benchmark), with large-text/controls checked using their appropriate contrast thresholds; fix shared paired tokens without washing out surfaces.
- **Evidence:** `focus.json`, `home-2560-main-full.png`, `matrix-source-images.png`, `post-102392-source-examples.png`, `post-114699-2560-main-full.png`.

### E6 — high: Responsive readable density; no one/two-character columns
- **Pages / location:** `sspai-com/home`, `sspai-com/u-jtc092al`; `.defrow .deflabel/.defval; friends._items and user _lines[3]._items`.
- **Rendered defect:** At390 long article labels squeeze the adjacent category/date values into narrow columns. User dates break even numeric tokens into four lines (01/20 -> 01/2 +0); home category values wrap into one/two-character rows. No document overflow still reports success.
- **Source / geometry:** Source desktop rows have readable date/category tags; original390 source was not captured, so no claim of pixel parity on mobile. Defect is directly observed in actual baseline390 top/bottom crop. User 01/20 10:35: label305.58px/value38.42px/value97.25px high at390 vs83.17px/24.31px desktop. Home 深度好文 value41.95px high48.63px at390 vs60px/high24.31px desktop.
- **Falsifiable repair criterion:** At390 preserve whole date tokens and readable category words by allocating sufficient value width or stacking label/value. Keep every target/value and prevent page overflow; geometry must detect squeezed internal columns, not only document width.
- **Evidence:** `mobile-top-bottom-only.png`, `deflist-probe.json`.

### E7 — high: Preserve all source/model actions and exact targets
- **Pages / location:** `sspai-com/matrix`; `feed-view._items[0..2]._action; fieldset.expose-matrix-feed-view`.
- **Rendered defect:** Three correct model navigation actions are swallowed by exposure rendering. Output contains radio inputs with key values and labels only: no anchor href, handler or script. Choosing Hot/Random does not supply a navigation destination.
- **Source / geometry:** Source anchors target /matrix, /matrix/hot, /matrix/random. Model has exact corresponding absolute URLs. Therefore no factual-model correction is needed to recover these known targets. Same baseline HTML used at four widths; .expose-matrix-feed-view is355px wide desktop and fits358px mobile. Geometry/validators pass despite lost navigation.
- **Falsifiable repair criterion:** Render all three declared navigation targets as accessible actionable destinations while preserving existing exposure/selection grammar and shared axis decisions. Verify model-to-HTML AND Markdown action fidelity, not only form geometry.
- **Evidence:** `source-inventory.json`, `measurements.json`, `matrix-2560-main-full.png`.

## Content findings

### C1 — high: Faithful exact action targets
- **Pages / location:** `sspai-com/home`, `sspai-com/post-114699`; `home feed._items[3]._action.to; news briefs._items[1..2].source._action.to`.
- **Rendered defect:** Three targets are truncated/wrong. Agent ends agent-a instead of agent-analysis; BleepingComputer ends some-use instead of some-users%2F; Douyin ends %3Ffro instead of the complete from_tab_name/modal_id/vid query.
- **Source / geometry:** Exact local dom.html anchors are recorded as wrongTargets in handoff. Existing output faithfully repeats these wrong model strings; no remote click/status test performed. Content defect independent of viewport. All other declared model URLs were found exactly in source (absolute/relative sspai normalization), not proof every source action is modeled.
- **Falsifiable repair criterion:** Replace these three target bytes with stored source targets, preserve text/action semantics, validate and rerender. No invented destination or live external execution needed.
- **Evidence:** `source-inventory.json`, `source-inventory-summary.txt`, `measurements.json`.

### C2 — high: Faithful facts/actions/images; meaningful whole-page articles
- **Pages / location:** `sspai-com/post-102392`, `sspai-com/post-114699`; `102392 lead/body/closing/related; 114699 news._items`.
- **Rendered defect:** 102392 is reduced to a few summary sentences: missing four syntax/example images, captions, body facts and Part.I/II manual actions; only one of four source related stories remains.114699 loses cover and Panasonic/Bose images, EU proposal second paragraph/status, Kimi later capabilities and Bose second-model facts while leaving the left/right caption without its image.
- **Source / geometry:** Source102392 body image URLs contain dd3dfc65...,0f1dfabe...,84aa0dee...,ebb1fcda...; source114699 product images a5eb9d7b... and18e25fb5...; source cover045d7312.... Readable crops show darksrc=invert / darksrc=xxx.jpg syntax, full prose and manual links. All exact anchors/images inventoried in local source-inventory.json. Source102392 article x380/w680; syntax/example images y1729.55,1922.39,2324.39,2559. Source114699 cover x336/y56/w768/h330, Panasonic image x413/y3199.97/w614/h244, Bose x380/y3970.13/w680/h355.33. Baseline102392 has only cover+one related image;114699 has only five past-issue images.
- **Falsifiable repair criterion:** Recover substantive captured paragraphs, instructional images/captions/attribution and linked learning entrances with exact source targets under existing closed grammar. Recover news cover/product images and associated full facts. Preserve attribution and natural-size bounds; no fabricated paraphrase treated as source quote.
- **Evidence:** `post-102392-source-examples.png`, `post-114699-source-flow.png`, `post-114699-source-product-images.png`, `source-inventory.json`, `measurements.json`.

### C3 — high: No invented facts; source-faithful profile
- **Pages / location:** `sspai-com/u-jtc092al`; `_lines[2]._lines[3] and missing source writeCount16557`.
- **Rendered defect:** Profile adds 获得充电4 with no support in stored source capture; source profile instead shows article25, writeCount16557, viewCount23535, badge0, since2025 and529days. Character-count datum16557 is omitted. This is an unsupported fact, not proof that actual charging count is zero.
- **Source / geometry:** Source dom.html id=writeCount carries16557 with ssCommunityIcon__character--fill; id=viewCount carries23535. No source text label 获得充电 appears. Source screenshot panel corroborates captured values. Unsupported model fact is visible at desktop and mobile; compactness of resulting section is separately E3.
- **Falsifiable repair criterion:** Remove unsupported charging datum or provide genuine captured provenance; preserve the observed16557 datum with source-supported semantic label (do not guess charging). Preserve25/23535/0/529/SINCE2025 correctly.
- **Evidence:** `u-jtc092al-source-profile.png`, `source-inventory-summary.txt`, `source-inventory.json`.

### C4 — medium: Cohesive source image/title/action attribution
- **Pages / location:** `sspai-com/matrix`, `sspai-com/u-jtc092al`; `matrix feed._items._image; profile identity/activity images`.
- **Rendered defect:** Matrix and user models contain no image values at all. Original Matrix visible articles have identity-bearing160x100 covers; user has a MaxChow avatar and first-three activity covers. Output becomes text-only and loses those source associations.
- **Source / geometry:** Matrix source first cover at x718/y321/w160/h100; subsequent tennis/design/storage/CRM covers shown in readable crop. User source full-height sheet visibly shows avatar and first three VLOOK cover thumbnails (later lazy placeholder images are not claimed loaded). Browser confirms zero images for Matrix and user at all four widths; capture source inventory retains exact CDN URLs/alt/data-src. No broken-image gate can detect an entirely omitted modeled image.
- **Falsifiable repair criterion:** Restore genuine captured image/alt/attribution associations for loaded source covers/avatar using factual model/assets only. Do not synthesize missing/lazy pixels or enlarge pictures; preserve title/action grouping.
- **Evidence:** `matrix-source-images.png`, `u-jtc092al-1440-source-full.png`, `source-inventory.json`, `measurements.json`.

### C5 — medium: Complete compact source utilities/footer and known actions
- **Pages / location:** `sspai-com/home`, `sspai-com/matrix`, `sspai-com/post-102392`, `sspai-com/post-114699`, `sspai-com/u-jtc092al`; `missing shared source navigation/footer facts in five curated models`.
- **Rendered defect:** Models omit the source navigation destinations 共创 /create, PRIME /prime, Matrix /matrix, 栏目 /series (some destinations incidentally appear elsewhere). Home/Matrix/both posts omit captured about/agreement/business utility links; Matrix/posts also omit download/contact. Rendering has only a generic page title, not a compact source utility identity/navigation/footer group.
- **Source / geometry:** Exact source anchors are in source-inventory.json. Source footer appears in full source sheets for Matrix/posts; home has side-rail utility links. User capture has no visible footer, so no user-footer loss claim. No .g-nav or .g-footer nodes in the five output pages; omitted source utility actions cannot be detected by model-to-HTML gates. All widths inherit the same missing modeled facts.
- **Falsifiable repair criterion:** Preserve captured identity/navigation/footer facts and targets in compact semantically grouped utilities using existing grammar; engine may style shared utility groups. Do not invent a mandatory generic giant site heading or force source side-rails into universal centering.
- **Evidence:** `source-inventory.json`, `home-1440-source-full.png`, `matrix-1440-source-full.png`, `post-102392-1440-source-full.png`, `post-114699-1440-source-full.png`.

### C1 exact wrong targets

- `sspai-com/home` `$.feed._items[3]._action.to`
  - Model: `https://sspai.com/prime/story/how-to-obtain-data-for-agent-a`
  - Captured source: `https://sspai.com/prime/story/how-to-obtain-data-for-agent-analysis`
- `sspai-com/post-114699` `$.briefs._items[1].source._action.to`
  - Model: `https://sspai.com/link?target=https%3A%2F%2Fwww.bleepingcomputer.com%2Fnews%2Fmicrosoft%2Fwindows-11-kb5124008-update-breaks-domain-trust-for-some-use`
  - Captured source: `https://sspai.com/link?target=https%3A%2F%2Fwww.bleepingcomputer.com%2Fnews%2Fmicrosoft%2Fwindows-11-kb5124008-update-breaks-domain-trust-for-some-users%2F`
- `sspai-com/post-114699` `$.briefs._items[2].source._action.to`
  - Model: `https://sspai.com/link?target=https%3A%2F%2Fwww.douyin.com%2Fuser%2FMS4wLjABAAAANDEWKpWPI1HZOYhDHzk-u-n4QapA7hhx4MMmLUBGa4EgmNJfRLo2XrGnIU54PfrB%3Ffro`
  - Captured source: `https://sspai.com/link?target=https%3A%2F%2Fwww.douyin.com%2Fuser%2FMS4wLjABAAAANDEWKpWPI1HZOYhDHzk-u-n4QapA7hhx4MMmLUBGa4EgmNJfRLo2XrGnIU54PfrB%3Ffrom_tab_name%3Dmain%26modal_id%3D7686082272528715044%26vid%3D7686082272528715044`

## Preservation / non-defects

- Source home banner alt explicitly says **iPhone18 配件一站式配齐**. The image lettering alone looked less specific; DOM corroborates the modeled label. It is **not** an invented-fact finding. Keep it.
- Centered reading lanes and deliberate source portal/sidebar variation are allowed. The absence of pixels at the outer viewport is not a defect. E1 addresses uncoordinated shared edges.
- No image exceeds natural width in these captures. Article102392 cover is1374px wide (its natural width); the problem is inconsistent editorial grouping/frame, not a proven native-image enlargement.
- User dynamic title is23.2px bold; its3.056:1 contrast meets the large-text3:1 benchmark. E5 does not incorrectly count it as a small-text failure.
- Existing user heterogeneous `_lines` statistics must not be relabeled as comparable just to make a grid. E3 asks for compactness while preserving semantic order.
- All model URLs except Matrix exposure navigation survive into HTML. This proves E7 engine ownership, not completeness against source; C1 is factual-model ownership.

## Limits and next step

- Initial immutable-baseline diagnosis only; not independent acceptance of future repaired/integrated output.
- 1920 full-height screenshots captured and geometry checked, but visual inspection not performed.
- 390 geometry and top/bottom visual crops checked; middle whole-height visual inspection remains incomplete.
- Long1440/source comparison sheets were overview scans; readable crops/DOM cover identified defects, not every fine-text source pixel or every source fact/action.
- No remote destination navigation, authenticated interaction, backend/form submission or assistive-technology exercise; three wrong URLs proven against stored capture only.
- 18/18 image reads and3/3 sequential browser jobs consumed; no setup rerun, source writes or dependencies installed.
- Five-page validators pass, but contrast/action/source omissions and mobile squeezed columns prove static gates cannot establish visual/factual acceptance.
- No protected seven-reference page was changed or accepted by this lane; other pages excluded.

Route E1–E7 to engine and C1–C5 to content, then render and run fresh independent whole-height experience/factual/action review at the final combined revision. Remaining1920 visual and390 middle coverage must be supplied before delivery acceptance. No page implementation or independent final review was performed by this lane.
