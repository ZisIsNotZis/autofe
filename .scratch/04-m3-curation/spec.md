# 04 — M3 curation pilot (auto draft → curated model)

Status: claimed
Need-review: yes (parent reviews protocol + spot-checks against source)

## Objective

Establish the curation protocol that turns an auto-drafted model into a
story-curated model, on 4 exemplar pages (2 heavy-tail, 1 mid, 1
hand-encoded for comparison). Curation = editorial selection, NOT rewriting.

## Pages

| page | auto high | why picked |
|---|---|---|
| aliyun-com/home | 104 | worst tail |
| huawei-cn/consumer-phones | 94 | heavy tail, CN corporate |
| apple-com/iphone-16 | 55 | has a HAND model to compare against |
| huawei-cn/search-laptop | 6 | median page |

## Protocol (per page)

1. Read the auto draft (`m1/extract/drafts/…`), the ORIGINAL screenshot
   (`corpus/<site>/<page>/full.png`), and the capture (nodes.json has full
   `name` strings — use them to repair truncated text).
2. Curate:
   - DROP storylines/facts that are navigation, ads, cookie/legal chrome,
     embedded demo-app UI, or repeated boilerplate (record each drop + reason).
   - MERGE duplicated facts (same fact stated 2-3x).
   - REPAIR truncated texts using the full `name` string from the capture.
   - SET `_primary` for the page (and per storyline where meaningful) based on
     what the ORIGINAL page puts forward as the takeaway.
   - ADD missing key facts the source clearly carries (prices, counts) — only
     facts verifiable in the capture.
   - LABEL actions (`label` = visible copy).
3. Validate: zero errors. Render. Re-run both evals.

## Deliverables (m1/curated/**)

- `m1/curated/<site>/<page>.json` — curated models
- `m1/curated/curation-log.md` — per page: kept/dropped/primary decisions with
  one-line reasons; before/after: validate, factFidelity, source-coverage
  high/med; the generalizable rules you applied (these become the protocol)
- Regenerate renders + screenshots under m1/curated/renders/

## Hard rules

- File scope: m1/curated/** ONLY. Read everything else; write nothing elsewhere.
- Zero validation errors. No invented facts — every kept fact must be traceable
  to the capture (spot-checked by the parent against nodes.json).
- Bounded: finite timeouts; write incrementally.

## Acceptance

- 4 curated models, zero validation errors, factFidelity 1.00.
- Source-coverage high warnings reduced vs auto draft (record numbers).
- Curation log documents every drop with a reason and yields ≥5 generalizable
  protocol rules.
