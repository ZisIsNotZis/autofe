# 5 · The product

Source: **CONFIRMED** for the commitment and the user's acceptance list; **EXPLICIT** for the
D-1…D-6 rulings; **INFERRED** for the design language and the presentation decisions below, each
with the evidence that settled it. Technical homes: implementation in `docs/9_IMPLEMENTATION.md`,
grammar/composition/layout in `docs/m1/*.md`.

## 1. What it is

A closed business-intent model plus an engine that projects it into frontends. The model is the
product's core; the curated gallery is its proof and its review surface. A reader of the gallery
should see real pages composed as their kind demands — an entry page with focus, a catalogue as a
grid, an article as a reading column, a dashboard as a wall of measured values — and should be able
to check any page against its source.

Three things are deliberately *not* in the product: a per-site stylesheet or template, a pixel-level
copy, and a browser-side runtime. The first two are escape hatches; the third would move the decision
layer out of the engine (rejected in `docs/sources/design-basis.md` §6).

## 2. The author's surface

- **One model per page**, JSON, reserved keys only. Intent (`_intent`) is a sentence, not a tag.
- **Business vocabulary**: roles (title, price, rating, author, image…), verbs (buy, submit, open…),
  relations (compare, order), typed values. Adding a word is a logged grammar/vocabulary change.
- **Composites are types**, not macros: search / table / login / paginator / form, each with typed
  slots and a role per slot (state / field / pointer). Missing required slot = type error.
- **Conditions** (`_when`) read facts and exposed state by path; a condition on a name that does not
  exist is a validation error, not a silent false.

## 3. The reader's surface

- **The gallery**: `m1/curated/renders/index.html`, one card per page with its fidelity numbers;
  generated from the actual renders, never hand-built.
- **Original | rendered pairs**: `node m1/eval/side-by-side.mjs` → `m1/curated/renders/sbs/`; the
  reviewer's primary view, because a render alone cannot show what was lost.
- **Three targets as a single claim**: the same page in HTML, plain text and Markdown; the text and
  Markdown targets exist to make the claim testable, not as products in their own right (yet).
- **The README** is the public first screen; it summarizes this chain and the route's state.

## 4. Composition and design language

- **Page prototypes are closed and derived**: marketing, catalog, search, reading, profile, table,
  detail/product, authentication, and (from M2) dashboard. Scope/subject are declared business facts;
  frames and media roles are engine decisions. No `default`.
- **Frames carry the page's job**: a marketing band sequence; a centred reading measure (CJK ≈ 36em);
  a search result list with a measured text column + media slot; a table frame with a scroll container;
  a centred identity card for a profile; a two-zone feed + rail when one collection dominates and
  short cards trail it; a stat grid for a dashboard (M2).
- **Type and rhythm**: CJK-aware scale (h1 ≈ 3× body), 8pt-ish spacing, 1160px content band with
  clamped page padding, centred columns rather than left-hugging ones.
- **Colour from the source, not invented**: brand accent is measured from captured chrome (logo, nav,
  theme-color); a source with no signal falls back and says so. Currency glyphs are presentation
  (D-6), not a semantic fact.
- **Affordance in three layers**: destination lists carry a marker; body links are accented and
  underlined; headings/cards are accented without underline; buttons keep their own form. The
  principle is "visible as clickable at a glance", not "always blue".
- **Media by role**: hero, card, thumbnail, reading illustration, gallery tile; containers are sized
  by the role, images are never upscaled; a source image smaller than its role is shown small and the
  gap is recorded.
- **Density is a taste decision**: records are capped, summaries clamped, waterfalls used only when
  member heights genuinely differ; a page should read as a page, not as a list of facts.

## 5. The review experience

The user opens the gallery, picks a page, sees the source and the render side by side, and judges.
The manager must say what is done, what is not, and what to look at. An agent does the user's visual
job first — the same pages, the same pairs — and fixes every seeable problem before the user is asked
to look. A `need_user_review` milestone is only for what a human eye must judge.

## 6. Rejected branches (with the reason they stay rejected)

| Branch | Why rejected |
|---|---|
| Per-site CSS / template override | It is the escape hatch the product exists to remove; a page-specific style hides a grammar gap. |
| Pixel-perfect reproduction | The Goal is faithful meaning and composition, not a screenshot; pixel parity would force source-specific geometry into the engine. |
| Browser-side runtime rendering | Moves decisions into the client and multiplies nondeterminism; the engine is a pure build-time projection. |
| `_macro` / identity expansion | User ruling D-1: composites are schema types, not magic macros. |
| Growing the exemplar set first | User ruling D-4: perfect the existing pages before adding sites. |
| Auto-generated translations | A `README.<lang>.md` is written, not machine-translated; a bad translation is worse than none. |
| Charts as escaped SVG / free-form markup | If a dashboard needs charts, the chart must become a closed typed primitive with data and unit, not an image or raw markup; an escape hatch would end the closed-grammar claim. |
| A second decision layer per target | Every re-derivation found in a renderer is a defect; it moves up to `axis.mjs`. |
