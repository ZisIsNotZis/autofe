# 03 — M3: extraction pipeline (auto-draft models from captures)

Status: claimed
Need-review: yes

## Objective

Close the loop: automatically draft models from corpus captures, measure how far
auto-extraction gets vs hand encoding, and quantify per-page coverage with the
existing eval tools. This is the machinery for the frozen-snapshot coverage
claim (design-basis §7/M3).

## Deliverables (m1/extract/**)

1. `extract.mjs` — capture dir (`corpus/<site>/<page>/`) → draft model JSON.
   Extraction rules (v0 heuristics, in priority order):
   - root `_intent` from <title> + first h1, suffixed `[draft]`
   - `heading` role → storyline boundaries; following content belongs to that line
   - `columnheader` + `cell` sequences → `_items` whose `_fields` come from a
     GENERATED draft field dictionary (`m1/extract/fields-draft.json`: name ->
     {type (inferred from cell values), label}) — model must still validate
   - radio/checkbox groups (from a11y tree) → `_expose` choice sets
   - price/percent text patterns → `_price` (money) / `_measure` (num+unit)
   - dates (ISO or 年月日) → `_datetime`
   - `list/listitem` with sibling-similar shape → `_items`
   - `link`/`button` → action nodes (`verb: navigate|open`, `label` = visible text)
   - images with alt → `_image`
   - anything unmappable → extraction report (never invented keys)
2. `report.mjs` — per page: extracted node counts, unmapped counts + top examples.
3. Drafts in `m1/extract/drafts/<site>/<page>.json`.

## Hard rules

- Every draft must pass `node m1/validate.mjs` with ZERO errors. Anything the
  grammar cannot express goes into the extraction report, not the model.
- Do not modify m1/eval/**, m1/render.mjs, m1/validate.mjs, m1/model-lib.mjs,
  vocab*.json (propose dictionary additions in the report instead), tools/**, corpus/**.
- Bounded runs only; write files incrementally so partial progress survives.

## Evaluation (the deliverable that matters)

Run on the 6 hand-encoded exemplars + 5 support-tier pages. For each page:
validate the draft, render it, and run `m1/eval/source-coverage.mjs` against
the original capture. Produce a comparative table:
auto-draft warnings vs hand-model warnings (hand numbers are the baseline:
fidelity 1.00, warnings as of `e018c3f`).

## Acceptance

- All drafts validate; no escape hatch used.
- Comparative table exists with per-page auto-vs-hand warning counts.
- Extraction report names the top unmappable structures (these feed the
  failure log / grammar evolution).
