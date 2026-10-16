# bilibili-com/video-bv1gj411x7h7 — round-63 re-curation report

Worker: wave-2 heavy-drift re-curation (single page). Date: 2026-10-16 (+0800).
Scope: `m1/curated/bilibili-com/video-bv1gj411x7h7.json` only. No shared files touched;
no pipeline run; no renders/ written (integration re-renders).
Oracles: `corpus/bilibili-com/video-bv1gj411x7h7/nodes.json` (names = FACTS),
`dom.html` (URL targets, F-025 verbatim, `//`→`https:`, `&amp;` unescaped),
`full.png` (EMPHASIS). Protocol: `curation-log-recapture.md` rules 1–7, F-023/24/25/28/29.

## Drift classification: heavy (109 unmatched measured)

Pre-work `capture-integrity` on the fresh 2026-10-16 capture: 181 facts total, 157 scanned,
**109 unmatched** — `up-next` 66 (feed rotated 20/20), `danmaku-sample` 37 (floating layer
rotated), `stats` interaction counts 4, `live` 1, `uploader` fans 1. Everything else survived:
title, 1亿 播放, datetime, 03:33, danmaku input row, 弹幕列表 loading panel, credits (8/8),
tags (6/6), uploader card copy, report/notes entry points.

## Decisions

1. **Skeleton kept** — all 10 storylines and every retained action target re-verified verbatim
   in the new `dom.html` (incl. 弹幕礼仪 `//www.bilibili.com/blackboard/help.html#/?qid=359&amp;pid=357`,
   passport register, uploader space/message, all 8 credit space links). 自动连播 switch state
   re-verified `<div class="switch-btn on">` — the `_intent` "当前开启" claim stays true.
2. **up-next replaced 20/20** (banner-rotation rule 5, no merge with old feed): titles/durations/
   authors/measures from `nodes.json` rail leaves; card `open` = `recommend_more_video.-1..18`
   hrefs absolutized; `authorLink` = the one `space.bilibili.com` href inside each card block
   (1:1 pairing, DOM order); `_image` = each card's `img src` (`i0.hdslb.com/bfs/archive/…
   @336w_190h_1c_!web-video-rcmd-cover.webp`), alt cross-checked = title. Pairing validated
   against BV↔title↔author pairs that predate this capture (BV1eS4y157Ey/Rickrocknroll/373025504,
   BV1NZ4y1j7nw/比划大魔王/479724334, BV1Ly4y1L7mA/田一名sir/477676711, BV1Qs411d7pd/伊秋Yikyuu/13972642).
3. **Rotated counters updated verbatim**: interactions 295.4万/128.3万/155.3万/50万; 笔记 47→46篇;
   live 65→**32人正在看**; fans 94.9→**95.3万** (`_count` + 关注 label + intents).
4. **Danmaku count 15万 → 15.1万** (header fact block "1亿 15.1万 2020-01-01 07:43:23"). Tool
   observation: the old `15万` **passed** capture-integrity as a substring of compacted
   `4491.5万` (`44915万`) — R4 punctuation-dropping makes short numerals match inside longer
   merged tokens. Fixed by hand; parent may want a gate-side look (non-blocking for this page).
5. **danmaku-sample: capture-instant sample rebuilt from paint, not DOM queue.** Capture instant
   is **00:23 / 03:33** (control-bar nodes; was 00:09). `full.png` crops (player 978×596; strip
   ×2 zoom) show exactly two floating danmaku on screen: white `传 说 之 下 困 难 模 式 官 方 掩饰。`
   and a blue `我们从陌生到相爱`. The blue one has **no node** in `nodes.json` → not a fact,
   not transcribed. The 53 DOM comment nodes are all unpainted at the instant (12 in-player with
   `visible:false, opacity:0`; the rest negative-x scrolled-out or queued at x=31) → rule-4 drop
   class with capture evidence. Sample = the one node-backed painted comment; `_intent` states
   the provenance (捕获时刻 00:23，弹幕层近乎清空). The old 44-comment sample facts are gone
   with the old capture.
6. **Dead local assets → verbatim URLs (F-025)**. The model referenced `../assets/62-…` files
   (og:image cover + 20 thumbnails) that are **gitignored** (`/m1/curated/assets/62-*`) and were
   lost in the re-clone. Replaced with the page's own image URLs from the new `dom.html`:
   root cover = `og:image` (`i1.hdslb.com/bfs/archive/524275…jpg@1200w_630h`), thumbnails as in
   (2). mi-com/apple-com precedent: image URLs are legitimate verbatim values. No new asset
   crops; nothing added to `assets/`.
7. **Drop set unchanged**: header nav/search ghost, player flyouts/control bar (chrome), footer —
   all still absent from the model and still not curated, per prior rounds.

## Proposed allow entries

**None.** 0 unmatched reached without allowlisting; no capture-gaps either.

## Proposed asset additions

None (see decision 6 — URL references instead of crops).

## Cross-page observation (not my scope)

`huawei-cn/consumer-phones`, `huawei-cn/search-laptop`, `learn-microsoft/vm-sizes`,
`linear-app/home`, `stripe-docs/payments` still reference dead gitignored `assets/62-*` files
(verified: files absent, pattern gitignored). capture-integrity does not scan `_image` values,
so these fail only visually at render/screenshot time. Same repair pattern as decision 6 is
transferable where `dom.html` carries the srcs.

## Evidence (all rerun after the final edit)

- `node m1/validate.mjs m1/curated/bilibili-com/video-bv1gj411x7h7.json` → **ok (0 errors)**
- render via `import('./m1/render.mjs')` → `/tmp/w-bili-video.html` (55,322 bytes)
- `node m1/eval/metrics.mjs m1/curated/bilibili-com/video-bv1gj411x7h7.json /tmp/w-bili-video.html corpus/bilibili-com/video-bv1gj411x7h7` → **factFidelity 1.00 (138/138)**, missing [];
  storyline tau null (pre-existing metric behavior for this archetype, unchanged)
- `node m1/eval/capture-integrity.mjs --model …` (env: AUTOFE_CHROME_PATH/AUTOFE_PLAYWRIGHT_CORE)
  → **unmatched 0**, allowlisted 0, captureGaps 0, provenanceErrors 0 (138 total / 115 scanned;
  23 excluded by the sub-10 / no-letter information threshold)
- Kept-fact spot audit: all retained text facts re-matched against the new capture hay; the only
  miss found (`47篇笔记`) is the one updated to `46篇笔记`. Root `_measure` `15万` would have
  matched only via the substring weakness → corrected to `15.1万` regardless.
- Screenshot reads: 2 of ≤4 (player-region crop; ×2 danmaku-strip zoom). Crop paint counts:
  player 87,602 distinct colors; strip 4,447.

## Residual risks

- Thumbnails/cover are remote `hdslb.com` URLs — renders/screenshots need network; offline they
  show alt text. Integration's screenshot pass should run online.
- `m1/curated/renders/bilibili-com-video-bv1gj411x7h7.{html,png}` are stale until integration
  re-renders (deliberately untouched).
- Storyline tau stays null (pre-existing; the archetype's model storylines never matched
  heading order in either round).
