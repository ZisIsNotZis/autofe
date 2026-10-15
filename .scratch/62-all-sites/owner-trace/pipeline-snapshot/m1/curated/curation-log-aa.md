# M3 curation batch AA — log (auto draft → curated model)

Date: 2026-09-28. Worker: AA batch of the exemplar fan-out, per `.scratch/04-m3-curation/spec.md`
protocol + pilot rules (`curation-log.md`) + amendments F-024 (money.qualifier) / F-025 (URLs verbatim
from capture). Scope: writes under `m1/curated/**` only; nothing committed; `curation-log.md`
(pilot-owned) untouched.

Oracle split (pilot rule 1, applied throughout): **`corpus/<site>/<page>/nodes.json` full `name`
strings decide FACTS; `full.png` decides EMPHASIS** (`_primary`, storyline order); `dom.html` is the
URL oracle (F-025); `jsonld.json` is a capture-internal cross-check (used on airbnb).

## Results overview

| page | validate | factFidelity before → after | coverage high before → after | coverage med before → after |
|---|---|---|---|---|
| aliyun-com/product-ecs | ok (0 errors) | 1.000 (78/78) → **1.000 (30/30)**, tau 0.16 → **0.94** | 60 → **76** * | 139 → **156** * |
| 36kr-com/home | ok (0 errors) | 1.000 (62/62) → **0.994 (156/157)** ** | 74 → **62** | 0 → 0 |
| 36kr-com/information-technology | ok (0 errors) | 1.000 (45/45) → **0.991 (114/115)** ** | 14 → **33** *** | 0 → 0 |
| 36kr-com/search-ai | ok (0 errors) | 1.000 (53/53) → **1.000 (73/73)** | 7 → **32** *** | 0 → 0 |
| 36kr-com/search-viz | ok (0 errors) | 1.000 (53/53) → **1.000 (73/73)** | 7 → **33** *** | 0 → 0 |
| airbnb-com/room-28871 | ok (0 errors) | 1.000 (2/2) → **1.000 (83/83)**, tau **1.0** | 43 → **28** | 17 → **9** |

\* product-ecs is the reviewed HAND model copied per task instruction (not re-curated). It is a
story-focused encoding (12 storylines, 30 typed facts) while the auto draft mechanically carries
~2.6× more raw strings (26 storylines, 78 facts incl. unparsed tail), so raw residual warning counts
rise. What improved is structure: storyline tau 0.16 → 0.94, fidelity 1.00 both.
\** The single fidelity miss on home/tech is the documented `&quot;` metric artifact (pilot log,
same class as `AT&amp;T`): capture fact 曾经的"安卓表皇"回来了… is kept verbatim and is present in the
render HTML; the metric's norm only unescapes `&amp;`, so the escaped quote breaks the substring match.
\*** 36kr high-count increases are the fragment-suppression artifact (pilot "Coverage metric
artifact" section), not lost facts: the auto drafts (a) carried merged composite `_name` strings
(title+deck+date as one string) that exact-matched source container strings, and (b) carried junk
menu-soup names (36氪Auto 数字时氪 未来消费 …) that substring-suppressed ~12 nav warnings each page.
Curation splits composites into `_name`/`_subtitle`/`_detail`/`_datetime` fields and drops junk, so
container/chrome strings surface. Every real fact is present leaf-level in the curated model
(article/deck/date triplets, tabs, search controls); residuals are classified below.

Storyline tau: null on all four 36kr pages (the source exposes no `heading`-role nodes, same as the
huawei pages — order was curated from DOM order); airbnb tau 1.0; product-ecs 0.16 → 0.94.

## Per-page decisions

### 1. aliyun-com/product-ecs (hand model, copied)

`m1/models/aliyun-com/product-ecs.json` → `m1/curated/aliyun-com/product-ecs.json` verbatim (task:
"HAND MODEL EXISTS … COPY it instead of re-curating"), then validate/render/eval. Value/summary,
4 values, infra scale (29 地域/90 可用区/500万 客户), 4 instance cards (e ¥99/月, u2a ¥1238/月,
c9i ¥1385/月, g9i), 4 product-news items. Residual 76 high = auto-draft-only tail strings the hand
story model intentionally does not carry; recorded, not chased.

### 2. 36kr-com/home (portal landing)

Structure recovered from the flat 100+-line draft: `_primary` = featured (what the original leads
with: the big story carousel).
- ADD `featured`: hero story GPT、Claude靠边站？一个"哑巴"AI成了硅谷大明星 + the 4 「36氪首发」
  financing stories shown as carousel thumbs (hrefs located in dom.html).
- ADD `feed` 最新文章: 37 article cards kept of the 39 painted (name = title, `_subtitle` = deck,
  `_detail` = 来自主题：X|Y · relative time; video card keeps 视频 · 3:20 · 《财经》新媒体; the
  项目推荐周榜 card's absolute date typed as `_datetime`), each with its own captured `/p/…` action;
  section action 查看更多资讯.
- ADD `topics` 专题推荐 (2 genuine cards + 查看更多 → `/topics`), `flash` 最新快讯 (4 items with full
  deck paragraphs from nodes.json, incl. 闲鱼 9.8万个/98358个、MiniMax v0.4.12/MIT、宁德时代
  151.26万股/300.89—302.63元/4.56亿元、中概股 涨超2%), `live` 推荐直播 (正在直播 AWE2027全域升维
  战略发布会 → `/live/detail/…`), `enterprise` 企业号 (氪睿研究院/行业新知 + latest-post links +
  进入企业号频道), `hot` 24小时热榜 (8 ranked items with captured relative times, `_rel.order=hot`).
- DROP top campaign banner (WISE2026 商业之王年度名册, ad), 3 ad cards (36氪出海·招募 / 2026云栖大会
  报名 / 股票舆情交流群 — adx.36kr.com click trackers), 2 promoted feed cards (造出一只灵巧手
  [商业策划, adx tracker], 运动耳机「新物种」[商业视角]), 广告-labeled topic card 36氪空天探索计划,
  hero video caption fragments ("LLMs requ…/that", mid-animation), top black nav + mega menus, left
  section nav, footer + ICP + 举报 links, right-rail floating QR widgets.
- 24小时热榜 rank badges (TOP1/TOP2/3–8) exist only as graphics — not in a11y facts, so order is kept
  and badge text is not invented.

### 3. 36kr-com/information-technology (channel/list)

- ADD `channels`: the 17 channel tabs (最新…其他) as a single-select `_expose` (pilot rule 9); the
  page IS the 科技 channel (title/url) — "selected tab" has no grammar slot (engine gap, logged).
- ADD `feed`: all 30 科技-channel articles (title + deck + author · time + own `/p/…` action,
  `_rel.order=time`), including the 12 tail articles the auto draft missed (新能源车险… only got as
  far as item 18). Feed 查看更多 is a lazy-load `div.kr-loading-more-button` with **no href** → not
  an action (dropped; control with no target).
- ADD `companies` 推荐企业 rail: 行业新知 (/user/6396564) + 氪睿研究院 (/user/6308858) +
  查看更多企业 → `/enterprises-list`.
- DROP nav/mega menus, left section nav, 换一换 shuffle control, 36氪企业招募正式开启 banner
  (screenshot-only ad iframe; no a11y backing → per F-025 not addable anyway), footer/ICP.

### 4. 36kr-com/search-ai and 5. 36kr-com/search-viz (search-results archetype)

Same skeleton (mirrors pilot huawei search-laptop):
- `query`: free-input `_expose` with captured placeholder 请输入关键词 + 站内搜索 `submit` action.
  Keyword (人工智能 / 数据可视化) lives in `_intent` only — it is in meta.json URL, not in a11y facts
  (pilot rule reused).
- `search-type` (文章…企业号) and `sort` (相关性 | 发布时间) as single-select `_expose` choice sets;
  current selection not expressible (engine gap, logged).
- `results`: all 20 results each as `_name` (title) + `_subtitle` (deck) + `_datetime` (date) +
  captured `/p/…` action. REPAIR: draft labels carried `<em>人</em><em>工</em>…` highlight junk and
  merged title+deck+date into one `_name`; titles re-taken from the clean `paragraph` nodes, decks
  from the deck links, dates from the date nodes (rule 6/7 below). Draft truncations repaired from
  capture names (e.g. …多样化图 → …多样化图表样本; 全解, 全打水漂 tails).
- DROP nav/mega menus, 36氪APP QR promo rail (前沿有料/订阅栏目/音频新闻), lazy-load 查看更多,
  footer/ICP.

### 6. airbnb-com/room-28871 (product-detail; draft was nav-soup, page re-derived from capture)

The draft held one skip-link action and a nav-soup summary (2 facts). The screenshot's middle is
unpainted, but nodes.json + jsonld carry the full listing story — facts came from the a11y oracle,
cross-checked against capture jsonld (name/description/4.86/815).
- `_primary` = overview: 房间 ｜ 荷兰北荷兰阿姆斯特丹; 1 张约 1.5 米宽双人床 · 共用卫生间;
  rating `_rating` 4.86 + `_rating-count` 815 + 评分为 4.86 星（满分 5 星）。+ in-page `key:reviews`
  link (815 条评价); host 入住 Edwin 的房源 / 超赞房东 · 16 年出租经验 / 了解Edwin的更多信息.
- ADD `highlights` (3 房源亮点 cards), `description` 房源介绍 (two complete intro paragraphs from the
  a11y container + 部分信息已自动翻译。 + 显示更多), `sleeping` (卧室 1 张约 1.5 米宽双人床),
  `amenities` (4 shown chips + typed `_count` 18 项便利设施 + 显示所有18项便利设施), `gallery`
  (5 captured photo names + 显示所有照片), booking panel (`添加日期以查看价格` summary; check-in /
  check-out date exposes; guests `_expose` num with captured 1 位客人; 查看可订状态; 举报此房源),
  `reviews` (总体评分 4.86/815; distribution 5 rows; 6 aspect ratings as compare items; 10
  客人评价提到 chips as `_name` + `_count`; 评价的运作机制; 显示全部 815 条评价).
- DROP skip link 跳至内容, global nav tabs 房源/体验/服务, site search bar, 成为房东,
  language/currency + main-menu buttons, hidden in-page section nav, title-translation tooltip
  (自动翻译后的标题为…), 显示原文 control (the unrevealed original text is not in the capture),
  reviews carousel controls (上一张 hidden / 下一步), "显示 7 项中的 7 项" expander state, footer
  (3 link columns, social, legal).
- F-025 in practice: airbnb is a JS app — the capture has NO hrefs for any listing action, so every
  action keeps `verb`+`label` and **no `to`**; the only captured href (#site-content) belongs to
  dropped chrome. Gallery photo buttons were NOT mapped to the 6 jsonld image URLs (5 ≠ 6, mapping
  would be guesswork). Screenshot-only content (none paintable beyond the gallery) was not invented.

## Residual classification (post-curation warnings)

- **36kr home (62 high)**: parent-container composites of card title+deck+meta whose every leaf IS in
  the model (~20); dropped nav/mega-menu/soup strings (~15); dropped ad cards + campaign banners (~6);
  dropped footer composites/ICP links (~12); 快讯 title+time+deck composites (leaves present).
- **36kr tech (33 high)**: same classes — menu soup (12), footer (11), card containers (7), 推荐企业
  composite (leaves present).
- **36kr search ×2 (32/33 high)**: result-card composites title+deck+date (leaves present, split by
  design), 36氪APP rail, footer, nav soup.
- **airbnb (28 high, 9 med)**: review-section container composites and star-badge composites
  ("5 星，88% 的评价 5" — trailing digit is the visual badge), mention chips "地段 616" (model has
  `_name` + typed `_count`; adjacency not expressible in one text node), rating composite
  "4.86 · 815 条评价" (typed instead); med = aspect-score aria headings (name+rating composite, both
  leaves typed) + dropped footer headings.
- **product-ecs (76 high)**: strings only the auto draft carried (long unparsed tail sections the
  hand story model doesn't encode).
- Zero residuals fit "real fact missing from model". The `&quot;` fidelity artifact is an EVAL issue
  (already logged by the pilot).

## Generalizable protocol rules (AA batch; inherits + amends the pilot's 10)

1. **Split the oracle** (pilot 1, applied): nodes.json `name` = facts; full.png = emphasis; now with
   F-025: **dom.html = URL oracle; jsonld.json = cross-check oracle.** Unpainted screenshot regions
   are curatable when the a11y capture carries the facts (airbnb middle).
2. **URLs are verbatim-or-absent (F-025, applied)**: every kept `to` was grepped in that page's
   `dom.html`; relative hrefs absolutized only by prefixing the meta.json `url` origin
   (`https://36kr.com`). Actions whose target is not in the capture keep `verb`+`label` with no `to`
   (airbnb buttons); one-to-N or unmappable references (6 jsonld images vs 5 gallery buttons) are not
   resolved by guessing; screenshot-only ads (企业招募 banner) are dropped, not encoded.
3. **money.qualifier (F-024)**: available for From/起/每月 price qualifiers; AA pages contain no
   qualified prices (airbnb price state is the literal copy 添加日期以查看价格 → `_summary` text).
   Zero uses in this batch; the mechanism stays mandatory for priced catalogs.
4. **Drop by role** (pilot 2) with AA instances: mega menus/soup, campaign + adx-tracker cards,
   广告-labeled cards, app-QR promo rails, widget shuffle controls (换一换), lazy-load 查看更多
   (no href ⇒ not an action), carousel prev/next, skip links, translation-UI controls (显示原文,
   tooltip), expander state strings (显示 7 项中的 7 项), footer sitemap/ICP. Graphic-only badges
   (热榜 TOP1) keep order, drop the unbacked text.
5. **Feed/list = the story** (pilot 6 analog for feed archetypes): encode the full item set — home
   37/39 cards (2 promoted dropped), tech 30/30, search 20/20 — merging the duplicate title-link +
   deck-link pair into one item (`_name` + `_subtitle`), attribution in `_detail` (author · relative
   time) and absolute dates typed as `_datetime`.
6. **Strip rendering junk from labels**: search-highlight `<em>` tags are page-render artifacts;
   titles come from the clean `paragraph` nodes, never from `link.name` with tags (drafts kept them).
7. **Composite-split coverage artifact**: a11y containers concat title+deck+meta into one string;
   structured models match leaves, so container warnings surface post-curation. Classify residuals
   ({composite container, dropped chrome, capture artifact, type-system gap}); never re-merge fields
   or keep junk fragments to suppress warnings (extends pilot's artifact note).
8. **Search archetype = control triple + dated results**: free-input expose (placeholder as `_label`)
   + submit action; type/sort tabs as single-select exposes over `_items`; results as items with
   `_datetime`. Keyword from meta.json URL goes to `_intent`, never to facts (pilot rule reused).
   Current tab/sort selection has no grammar slot — engine gap (also affects channel tabs).
9. **Type everything the vocabulary can say** (pilot 7, applied): `_rating`/`_rating-count`,
   per-aspect `_rating`, mention/amenity `_count`, `_datetime` for ISO dates, date/num `_expose` for
   booking inputs (captured current values kept as visible `_summary`). Relative times (31分钟前)
   stay text — no ISO fact exists.
10. **Capture-artifact truncation ends the fact** (extends F-023 spirit): airbnb's 200-char-capped
    accordion cuts off mid-section (…客人使用权限 一间卧室和) — keep the complete sentences, drop the
    cut section and its dangling fragment; log the residual instead of reconstructing.

## Deliverables

- Models: `m1/curated/aliyun-com/product-ecs.json` (hand-model copy),
  `m1/curated/36kr-com/{home,information-technology,search-ai,search-viz}.json`,
  `m1/curated/airbnb-com/room-28871.json` — all `node m1/validate.mjs` clean (0 errors).
- Renders + full-page screenshots: `m1/curated/renders/<site>-<page>.html|.png` (root `_primary`
  renders first, confirming the F-024 renderer fix); auto-draft baselines kept as
  `m1/curated/renders/auto-<site>-<page>.html`. Screenshots via `shoot.mjs` (on-disk headless shell
  + playwright-core).
- Evals re-run before/after per page: `node m1/eval/metrics.mjs` + `node m1/eval/source-coverage.mjs`
  (numbers above). Nothing outside `m1/curated/**` written; nothing committed.
