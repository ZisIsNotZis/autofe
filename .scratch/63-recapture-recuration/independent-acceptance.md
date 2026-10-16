# Independent acceptance — round 63, 40-page baseline (fresh reviewer, never the worker)

Reviewer: independent acceptance subagent, 2026-10-16. Working tree at commit `8376c4b` (round-63 integration commit) plus in-flight renders `index.html`/`manifest.json` from my own pipeline re-run. Inputs: `ticket.md`, `active-work.md` (轮 63 收尾快照), `m1/failures.md` F-100. Evidence re-verified from primary artifacts (corpus/, models, renders, allow files), not from claims.

Screenshot budget: 2 of ≤4 reads used (two side-by-side montages: render ⇄ corpus, built via pillow crops; `convert`/ImageMagick not installed on this machine — pillow used instead, same region-crop discipline).

---

## Criterion 1 — pipeline re-run by the reviewer: **ACCEPT**

Command (run twice, both exit 0):
```
AUTOFE_CHROME_PATH=/home/z/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell \
AUTOFE_PLAYWRIGHT_CORE=/home/z/vibe/autofe/tools/capture/node_modules/playwright-core \
node m1/eval/pipeline.mjs --shots
```
Observed (full log /tmp/pipeline63.log): 渲染 40/40 错误 0 · 保真 1.00 **40/40** · Markdown 渲染 40/40 保真 1.00 **40/40** · 模型校验 **46 全通过**（10 条非阻断 warn）· 校验器自测 · 地基自测 D1/D2/D3 · 度量自测 F-052 · 文本/轴/MD 自测 · 证据门禁（哈希）· 归属工具自测 · **采集↔模型一致性 F-078 通过（40 页，事实 5698，未命中 0，声明白名单 65）** · 图片不放大 · 复合元语 · 控件渲染 47/47 · 链接覆盖（未声明差额 0，声明 44/72）· 可见英文标签（泄漏 0）· 强调保真（双向差额 0）· 可供性 · 布局系统 · 页面框架/动作 · 来源关联可证伪 — **全部 通过**；视觉自查 **40/40 干净**；证据一致性（PNG⇄HTML 同源）通过。**EXIT=0.**

Falsification notes:
- `截图 0 张` is correct behavior, not a skip: renders are deterministic (re-render byte-identical), and the round-31 manifest binds HTML sha256 ⇄ PNG sha256 per page; the 证据一致性 gate verified all 40 current hashes against it. The PNGs I read in criterion 2 are the same bound artifacts.
- Minor (cosmetic, non-blocking): two log strings still print the stale denominator "42 页"（「不一致清单: 无（42 页全部一致）」「未声明差额清单: 无（42 页的锚点事实…）」）. The actual lists are empty and every real denominator is 40. Repair: update the two log templates.

## Criterion 2 — 3-archetype spot check (falsified, not trusted): **ACCEPT** (1 minor)

Method: extracted every string from each model (facts, targets, image URLs, alts; `_intent` prose excluded), matched against `dom.html` (raw, tag-stripped, and entity/nbsp-normalized), `nodes.json`, `a11y.json`; unresolved candidates then drilled individually. Visual: side-by-side montage render-PNG ⇄ corpus full.png per page.

### apple-com/airpods-pro (new curation, D-63d) — verified
- 227 strings: all 30 `_image` URLs and all `_action` targets are the capture's own `srcset`/`href` values (path-only or protocol-relative in dom, absolutized against `https://www.apple.com` — e.g. hero `hero__b0eal3mn03ua_large.jpg`, buy `/us/shop/goto/buy_airpods/airpods_pro_3`, film m3u8, environment PDF ×1 in dom). Length checks match modulo the scheme prefix.
- The 22 `_detail` "misses" are exactly the declared conversion class: dom text with inline `<sup class="footnote...">N</sup>` digits removed and nothing else changed — spot-verified **7/7** (incl. `_lines[5]._detail`: dom `...workouts.<sup…>5</sup> Using LEDs that pulse invisible light 256 times…` ⇄ model without the 5). Not inventions.
- Images: render paints the capture's own CDN assets in the right slots (hero photo, 6 highlight cards, closer-look viewer). Montage: title/`_subtitle`/`_summary`/Buy verbatim; section order (highlights → closer look) matches capture order.
- **MINOR M-1**: 3 `_name`s in `personalized-listening` carry a trailing period absent from the capture: model "Adaptive EQ." / "Personalized Spatial Audio." / "Dynamic head tracking." vs dom `<strong>Adaptive EQ</strong>…` and a11y names without the period (dom has `Personalized Spatial&nbsp;Audio` mid-sentence). One-character punctuation addition each; tolerated by the gate's boundary-aware matching; not declared in the worker report (which claims the other 116 facts match "literally"). Not invented content (no new fact). Repair: drop the 3 trailing periods (or declare the normalization in the report/curation log).

### sspai-com/login (new curation) — verified
- 19 strings, **0 unresolved**: field label, submit, merged dial-code panel (nodes.json verbatim, trailing orphan `57` honestly dropped with reason), agreement sentence, both hrefs verbatim in dom (`/page/agreement`, `/page/privacy_policy`), group labels, support items.
- Drops are evidence-backed, not silently lossy: hidden password input (`visible:false`, `comp__PasswordInput--hidden`/`aria-hidden` in dom), icon-only buttons (private-use codepoints), region-list tail with no completion source — all recorded in `_intent`. Login block correctly modeled as plain form group, not `_composite:"login"` (would have required an invented secret field).
- Render montage matches; corpus full.png is a by-design white page (1.3% dark pixels — the small form text), consistent with the 30.5KB artifact.

### taobao-com/home (heavy re-curation, largest drift) — verified
- 221 strings → **0 unresolved** after standard URL resolution; all 18 `_lines[8]` item targets byte-identical to dom hrefs modulo `//`→`https://` (dom 926+6=932 chars = model length); 6 nodes-only merged texts confirmed verbatim in nodes.json.
- Visual: render product grid shows the capture's own products — spot-matched 遮光窗帘 (「99.9% 全遮光…暗无天日」), 天猫VIP会员直充, 【芭芭农场】皇冠梨 ¥16.9 etc., with covers/prices from the same capture band; promo carousel 双11 target verbatim ×3 anchors.
- No invented content found on any of the three pages.

## Criterion 3 — retirement honesty: **ACCEPT** (2 minor doc gaps)

- `apple-com/iphone-16`: `corpus/failures.json` entry (http_error HTTP 503, 2026-10-16T08:19:50Z, navigation stage) + `sites.json` `skip:true` with dated note "[2026-10-16 D-63d: … 503 persistently; retired, replaced by airpods-pro]" + F-100. Consistent and re-verifiable.
- `stripe-dashboard/login`: `corpus/failures.json` entry (suspicious_empty_render, `renderedNodes=2 bodyTextLength=0`, 2026-10-16T08:12:37Z) + F-100 + `skip:true`. **MINOR M-2**: the sites.json entry carries only the round-9 `note` (singular key); no round-63 retirement note. Repair: add the dated skip note.
- `36kr-com/home` + `information-technology`: correctly **not** in failures.json (HTTP 200 shells) and correctly not `skip:true` (site still captured for the two search pages). Shell claim re-verified from the captures themselves: feed headlines repeated ×17–21（「是的，特斯拉真造了一辆「飞行汽车」」×21，「刚刚，Meta亮出…」×17）, nav labels ×26–34（科技×34, 推荐×26）— a duplicated link shell, not a feed. **Wording nuance**: F-100's 「零 feed」 slightly overstates (headline text exists but massively duplicated); the retirement substance stands. **MINOR M-3**: these two sites.json entries carry `notes:""` — the ticket's "sites.json 已同步" is only true for iphone-16; the 36kr retirement is documented in F-100/active-work only. Repair: add a dated note to both entries (or correct the ticket's sync claim).
- Replacements are real captures: `corpus/apple-com/airpods-pro/meta.json` status **200** (2026-10-16T08:42:04Z, full node/dom/a11y/PNG set), `corpus/sspai-com/login/meta.json` status **200** (2026-10-16T08:41:16Z). Both curated and gated (airpods 138 facts / 22 declared conversions; sspai-login 13 facts / 0 unmatched).
- Denominator sync verified: 40 top-level page renders; 40 page models (`m1/curated/**.json` minus manifest); `m1/eval/m3-scale.json` = 40 exemplar-tier entries all ok, airpods-pro + sspai-com/login present, all four retired pages absent; retired curated models/renders deleted (`36kr-com/` keeps only search pages; no `stripe-dashboard/`).

## Criterion 4 — whitelist hygiene (6 entries sampled): **ACCEPT**

Samples (each re-verified with a one-command grep/JSON check):
1. capture-integrity-allow · airpods `_lines[5]._detail` (conversion, sup-digit) → dom text minus inline `<sup>` digits = model text; class spot-check 7/7.
2. capture-integrity-allow · linear-app/home customers logo wall (capture-gap) → `Vercel|Figma|Coinbase` = 0 hits in dom.html and a11y.json; 0 `_brand` in the model. Brands deleted, not invented.
3. link-coverage-allow · taobao-com/home 秒杀 wrong-target → old frame target genuinely absent (residual `mspd.tbmspc`/`web.m.taobao.com` greps are *different* elements: `…pcnew` source tag and the separate seckill anchor the model uses); new 双11 target verbatim ×3 in dom and in model.
4. link-coverage-allow · airpods PDF wrong-target → `Apple_AirPods_Pro_3_PER_Sept2025.pdf` ×1 in dom; model absolute URL = that path.
5. link-coverage-allow · sspai-com/post-114716 `[电影] 伪钞之王` → anchor present with text and `href="https://movie.douban.com/subject/37116027/"` verbatim.
6. audit-visual-allow · huawei-cn/home `img-variance` (the file's only entry, sampled exhaustively) → cited mosaic dimensions (473×680 | 418×330×2 | 363×680) found exactly in nodes.json img bboxes; flag remains visible as (info) in the board, not hidden.

No sampled entry papers over a real mismatch; all carry kind/reason/round 63.

---

## Additional hygiene findings (non-blocking)

- **H-1**: 3 stale git-tracked auto-layer renders of retired pages persist in `m1/curated/renders/`: `auto-36kr-com-home.html`, `auto-36kr-com-information-technology.html`, `auto-apple-com-iphone-16.html` — contradicting the snapshot's 「4 个退役模型+renders 已删」 (top-level renders were deleted; the auto layer kept 3). They reference captures that no longer exist and are dead evidence. Repair: delete the 3 files (outside the gate denominator; no gate impact).
- **H-2**: per-page re-curation reports exist for the new pages and heavy drift pages checked here (airpods, sspai-login, sspai-matrix) plus link-closure links-*.md, but not for every re-curated page (e.g. no taobao home main report, sspai home, huawei search-phone). The gates + corpus carry the verification, but per-page provenance is incomplete for an independent audit of those pages. Repair (optional): one-line drift classification per remaining page, or an explicit batch report naming them.

## Verdict

| Criterion | Verdict |
|---|---|
| 1. Pipeline re-run (exit 0, all gates 通过) | **accept** |
| 2. 3-archetype spot check | **accept** (minor M-1) |
| 3. Retirement honesty + replacements | **accept** (minors M-2, M-3) |
| 4. Whitelist hygiene (6 samples) | **accept** |

**Overall: ACCEPT** — the 40-page round-63 baseline is honest: capture=truth holds on every sampled fact, targets are lifted verbatim (modulo declared absolutization), images are the capture's own source regions, no invented content found, retirements are evidence-backed, and no allow entry conceals a real mismatch. Minor repairs M-1..M-3 and H-1 are hygiene, none gate-affecting.
