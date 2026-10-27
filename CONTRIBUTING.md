# Contributing

## Scope

AutoFE is a closed, single-author research codebase (see `docs/product.md` §1: the product is a
curated gallery for one user, and publication is a separate authorisation). The engine, the
grammar and the curated corpus are therefore not open to external pull requests.

Two kinds of input are welcome:

- **Issue reports** that reproduce a defect: the model path, the command, the output you got and the
  output you expected. A gate that should have caught it is worth mentioning.
- **Grammar/design objections** with a counter-example page: the grammar is closed, so anything it
  cannot express is a real finding and gets recorded in `m1/failures.md` before any code changes.

## Before you change anything

The grammar changes only through the documented path: record the expression failure in
`m1/failures.md`, get a decision, then code. Do not invent a reserved key, a vocabulary entry or a
per-site escape hatch while writing a model — "the model is wrong, not the engine" is a claim that
needs a failing example.

## Running the checks

```sh
node m1/validate.mjs m1/curated/*/*.json    # closed-grammar validation
node m1/eval/pipeline.mjs                   # render all curated models + 26 gates (~1 min)
node m1/eval/pipeline.mjs --shots           # also re-shoot PNGs and rebuild the gallery (~3 min)
```

Exit code 0 means every gate passed. A change is not done because the pipeline is green — the gates
are a necessary condition, not a sufficient one (`docs/product.md` §2). Visual changes are reviewed
against the original page, side by side:

```sh
node m1/eval/side-by-side.mjs <site>/<page>
```

If you touch a gate, add or update its self-test under `m1/eval/*-selftest.mjs` so the gate is
demonstrated to fail on a known-bad sample. Gates without a failing example are not accepted.

## Pull requests

- Keep the diff scoped: one change per commit, Conventional Commit messages (`fix:`, `docs:`,
  `chore:`), no drive-by reformatting.
- State the evidence: the command you ran and its exit code, plus the report file you wrote under
  `.scratch/<round>/` when the work spans more than one step.
- Screenshots, renders and corpus captures are generated output; regenerate them with the commands
  above instead of hand-editing them.
- Never commit a number you did not measure, and never quote an old report's numbers as the current
  state.
