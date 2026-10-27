// The one home for "where do playwright-core and Chromium come from".
//
// Every browser-backed tool (m1/eval/*.mjs, tools/capture/lib/browser.mjs) imports this file
// instead of carrying a machine-specific path. A fresh clone needs exactly two steps, both
// recorded in README.md / CONTRIBUTING.md:
//
//   npm --prefix tools/capture install
//   node tools/capture/node_modules/playwright-core/cli.js install chromium-headless-shell
//
// Resolution rules, in order:
//   playwright-core : AUTOFE_PLAYWRIGHT_CORE, else tools/capture/node_modules/playwright-core
//                     (resolved from this file, never from cwd).
//   Chromium        : AUTOFE_CHROME_PATH (passed as executablePath), else nothing — Playwright
//                     resolves the browser it installed itself (headless shell or full Chromium).
//                     No default executablePath: a hardcoded one is what broke a fresh clone.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.resolve(HERE, '..', '..');

export const PLAYWRIGHT_CORE_PATH = path.join(REPO_ROOT, 'tools', 'capture', 'node_modules', 'playwright-core');

export const PLAYWRIGHT_INSTALL_COMMAND = 'npm --prefix tools/capture install';

export const CHROMIUM_INSTALL_COMMAND =
  'node tools/capture/node_modules/playwright-core/cli.js install chromium-headless-shell';

const require = createRequire(import.meta.url);

// playwright-core itself. Throws one actionable error, never a bare MODULE_NOT_FOUND.
export function loadPlaywright() {
  const modulePath = process.env.AUTOFE_PLAYWRIGHT_CORE || PLAYWRIGHT_CORE_PATH;
  try {
    return require(modulePath);
  } catch (error) {
    const detail = String((error && error.message) || error).split('\n')[0];
    throw new Error(
      `cannot load playwright-core from ${modulePath} (${detail}); install it with \`${PLAYWRIGHT_INSTALL_COMMAND}\` or set AUTOFE_PLAYWRIGHT_CORE to a playwright-core directory`,
    );
  }
}

// A browser path for logging/diagnostics only. Returns null when nothing is pinned and
// Playwright has no installed browser — it never throws; launchBrowser reports the real problem.
export function resolveChromePath() {
  if (process.env.AUTOFE_CHROME_PATH) return process.env.AUTOFE_CHROME_PATH;
  try {
    const installed = loadPlaywright().chromium.executablePath();
    // chromium.executablePath() names the full Chromium build even when only the headless shell
    // is installed, so report it only when it is really there.
    return installed && fs.existsSync(installed) ? installed : null;
  } catch {
    return null;
  }
}

// Launch options for Chromium: always --no-sandbox, and executablePath only when the operator
// pinned one. Everything else the caller passes wins.
export function chromeLaunchOptions(options = {}) {
  const { args = [], ...rest } = options;
  const merged = ['--no-sandbox', ...args.filter((arg) => arg !== '--no-sandbox')];
  return {
    ...(process.env.AUTOFE_CHROME_PATH ? { executablePath: process.env.AUTOFE_CHROME_PATH } : {}),
    ...rest,
    args: merged,
  };
}

// Launch Chromium with the rules above. A failure is re-thrown as one actionable message: the
// common cause on a fresh clone is "no browser installed yet", and the fix is the install command
// (or AUTOFE_CHROME_PATH for a browser that already exists).
export async function launchBrowser(options = {}) {
  const { chromium } = loadPlaywright();
  try {
    return await chromium.launch(chromeLaunchOptions(options));
  } catch (error) {
    const detail = String((error && error.message) || error).split('\n')[0];
    throw new Error(
      `cannot launch Chromium (${detail}); install it with \`${CHROMIUM_INSTALL_COMMAND}\` or set AUTOFE_CHROME_PATH to an existing browser`,
    );
  }
}
