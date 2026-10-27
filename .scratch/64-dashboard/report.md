# WP2.1 + WP2.2 — dashboard prototype + Grafana Stats page (round 64)

Single writer, no commit. Manager verifies, runs `pipeline --shots` and commits.

## 1. What changed and why

`grafana-play/play-home` was the corpus's only dashboard, modelled as 11 panel *names*: all captured
stat values/units were dropped, the intro/basics prose was dropped, and the page resolved to
`table` → `.table-page`, rendering as a list of name chips. M2 makes it a real dashboard using the
**existing closed grammar only** (no new reserved key, no vocabulary role/verb, no per-site class,
no CSS escape, no chart primitive).

| file | change |
|---|---|
| `m1/axis.mjs` | (a) `isStatMember` / `statGridOf`: a collection whose every member is `_name` + unit-bearing `_measure`, with no children/action, is a stat collection; the shared plan is one `{name, value}` per stat. (b) `panelGridOf`: a dashboard panel container (≥2 titled members, ≥2 of which own a stat wall). (c) `selectForm` gains the `stat-grid` form **before** the generic deflist. (d) `pageLayoutOf` gains `subject:dataset-stat-walls` **before** `subject:dataset`, requiring ≥2 distinct stat walls; `dashboard` joins `PAGE_KINDS`. |
| `m1/render.mjs` | HTML stat grid (`renderStatGrid` → `.stat-grid` / `.stat` / `.stat-name` / `.stat-value` / `.stat-unit`, thin space U+2009 between value and unit); `panel-grid` class emitted from the shared `panelGridOf`; dashboard CSS emitted **only** when the resolved page kind is `dashboard` (so no other page's HTML changes); toolbar one row, banners as callout rows, panel 2-col grid, stat 3/2/1 columns, no image upscaling. |
| `m1/render-text.mjs` | `stat-grid` form → `Cellar: 85 m²` per line; same shared `statGridOf` plan. |
| `m1/render-md.mjs` | `stat-grid` form → `- **Cellar:** 85 m²`; same shared plan. |
| `m1/eval/composition-selftest.mjs` | dashboard allowed for `dashboard/data-viz`; positive stat-wall page → `dashboard`; negatives: dataset page with a plain table → `table`, named-only collections → not `dashboard`, one stat wall → not `dashboard`. |
| `m1/eval/axis-selftest.mjs` | shared-name list gains the three stat decisions; synthetic dashboard model → `dashboard` + `stat-grid`; cross-target assertion that name, value **and unit** are in HTML/text/Markdown; negative control proves dropping the unit fails. |
| `m1/curated/grafana-play/play-home.json` | rewritten from `corpus/grafana-play/play-home/nodes.json` + `dom.html`: toolbar, banners, intro prose + inline `Stat Panel` link, basics, and all 11 panels in source order with their stats. |
| `docs/m1/composition.md` | page-kind set and frame table gain `dashboard`; the §8 “dashboard has no grammar” gap is replaced by the adopted rule + the remaining chart-primitive gap. |
| `m1/curated/curation-log-m2.md`, `m1/failures.md` | curation record + F-101 (numeric precision gap). |

## 2. Findings

### 2.1 Exact stat / name counts

From the curated model (re-checkable against `nodes.json`):

```
Color background:6 | Color value:6 | Horizontal with graph:7 | Horizontal:7 | Auto grid:7
Text mode name:7 name-only
total stat pairs = 33 (6+6+7+7+7); name-only entries = 7
```

All 33 pairs carry the captured unit verbatim (`m²`, `GB`) and the captured numeric value
(`5.15`, `57.9`, `3.44`, `70.1`, `35.9`, `111`, `290`, …). The three panels whose captured bodies
are empty (`Value only`, `No text`, `Emoji in stat names`) keep only their titles; the gap is
recorded in `m1/curated/curation-log-m2.md`, not invented.

### 2.2 One decision, three targets

`statGridOf` is the only place a stat collection is classified; `selectForm` returns `stat-grid`
for all targets. Cross-target check (axis-selftest Y2) asserts every stat name + numeric value +
unit appears in HTML, text and Markdown. The same test's negative control (Y5) strips the units
from all three outputs and the assertion fails — a renderer that drops the unit cannot pass.
The stat name is the label; the `_measure` role word `规格` never appears in any target (Y4).

### 2.3 The page frame (measured, Chromium 1248, full white-box HTML)

| viewport | panel columns | stat columns | horizontal overflow | content band |
|---|---|---|---|---|
| 1160 | 2 | 3 | 0 | 1160 |
| 852 | 1 | 2 | 0 | 852 |
| 390 | 1 | 1 | 0 | 390 |

At 1280 the content band is 1160px (panels 568 + 24 + 568). Toolbar controls are one row under the
title; banners are full-width callout rows (not pills); intro/basics prose uses the normal
`--measure` inside its panel; panel titles are `h3`/`h4` section headings (only the page title is
`h1`). No images on this page, so the no-upscale rule is inert.

### 2.4 Before / after

- Before: `table-page`, 11 numbered panel names, no values, `before.html` / `before.txt` /
  `before.md`, screenshot `.scratch/64-dashboard/before-1280.png`.
- After: `dashboard-page`, 11 panels with their captured prose and 33 stat readings, screenshots
  `.scratch/64-dashboard/after-1280.png` (full page, 1280) and
  `.scratch/64-dashboard/after-390.png` (full page, 390); sources `after.html`, `after.txt`,
  `after.md`.

### 2.5 Other 39 pages byte-identical

Rendered all 40 registered models before any change (HEAD code) into `/tmp/before40/<key>.{html,txt,md}`,
then again after the change into `/tmp/after40`. Comparison:

```
changed count 3
grafana-play/play-home.html
grafana-play/play-home.txt
grafana-play/play-home.md
```

i.e. the other 39/40 pages are byte-identical in all three targets; only the dashboard page differs.
The pipeline's own evidence gate independently reports the same fact against the committed
manifest: `证据一致性: 失败 1/40 页 — grafana-play/play-home — html changed since shots` and all other
39 pages match their committed HTML+PNG hashes. (The PNG for the dashboard will be regenerated by the
manager's `--shots` run; it is the only expected stale item.)

## 3. Falsification (tests demonstrably able to fail)

**Rule inverted** — `statWallCount(model) >= 2` → `>= 99`, then restored:

```
FAIL 注册页推导落在 archetype 允许集（39/40） — grafana-play/play-home [dashboard/data-viz] → table (subject:dataset)
FAIL _subject:dataset + 两个统计集合 ⇒ dashboard — {"kind":"table","rule":"subject:dataset"}
构图推导自测: 失败 2 项
--- restored ---
构图推导自测: 全部通过（40/40 注册页落在 archetype 允许集 + 20 项对照检查）
```

**Renderer drops the unit** — removed the `.stat-unit` span from HTML, then restored:

```
FAIL Y2 all three targets carry every stat name, value and unit — ["Cellar","Porch","Backend-ops-01","Frontend-web-03"]
轴一致性自测(三目标): 待修 1 (154 条断言)
--- restored ---
轴一致性自测(三目标): 全部通过 (154 条断言)
```

## 4. Commands and exit codes

| command | exit | result |
|---|---|---|
| `node m1/validate.mjs m1/curated/grafana-play/play-home.json` | 0 | `ok` |
| `node m1/eval/metrics.mjs <model> .scratch/64-dashboard/after.html corpus/grafana-play/play-home` | 0 | facts 98/98, fidelity **1.00** |
| `node m1/eval/metrics.mjs <model> .scratch/64-dashboard/after.md` | 0 | facts 98/98, fidelity **1.00** |
| `node m1/eval/capture-integrity.mjs --model … --corpus …` | 0 | 95 scanned, **0 unmatched**, 0 allowlisted, 0 gaps |
| `node m1/eval/composition-selftest.mjs` | 0 | 40/40 + 20 controls |
| `node m1/eval/axis-selftest.mjs` | 0 | 154 assertions |
| `node m1/eval/taste-selftest.mjs` (Chromium 1248) | 0 | 271 assertions; all 40 pages |
| `node m1/eval/pipeline.mjs` (no shots) | **1** | render 40/40, HTML fidelity 1.00 40/40, Markdown 1.00 40/40, validator 46 ok, all self-tests pass; the *only* failure is the shots-manifest entry for the dashboard (`html changed since shots`) — expected because `--shots` is the manager's step |
| before/after byte comparison of 40 models × 3 targets | — | only `grafana-play/play-home.{html,txt,md}` differ |

Pipeline side effects (normal, generated): `m1/curated/renders/grafana-play-play-home.html`,
`m1/eval/m3-final.json`; the other 39 rendered HTML files are byte-identical to HEAD.

## 5. Gaps and judgment calls

1. **Trailing-zero precision (`85.0` → `85`, `57.0` → `57`, `26.0` → `26`)** — JSON numbers cannot
   carry the source's lexical form, and `_measure` is `{num, unit}` with a numeric `num`. Adding
   `.0` in the render would fail the fidelity metric (a `85` token followed by `.0` is a continuing
   number token), so the renderer prints the captured number itself. Non-integer captured precision
   (`5.15`, `3.44`, `57.9`, `70.1`, `35.9`) is preserved exactly. Recorded as `m1/failures.md` F-101;
   a display-precision field would be a grammar change, not added here.
2. **`Text mode name` (7 names) vs 33 stat pairs** — value-less by capture; kept as a name-only
   sequence (renders as a panel-local name grid), not coerced into fake measurements.
3. **Three empty panels** — `Value only`, `No text`, `Emoji in stat names` have empty captured
   bodies; only titles are modelled. Recorded in the curation log; no chart/body invented.
4. **Toolbar `Edit`** — the captured button copy is `Edit`; the previous model's name
   `Enter edit mode` split the toolbar into two action rows (fails the page-level taste gate
   “every action row starts on the content column's left edge”). Modelled as `_name: Edit`, one row.
5. **Chart primitive** — “Horizontal with graph” has a sparkline that is not captured as data; the
   panel carries its 7 readings only. A closed chart primitive remains a “Next, not yet sliced”
   route item, not something this round fakes.
6. **`dashboard` was added to the page-kind set** (`PAGE_KINDS`, composition.md, composition-selftest
   allow-map). It is a closed kind, resolved only by the declared subject + the stat-wall structure;
   no site name or per-page exception is involved.
