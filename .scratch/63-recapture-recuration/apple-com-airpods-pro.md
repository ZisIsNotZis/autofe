# apple-com/airpods-pro — new curation (round 63, D-63d replacement for iphone-16)

Worker: curation worker, round 63. Date: 2026-10-16.
Capture oracle: `corpus/apple-com/airpods-pro/` (capturedAt 2026-10-16T08:42:04Z, status 200,
`https://www.apple.com/airpods-pro/`, archetype product-detail). Same-site structure reference:
`m1/curated/apple-com/macbook-air.json`.

## Page read (capture, not assumptions)

Full Apple product overview: hero (AirPods Pro 3 / “The world’s best in‑ear Active Noise
Cancellation.” / stat “Up to 2x more than AirPods Pro 2.” / Buy) + 13 content sections (Get the
highlights · Take a closer look · Intelligent noise control · Audio performance · Personalized
listening · Fitness · Hearing Health · Experience · All-day battery life · Why Apple is the best
place to buy · Keep exploring AirPods · environment · values). Like the fresh macbook-air capture,
the page carries **no prices** (dom: 0 `RMB`/`¥`); the only commerce facts are the Buy/Shop CTAs,
the Apple Card Monthly Installments sentence (no numbers), and the compare cards.

## Model shape (138 facts)

- Root: `_image` (hero jpg + capture alt), `_title` “AirPods Pro 3”, `_subtitle` the ANC claim
  (`_primary`, hero slot), `_summary` = hero stat “Up to 2x more than AirPods Pro 2.”, `_action`
  buy → `https://www.apple.com/us/shop/goto/buy_airpods/airpods_pro_3` (absolutized from
  dom-relative `/us/shop/goto/buy_airpods/airpods_pro_3`).
- `_lines` in capture order: `highlights` (6 cards, `_rel.order sequence`, storyline action
  “Watch the film” → the dom's m3u8 URL, macbook-air precedent), `closer-look` (6 product-viewer
  cards), `noise-control` (lead + 2 ANC quantified claims + 4 feature cards with gallery images),
  `audio-performance`, `personalized-listening` (lead + 3 blocks), `fitness` (lead + Fitness app +
  IP57), `hearing-health` (lead + `Learn more` → /airpods-pro/hearing-health/ + 4 tiles, battery
  tile keeps its stat “4 more hours for the Hearing Aid feature” as `_summary`), `experience`
  (3 tiles), `battery` (lead + 2 quantified tiles + `findmy` child with “1.5x increase” stat),
  `buy` (5 incentive tiles + Shop AirPods), `compare` (AirPods Pro 3 “Currently viewing” card +
  AirPods 5 card, each with 8 spec rows and per-card Buy/Learn more, + “Compare all AirPods
  models” / “Explore all AirPods” actions), `environment` (3 quantified facts + PDF report
  action), `values` (3 commitments with their Learn-more links).
- All 19 `_action` targets grep-verified in `dom.html` and absolutized against
  `https://www.apple.com`; all 30 `_image` URLs are capture `src`s with the capture's own `alt`
  where one exists.
- Dropped as chrome (classified): global nav + mega-menu panels (Explore/Shop ×8 product lines),
  local “AirPods” sitemap directory section, Apple footer directories, background `<video>`
  elements (looping hero/media, no discrete facts), footnote definition list.

## Conversion class used (round-43 precedent), evidence

Footnote superscript digits (`<sup>4</sup>` etc., 67 sup elements in the capture) sit INLINE in
the visible text; the model omits them. The capture-integrity gate therefore reports **22
unmatched**, and it is proven they are pure sup-digit omissions, not inventions: re-running the
tool's own `matches()` with digits stripped from BOTH the model value and the haystack matches
**22/22** (0 residual). Every other fact (116/138) matches the capture literally.

## Proposed allow entries (kind=conversion, round 63 — parent-integrated only, NOT applied)

All 22 with `page: "apple-com/airpods-pro"`, `kind: "conversion"`, `reason: "正文省略源站上标脚注
数字（<sup>）后的连续文本，非逐字。"`, `round: 63`:

| path | value (prefix) |
|---|---|
| `_lines[0]._items[3]._detail` | Live Translation helps you communicate across languages. Available in select languages… |
| `_lines[0]._items[4]._detail` | Hearing Aid capability now features automatic Conversation Boost and 67% more battery life… |
| `_lines[1]._items[1]._detail` | The ear tips are now rotated inward for a more secure fit, and a new layer… |
| `_lines[1]._items[5]._detail` | Next-generation Ultra Wideband technology increases the distance of Precision Finding by 1.5x… |
| `_lines[2]._detail` | Introducing the world’s best in-ear Active Noise Cancellation… |
| `_lines[5]._detail` | All-new heart rate sensing helps you track your heart rate and calories burned… |
| `_lines[5]._items[0]._detail` | With just AirPods Pro 3 and iPhone, you can dive into the new workout experience… |
| `_lines[5]._items[1]._detail` | A first for AirPods, an IP57 rating means AirPods Pro 3 are more durable than ever… |
| `_lines[6]._detail` | AirPods Pro 3 bring improvements to the world’s first end-to-end hearing health experience… |
| `_lines[7]._detail` | AirPods Pro 3 are packed with features that make even the simplest moments seem… |
| `_lines[7]._items[0]._detail` | Get more done every day with hands-free access to an even more powerful… |
| `_lines[7]._items[1]._detail` | Siri can read out messages and alerts as they arrive… |
| `_lines[7]._items[2]._detail` | Easily share what you’re watching or listening to with a friend. |
| `_lines[8]._detail` | The MagSafe Charging Case is full of helpful features… |
| `_lines[8].findmy._detail` | Easily locate the exact place you left your AirPods Pro.…by 1.5x. |
| `_lines[10]._items[0]._items[4]._name` | Hearing Test, Hearing Aid, and Hearing Protection features |
| `_lines[10]._items[0]._items[5]._name` | Live Translation and Siri AI |
| `_lines[10]._items[0]._items[6]._detail` | Up to 8 hours of battery life on one charge with Active Noise Cancellation… |
| `_lines[10]._items[0]._items[7]._name` | Voice Isolation, Hey Siri, and Siri Interactions |
| `_lines[10]._items[1]._items[0]._name` | Up to 1.5x more Active Noise Cancellation than AirPods 4… |
| `_lines[10]._items[1]._items[5]._name` | Live Translation and Siri AI |
| `_lines[10]._items[1]._items[7]._name` | Voice Isolation, Hey Siri, and Siri Interactions |

(Full values are in the model at those paths; the JSON entries should copy them from the model.)

## Assets

No local assets needed: every image in the model is a real capture URL (apple.com CDN), same
pattern as macbook-air. Nothing to add under `m1/curated/assets/`.

## Evidence

```
node m1/validate.mjs m1/curated/apple-com/airpods-pro.json
  → ok
node m1/render.mjs m1/curated/apple-com/airpods-pro.json /tmp/apple-com-airpods-pro.html
node m1/eval/metrics.mjs … /tmp/apple-com-airpods-pro.html corpus/apple-com/airpods-pro
  → factFidelity 1 (138/138), kendallTau 0.531
node m1/eval/capture-integrity.mjs --model m1/curated/apple-com/airpods-pro.json
  → 22 unmatched, all proven sup-digit-only omissions (proof method above);
    after the 22 proposed allow entries land: 0 unmatched, 22 allowlisted
Screenshot check: /tmp/airpods.png — hero (title/stat/ANC primary/Buy/hero image) renders correctly.
```

## Residual risks

- The 22 allow entries are proposals; until the parent integrates them, the page-level gate run
  (`--only` across all exemplars) will count 22 unmatched for this page. Honest count, not hidden.
- `metrics.mjs` storyline tau 0.531 vs source heading order — the metric is a feature, not a gate;
  noted for the record.
