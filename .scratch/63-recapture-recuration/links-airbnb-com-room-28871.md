# links · airbnb-com/room-28871 · round 63 link-coverage closure

Baseline: `node m1/eval/link-coverage.mjs --only airbnb-com/room-28871` → 1 wrong-target finding (matches /tmp/links-now.json). `node m1/validate.mjs m1/curated/airbnb-com/room-28871.json` → ok. `node m1/eval/capture-integrity.mjs --only airbnb-com/room-28871` → 0 unmatched. Base url: `https://www.airbnb.com/rooms/28871`.

## Finding · overview.rating.to-reviews._action → https://www.airbnb.com/rooms/28871/reviews?review_page_entrypoint=pdp_header (reason “invalid captured source/owner witness”)

- Model: `overview.rating.to-reviews._action` = `{verb:"open", to:"https://www.airbnb.com/rooms/28871/reviews?review_page_entrypoint=pdp_header", label:"815 条评价"}` — identical to the witness's recorded `target`/`expect[]`.
- Witness `airbnb-com/room-28871:overview.rating.to-reviews:/html[0]/body[1]/div[1]/…/section[0]/div[2]/a[4]` fails ONLY `sourceHash` (recorded `ebc81bac…` vs current dom.html `e9c5b512…`).
- Capture evidence: anchor at the SAME recorded address `/html[0]/body[1]/div[1]/div[0]/div[0]/div[0]/div[0]/div[0]/div[0]/div[0]/div[0]/div[0]/div[0]/div[0]/div[0]/main[1]/div[0]/div[0]/div[0]/div[2]/div[0]/div[0]/div[0]/div[0]/div[0]/div[0]/div[0]/section[0]/div[2]/a[4]`, text “815 条评价”, href `/rooms/28871/reviews?review_page_entrypoint=pdp_header` (absolutizes to the model target). Exactly one anchor with this text in the whole capture.
- Decision: stale witness binding after the round-63 recapture; the capture carries the model's target verbatim → do NOT change the model; allow proposal only.

## Proposed link-coverage-allow entry (parent-integrated)
```json
{"page":"airbnb-com/room-28871","kind":"wrong-target","text":"815 条评价","reason":"55 轮 witness 的 sourceHash 被回捕作废；锚点仍在原地址 /html[0]/body[1]/div[1]/…/section[0]/div[2]/a[4]，文本“815 条评价”、href(/rooms/28871/reviews?review_page_entrypoint=pdp_header) 与现采集逐一相符，模型目标仍被采集逐字承载。","round":63}
```
Parent note: hash-only rebind of `link-owner-witnesses.json` would clear this without an allow entry; either lever is the parent's.

## Verification (2026-10 round 63)
- `node m1/validate.mjs m1/curated/airbnb-com/room-28871.json` → ok.
- `node m1/eval/capture-integrity.mjs --only airbnb-com/room-28871` → 0 unmatched.
- `node m1/eval/link-coverage.mjs --only airbnb-com/room-28871` → same 1 finding, 0 new. Shrinks at parent integration.
