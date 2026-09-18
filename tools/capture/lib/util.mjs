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
