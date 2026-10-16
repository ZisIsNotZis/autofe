# apple-com-cn/iphone-17 — drift repair (round 63)

Worker: curation worker, round 63 recapture batch. Date: 2026-10-16.
Capture oracle: `corpus/apple-com-cn/iphone-17/` (capturedAt 2026-10-16T07:52:33Z, status 200,
`https://www.apple.com.cn/iphone-17/`). Model: `m1/curated/apple-com-cn/iphone-17.json`.

## Drift classification: light, price-family only

Gate at start (`capture-integrity.mjs`): 173 facts, 14 raw unmatched = **7 allow-listed
round-43 conversions** (unchanged, still valid) + **7 genuinely drifted facts**, all in one
family: the fresh page carries **no price anywhere** (`dom.html`: 0 hits for `RMB`, 0 for `¥`,
0 for `6799`/`8799`; `nodes.json` same). Apple moved pricing off the overview page; the trade-in
copy was also rewritten. Everything else on the page survived byte-identical (design/camera/chip/
compare/benefits/values facts all still match).

## Repairs (verbatim from capture)

1. `._price` (6799), `._duration` (24 期), `._summary` (“RMB 6799 起或 RMB 284/月 起”) — **removed**.
   The capture carries no price/installment fact; absence is recorded in `_intent`, not invented
   (absent-rule; allow-file doc: “真错……必须改模型”).
2. `._primary` `_price` → `_subtitle`（神通妙彩）— the page thesis line; the old primary no longer
   exists. Render places it in the enlarged hero slot (`hero fact-hero`), visually verified.
3. `._lines[0]._summary`（页首折抵横幅）→ “用符合条件的设备换购新 iPhone，可享折抵优惠。” —
   capture-verbatim (`nodes.json` p: “用符合条件的设备换购新 iPhone，可享折抵优惠*。”); the `*` is a
   `footnote-supglyph` superscript link in the DOM, omitted per the round-43 sup convention
   (normalization R4 drops it, so the gate matches WITHOUT a new allow entry).
4. `._lines[10]._items[0]._detail`（Apple Trade In 换购计划）→ same new sentence (the benefits
   tile carries the identical copy; the banner↔benefit `_ref` structure survives).
5. `_lines[11]._items[0]` (iPhone 17 card): `_price` 6799 + `_summary` — **removed**.
   `_lines[11]._items[1]` (iPhone Air card): `_price` 8799 + `_summary` — **removed**. Both
   compare cards themselves still exist in the fresh capture (dom: iPhone 17 + iPhone Air cards
   with colors/specs/CTAs); only their price lines are gone.
6. `._intent` updated to record the no-price state of the 2026-10-16 capture (never rendered).

Unchanged facts are byte-identical (diff: +4/−32 lines, all in the facts above).

## URL oracle check (F-025)

All 8 `to:` targets verified in `dom.html`. One apparent miss resolved: root `购买` →
`https://www.apple.com.cn/cn/shop/goto/buy_iphone/iphone_17` is the absolutized form of the
dom's relative `/cn/shop/goto/buy_iphone/iphone_17` (page origin from `meta.json`), per the
documented `//`-relative → `https:` rule.

## Proposed allow-file changes (parent-integrated only — NOT applied by this worker)

- **Retire** the round-43 entry `{page: "apple-com-cn/iphone-17", path: "._summary", value:
  "RMB 6799 起或 RMB 284/月 起"}` — the fact was removed; the entry is dead weight.
- The other 6 round-43 entries (`_lines[2]._detail`, `_lines[4].modes._items[0]._name`,
  `_lines[6]._detail`, `_lines[8]._summary`, `_lines[8]._items[4]._name`,
  `_lines[10]._items[1]._detail`) remain live and load-bearing (sup-digit omissions).
- No new entries needed.

## Evidence

```
node m1/validate.mjs m1/curated/apple-com-cn/iphone-17.json
  → ok
node m1/render.mjs m1/curated/apple-com-cn/iphone-17.json /tmp/apple-com-cn-iphone-17.html
node m1/eval/metrics.mjs … /tmp/apple-com-cn-iphone-17.html corpus/apple-com-cn/iphone-17
  → factFidelity 1 (166/166), kendallTau 0.650
node m1/eval/capture-integrity.mjs --only apple-com-cn/iphone-17
  → 扫描 166/166 | 未命中 0 | 白名单(转换) 6 | 通过 (exit 0)
```

Gate note: `--model <model>` mode passes the model *path* as the allow-key page, so the allowlist
never applies in that mode (6 allow-listed facts would always print as unmatched). `--only
<page>` runs the same checkPage with the real page key and the allowlist applied — that is the
mode used above; a fresh capture with no price drift shows literal 0 unmatched in `--model` mode
too (verified for sspai-com/login in its report).

## Assets

None needed (no new screenshots/crops; the hero `_image` URL is unchanged in the fresh capture).

## Residual observations (non-blocking, out of scope)

- The iPhone Air compare card's camera line in the capture now reads “4800 万像素融合式摄像头系统
  4800 万像素融合式主摄 — 不适用” (“— 不适用” = the third spec row is not applicable on Air). The
  model keeps the two-row merge “4800 万像素融合式摄像头系统 · 4800 万像素融合式主摄”, which the
  gate matches by containment. Pre-existing merge style, left untouched per "keep unchanged facts
  byte-identical"; flagged here so the parent can decide whether the merged-separator style should
  carry “不适用” rows in a later pass.
- Nav shows successor models (iPhone 18 Pro / iPhone Duo) — nav chrome, not modeled, consistent
  with the reviewed drop class.
