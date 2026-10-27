# 3 · What must be true

Source: **CONFIRMED** where it repeats the acceptance the user confirmed in round 62
(`docs/sources/product-2026-10.md` §2 before migration); **EXPLICIT** where it quotes a user ruling (D-1…D-6);
otherwise **INFERRED** from the implementation and its gates.

## Functional behaviour

- **Closed grammar.** A model uses reserved `_`-keys and vocabulary roles only. An unknown key is a
  hard error; there is no styling key. Grammar/vocabulary changes go through `m1/failures.md` first.
- **Typed values.** Text, number+unit, money, date, bool, image, reference. A value carries its own
  unit when the source does; the engine never invents one.
- **One model, three targets.** HTML (`m1/render.mjs`), plain text (`m1/render-text.mjs`) and GFM
  Markdown (`m1/render-md.mjs`) share every decision through `m1/axis.mjs`; no renderer imports
  another, and no renderer re-derives a model semantic.
- **Deterministic.** Same model + same context ⇒ byte-identical output. No AI, network or clock in
  rendering.
- **Complete composition.** Every page resolves to exactly one closed page prototype. `default` /
  `undefined` is a hard failure, not a fallback. The rendered page must carry the class its declared
  prototype demands; a declaration that is not delivered at runtime is an error.
- **Schema-checked composites.** `search`, `table`, `login`, `paginator`, `form` are closed types
  with typed slots; a claimed composite missing a required slot is an error with a path.
- **Capture is truth.** Every model fact, target, image and quoted emphasis must be traceable to the
  capture. Links are carried verbatim; a target never invented. Upscaling a source image is forbidden.
- **Real-page proof.** The curated gallery covers real, captured pages across sites and archetypes;
  each page passes fidelity, source-coverage and integrity gates.

## Non-functional

- **Performance.** `node m1/eval/pipeline.mjs` renders every curated page and runs every gate in
  about one minute on the development machine; `--shots` (screenshots + gallery + hash manifest) in
  about three minutes. A dependency-free engine is a hard constraint.
- **Portability.** Rendering runs on Node with no browser. Browser-dependent gates (`--shots`, the
  intent gate, no-upscale measurement, side-by-side) use a local `chrome-headless-shell` through
  `playwright-core`, pointed to by `AUTOFE_CHROME_PATH` / `AUTOFE_PLAYWRIGHT_CORE`.
- **Compatibility.** Tested widths: 2560 / 1920 / 1440 / 390 px; CJK-aware reading measure; no
  horizontal overflow at 390 px except tables, which may scroll inside their own frame.
- **Security / supply chain.** No committed secrets, no unvetted vendored repository; captures obey
  robots decisions and host pacing; the browser toolchain is pinned.
- **Legal / product.** AGPL-3.0. Closed, single-author codebase; external pull requests are not
  accepted. Publication is the default release mode for a public repository; a `_private` name would
  change that (not the case here).
- **Budget.** Default ¥100 unless the user sets one. Time is the scarcer resource: finish sooner
  where it costs less of it; parallelise only when coordination overhead is under 20%.

## The user's acceptance list (verbatim substance, round 62 / U-series)

- Meaningful, coherent end-to-end pages; forms aligned to their frame; compact practical navigation
  and footer; foreground/background contrast pairs; images, titles and actions grouped coherently;
  readable information density; no unnecessary giant brand heading; brand-appropriate variation —
  not everything centred, not needless redesign.
- Each page type has the composition it should have: an entry page has a focus and rhythm; a
  catalogue is a visual grid, not a link directory; an article has a centred reading column; a feed
  has a main column plus rail; a profile has an identity card.
- Widths 2560 / 1920 / 1440 / 390; facts and actions preserved; closed grammar; no per-site CSS or
  model escape hatch; no image upscaling; no invented source fact.
- Full source/image comparison where relevant; the actual full-page height inspected; hash-bound
  self-evidence plus a fresh independent technical/experience review; the deliverable is the
  original | rendered side-by-side image.
- **User ruling (round 58):** fix the pages the user named first and show them; do not move on to
  other sites until the user approves. Unnamed pages are not presumed innocent.

## The six settled rulings (D-1…D-6)

| # | Ruling |
|---|---|
| D-1 | No `_macro`. Composites are **schema types**: closed registry, required slots checked, missing part = type error. |
| D-2 | Composite fields are addressable by path (`form.size`, `search.query`) in conditions; secret values are not specially protected. |
| D-3 | A labelless input may take a closed-vocabulary label, overridable by `_label`; label→placeholder is an engine composition decision. |
| D-4 | Do not expand the exemplar set before the existing pages are good. Quality over coverage. |
| D-5 | The three provisional syntax rulings stand (expose scope priority; composite-field addressability; prose merging is an engine fix). |
| D-6 | Currency is a closed enum in the model; glyph/precision is a presentation/brand choice, declared, not baked into the semantic layer. |
