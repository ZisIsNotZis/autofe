// On-disk browser + playwright-core wiring. Nothing is downloaded or installed:
// both come from fixed local paths (overridable via env for other machines).

import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export const DEFAULT_PLAYWRIGHT_CORE =
  '/home/z/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core';

export const DEFAULT_CHROME_PATH = `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell`;

export const PRODUCT_TOKEN = 'AutoFE-Research-Bot';
export const USER_AGENT = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 ${PRODUCT_TOKEN}/0.1`;

export function resolveChromePath() {
  const chromePath = process.env.AUTOFE_CHROME_PATH || DEFAULT_CHROME_PATH;
  if (!fs.existsSync(chromePath)) {
    throw new Error(
      `headless browser not found at ${chromePath}. Set AUTOFE_CHROME_PATH or install a browser; this tool never downloads one.`,
    );
  }
  return chromePath;
}

export function loadPlaywright() {
  const modulePath = process.env.AUTOFE_PLAYWRIGHT_CORE || DEFAULT_PLAYWRIGHT_CORE;
  try {
    return require(modulePath);
  } catch (error) {
    throw new Error(`cannot load playwright-core from ${modulePath}: ${error.message}`);
  }
}

export async function launchBrowser({ log = () => {} } = {}) {
  const { chromium } = loadPlaywright();
  const executablePath = resolveChromePath();
  log(`browser: ${executablePath}`);
  return chromium.launch({ executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-lcd-text', '--disable-font-subpixel-positioning', '--force-color-profile=srgb'] });
}

export async function newCaptureContext(browser, options) {
  return browser.newContext({
    viewport: options.viewport,
    deviceScaleFactor: 1,
    userAgent: USER_AGENT,
    locale: options.locale,
    timezoneId: options.timezoneId,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    ignoreHTTPSErrors: false,
  });
}

export const DEFAULT_OPTIONS = {
  viewport: { width: 1440, height: 900 },
  locale: 'zh-CN',
  timezoneId: 'Asia/Shanghai',
  navTimeoutMs: 45000,
  navRetries: 2,
  networkIdleTimeoutMs: 8000,
  settleMs: 1200,
  minDelayMs: 1500,
  maxCrawlDelayMs: 30000,
  minVisibleNodes: 10,
  minBodyTextLength: 20,
};
