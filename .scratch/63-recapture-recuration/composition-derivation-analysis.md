# S1b — can a page's archetype be derived from business structure alone?

Status: analysis (read-only). No engine, model, doc or pipeline file was modified; the probe lives outside the repo.

**Verdict.** Partly, and not enough for totality. Five of the ten archetypes are nameable from structure with one clean predicate each and zero per-page exceptions — `search-results`, `table-heavy/admin`, `form/checkout/settings` (as far as "auth gate"), `product-detail` (7/8), and a narrow reading measure for `article/editorial` (2/5). The other five are not: after all five predicates run, **19 of the 40 pages fall into one residue bucket spanning 8 of the 10 labels**, and no predicate over the measured features splits it. The missing information is not a better threshold; it is one page-level semantic bit (the page's *scope*: whole-site entry vs one category) plus a subject-kind bit for the three n=1 archetypes. So: archetype is **not** a single separate semantic fact, but it is also **not** a pure structural function of the current model — it is a small declared page fact composed with structure.

The engine bug is therefore not a mis-ordered decision tree: `pageLayoutOf` answers a different question (page width/alignment) with two real answers plus five shape names, and against the labels it is **right 6/40, wrong 2/40, and silent on 32/40**. One of its branches (`model._image && model._price` → `product`) holds on **0 of 40** pages.

## 0. Method

- Pages: the 40 keys of `m1/eval/m3-final.json`. All 40 join `tools/capture/sites.json` on `site/page`, so **0 registry pages lack a label** (every table row below carries one).
- Labels: `sites.json` `pages[].archetype`. Distribution in the register: landing/home 8, product-detail 8, search-results 6, article/editorial 5, category/list 4, form/checkout/settings 3, table-heavy/admin 3, dashboard/data-viz 1, docs/design-system 1, profile/account 1.
- Probe: `/tmp/featvec4.mjs` (feature vectors) and `/tmp/tree5.mjs` (tree evaluation), Node, read-only, not added to the repo. Inputs: `m1/curated/<site>/<page>.json` and the exported `pageLayoutOf` from `m1/axis.mjs`. No site name, host, URL path or label enters any feature or predicate; labels are joined only for the final comparison. `_intent` (the curator's free-text page note) is deliberately **not** a feature: it is the declared semantic fact, not structure.
- Arithmetic, never tuned: every predicate below is a single line of a shared rule, with no per-page exception. Where a predicate misfires, the misfire is reported (see §3), not patched.

Feature definitions as measured (a node = an object carrying at least one `_` key; a "collection" = an `_items`/`_lines` array):

- `rk/sec/depth` — named root children; sections = rootKeys + root `_items` + root `_lines`; nesting depth (collections increment).
- `form/login` — `_composite:'form'` (+`login`) count and `_composite:'login'` count.
- `search/qstate/facet/pag` — `_composite:'search'` count; search composites carrying a literal `_default`/`_text` (the query *state*); `_expose` count on nodes that are not search/form/login composites (a facet, any depth); `_composite:'paginator'` count.
- `$ (card/subj)` — `_price` facts, split by whether the price sits inside a collection entry (card price) or outside every collection (subject price).
- `buy (card/subj)` — same split for `_action.verb ∈ {buy, preorder, add-to-cart}` (declared in `m1/vocab-domain.json`).
- `img/gal/ban/menu` — `_image` facts; collections ≥3 whose entries all carry `_image`; entries with `_image` + (`_title`|`_name`) + `_action` and no `_price`; collections ≥2 whose entries carry only `_name`/`_title`/`_text` facts and no child nodes.
- `tbl(root)xrows` — declared tables (`_composite:'table'`, or nodes whose `_items` ≥3 all carry `_fields` with an identical key set), of which at depth 1, and the widest row count.
- `prose80/chars` — `_summary|_detail|_text|_quote` facts, counted when >80 chars, chars summed. `_text>80` is the narrower `_text|_quote` count: the only prose the engine's `readingPageOf` can see.
- `author/links` — `_author` facts; `_action.to` matching `author|/user/|/u/|profile|member`.
- `num` — `_rating/_rating-count/_stock/_count/_measure/_duration`. `col/hom` — largest collection; largest collection whose entries all share an identical `_`-key set.
- `rootImg` — root node itself carries `_image`. `composites` — declared `_composite` values anywhere.

## 1. The 40 pages

| page | label | engine kind | rk/sec/depth | form/login/search/qstate/facet/pag | $ (card/subj) | buy (card/subj) | img/gal/ban/menu | tbl(root)xrows | prose80/chars | _text>80 | author/links | num/col/hom | rootImg | composites |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 36kr-com/search-ai | search-results | default | 7/7/3 | 0,0,1,1,2,0 | 0(0/0) | 0(0/0) | 9,0,9,2 | 0(0)x0 | 0/161 | 0 | 0/1 | 0,20,15 | 0 | search |
| 36kr-com/search-viz | search-results | default | 7/7/3 | 0,0,1,1,2,0 | 0(0/0) | 0(0/0) | 9,0,9,2 | 0(0)x0 | 0/162 | 0 | 0/1 | 0,20,15 | 0 | search |
| airbnb-com/room-28871 | product-detail | detail | 9/9/3 | 1,0,0,0,3,0 | 0(0/0) | 0(0/0) | 5,1,0,2 | 0(0)x0 | 1/337 | 0 | 0/0 | 19,10,10 | 0 | form |
| aliyun-com/home | landing/home | default | 12/12/3 | 0,0,0,0,1,0 | 0(0/0) | 0(0/0) | 8,1,6,1 | 0(0)x0 | 0/1743 | 0 | 0/0 | 4,15,6 | 0 | - |
| aliyun-com/product-ecs | product-detail | default | 4/4/2 | 0,0,0,0,0,0 | 3(3/0) | 5(4/1) | 1,0,0,1 | 2(2)x4 | 0/212 | 0 | 0/0 | 0,4,4 | 1 | table |
| apple-com-cn/iphone-17 | product-detail | default | 0/14/3 | 0,0,0,0,2,0 | 0(0/0) | 3(2/1) | 11,1,0,0 | 0(0)x0 | 5/2252 | 0 | 0/0 | 0,14,6 | 1 | - |
| apple-com/home | landing/home | marketing | 0/5/3 | 0,0,0,0,0,0 | 0(0/0) | 5(5/0) | 18,2,18,0 | 0(0)x0 | 1/721 | 0 | 0/0 | 0,9,9 | 0 | - |
| apple-com/ipad-air | product-detail | default | 0/14/3 | 0,0,0,0,1,0 | 0(0/0) | 3(2/1) | 6,0,0,0 | 0(0)x0 | 19/6208 | 0 | 0/0 | 2,14,8 | 1 | - |
| apple-com/macbook-air | product-detail | default | 0/16/3 | 0,0,0,0,2,0 | 0(0/0) | 3(2/1) | 19,2,0,0 | 0(0)x0 | 47/9482 | 0 | 0/0 | 1,16,6 | 1 | - |
| aws-amazon/ec2-on-demand | table-heavy/admin | default | 3/3/2 | 0,0,0,0,0,0 | 0(0/0) | 0(0/0) | 0,0,0,0 | 4(4)x67 | 1/108 | 0 | 0/0 | 0,67,67 | 0 | table |
| bilibili-com/home | landing/home | default | 3/3/3 | 0,0,1,0,0,0 | 0(0/0) | 0(0/0) | 31,1,30,0 | 0(0)x0 | 0/148 | 0 | 30/0 | 59,30,0 | 0 | search |
| bilibili-com/read-home | category/list | default | 2/2/2 | 0,0,1,0,0,0 | 0(0/0) | 0(0/0) | 180,1,180,0 | 0(0)x0 | 149/36278 | 0 | 180/0 | 180,180,0 | 0 | search |
| bilibili-com/video-bv1gj411x7h7 | article/editorial | default | 9/9/3 | 0,0,0,0,1,0 | 0(0/0) | 0(0/0) | 21,1,20,0 | 0(0)x0 | 0/51 | 0 | 20/0 | 49,20,20 | 1 | - |
| github-com/login | form/checkout/settings | authentication | 2/2/3 | 1,1,0,0,2,0 | 0(0/0) | 0(0/0) | 0,0,0,0 | 0(0)x0 | 0/0 | 0 | 0/0 | 0,6,6 | 0 | login |
| gov-uk/ni-rates-letters | table-heavy/admin | default | 10/10/2 | 0,0,0,0,0,0 | 0(0/0) | 0(0/0) | 0,0,0,2 | 4(4)x16 | 4/1028 | 2 | 0/0 | 0,16,16 | 0 | table |
| gov-uk/register-birth-abroad | article/editorial | default | 8/8/2 | 0,0,0,0,0,0 | 1(0/1) | 0(0/0) | 0,0,0,3 | 0(0)x0 | 7/1253 | 0 | 0/0 | 0,5,5 | 0 | - |
| grafana-play/play-home | dashboard/data-viz | default | 3/3/2 | 0,0,0,0,0,0 | 0(0/0) | 0(0/0) | 0,0,0,1 | 0(0)x0 | 0/33 | 0 | 0/0 | 0,11,11 | 0 | - |
| huawei-cn/consumer-phones | category/list | default | 10/10/3 | 0,0,0,0,0,0 | 37(36/1) | 37(36/1) | 52,5,9,1 | 0(0)x0 | 0/88 | 0 | 0/0 | 0,55,55 | 0 | - |
| huawei-cn/home | landing/home | default | 7/7/2 | 0,0,0,0,0,0 | 0(0/0) | 0(0/0) | 5,1,5,0 | 0(0)x0 | 0/160 | 0 | 0/0 | 0,37,37 | 0 | - |
| huawei-cn/search-laptop | search-results | default | 6/6/3 | 0,0,1,1,1,1 | 0(0/0) | 0(0/0) | 7,0,7,0 | 0(0)x0 | 9/1394 | 0 | 0/0 | 1,37,37 | 0 | search+paginator |
| huawei-cn/search-phone | search-results | default | 6/6/3 | 0,0,1,1,1,1 | 0(0/0) | 0(0/0) | 0,0,0,0 | 0(0)x0 | 7/1153 | 0 | 0/0 | 1,37,37 | 0 | search+paginator |
| learn-microsoft/vm-sizes | table-heavy/admin | reading | 9/9/5 | 0,0,0,0,0,0 | 0(0/0) | 0(0/0) | 2,0,0,9 | 13(0)x5 | 35/7114 | 35 | 0/0 | 0,18,18 | 0 | table |
| linear-app/home | landing/home | default | 6/6/2 | 0,0,0,0,0,0 | 0(0/0) | 0(0/0) | 5,1,4,0 | 0(0)x0 | 12/1999 | 0 | 0/0 | 0,4,4 | 0 | - |
| mi-com/home | landing/home | default | 3/3/3 | 0,0,0,0,0,0 | 0(0/0) | 0(0/0) | 7,1,0,1 | 0(0)x0 | 2/609 | 2 | 0/1 | 0,24,24 | 0 | - |
| mi-com/product-detail-mi15 | product-detail | default | 11/11/3 | 0,0,0,0,1,0 | 1(0/1) | 1(0/1) | 22,1,0,1 | 0(0)x0 | 0/53 | 0 | 0/1 | 0,23,21 | 0 | - |
| mi-com/search-earbuds | search-results | default | 10/10/3 | 0,0,1,0,5,0 | 30(30/0) | 10(10/0) | 30,2,0,2 | 0(0)x0 | 2/590 | 2 | 0/1 | 10,24,24 | 0 | search |
| mi-com/search-phone | search-results | default | 7/7/3 | 0,0,1,0,5,0 | 30(30/0) | 10(10/0) | 30,2,0,1 | 0(0)x0 | 2/590 | 2 | 0/1 | 10,24,24 | 0 | search |
| mi-com/shop-category-list | category/list | default | 13/13/3 | 0,0,1,0,0,0 | 0(0/0) | 0(0/0) | 0,0,0,1 | 0(0)x0 | 2/590 | 2 | 0/1 | 0,24,24 | 0 | search |
| sspai-com/home | landing/home | default | 9/9/3 | 0,0,0,0,1,0 | 0(0/0) | 0(0/0) | 5,1,5,0 | 0(0)x0 | 0/20 | 0 | 12/11 | 1,12,5 | 0 | - |
| sspai-com/matrix | category/list | default | 8/8/3 | 0,0,0,0,1,0 | 0(0/0) | 0(0/0) | 20,0,19,0 | 0(0)x0 | 0/208 | 0 | 20/25 | 3,20,7 | 0 | - |
| sspai-com/post-102392 | article/editorial | default | 7/7/4 | 0,0,0,0,0,0 | 0(0/0) | 0(0/0) | 6,0,1,0 | 0(0)x0 | 2/790 | 2 | 1/1 | 0,7,7 | 1 | - |
| sspai-com/post-114699 | article/editorial | reading | 11/11/5 | 0,0,0,0,2,0 | 0(0/0) | 0(0/0) | 8,1,5,0 | 0(0)x0 | 13/3781 | 13 | 1/1 | 1,8,8 | 1 | - |
| sspai-com/post-114716 | article/editorial | reading | 0/17/4 | 0,0,0,0,0,0 | 0(0/0) | 0(0/0) | 10,0,0,1 | 0(0)x0 | 36/5820 | 21 | 0/2 | 1,17,4 | 1 | - |
| sspai-com/u-jtc092al | profile/account | default | 1/5/2 | 0,0,0,0,0,0 | 0(0/0) | 0(0/0) | 4,0,4,0 | 0(0)x0 | 0/146 | 0 | 0/3 | 6,10,4 | 0 | - |
| stripe-com/pricing | product-detail | default | 7/7/6 | 0,0,0,0,0,0 | 30(30/0) | 0(0/0) | 0,0,0,18 | 0(0)x0 | 0/3821 | 0 | 0/0 | 12,8,8 | 0 | - |
| stripe-docs/payments | docs/design-system | default | 0/7/3 | 0,0,0,0,1,0 | 0(0/0) | 0(0/0) | 1,0,1,1 | 0(0)x0 | 0/323 | 0 | 0/0 | 0,7,5 | 0 | - |
| taobao-com/home | landing/home | catalog | 0/9/3 | 0,0,1,0,0,0 | 27(27/0) | 0(0/0) | 18,1,0,1 | 0(0)x0 | 0/114 | 0 | 0/0 | 0,36,36 | 0 | search |
| xiaomi-account/login | form/checkout/settings | authentication | 2/2/3 | 1,1,0,0,3,0 | 0(0/0) | 0(0/0) | 0,0,0,0 | 0(0)x0 | 0/0 | 0 | 0/0 | 0,4,4 | 0 | login |
| apple-com/airpods-pro | product-detail | default | 0/13/3 | 0,0,0,0,0,0 | 0(0/0) | 3(2/1) | 35,4,2,0 | 0(0)x0 | 46/9534 | 0 | 0/0 | 0,13,6 | 1 | - |
| sspai-com/login | form/checkout/settings | default | 2/2/3 | 0,0,0,0,1,0 | 0(0/0) | 0(0/0) | 0,0,0,0 | 0(0)x0 | 1/238 | 0 | 0/0 | 0,4,4 | 0 | - |

`engine kind` is `pageLayoutOf(model).kind` today: `default` = no claim; the other kinds are `reading`, `authentication`, `detail`, `product`, `marketing`, `catalog`.

## 2. Q1 — which labels are separable by a clean, named predicate

Measured over all 40 pages (hit = pages of that label matched; FP = pages of another label matched):

| label | predicate (business structure only) | hit | false positives |
|---|---|---|---|
| `search-results` | `search ≥ 1 ∧ (qstate ≥ 1 ∨ facet ≥ 1)` — a query control that is bound to a result set, evidenced by a recorded query value or by facet controls that only make sense when results exist | **6/6** | **0** |
| `table-heavy/admin` | `tbl ≥ 1 ∧ rootImg = 0 ∧ $ = 0 ∧ buy = 0` — declared data tables and no subject: no page-level media, no money, no transaction | **3/3** | **0** |
| `form/checkout/settings` (only ever an auth gate here) | `login ≥ 1` — the gate is declared as a `login` composite | **2/3** | **0** |
| `product-detail` | `subjectBuy ≥ 1 ∨ (gal ≥ 1 ∧ form ≥ 1)` — a transaction attached to the page's subject, or a media gallery followed by a task form | **7/8** | **1** (`huawei-cn/consumer-phones`) |
| `article/editorial` | `_text/_quote` blocks >80 chars `≥ 8` — a sustained reading measure | **2/5** | **1** (`learn-microsoft/vm-sizes`, consumed earlier by the table rule) |
| `landing/home` | *none found* | 0/8 | — |
| `category/list` | *none found* | 0/4 | — |
| `dashboard/data-viz` | *none found* (and no primitive to state the fact) | 0/1 | — |
| `docs/design-system` | *none found* | 0/1 | — |
| `profile/account` | *none found* | 0/1 | — |

Notes on the five that do work:

- `search-results` is clean only because `facet` is counted at any depth. `mi-com/search-phone` records no query state at all (the search box's accessible name is the site's placeholder "耳机", not the term), and its five facets sit one level below the root filter group. Its two siblings from the same site (`mi-com/home`, `mi-com/shop-category-list`) carry the same search composite with `qstate 0, facet 0` and are correctly excluded. **The rule is a proxy**: the grammar already has the real answer (`search.results`, round 51) and the curation binds results as a *sibling* instead.
- `table-heavy/admin` needs the "no subject" clause, not a row-count threshold: `aliyun-com/product-ecs` has 2 declared tables (4 rows) and is a product page. The clause that separates them is that aliyun's root carries the subject (`rootImg 1`, `buy` at subject position).
- `form/checkout/settings` — the third page, `sspai-com/login`, declares no `login` composite (phone-number gate: one `_expose` named `login`, `submit`, and **no secret slot**). Every structural relaxation that catches it (`submit ≥ 1 ∧ img = 0 ∧ $ = 0`) also catches `huawei-cn/search-phone` (`submit 1, img 0, $ 0`); the two differ only by size (sections 2 vs 6, largest collection 4 vs 37). That is a threshold, so I did not take it: **the missing fact is the `login` declaration in the model**, not a derivation rule.
- `product-detail` — `subjectBuy` does the work precisely because 5 of the 8 product pages carry **no price at all** (0 `_price` facts on `airbnb-com/room-28871`, `iphone-17`, `ipad-air`, `macbook-air`, `airpods-pro`; their fact certificates are complete, so the rendered page really shows no price). The one false positive is a hero card with a buy action on a category listing (`huawei-cn/consumer-phones`: 37 buys of which 36 are card-positioned, 1 subject-positioned, next to a 55-entry homogeneous grid). "Subject-positioned" is therefore an approximation, not an invariant.
- `article/editorial` — the engine's own measure only sees `_text`/`_quote`. Three of the five articles keep their prose in `_summary`/`_detail` (`gov-uk/register-birth-abroad`: 1253 prose chars, **0** `_text` blocks; `sspai-com/post-102392`: 664 chars, 2 blocks; `bilibili-com/video-bv1gj411x7h7`: 49 numerics + 20 author-attributed feed entries, 51 prose chars total). With `_summary`/`_detail` included, `prose80 ≥ 5` covers 3 of 5 articles (13, 36, 7 blocks) — but also 4 of 8 product pages (5, 19, 47, 46 blocks; see §3, collision B). Widening the measure does not separate the label; it only moves the collision.

## 3. Q2 — genuinely ambiguous pages

Each pair below shares its structural signature; the differences listed are the *whole* difference. All are cross-label, i.e. the same structure carries two different archetypes.

**Collision A — `landing/home` ≡ `category/list` (12 pages, and the largest single failure mode).**

| pair | shared signature | the only differences |
|---|---|---|
| `mi-com/home` [landing] vs `mi-com/shop-category-list` [category] | same site chrome: `search 1, qstate 0, facet 0, menu 1, col 24, hom 24, prose 590 chars` | sections 3 vs 13, img 7 vs 0 |
| `sspai-com/home` [landing] vs `sspai-com/matrix` [category] | `facet 1, author-heavy (12/20), priced 0, col 12/20, hom 5/7, ban 5/19` | img 5 vs 20 |
| `bilibili-com/home` [landing] vs `bilibili-com/read-home` [category] | `search 1, qstate 0, $0, buy 0`, video cards (image + author + duration) | 30 items / 3 sections vs 180 items / 2 sections |
| `taobao-com/home` [landing] vs `huawei-cn/consumer-phones` [category] | homogeneous priced card grid: `$27/18 cards` vs `$37/36 cards`, `hom 36/55`, no hero, no facet | prices count, image count, banner count |

No measured feature marks "the whole site's entry point" versus "one category of it". Every one of these 12 pages carries at most one `_expose` and no paginator at all — a view switch or a header search box (`aliyun-com/home` `product-tab`, `sspai-com/home` `feed-tab`, `sspai-com/matrix` `matrix-feed-view`, `mi-com/shop-category-list` `keyword`, `taobao-com/home` `query`) — so the presence of a narrowing control does not mark a subset view either. 7 of the 8 home pages carry a homogeneous card collection (`hom` 4–37) and 3 of the 4 category pages do too (`hom` 7–55; `bilibili-com/read-home` is `hom 0` over a 180-entry collection). `taobao-com/home` is the sharpest case: it is structurally a category listing.

**Collision B — `product-detail` ≡ `article/editorial` (when the product page shows no price).**

- `apple-com/airpods-pro` [product] vs `sspai-com/post-114716` [article]: `rootImg 1, $0, auth 0, buy 3 (2 card/1 subj)`, prose 46 blocks/9534 chars vs 36 blocks/5820 chars, img 35 vs 10, gal 4 vs 0, depth 3 vs 4, sections 13 vs 17. Nothing else differs.
- `apple-com/ipad-air`, `apple-com/macbook-air`, `apple-com-cn/iphone-17` [product] vs `sspai-com/post-114699` [article]: all `rootImg 1, $0, auth 0–1`, prose 5–47 blocks, gallery 0–2. The article is separable only by its single `_author` fact and, for one of them, a reading measure.
- `apple-com/home` [landing] is in the same family: `buy 5 (all card-positioned)` on a 9-card gallery.

The structure that survives for "product" is exactly one bit — *is the transaction attached to the page's subject* — and 5 of 8 product pages carry no transaction at all, so the bit is absent, not negative.

**Collision C — `product-detail` ≡ `table-heavy/admin`.** `aliyun-com/product-ecs` [product] (2 declared tables, 4 rows) vs `gov-uk/ni-rates-letters` [table-heavy] (4 tables, max 16 rows). They differ only by the subject clause (`rootImg` + `buy`). This collision is the same bit as B.

**Collision D — `table-heavy/admin` ≡ `article/editorial`.** `learn-microsoft/vm-sizes`: 26 `_text` paragraphs > 120 chars — it *passes* the engine's reading test — and 13 declared tables across 5 levels. The label is `table-heavy/admin` by curator judgement ("round 15: Azure VM size specification tables"). Structure cannot say the tables outrank the prose; the decision turns entirely on rule order.

**Collision E — `docs/design-system` ≡ `landing/home`.** `stripe-docs/payments` = hero card (title + summary + action + image) + a filter `_expose` + link-card collections, i.e. the landing shape. The corpus note on this page reads "product docs, not a design system; docs/design-system is the closest archetype" — the label is itself a fallback.

**Collision F — `dashboard/data-viz` has no structural expression at all.** `grafana-play/play-home`: 3 root sections, `num 0` (not one numeric fact captured), `img 0`, `$0`, prose 33 chars, an `operate`-control toolbar and 11 `_name`-only panels. The page's defining content — KPI values and charts — is absent from the grammar as well as from the model; there is no `chart`, `series` or datum-with-unit primitive.

**Collision G — `profile/account` ≡ the same skeleton hoisted on one person.** `sspai-com/u-jtc092al` = identity card (`_title` + `_summary` + `_image` + `follow` action) + a tab list + a `_measure` achievement list + a 10-entry article feed. That is a landing/editorial page whose subject is an account. The corpus already records the overlap for `cnblogs` ("author blog home = profile + article list").

**Collision H — `form/checkout/settings` ↔ `search-results`.** `sspai-com/login` (`submit 1, img 0, $0, sections 2, largest collection 4`) vs `huawei-cn/search-phone` (`submit 1, img 0, $0, sections 6, largest collection 37`): identical on every feature except size. Also note the label's own breadth is unexercised: all 3 pages under `form/checkout/settings` in this register are login gates — no checkout, no settings page exists here, so nothing in this register says whether that label is derivable at all.

## 4. Q3 — is a TOTAL principled derivation achievable?

**No for "total and correct"; yes for "total", but only by declaring the residue.** A tree can always be made total by adding a residue bucket — but that bucket then holds 19 of 40 pages and 8 of the 10 labels, which is not a derivation, it is a renamed `default`.

Best tree found (business structure only, no site names, no per-page exception, no tuned threshold). Order matters because each earlier rule is the more specific fact and would otherwise be swallowed by a later, broader one:

| # | rule | kind | why it must come here |
|---|---|---|---|
| 1 | `login ≥ 1` | form/checkout/settings | a gate has no media, no money, no reading measure — it would be swallowed by the collection rule and by the reader rule |
| 2 | `tbl ≥ 1 ∧ rootImg = 0 ∧ $ = 0 ∧ buy = 0` | table-heavy/admin | a data-table page also carries a long reading measure (`vm-sizes`: 26 paragraphs) and a homogeneous collection (`ec2-on-demand`: 67 rows); it must be tested before both |
| 3 | `search ≥ 1 ∧ (qstate ≥ 1 ∨ facet ≥ 1)` | search-results | a result page is also a card collection (`col 24–37`, priced cards) |
| 4 | `subjectBuy ≥ 1 ∨ (gal ≥ 1 ∧ form ≥ 1)` | product-detail | a product page is also a collection (`mi15`: `hom 21`) and can have a reading measure |
| 5 | `_text/_quote` >80 chars `≥ 8` | article/editorial | the remaining long-form prose, after tables have taken the table-shaped ones |
| 6 | `hom ≥ 3 ∨ col ≥ 6` | **residue bucket** (landing/home 8, category/list 3, article 3, docs 1, dashboard 1, profile 1, product 1, form 1) | — |

Measured: **20/40 exact, 19 in the residue bucket, 1 false positive** (`huawei-cn/consumer-phones` → product-detail). Rules 1–5 name 5 of the 10 labels; nothing I measured splits rule 6.

**Which archetypes cannot be structurally distinguished, and the minimal semantic fact each needs** (this is the primitive-gap evidence):

1. **`landing/home` ↔ `category/list`.** Minimal fact: the page's **scope** — is this listing the site's entry point, or one category of it? One closed enum on the model root (`entry | category | query | entity | document | account`). This one bit also repairs collisions E and G, because "documentation index" and "account home" are just other scopes. It is not derivable from the tree: the same site produces both shapes (`mi-com`, `sspai-com`, `bilibili-com`) and no affordance difference exists.
2. **`product-detail` ↔ `article/editorial` ↔ `table-heavy/admin`.** Minimal fact: **the subject is an offer** — a price/transaction positioned on the page's subject rather than on cards. The grammar already has a legal home (a depth-1 subject section carrying `_price`/`buy`, as `mi-com/product-detail-mi15` does); the gap is that 5 of 8 product pages carry nothing at all, and the only surviving structural carrier (`buy` at subject position) is contradicted by one category page. Alternatively a declared `subject: offer|document|account|dataset` covers collisions B, C, D and F in one bit.
3. **`dashboard/data-viz`.** No primitive exists: nothing can say "chart", "series", or "a value with a unit and no label". The register's only dashboard captured `num 0`. This needs a grammar addition, not a decision rule.
4. **`docs/design-system`** (collision E) and **`profile/account`** (collision G) are covered by scope (1); with n=1 each, no predicate can be validated either way — the honest claim is "no primitive exists", not "measured collision".
5. **`table-heavy/admin` vs an entity's attribute panel.** `_composite:'table'` means both "the page's data set" and "one entity's spec panel". Position (depth-1 section vs child of the entity) approximates it and works on this register, but it depends on curation discipline, not on an invariant — the minimal fact is the table's *role*.

So the answer to the brief's question: **archetype is not one separate semantic fact that must be declared, and it is not a pure function of structure either.** Structure decides 5 of 10 labels outright and constrains the rest; a *smaller* declared fact than the archetype itself — the page's scope (and, for the rarer kinds, its subject kind) — is what is missing. A redesign that declares an archetype 1:1 with the taxonomy reproduces the label in the model and proves nothing; a redesign that declares `pageScope` + `subjectKind` and derives the rest has a total, principled tree.

## 5. Q4 — how the current `pageLayoutOf` scores against the labels

`pageLayoutOf` (m1/axis.mjs:997) is a chain of six tests: `readingPageOf` → any child with `_composite:'login'` → gallery-before-form → ≥2 root-lines banners → `model._image && model._price` → `prices ≥ 6 ∧ menus ≥ 3` → `default`. Against the 10 labels, with each kind read as the archetype-shaped claim it makes:

- **Right: 6/40.** `sspai-com/post-114699`, `sspai-com/post-114716` (reading → article/editorial); `github-com/login`, `xiaomi-account/login` (authentication → form); `airbnb-com/room-28871` (detail → product-detail); `apple-com/home` (marketing → landing).
- **Wrong: 2/40.** `learn-microsoft/vm-sizes` → `reading` (label: table-heavy/admin); `taobao-com/home` → `catalog` (label: landing/home).
- **No claim: 32/40** (`default`), including all 6 search-results, all 4 category/list, 2 of 3 table-heavy, 3 of 5 articles, 7 of 8 product-detail, and every page of docs/dashboard/profile.

Three structural reasons the ceiling is low, independent of thresholds:

- **Dead branch.** `if (model._image && model._price) return { kind: 'product' }` holds on **0 of 40** pages (root `_image ∧ root `_price` is empty across the whole register). Its `catalog` branch (`prices ≥ 6 ∧ ≥3 root menu lists`) fires exactly once — on `taobao-com/home` (27 prices, 4 root menu lists), a landing page — while `apple-com/ipad-air` reaches the menu half with 0 prices. Five product pages declare `_action.verb = 'buy'` **at the root** (`aliyun-com/product-ecs`, `iphone-17`, `ipad-air`, `macbook-air`, `airpods-pro`) and `pageLayoutOf` never looks at that verb.
- **Kind vocabulary.** Its kinds can name at most 5 of the 10 labels (article, form, product-detail, landing, category). `search-results`, `table-heavy/admin`, `docs/design-system`, `dashboard/data-viz` and `profile/account` have no kind at all, so even a perfectly tuned `pageLayoutOf` cannot reach 10/10.
- **Reader blindness.** `readingPageOf` counts only `_text` blocks > 120 chars. Eight pages in the register have any such block; three clear ≥ 8, one of which is a table page. The 4 apple product pages (2252–9534 chars of `_summary`/`_detail` prose) and `gov-uk/register-birth-abroad` (1253 chars, 0 `_text` blocks) are invisible to it, which is why the *composition* axis mis-reads document-shaped pages.

## 6. Evidence limits

- Per-label sample size is the binding limit: `dashboard/data-viz`, `docs/design-system` and `profile/account` have **n = 1**. Their entries above are "no primitive exists", not measured collisions; a redesign must not read them as validated.
- All predicates are measured on this 40-page register only. The `facet` branch of the search rule is a proxy validated on 6 search pages against 4 non-search pages that also carry a search composite; it should be replaced by the declared `search.results` binding, not enshrined.
- I left the one false positive in place (`huawei-cn/consumer-phones` → product-detail) rather than adding a size threshold that would also split `mi-com/product-detail-mi15` (`hom 21`) from `huawei-cn/consumer-phones` (`hom 55`).
- `m1/validate.mjs` was not run (read-only brief); verb legality was checked by reading `m1/vocab-domain.json` (`buy`, `preorder`, `add-to-cart`, `follow`, … are declared domain verbs, so the transaction signal is legal vocabulary, not a modelling error).
- URL path was excluded as instructed. It is worth stating explicitly that a URL path is a *declaration*, not structure — it is the cheapest stand-in for `pageScope` and must not be smuggled in as a structural feature.

## 7. Reproduce

```
node /tmp/featvec4.mjs   # 40 rows: labels + engine kind + feature vector
node /tmp/tree5.mjs      # candidate tree, per-rule outcomes, engine accuracy
```
