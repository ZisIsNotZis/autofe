# M3 curation batch AE — log (auto draft → curated model)

Date: 2026-09-28. Worker: batch AE of the exemplar fan-out, per
`.scratch/04-m3-curation/spec.md` + pilot protocol (`curation-log.md`) +
amendments F-024 (money.qualifier) and F-025 (URLs verbatim from capture;
relative hrefs absolutized against meta.json origin; capture-unbacked facts
dropped). Scope: writes under `m1/curated/**` only; nothing committed.
Oracles: `nodes.json` full `name` = facts, `full.png` = emphasis, `dom.html` =
URLs (F-025), `meta.json`/`jsonld.json` = page metadata (title, publish date).

## Results overview

| page | validate | factFidelity before → after | coverage high before → after | med | info |
|---|---|---|---|---|---|
| mi-com/search-phone | ok (0 errors) | 1.000 (83/83) → **1.000 (85/85)** | 2 → **63** * | 0 → 0 | 1 → 64 * |
| mi-com/shop-category-list | ok (0 errors) | 1.000 (222/222) → **1.000 (161/161)** | 1 → **13** * | 0 → 9 * | 1 → 60 * |
| sspai-com/home | ok (0 errors) | 1.000 (37/37) → **1.000 (86/86)** | 4 → **14** * | 0 → 0 | 8 → 4 |
| sspai-com/matrix | ok (0 errors) | 1.000 (26/26) → **1.000 (83/83)** | 14 → **15** ~ | 0 → 0 | 13 → 7 |
| sspai-com/post-102392 | ok (0 errors) | 1.000 (40/40) → **1.000 (18/18)** | 2 → **9** | 0 → 0 | 7 → 17 |
| sspai-com/post-114699 | ok (0 errors) | 0.976 (82/84) → **1.000 (55/55)** | 19 → **19** | 0 → 0 | 8 → 28 * |

Storyline tau: search-phone None → 1 (curated `_items` titles align with the
capture's 20 product headings); post-114699 1 → 1; post-102392 1 → 1;
shop-category-list 1 → None (metric artifact: curated storylines are 150
item names that match link nodes, not heading-role strings, so the
heading-based tau has <2 pairs); sspai home/matrix None in both runs (source
capture has no heading-role nodes; order curated from DOM order).

\* Reads as an increase but is a measurement artifact, same family the pilot
logged for apple/aliyun — see "Why coverage warnings rise after curation".
~ matrix high +1 net: −11 (timestamps added as facts) +12 (unlabeled count
badges surfaced, one sidebar-container concat) — all classified below.

## Why coverage warnings rise after curation (read before comparing)

1. **Typed prices vs currency glyph.** `元` renders as `CNY`
   (`{money, currency}` → "4999 CNY"), so every standalone `XXXX元` source
   string loses its substring match: search-phone +30 high, one per priced
   item (pilot rule 7, F-024 family; qualifier now works — see the 订金
   presale card — but currency rendering is still a MODEL/render gap to log,
   not to chase). The before-draft embedded prices inside flat action labels,
   which suppressed the same warnings.
2. **a11y card-string concatenation.** Source a11y names join
   name+price+rating+button-state into one string ("米家智能血压计 269元
   23.3万人好评 加入购物车 成功加入购物车", "蓬岸 90昨天 11:11", bylines
   "少数派编辑部 17:58"). A structured model splits these into typed facts, so
   the concatenation can never match contiguously again. Classified, not lost:
   every component fact is present in the render.
3. **Dropped chrome surfaces its own labels.** After dropping nav/footer/ICP
   the short link labels reappear as info (search-phone 1 → 64, all nav/footer
   labels; shop-category-list 1 → 60) and numbered/legal strings as high —
   "a drop can never reduce its own warning" (pilot, search-laptop note).
4. **Icon-font glyphs defeat matching.** Section headings carry a U+E61x glyph
   prefix in the a11y name (`\ue61a手机`); curated titles keep the readable
   text only (glyphs are decoration, and keeping them would be the
   fragment-gaming the pilot banned). shop-category-list med 0 → 9 is exactly
   its 10 section headings minus 1 (家电 matched via another node).
5. **Unlabeled numeric badges dropped.** Matrix post cards show two counts
   next to private-use icon glyphs (no text says "评论"/"赞"); the 早报速览
   TOC shows a number per section. With no capture text stating what they
   count, they are dropped (rule AE-3 below), and the strings that contained
   them surface as warnings.

## Per-page decisions

### 1. mi-com/search-phone (search results, keyword 手机 from meta URL)

- SET `_primary` = results grid (20 phones). Root `_title` from meta.json
  (document title; no heading-role node exists for it).
- KEEP query: site search box as free-input expose (`keyword`); the stale
  "冰箱" prefill captured in the box is noted in `_intent`, not carried as a
  page fact.
- ADD filters as choice sets + exposes: category (全部/红米手机/小米手机),
  sort (综合/新品/销量/价格 — trailing icon glyph `\ue62f` dropped from the
  label), three checkbox filters 促销/分期/仅看有货 as bool exposes, 收货地
  kept as `_region` fact (picker action dropped: overlay content not captured).
- ADD all 20 result cards as `_items`: `_name` (heading text incl. RAM/ROM),
  typed `_price` money CNY, card-level `open` action to the verbatim
  `//www.mi.com/shop/buy?product_id=…&cfrom=search` href (absolutized). The
  presale card Xiaomi 18 Pro系列 uses **F-024 money.qualifier**:
  `{money: 9.9, currency: CNY, qualifier: 订金}`.
- ADD 猜你喜欢 as its own storyline: 10 items with `_name`/`_price`/
  `_rating-count {num, unit: 人好评|万人好评}` + per-item `add-to-cart`
  (domain verb) action labelled 加入购物车; "成功加入购物车" is aria feedback,
  dropped. `_primary` of the storyline = first card.
- DROP: top utility bar + logo + category nav, breadcrumb 首页>全部结果 (§8),
  pagination 1/2/3 (results navigation; full first page is modeled),
  card badges 新品/限时抢/加价购 (screenshot-only, zero capture backing →
  F-025 drop), strikethrough old prices (no was-price role in the closed
  vocab — 7 dual-price strings left as classified high warnings), service
  strip + hotline 950816/950818 (the draft had attached the hotlines to 猜你
  喜欢 as `_measure` — repaired by dropping), 5-column footer, ICP/legal.
- Repairs: draft's flat labels "Xiaomi 15 Ultra 12GB+256GB 4999元" →
  `_name` + typed `_price`; "米家电动剃须刀S100 云纹刀网版 99元 870人好评
  加入购物车 成功加入购物车" → name + money + rating-count + labeled action.

### 2. mi-com/shop-category-list (category directory, 10 sections / 150 links)

- SET `_primary` = phones section (page leads with it).
- The page IS a directory: per pilot rule 6 the discriminator ("fact or only a
  jump") would drop everything, so rule AE-1 below applies — the whole-page
  catalog is the story; every item carries `_name` + verbatim `navigate` URL
  (search-keyword or product_id hrefs from DOM, absolutized).
- Section titles keep readable text only (`手机` not `\ue61a手机`).
- DROP: breadcrumb, top nav, right floating widget (手机APP 扫码…/个人中心/
  售后服务/人工客服/购物车), service strip, footer 5 columns, ICP/legal —
  the 13 residual highs are 100% this class.
- Draft repair: 191 flat navigate links → 10 titled storylines × `_items`;
  the draft's root `_summary` ("购物车中还没有商品…") was cart-overlay
  chrome — dropped.

### 3. sspai-com/home (content portal)

- SET `_primary` = feed (the page's content story); banner storyline carries
  its own `_primary` = the iPhone 18 配件 hero card.
- RESTRUCTURE into: banner (5 hero cards, `_tag` 开学季/会员文章, `_subtitle`
  「正常」已是不易), editors (派早报 周五 18 / 新玩意 #250 / 近期值得关注的
  App / 196 张盗版碟 / YoooClaw 众测), promo-rail (iPhone 精选配件 with
  visible 点击购买 label; 快速投票 + `_count {num:708, unit:位派友参与}`),
  campaigns (5 众测/新品 cards + 白描 blurb), feed-tabs (推荐/全部内容/话题
  讨论/热门内容/关注, single-select expose, 推荐 current), feed (12 entries:
  `_title`/`_author`/`_subtitle` time/`_tag` 会员内容·派早报·Matrix精选 +
  card `open` to verbatim post URLs), prime (2 community posts with
  complete-sentence body excerpts, 参与讨论 → /t/… links, `follow` action —
  domain verb — labelled 关注), friends (派友在看 3 items with tags 深度好文/
  盲盒文章).
- DROP: top nav + icon-only buttons, the "无需申请，自由写作…" promo overlay
  (banner-role popup), author-spotlight image card (卓越贡献作者（26Q2）/
  知道分子吴先先 — image-only promo card, only text is a credit line),
  footer + ICP, floating action buttons.
- F-025: all 39 written URLs verified present in dom.html (post/a/bullet/
  create/u/prime paths, some absolute, some `//`-relative → absolutized).

### 4. sspai-com/matrix (community square)

- SET `_primary` = feed; `_title` "Matrix 社区" (visible H1; the meta
  description goes into `_intent`).
- ADD 开始创作 (→ /write, verbatim href) as the page action; feed-view choice
  set 精选/热门/随便看看 with their /matrix, /matrix/hot, /matrix/random
  hrefs as navigate actions (view switcher = feed state, kept); feed = 20
  posts with `_title`/`_author`/`_subtitle` timestamp + card `open` to the
  verbatim /post/NNNNNN hrefs, `_rel.order: time`, 加载更多 as operate.
- ADD sidebars: 一派 card (vote 快速投票：换机只选 512GB 起步？ → /bullet/
  1789222518; 我来说一说 operate; 更多一派讨论 → /matrix/pods), 值得关注
  (5 authors with verbatim bios, /u/ hrefs), 专栏推荐 (3 columns with
  `_count {num, unit:人关注}`, /column/ hrefs, 查看全部 → /columns).
- DROP: header tabs 社区广场/专栏/一派 (navigation role → sibling Matrix
  pages = section nav), unlabeled numeric badges (`\ue9409\ue91d0` — icon
  glyphs + counts with no textual label; AE-3), footer/ICP, floating buttons.
- Draft repair: 20 merged "title author 90date" strings → separate
  title/author/timestamp facts; draft had dropped the entire sidebar and
  加载更多/开始创作 actions.

### 5. sspai-com/post-102392 (HAND MODEL — copied, one F-025 repair)

- Copied `m1/models/sspai-com/post-102392.json` → `m1/curated/` per task
  (no re-curation). Validates 0 errors; fidelity 1.000 (18/18); tau 1.
- F-025 SPOT-CATCH (reported to parent, decision on file): the hand model's
  `closing → https://github.com/MadMaxChow/VLOOK` is in **no** capture
  artifact. Per supervisor decision, MY COPY was repaired one-string to the
  capture-verbatim anchor target of "VLOOK 简介":
  `https://sspai.com/link?target=https%3A%2F%2Flink.zhihu.com%2F%3Ftarget%3D
  https%253A%2F%2Fmadmaxchow.github.io%2FVLOOK%2Findex.html`.
  `m1/models/**` untouched (parent fixes the hand model itself). The model's
  other URL (`/post/114453`) is capture-verbatim (2× in DOM).
- Residual 9 high = the hand model's own scope (related-article bylines at
  page bottom, ICP) — inherent to copying, not curation loss.

### 6. sspai-com/post-114699 (morning briefing)

- SET `_primary` = news (the 7-item briefing). Root identity: `_title`,
  `_author` 少数派编辑部, `_datetime {date: 2026-09-18}` (jsonld
  datePublished; visible badge 周五 18 kept as `_subtitle`), `_tag` 派早报,
  meta storyline "08:17 8 分钟阅读" + 责编 @北鸮.
- ADD 7 news items: `_title` (heading) + `_summary` + labeled 来源 action.
  Capture truncation: paragraphs are capped at 200 chars mid-sentence, so
  summaries are the **complete-sentence prefix of the captured string** —
  selection, not rewriting (rule AE-2). Bose item keeps the real figure
  caption 左：Sports Open Earbuds；右：Ultra Open Earbuds (2nd Gen) as
  `_subtitle`; two items carry their visible 发表首评 actions.
- ADD 8 briefs (不妨一看的简讯) with complete-sentence summaries + 来源
  (trailing "来源" link text trimmed from the sentence; the label lives on the
  action), 4 近期动态 items with their labeled CTAs (了解更多/点击了解/来晒
  你的成绩单/欢迎选购 → verbatim targets), 你可能错过的文章 (3),
  往期派早报 (5, weekday+day `_subtitle`, /post/ hrefs, 查看全部 → /tag/派
  早报), support (`_count {num:11, unit:位派友已充电}` — the 充电 button is
  icon-only in this capture, so unlike the post-102392 hand model it gets no
  invented label), discussion as the empty-collection pattern (`_items: []` +
  `_empty` 暂时还没有评论…, 说点什么... input expose, 默认/热门 sort expose).
- DROP: 早报速览 TOC (duplicates all 8 section titles verbatim = merge rule;
  its per-item numbers are unlabeled), item-1 hot-comment strip (5 commenter
  names + texts + 全部讨论 6 + 28 — discussion tail behind 全部讨论),
  "11 评论" count next to an unlabeled icon (cannot be honestly typed),
  ad banner (Quote/0 摘录日常销售 + 关闭广告), App 内打开 bar, share overlay
  (微信扫码分享…), contact float, © 转载 boilerplate, top nav, footer/ICP.
- Fixes fidelity 0.976 → 1.000: the draft's two misses were junk facts
  (`_measure {num:18}` from the 周五 18 badge, `_summary 周五` at root);
  both re-derived into honest fields.

## Protocol rules applied/extended (batch AE; numbers continue the pilot list)

1. **A whole-page directory is a story, not a link farm** (extends pilot rule
   6): the rule-6 discriminator (fact vs jump) applies to link-farm sections
   embedded in pages with their own content; when the page's purpose IS the
   catalog (all-category listing, sitemap), encode the full taxonomy with
   verbatim URLs.
2. **Truncation handling: complete-sentence prefix, never splice, never
   continue** (extends repair rule 3): when the capture caps a string
   mid-sentence (sspai caps at 200 chars), keep the longest complete-sentence
   prefix; never merge fragments across a cut, never guess the continuation.
   A clause-level "cleanup" inside one sentence is rewriting, not selection.
3. **Unlabeled numbers are not facts** (sharpens verifiability rule 5): a
   number whose meaning is only carried by an icon glyph (comment/like counts,
   TOC badges, the "11" next to \ue933) has no honest role in the closed
   vocab — drop and classify, don't guess units.
4. **Icon-font glyphs are decoration**: strip private-use glyphs from labels
   and titles (价格\ue62f → 价格, \ue61a手机 → 手机) and log the metric
   mismatch they leave behind (med/info warnings) as an eval artifact.
5. **aria feedback is not copy**: states like 成功加入购物车 / 默认默认热门 /
   doubled names ("Xiaomi MIX系列 Xiaomi MIX系列") collapse to the visible
   form; the visible form is the label or fact.
6. **URL discipline (F-025 operative form)**: every `to:` must be found in
   dom.html (or a11y urls) before writing — absolutize `//host/x` and `/x`
   against meta.json origin; anchors' visible text may differ from the draft's
   label (点击购买, 来晒你的成绩单 come from the anchor text, not invented).
   Applied as a scripted pre-write check on all 80+ URLs in this batch; it
   caught the one fabricated URL in the hand model.
7. **Coverage deltas must be classified, not minimized**: batch AE confirms
   the pilot's warning — curation that types facts and drops chrome *raises*
   raw warning counts (concatenation artifact + currency rendering + dropped
   chrome resurfacing). Every residual high in this batch belongs to one of:
   {currency-glyph type gap (30), was-price vocab gap (7), a11y card/byline
   concatenation (~40), dropped nav/footer/legal chrome (~35), unlabeled
   badges (~15), icon-glyph eval artifact (9 med + few info)}. Zero warnings
   were chased by keeping junk.

## Deliverables

- `m1/curated/mi-com/search-phone.json`, `m1/curated/mi-com/shop-category-list.json`,
  `m1/curated/sspai-com/home.json`, `m1/curated/sspai-com/matrix.json`,
  `m1/curated/sspai-com/post-102392.json` (hand model copy + 1-string F-025
  repair), `m1/curated/sspai-com/post-114699.json` — all validate 0 errors.
- Renders + full-page screenshots: `m1/curated/renders/<site>-<page>.html|.png`.
  Auto-draft baselines were rendered to /tmp for the BEFORE evals (the strict
  file scope for this batch does not include `auto-*` files in renders/).
- Nothing outside `m1/curated/**` was written; `curation-log.md` (pilot-owned),
  `m1/models/**`, `m1/extract/**`, `corpus/**`, `tools/**`, `docs/**` untouched;
  nothing committed.
