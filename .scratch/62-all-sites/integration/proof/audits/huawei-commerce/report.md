# Huawei commerce — baseline page audit

**Status: INCOMPLETE visual acceptance; diagnosis recorded for all four pages.** Baseline `403cd5be096db89b428e130ad57cca730b425fdc`. No source/model/assets/Docs were edited. Initial diagnostics are not independent acceptance of future fixes.

Machine handoff: `/home/z/vibe/autofe-worktrees/62-all-sites/audit-huawei-commerce/.scratch/62-all-sites/audit-huawei-commerce/audit-handoff.json`

## Priority routing

| Finding | Severity | Owner | Scope / defect |
|---|---|---|---|
| H-E1 | high | engine | home: Four featured images render as overlapping viewport-wide strips. Titles stay in narrow columns, captions/actions cross unrelated pictures; watch panel clips other panels. Native crop reproduces visible occlusion, not merely whitespace. |
| H-E2 | medium | engine | home, consumer-phones, search-laptop, search-phone: Desktop titles, utilities and wider collections use unrelated centered frame widths. Huawei catalog repeatedly changes left edges between series; laptop search controls sit176px inside results, and root title sits120px further inward. These are whole-page discontinuities, not an objection to centered page margins. |
| H-E3 | medium | engine | search-laptop: Four narrow text-heavy result columns require repeated multi-line titles and long vertically wrapped summaries; top search, filter/reset and sort are three disjoint stacked utility regions. Phone results correctly remain an ordered readable sequence; do not indiscriminately turn them into matching cards. |
| H-E4 | medium | engine | consumer-phones: Pocket lone item is treated as a centered banner: image760x760, centered title, left-edge CTA below the whole image, and another left-edge control below. It dominates nearby card-scale products and creates a1016px break in the catalog. Flagship text/actions are left-aligned while the product visual sits on a different internal center. |
| H-C1 | high | content | consumer-phones: Most catalog 购买 pills are spans without href even though source has usable targets; they look like purchase actions but their captured destinations are dropped. |
| H-C2 | high | content | consumer-phones: Catalog prices appear as fixed ¥ amounts while source explicitly says 起; flagship retains 起 correctly. |
| H-C3 | medium | content | consumer-phones, search-laptop, search-phone: Consumer Mate70Pro优享版 is the sole text-only hole among image-led catalog peers. Both searches omit all captured result thumbnails (seven laptop, three phone), making the two identically named phone accessories harder to distinguish. |
| H-C4 | high | content | search-laptop: HUAWEI MateBook Pro links to https://consumer.huawei.com/cn/laptops/matebook-pro/. |
| H-C5 | medium | content | search-laptop, search-phone: Query shows empty watermark, no search submit affordance; no category radio is selected. Laptop current sort becomes an unlabeled arbitrary free-text input; phone loses captured 相关性 entirely. |
| H-C6 | medium | content | home: H1 contains full SEO title 华为 - 构建万物互联的智能世界 rather than first segment, while brand promise already appears below; source-visible corporate site identity is compact. |
| H-C7 | medium | content | home, consumer-phones, search-laptop, search-phone: Each page starts directly with model title and ends at core content/pagination; source navigation, footer and support/legal actions are absent. Compact footer acceptance cannot be proven by deleting footer content. |
| H-C8 | low | content | home: 乾崑 action drops -200w from utm_campaign value. |

## Exact evidence and falsifiable improvement criteria

### H-E1 — engine / high
- **Criterion / location:** cohesive image/title/actions; whole-page containment; closed shared-axis decisions; `m1/render.mjs:369-380 renderStack; m1/axis.mjs:765; .g-featured .stack.cols-auto .banner>.strip`.
- **Rendered:** Four featured images render as overlapping viewport-wide strips. Titles stay in narrow columns, captions/actions cross unrelated pictures; watch panel clips other panels. Native crop reproduces visible occlusion, not merely whitespace.
- **Source:** 1440 source full.png shows four independently contained tiles (tall bank/watch; two short center tiles); no inter-tile overlap.
- **Geometry / mechanism:** At2560 four figures have width2560 and x=-467.25/-155.75/155.75/467.25; scrollWidth3027. At1920 scrollWidth2387,1440=1907. Images retain native909/805/804/699 widths, so this is leaked grid context/placement, NOT permission to enlarge. renderStack passes ctx unchanged despite cols=auto; card rendering passes grid:true.
- **Improvement criterion:** Shared grid-context decision must contain every tile image/title/caption/action inside its own region, with no overlap or horizontal document overflow at2560/1920/1440/390; preserve source tall/short variations and native-size caps.
- **Evidence:** `.scratch/62-all-sites/audit-huawei-commerce/home-2560-sheet.png`, `.scratch/62-all-sites/audit-huawei-commerce/home-1440-sheet.png`, `.scratch/62-all-sites/audit-huawei-commerce/home-featured-readable.png`, `.scratch/62-all-sites/audit-huawei-commerce/home-source-sheet.png`, `.scratch/62-all-sites/audit-huawei-commerce/capture-home_consumer-phones_search-laptop_search-phone.json`

### H-E2 — engine / medium
- **Criterion / location:** coherent whole-page axes across mixed forms; `m1/render.mjs root-title/w-narrow/w-wide rules; .depth-0>.title; .group>.depth-1`.
- **Rendered:** Desktop titles, utilities and wider collections use unrelated centered frame widths. Huawei catalog repeatedly changes left edges between series; laptop search controls sit176px inside results, and root title sits120px further inward. These are whole-page discontinuities, not an objection to centered page margins.
- **Source:** Source corporate title/search has intentionally centered top treatment, while functional results/corporate sections have coherent local frames. Consumer source hero is intentionally centered and must remain a legitimate exception.
- **Geometry / mechanism:** All pages2560 root h1 x960,w640; narrow sectionsx840,w880; wide collectionsx664,w1232. At1440 corresponding x400/280/104. Phone results and filters sharex840, but h1x960. Consumer wide catalog headersx664, series/flagship/Pocket x840.
- **Improvement criterion:** Choose closed shared whole-page axis/group rules that align functional section edges coherently; justify centered heroes rather than blanket centering or forcing every brand onto one frame. Verify all four widths and protect accepted references.
- **Evidence:** `.scratch/62-all-sites/audit-huawei-commerce/home-2560-sheet.png`, `.scratch/62-all-sites/audit-huawei-commerce/consumer-phones-2560-sheet.png`, `.scratch/62-all-sites/audit-huawei-commerce/consumer-phones-1440-sheet.png`, `.scratch/62-all-sites/audit-huawei-commerce/search-laptop-readable.png`, `.scratch/62-all-sites/audit-huawei-commerce/search-phone-1440-sheet.png`

### H-E3 — engine / medium
- **Criterion / location:** readable density; compact utilities; semantic compact-grid decision; `.g-results>.node>.cards; .g-query/.g-filters/.g-sort`.
- **Rendered:** Four narrow text-heavy result columns require repeated multi-line titles and long vertically wrapped summaries; top search, filter/reset and sort are three disjoint stacked utility regions. Phone results correctly remain an ordered readable sequence; do not indiscriminately turn them into matching cards.
- **Source:** Source1440 laptop results are a readable ordered vertical list with thumbnails, sidebar filtering and compact count/sort row. It is not a product price grid.
- **Geometry / mechanism:** Result frame1232px, four ~298px cards (usable~271.5px). Five of ten modeled result texts exceed the owning compact-member160-character threshold:194/212/201/188/252; source thumbnails currently omitted; top result starts y432.17. At390 category fieldset alone204.38px high (phone249.97px).
- **Improvement criterion:** Use the closed semantic/text-density decision to keep long search excerpts readable with compact query/filter/sort grouping. Retain every result and action; no source-specific template or arbitrary widening/enlargement.
- **Evidence:** `.scratch/62-all-sites/audit-huawei-commerce/search-laptop-2560-sheet.png`, `.scratch/62-all-sites/audit-huawei-commerce/search-laptop-1440-sheet.png`, `.scratch/62-all-sites/audit-huawei-commerce/search-laptop-readable.png`, `.scratch/62-all-sites/audit-huawei-commerce/search-laptop-source-sheet.png`

### H-E4 — engine / medium
- **Criterion / location:** cohesive image/title/actions; readable catalog density; `#catalog-pocket .banner; .g-flagship`.
- **Rendered:** Pocket lone item is treated as a centered banner: image760x760, centered title, left-edge CTA below the whole image, and another left-edge control below. It dominates nearby card-scale products and creates a1016px break in the catalog. Flagship text/actions are left-aligned while the product visual sits on a different internal center.
- **Source:** Source hero is intentionally centered (visible pixels). Pocket source DOM declares a296x296 product image beside title/action in a1280px product container; that section is lazy/invisible in source screenshot, so no pixel-perfect size judgment is claimed.
- **Geometry / mechanism:** At2560/1440 Pocket image760x760, source natural760; title/action grouping spans entire760px image height; catalog peers have~271.5px media. At390 Pocket390px, no document overflow.
- **Improvement criterion:** Keep lone product title/image/action one cohesive group and make catalog density internally consistent through shared semantics. Do not enlarge any image, erase legitimate centered hero composition, or claim unavailable source pixels prove a fixed size.
- **Evidence:** `.scratch/62-all-sites/audit-huawei-commerce/consumer-flagship-pocket-readable.png`, `.scratch/62-all-sites/audit-huawei-commerce/consumer-phones-2560-sheet.png`, `.scratch/62-all-sites/audit-huawei-commerce/consumer-source-hero-footer-readable.png`, `.scratch/62-all-sites/audit-huawei-commerce/source-inventory.json`

### H-C1 — content / high
- **Criterion / location:** faithful actions/targets; `36 catalog item /buy/_action/to (exact paths in product-comparison.json)`.
- **Rendered:** Most catalog 购买 pills are spans without href even though source has usable targets; they look like purchase actions but their captured destinations are dropped.
- **Source:** Source product-col blocks contain a.global-buy-button[href] for36 corresponding modeled items. Example source indexes850 MateXTs /cn/phones/mate-xts-ultimate-design and819 MateX7 /cn/phones/mate-x7. Use captured href, not hidden buyBtnInfo alternate store links.
- **Geometry / mechanism:** 36 missing targets identified by product-name-normalized DOM comparison; the same loss exists at every viewport and is model-owned, not renderer omission.
- **Improvement criterion:** Populate only source-backed36 buy targets and prove every captured modeled buy action produces its exact normalized captured href; do not invent store/checkout routes.
- **Evidence:** `.scratch/62-all-sites/audit-huawei-commerce/product-comparison.json`, `.scratch/62-all-sites/audit-huawei-commerce/consumer-catalog-reasons-readable.png`, `.scratch/62-all-sites/audit-huawei-commerce/source-inventory.json`

### H-C2 — content / high
- **Criterion / location:** faithful price facts; `36 catalog item /_price/qualifier (paths in product-comparison.json)`.
- **Rendered:** Catalog prices appear as fixed ¥ amounts while source explicitly says 起; flagship retains 起 correctly.
- **Source:** Source price-origin text for36 matched catalog products includes 起. Example source indexes845 MateXTs ￥17999 起,814 MateX7 ￥12999 起,1310 nova14活力版 ￥2399 起. Zero unmatched product names after whitespace/U+2060 normalization.
- **Geometry / mechanism:** 36 omitted qualifiers, all four viewports affected.
- **Improvement criterion:** Restore source 起 qualifiers using existing typed price fact grammar, without changing captured amounts or adding prices to source-unpriced models.
- **Evidence:** `.scratch/62-all-sites/audit-huawei-commerce/product-comparison.json`, `.scratch/62-all-sites/audit-huawei-commerce/consumer-catalog-reasons-readable.png`

### H-C3 — content / medium
- **Criterion / location:** faithful image attribution; cohesive image/title/actions; `consumer /catalog-mate/_items/10/_image; laptop results _items1,3,4,5,6,7,8; phone results _lines2,5,6`.
- **Rendered:** Consumer Mate70Pro优享版 is the sole text-only hole among image-led catalog peers. Both searches omit all captured result thumbnails (seven laptop, three phone), making the two identically named phone accessories harder to distinguish.
- **Source:** Consumer source img954 data-src /content/dam/huawei-cbg-site/cn/mkt/launch/241126/plp/phones/new-241204/all-huawei-mate70-pro.png. Laptop source img199/226/241/256/271/286/301 URLs and phone img212/256/273 recorded verbatim in source-inventory; thumbnails are visible in search source pixels.
- **Geometry / mechanism:** Fresh consumer images all decode (no runner failure); missing item has no model _image. Search DOM rendered image count0 vs source7/3 relevant thumbnails.
- **Improvement criterion:** Restore only captured image URLs/attribution or byte-identical sanctioned mirrors at nonenlarged size; source-lazy consumer imagery comparison remains limited to DOM/data-src.
- **Evidence:** `.scratch/62-all-sites/audit-huawei-commerce/source-inventory.json`, `.scratch/62-all-sites/audit-huawei-commerce/product-comparison.json`, `.scratch/62-all-sites/audit-huawei-commerce/consumer-catalog-reasons-readable.png`, `.scratch/62-all-sites/audit-huawei-commerce/search-laptop-source-sheet.png`, `.scratch/62-all-sites/audit-huawei-commerce/search-phone-source-sheet.png`

### H-C4 — content / high
- **Criterion / location:** faithful targets; `/results/_items/1/_action/to`.
- **Rendered:** HUAWEI MateBook Pro links to https://consumer.huawei.com/cn/laptops/matebook-pro/.
- **Source:** Captured anchor195 href is //consumer.huawei.com/cn/harmonyos-computer/matebook-pro/; screenshot visible URL agrees. This is a path mismatch after relative/protocol normalization, not a slash-only/style mismatch.
- **Geometry / mechanism:** Same href at all four widths, recorded by rendered action inventory.
- **Improvement criterion:** Render exact normalized captured harmonyos-computer/matebook-pro target and assert source-target equality.
- **Evidence:** `.scratch/62-all-sites/audit-huawei-commerce/source-inventory.json`, `.scratch/62-all-sites/audit-huawei-commerce/search-laptop-source-sheet.png`, `.scratch/62-all-sites/audit-huawei-commerce/capture-home_consumer-phones_search-laptop_search-phone.json`

### H-C5 — content / medium
- **Criterion / location:** faithful form facts/actions/current state; `/query; /filters; laptop /sort/_expose; phone missing /sort`.
- **Rendered:** Query shows empty watermark, no search submit affordance; no category radio is selected. Laptop current sort becomes an unlabeled arbitrary free-text input; phone loses captured 相关性 entirely.
- **Source:** Source screenshots show query 笔记本/手机, search-icon affordance, active 全部 category and 相关性 dropdown. Cleaned DOM input123 has search/enterkeyhint=search/placeholder but omits its live value attribute; source current-query evidence is pixels, not falsely claimed DOM value. Sort169/170 is a span/dropdown, not a free-edit textbox.
- **Geometry / mechanism:** At2560 query253px wide, filters864.23/880px; laptop sort an input253px. At390 filters204.38/249.97px. Validator warns W_COMPOSITE_NAME_ONLY_WATERMARK for both query models.
- **Improvement criterion:** Model only captured values/selected state and available actions in existing grammar. Keep no-real-target controls targetless rather than inventing an endpoint. Model sort as captured current state/action, not arbitrary text entry; engine may need shared control-layout support after facts are restored.
- **Evidence:** `.scratch/62-all-sites/audit-huawei-commerce/source-inventory.json`, `.scratch/62-all-sites/audit-huawei-commerce/search-laptop-readable.png`, `.scratch/62-all-sites/audit-huawei-commerce/search-phone-1440-sheet.png`, `.scratch/62-all-sites/audit-huawei-commerce/search-laptop-source-sheet.png`, `.scratch/62-all-sites/audit-huawei-commerce/search-phone-source-sheet.png`, `.scratch/62-all-sites/audit-huawei-commerce/validators.log`

### H-C6 — content / medium
- **Criterion / location:** faithful title source/hierarchy; owning title provenance rule; `/_title/text and /_intent`.
- **Rendered:** H1 contains full SEO title 华为 - 构建万物互联的智能世界 rather than first segment, while brand promise already appears below; source-visible corporate site identity is compact.
- **Source:** meta.json document title is that full SEO string. Source full.png visible identity is HUAWEI logo; nodes/DOM show slogan only in lower brand section. Model intent does not document fallback provenance. Owning layout-axes§5.3 requires fallback first segment and provenance.
- **Geometry / mechanism:** H1 font32px, max640px; at390 slogan wraps into two large lines. This is not an instruction to impose Apple/Taobao identity scope on every other site.
- **Improvement criterion:** Use captured first-segment title/provenance rule without deleting full document-title provenance or fabricating visible page text; engine should preserve a compact coherent identity where justified by shared semantics.
- **Evidence:** `.scratch/62-all-sites/audit-huawei-commerce/home-2560-sheet.png`, `.scratch/62-all-sites/audit-huawei-commerce/home-source-sheet.png`, `.scratch/62-all-sites/audit-huawei-commerce/home-390-readable-sheet.png`, `.scratch/62-all-sites/audit-huawei-commerce/source-inventory.json`

### H-C7 — content / medium
- **Criterion / location:** compact utilities/footer; preservation of captured facts/actions; `root models: missing header/footer/support/disclaimer regions`.
- **Rendered:** Each page starts directly with model title and ends at core content/pagination; source navigation, footer and support/legal actions are absent. Compact footer acceptance cannot be proven by deleting footer content.
- **Source:** Corporate home/search source shows header logo/nav, footer 公司简介/可持续发展/信任中心/法律声明/隐私政策 etc. Consumer source footer visibly has warranty/service-center/retail links, hotline950800, legal links and product/image disclaimers. Source actions and visible nodes preserved in inventory.
- **Geometry / mechanism:** All four rendered HTMLs have no modeled header/footer region; every viewport shares this omission. Source footer inspected whole-height on all pages; consumer footer also native readable crop.
- **Improvement criterion:** Reconcile captured utility/legal facts and actions under authorized curated-page fidelity scope, preserve source-backed essential regions compactly with existing grammar. Do not recreate cookie behavior or invent nav/footer facts; source omission is content-owned, layout/paired surface remains engine-owned.
- **Evidence:** `.scratch/62-all-sites/audit-huawei-commerce/source-inventory.json`, `.scratch/62-all-sites/audit-huawei-commerce/home-source-sheet.png`, `.scratch/62-all-sites/audit-huawei-commerce/search-laptop-source-sheet.png`, `.scratch/62-all-sites/audit-huawei-commerce/search-phone-source-sheet.png`, `.scratch/62-all-sites/audit-huawei-commerce/consumer-source-hero-footer-readable.png`

### H-C8 — content / low
- **Criterion / location:** faithful exact target query parameters; `/featured/_items/1/_action/to`.
- **Rendered:** 乾崑 action drops -200w from utm_campaign value.
- **Source:** Source anchors258/262 end utm_campaign=20260914-200w; model/render end20260914. Destination path otherwise identical; no navigation failure is asserted.
- **Geometry / mechanism:** Target mismatch isolated after relative/protocol normalization; not the benign consumer privacy trailing slash.
- **Improvement criterion:** Retain captured query string exactly unless an authorized normalization explicitly covers analytics parameters.
- **Evidence:** `.scratch/62-all-sites/audit-huawei-commerce/source-inventory.json`

## Coverage (inspected is not PASS)

| Page | 2560 | 1440/source | 1920 | 390 |
|---|---|---|---|---|
| huawei-cn/home | whole height overview + geometry | whole height; source DOM/nodes and full.png inspected; source comparison exercised | geometry, PNG visually uninspected | whole height readable + geometry |
| huawei-cn/consumer-phones | whole height overview + geometry | whole height; source DOM/nodes and full.png inspected; catalog/reasons source pixels unavailable | geometry, PNG visually uninspected | geometry, PNG visually uninspected |
| huawei-cn/search-laptop | whole height overview + geometry | whole height; source DOM/nodes and full.png inspected; source comparison exercised | geometry, PNG visually uninspected | geometry, PNG visually uninspected |
| huawei-cn/search-phone | whole height overview + geometry | whole height; source DOM/nodes and full.png inspected; source comparison exercised | geometry, PNG visually uninspected | geometry, PNG visually uninspected |

Every2560/1920/1440/390 capture is local and full height. Source corpus is1440 only. The 18 opened images are12 overview/source sheets plus6 readable crops/sheets; whole height never silently omitted. Source consumer blank regions cannot prove faithful visual dimensions. All screenshots and inputs are hash-bound in the handoff/capture inventory.

## Positive observations / preserve rather than redesign

- All modeled images decoded at every measured viewport; no image request failure explains the catalog hole. No image was measured larger than its native dimensions.
- Consumer Mate/Pura/nova/畅享 cards and reasons use coherent local image/text/action groups, with legible white-surface foregrounds in inspected crops. Source consumer hero intentionally centers the product/title: preserve this brand composition, not blanket left alignment.
- Search-phone sequential results, distinct duplicate-title accessories, all10 modeled excerpts/source labels and pagination text survive rendering; no product prices were invented for either corporate search. Phone sequence must not be flattened into the laptop grid just for uniformity.
- Huawei red result-title links remain readable on white; dark action foregrounds are readable in inspected crops. No independently observed paired-contrast blocker beyond overlap/occlusion. This is not an exhaustive accessibility contrast certification.
- Home390 feature cards serialize without horizontal overflow and all six business actions remain readable. Hero names/actions remain separated in description-list treatment; no clean-page claim.
- Home source tall bank/watch tiles and short center tiles are deliberate source variation, not defects to normalize away. Allowed Apple full bleed is outside this lane and no accepted-reference edits occurred.

## Geometry summary

| Page | height2560/1920/1440/390 | scroll width2560/1920/1440/390 |
|---|---|---|
| home | 2997/2997/2997/3793 | 3027/2387/1907/390 |
| consumer-phones | 8748/8748/8748/27889 | 2560/1920/1440/390 |
| search-laptop | 1647/1647/1647/3581 | 2560/1920/1440/390 |
| search-phone | 1900/1900/1900/2306 | 2560/1920/1440/390 |

## Validation / limits

- One foreground Playwright/headless-shell job, one browser and one active page;16 whole-height screenshot/geometry captures.
- Source protocol-relative/relative hrefs were normalized before comparisons. Word joiners were normalized for product names. Benign privacy trailing-slash difference is not a blocking finding.
- `node m1/validate.mjs m1/curated/huawei-cn/{home,consumer-phones,search-laptop,search-phone}.json`: all four valid; both searches warn `W_COMPOSITE_NAME_ONLY_WATERMARK`. Static validity does not prove experience acceptance.
- `git diff --check`: passed; no staged files; project tracked-source diff remains empty. Evidence-only artifacts reside in this isolated lane plus the authoritative report output.
- `python3 .scratch/62-all-sites/audit-huawei-commerce/evidence-selfcheck.py`:7 integrity/diagnostic checks passed. This checks16 screenshots, input hashes, exact36/36/1 content-defect counts, coverage disclosures and no staged/tracked-source edits; it is not independent visual acceptance.
- Full changed-file/hash inventory: `.scratch/62-all-sites/audit-huawei-commerce/evidence-files.json` (excludes unchanged supplied packet; includes authoritative report). Independent reviewer gate remains pending.

- Diagnostic audit only; no source repairs or later-revision acceptance review. No page is clean/PASS.
- 18/18 image reads and1/3 browser jobs used. No setup/preparation rerun.
- 1920 all4 and390 consumer/search pages have geometry plus full-height PNGs, but actual pixels are visually UNINSPECTED.
- Consumer source full.png after hero has lazy-load blanks; catalog/reasons source pixel comparison unavailable. DOM data-src/bbox and loaded rendered assets are separate evidence, not substitute visual source proof.
- All local referenced asset mirrors hashed; remote image bytes not independently hashed/cached by capture. HTML/model/source hashes, natural sizes/decoding and exact screenshot bytes are bound; CDN response freshness remains a limit.
- No endpoint navigation/search submission, no real purchase, no external publication/compute/spending. Source href preservation checked locally; actual destination availability not tested.
- Full rendered image-body/asset-byte fidelity beyond inspected crops and source DOM is not exhaustively established.
- Initial source inventories include hidden public product configuration, not credentials; no new source files/staging/recovery commits.
