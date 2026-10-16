# 63 · sspai-com/u-jtc092al — recapture re-curation

Worker: wave-1 curation worker. Drift class: light (3 unmatched facts, all author-stats values/labels; values are live counters).

## 成就与徽章 数据面板（nodes[93–128]）

新 capture 两处呈现：swiper 数据卡（nodes[95–113]）与侧栏合并行（nodes[128] `成就与徽章 MaxChow成为少数派557天创作文章25文章阅读量25015获得充电4暂无徽章`）。

| model path | old | new-capture evidence | action |
|---|---|---|---|
| `_lines[2]._lines[0]._measure` | 529 天 | nodes[112] `557天`（成为少数派） | **557** |
| `_lines[2]._lines[2]._name` | 创作字数 | 全树 0 命中；DOM 中 16557 的标签是纯图标（`ssCommunityIcon__character--fill`，`id="writeCount"`），无可访问名 → 标签事实不成立，**`_name` 删除**；`_measure` 16557 保留（nodes[99/101] verbatim），`_intent` 记录 DOM id+图标的归属证据（原 intent 已注明 writeCount，本代 capture 证据仍在 dom.html 中） | label dropped, value kept with provenance |
| `_lines[2]._lines[3]._measure` | 23535 | nodes[102/104] + nodes[128] `文章阅读量25015` | **25015** |
| （新增）`获得充电` `_count` 4 | — | nodes[128] `获得充电4` verbatim；面板补全（旧面板全覆盖、新面板多出此项） | added |
| 成为少数派 `_detail` SINCE 2025 / 创作文章 25 / 获得徽章 0 暂无徽章 | — | 与新 capture 一致 | 未动（byte-identical） |

## Allow entries proposed
None — 创作字数标签走的是「capture 无此事实 → 删」而非白名单；数值 16557 在 capture 中逐字存在，归属证据在 dom（writeCount id + character--fill 图标），不需白名单。

## Asset additions proposed
None.

## Evidence (2026-10-16, ticket env)
- `node m1/validate.mjs m1/curated/sspai-com/u-jtc092al.json` → ok
- capture-integrity → factsTotal 43, scanned 31, **unmatched 0**
- render → `/tmp/sspai-com-u-jtc092al.html`; metrics → **factFidelity 1** (43/43)
- F-025 target sweep → 17 checked, **0 stale**
