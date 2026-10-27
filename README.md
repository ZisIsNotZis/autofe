**English** | [简体中文](README.zh-CN.md)

<img src="assets/logo.svg" alt="AutoFE" width="200" height="40">

# AutoFE

### Business intent in, frontend out.

**AutoFE is an intent-driven frontend: the author declares what a page means — roles, priorities, relations and actions — and one shared decision layer renders that same model as HTML, plain text and Markdown, so presentation can change without the business meaning changing with it.**

![The `linear-app/home` model rendered by the engine](m1/curated/assets/62-linear-demo-0.png)

<sub>One curated model (`m1/curated/linear-app/home.json`) rendered by `m1/render.mjs` at 1320×720. No per-site CSS, no per-site template — the page is produced from the model alone.</sub>

## Quick start

```sh
git clone https://github.com/ZisIsNotZis/autofe.git
cd autofe
node m1/eval/pipeline.mjs          # render every curated model + run the gates (~1 min)
```

No `npm install` — the grammar, the validator and the three renderers have no dependencies.

Render one page, or check one model:

```sh
node m1/render.mjs m1/curated/gov-uk/ni-rates-letters.json /tmp/ni-rates.html
node m1/render-md.mjs m1/curated/sspai-com/post-114716.json /tmp/post.md
node m1/validate.mjs m1/curated/*/*.json
```

## What it can do now

- **A closed grammar for page meaning.** Models use reserved `_`-keys only (`_intent`, `_scope`, `_subject`, `_rel`, `_when`, `_expose`, `_fields`, `_primary`, `_empty`, `_items`, `_lines`, `_action`). An unknown key is a hard error, not a warning — the grammar has no escape hatch for styling.
- **Three render targets from one model.** HTML (`m1/render.mjs`), plain text (`m1/render-text.mjs`) and GFM Markdown (`m1/render-md.mjs`). Each imports `m1/axis.mjs` and `m1/model-lib.mjs` and **never** another renderer; renderer code contains zero model-semantic tokens.
- **Page archetypes derived, not declared by hand.** `_scope`/`_subject` determine a page frame (marketing, catalog, search, reading, profile, table, detail) and a two-zone feed+rail or mosaic layout; `default` is no longer a legal outcome.
- **Schema-checked composite primitives.** `m1/composites.json` declares `search`, `table`, `login`, `paginator` and `form` as named expansions with typed slots, so a model that claims a composite but misses a slot fails validation with a path.
- **Deterministic output.** Same model + same context ⇒ byte-identical HTML. The renderers are pure functions: no AI, no network, no clock.
- **26 gates, each with a negative control.** Fact fidelity (HTML and Markdown), source coverage, capture↔model integrity, no image upscaling, link coverage/ownership, label language, quotes, affordance, composition, page frame, taste geometry, and a screenshot⇄HTML hash manifest that refuses to pass when a PNG no longer matches the page it claims to show.
- **A capture pipeline built on real sites.** `tools/capture/` drives a local `chrome-headless-shell` through `playwright-core` to record DOM, accessibility tree, JSON-LD, screenshots and per-element geometry, honouring robots decisions, host pacing, artifact caps, and recording every failure in `corpus/failures.json`.
- **Evidence you can look at.** 41 curated models across 19 sites, their renders, and a side-by-side “original | render” gallery (`node m1/eval/side-by-side.mjs`).

## How it works

```
model.json ──► m1/model-lib.mjs ──► m1/axis.mjs ──┬─► m1/render.mjs      → HTML
 (business      (model semantics:    (the only       ├─► m1/render-text.mjs → plain text
  intent)        roles, paths,        decision      └─► m1/render-md.mjs   → Markdown
                 expressions)        layer)
```

`m1/axis.mjs` owns every shared decision — form selection, comparison, header/label resolution, node render plan, control visibility. The renderers only turn those decisions into their own notation (`<table>` · aligned text · `| table |`). The point of the design is testable: adding the Markdown target required presentation only, and the remaining re-derivations are recorded rather than hidden (`docs/three-targets.md`).

## Repository layout

```
m1/                 the engine
  axis.mjs          shared decision layer (imported by all three renderers)
  model-lib.mjs     model semantics: roles, paths, expression parsing
  render.mjs        HTML target
  render-text.mjs   plain-text target
  render-md.mjs     Markdown target
  validate.mjs      closed-grammar validator (unknown key = error)
  composites.json   named composite primitives and their typed slots
  curated/          curated models, renders, assets, curation logs
  eval/             pipeline, metrics, 26 gates and their self-tests, gallery
  extract/          model drafts derived from captured pages
tools/capture/      headless capture pipeline (corpus producer)
corpus/             captured pages + durable evidence (page captures are regenerable)
docs/               product commitment, design basis, grammar/composition/layout specs
.scratch/           per-round working records and review reports
```

## Development

```sh
node m1/eval/pipeline.mjs                      # render + fidelity + validation + all gates (~1 min)
node m1/eval/pipeline.mjs --shots              # additionally re-shoot PNGs and rebuild the gallery (~3 min)
node m1/eval/pipeline.mjs --check-shots        # assert PNGs still match the current HTML (no re-render)
node m1/validate.mjs m1/curated/*/*.json       # validate models only
node m1/eval/side-by-side.mjs [site/page ...]  # “original | render” comparison images
node m1/eval/three-target-preview.mjs          # regenerate docs/three-targets.md from real output
```

Anything that needs a browser (`--shots`, `side-by-side`, the visual audit) uses a browser already on disk; point it explicitly with:

```sh
AUTOFE_CHROME_PATH=/path/to/chrome-headless-shell \
AUTOFE_PLAYWRIGHT_CORE=/path/to/playwright-core node m1/eval/pipeline.mjs --shots
```

A gate that cannot fail is not a gate: every check in `m1/eval/` ships with a self-test that feeds it a known-bad sample, and those self-tests run inside the pipeline.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The project is currently a closed, single-author research codebase — the grammar is versioned and changes are recorded before they are coded.

## Roadmap

**Implemented**

- Closed grammar, validator, and three isomorphic render targets sharing one decision layer.
- Page composition derivation (seven page frames, feed+rail, centered reading column, mosaic) and the intent gate that fails when a declared composition is not delivered at runtime.
- Composite primitives: `search`, `table`, `login`, `paginator`, `form` with schema-checked slots.
- Corpus capture pipeline with robots, pacing and failure accounting; 41 curated models across 19 sites.
- Design language: Chinese-aware type scale, band rhythm, brand accent tokens measured from captured chrome, media role sizing, no-upscale rule.
- Evidence gates, gallery and side-by-side delivery artifacts.

**Planned**

- Dashboard / data-viz primitives — the corpus has a dashboard page but the grammar has no chart, series or unit-bearing value primitive.
- Prototype-specific frames for `search`, `table` and `profile`, which today only have the generic frame.
- `_region` as a semantic declaration, replacing the two-zone layout that is currently inferred from structure.
- Capture fidelity: image `src`/`alt` on captured nodes, collapsed panels captured element-by-element, the 1000-character node-text cap.
- M5 brand layer: currency glyphs, type scale and radius tokens.

The direction is that a backend should never have to describe pixels: as the primitive vocabulary grows, more of a real page becomes declarable intent, and the engine keeps the freedom to render the same meaning for another device, brand or language.

> Status honesty: the current head is a work-in-progress round-62 visual-repair checkpoint. Gates and reports from earlier revisions are snapshots — rerun the pipeline rather than trusting a number quoted in a document. Known gaps are listed in `docs/m1/composition.md` §8 and `m1/failures.md`.

## License

[GNU Affero General Public License v3.0](LICENSE.md) © ZisIsNotZis.
