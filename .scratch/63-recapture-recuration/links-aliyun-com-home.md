# links · aliyun-com/home · round 63 link-coverage closure

Baseline: `node m1/eval/link-coverage.mjs --only aliyun-com/home` → 3 wrong-target findings (matches /tmp/links-now.json). `node m1/validate.mjs m1/curated/aliyun-com/home.json` → ok. `node m1/eval/capture-integrity.mjs --only aliyun-com/home` → 0 unmatched. Capture sha256(dom.html) = `74cf77c0b764f13c…`.

## Verdict per finding: capture carries every model target — no model edit, 3 allow proposals

### F1 · render link “立即免费体验” → https://www.aliyun.com/exp (reason render-owner-unverified, no path)
- Model: root `_action` = `{verb:"open", to:"https://www.aliyun.com/exp", label:"立即免费体验"}`.
- Capture evidence: exactly ONE anchor with this compact text, href `https://www.aliyun.com/exp` (inside `data-module-name="Adc2025LinkButton"`; svg child adds no text). Model target is lifted verbatim, F-025 clean.
- Why flagged: render-side `contextual` check needs an ownership entry with status `owned-exact-action`; `ownerOracle.action(root)` returns `null` on the round-63 capture (root `_title` “阿里云-计算，为了无法计算的价值” IS still in the capture — `<title>` + 1 occurrence — so the break is in the oracle's structural matching for the root action, not a missing fact).
- Decision: association-oracle miss, not a model defect → allow proposal.

### F2 · maas.platform._items[0]._action → https://platform.qianwenai.com/pricing/token-plan (reason “invalid captured source/owner witness”)
- Witness `aliyun-com/home:maas.platform._items[0]:/html[0]/body[1]/div[0]/div[1]/div[0]/div[3]/div[1]/div[1]/div[1]/div[1]/div[0]/a[0]` fails ONLY `sourceHash` (recorded `7952a7f6…` vs current `74cf77c0…`).
- Capture evidence: anchor at the SAME recorded address `/html[0]/body[1]/div[0]/div[1]/div[0]/div[3]/div[1]/div[1]/div[1]/div[1]/div[0]/a[0]`, same text, same href. Model `_action.to` identical. → stale witness binding; model correct.

### F3 · maas.platform._items[1]._action → https://platform.qianwenai.com/home/benefits — same class as F2
- Address `/html[0]/body[1]/div[0]/div[1]/div[0]/div[3]/div[1]/div[1]/div[1]/div[1]/div[1]/a[0]`, text, href all match the current capture; only the hash is stale.

## Proposed link-coverage-allow entries (parent-integrated; do not edit the shared file from a worker)
```json
{"page":"aliyun-com/home","kind":"wrong-target","text":"立即免费体验","reason":"模型根 _action(to=https://www.aliyun.com/exp) 的归属 oracle 在 63 轮回捕后返回 null，render 侧无法上下文核验；采集恰有一个该文本锚点且 href 与模型目标逐字一致（F-025 合规，非构造 URL），故为准许的关联误报。","round":63}
{"page":"aliyun-com/home","kind":"wrong-target","text":"Token Plan 个人版上线，团队版降价，更低成本畅用 Qwen3.8-Max 等先进模型 查看详情","reason":"55 轮 witness 的 sourceHash 被回捕作废；地址 /html[0]/body[1]/div[0]/div[1]/div[0]/div[3]/div[1]/div[1]/div[1]/div[1]/div[0]/a[0]、文本、href(https://platform.qianwenai.com/pricing/token-plan) 与现采集逐一相符，模型目标仍被采集逐字承载。","round":63}
{"page":"aliyun-com/home","kind":"wrong-target","text":"免费额度 登录即送免费 token，一个 API 调用全部模型，新用户赠千万 tokens 免费额度 查看详情","reason":"55 轮 witness 的 sourceHash 被回捕作废；地址 /html[0]/body[1]/div[0]/div[1]/div[0]/div[3]/div[1]/div[1]/div[1]/div[1]/div[1]/a[0]、文本、href(https://platform.qianwenai.com/home/benefits) 与现采集逐一相符，模型目标仍被采集逐字承载。","round":63}
```
Parent note: F2/F3 (like airbnb/mi×3 on other reports) are hash-only rebinds — refreshing `link-owner-witnesses.json` against the round-63 corpus would clear them without allow entries. Either lever is the parent's; entries above work regardless.

## Verification (2026-10 round 63)
- `node m1/validate.mjs m1/curated/aliyun-com/home.json` → ok.
- `node m1/eval/capture-integrity.mjs --only aliyun-com/home` → 0 unmatched.
- `node m1/eval/link-coverage.mjs --only aliyun-com/home` → same 3 findings, 0 new. Findings shrink only when the parent integrates the allow entries (or rebinds witnesses) — no model change is warranted, so no worker-side shrinkage is possible.
