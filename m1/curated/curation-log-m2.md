# M2 curation — grafana-play/play-home (Stats dashboard)

Source of truth: `corpus/grafana-play/play-home/nodes.json` + `dom.html` only. No value was read
from `full.png`; no truncated value was completed; no panel that the capture shows empty was filled.

## What was modelled

- Root keeps `_intent`, `_key` (`grafana-play-stats-dashboard`), `_scope: entity`,
  `_subject: dataset`, `_title: Stats`.
- `toolbar`: the three captured controls (`Last 6 hours`, `Refresh`, `Edit`) and the captured
  summary `Time range selected: Last 6 hours`.
- `banners`: the two captured callout links, verbatim.
- `panels`: the 11 panel sections in source order; each panel's title is its own `_name`
  (section heading), its body a named child so stats stay inside their panel.

## Counts (re-checkable from nodes.json)

| panel | collection | entries |
|---|---|---|
| Color background | `stats` | 6 stat pairs |
| Color value | `stats` | 6 stat pairs |
| Horizontal with graph | `stats` | 7 stat pairs |
| Horizontal | `stats` | 7 stat pairs |
| Auto grid | `stats` | 7 stat pairs |
| **total stat pairs** | | **33** (6+6+7+7+7) |
| Text mode name | `names` | 7 name-only entries |
| Introduction | `content` (heading + 2 paragraphs + inline `Stat Panel` link) | prose |
| The Basics | `steps` | 3 paragraphs (captured as an unordered list) |
| Value only / No text / Emoji in stat names | — (title only) | 0 (capture gap) |

Every `_measure` carries the captured unit exactly (`m²`, `GB`) and the captured numeric value
(`5.15`, `57.9`, `3.44`, `70.1`, `35.9`, …). Mini-graphs are not captured as data, so no chart was
faked; the three empty panels are named and their gap is recorded, not filled.

## Capture gaps / judgment calls

- `Value only`, `No text`, `Emoji in stat names`: their captured panel bodies are empty; only the
  titles exist. Nothing is invented.
- Trailing zeros (`85.0`, `57.0`, `26.0`) are source formatting of the same number; JSON numbers
  cannot carry the lexical form and the fidelity metric rejects re-adding it. See `m1/failures.md`
  F-101.
- The toolbar's third control is modelled as `_name: Edit` (the captured button label). The
  previous model used `Enter edit mode` as its name to keep an aria-label; that split the toolbar
  into two action rows, which the page-level taste gate rejects. Capture copy is `Edit`.
