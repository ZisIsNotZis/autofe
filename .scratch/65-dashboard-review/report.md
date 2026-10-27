# Independent visual review — `grafana-play/play-home` (M2 dashboard), round 65

Reviewer: fresh eye, read-only. Oracle = capture text (`nodes.json` / `dom.html`); I did **not** read
values back off the screenshot. No file modified except this one.

Artifacts judged: `.scratch/64-dashboard/after-1280.png` (1280×2248), `.scratch/64-dashboard/after-390.png`
(390×6030), HTML `m1/curated/renders/grafana-play-play-home.html`, model, curation log, and the source
`viewport.png` (1440×900).

**Freshness check:** the PNGs are current — headless Chromium 1248 on the HTML as it stands measures
`docHeight = 2248` at 1280 and `6030` at 390, exactly the PNG heights; `scrollWidth == clientWidth`
at 1280, 852 and 390 (no horizontal overflow at any of the three).

## VERDICT: **REJECT** — one blocker

> **BLOCKER (reported first, as instructed): three framed *empty* panels at the foot of the page.**
> `Value only`, `No text`, `Emoji in stat names` each render as a bordered, shadowed card (568×93 at
> 1280, 342×93 at 390) containing nothing but the title, and the third sits alone in its row.
> Evidence: `empty-panels-1280.png`, `empty-panel-third-1280.png`, `empty-panels-390.png`.
> The card frame asserts *"this source panel is empty"*, which is false: the capture shows each panel
> body as a real box (`nodes.json` sections of 464×**334**, 550×**334**, 1022×**258** px); only the
> element capture of the body is missing. A user skimming the gallery reads this as "the renderer
> dropped the content", not "the capture was shallow" — it is the one thing on the page that looks
> broken, and it is the bottom third of the page.
> Fix (least invasive, keeps every captured fact, no per-site CSS, no invented text): make a
> body-less panel a **compact title-only bar** — one general engine rule, e.g.
> `.panel-grid > .block:not(:has(.stat, .manifest, .prose, .fact, .controls)) { padding: 12px 20px; box-shadow: none; background: transparent; }`
> — so the three read as section labels that the capture left bare rather than as failed cards; keep
> the gap declared in `m1/curated/curation-log-m2.md` as it already is. (Acceptable alternative,
> which the implementer may prefer: omit the three from the rendered grid and declare the omission in
> the curation log + `m1/failures.md` — "3 of 11 panels have no captured body; a framed empty card
> would assert the source panel is empty". What is *not* acceptable is the framed empty card as it
> stands.)

Everything else below is minor; no other issue would stop the page from being shown.

---

## 1. Does it read as a dashboard? — Yes at 1280, weakly at 390

**1280** (`r1280-part1..5.png`, `head-1280.png`, `stat-zoom-1280.png`)

- Hierarchy is legible and ordered: `Stats` (h1, 51 px) → muted `Time range selected: Last 6 hours`
  → three toolbar pills → two banner rows → 2-column panel grid. Panel titles are `h3` at ~19 px, so
  the reading order title › panel › stat holds without effort. Good.
- Panel rhythm: two 568 px columns, 24 px column gap, stat grid 3×165 px inside each panel. The
  grid reads as a wall, not a list — this is the thing the old table render lost, and it is fixed.
- Every one of the 33 readings has name above, value large, unit attached on the same baseline
  (`stat-zoom-1280.png`: `Cellar / 85 m²`, thin space intact). No detached or ambiguous unit; `m²`
  and `GB` never sit away from their number. Legibility is good (13 px muted name, 28 px 650-weight
  value, tabular numerals).
- Grouping is correct: stats stay inside their panel; `Text mode name` keeps its 7 name-only entries
  as a panel-local name grid instead of being faked into measurements. The intro/basics prose panels
  sit beside stat panels without swallowing them.

**390** (`r390-part1..8.png`, `stat-zoom-390.png`)

- Each stat is readable (name 13 px, value 22 px, unit ~18 px) and nothing overlaps or clips.
- It is a coherent *document* but no longer reads as a *wall*: 33 single-column full-width cards make
  the page 6030 px tall and each 300 px-wide card holds one short number, so the screen shows ~1.5
  stats at a time. See finding M3.

## 2. What is visibly broken

Nothing beyond the blocker. Measured, not eyeballed:

| check | 1280 | 852 | 390 |
|---|---|---|---|
| `scrollWidth` vs `clientWidth` | 1280/1280 | 852/852 | 390/390 |
| panel columns | 568 + 568 | 784 | 342 |
| stat columns | 3×165 | 2×363 | 1×300 |
| any stat text clipped/overflowing | none | none | none |
| detached unit | none (all units inside `.stat-value`) | — | — |

Findings, in page order:

**M1 — minor — vertical row gap is 60 px while the column gap is 24 px (1280).**
`.panel-grid` has `row-gap:24px`, but every `.block` also carries `margin: 18px 0` (shared block
style), so rows sit 60 px apart against 24 px between columns. Rows read as separate sections rather
than one board. Where: whole panel grid, 1280/852. Fix: `.dashboard-page .panel-grid > .block{margin-block:0}`
(the dashboard frame already owns its own spacing) — one scoped rule, no other page touched.

**M2 — minor — ragged panel bottoms inside a row (1280).**
`align-items:start` gives: row 1 Introduction 249 vs Color background 289 (40 px step), row 2
The Basics 241 vs Color value 289 (48 px), row 4 Text mode name 361 vs Auto grid 388 (27 px).
The steps are visible at the bottom edge of the page (`ragged-row1-1280.png`). This is exactly the
"uneven card heights that look accidental" symptom, and it is *unfaithful in the small*: Grafana rows
give sibling panels one height. Fix: `align-items: stretch` on `.panel-grid` (the shorter panel gets
bottom air, as on the source); or, if the ragged look is intentional editorial, say so in
`composition.md` and leave it — but then do not also ask for "dashboard rhythm".

**M3 — minor — banners are a 634 px-wide strip on the left of a 1160 px band (1280).**
`w-narrow` on the banners node caps both callout rows at ~634 px, leaving ~500 px of white to their
right (`head-1280.png`). This is the project's own rejected shape — a left-aligned island with half a
page blank beside it (`docs/m1/composition.md`, the S6 "no half-page void" prior). The toolbar above
it does the same but is short enough to read as a control row. Fix: let the two banner rows take the
dashboard content band (`w-narrow` off on this page's banners, or a dashboard-scoped
`.g-banners .node{max-width:none}`); their text stays a single line and the stack squares up with the
panel grid below.

**M4 — minor — at 390 the stat wall collapses to one column too early.**
`@media(max-width:390px)` drops `.stat-grid` to 1 column, so a 390 px viewport gets 33 stacked cards
(6030 px) while 391 px gets 2 columns. Two 165 px columns fit comfortably in the 342 px band
(`Living room`, `Backend-ops-01` wrap to two lines and the card grows — verified cells are auto-height).
Fix: move the 1-column breakpoint to `max-width:359px`, keep 2 columns at 390; re-measure the card
height so the star (`A-series`) and the long names (`Frontend-web-01`) still fit. This restores the
"wall" reading on phones and cuts the page roughly in half.

**I1 — info — 7-item panels leave a lone last card.** `Frontend-web-03` and `G-series` end up alone in
their panel's third row. This is arithmetic (7 % 3), not a defect; a 4-column stat grid inside 568 px
would give 4+3 and no hole, but 4×130 px starts squeezing `Frontend-web-01`. Leave it.

**I2 — info — name-only entries look like cards, not buttons.** `Text mode name`'s 7 bordered chips
share the stat-card border, so they read as sibling data, not as clickable controls. They are static.
Keep as is (removing the border would make them look like a weaker kind of fact).

## 3. The three empty panels

Answered in the blocker above. Summary of the judgement asked for: **yes, rendering only their titles
looks like a defect a user would reject**, and it is worse than a "known gap" because the card frame
turns the gap into a claim about the source ("the panel is empty"), which the capture contradicts
(body boxes 464×334, 550×334, 1022×258 px). The fix must not invent content, must not hide a captured
title, and must not add site-specific CSS: a general "body-less panel = compact title bar" rule (or a
declared omission) satisfies all three. Do not fill the bodies with "not captured" prose — pipeline
talk has no place on a rendered page, and the curation log is already the right home for the gap.

## 4. Faithfulness of the composition decision

Split the question as asked:

**Different by design language — acceptable.** Dark Grafana chrome → light editorial surface; the nav
rail, breadcrumb, search and command bar are gone; the source's mixed-width dashboard rows (¼/¾, ¾/¼,
full-width) become a uniform 568/568 grid; stat cells become bordered light cards. The project's
design language is a light reading surface with a 1160 px band, and the source's *facts* — 11 panel
titles in order, 33 name/value/unit readings, the intro prose with its `Stat Panel` link, the basics
list, both callout links, the three toolbar controls and the captured time-range summary — all survive
in source order. Nothing is invented and nothing captured is dropped except through the declared gap.
So no, dropping the dark surface and the nav is not a loss of meaning: chrome is chrome.

**Lost meaning — real but honest, and should stay declared, not fixed.**
The page is a dashboard *about stat panel options*: `Color background` and `Color value` exist to show
coloured cells and coloured values, and `Horizontal with graph` exists to show sparklines. The render
shows eleven identical grey-on-white stat walls, so three panel titles now name a formatting
difference the reader cannot see, and the preserved sentence "Stats show one large stat value with an
optional graph sparkline" describes a feature that never appears on the page. That is a genuine loss
of the source's *point*, not merely of its look. But none of it is capturable from `nodes.json`
(no series, no per-cell colour fact) — faking a sparkline or painting cells from a screenshot would be
the actual defect. Verdict: acceptable under this project's language, **provided the loss is declared
where faithfulness is judged** (`curation-log-m2.md` already does; `composition.md`'s chart-primitive
gap does; `m1/failures.md` should carry the "colour/sparkline formatting not captured" line so the
next round reads it). The one thing I would *not* accept here is "fixing" it by tinting cells — that
would break the light theme for all 40 pages to buy three panel titles' worth of local colour.

## 5. Small screens

At 390 (`r390-part1..8.png`, `empty-panels-390.png`): each stat readable, no clipping, no horizontal
scroll (`scrollWidth = 390`), title/toolbar `Last 6 hours · Refresh · Edit` still one row, banners wrap
to 2–3 lines each without overflow, stat units stay attached (`65.4 m²`), name-only entries stack
cleanly. The page is coherent, but it stops being a dashboard: one stat per screen-width (M4) and a
6030 px scroll. Fix M4 and the phone view is good; the three empty cards are worse here than at 1280
because they are full-width and alone in the viewport.

## Evidence files (all in this directory)

| file | what it shows |
|---|---|
| `empty-panels-1280.png` | `Value only` / `No text` as framed blank cards (blocker) |
| `empty-panel-third-1280.png` | `Emoji in stat names` alone in the last row |
| `empty-panels-390.png` | same three, full-width, at 390 |
| `ragged-row1-1280.png` | Introduction vs Color background bottom edges, 40 px step (M2) |
| `head-1280.png` | title, toolbar, and the 634 px banner strip with 500 px of white (M3) |
| `stat-zoom-1280.png` | stat legibility, name/value/unit baseline, thin space |
| `stat-zoom-390.png` | stat legibility at 390 |
| `r1280-part1..5.png` | full page in five bands at 1280 |
| `r390-part1..8.png` | full page in eight bands at 390 |

## 6. Ready for the user's eye?

Not quite, and only because of one thing: the page's last three rows are framed blank cards. Everything
the round was actually for is there and is good — the panel grid reads as a dashboard, all 33 readings
are legible with their units attached and grouped inside their panels, the prose panels and the
name-only panel are honest, source order is preserved, and there is no overflow at 1280, 852 or 390.
Fix the empty-panel frame (one general rule, or a declared omission), and while you are in the
dashboard frame take the two one-line rhythm fixes (M1 `margin-block:0`, M2 `align-items:stretch`) so
the board's rows align like the source's; M3 and M4 can follow without blocking. With the blocker gone
I would show this page as the corpus's dashboard exemplar.
