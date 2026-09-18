// Small shared helpers for the M0 capture pipeline.

import fs from 'node:fs';
import path from 'node:path';

export function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

// Compact serialization for the two large machine-read artifacts (nodes.json, a11y.json):
// pretty-printing roughly doubles their size for arrays of small records, and nothing reads them
// by eye. meta.json, run-report.json and the evidence files stay pretty-printed.
export function writeJsonCompact(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value)}\n`, 'utf8');
}

export function writeText(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, 'utf8');
}

export function slugify(value) {
  const slug = String(value)
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return slug || 'page';
}

export function hostOf(url) {
  return new URL(url).host;
}

export function originOf(url) {
  return new URL(url).origin;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Bounds an operation that has no timeout of its own (in-page evaluation, CDP sends, ...).
// Without this a page whose main thread never yields can hang a run indefinitely.
export function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  // Also attach a no-op handler so a late rejection cannot surface as an unhandled rejection.
  if (promise && typeof promise.catch === 'function') promise.catch(() => {});
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function firstLine(text) {
  return String(text).split('\n')[0].trim();
}

export function nowIso() {
  return new Date().toISOString();
}

export function fileSize(file) {
  try {
    return fs.statSync(file).size;
  } catch {
    return null;
  }
}
