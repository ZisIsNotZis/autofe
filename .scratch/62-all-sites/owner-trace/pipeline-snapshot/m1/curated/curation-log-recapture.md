# M3 re-curation batch — 4 re-captured exemplar pages (log)

Date: 2026-09-29. Worker: re-curation of the 4 exemplar pages whose captures were re-taken
(search interaction fixed on both huawei site-search pages; lazy-paint fix on aliyun home;
pre-scroll fix on bilibili video). Protocol: `.scratch/04-m3-curation/spec.md` + pilot rules
(`curation-log.md`) + batch AD/AF rules + F-023 (mid-animation capture) / F-024 (money.qualifier)
/ F-025 (URLs verbatim from capture) / F-028 (level tiers: 2 = secondary zone aside, 3 = on-demand
reference) / F-029 (`_intent` never rendered; groups need `_title` from the page's own headings).

Scope: writes under `m1/curated/**` only — 4 curated models, 4 renders + screenshots,
`assets/bilibili-video-player.png`, this log. Nothing committed; no other files touched.
Oracles: `nodes.json` full `name` = FACTS; `full.png` = EMPHASIS; `dom.html` = URL oracle (F-025).
All action targets grep-verified verbatim in `dom.html` (`//`-relative → `https:`, `&amp;` unescaped).

## Task-framing vs capture reality (recorded honestly)

The assignment described the huawei search results as "20 product-name nodes (Mate 70 RS/Pro,
nova 14 Pro, Pura 80 Pro…)". The re-captured `nodes.json` carries **no such nodes**: the huawei
corporate site search returns **web results** (product landing / service / campaign pages), 10
painted entries per page, with per-category counts and no product cards. Both models below curate
what the capture actually carries, per protocol (capture is the only fact oracle). Also verified:
**no ¥ price exists anywhere in either capture** (grep `dom.html` + nodes) — corporate search does
not carry prices; none invented.

## Results overview (evals: `m1/eval/metrics.mjs` + `m1/eval/source-coverage.mjs`, strict scope;
"before" = previous curated model rendered against the NEW capture)

| page | factFidelity before → after | storyline tau before → after | cov high b → a | med b → a | info b → a |
|---|---|---|---|---|---|
| huawei-cn/search-phone | 1.000 (10/10) → **1.000 (45/45)** | — (null) → 0.309 | 14 → **9** | 12 → **3** | 42 → **36** |
| huawei-cn/search-laptop | 1.000 (10/10) → **1.000 (47/47)** | — (null) → 0.364 | 17 → **9** | 9 → **3** | 39 → **38** |
| aliyun-com/home | 1.000 (69/69) → **1.000 (177/177)** | 0.593 → **0.636** | 83 → **67** | 148 → **104** | 240 → **194** |
| bilibili-com/video-bv1gj411x7h7 | 1.000 (107/107) → **1.000 (154/154)** | — (null) → — (null) | 82 → **17** | 0 → 0 | 36 → **9** |

All four validate with **0 errors**. The tau "null → 0.31/0.36" on the search pages reflects the
empty→filled upgrade: the old 0-result models had no matchable storylines at all. bilibili tau
stays null in both runs (this archetype's model storylines produce no heading-order match —
pre-existing metric behavior, not a regression).

## Per-page decisions

### 1. huawei-cn/search-phone — corporate site search, now with real results (was 0-result page)

Kept the old skeleton (query / 类别 filters / results / 重置), filled with the new capture:
- **filters**: real category counts — 全部 (3562) / 产品与解决方案 (160) / 服务支持 (1443) /
  技术探讨 (181) / 新闻与活动 (330); single-select `_expose: category`; `重置` operate kept.
- **results**: `_count {num:3562, unit:条结果}`; 10 `_items` in capture order, each `_name`
  (result heading) + `_summary` (result paragraph, where present) + `_detail` (来源：消费者业务网站
  / 来源：集团网站 / 来源：华为云业务网站 — the result's own visible copy) + whole-card `open` to
  the verbatim DOM URL (e.g. `//consumer.huawei.com/cn/phones/` → `https://…`; 云手机 →
  `https://www.huaweicloud.com/product/cloudphone.html` — the `.html` form comes from dom.html,
  not the truncated label in nodes).
- **pagination** (new group): 1 (current, `_primary`) 2 3 4 5 … 357 as `_items` **without
  actions** — the DOM targets are `javascript: ;` (batch AD rule 1; mi-com precedent). Total-page
  fact (357) is carried by the item copy.
- DROP (unchanged from previous pass, reasons stand): utility bar + 30-language mega list (site
  chrome); nav + logo row; breadcrumb 首页/搜索结果 (§8); `相关性` sort (single painted option, not
  a set — option set not in capture); 在线客服 floating widget (overlay; the draft again attached
  it as an `_image` with empty URL); footer 关于华为/新闻与活动/发现华为/我们的产品/技术支持
  columns + social + ICP 粤A2-20044005号 / 粤公网安备44030702002388号 (footer sitemap/legal).
- Residuals after (high 9): category-count wrapper generics (each count is modeled; the
  concatenated wrapper strings stay unmatched by design), `3562 条结果 相关性` fragment (count
  modeled; sort dropped), footer/legal chrome (irreducible). Med 3 = footer headings.

### 2. huawei-cn/search-laptop — same archetype, 80 条结果

- filters: 全部 (80) / 产品与解决方案 (12) / 服务支持 (33) / 技术探讨 (3) / 新闻与活动 (12);
  results `_count {num:80}`; 10 items (华为笔记本 / MateBook Pro / 鸿蒙电脑 / MateBook Fold
  非凡大师 / MateBook GT 14 / D 14 2024 13代酷睿版 / D 16 2024 / X Pro 酷睿 Ultra 微绒典藏版 /
  MateBook 14 酷睿 Ultra / 笔记本电脑服务), all `来源：消费者业务网站`; pagination 1–5/…/8.
- **Capture-truncation repair (F-023 family, batch AF rule 3 boundary case)**: MateBook 14's
  summary paragraph is cut at the capture's 200-char `name` cap mid-sentence ("…释放本地超强 ").
  The completion ("AIGC 能力。") is taken **verbatim from dom.html** — a DOM-verbatim repair, not a
  completion from world knowledge; logged here per rule.
- DROP set identical to search-phone. Residuals: same classified profile (high 9 / med 3).

### 3. aliyun-com/home — re-captured with lazy-paint; infrastructure section now in DOM

KEPT the reviewed structure (hero → promos → ai-exp → maas → benefits → infra → analyst; page-level
CTA `立即免费体验` → `https://www.aliyun.com/exp` at root, per F-028 curation correction) and
UPDATED facts from the new capture:
- **infra**: 全球公共云可用区 **106 → 107**（live-site change, capture-verbatim: heading `107个` +
  emphasis `107` + label 全球公共云可用区）; 31 地域 / 3200+ 边缘节点 / 180+Tbps 带宽 unchanged.
  ADD `了解更多全球基础设施` → `https://infrastructure.aliyun.com/`（verbatim）, ADD 基础设施地图
  `_image` (alicdn URL verbatim; the old model had to leave it unattached — empty-URL artifact of
  the old capture), ADD compliance subgroup with the now-painted 6 certifications (ISO 27001 /
  ISO 27701 / SOC1/2/3报告 / 工信部云计算服务能力评估 / PCI DSS / 公安部网络安全等级保护).
- **promos**: banner rotation changed between captures — now Qwen Book 亮相云栖大会（→
  qianwenai.com/product/qwenbook）and 万小智 3.0，首月低至 15 元（→ wanwang.aliyun.com/website/xiaozhi;
  the old capture's 万小智 9.9 元 / Qwen3.8-Flash cards are gone from the page); 轻量上云 38 元/年
  and Qwen3.8-Max unchanged.
- **ai-exp**: 智能建站 card re-copy — subtitle `万小智 3.0 | 不止建站，更懂经营`, detail `智能生成
  网站前后台，支持 GEO/SEO，上线即经营`. **Leading images added** where the capture has them
  verbatim: hero Banner 图 + all 6 ai-exp 封面图 (real alicdn `src`s now painted; attribution is
  deterministic — each cover sits inside its card link right after the card's own detail text).
  Customer-story card images left unattached: empty `alt`, multi-card region, attribution not
  provable from the capture (F-025 discipline).
- **NEW painted sections added** (all facts capture-verbatim, order = capture):
  - `qwen-models` 千问大模型，企业拥抱 AI 时代优选 — intro panel (title/summary + 3 能力主张 texts +
    访问模型市场 → qianwenai.com/models) + 6 model `_items` (`_category` = card heading 视觉语言/
    视觉理解/图片生成/视频生成/全模态/语音识别, `_name` = model id, `_detail` = description, card
    `open` → try-ai URLs verbatim).
  - `products` 完整的产品体系 — 全部云产品 action; 9 类目页签 as single-select `_expose: product-tab`
    (精选产品 `_primary`; tabs have no captured targets → no actions, batch AD rule 1); 15 product
    `_items` (`_name`/`_tag 大模型`/`_detail`/card `open`), with the capture's extra per-card CTAs
    kept as children where they exist (ECS 立即选购/免费试用, 千问大模型 模型体验, 百炼 应用构建);
    `查看详情` links duplicate the card target → dropped (batch AF rule 8).
  - `solutions` 依托大模型与云计算协同发展 — 全部 AI 解决方案 action; 5 solution cards
    (name/description/card link; `了解详情` duplicates dropped); `联系 AI 专家` appears ×5 with the
    same pre-sales-chat target → merged into one storyline-level action (stated-N-times merge).
  - `stories` AI 赋能千行百业 — 全部客户案例 action; 6 cases (行业 `_tag` + story `_name` +
    `_detail` where the capture shows one (巴黎奥运会 / 春晚) + card `open` verbatim).
  - `services`（no captured section heading → intent-only group, F-029 rule respected）—
    立即体验 在阿里云上创造未来（免费体验 → free.aliyun.com）+ 4 service cards (7x24 / 1v1 贴身 /
    多渠道 / 专业上云).
  - benefits: ADD storyline action 全部权益 → aliyun.com/benefit (painted, previously unpainted).
- DROP: top/nav account rows, footer sitemap + 关注阿里云 + 4008013260 + 浙B2-20080101 ICP block;
  nav hover mega-panels (文本生成/Kimi-K3/Deepseek-v4-pro/GLM-5.2/语音识别与合成… and the Dify
  解决方案 panel) — these nodes are `visible: false` in the capture (dropdown panels), chrome by
  the batch-AD chrome rule with capture evidence.
- Residuals after (high 67 / med 104 / info 194): almost entirely (a) greedy wrapper generics
  concatenating many kept facts (the measured artifact — each part is in the model, wrappers
  unmatched by design) and (b) footer/legal/nav-drops. No painted, visible section of the new
  capture is left unmodeled.

### 4. bilibili-com/video-bv1gj411x7h7 — re-captured with pre-scroll; video now painted

KEPT the reviewed 8-storyline model; UPDATED every changed fact:
- 15万 弹幕（was 14.9万）; toolbar merged measure `292.1万 127万 153.6万 49.3万` →
  `293.3万 127.5万 154.3万 49.5万`; UP 笔记 46篇 → **47篇**; live count 96 → **65人正在看**;
  uploader fans 94.7万 → **94.9万**（both `_count` and the 关注 94.9万 label）.
- **up-next feed fully replaced (20/20)**: new titles/durations/authors/play+danmaku counts from
  `nodes.json` merged generics, `open` targets from dom.html `recommend_more_video` hrefs in DOM
  order (relative `/video/BV…` absolutized; `&amp;` unescaped). Pairing validated against known
  BV↔title pairs (BV1eS4y157Ey / BV1NZ4y1j7nw / BV1qU4y1F73A / BV1jz421R7V2 unchanged).
- **Player visual (the point of the pre-scroll fix)**: the player region IS painted in the new
  `full.png`. Cropped with ImageMagick from the node bbox (哔哩哔哩播放器: x41 y168 w978 h596),
  trimmed to the actual video area **978×550** — the node bbox includes the danmaku-input strip
  (y≈718 abs); 978×550 is exactly 16:9. Paint verified by color count (~101k distinct colors) and
  visual check before cropping. Attached as root `_image` → `../assets/bilibili-video-player.png`
  (mi15 asset precedent), alt states provenance (自原页截图裁切，捕获时刻 00:09/03:33).
- **NEW storylines from the newly painted regions**:
  - `danmaku-sample`: the 44 unique floating danmaku at the capture instant (role `comment`,
    player-region x-bounds only; the x≈1244 copy lives in the 弹幕列表 panel and is excluded).
    Merged wrapper `+1 P C L 2 百 宝 箱` split into its two visible comments (`+1`, `P C L 2 百
    宝 箱`); one zero-width space stripped from 听着写寒假作业​ (invisible capture artifact).
    Modeled as a sample with capture-instant provenance in `_intent` — danmaku is flowing content.
  - `danmaku-list`: the right-panel 弹幕列表 (捕获时 填充中... + 查看历史弹幕 operate — no URL in
    DOM, kept action-less of any invented target).
- DROP (chrome, classified): header search box with ghost hot-search text 虚照V0已出 LV999狼尊实至
  名归 清算开始咯 (nav chrome, not the page's query); player-internal settings flyouts (镜像画面/
  单集循环/自动开播/播放策略/4:3 16:9… settings menu, 优先使用 HEVC/H.265、AVC/H.264 编码偏好,
  弹幕设置 按类型过滤/滚动/固定/彩色/防挡字幕/显示区域 50%, 视频底部15%空白保留区, 试看30秒 badge,
  player control bar 00:09 / 03:33 自动 倍速 字幕 — duration fact already on root); 用手机看/稍后
  再看 (toolbar pop-over controls, no captured targets — dropped in the reviewed pass too).
- Residuals after (high 17 / info 9): player flyouts above, greedy wrapper generics (each part
  modeled), search ghost. Down from 82 high — the drop is real: counts/notes/live/follow now
  match the capture, the 20 up-next entries are modeled, and the danmaku sample covers the
  floating-comment keys individually.

## Generalizable rules applied/extended (recapture batch)

1. **Curate the capture, not the brief**: where the task framing and `nodes.json` disagree
   (product-name results vs web results), the capture wins and the discrepancy is logged.
2. **Empty→filled search archetype upgrade**: when a fixed capture turns an empty state into
   results, the skeleton (query/filters/reset/count) survives; results become `_items`
   (name/summary/来源 detail/card `open`), and pagination stays action-less while its DOM targets
   are `javascript: ;`.
3. **DOM-verbatim truncation repair**: a `name`-cap cut can be completed from `dom.html` (same
   capture) — never from world knowledge; log the repair (search-laptop MateBook 14).
4. **`visible: false` nodes are chrome with evidence**: hover/dropdown panels captured with bboxes
   but flagged invisible are a drop class distinguishable inside the capture itself (aliyun mega
   menus) — no judgement call needed.
5. **Capture-instant content classes**: floating danmaku are sample facts with provenance in
   `_intent`; banner rotations between captures (aliyun promos, bilibili up-next) are wholesale
   replacements, not diffs to merge.
6. **bbox crop discipline**: crop from the element bbox but trim to painted content when the bbox
   spans an attached control strip; verify paint (color count / visual) before attaching, and state
   provenance in `alt`.
7. **Leading images need verbatim `src` + provable attribution** (aliyun covers: image sits inside
   the card link after the card's own detail text; customer-story images: attribution not provable
   → left unattached, logged).

## Deliverables

- `m1/curated/huawei-cn/search-phone.json`, `m1/curated/huawei-cn/search-laptop.json`,
  `m1/curated/aliyun-com/home.json`, `m1/curated/bilibili-com/video-bv1gj411x7h7.json` — all
  validate with 0 errors.
- Renders + screenshots regenerated: `m1/curated/renders/{huawei-cn-search-phone,
  huawei-cn-search-laptop,aliyun-com-home,bilibili-com-video-bv1gj411x7h7}.{html,png}`.
- `m1/curated/assets/bilibili-video-player.png` (978×550 crop from
  `corpus/bilibili-com/video-bv1gj411x7h7/full.png`, bbox from nodes.json).
- Nothing outside `m1/curated/**` written; nothing committed.

## 矛盾处置（父级核验）
采集 worker 报告称 search-phone 新 capture 含 "Mate 70 RS/Pro, nova 14 Pro, Pura 80 Pro 等 20 个商品名节点"；重策展 worker 报告 capture 只有网页结果、无商品节点。**父级直接核验 capture：0 个商品名节点**——采集 worker 的报告有误（未经验证的说法）。
处置：以 capture 为 oracle，网页结果版策展成立。企业官网搜索（网页结果）与 mi 商品搜索（商品卡）共同覆盖 search-results 原型的两种形态——多样性反而更好。
教训：worker 间的报告矛盾必须由父级对照原始证据核验，不能凭"谁先报告"采信。
