# links · aliyun-com/product-ecs · round 63 link-coverage closure

Baseline: `node m1/eval/link-coverage.mjs --only aliyun-com/product-ecs` → 1 wrong-target finding (matches /tmp/links-now.json). `node m1/validate.mjs m1/curated/aliyun-com/product-ecs.json` → ok. `node m1/eval/capture-integrity.mjs --only aliyun-com/product-ecs` → 0 unmatched.

## Finding · render link “产品动态” → https://www.aliyun.com/product/news (reason render-owner-unverified, no path)

- Model: `news._action` = `{verb:"navigate", to:"https://www.aliyun.com/product/news"}` (no label); `news._title.text` = “产品动态”.
- Capture evidence: exactly ONE anchor with compact text 产品动态, href `https://www.aliyun.com/product/news/` — `normalizeHref` strips the trailing slash, so it equals the model target. F-025 clean (lifted, not constructed).
- Why flagged: `ownerOracle.action(news)` → null (label-less action), and `oracle.fact(news,“产品动态”,…)` only reaches `plain-context-fact` (not `owned-exact-action`), so the render-side `contextual` check finds no owning entry for the link.
- Decision: association-oracle miss; the capture carries the model's target on the exact text → do NOT change the model; allow proposal only.

## Proposed link-coverage-allow entry (parent-integrated)
```json
{"page":"aliyun-com/product-ecs","kind":"wrong-target","text":"产品动态","reason":"news._action 无 label，归属 oracle 判 null，render 侧链接无法上下文核验；采集恰有一个“产品动态”锚点 href=https://www.aliyun.com/product/news/，规范化后与模型目标逐字一致（F-025 合规），故为准许的关联误报。","round":63}
```

## Verification (2026-10 round 63)
- `node m1/validate.mjs m1/curated/aliyun-com/product-ecs.json` → ok.
- `node m1/eval/capture-integrity.mjs --only aliyun-com/product-ecs` → 0 unmatched.
- `node m1/eval/link-coverage.mjs --only aliyun-com/product-ecs` → same 1 finding, 0 new. Shrinks at parent integration of the allow entry; no model change warranted.
