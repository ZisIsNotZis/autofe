# 63 · airbnb-com/room-28871 — recapture re-curation

Worker: wave-1 curation worker. Drift class: light (2 unmatched facts, one highlight rewritten).

## Unmatched facts (before) → disposition

`highlights._items[1]`:
- `_name` 街区充满活力 → 新 capture nodes[268] 区（房源亮点条 2）：**周边可玩性强** → updated verbatim
- `_detail` 客人表示该区域适合步行，有很多地方值得探索，尤其是有不少餐馆。 → **客人认为该区域有很多地方值得探索。** → updated verbatim

其余两条亮点（入住体验良好 / 出租单元里的房间）与新 capture 逐字一致，byte 未动。条目 3 `_detail` 中的不可见连字（共用区⁠域，U+2060）为 capture 原文，保留。

## Allow entries proposed
None. Asset additions: none.

## Evidence (2026-10-16, ticket env)
- `node m1/validate.mjs m1/curated/airbnb-com/room-28871.json` → ok
- capture-integrity → factsTotal 75, scanned 68, **unmatched 0**
- render → `/tmp/airbnb-com-room-28871.html`; metrics → **factFidelity 1** (75/75)
- F-025 target sweep → 2 checked, **0 stale**
