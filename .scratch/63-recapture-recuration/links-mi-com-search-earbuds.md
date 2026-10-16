# links · mi-com/search-earbuds · round 63 link-coverage closure

Baseline: `node m1/eval/link-coverage.mjs --only mi-com/search-earbuds` → 1 wrong-target finding (matches /tmp/links-now.json). `node m1/validate.mjs m1/curated/mi-com/search-earbuds.json` → ok (pre-existing W_COMPOSITE_NAME_ONLY_WATERMARK warning, untouched). `node m1/eval/capture-integrity.mjs --only mi-com/search-earbuds` → 0 unmatched.

## Finding · query.submit._action → https://search.mi.com/search (reason “invalid captured source/owner witness”)

- Model: `query.submit._action` = `{verb:"submit", to:"https://search.mi.com/search", params:{keyword:"text"}, label:"站内搜索"}` — identical to the witness's recorded `target`/`expect[]`.
- Witness `mi-com/search-earbuds:query.submit` (form binding, `targetAttribute:"action"`) fails ONLY `sourceHash` (recorded `fabb7b0a…` vs current dom.html `d545bcf2…`).
- Capture evidence: `<form id="J_searchForm" action="//search.mi.com/search" method="get" class="search-form clearfix">` still at the recorded address `/html[0]/body[1]/div[0]/div[0]/div[0]/div[1]/div[0]/div[2]/form[0]`; `//search.mi.com/search` absolutizes to the model target.
- Render evidence: the render draws `<a class="action verb-submit" href="https://search.mi.com/search">站内搜索</a>` inside the `data-model-owner="query"` element, so a witness rebind would also pass the final “mandatory action at bound rendered owner” check.
- Decision: stale witness binding; the capture carries the model's target → do NOT change the model; allow proposal only.

## Proposed link-coverage-allow entry (parent-integrated)
```json
{"page":"mi-com/search-earbuds","kind":"wrong-target","text":"站内搜索","reason":"55 轮 witness 的 sourceHash 被回捕作废；表单 J_searchForm 仍在原地址 /html[0]/body[1]/div[0]/div[0]/div[0]/div[1]/div[0]/div[2]/form[0]，action=//search.mi.com/search 绝对化后与模型目标一致，render 亦在 data-model-owner=query 下绘出同目标锚点。","round":63}
```
Parent note: hash-only rebind of `link-owner-witnesses.json` would clear this without an allow entry; either lever is the parent's.

## Verification (2026-10 round 63)
- `node m1/validate.mjs m1/curated/mi-com/search-earbuds.json` → ok.
- `node m1/eval/capture-integrity.mjs --only mi-com/search-earbuds` → 0 unmatched.
- `node m1/eval/link-coverage.mjs --only mi-com/search-earbuds` → same 1 finding, 0 new. Shrinks at parent integration.
