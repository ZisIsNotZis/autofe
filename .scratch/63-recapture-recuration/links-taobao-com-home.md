# links · taobao-com/home · round 63 link-coverage closure

Baseline: `node m1/eval/link-coverage.mjs --only taobao-com/home` → 1 wrong-target finding (matches /tmp/links-now.json). `node m1/validate.mjs m1/curated/taobao-com/home.json` → ok (pre-existing W_COMPOSITE_NAME_ONLY_WATERMARK warning, untouched). `node m1/eval/capture-integrity.mjs --only taobao-com/home` → 0 unmatched (promo-carousel facts match the round-63 capture). Base url: `https://www.taobao.com/`.

## Finding · _lines[6]._items[0]._action → https://huodong.taobao.com/wow/z/tbhome/tb-m2pc/m2pc-light-industry-599890-1?custom_content_source=a2113w.47103445 (reason “invalid captured source/owner witness”; witness expect = https://web.m.taobao.com/app/ltao-fe/tbmx-pc-page/home?custom_content_source=mspd.tbmspc)

This is the mis-paired/rotated case, with a twist: not only the address, the witnessed TEXT itself is gone from the capture.

- Model node: `_lines[6]._items[0]` = `{_key:"fr-1111", _name:"双11全球好物", _detail:"预售开启 官方立减爆款8.5折起", _action:{verb:"open", to:"https://huodong.taobao.com/wow/z/tbhome/tb-m2pc/m2pc-light-industry-599890-1?custom_content_source=a2113w.47103445"}}` (promo carousel, `_lines[6]` “今日看点：促销轮播”).
- Capture evidence (round-63 dom.html): the model's exact `to` URL is carried by 3 anchors, each with text exactly `_name`+`_detail` = “双11全球好物 预售开启 官方立减爆款8.5折起”. The model's identity AND target are both verbatim in the current capture.
- What the stale witness recorded (round 55/62 capture): sourceText “淘宝秒杀 天天好价 产地直发 批发价 爆款低至0.99元起” → `web.m.taobao.com/app/ltao-fe/tbmx-pc-page/home?custom_content_source=mspd.tbmspc`. In the round-63 capture that carousel frame no longer exists (0 anchors with that compact text; the `mspd.tbmspc` target is gone). The carousel rotated to the 双11 frame.
- Disambiguation against the lookalike: “淘宝秒杀” still exists in the capture as a DIFFERENT element — a short-text anchor → `https://web.m.taobao.com/app/ltao-fe/tbmx-pc-page/home?spmb=tbmspcnew&mi_ids=…&custom_content_source=mspd.tbmspcnew`. The model's separate seckill node `_lines[7]._lines[4]._action.to` matches THAT URL exactly. So both taobao model targets are correct against the round-63 capture; the witness paired the old carousel frame that no longer exists. Changing the model to the witness's `expect` would fabricate a URL the capture no longer carries (F-025 violation).
- Decision: association oracle bound to a rotated carousel frame → do NOT change the model; allow proposal only.

## Proposed link-coverage-allow entry (parent-integrated)
```json
{"page":"taobao-com/home","kind":"wrong-target","text":"淘宝秒杀 天天好价 产地直发 批发价 爆款低至0.99元起","reason":"55 轮 witness 绑定的是旧轮播帧（淘宝秒杀卡→web.m.taobao.com/…mspd.tbmspc），63 轮回捕后该帧与目标均不存在；模型 _lines[6]._items[0] 的现目标 https://huodong.taobao.com/wow/z/tbhome/tb-m2pc/m2pc-light-industry-599890-1?custom_content_source=a2113w.47103445 仍被采集以同文本锚点逐字承载（×3），故模型不改、准许该过期 witness 差额。","round":63}
```
Parent note: this witness entry needs text+address+target+hash rebind (not hash-only) if the parent chooses rebinding over the allow entry. The allow entry's `text` is the finding text verbatim (the stale sourceText), which is what the finding key hashes.

## Verification (2026-10 round 63)
- `node m1/validate.mjs m1/curated/taobao-com/home.json` → ok.
- `node m1/eval/capture-integrity.mjs --only taobao-com/home` → 0 unmatched.
- `node m1/eval/link-coverage.mjs --only taobao-com/home` → same 1 finding, 0 new. Shrinks at parent integration.
