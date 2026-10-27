# WP2.5 — Runnable release

Status: done. Every browser-backed tool resolves its toolchain from the repo; a fresh clone with
`npm --prefix tools/capture install` plus one Playwright browser install runs the full gate with no
`AUTOFE_*` variable. Proof commands and exit codes below were run in this worktree on 2026-10-27.

## What changed

| File | Change |
|---|---|
| `m1/eval/browser.mjs` | **new** — the one resolver (`loadPlaywright`, `resolveChromePath`, `chromeLaunchOptions`, `launchBrowser`, `PLAYWRIGHT_CORE_PATH`, install-command constants) |
| `m1/eval/pipeline.mjs` | hardcoded `PW`/`CHROME` → `launchBrowser()` (shots step) |
| `m1/eval/audit.mjs` | `renderAudit()` uses `launchBrowser()` |
| `m1/eval/audit-visual.mjs` | uses `launchBrowser()` |
| `m1/eval/side-by-side.mjs` | uses `launchBrowser()` |
| `m1/eval/taste-selftest.mjs` | uses `launchBrowser()`; dropped `CHROMIUM required` path assert |
| `m1/eval/page-frame-selftest.mjs` | same |
| `m1/eval/no-upscale-selftest.mjs` | `launchBrowser()` in a try; cascade-only fallback kept, browser closed in `finally` |
| `m1/eval/intent-audit.mjs` | `launchBrowser()` inside the existing try; exit 2 on failure kept |
| `m1/eval/intent-audit-selftest.mjs` | same |
| `m1/eval/media-role-measure.mjs` | `launchBrowser()`; existing SKIP-and-exit-0 fallback kept, message now the resolver's actionable one |
| `m1/eval/diagnosed-repair-selftest.mjs` | `launchBrowser()` |
| `tools/capture/lib/browser.mjs` | dev paths removed; imports the shared resolver; capture launch flags kept; `fetchTextViaBrowser`, `newCaptureContext`, `USER_AGENT`, `DEFAULT_OPTIONS` untouched |
| `tools/shoot-render.mjs` | same class of hardcoded path (not in the brief, found by the sweep) → `launchBrowser()` |
| `tools/capture/README.md`, `tools/capture/package.json` | "install nothing" claim replaced by the two install commands |
| `README.md`, `README.zh-CN.md` | quick start split into zero-install / full-gate tracks; browser paragraph updated (both written, in sync) |
| `CONTRIBUTING.md` | "Running the checks" block: zero-install checks, then the two install commands, then the pipeline |

Not touched: the M2 dashboard change, renderers, models, `m1/curated/**`, `docs/9_IMPLEMENTATION.md`,
`docs/0_ROADMAP.md`.

`tools/capture/index.mjs` had no path logic of its own (it only calls `launchBrowser`), so it needed
no change.

## Resolver rules (`m1/eval/browser.mjs`)

1. **playwright-core** — `AUTOFE_PLAYWRIGHT_CORE` if set; otherwise
   `<repo>/tools/capture/node_modules/playwright-core`, computed from the resolver file's own
   location (`import.meta.url`), so it does not depend on cwd. A load failure is one message naming
   `npm --prefix tools/capture install`.
2. **Chromium** — `AUTOFE_CHROME_PATH` is passed as `executablePath` only when set. There is **no
   default executablePath**: Playwright resolves the browser it installed (`chromium.launch({
   args: ['--no-sandbox'] })` works with only `chromium_headless_shell-1248` on disk).
3. **Failure** — a launch failure is re-thrown as one line:
   `cannot launch Chromium (<detail>); install it with \`node tools/capture/node_modules/playwright-core/cli.js install chromium-headless-shell\` or set AUTOFE_CHROME_PATH to an existing browser`.
4. `resolveChromePath()` never throws: env value, else the installed path if it exists, else `null`
   (for logging/diagnostics only).
5. `chromeLaunchOptions(options)` prepends `--no-sandbox` (deduped), adds `executablePath` only from
   env, and lets caller options win.

## Empty-env proof

`env -u AUTOFE_CHROME_PATH -u AUTOFE_PLAYWRIGHT_CORE <command>`; full transcript in
`.scratch/66-runnable/proofs.txt`.

| Command | Exit |
|---|---|
| `node m1/eval/pipeline.mjs` | **0** |
| `node tools/capture/index.mjs --dry-run` | **0** |
| `node m1/eval/taste-selftest.mjs` | 0 |
| `node m1/eval/no-upscale-selftest.mjs` | 0 (measured in Chromium, not cascade-only) |
| `node m1/eval/page-frame-selftest.mjs` | 0 |
| `node m1/eval/intent-audit-selftest.mjs` | 0 |
| `node m1/eval/shots-selftest.mjs` | 0 |
| `node m1/eval/imgattr-selftest.mjs` | 0 |
| `node m1/eval/media-role-measure.mjs` | 0 (`upscale violations: 0`) |
| `node m1/eval/audit-visual.mjs --all` | 0 (40/40 clean) |
| `node m1/eval/side-by-side.mjs --index-only` | 0 (40 pages, index rebuilt in gitignored `sbs/`) |
| `node m1/eval/audit.mjs m1/curated/gov-uk/ni-rates-letters.json m1/curated/renders/gov-uk-ni-rates-letters.html /tmp/audit.json` | 0 |
| `tools/capture/lib/browser.mjs` `launchBrowser()` smoke | 0 (`156.0.8078.4`) |
| `node tools/shoot-render.mjs m1/curated/renders/linear-app-home.html /tmp/autofe-shoot.png` | 0 |

The first pipeline run of the session exited **1** on exactly one stale evidence page
(`grafana-play/play-home — html changed since shots`): the M2 dashboard HTML in the tree did not
match the manifest at that moment while the M2 re-shot was still settling in the working tree. The
next run (and `--check-shots` between them) reported `通过（40 页与截图同源, 画廊 v=mvqrsrn6）` and
exit 0. Nothing in this WP writes shots or evidence; the manager owns the re-shot and has since
re-verified `pipeline.mjs --shots` at exit 0 with an empty environment
(`.scratch/66-runnable/manager-verification.md`).

## Error-path proof

Transcript: `.scratch/66-runnable/error-paths.txt`. Each case prints a single actionable line, no
stack trace:

- `AUTOFE_PLAYWRIGHT_CORE=/nope` →
  `cannot load playwright-core from /nope (Cannot find module '/nope'); install it with \`npm --prefix tools/capture install\` or set AUTOFE_PLAYWRIGHT_CORE to a playwright-core directory`
- `AUTOFE_CHROME_PATH=/nope` →
  `cannot launch Chromium (browserType.launch: Failed to launch chromium because executable doesn't exist at /nope); install it with \`node tools/capture/node_modules/playwright-core/cli.js install chromium-headless-shell\` or set AUTOFE_CHROME_PATH to an existing browser`
- no browser installed (`PLAYWRIGHT_BROWSERS_PATH` at an empty dir) → the same launch message naming
  the missing headless-shell and the install command.

## Residual gaps

- `docs/m1/composition.md:122` still says the no-upscale proof "needs `AUTOFE_CHROME_PATH`/
  `AUTOFE_PLAYWRIGHT_CORE`". No longer true; that file belongs to the M2 change, so it was not
  edited here.
- `docs/3_REQUIREMENT.md:35` and `docs/9_IMPLEMENTATION.md:30` still describe the env variables as
  the way to point at the toolchain. Still valid as overrides, but no longer required; `docs/9` is
  out of scope for this WP.
- `.scratch/**` and `.tmp/**` contain frozen snapshots with the old dev paths (round-62
  `pipeline-snapshot`, old probes). They are historical records, not live tooling.
- `m1/eval/taste-selftest.mjs` failed once with `apple-com/home: waterfall of 6 has no orphan column
  (3 columns [1,2,3])` in a batch run directly after the pipeline. The cause was image timing (the
  rendered pages hotlink CDN images with no dimensions, and the probe measured before they settled),
  not the browser source; the fix (F-103, an image-settle wait in `load()`) was made in the parallel
  dashboard change and is in the tree. Every run after it passed (271 assertions).
- The dry run refreshes gitignored `corpus/robots-dry-run.json`; it is not part of the diff.
