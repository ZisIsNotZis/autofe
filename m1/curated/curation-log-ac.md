# M3 curation batch AC — log (auto draft → curated model)

Date: 2026-09-28. Worker: batch AC of the exemplar fan-out, per `.scratch/04-m3-curation/spec.md`
(+ amendments F-024 money.qualifier, F-025 verbatim URLs / capture backing).
Scope: writes under `m1/curated/**` only; `curation-log.md` (pilot-owned) untouched; nothing committed.
Oracle split (inherited from pilot): `nodes.json` full `name` strings decide FACTS; `full.png` decides EMPHASIS.
All 4 pages are fresh curation (no hand models).

## Results overview

| page | validate | factFidelity before → after | coverage high before → after | med | info |
|---|---|---|---|---|---|
| bilibili-com/read-home | ok (0 errors) | 1.000 (26/26) → **1.000 (105/105)** | 27 → **4** | 0 → 0 | 0 → 4 |
| bilibili-com/video-bv1gj411x7h7 | ok (0 errors) | 1.000 (99/99) → **1.000 (107/107)** | 20 → **21** * | 0 → 0 | 3 → 8 |
| gov-uk/register-birth-abroad | ok (0 errors) | 1.000 (30/30) → **1.000 (34/34)** | 0 → 0 | 5 → 5 ** | 38 → 36 |
| grafana-play/play-home | ok (0 errors) | 1.000 (13/13) → **1.000 (18/18)** | 0 → 0 | 0 → 0 | 27 → 38 *** |

\* video high +1 is a composition change, not a coverage loss: 3 toolbar warnings resolved (merged counts now verbatim), 4 new warnings are exactly the classified drops (ephemeral danmaku, HD-gate chip, danmaku-settings popover, campaign ad). Every remaining warning is classified below.
\** gov-uk med 5→5 is also composition: "Explore the topic" + its 5 topic links resolved (content the draft had dropped, restored); "Is this page useful?" added (feedback-strip boilerplate drop).
\*** grafana info +11 are exactly the rule-8 drops: 6 icon-only toolbar buttons, 3 panel hover-menu buttons, 2 breadcrumb links. high/med stay 0.

Tau notes (metric mechanics, not curation quality): read-home + video have no heading-role source nodes to match card/link titles against (same class as the pilot's huawei pages) → tau undefined. gov-uk tau −1 is junk: `storylineTitles()` only scans `_lines`/`_items` element titles, so the page's real headings (Fees, How long it takes, …) — encoded as named-child `_title`s — are invisible to it; the only 2 "matches" are substring coincidences ("cannot apply online" ⊃ heading "Apply online"). All 8 article headings are present, in source order, as named-child storylines.

## Per-page decisions

### 1. bilibili-com/read-home (auto high: 27 → 4)

Category/list archetype: the 推荐文章 feed IS the page (rule 6).
- ADD the full catalog: auto draft kept only 6 of 19 article cards (and only as merged action labels). Curated model carries all 19 cards from the DOM (`.feed-item`/`.article-item__*`), each split into `_name` (clean title from the `title` attr), `_detail` (excerpt), `_author`, `_category` (label chip: 日常/全部笔记), `_source` (`来自文集` badge on 8 cards — re-split out of the title div), `_measure` (interaction counts, captured grouping e.g. "5.3万 738 188"), and a card-level `navigate` action (F-020 whole-card link, no invented label; protocol-relative hrefs `//www.bilibili.com/read/cv…/` absolutized to `https://…`).
- SET `_primary` = `articles` (the feed is the takeaway). Renderer consequence: the hero mechanism duplicates the whole 19-card section (render 26KB → page 11k px, half duplicated). Model is correct; logged as renderer finding (see findings #2).
- KEEP the search box as `_expose {name: "article-search"}` with `_label 搜索专栏文章` (draft had an unlabeled bare input).
- DROP site nav (首页…下载客户端 mega-nav), user bar (大会员/消息/动态/收藏/历史/创作中心/投稿), and the login overlay (登录后你可以：… 立即登录 / 点我注册) — chrome, same drop classes as aliyun.
- Residual 4 high = a11y-tree container strings of KEPT cards (author+category+stats concatenated by the AX tree; content fully present atomized in the model). 4 info = dropped nav items. All classified.

### 2. bilibili-com/video-bv1gj411x7h7 (auto high: 20 → 21)

Video watch page; the draft dumped facts and card labels flat. Curated into storylines:
- Root: `_title` (video title, `_primary` → `_title`), 播放 1亿 (`_count`), 弹幕 14.9万 (`_measure`), publish `_datetime 2020-01-01 07:43:23`, `_duration 03:33` (from player "00:13 / 03:33").
- ADD `live`: 96人正在看 (viewer counter, nodes+screenshot backed; draft missed it).
- KEEP `danmaku` input contract: `_expose {name: "danmaku-input"}`, gate copy 请先登录或注册, actions 发送 (submit) / 登录 (operate — in-page layer, `javascript:void(0)` href deliberately not modeled) / 注册 (navigate, captured passport URL) / 弹幕礼仪 (open, captured help URL).
- `stats`: toolbar counts as ONE verbatim fact "292.1万 127万 153.6万 49.3万" (icon order 点赞/投币/收藏/分享 — read from screenshot icons, recorded in `_intent`, not as visible copy); actions 稿件举报, 46篇笔记 (both href-less buttons → operate).
- KEEP `credits` (8 字幕制作者 items with captured space.bilibili.com URLs, protocol-relative absolutized) and `tags` (6 tags as `_tag` list + 引导语 发现《Never gonna give you up》; the 6 keyword-search jump URLs dropped — tag items only navigate, rule 6).
- `uploader` 索尼音乐中国: `_detail 官方营业，欢迎一键三连~~~`, `_count {num: 94.7, unit: "万"}` followers, main action = UP主页 (F-020 card link), children 关注 94.7万 (operate, visible copy incl. count) / 发消息 (open, captured message URL) / 充电 (operate).
- `up-next`: all 20 recommendation cards with `_name`/`_duration`/`_author`/`_measure` (captured grouping "50.8万 1078") + card navigate action (captured URLs incl. spm params, verbatim); `toggle 自动连播` on the storyline.
- DROP: player controls (播放/暂停…全屏 — generic component chrome), HD login-gate chips (免费享高清视频/试看30秒), capture-time danmaku overlay (坏了，被PCL骗了 … — ephemeral playback state), danmaku settings popovers (按类型过滤…, 镜像画面…, HEVC/AVC, 视频底部15%), 弹幕列表 dropdown + 填充中 loading state, collapsed ⋯ menu (用手机看/稍后再看), both ads (豆包 card + its 屏蔽广告 feedback, 投稿爱的100种表达方式 campaign banner), empty 课程总结 widget, 展开 expander (list already complete).
- Residual 21 high = above classified drops + a11y container strings of kept cards (e.g. "04:22 youtube… orange橙汁juice 1468.8万 4万"; content present atomized). 8 info = dropped nav/player buttons/ad link.

### 3. gov-uk/register-birth-abroad (auto high: 0 → 0, med 5 → 5, info 38 → 36)

Article archetype; draft had the sections but missed the interactive layer.
- SET `_primary` = `_summary` (the lead paragraph is the page takeaway; renders as hero — F-024 hero-first fix confirmed working).
- ADD the actions the draft flattened into text: Start now → `open https://register-a-birth-abroad.service.gov.uk/` (green button, href verbatim from DOM); approved translator, apply for a UK passport, mailto:Overseas.RegistrationUnit@fcdo.gov.uk — all verbatim captured hrefs (relative `/…` hrefs absolutized against the `https://www.gov.uk` origin per F-025).
- TYPED MONEY (F-024): Fees gets `_price {money: 150, currency: "GBP"}` and `_amount {money: 50, currency: "GBP", qualifier: "per certificate"}`; the £6–£42 postage range stays in `_detail` text (no closed range type — type-system note, not silently text-only).
- ADD `explore` (Explore the topic, 5 topic links with captured `/browse/…` hrefs) and `related` (Register a birth → /register-birth) — article-level content the draft dropped (resolved 6 warnings).
- DROP cookie banner, GOV.UK header/nav/search, breadcrumb (§8), the site-wide feedback strip (Is this page useful? Yes/No + Report a problem — boilerplate on every GOV.UK page), footer (Services and information / Government activity / Support links link farms, OGL, © Crown copyright).
- Residual med 5 = "Navigation menu" heading + 3 footer column headings + "Is this page useful?" — all classified chrome/boilerplate drops. info 36 = footer/breadcrumb links (dropped chrome).

### 4. grafana-play/play-home (auto high: 0 → 0, med 0 → 0, info 27 → 38)

Dashboard/data-viz archetype; panels are the story.
- SET `_primary` = `panels`; `_title` "Stats" (breadcrumb listitem + meta title "Stats - Examples - Dashboards - Grafana").
- `panels`: all 11 stat-panel demo headings as `_items` in source order. "Loading plugin panel…" (Introduction/The Basics) dropped — lazy-unpainted capture artifact, not content.
- `toolbar`: `_summary "Time range selected: Last 6 hours"` (AX state; visible copy "Last 6 hours" is the action label; corroborated by meta.json URL `from=now-6h&to=now`). Per rule 8, only visible-copy controls kept: Last 6 hours / Refresh / Edit (label = visible copy, AX name "Enter edit mode" kept as `_name`). Dropped icon-only: Move 3h backward/forwards, Zoom out, auto-refresh, Copy link, Share.
- KEEP the two page-top banners as links (Grafana Cloud free tier, Learning Journeys — captured URLs verbatim).
- DROP the entire Grafana app sidebar (13 nav items + Expand-section buttons + Close/Undock menu), topbar (breadcrumb Dashboards>Examples>Stats as nav, Search ctrl+k, New, Help, Sign in), panel hover menus (Export/Outline/Hide, Menu for panel X — component chrome).
- Residual info 38 = the sidebar/topbar (uncovered in the draft too) + the 11 rule-8/breadcrumb drops. high/med remain 0.

## Generalizable protocol rules (batch AC additions; pilot rules 1–10 remain in force)

1. **Catalog extraction reads the DOM's own field classes, not only the AX tree.** On list pages the a11y link name concatenates title+excerpt+author+stats into one unusable string; the DOM's per-field classes (`.article-item__title/__desc/__uname/__label/__stat`, `title` attr) give clean, complete splits for the whole catalog (19/19 here vs 6 in the draft). The AX merged string then reappears as a coverage warning — classify as "a11y container duplicate of atomized model facts", never re-merge to chase it.
2. **Multi-value stat groups are encoded in the capture's own grouping (one text), not as separate chips.** The renderer's list/chip markup leaves closing-tag letter residue between values after normalization, so no evaluation (render substring or coverage) can ever match across chip boundaries unless the source itself carries them separately. When the source shows "50.8万 1078", encode `_measure {text: "50.8万 1078"}` + explain the icon semantics in `_intent`; splitting into per-value facts is unmatchable and inflates high warnings (+21 observed).
3. **Icon-only controls drop; their state survives only if it carries content.** grafana toolbar: 6 icon-only buttons dropped even though AX names exist; the time-range STATE ("Time range selected: Last 6 hours") is content and survives as `_summary`, while the picker's visible copy "Last 6 hours" is the action label. Same rule removes bilibili's ⋯ menu contents and panel hover menus.
4. **Ephemeral player state is chrome**: capture-time danmaku overlay lines, HD-gate upsell chips, settings popovers, "填充中…" loading panels and empty embedded widgets (课程总结) are playback-instant artifacts, not page story. A live viewer counter (96人正在看) is different — it is a page fact and stays.
5. **Lazy-unpainted placeholders ("Loading plugin panel…") are artifacts, not panel content**; keep the panel inventory (titles), drop the placeholder text, and record the unpaint.
6. **Banners that carry the page's own CTA are content; ads and campaign floors are not.** grafana's Cloud-tier/Learning-Journeys banners stay (page-level CTA with captured URLs); bilibili's 豆包 card and 投稿爱的100种表达方式 floor drop, including their feedback micro-UI (屏蔽广告…).
7. **`javascript:void(0)` and `#` hrefs are not URLs**: model the control as verb-only (`operate`) rather than copying a junk href (F-025's spirit: verbatim does not mean meaningless).
8. **Site-wide feedback strips are boilerplate** even when interactive (gov-uk "Is this page useful?" Yes/No/Report-a-problem): drop, and accept the +1 med/+3 info as classified cost.

## Renderer / eval findings (for the library, not fixed here)

1. **Chip residue breaks multi-value matching** — see rule 2. Renderer emits `</span><span class="chip">` between list values; `norm()` strips punctuation but keeps the letters ("span"), so merged source strings can never match list-valued facts.
2. **Root `_primary` on a large collection duplicates it wholesale** (read-home: hero renders all 19 cards, page height 2×). Recommend: hero demotes to a heading/link when the target subtree exceeds a size threshold, or forbid `_primary` on the sole storyline.
3. **`storylineTitles()` ignores named-child storylines** (only `_lines`/`_items` elements) — gov-uk's 8 real headings are invisible to tau, producing a junk tau of −1 from substring coincidences. Either scan named children with `_title` or exclude <3-char overlap coincidences.
4. **modelText exemption threshold (≥8 normalized chars) is too strict for short CJK measure strings**: "2.6万 346 0" normalizes to 7 chars, so its a11y container still warns even though every field is in the model (3 of read-home's 4 residual highs are exactly this).

## Deliverables

- `m1/curated/bilibili-com/read-home.json`, `m1/curated/bilibili-com/video-bv1gj411x7h7.json`, `m1/curated/gov-uk/register-birth-abroad.json`, `m1/curated/grafana-play/play-home.json` — all validate with 0 errors, factFidelity 1.000.
- Renders + full-page screenshots: `m1/curated/renders/<site>-<page>.html|.png`; auto-draft baselines kept as `auto-<site>-<page>.html` (pilot convention; inputs for the "before" numbers above).
- Eval commands: `node m1/validate.mjs …`, `node m1/eval/metrics.mjs <model> <render> corpus/<site>/<page>`, `node m1/eval/source-coverage.mjs <render> corpus/<site>/<page> <model>` — run before (auto draft) and after (curated) for all 4 pages.
