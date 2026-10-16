# links · learn-microsoft/vm-sizes · round 63 link-coverage closure

Baseline: `node m1/eval/link-coverage.mjs --only learn-microsoft/vm-sizes` → 6 wrong-target findings, all reason “invalid captured source/owner witness” (matches /tmp/links-now.json). `node m1/validate.mjs m1/curated/learn-microsoft/vm-sizes.json` → ok. `node m1/eval/capture-integrity.mjs --only learn-microsoft/vm-sizes` → 0 unmatched.

## Findings · 6 stale witness hashes (model targets all correct)

All six are `checkSourceWitnesses` failing ONLY on `sourceHash` (recorded `61ec2f73…` vs current dom `29393caa8547b6529accf14113d7bae1ca337216365508be51d39e5dd821954b`). Each anchor still sits at its recorded address in `…/main[2]/div[0]/div[0]/div[3]/div[8]/table[0]/tbody[1]/tr[0]/td[2]/` with identical text and href, and each model `_action.to` equals the witness target verbatim:

- `_items[0]` `General purpose` → `#general-purpose`
- `_items[1]` `Compute optimized` → `#compute-optimized`
- `_items[2]` `Memory optimized` → `#memory-optimized`
- `_items[3]` `Storage optimized` → `#storage-optimized`
- `_items[4]` `GPU accelerated` → `#gpu-accelerated`
- `_items[5]` `FPGA accelerated` → `#fpga-accelerated`

(Fragment hrefs; the witness targets are the absolutized tabs-URL + fragment — model matches.)

- Decision: capture carries the model's target → do NOT change the model. Allow entries are INERT for witness findings (`checkSourceWitnesses` bypasses the allow index); the operative lever is a hash-only rebind of these 6 entries in `m1/eval/link-owner-witnesses.json` (shared, parent-integrated): `sourceHash = 29393caa8547b6529accf14113d7bae1ca337216365508be51d39e5dd821954b`, all other fields unchanged.

## Proposed link-coverage-allow entries (parent-integrated; see inert note above)
```json
{"page":"learn-microsoft/vm-sizes","kind":"wrong-target","text":"General purpose","reason":"55 轮 witness 的 sourceHash 被回捕作废；锚点仍在 main[2]/…/td[2]/a[0]，text=#general-purpose 绑定逐字成立，模型目标未变。","round":63}
{"page":"learn-microsoft/vm-sizes","kind":"wrong-target","text":"Compute optimized","reason":"同上，a[2]/#compute-optimized。","round":63}
{"page":"learn-microsoft/vm-sizes","kind":"wrong-target","text":"Memory optimized","reason":"同上，a[4]/#memory-optimized。","round":63}
{"page":"learn-microsoft/vm-sizes","kind":"wrong-target","text":"Storage optimized","reason":"同上，a[6]/#storage-optimized。","round":63}
{"page":"learn-microsoft/vm-sizes","kind":"wrong-target","text":"GPU accelerated","reason":"同上，a[8]/#gpu-accelerated。","round":63}
{"page":"learn-microsoft/vm-sizes","kind":"wrong-target","text":"FPGA accelerated","reason":"同上，a[10]/#fpga-accelerated。","round":63}
```

## Proof of closure (harness, 2026-10-16)
checkPage with a /tmp witnesses copy where only the 6 `sourceHash` fields are refreshed → **findings 0, linked 158/158** (the rendered-owner check also passes against the current render). No other check touched.
