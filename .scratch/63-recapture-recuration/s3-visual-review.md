# S3 design-language pass — visual review (diagnosis only)

Reviewed: 10 side-by-side composites in `m1/curated/renders/sbs/` (left = original source, right = our render), judged against `learn_draw/vendor/huashu-design/references/critique-guide.md` and `typography.md`. Zoom crops used: `_zoom-apple-mid.png`, `_zoom-bili-top.png`, `_zoom-hw-phones-headers.png` (same folder).

## Overall verdict

The pass did its job on typography, spacing rhythm and band structure: list/article pages (airbnb, huawei search, sspai post, sspai matrix) now read as designed pages with a working type scale and consistent components. The pass fails on the grid/e-commerce pages: a systemic layout defect clips wide grids at the left viewport edge (bilibili, huawei phones, mi), and brand identity is flattened into one generic blue accent (airbnb rose, sspai red lost). By the critique guide's bar this is execution ~6/10 on a concept ≤5 template — page chrome is designed, personality is not.

## Per-page verdicts

**airbnb-com-room-28871** — white hole: **FIXED**. Former void is now a two-column listing (title block, photo mosaic, description/amenities/rating table + booking sidebar) with clear hierarchy. Evidence of remaining gap: CTA/link accent is blue — Airbnb's rose is gone; booking-card inputs are bare gray boxes; rating table is gray-on-gray dense.

**apple-com-cn-iphone-17** — trade-in gap: **FIXED**. "在 Apple 购买 iPhone" band is now filled with the model-selector radio pills plus 6 benefit cards (verified in `_zoom-apple-mid.png`). Residual: card grid bottom is ragged (uneven card heights; lone "Apple Store App" card leaves an empty cell), headlines are center-aligned where Apple's voice is left-aligned editorial.

**bilibili-com-read-home** — text/image spacing inside cards: **FIXED** (image-on-top cards with tight, consistent title/text spacing). But the page gains a worse regression: the masonry starts flush at the viewport's left edge with the first column clipped, and ~25% of the right side is dead space (`_zoom-bili-top.png`); excerpts run 10+ lines so cards read as text walls, and the original's category rail/tabs are gone — it reads as a generic Pinterest wall, not bilibili.

**huawei-cn-consumer-phones** — left-jam: **NOT FIXED, worse**. Product grids are clipped mid-card at the left viewport edge ("HUAWEI Mate XTs" title and card borders cut, verified in `_zoom-hw-phones-headers.png`) with a dead margin on the right. The card system itself is clean and uniform (photo, name, ¥price, 了解更多/购买), but every card carries 2 buttons — ~40 cards ≈ 80 buttons of red/outline fatigue — and the per-series atmospheric bands that gave the original its rhythm are reduced to small plain headers.

**huawei-cn-home** — "not a homepage": **PARTIAL**. It now has the homepage skeleton (hero → 我们的业务 → 推荐信息 → 新闻动态 → brand statement → footer) with real band rhythm. What keeps it from being *this* homepage: the hero phone is small and floating on white where the original's product shot owns the band (focal point lost), 我们的业务 cards are icon-less text boxes (wireframe feel), and 4+ identical full-width red CTA pills stack inside the promo cards; the footer nav renders as pill buttons.

**huawei-cn-search-laptop** — spacing: **FIXED**. Airy result cards with aligned thumbnails and a clean title/source/description hierarchy. Nits: oversized "搜索结果" display heading, a redundant red 查询 button under the already-functional filter row, and the red 来源 link repeated on every card is loud.

**mi-com-shop-category-list** — "so ugly": **PARTIAL** — less ugly, still generic. It is now a systematic, consistent tile grid grouped by category. But product art is tiny inside oversized white tiles (dead space per cell), nearly every name truncates to an ellipsis, the original's left category nav is missing, a search button sits orphaned above the footer, and the grid is left-flush with a large right gap.

**sspai-com-matrix** — text/image far: **FIXED**. Uniform rows with text left and thumbnail adjacent-right, tight separators — reads like a designed feed. Nits: blue accent replaces sspai red; a CTA pile-up (加载更多 + 4 tag pills + 开始创作) stacks before the footer.

**sspai-com-u-jtc092al** — hollow profile: **PARTIAL**. Header + 成就与徽章 stat cards + 动态 list give it structure, but the stat cards are internally misaligned (a 3-line card, label+number cards, and "暂无徽章 0" share no baseline pattern); the feed holds 11 rows at 52% of original height (render caption), so it still feels thin; and with the blue accent it could be any site — zero sspai identity.

**sspai-com-post-102392** — left-jam: **FIXED**. Centered reading column, strong title hero, meta row, full-column images — a proper article page. Nits: every image carries duplicated meta (▸ 查看原始链接 row *and* caption); serif display over sans body is defensible but un-sspai; related reading is demoted to a bare list.

## Modern/elegant bar

- Reads designed: airbnb, huawei search, sspai post, sspai matrix, apple (mostly).
- Reads generic/broken: bilibili, huawei phones, mi (clipped/left-flush grids), huawei home (wireframe-ish business cards).
- The system exists — consistent type scale, 8pt-ish spacing, one button language per page — but the "换个客户名还成立" test fails: strip the logos and airbnb/sspai are indistinguishable blue-accent templates. That, plus the clipped grids, is what keeps this below the elegant bar.

## Top 5 remaining gaps (ranked by visual impact, for S3b/S4)

1. **Grid container clips at the left viewport edge + asymmetric right dead margin** (bilibili, huawei phones, mi). A cut-off card reads as broken, not designed; no other defect is this visible. Fix: enforce a page gutter / centered max-width on grid containers and add a render-time check (left margin > 0, symmetric container).
2. **Brand accent flattening to generic blue** (airbnb, sspai ×3). Accent color is the cheapest identity carrier; one per-site accent token (rose/red/orange) would do more for "designed" than any further spacing pass.
3. **Focal-point scale** — heroes and cell media are undersized (huawei home phone floating small, mi product art lost in tiles, huawei-phones series bands demoted). This is exactly the S3b media-scale thesis — it is right, but only after gap 1, because scaling media inside a clipped container amplifies the overflow.
4. **Cell/slot economy** — mi's oversized tiles with truncated names, huawei home's icon-less business boxes, and per-card double buttons / stacked full-width CTA pills (button fatigue). Right-size media to cells; one primary CTA per card, one CTA band per section.
5. **Text walls and misaligned stat cards** — bilibili excerpts need a 2–3 line clamp; sspai profile stat cards need one shared internal layout (label top, value on one baseline, unit in caption) and a fuller feed to escape thinness.

**Is S3b (media scale) the right next step?** Right in substance, wrong as the literal next step. Sequence: S3b-0 gutter/clip fix (mechanical, hours) → S3b media scale → S4 brand accent tokens. If S3b ships on the current containers, gaps 1 and 3 will land in the same screenshots and the pass will look like a regression.
