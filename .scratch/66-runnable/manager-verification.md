# WP2.5 verification (manager, after the worker's empty-env run)

The worker implemented the shared browser resolver and updated the quick starts. Its first proof
run was taken while the M2 dashboard HTML was newer than its screenshot, so that run exited 1 on the
evidence gate (not on a browser path); its final run after the re-shot exits 0. One earlier
`taste-selftest` run hit an image-timing flake (apple-com/home), now fixed (F-103).

Re-verified by the manager on the final tree:

| command | env | result |
|---|---|---|
| `node m1/eval/pipeline.mjs --shots` | `AUTOFE_CHROME_PATH` and `AUTOFE_PLAYWRIGHT_CORE` unset | **exit 0** — 40/40 render, HTML+MD fidelity 1.00, all gates, 40/40 visual audit, evidence manifest verified |
| `node m1/eval/taste-selftest.mjs` | unset | pass, 271 assertions (after F-103's image-settle wait) |
| `node m1/eval/taste-selftest.mjs` | both set to the local paths | pass, 271 assertions |
| `node tools/capture/index.mjs --dry-run` | unset | exit 0; robots decisions written; no path error |

The resolver is `m1/eval/browser.mjs`: `playwright-core` from `AUTOFE_PLAYWRIGHT_CORE` or
`tools/capture/node_modules/playwright-core` (resolved from the module, not cwd); the browser from
`AUTOFE_CHROME_PATH` only when the operator pins it, otherwise Playwright resolves its own installed
headless shell. No eval/capture file carries the old `/home/z/.local/...` or `chromium_headless_shell-1234`
fallback.

The re-shot dashboard PNG and the manifest are in the M2 release commit.
