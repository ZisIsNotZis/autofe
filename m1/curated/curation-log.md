# M3 curation pilot — log (auto draft → curated model)

Date: 2026-09-28. Worker: M3 curation pilot per `.scratch/04-m3-curation/spec.md`.
Scope: writes under `m1/curated/**` only; nothing committed.
Oracle split: **`corpus/<site>/<page>/nodes.json` (full `name` strings) is the fact oracle; `full.png` is the emphasis oracle** (what the original puts forward → `_primary`, storyline order).

## Results overview

| page | validate | factFidelity before → after | coverage high before → after | coverage med before → after |
|---|---|---|---|---|
| aliyun-com/home | ok (0 errors) | 1.000 (13/13) → **1.000 (69/69)** | 104 → **63** | 151 → **143** |
| huawei-cn/consumer-phones | ok (0 errors) | 1.000 (13/13) → **1.000 (151/151)** | 94 → **59** | 0 → 0 |
| apple-com/iphone-16 | ok (0 errors) | 0.973 (73/75) → **0.991 (116/117)** | 55 → **41** | 31 → 41 * |
| huawei-cn/search-laptop | ok (0 errors) | 1.000 (7/7) → **1.000 (10/10)** | 6 → 6 ** | 3 → 3 ** |

\* apple med +10 is a measurement artifact, not a curation regression — see "Coverage metric artifact" below.
\** search-laptop residuals are 100% footer/legal chrome (华为技术专栏/智能世界2035 links, ICP 备案号, footer column headings) that the protocol says to DROP; a drop can never reduce its own warning. Recorded as irreducible.

Storyline tau: aliyun 0.78 (23/28 matched; inversions come from dropped link-farm sections between kept ones), apple 0.73 (19/44; FAQ headings match, compare-model names aren't `heading` role in source), huawei pages: no `heading`-role nodes exist in either capture (华为/苹果用 div), so tau is undefined — order was curated from DOM order.

## Per-page decisions

### 1. huawei-cn/search-laptop (auto high: 6 → 6)

0-results search page. Kept: search box (`请输入关键字`, free-input `_expose`), category filter (5 radio choices with their `(0)` counts, single-select `_expose`, `重置` action), results state (`_count {num:0, unit:条结果}`, empty state via `_items: []` + `_empty` — the grammar's empty-collection pattern fits this page exactly).
- DROP 集团网站 / 选择区域/语言 switcher and the 30-language mega list — site chrome.
- DROP main nav + logo — chrome.
- DROP floating 在线客服 widget (auto draft had wrongly attached it as the page `_image` with empty URL) — overlay chrome.
- DROP breadcrumb 首页 / 搜索结果 — axioms §8 explicitly not-expressible.
- DROP footer (5 link columns, social, ICP/版权) — navigation/legal chrome; this is the entire residual warning set.
- DROP 相关性 sort control — its option set is not in the capture; an expose with invented options is worse than no expose.
- Keyword "laptop" lives in `_intent` only (it is in meta.json URL, not in nodes.json — kept out of facts).

### 2. huawei-cn/consumer-phones (auto high: 94 → 59)

Category/list archetype. The auto draft kept only the Mate XT 2 hero + legal footnotes and dropped the entire catalog; curation ADDS the catalog back (the page's actual story) and drops chrome/boilerplate.
- ADD series entry tabs (Mate/Pura/Pocket/nova/畅享 with in-page `key:` actions; 配件 external link) — from capture.
- ADD flagship hero: HUAWEI Mate XT 2 非凡大师, `最新` tag, ¥19999, 了解更多 (open) + child 购买 (buy) — page `_primary`.
- ADD per-series catalogs as `_items` (Mate 14 / Pura 10 / Pocket 1 / nova 11 / 畅享 8 products), each with `_name`, `_price` (typed money CNY where the capture shows one), 了解更多 (item's own action), child 购买. Series subtitles 非凡旗舰 / 美学新篇 / 超能续航 where captured. Added `HUAWEI Mate 70 RS 非凡大师` and `HUAWEI nova 14 Pro` (price-less, 详情-only) after they surfaced in coverage.
- ADD value props 为什么选择华为手机? — 7 icon-card pairs (影像/设计/通信/可靠性/AI/续航/隐私).
- DROP cookie banner, top nav, footer, copyright/ICP — chrome.
- DROP the 6 numbered footnote disclaimers — legal boilerplate referencing other-product features (watch/HarmonyOS pairing), not the phone-series story.
- Residual 59 high = 28 × "￥XXXX 起" price strings (see MODEL gap below) + per-product spec popups (摄像头/mAh/快充 — tail behind 了解更多) + anti-bot U+2060 joiner strings + footer/service-strip chrome.

### 3. aliyun-com/home (auto high: 104 → 63)

Landing page; capture painted hero + promos + AI-experience + MaaS sections; DOM additionally carries unpainted catalog/case sections.
- SET `_primary` = hero (Token Plan 全面升级 + 立即订阅) — what the original leads with.
- KEEP hero with both actions (立即订阅 / 在线咨询 as child action).
- RESTRUCTURE 4 promo cards (auto draft had them as flat merged action-labels) into `_items` with `_name` + `_detail` + card-level `open` action (F-020: whole-card link = card action, no invented label).
- KEEP 更强模型…免费体验 section: 6 apps as `_items` split into `_name` (category), `_subtitle` (product | badge), `_detail` (description), each with its own `/exp/*` action; dropped `封面图` junk from labels.
- KEEP MaaS section: 千问AI平台 intro + Token Plan / 免费额度 cards (name+detail+查看详情 action each).
- ADD 超值权益 promos (10 cards with prices/discounts: 39 元起 / 4.5 折 / 300 元 / 9.9 元 / 160+ / 99 元/年 / 50+ / 30+) and infra stats (31个 地域 / 106个 可用区 / 3200+ 边缘节点 / 180+Tbps 带宽) — price/count facts the spec calls out, all nodes.json-verifiable.
- ADD analyst banner (IDC + Frost & Sullivan) as its own storyline (auto draft buried it under 安全合规).
- DROP top campaign banner (2026 云栖大会抢票) — time-boxed ad.
- DROP login overlay popup (登录以在您的控制台资源…) — demo chrome that covered the hero in the capture.
- DROP 千问大模型企业拥抱AI时代优选 + 完整的产品体系 sections — pure link farms/model catalogs (navigation), content lazy-unpainted.
- DROP 依托大模型…案例 links + AI 赋能千行百业 case blurbs — marketing case tail, unpainted.
- DROP footer, ICP links, pre-footer service band (7x24 服务 etc.) — chrome/boilerplate.

### 4. apple-com/iphone-16 (auto high: 55 → 41)

Buy-flow page. Same skeleton as the hand model (6 config steps), re-derived from the capture with these deltas:
- REPAIR truncations from capture `name`: storage radio ("128GB Footnote 1 Buy from $799 or $33.29/mo. per month for 24 mo" → 128GB / $799 / "or $33.29 per month for 24 months"), aside texts ("Compare all pricing and deals to find the option that's right fo…" → full), recap ("want it." → "Just the way you want it."), connectivity aside ("…rate plan —" → "…you even get a discount. And your new iPhone will be unlocked."), AppleCare One ("$5.99 per month each" → capture form "$5.99/mo. per month each"), trade-in aside ("…Or recycle" → "…Or recycle your device for free." — kept the sentence, dropped the duplicate See-all-deals action), Personal Setup, services text.
- MERGE duplicates: "Get $35–$885 for your trade-in" appeared 3× (right-rail button, step heading, draft title) → once as step `_summary` (+ `_primary` of that step); "See all deals" ×3 → one action on the deals storyline; "$799 or $33.29/mo…" ×4 → root `_price`/`_summary` + storage item + recap `_ref`.
- DROP Footnote markers († ‡ ± ¹ ² Footnote N), "Show more" expander buttons (kept the revealed aside text instead), gallery carousel controls, global nav mega-menus, breadcrumb + footer, `${translate.store.a11y.opens_new_window}` i18n artifacts.
- ADD what the draft dropped: Carrier Deals banner (Save up to $799…), Apple Intelligence callout, Free shipping / Pick up from Store, recap block (3% Daily Cash, Need a moment? + Save for later / Continue, Connect with a Specialist), environment (carbon neutrality by 2030), Personal Setup, services (3 months free), compare cards (5 models: New tag, tagline, From-$ price, + display/battery/chip/camera/front spec rows — bbox-mapped per column), 12 FAQ questions as expandable items, payment step action See how to pay monthly.
- VERIFIABILITY GUARD: capture has exactly ONE storage radio (128GB) — the model has exactly one (no 256GB).
- The single fidelity miss (0.991) is a metric artifact: `AT&T` renders as `AT&amp;T`; the metric's punctuation-stripping normalization turns `&amp;` into `amp`, breaking substring match for the long FAQ string "…for AT&T, T-Mobile, or Verizon?". The string is verifiably in the render HTML. Any model containing an `&` inside a long fact hits this.

### apple curated vs hand model (`m1/models/apple-com/iphone-16.json`)

Convergent (independent curation arrives at the same story): 6-step flow with same order and same choice sets (5 finishes, 128GB+$799, trade-in pair, Buy/Finance, 3 carriers + later, 3 AppleCare options), recap-ref + inbox, $799 root price.

Curated differs from hand in 8 ways:
1. **Capture-bound vs memory-bound**: hand model has a 256GB/$899 storage option — not present in this capture; curated has only 128GB. Hand's AppleCare One says "$5.99 per month each"; capture says "$5.99/mo. per month each".
2. **Invented URLs removed**: hand's `buy → https://www.apple.com/shop/checkout` and trade-in `open → /shop/trade-in` are not in the capture; curated uses only captured targets (the root buy CTA is `Continue`/submit in the recap block).
3. **Broader page coverage**: hand stops at steps+recap+inbox; curated adds the deals banner, AI callout, delivery options, need-a-moment block, specialist contact, environment, Personal Setup, services, compare cards (with spec matrix rows), and the 12-item FAQ — all capture-verified.
4. **Expose names**: hand kept draft-derived identifiers (`finish-pick`, `apple-trade`, `buy-pay`, `at-t`, `applecare-with`); curated uses domain identifiers (`finish`, `storage`, `trade-in`, `payment-method`, `carrier`, `care-plan`).
5. **Aside knowledge kept**: hand drops the "How does trade-in work? / Is it easy to get connected? / How does AppleCare work?" asides; curated keeps them as step `_detail` (they answer the user's next question).
6. **Label precision**: hand's summary "From $799 or $33.29 per month for 24 months" paraphrases; curated keeps visible copy "Buy from $799 or $33.29/mo. per month for 24 mo." and adds `Color` as the finish group `_label`.
7. **Spec matrix**: hand has no compare section; curated encodes 5 phones × (price, tagline, New, 4–5 spec rows) from bbox-mapped capture cells (which fixed the GPU counts: 18 Pro has 7-core GPU, not 6).
8. Both drop the same chrome (nav, gallery, footnotes, footer), which is evidence the drop taxonomy is stable across encoders.

## Coverage metric artifact (important for reading the numbers)

`source-coverage.mjs` exempts any source string that substring-contains ANY model text. The auto drafts carried fragment "facts" (`/mo.`, `per month`, `months`, `Footnote`, `Banner 图`), which substring-suppressed ~20 unrelated warnings (e.g. every global-nav "More from …" menu matches `mo`; every "…Footnote N" string matches `footnote`). The curated models drop these fragments, so those strings surface again — apple med 31→41 and part of the high delta are this artifact, not lost coverage. Net of the artifact, curated strictly reduces real-fact warnings (evidence: 13 strings fixed on apple incl. all compare-model names and prices; aliyun −41 high; huawei phones −35 high). Rule: never keep junk fragments to game the metric; classify residuals instead.

## Generalizable protocol rules (the output of this pilot)

1. **Split the oracle**: `nodes.json` full `name` strings decide FACTS (keep/drop/repair); the screenshot decides EMPHASIS (`_primary`, storyline order). A fact is keepable if either oracle carries it; emphasis only from the screenshot.
2. **Drop by role, not by noise list**: chrome categories are site nav, region/language switchers, login/demo overlays, cookie/legal banners, floating widgets, breadcrumbs (§8), footer sitemaps, campaign ads, "Show more" expanders (keep the revealed text, drop the control), image-caption junk (`封面图`, `Banner 图`, `(Opens in a new window)`), footnote markers. Record role + one-line reason per drop.
3. **Repair by re-derivation, never by guessing**: truncated/merged auto-draft strings are re-split from the capture's full `name` into identity (`_name`/`_title`) + supporting (`_subtitle`/`_detail`) + action label; aria-duplicate fragments (`mo. months`) collapse to the visible form.
4. **Merge stated-N-times facts to their best story location**: repeated price → typed fact at the entity that owns it + `_ref` for re-statements; repeated CTA → one action on the storyline that owns the offer; cross-references become `_ref`/`key:` links, not copies.
5. **Verifiability bounds completion**: the model contains exactly what the capture carries (1 captured storage option → 1 storage item; 0 search results → `_items: []` + `_empty`). World knowledge (256GB exists) never fills gaps.
6. **Catalogs are the story on category/list pages**: encode the full product `_items` with typed prices; drop link-farm "catalogs" that only navigate (model lists, product menus) — the discriminator is whether the item carries a fact (price/spec) or only a jump.
7. **Typed values over strings; log what the type system can't say**: prices/counts as `money`/`num`; the "From/起" qualifier has no money-type slot — a MODEL gap to log (costs one coverage high-warning per priced item), not a reason to fall back to text.
8. **Actions**: verb by semantics (`buy`/`open`/`submit`/`operate`/`navigate`), `label` = exact visible copy; icon-only actions with no visible copy are dropped, not named; whole-card links = card-level `_action` without label (F-020).
9. **Choice sets** (color/storage/carrier/plan/filter) = `_items` + single-select `_expose` with a domain kebab-case name; mutually-exclusive alternatives may carry `_rel.compare`; free inputs = bare `_expose`.
10. **Residual warnings are classified, not chased**: after curation every remaining warning belongs to one of {nav/footer chrome, legal/footnote, spec tail behind a detail link, capture artifacts (anti-bot U+2060 joiners, `${translate…}` placeholders, lazy-unpainted sections), type-system gaps (From/起)}. If it doesn't fit a class, re-examine the model.

## Renderer/engine findings (for the prior library, not fixed here)

- Root `_primary` hero renders at the END of the root article, so the page's main point lands at page bottom (all three pages with root `_primary`). RENDERER gap — hero should lead.
- `_expose` over `_items` renders the choice set twice (radio fieldset + the items again as compare-grid cards). RENDERER gap.
- `esc()` + the metric's punctuation-stripping normalization make any `&` inside a fact unmatchable (`AT&T` → `AT&amp;T` → "amp" intrudes). EVAL artifact; consider unescaping entities before normalizing in `metrics.mjs`.
- `_rel.compare` on long `_items` lists is unnecessary; runs/tables come from shape heuristics — fine as is.

## Deliverables

- `m1/curated/aliyun-com/home.json`, `m1/curated/huawei-cn/consumer-phones.json`, `m1/curated/apple-com/iphone-16.json`, `m1/curated/huawei-cn/search-laptop.json` — all validate with 0 errors.
- Renders + full-page screenshots: `m1/curated/renders/<site>-<page>.html|.png` (auto-draft baselines: `auto-<site>-<page>.html`); `shoot.mjs` is the screenshot runner (on-disk headless shell + playwright-core).
- Baseline evals of the auto drafts are recorded above; nothing outside `m1/curated/**` was written; nothing committed.
