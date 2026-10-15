# M3 curation batch AD — log (auto draft → curated model)

Date: 2026-09-28. Worker: batch AD of the exemplar fan-out, per `.scratch/04-m3-curation/spec.md` protocol + pilot rules (`curation-log.md`) + F-024 (money.qualifier) + F-025 (verbatim URLs; screenshot-only facts need capture backing or get dropped).
Scope: writes under `m1/curated/**` only (6 curated models, 6 curated renders + screenshots, 6 auto-draft baseline renders, this log). Nothing committed. `curation-log.md` (pilot-owned) untouched.
Oracles: `nodes.json` full `name` = facts; `full.png` = emphasis; `dom.html` hrefs = URL oracle (nodes.json carries **no** href field — verified).

## Results overview

| page | validate | factFidelity before → after | storyline tau before → after | cov high before → after | cov med before → after |
|---|---|---|---|---|---|
| huawei-cn/home | ok (0 errors) | 1.000 (19/19) → **1.000 (29/29)** | 0.73 → **1.0** | 9 → **8** | 4 → 4 |
| huawei-cn/search-phone | ok (0 errors) | 1.000 (7/7) → **1.000 (10/10)** | — → — (no source headings) | 6 → 6 * | 3 → 3 * |
| linear-app/home | ok (0 errors) | 1.000 (182/182) → **1.000 (22/22)** | 0.38 → 0.2 | 43 → **145** * | 2 → 5 * |
| mi-com/home | ok (0 errors) | 1.000 (45/45) → **1.000 (2/2)** | — → — | 2 → **11** * | 0 → 0 |
| mi-com/product-detail-mi15 | ok (0 errors) | 1.000 (77/77) → **1.000 (22/22)** | 1.0 → — | 11 → **18** * | 0 → 2 * |
| mi-com/search-earbuds | ok (0 errors) | 1.000 (85/85) → **1.000 (122/122)** | −1 → **1.0** | 2 → **64** * | 0 → 0 |

\* Increase is the pilot's measured artifact, not lost coverage: the auto drafts carried footer text, price fragments (`369元 399元 补贴10%` as one action label) and demo-app strings as model "facts", which substring-suppressed large warning sets. Curation drops those fragments, so their source strings surface again. Every residual is classified below; the dropped strings are still in the source, so a drop can never reduce its own warning. Details per page.

## Page decisions

### 1. huawei-cn/home (corporate landing)

Kept as 5 storylines, order = original: hero carousel → 我们的业务 → 推荐信息 → 新闻动态 → brand.
- **ADD hero** as 2 carousel slides with their captured links: `HUAWEI Mate XT 2 非凡大师` (→ consumer.huawei.com mate-xt-2 page, `了解更多`) and `华为全联接大会2026` (→ `/cn/events/huaweiconnect` absolutized). Root `_primary` → hero; hero `_primary` → active slide (screenshot emphasis).
- **ADD 我们的业务** 6 cards (`_name` + whole-card `open` action, F-020 — no invented label).
- **ADD 推荐信息** 4 cards, each `_title` + `_detail` + `了解更多` action with the card's own DOM URL (bank case study / 乾崑 200万 campaign / Idee2026 expo / WATCH 6 Pro). The draft had these only as a merged text blob; split per card.
- **ADD 新闻动态** 6 items with `_title` + card-level action (verbatim DOM urls `//www.huawei.com/...` absolutized) + `更多新闻` on the storyline; **MERGE** the 6 identical dates `2026年09月18日` into one storyline `_datetime` (rule: stated-N-times facts merge to the node that owns them).
- **ADD brand** section (1987 founding summary + `了解华为`).
- DROP: 集团网站/选择区域/语言 utility bar + 30-language mega list (site chrome); main nav + logo + cart/search icons (nav); breadcrumb 首页 (§8); carousel prev/next arrows + indicator tabs (carousel controls); `智启新未来` slide (image-alt only — no captured title/action, nothing curatable); `icon enterprise homepage`-style icon alt junk; 在线客服 floating widget (overlay); footer search box + 5 link columns + social + ICP/版权 (footer sitemap/legal).
- Residual high 8: footer `发现华为`/`华为技术专栏`/`智能世界2035` columns + ICP numbers (irreducible drops) + the expo card's English image alt `International Digital Energy Expo (IDEE) 2026` and its date `2026-09-15-17日 中国，深圳` — the latter is an **eval artifact**: `source-coverage` normDate()s the source side (`2026年09月15日-17日` → `2026-09-15`) but not the render, so a model carrying the visible copy can never match. Not fixable without storing non-visible normalized strings (metric gaming — refused).

### 2. huawei-cn/search-phone (0-result search page)

Same archetype as the pilot's search-laptop; curated from its own capture: query searchbox (`请输入关键字`, free-input `_expose`), 5 category filters with `(0)` counts + `重置` (operate), results `_count {num:0, unit:条结果}` + `_items: []` + `_empty` (没有找到相关结果). Keyword `phone` lives in `_intent` only (meta.json URL, not in nodes.json — pilot precedent).
- DROP: same chrome set as search-laptop (utility bar + language mega list, nav, breadcrumb, 相关性 sort — option set not in capture, footer, 在线客服 widget — the draft had wrongly attached it as page `_image` with empty URL).
- Residual high 6 / med 3: 100% footer/legal chrome (华为技术专栏…, ICP) — identical profile to search-laptop; irreducible.

### 3. linear-app/home (hand model COPY — no re-curation)

Copied `m1/models/linear-app/home.json` → `m1/curated/linear-app/home.json` verbatim per assignment; validate/render/eval only.
- Result: 0 errors, fidelity 1.000 (22/22), tau 0.2.
- Coverage high 43 → **145**: the hand model predates coverage-driven curation; it keeps 22 facts where the auto draft carried 182 (including many demo-app strings that suppressed warnings). Surfaced residuals are overwhelmingly **embedded demo-app UI** — the page embeds a live Linear demo whose issue IDs (`DRV-8852`, `DRV-364`), PR text (`Changed 2 files +22 −10`, `master ← ride/drv-364-reset-dimmed-rows`), cycle tables and changelog entries render as real DOM. Per protocol that is a drop class (embedded app UI, not marketing content) — recorded here, **not** fixed, because the assignment was copy-as-is. Flagged for the parent: the hand model and the curated protocol now measurably diverge on this page.

### 4. mi-com/home (homepage with zero capture-backed content)

Decisive F-025 case. The painted page is 7 full-bleed product banners (SKYNOMAD 小米澎程 / Xiaomi 18 Fold / Xiaomi 17 Ultra / Pad 9 Pro Max / REDMI Turbo 5 Max / Smart Band 10 Pro / Sound 2 Max, each with 了解更多/了解详情) — **none of it exists in nodes.json, a11y.json or dom.html** (checked all names: 0 hits; only the footer at y≈6300+ is in the DOM). Screenshot-derived facts need capture backing or get dropped → **all banners dropped, not transcribed from pixels**.
- KEPT: page identity only — `_title` `Xiaomi官方网站 | 以人为中心，构建"人车家全生态"` (DOM `<title>`) and `_summary` `让全球每个人都能享受科技带来的美好生活` (meta description, verbatim in dom.html); `_primary` → `_summary`.
- DROP with reasons: top nav/Location/登录/注册 (site nav); footer 5 columns + hotlines 950816/950818 + 人工客服 + legal band + 诚信网站 badges (footer sitemap/service/legal chrome); slogan element `探索黑科技，小米为发烧而生` (image-replacement hidden text, not painted).
- Residual high 11 / info 52: the dropped footer strings (hotlines, ICP numbers, footer links) unsuppressed — irreducible-by-design; the auto draft's low numbers (high 2) were the suppression artifact, not coverage.

### 5. mi-com/product-detail-mi15 (pet air purifier product page — slug is a misnomer)

**Slug note (per supervisor decision)**: `product-detail-mi15` is a historical misnomer — meta.json url is `product_id=21096`, page title `米家宠物空气净化器立即购买-小米商城` (Mijia Pet Air Purifier). The announced hand model `m1/models/mi-com/product-detail-mi15.json` does not exist anywhere (verified repo-wide); supervisor ruled: curate the auto draft per protocol, honestly as the pet air purifier page; slug fix queued for a later corpus housekeeping pass — **no renames done here**.
- **PRICE CORRECTION**: the auto draft carried `_price 2999 CNY` — that is the strikethrough **original** price. The capture (`1439 元2999 元`, orange current + gray deletion) shows the real selling price is **1439 元** (国补 promo). Curated: `_price {money:1439, currency:CNY}` + `_amount {money:2999}` (was-price). Lesson: check both members of a price pair, not just the first.
- KEPT: product identity (title, promo summary `产品站领国补资格下单省10%净除多种宠物异味丨…`, `_provider 小米自营`, current+was price); coupons (`优惠券`/`【惊喜券】智能好物20元券等6 种优惠券` + `立即领取` operate); delivery (place 北京 北京市 海淀区 清河街道 + `_status 有现货` + `修改` operate); color choice `白色` (single `_item` — capture has exactly one, `_primary` marks it selected); buy actions `加入购物车` (add-to-cart) / `喜欢` (toggle); `用户评价` (open → verbatim `https://www.mi.com/shop/comment/21096.html`); assurances list (`发货说明`, `7天无理由退货（到店自取拆封后不支持）`, `运费说明`, `企业信息`, `售后服务政策` → verbatim m.mi.com policy URL, `7天价格保护` → verbatim s1.mi.com FAQ URL). Assurances repeat `小米自营` — merged into `_provider` (stated-2×-merge).
- DROP: login nudge bar `为方便您购买，请提前登录 立即登录` (login chrome); right-rail floating widgets (`手机APP 扫码领取新人百元礼包`/个人中心/售后服务/人工客服/购物车) (overlay chrome); cart-empty popup `购物车中还没有商品…` (widget state, not page story); header nav + searchbox with stale pre-fill `耳机` (chrome; the pre-filled value is not this page's query); 官方微信/价格说明 footer headings; entire footer.
- **DROP (F-025)**: the ~24,000px marketing/spec body between the buybox and the footer (y≈958→25255) is painted image banners with **zero text nodes** — screenshot-only, no capture backing, not transcribed. Residual med 2 (`官方微信`/`价格说明` headings) + high (footer service strip, hotlines, ICP, `1439 元`/`2999 元` 元-unit class) all classified/irreducible.

### 6. mi-com/search-earbuds (search results page)

The draft flattened every product card into one merged action label (`REDMI Buds 8 Pro 冰釉白 369元 399元 补贴10%`) — fragment "facts" that had substring-suppressed ~50 coverage keys. Curated splits and types:
- **ADD results**: 20 `_items` (page 1), each `_name` / `_price` money CNY / `_amount` was-price where struck through / `_tag` (`补贴10%`, `补贴15%`, `新品预约`) / card-level `open` action to the card's verbatim DOM URL (`//www.mi.com/shop/buy?product_id=…&cfrom=search` absolutized; all 20 verified in dom.html).
- **ADD filters** `分类` (5 options, `全部` selected via `_primary`), **ADD sort** `综合/新品/销量/价格` (`综合` selected; the 价格 arrow glyph `\ue62f` is icon junk — repaired to `价格`), **ADD delivery** `_place 北京 北京市` (收货地), **ADD conditions** 促销/分期/仅看有货 as three independent bool `_expose`s (checkboxes, not a single-select set).
- **ADD pagination**: items `1` (current, `_primary`) and `2` — no action on either (the DOM target is `javascript:void(0)`; inventing a page-2 URL is forbidden). Next-arrow `\ue624` icon-only → dropped.
- **ADD 猜你喜欢** 10 recommendation items (slide 1 only — slide 2 is not painted/captured): `_name` + `_price` + `_rating-count` (`{num:23.3, unit:万人好评}` etc.) + card action (verbatim `//www.mi.com/buy?product_id=…`) + child `cart` action (`add-to-cart`, label `加入购物车`, domain verb).
- DROP: black utility bar + cart/login cluster (site chrome); header nav + searchbox with stale pre-fill `冰箱`; breadcrumb 首页 > 全部结果 (§8); `成功加入购物车` toast (transient feedback artifact); `Go to slide 1/2` buttons (carousel controls); pre-footer service strip (预约维修服务/7天无理由退货/15天免费换货/满69包邮/1100余家售后网点 — aliyun precedent: service band); footer.
- Residual high 64: 50 are the **元-unit class** (source `369元`/`369元 399元` vs typed render `369 CNY` — the type gap the pilot logged in rule 7, same family as From/起; ~30 priced facts × key variants); 14 are footer/service-strip/legal chrome. All classified, none chased. Fidelity 1.000 on 122 facts; tau −1 → 1.0 (draft had 39 storylines with 2 heading matches; curated order follows the painted grid).

## Generalizable rules applied (batch AD additions to the pilot protocol)

1. **URL oracle is dom.html, not nodes.json**: nodes.json carries no href. Verify every action `to` against capture DOM hrefs; absolutize protocol-relative (`//www.mi.com/…`) and root-relative (`/cn/news`) forms against the meta.json url origin; unescape `&amp;`. No URL may be constructed from brand + guessed path (F-025); where the DOM target is `javascript:void(0)`, keep the control as a choice item **without** an action rather than inventing a target.
2. **Screenshot-only facts get dropped, not transcribed** (F-025 amendment): mi-com/home's 7 banners and mi15's 24k-px spec body have zero capture text → dropped. The coverage metric scans nodes.json only, so this class never warns — honesty here is enforced by process, not by the metric.
3. **Flattened cards are re-derived, not repaired in place**: auto drafts merge card = name+price+was-price+tag+URL into one action label. Re-split into `_name`/`_price` (money)/`_amount` (was-price)/`_tag`/card action; fragments then leave the model, which unsuppresses their coverage keys (measure artifact — classify, don't re-add junk).
4. **Price pairs need both members read**: the draft took the first price in the buy box (2999 = was-price) as `_price`; the painted current price (1439, orange) and the `deletion`-role strikethrough decide which is current (mi15).
5. **Typed values beat warning counts**: `369元` vs `369 CNY` costs one high warning per priced fact (元-unit gap, same family as From/起 per F-024). Keep typed money; log the gap; never fall back to untyped strings to silence warnings.
6. **Transient/stateful chrome classes**: login nudges (为方便您购买…), cart-empty popups, add-to-cart toasts (成功加入购物车), stale header-search pre-fills (冰箱/耳机), floating side rails — all chrome/artifact, dropped with reasons. The real search keyword lives in meta.json URL → `_intent` only.
7. **Embedded demo-app UI is a drop class of its own** (distinct from nav/footer chrome): linear-app's in-page product demo contributes dozens of look-alike "facts" (issue IDs, PR diffs, cycle rows). The hand model kept some; copy-only curation inherits those residuals — record, don't silently fix.
8. **Independent checkboxes are not single-select sets**: 促销/分期/仅看有货 get individual bool `_expose`s; only true radio/choice sets (分类, sort, color) get `_items` + one choice `_expose` with `_primary` marking the selected option (emphasis from the screenshot).

## Deliverables (this batch)

- `m1/curated/huawei-cn/home.json`, `m1/curated/huawei-cn/search-phone.json`, `m1/curated/linear-app/home.json` (copy), `m1/curated/mi-com/home.json`, `m1/curated/mi-com/product-detail-mi15.json`, `m1/curated/mi-com/search-earbuds.json` — all validate with 0 errors.
- Renders + full-page screenshots: `m1/curated/renders/<site>-<page>.html|.png`; auto-draft baselines `m1/curated/renders/auto-<site>-<page>.html`.
- Evals run before (auto draft) and after (curated) with `node m1/eval/metrics.mjs` + `node m1/eval/source-coverage.mjs`; numbers above.
- Nothing written outside `m1/curated/**`; nothing committed.
