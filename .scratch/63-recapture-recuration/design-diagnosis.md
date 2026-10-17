# Visual Design Diagnosis: rendered pages vs source screenshots (10 flagged pages)

Diagnosis only — no model/renderer/CSS was modified. Evidence: the 10 sbs composites
(`m1/curated/renders/sbs/*.png`, all read as images), the render HTML
(`m1/curated/renders/<site>-<page>.html`), the CSS in `m1/render.mjs`, and capture
dimensions. Review lens: `learn_draw/vendor/huashu-design/references/critique-guide.md`
(concept → hierarchy → craft → function) and `references/typography.md` (modular scale,
CJK measure, hierarchy contrast).

## Global mechanics first (two facts that explain repeated symptoms)

1. **The black void in every sbs image is a height mismatch, not a render CSS bug.**
   `m1/eval/side-by-side.mjs` paints the composite page `body{background:#111}`; the
   black region is simply where the shorter screenshot ends. Render heights
   (PNG, 1280w) vs originals (1440w), height/width normalised:

   | page | orig h/w | render h/w | render = % of orig |
   |---|---|---|---|
   | airbnb room | 4.74 | 1.98 | 42% |
   | apple iphone-17 | 14.9 | 9.13 | 61% |
   | bilibili read-home | 16.4 | 35.5 | **216%** |
   | huawei consumer-phones | 9.55 | 5.81 | 61% |
   | huawei home | 2.93 | 1.64 | 56% |
   | huawei search-laptop | 2.42 | 2.02 | 83% |
   | mi category-list | 4.92 | 1.87 | **38%** |
   | sspai matrix | 2.73 | 3.73 | 137% |
   | sspai u-jtc092al | 3.79 | 1.51 | **40%** |
   | sspai post | 3.42 | 2.82 | 82% |

   Grid/gallery pages collapse to 38–61% of the source height (sections flattened,
   media dropped); feed pages stretch to 137–216% (cards became an endless text list).
   Both directions are the same disease: **structure flattening**, which the composite
   then displays as a black hole.

2. **Media never scales up, and only declared banners escape the column.**
   `m1/render.mjs`: `img{max-width:100%;width:auto;border-radius:10px;display:block}`
   ("Compact product media: an upper bound only, never crop or upscale source
   thumbnails") plus `.node.w-bleed{...width:100vw;margin-left:calc(50% - 50vw)...}`.
   So a hero is either a small intrinsic-size thumbnail (most pages) or 100vw full
   bleed (declared banners: apple hero, sspai post hero). There is nothing in between —
   no contained large hero band, no media sized relative to its section.

## Per-page diagnosis

### 1. airbnb-com/room-28871 (detail page)
- **Defect**: the photo wall reads as scattered snapshots, not the source's flush
  5-photo mosaic: tiles end at ragged heights (big photo ~330px, neighbours ~215px and
  ~293px), producing staggered white gaps; the rest of the page is a wide sparse
  document (main text ~680px, booking card pinned at far right with a ~250px dead
  gutter; rating stats spread across the full 1232px as a cold data table).
- **Root cause**: (d)+(b). The mosaic exists — HTML has `class="gallery-mosaic"` — but
  `.gallery-mosaic{display:grid;...gap:6px;...align-items:stretch}` combined with
  `.gallery-mosaic .strip{...aspect-ratio:1/1;...}` is self-defeating: `stretch` on
  grid items overrides the intended square tiles, and `grid-auto-rows:auto` lets each
  row take its content height, so rows never align. The right-rail gap comes from
  `main{max-width:1280px;margin:0 auto;padding:32px 24px 0}` hosting two independent
  widths (`.w-narrow` text vs the card) with nothing tying their edges.
- **Critique**: hierarchy is flat — title 32px (`h1.title{font-size:2em}`) vs 16px body
  is exactly 2x, below the guide's 2.5x minimum; the gallery should be the page's focal
  point but its ragged edges spend attention on nothing. Whitespace is not doing work:
  it separates unrelated things (text↔booking card) instead of grouping related ones.
  "Good" for a room detail page: flush photo mosaic as hero, then a tight two-column
  body with the booking card docked beside the description, warm host face near the
  host facts.

### 2. apple-com-cn/iphone-17 (marketing product page)
- **Defect**: the render is ~40% shorter and reads as a narrow illustrated article:
  alternating full-bleed colour bands of the source became stacked text blocks with
  small centred images; hero band is full-bleed but everything after it reverts to a
  plain column; the bottom third of the composite is black void.
- **Root cause**: (c)+(d). Only the declared banner escapes the column
  (`.strip{width:100vw;margin-left:calc(50% - 50vw)...}`; comment: "仅限声明的
  hero/banner… 满幅"); section-level colour bands don't exist as a concept, so
  `.node.w-prose,.node.w-narrow,.node.w-wide{max-width:none;margin-inline:0;width:100%}`
  renders every section at the same flat width. Missing height = dropped marketing
  sections in the model output.
- **Critique**: an iPhone page is defined by rhythm — huge display type, colour band
  alternation, one idea per viewport. Here every section has identical typography
  (16px system-ui, gray hairlines), so the "squint test" shows one undifferentiated
  column: hierarchy too flat, no focal point after the first screen, sterile. Good =
  alternating band surfaces with 3–4x display type (`clamp` per typography.md) and
  images sized to the band, not to their intrinsic pixels.

### 3. bilibili-com/read-home (article-channel home)
- **Defect**: the render is a 45,377px-tall single column of blue underlined
  title-links — a sitemap, not the source's dense multi-column card grid with cover
  images; 2.16x longer than the original because every card became a text line.
- **Root cause**: (c)+(d). HTML has no `cards`/`media` treatment for this page (no
  `gallery-mosaic`, no record-member, no cols declaration); default
  `.linklist{margin:8px 0;padding-left:1.1em}` and `.cards{grid-template-columns:minmax(0,1fr)}`
  single-column path apply. The axis did not declare this page as a card-feed archetype
  (pageLayout.kind stayed `default` — root article class is bare `node depth-0`), so no
  `.cards.cols-auto{repeat(auto-fill,minmax(260px,1fr))}` grid, and covers were lost.
- **Critique**: monotony in its purest form — thousands of identical 16px lines, zero
  visual anchors, no covers, no rhythm. A content-channel home lives on its card grid:
  cover image + title + meta, 2–4 columns, section rails. This is the page where
  "reads like a text dump" is most literal.

### 4. huawei-cn/consumer-phones (category landing)
- **Defect**: the page reads like search results, not a phones landing page: source's
  cinematic series banners (Mate/Pura/Pocket/nova full-width imagery) became a single
  flat list of product rows (tiny thumbnail + name + price + button pills, full width,
  one per row); footer became an inline paragraph; bottom ~third is black void.
- **Root cause**: (c). The axis flattened the two-level structure (series banner →
  product cards) into one node stream; no banner declaration per series, and
  `.product-cards img{max-height:160px}` + no-upscale keep every product image small.
  The row-per-product look is the default block stream
  (`.block{margin:18px 0;padding:0 0 6px}`), not a grid.
- **Critique**: concept loss — the source page's idea is "each series is a world"; the
  render has no series identity at all. All hierarchy is flattened to list items;
  whitespace between sparse wide rows is dead, not rhythmic. Good: one banner surface
  per series, then a 4-col product card grid, series nav sticky.

### 5. huawei-cn/home (corporate home)
- **Defect**: hero product photo renders ~250px wide, left-aligned inside a small
  white card (source: full-width cinematic hero with centred title); "我们的业务" icon
  card grid became a row of pill tags; "推荐信息" collage became 4 cards of wildly
  mismatched sizes with uneven vertical offsets; news cards became a plain text list;
  bottom ~45% is black void.
- **Root cause**: (d)+(b). The hero IS declared `banner` in HTML
  (`<article ... class="node depth-2 banner">`) but it sits inside
  `article.depth-1.w-narrow.singleton-card`, and
  `.singleton-card>.stack{max-width:320px}` + `.singleton-card .banner img{max-width:100%;max-height:320px;width:auto;height:auto}`
  cap the whole banner at 320px, left-aligned (`align-items:flex-start`). The collage's
  uneven card sizes come from `.cards .item{border:1px solid #e6eaf0;padding:12px}` in
  a plain `.cards{grid-template-columns:minmax(0,1fr)}` flow — no column spanning
  concept, so each card takes its own content height.
- **Critique**: the source home has one of the strongest compositions of the ten
  (centred hero, centred section titles, collage with intentional asymmetry). The
  render keeps the content but loses every compositional decision: no focal point
  (tiny hero), section titles left-aligned (`.depth-0>.title{max-width:none;margin-inline:0}`
  sets the left-flush precedent for the whole page), rhythm destroyed by unequal
  cards. Good = declared full-bleed hero, centred section headers, collage grid with
  deliberate spans.

### 6. huawei-cn/search-laptop (search results)
- **Defect**: each result's thumbnail floats at the far right edge while the text
  column runs ~1000px wide — a huge dead horizontal gulf between text and its image;
  the source had thumbnail adjacent-left of a ~55%-measure text block. Filter sidebar
  collapsed into a horizontal pill row (acceptable structurally, but the pagination
  and results now stretch the full 1232px with no measure).
- **Root cause**: (b). `.record-member{display:grid!important;grid-template-columns:minmax(0,1fr) 216px;gap:6px 24px;...}`
  gives text all remaining width and pins media in a fixed 216px right column; nothing
  caps the text measure inside that 1fr (only `.record-member>.fact{max-width:74ch}`
  caps fact paragraphs, not titles/leading text).
- **Critique**: functional but reads as a database dump; red accent titles + underlined
  links everywhere make it look like a 2005 directory. Search pages read "good" with a
  640–720px measure, media adjacent to text, consistent card rows with clear hover
  affordance.

### 7. mi-com/shop-category-list (category directory)
- **Defect**: the entire visual category grid (source: 6-col product thumbnails per
  section) became a wrapped soup of small orange text links in one column; render is
  38% of source height; bottom ~55% black void. Some link text is corrupted-looking
  ("<5 OTA升级" style fragments).
- **Root cause**: (c)+(d). Root article has no page-kind class (pageLayout.kind
  `default`), so `.catalog-page` treatments never apply; the 9 `class="linklist"`
  blocks render plain — the column treatment exists but is opt-in:
  `.linklist.cols2,.linklist.cols3,.linklist.cols4{columns:auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr))...}`
  was not declared. Product thumbnails were dropped entirely by the model.
- **Critique**: worst concept loss of the ten — a directory page whose entire value is
  "see the products" was rendered as a table of contents. Even as text, it needs
  multi-column link grids and section anchors; as designed, thumbnail tiles with
  names, 6 per row, matching the source's scannability.

### 8. sspai-com/matrix (community feed)
- **Defect**: every feed row spans the full 1232px: title at far left, tiny thumbnail
  at far right edge, a ~700px dead horizontal band between them; right-rail content
  (一览, 值得关注, 专栏推荐) appended BELOW the feed as an unstyled stream, including a
  huge centred image with enormous whitespace around it; render 137% of source height.
- **Root cause**: (b)+(c). Row layout is
  `.record-member{grid-template-columns:minmax(0,1fr) 216px;...}` — text column
  uncapped so the visual gap is structural; and the source's two-column page frame
  (feed + 320px sidebar) has no concept in the engine, so sidebar nodes fall after the
  feed in the single `main` stream (`main{max-width:1280px}`).
- **Critique**: the source feed is comfortable because rows are ~600px wide with
  media adjacent; our render converts the leftover width into dead space. Titles are
  accent-blue underlined links (`.self-link`/`a.ref{color:var(--accent);text-decoration:underline...}`)
  which reads as "browser default", not editorial. Good: feed column ~640px + sticky
  sidebar rail, title styled as headline (dark, 650–700 weight, no underline until
  hover).

### 9. sspai-com/u-jtc092al (user profile)
- **Defect**: profile header is a loose left-aligned stack (avatar, name, one pill) —
  no centred identity card, no stat tiles (stats flattened to "创作文章 25 / 文章阅读量
  20357…" label lines); the activity feed became a 4-col grid of blue link cards with
  ragged heights and a missing-thumbnail white hole; bottom ~55% black void (render
  40% of source height).
- **Root cause**: (c)+(b). Source's centred identity + tabs + feed-list archetype
  wasn't declared (root class bare `node depth-0`); stats render as `.utility-facts`
  rows; cards get `.cards.cols-auto` (`repeat(auto-fill,minmax(260px,1fr))`) with
  `align-items:start`, so unequal content heights shred the grid rows.
- **Critique**: profiles need an identity anchor — avatar/name/stats as one composed
  unit — and a consistent feed card. Here hierarchy starts at zero (a bare h1 like a
  browser title, "MaxChow 的动态 - 少数派" even carries the SEO suffix), so nothing
  reads as "this is who this page is about".

### 10. sspai-com/post-102392 (article)
- **Defect**: hero image is 100vw full-bleed (source: contained ~680px column image);
  body text runs nearly full page width — paragraph measure is capped only by
  `.prose p` while every heading, rule and list spans ~1232px, so the text block sits
  hard left with a huge empty right margin; related-reading card grid became text
  lines; bottom ~20% black void.
- **Root cause**: (b) + missing page-kind. Root article class is bare `node depth-0` —
  the post never received `reading-page`, so
  `.reading-page{--reading-width:800px;max-width:var(--reading-width);margin-inline:auto}`
  never applies. What remains: `.prose{max-width:74ch;margin-inline:0}` (explicitly
  left-flush) guarding only prose paragraphs, and the declared banner escaping to
  100vw via `.strip{width:100vw;margin-left:calc(50% - 50vw)...}`.
- **Critique**: closest-to-faithful of the ten on content, furthest on comfort: at
  1232px the line length is ~75+ CJK chars, double the 28–32 char ideal from
  typography.md where it escapes the prose cap; reading is fatiguing and the page
  looks unfinished (dead right half). Good article page = one centred 640–720px
  column, hero contained to that column, generous but even vertical rhythm.

## Cross-cutting root-cause summary (engine terms)

- (a) Section spacing: NOT the main problem. `.block{margin:18px 0}`, `hr.region{margin:22px 0}`
  are sane; no pathological vertical gaps observed except where media aspect handling
  created them (airbnb mosaic).
- (b) Grid/centring: MAJOR. Two failure modes: uncapped text measure inside
  `.record-member`'s `minmax(0,1fr)` (search, matrix) and page-kind classes
  (`reading-page`, `catalog-page`, `.cards.cols-auto`) declared in CSS but not applied
  by the axis on 4 of 10 pages (bilibili, mi, sspai-post, sspai-user have bare
  `node depth-0` roots). Plus `align-items:stretch` defeating `aspect-ratio` in
  `.gallery-mosaic`.
- (c) Priority/ordering: MAJOR. Marketing/category archetypes flattened to flat node
  streams (huawei phones, mi, apple, bilibili); sidebars appended below content
  (matrix, user). The axis has the vocabulary (banner, width tiers, page kinds) but
  applied it inconsistently — banner worked on apple/post, failed inside
  `.singleton-card` on huawei home.
- (d) Media/aspect: MAJOR. Hard no-upscale (`img{max-width:100%;width:auto}`) +
  `max-height` caps (`.product-cards img{max-height:160px}`,
  `.singleton-card .banner img{max-height:320px}`) mean images are either intrinsic
  thumbnails or 100vw bands; nothing sizes media to its section. Covers dropped
  entirely on bilibili/mi.
- (e) Faithful-to-source: only huawei search's pill filters and the sbs black voids
  are "faithful-ish" (composite artifact, not render CSS). The airbnb ORIGINAL's own
  giant white middle is a lazy-load artifact of the source screenshot, not ours.

## Design-language critique (huashu lens, owner-readable)

Against `critique-guide.md`, every render scores low on the two dimensions that matter
for 落地页/官网 (功能性 + 视觉层级) and fails the squint test:

1. **Hierarchy too flat** — `h1 2em / h2 1.45em / h3 1.12em` on a 16px body is a 2x /
   1.45x / 1.12x ladder; the guide demands ≥2.5x headline-to-body and 3–4 clear
   tiers. Ten pages in, nothing ever "shouts".
2. **One typeface, zero expression** — `body{font:16px/1.6 system-ui,...}` with only
   650/700/750 weights; no display size anywhere, no per-site type identity even where
   brand tokens inject an accent colour. This is typography.md's "全场 Inter"反模式 in
   system-ui form: reliable, anonymous, instantly "generated".
3. **Whitespace is inactive** — gaps exist between everything equally (hairlines +
   18–22px margins), so they group nothing and rhythm is monotonous. The guide: 留白要
   引导视线; here it just pads a document.
4. **No focal point per screen** — the source pages each have one composed moment
   (huawei hero, apple band, airbnb mosaic, profile card). Renders start with a bare
   left-aligned h1 and never compose again.
5. **Link-styled everything** — accent-blue underlined titles/links on white with gray
   hairlines and pill buttons is the 2005 default look; it's the single strongest
   "not designed" signal after the black voids.

## The ONE systemic gap

**The engine renders content, not composition: it has a single page frame — a left-aligned
1280px document column with intrinsic-size images, hairline separators and link-blue
accents — and no page-archetype/media layer on top.** Every page type in the corpus
(cinematic marketing home, category grid, search results, article, community feed,
profile) is poured into that one document frame: heroes never scale beyond their source
pixels unless declared 100vw-bleed, two-column frames (feed+sidebar, body+booking rail)
don't exist so asides stack underneath, page-kind treatments (`reading-page`,
`catalog-page`, card grids, mosaics) exist in CSS but are applied inconsistently by the
axis, and flattened content shows up as black height-voids in side-by-side comparison.
Structurally faithful, visually identity-free — that is why even the "correct" renders
read as modern-unused: correct text, no designed surface.

Fix direction (for the parent to decide, not implemented here): one page-archetype
layer between axis and CSS — declare (kind, columns, media role) per page/section, map
to real layout frames (band hero, feed+aside, card grid, centred reading column), and
let media size to its declared role instead of intrinsic pixels.
