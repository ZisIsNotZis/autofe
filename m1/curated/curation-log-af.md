# M3 curation batch AF — log (auto draft → curated model)

Date: 2026-09-28. Worker: batch AF of the exemplar fan-out, per `.scratch/04-m3-curation/spec.md`
+ pilot protocol (`curation-log.md`) + F-024 (money.qualifier) / F-025 (URLs verbatim from capture;
screenshot-derived facts need capture backing or get dropped).

Scope: writes under `m1/curated/**` only; `curation-log.md`, other batches' files, `m1/models/**`,
`m1/extract/**`, `corpus/**`, `tools/**`, `docs/**` untouched; nothing committed.
Oracle split (pilot): `nodes.json` full `name` decides FACTS; `full.png` decides EMPHASIS.
This batch adds: **`dom.html` is the URL oracle** (F-025) — nodes.json carries no hrefs; every
kept action target was grep-verified verbatim in `dom.html` (relative `href`s absolutized against
the `meta.json` url origin; protocol-relative `//` → `https:`).

## Results overview

| page | validate | factFidelity before → after | coverage high b → a | med | info |
|---|---|---|---|---|---|
| sspai-com/post-114716 | ok (0 errors) | 0.986 (138/140) → **1.000 (126/126)** | 21 → 28 * | 0 → 0 | 8 → 14 |
| sspai-com/u-jtc092al | ok (0 errors) | 1.000 (21/21) → **1.000 (38/38)** | 3 → 3 * | 0 → 0 | 2 → 2 |
| stripe-com/pricing (hand model copied) | ok (0 errors) | auto 1.000 (237/237) → **hand 1.000 (28/28)** | 99 → 167 ** | 11 → 55 | 96 → 170 |
| stripe-docs/payments | ok (0 errors) | 1.000 (39/39) → **1.000 (62/62)** | 0 → 0 | 0 → 0 | 12 → 42 *** |
| taobao-com/home | ok (0 errors) | 1.000 (38/38) → **1.000 (136/136)** | 12 → 38 * **** | 0 → 0 | 25 → 45 |

Storyline tau: post-114716 0.933 → 0.926 (same 14-storyline order; inversions from dropped TOC/aside
sections between kept ones); u-jtc092al and taobao `null` in both runs (no `heading`-role nodes in
either capture — order curated from DOM order); payments 1.0 → 1.0; pricing 0.217 → **0.810**.

\* Net-of-artifact rule (pilot): the auto drafts suppressed coverage warnings by keeping *merged*
strings ("…；豆瓣链接", "片长…；观看渠道…", whole-tile label+price concatenations). Re-splitting
them into identity/detail/action (protocol rule 3) re-surfaces the source *wrapper* nodes as
warnings — a drop/split can never reduce its own warning. Composition of the after-highs:
- post-114716 (28): ~19 wrapper artifacts (each fully covered by model parts, e.g.
  "关键词：剧情 / 惊悚 又名：… 片长：…；豆瓣链接"), + true drops: 文章目录 TOC ×2, ICP 备案 links ×2
  (high because they contain digits), nav/comment-timestamp wrappers. Real content loss: none
  (fidelity 1.000; every kept string renders).
- u-jtc092al (3): all 3 are num-glyph artifacts — model types the stats as `_measure`/`_count`
  numbers (25/23535/4/529/0); source carries them inside concatenated strings, and the unlabeled
  header stat 16557 was **dropped as unverifiable** (no captured label names it; the achievements
  panel names the others).
- taobao (38): 36 price/number-glyph artifacts — model prices are typed `money` (¥14999 → renders
  "14999 CNY"), so no model *string* can substring-match the source's "¥14999"; same for `num`
  stats. + 2 mega-wrapper generics (region containers concatenating many kept facts).
  `iphone17` (high) is footer-SEO keyword link chrome — dropped.
- payments: 0 high/med; the +30 info are the dropped left sidebar docs tree, AI page tools
  (询问有关此页面的问题/LLM 副本/以 Markdown 格式查看/安装工具), feedback/help/cookie chrome —
  the auto draft had encoded the sidebar as actions; curation drops it (rule 2).

\** stripe-com/pricing: per assignment the **already-reviewed hand model was copied verbatim**
(`m1/models/stripe-com/pricing.json` → `m1/curated/stripe-com/pricing.json`, no re-curation), then
validated/rendered/evaled. Its coverage (high 99→167 vs auto draft) reflects the hand encoding's
deliberate compactness — top story only (plans compare / included features / disputes; 28 facts,
fidelity 1.000, tau 0.22→0.81) — against an auto draft that string-matched 237 facts. Residual
highs classify as: product-catalog tail (接入 125+ 种支付方式, 全球覆盖 195 国家/地区, uptime
99.999%, Sessions banner), payment-method pricing detail table (3.4% + US$0.30 …), per-product
sections — the precision-vs-coverage trade of the reviewed exemplar, recorded, not "fixed".

## Per-page decisions

### 1. sspai-com/post-114716 — 少数派「本周看什么」9 部作品 (article)

- SET `_primary: "intro"` (👀 N 部作品推荐 + 本期导语) — what the original leads with after the
  title block; works/storylines follow capture order (tau 0.926).
- KEEP header (少数派编辑部 等 4 位作者 / 16 分钟阅读; date merged into root `_datetime`),
  intro + 3-part 一览 (近期佳作/精彩预告/影视资讯), 9 work sections (title, tagline `_summary`,
  meta lines, review paragraphs verbatim), 更多 3 短评 as `_items`, 📅 本周新预告 (4 + 5 "更多"
  trailers), 📽 影视新闻周报 (3), tags + 本文责编 @Lotta, 讨论 (1 条, 潘誉晗), 关联阅读 (4 往期,
  open actions, dates as `_detail`).
- REPAIR: meta "片长：…；豆瓣链接" re-split → fact line + `豆瓣链接` action; trailer/news summaries
  ending " 来源" re-split → `_summary` + `来源` action; 4 paragraphs the capture itself truncates
  at the 200-char `name` cap mid-sentence (翠鸟 ×2, 怪物 ×2) kept as maximal verbatim prefix
  ending at a sentence boundary (dropped tails 50/100/42/120 chars — capture artifact, not
  invention).
- ADD (capture-verified, draft missed): douban links for 怪物 (subject/37413245), 中头奖
  (subject/37214286), 命运与人 (subject/38619230); 来源 links for all 4 main trailers + 3 news
  items (x.com/weibo.com/youtube via sspai redirect, verbatim); per-item video links for
  牺牲/活色生香 (title-anchored bilibili URLs); tags, 责编, 讨论, 关联阅读 storylines.
- DROP (role + reason): site nav (共创/PRIME/Matrix/栏目/Pi Store); share widget 微信扫码分享…×2;
  per-work 发表首评 + 2 icon-only actions ×9 (comment-system repeated CTA; icon-only rule 8);
  article-end promo blockquotes (视频下载工具 ad; 小红书 plug — duplicates intro pointer);
  © 著作权 line (legal); 充电名单 4位派友已充电 + 4 avatars (supporter widget); comment UI
  (我来说一句/说点什么.../已加载全部/input, timestamp 18:03, unattributable XavierWu fragment);
  广告 麦金獭手机钢化膜 + 关闭广告; footer (联系客服…, beian); 文章目录 TOC (duplicate of
  storyline structure); cover/poster `_image`s (captured with empty URLs — unverifiable);
  intro's generic 点此 → topic/419 pointer (superseded; kept 看什么 Café → topic/416);
  生日快乐's second link 中国内地定档预告 + 绅士行动/另一个妈妈's unlabeled title-links
  (second URL to same trailer story, logged per rule 4).

### 2. sspai-com/u-jtc092al — MaxChow 作者主页 (profile/feed)

- SET `_primary: "feed"` (动态流 is the surface's content region).
- KEEP: identity card (MaxChow / 少数派作者 / `follow` 关注 — no target captured, verb by
  semantics); tabs 动态/收藏 (captured `/u/jtc092al/{updates,favorites}` absolutized); 成就与徽章
  panel as typed facts (成为少数派 529 天 + SINCE 2025, 创作文章 25, 文章阅读量 23535, 获得充电 4,
  获得徽章 0 + 暂无徽章); 动态 feed 10 articles as `_items` (`_name` title, `_detail` timestamp,
  `open` → post URL; event type 创作了一篇文章 merged to the storyline `_summary`).
- DROP: utility bars (中国大陆/登录/网页无障碍/切换企业版/已买到的宝贝/我的淘宝/购物车/收藏夹/
  免费开店/千牛卖家中心/帮助中心) — account nav; 11 empty avatar images (unverifiable); writer
  promo banner (无需申请，自由写作…); load-more/end-of-feed (更多/没有更多数据了/暂无动态);
  icon-only buttons; footer.
- DROP as unverifiable: header stat 16557 (no captured label; panel numbers are the owning copy).

### 3. stripe-com/pricing — copied hand model (per assignment)

- `cp m1/models/stripe-com/pricing.json m1/curated/stripe-com/pricing.json`; no edits.
- 0 validation errors; render + screenshot regenerated; fidelity 1.000 (28/28); tau 0.217 → 0.810.
- See overview note ** for the coverage delta reading (compact exemplar vs string-heavy auto draft).

### 4. stripe-docs/payments — docs overview page

- SET `_primary: "intro"` (使用 Stripe 开始接受支付。 + integration paragraph + 查找您的用例 CTA).
- KEEP: hero (full paragraph from capture `name`: "…并确定哪些 Stripe 产品最适合您的业务需求。"),
  支付选项 (tab chips 最热门/在线/线下/订阅/开账单 as single-select `_expose: payments-area` +
  2 cards), 支付方式 (3 cards, 无需代码 badge → `_tag`), 支付之外 (3), 平台和市场 (3),
  更多指南 (5 named groups as nested `_items`: 支付界面/管理支付/支付方式/API 基础知识/开始开发,
  19 link entries).
- REPAIR: draft's merged card labels ("线上收款 创建支付表单或使用预构建支付页面来接受线上付款。")
  re-split into `_name` + `_detail` + `open` action from the capture's finer nodes; 31 action URLs
  absolutized from relative hrefs, all grep-verified.
- DROP: left sidebar docs tree (≈40 links — navigation, incl. the duplicated 概览/收款 group),
  开始 chip + AI page tools (询问有关此页面的问题/LLM 副本/以 Markdown 格式查看/安装工具 —
  page chrome), 调至内容部分 skip link, search/login nav, feedback + help footer
  (此页面的内容有帮助吗？/Discord/更改日志/联系销售/llms.txt/Markdoc), cookie banner
  (全部接受/全部拒绝).

### 5. taobao-com/home — marketplace home (user judgement: story = "present goods to the user")

- SET `_primary: "search"` — the visually dominant center search (goods discovery entry).
- KEEP (all capture-verified): search box (query `_expose`, scope 宝贝/天猫/店铺 single-select
  `_expose: search-scope`, `submit` 搜索, 搜同款 `operate` child, ghost text 新款围脖 围脖
  iPhone 18 Pro as `_summary`); 大家都在搜 12 hot words with their captured search URLs;
  3 banner cards (家装节低至6折/换季必囤8.8折起/假日出游7.8折起); 频道 8 entries (天猫/淘宝直播/
  阿里企业购/司法拍卖/天猫超市/国家补贴/领券中心/中秋团圆季); 商品分类 36 categories
  (电脑…宠物, each `open` → captured category search URL — the marketplace shelf the draft had
  dropped entirely); 今日看点 carousel 5 slides re-split (淘宝秒杀/中秋好礼/抢官方补贴/服饰新风潮/
  秋季家装节 + detail lines, dots 1–5 dropped as controls); 促销会场 tiles with typed prices:
  百亿补贴 · 买贵必赔 (4 prices — draft had 3; capture has 4), 领券中心 (2), 淘宝直播
  (蜜蜂惊喜社/交个朋友 live URLs + tile action), 国家补贴 (2), 淘宝秒杀 (2), 更多低价商品
  (title only — no captured href, action dropped per F-025); 猜你喜欢 feed: 7 category tabs as
  `_expose: feed-category` + 18 goods cards (`_name` title, `_price` typed money CNY, `open` →
  item URL — draft labels carried "… ¥ 100" merged; re-derived from the capture's (title, price)
  pairs).
- DROP: utility/account bars, logo coin link, carousel dots, 全部频道 (`#` target), footer SEO
  paragraph block incl. bk.taobao.com keyword links (iphone17/newbalance/DingTalk live there),
  side rail (桌面版/消息/购物车/规则众议/官方客服/反馈), banner-card art titles visible only in
  the screenshot (中秋团圆季 card faces, 天天领补贴) — image-baked text, no capture backing →
  dropped per F-025 amendment.

## Generalizable protocol rules applied/extended (batch AF)

1. **URL oracle is `dom.html`** (F-025 concretized): nodes.json carries no hrefs; keep an action
   only if its target is grep-verbatim in the capture DOM (absolutize `/relative` against the
   meta.json origin, `//host` → `https:`). `javascript:;`, `#`, and borrowed targets are
   inventions — drop the action, keep the visible copy as text.
2. **Screenshot-derived facts need capture backing or get dropped**: image-baked banner titles,
   cover/poster images with empty captured URLs, and unlabeled numbers (u-jtc 16557) are not
   expressible as verifiable facts — dropped, never reconstructed from the picture.
3. **Capture-truncation has a hard boundary**: when the capture's own `name` cap ends a paragraph
   mid-sentence (F-023 family), keep the maximal verbatim prefix ending at a sentence boundary and
   log the dropped tail; never complete the sentence from world knowledge.
4. **Re-split merged action-labels by re-derivation from finer capture nodes**: "片长：…；豆瓣链接",
   "线上收款 创建支付表单或…", "淘宝秒杀 天天好价 产地直发…" become identity (`_name`) +
   supporting (`_detail`) + action (`label` = the anchor's own visible copy, e.g. 来源/豆瓣链接).
5. **Typed money/num even when the source string is glyph-prefixed** ("¥14999", "25 篇"): the
   amount is the fact; the glyph is presentation. Expect a coverage warning per such string until
   the renderer renders currency glyphs / the metric normalizes them — classified artifact, never
   a reason to fall back to label strings (F-024 spirit).
6. **Feeds/activity streams**: event type merges into the storyline `_summary`; entries are
   `_items` with `_name` + `_detail`(timestamp) + `open`; load-more/已加载全部/dots are pagination
   chrome.
7. **Captured choice chips encode as single-select `_expose`** (docs area tabs, search scope,
   feed category) — but only with captured option labels (search-laptop rule for invented ones
   stands).
8. **Second links to the same story drop with a log line** (trailer title-link vs 来源; 定档预告 vs
   来源): one action per storyline-owning node, the labeled/visible-copy one wins.

## Renderer/eval findings (not fixed here — for the prior library)

- money renders as "14999 CNY" while every CN source shows "¥14999" → systematic high warnings on
  price-heavy pages (taobao high 12→38 is ~90% this). Consider currency-glyph rendering for CNY or
  currency-aware normalization in `source-coverage.mjs`.
- num-typed stats ("529天" → `_measure {num:529,unit:天}`) similarly can't substring-match the
  source concatenation; same artifact class.
- greedy wrapper strings (region containers) stay unmatched by design; fine — they're triage noise.

## Deliverables

- `m1/curated/sspai-com/post-114716.json`, `m1/curated/sspai-com/u-jtc092al.json`,
  `m1/curated/stripe-com/pricing.json` (copied), `m1/curated/stripe-docs/payments.json`,
  `m1/curated/taobao-com/home.json` — all validate with 0 errors.
- Renders + full-page screenshots: `m1/curated/renders/{sspai-com-post-114716,sspai-com-u-jtc092al,
  stripe-com-pricing,stripe-docs-payments,taobao-com-home}.html|.png`; auto-draft baselines
  `auto-*.html` for eval reproduction.
- Nothing outside `m1/curated/**` written; nothing committed.
