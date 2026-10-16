# 63 · Recapture re-curation (corpus restored after re-clone)

## Context
Repo was re-cloned (shallow, HEAD `41fdf70`, 2026-10-15 snapshot). Gitignored captures were lost;
chrome-headless-shell + playwright-core re-provisioned (chromium_headless_shell-1248,
`tools/capture/node_modules/playwright-core`; env `AUTOFE_CHROME_PATH` / `AUTOFE_PLAYWRIGHT_CORE`).
Full 42-page corpus was re-captured on 2026-10-16 (16:xx, +0800). Eval tools' hardcoded browser
paths repaired to honor the env overrides (6 files in m1/eval). `capture-integrity.mjs` now
records a missing capture as `error: 'capture missing'` instead of crashing.

## Facts (measured 2026-10-16)
- Fresh captures drift vs models: 13 pages clean (0 unmatched), light drift ≤24 facts on 13 pages,
  heavy drift 29–185 facts on 13 pages. Probe: `checkPage` sweep, see `drift-probe.json`.
- `apple-com/iphone-16`: https://www.apple.com/us/shop/goto/buy_iphone/iphone_16 → HTTP 503
  persistently (3 attempts, 10 min apart; /iphone-16/ 301→ that URL). Not capturable now.
- Shell captures (bot-wall, nav-only content): `36kr-com/home`, `36kr-com/information-technology`
  (repeated nav, zero feed), `stripe-dashboard/login` (2 nodes). 36kr search pages still fine.
- Old "42/42" gate numbers are void for this corpus; gates currently fail at 9/13/15 +
  source-association selftest (drift), pending re-curation.

## Decisions (main agent, this round)
- D-63a: re-curate all drifted pages from the fresh captures. Capture = truth (F-025).
- D-63b: allow-file (`m1/eval/capture-integrity-allow.json`) is parent-integrated only — workers
  propose entries in their report (kind/reason/round 63), never edit the shared file.
- D-63c: shell captures are capture failures, not exemplars. Replacement candidates to be probed
  (robots + render quality) before re-curation; if none, page is retired with an F-entry and the
  gate denominator + archetype coverage are re-declared in active-work.md (user-visible at next
  milestone).
- D-63d: `apple-com/iphone-16` → replace with `apple-com/airpods-pro` (HTTP 200, product-detail
  archetype kept, denominator stays 42). Old model retired with reason.

## Scope / non-goals
- In: m1/curated models + per-page assets; capture-integrity-allow proposals; re-curation logs;
  pipeline re-run at integration.
- Out: round-62 link-closure continuation (superseded until corpus re-baselines); grammar/engine
  changes; new capture sites beyond replacements.

## Waves
- Wave 1 (light drift, parallel workers, disjoint dirs): see assignments in each report.
- Wave 2 (heavy drift): bilibili ×3, taobao home, sspai home/matrix, huawei search-phone.
- Wave 3 (replacements): 36kr home + information-technology, stripe-dashboard login,
  apple airpods-pro (new).

## Worker contract (each page)
- Oracles: `nodes.json` names = FACTS; `full.png` = EMPHASIS; `dom.html` = URL oracle (F-025,
  verbatim targets). Protocol: `.scratch/04-m3-curation/spec.md`, curation-log rules, F-023/24/25/
  28/29. Validate: `node m1/validate.mjs <model>`. Self-check: render to /tmp, then
  `node m1/eval/metrics.mjs <model> /tmp/render.html corpus/<site>/<page>` (expect fidelity 1.00)
  and `node m1/eval/capture-integrity.mjs --model <model>` (expect 0 unmatched).
- Do NOT run the full pipeline (single writer at integration). Do NOT edit shared files
  (allow json, active-work.md, renders/manifest).
- Report: `.scratch/63-recapture-recuration/<site>-<page>.md` — drift classification, decisions,
  proposed allow entries, proposed asset additions, evidence.
- Budget: ≤40 min/page-ish slice, ≤4 screenshots (crop for detail), stop at blocker and report.
