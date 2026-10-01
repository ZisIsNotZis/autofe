// Evidence-gate self-test (round 33): the PNG ⇄ HTML gate must be HASH-first.
//
// Two regressions are pinned, both against the real `pipeline.mjs --check-shots` code path
// (no logic is re-implemented here — the fixture is a throwaway page tree, and the script is
// run from inside it with execFileSync, so path-relative reads resolve there):
//   1. changing the HTML content MUST fail and name the page ('html changed since shots');
//      same for a changed PNG ('png changed since shots').
//   2. rewriting the HTML with the SAME bytes (e.g. `cat file > file`, a formatter, a
//      checkout) MUST pass — it only moves mtime, and mtime is a hint, never a verdict.
// Usage: node m1/eval/shots-selftest.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const here = path.dirname(new URL(import.meta.url).pathname);
const pipeline = path.join(here, 'pipeline.mjs');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'autofe-shots-selftest-'));
const RENDERS = path.join(root, 'm1/curated/renders');
fs.mkdirSync(RENDERS, { recursive: true });
fs.mkdirSync(path.join(root, 'm1/eval'), { recursive: true });

const KEY = 'demo-com/page', DASH = 'demo-com-page';
fs.writeFileSync(path.join(root, 'm1/eval/m3-scale.json'), JSON.stringify([{ k: KEY, tier: 'exemplar', high: true }]));
const htmlPath = path.join(RENDERS, DASH + '.html'), pngPath = path.join(RENDERS, DASH + '.png');
const HTML = '<!doctype html><title>demo</title><p>hello</p>\n';
const PNG = 'not-a-real-png-but-bytes-are-what-matters';
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
fs.writeFileSync(htmlPath, HTML);
fs.writeFileSync(pngPath, PNG);
fs.writeFileSync(path.join(RENDERS, 'manifest.json'), JSON.stringify({
  version: 'fixture1', generatedAt: new Date().toISOString(),
  pages: { [DASH]: { key: KEY, html: { sha256: sha(HTML), bytes: HTML.length, mtimeMs: 0 }, png: { sha256: sha(PNG), bytes: PNG.length, mtimeMs: 0 } } },
  gallery: { version: 'fixture1' },
}));

// Make the PNG plainly newer than the HTML: the fixture must start from a "clean" write order.
const now = Date.now() / 1000;
fs.utimesSync(htmlPath, now - 60, now - 60);
fs.utimesSync(pngPath, now, now);

const run = () => {
  try { return { code: 0, out: execFileSync('node', [pipeline, '--check-shots'], { cwd: root, encoding: 'utf8' }) }; }
  catch (e) { return { code: e.status ?? 1, out: ((e.stdout ?? '') + (e.stderr ?? '')).toString() }; }
};

let bad = 0;
const check = (name, cond, detail) => {
  if (cond) console.log(`ok   ${name}`);
  else { bad++; console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`); }
};

// 0. baseline: bytes match the manifest, PNG newer than HTML ⇒ pass
let r = run();
check('baseline passes', r.code === 0, `exit=${r.code} ${r.out.trim().slice(0, 200)}`);

// 1. same bytes rewritten (`cat` a fresh copy into place, then bump mtime) ⇒ MUST still pass
const restored = execFileSync('cat', [htmlPath], { encoding: 'utf8' });
fs.writeFileSync(htmlPath, restored);
fs.utimesSync(htmlPath, now + 30, now + 30); // HTML now 30s newer than the PNG, bytes identical
r = run();
check('byte-identical restore passes (no false alarm)', r.code === 0, `exit=${r.code} ${r.out.trim().slice(0, 300)}`);
check('byte-identical restore reports the mtime hint', /提示（不判失败）/.test(r.out) && /HTML 比 PNG 新 \d+ 秒/.test(r.out), r.out.trim().slice(0, 300));

// 2. changed HTML content ⇒ MUST fail, naming the page and the reason
fs.appendFileSync(htmlPath, '<!-- tamper -->\n');
r = run();
check('changed HTML fails', r.code === 1, `exit=${r.code}`);
check('changed HTML names the page + reason', r.out.includes(KEY) && r.out.includes('html changed since shots'), r.out.trim().slice(0, 300));

// 3. HTML put back byte-identical ⇒ pass again (the failure is content, not mtime)
fs.writeFileSync(htmlPath, HTML);
r = run();
check('restored HTML passes again', r.code === 0, `exit=${r.code} ${r.out.trim().slice(0, 300)}`);

// 4. changed PNG content ⇒ MUST fail with the PNG reason
fs.appendFileSync(pngPath, 'x');
r = run();
check('changed PNG fails', r.code === 1, `exit=${r.code}`);
check('changed PNG names the page + reason', r.out.includes(KEY) && r.out.includes('png changed since shots'), r.out.trim().slice(0, 300));

fs.rmSync(root, { recursive: true, force: true });
const total = 8;
console.log(`\n证据门禁自测（哈希优先）: ${total - bad}/${total} 通过${bad ? ` | 待修 ${bad}` : ''}`);
process.exit(bad ? 1 : 0);
