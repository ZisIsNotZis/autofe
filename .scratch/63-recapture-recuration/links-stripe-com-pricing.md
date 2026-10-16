# links · stripe-com/pricing · round 63 link-coverage closure

Baseline: `node m1/eval/link-coverage.mjs --only stripe-com/pricing` → 8 wrong-target findings, all reason “render-owner-unverified” (matches /tmp/links-now.json). `node m1/validate.mjs m1/curated/stripe-com/pricing.json` → ok. `node m1/eval/capture-integrity.mjs --only stripe-com/pricing` → 0 unmatched (414 facts).

## Findings · every flagged target is carried verbatim by the capture

All eight are render links whose (text, href) pair exists in `corpus/stripe-com/pricing/dom.html`; the owner oracle simply could not bind those specific render anchors (header mega-menu / footer nav / tile-label runs). Capture addresses (product links in the header mega-menu `header[0]/div[1]/div[2]/…` and footer `footer[8]/…/nav[0]/…`):

| render link | capture anchors carrying the same pair |
|---|---|
| `资金管理 → /cn/money-management/availability` | header `…div[1]/section[0]/…/ul[1]/li[8]/a[0]`; footer `…nav[0]/div[2]/section[0]/ul[1]/li[10]/a[0]` |
| `Payments → /cn/payments` | header `…div[0]/div[2]/ul[0]/li[0]/a[0]` (“Payments 在线支付”); footer `…ul[1]/li[18]/a[0]` |
| `Radar → /cn/radar` | header `…aside[5]/div[1]/ul[0]/li[1]/a[0]` (“Radar 欺诈防范”); footer `…ul[1]/li[20]/a[0]` (absolute `https://stripe.com/cn/radar`) |
| `Connect → /cn/connect` | header `…div[3]/div[2]/ul[0]/li[0]/a[0]`; footer `…ul[1]/li[7]/a[0]` |
| `Invoicing → /cn/invoicing` | header `…div[1]/div[2]/ul[0]/li[3]/a[0]`; footer `…ul[1]/li[13]/a[0]` |
| `Billing → /cn/billing` | header `…div[1]/div[2]/ul[0]/li[0]/a[0]`; footer `…ul[1]/li[3]/a[0]` |
| `等等 → https://stripe.com/cn/enterprise` | body `section[5]/…/div[1]/p[0]/a[0]` — tile anchor text exactly `等等` |
| `以及更多 → https://stripe.com/cn/enterprise` | same tile: model `enterprise._lines[0]._items[5]` = `{_name 以及更多, _action{label 等等, to …/enterprise}}`; the render tile anchor `…/div[2]/a[5]` covers the label+name runs, so the `以及更多` run rides the tile link whose target the capture carries on the `等等` anchor |

- Decision: capture carries the model's target in all eight cases (footer/header chrome and the enterprise tile) → allow proposals only, model untouched. No URL constructed.

## Proposed link-coverage-allow entries (parent-integrated)
```json
{"page":"stripe-com/pricing","kind":"wrong-target","text":"资金管理","reason":"渲染的页脚/导航链接；源站同 text+href 锚点在 header 巨型菜单 ul[1]/li[8]/a[0] 与页脚 nav[0]/div[2]/section[0]/ul[1]/li[10]/a[0]，target 真实携带，owner-oracle 未能绑到该渲染锚点。","round":63}
{"page":"stripe-com/pricing","kind":"wrong-target","text":"Payments","reason":"同上：/cn/payments 携带于 header div[0]/div[2]/ul[0]/li[0]/a[0] 与页脚 ul[1]/li[18]/a[0]。","round":63}
{"page":"stripe-com/pricing","kind":"wrong-target","text":"Radar","reason":"同上：/cn/radar 携带于 header aside[5]/div[1]/ul[0]/li[1]/a[0] 与页脚 ul[1]/li[20]/a[0]。","round":63}
{"page":"stripe-com/pricing","kind":"wrong-target","text":"Connect","reason":"同上：/cn/connect 携带于 header div[3]/div[2]/ul[0]/li[0]/a[0] 与页脚 ul[1]/li[7]/a[0]。","round":63}
{"page":"stripe-com/pricing","kind":"wrong-target","text":"Invoicing","reason":"同上：/cn/invoicing 携带于 header div[1]/div[2]/ul[0]/li[3]/a[0] 与页脚 ul[1]/li[13]/a[0]。","round":63}
{"page":"stripe-com/pricing","kind":"wrong-target","text":"Billing","reason":"同上：/cn/billing 携带于 header div[1]/div[2]/ul[0]/li[0]/a[0] 与页脚 ul[1]/li[3]/a[0]。","round":63}
{"page":"stripe-com/pricing","kind":"wrong-target","text":"等等","reason":"enterprise 磁贴锚点 section[5]/…/div[1]/p[0]/a[0] 文本恰为“等等”→ /cn/enterprise；渲染磁贴链接与之一致，owner 绑定未达。","round":63}
{"page":"stripe-com/pricing","kind":"wrong-target","text":"以及更多","reason":"模型磁贴 _items[5]{_name 以及更多, _action{label 等等, → /cn/enterprise}}；渲染磁贴链接覆盖 label+name 两个文本 run，“以及更多”run 随磁贴链接指向源站真实携带的 /cn/enterprise（见“等等”锚点）。","round":63}
```

## Verification (2026-10-16 round 63)
No model edit → `validate` ok + capture-integrity 0 unmatched recorded above; live finder unchanged (8 findings, allow class only). All 8 targets grep-verified present in the capture with the exact model href.
