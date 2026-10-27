# Re-check — `grafana-play/play-home` blocker fix (round 65)

Scope: the one blocker + minors M1–M4 from `report.md`, plus "did the fix break anything". Read-only
check; nothing modified except this file and the crops `recheck-*.png`. Oracle = capture (`nodes.json`),
measurements = headless Chromium 1248 on the **current** HTML, values read from computed style /
`getBoundingClientRect`, not from the screenshot.

**Freshness:** the final artifact is current. `m1/curated/renders/grafana-play-play-home.png` is
1280×2000 and the current HTML measures `docH = 2000` at 1280 — same height, so the re-shot PNG is the
page as it stands. `.scratch/64-dashboard/after-390.png` is **stale** (390×6030, the pre-fix layout);
the 390 numbers below were measured on the current HTML (now 390×4204).

## VERDICT: **ACCEPT** — blocker gone, all four minors fixed, no new blocker

### Blocker — fixed

The three body-less panels are now compact title-only bars: `padding 12px 20px`, `border-style:dashed`,
`background transparent`, `box-shadow none`, `align-self:start`, height 76.7 px (was a 568×93 white
card with shadow). Rule is one general engine rule, not per-site CSS
(`.dashboard-page .panel-grid>.block:not(:has(.stat-grid,.prose,.fact,.controls,.manifest,.deflist,.list,.stack,.band))`).

- Titles intact and verbatim: `Value only`, `No text`, `Emoji in stat names` — all three strings exist
  in `nodes.json`; **nothing invented**, no pipeline prose added, no captured fact dropped.
- Nothing is dressed as data: no card background, no shadow, no inner box — the frame no longer makes
  the false claim "this source panel is empty".
- The third one alone in its row (`Emoji in stat names`, 568 px dashed bar at 1280; 342 px at 390)
  reads as a section label, **not** as a failed card — see `recheck-1280-bottom.png` and
  `recheck-390-full.png`. The dashed border reads as "left bare by the capture", which is the truth.

Evidence: `recheck-1280-bottom.png` (the three bars plus the two real cards above them),
`recheck-1280-full.png`, `recheck-390-full.png`.

### M1 — fixed: row gap is 24 px

`.panel-grid` computed `row-gap:24px`, `column-gap:24px`; blocks `margin-block:0`. Measured row starts at
1280: 361.4 → 674.2 (288.8 + **24**) → 987 → 1398.9 → 1810.8 → 1911.4. Same 24 px at 390.

### M2 — fixed: sibling bottoms aligned

`align-items:stretch`; every sibling pair in a row now has one height:
(0,1) 288.8/288.8 · (2,3) 288.8/288.8 · (4,5) 387.9/387.9 · (6,7) 387.9/387.9 · (8,9) 76.7/76.7.
No ragged step at the bottom edge. (At 390 the grid is one column, so stretch is a no-op there.)

### M3 — fixed: banners span the 1160 band

Both banner rows measure `x = 60, width = 1160` at 1280 — the same band as `.g-panels`
(`bandX 60, bandW 1160`). No 500 px void to the right; the rows square up with the panel grid.

### M4 — fixed: 2 stat columns at 390

`.stat-grid` computed `142px 142px` at 390 and at 391; `269px` (1 col) at 359; `230px` at 320.
`scrollWidth == clientWidth` at 1280, 852, 391, 390, 359, 320. Document height at 390 fell
6030 → **4204** px, so the page reads as a wall on a phone (two cards per row) and got ~30 % shorter.
Stat cells are uniform 76 px, no clipping (`scrollWidth` of every element == `clientWidth`; max value
box 112×25 px inside a 142 px card). `recheck-390-full.png`: readable, units attached (`85 m²`,
`90.3 GB`), banners wrap to 2 lines, toolbar `Last 6 hours · Refresh · Edit` stays one row.

### New issues introduced by the fix — none found

| risk | measurement | result |
|---|---|---|
| compact rule falsely catching a content panel | 8 content blocks all `border:solid`, `background:rgb(255,255,255)`, shadow present; only blocks 8–10 are dashed/transparent | clean |
| content panel losing its card | see above — cards intact at 1280 and 390 | clean |
| horizontal overflow after `max-width:none` on banners | `scrollWidth == clientWidth` at 1280/852/391/390/359/320 | clean |
| clipped / wrapped-away title | all 11 `.title` texts render; compact bar 76.7 px holds one 1.12em line | clean |
| rule leaking to other pages | `dashboard-page` appears in exactly 1 of the 42 renders | clean |

Two notes, neither a defect:

1. **Stretch buys blank bottoms** — `The Basics` now carries ~90 px of air under its last line, because
   its sibling `Color value` is taller. That is exactly the source behaviour the review asked for
   ("the shorter panel gets bottom air"), so it stays; it is visible in `recheck-1280-full.png`.
2. **Dashed is a deliberate "left bare" signal**, not a placeholder to be filled. If a future round
   wants zero dashed ink, the declared-omission route (curation log + `m1/failures.md`) is still open —
   but nothing about the current form misleads a reader.

Residual (out of scope, already declared elsewhere): the colour/sparkline formatting loss is recorded in
`m1/failures.md` (line ~812) and `m1/curated/curation-log-m2.md`; not re-judged here.

## Evidence files

| file | what it shows |
|---|---|
| `recheck-1280-full.png` | full page at 1280, current HTML (1280×2000) |
| `recheck-1280-bottom.png` | crop y 1650–2000: card bottoms aligned, then the three dashed title bars |
| `recheck-390-full.png` | full page at 390, current HTML (390×4204), 2-column stat walls |
