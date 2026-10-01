// AutoFE 流水线（编排资产）：渲染全部策展模型 → 事实保真 → 源码覆盖 → 视觉自查（可选截图+画廊）
// 三个渲染目标都跑：HTML（render.mjs）/ 纯文本（render-text.mjs）/ Markdown（render-md.mjs）。
// 用法:
//   node m1/eval/pipeline.mjs            仅渲染 + 度量 + 审计（快，约 1 分钟）
//   node m1/eval/pipeline.mjs --shots    追加全页截图 + 画廊重建 + 证据清单（需要 playwright，约 3 分钟）
//   node m1/eval/pipeline.mjs --check-shots  仅断言截图（PNG）与当前 HTML 同源，不重渲染（快）
//   node m1/eval/pipeline.mjs --only airbnb-com/room-28871,bilibili-com/home
// 退出码: 0 = 全部通过（三目标保真 1.00 且视觉自查无硬缺陷且七道门禁全过且截图与 HTML 同源）; 1 = 有失败项
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const wantShots = args.includes('--shots');
const wantCheck = args.includes('--check-shots');
const onlyArg = args.find((a) => a.startsWith('--only'));
const only = onlyArg ? (onlyArg.includes('=') ? onlyArg.split('=')[1] : args[args.indexOf(onlyArg) + 1]).split(',').map((s) => s.trim()).filter(Boolean) : null;

const require = createRequire(import.meta.url);
const PW = process.env.HOME + '/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core';
const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';

const scale = JSON.parse(fs.readFileSync('m1/eval/m3-scale.json', 'utf8')).filter((x) => x.tier === 'exemplar');
const rows = only ? scale.filter((s) => only.includes(s.k)) : scale;

// ---- 0. evidence consistency (PNG ⇄ HTML) ----------------------------------
// Reviewers (round 31, all four independently) found the committed `renders/*.png` OLDER
// than the `.html` beside them: the gallery/screenshots still showed round-30's default blue
// underline while the HTML/CSS had the fix. `--shots` writes a manifest binding every page's
// HTML content hash to the PNG generated from it; `--check-shots` (and every default run)
// refuses to pass when the HTML has moved on without a re-shoot. This is the gate that makes
// "code fixed but screenshot stale" impossible to ship silently.
//
// The verdict is HASH-FIRST (round 33). Two failure criteria and nothing else:
//   1. sha256(current HTML) != manifest html.sha256  -> 'html changed since shots'
//   2. sha256(current PNG)  != manifest png.sha256   -> 'png changed since shots'
// File mtime is NOT a failure reason: restoring the byte-identical file (`cat`-ing the same
// content, or any tool that rewrites it) used to trip 'png older than html' even though every
// byte still matched the manifest. mtime is now printed as a hint banner ("HTML 比 PNG 新 N 秒")
// because a stale-looking mtime is still worth a human look — but it never fails the gate.
//
// Manifest path: `m1/curated/renders/manifest.json` (beside the renders it describes).
// NOTE for other tools: `m1/curated/renders/**` is generation output, not a curated model.
// The validator gate below therefore walks curated models with
// `find m1/curated -maxdepth 2 -name '*.json' -not -path '*/renders/*'` — adding new JSON
// under `m1/curated/renders/` stays out of model validation, but any model JSON placed
// directly in `m1/curated/<site>/` IS picked up.
const RENDERS = 'm1/curated/renders';
const MANIFEST = `${RENDERS}/manifest.json`;
const sha256 = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const fileInfo = (p) => ({ sha256: sha256(p), bytes: fs.statSync(p).size, mtimeMs: Math.round(fs.statSync(p).mtimeMs) });
function writeShotsManifest(version) {
  const pages = {};
  for (const r of rows) {
    const dash = r.k.replace(/\//g, '-');
    const html = `${RENDERS}/${dash}.html`, png = `${RENDERS}/${dash}.png`;
    if (!fs.existsSync(html) || !fs.existsSync(png)) continue;
    pages[dash] = { key: r.k, html: fileInfo(html), png: fileInfo(png) };
  }
  const gallery = fs.existsSync(`${RENDERS}/index.html`) ? { version, ...fileInfo(`${RENDERS}/index.html`) } : { version };
  const man = { version, generatedAt: new Date().toISOString(), pages, gallery };
  fs.writeFileSync(MANIFEST, JSON.stringify(man, null, 1));
  return man;
}
function checkShots() {
  if (!fs.existsSync(MANIFEST)) return { ok: false, stale: rows.map((r) => ({ k: r.k, why: 'no manifest (run --shots)' })), hints: [], version: null };
  const man = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const stale = [], hints = [];
  for (const r of rows) {
    const dash = r.k.replace(/\//g, '-');
    const html = `${RENDERS}/${dash}.html`, png = `${RENDERS}/${dash}.png`;
    const e = man.pages?.[dash];
    if (!e) { stale.push({ k: r.k, why: 'no manifest entry' }); continue; }
    if (!fs.existsSync(html)) { stale.push({ k: r.k, why: 'html missing' }); continue; }
    if (sha256(html) !== e.html?.sha256) { stale.push({ k: r.k, why: 'html changed since shots' }); continue; }
    if (!fs.existsSync(png)) { stale.push({ k: r.k, why: 'png missing' }); continue; }
    if (e.png?.sha256 && sha256(png) !== e.png.sha256) { stale.push({ k: r.k, why: 'png changed since shots' }); continue; }
    const ageSec = Math.round((fs.statSync(html).mtimeMs - fs.statSync(png).mtimeMs) / 1000);
    if (ageSec > 0) hints.push({ k: r.k, why: `HTML 比 PNG 新 ${ageSec} 秒（两向哈希都与清单一致，仅提示）` });
  }
  return { ok: stale.length === 0, stale, hints, version: man.version, generatedAt: man.generatedAt };
}
// mtime hints are advisory: they are printed so a human can spot a suspicious write order,
// but they are never part of `ok`.
function printShotsHints(res) {
  const hints = res.hints ?? [];
  for (const h of hints.slice(0, 5)) console.log(`   · 提示（不判失败）: ${h.k} — ${h.why}`);
  if (hints.length > 5) console.log(`   · 另 ${hints.length - 5} 页 HTML 比 PNG 新（仅提示，不判失败）`);
}
// `--check-shots` is the fast, self-contained form: it never re-renders (so a hand-edited
// HTML is not silently overwritten before it is judged) and exits with the verdict.
if (wantCheck && !wantShots) {
  const res = checkShots();
  if (res.ok) console.log(`[pipeline] 证据一致性（PNG ⇄ HTML）: 通过（${rows.length} 页, 画廊 v=${res.version}）`);
  else {
    console.log(`[pipeline] 证据一致性（PNG ⇄ HTML）: 失败 ${res.stale.length}/${rows.length} 页（HTML/PNG 与清单哈希不一致）`);
    for (const s of res.stale) console.log(`   ✗ ${s.k} — ${s.why}`);
  }
  printShotsHints(res);
  process.exit(res.ok ? 0 : 1);
}

// ---- 1. render + metrics + coverage (three targets) ------------------------
fs.mkdirSync('.tmp/md-renders', { recursive: true });
const out = [];
for (const r of rows) {
  const k = r.k, dash = k.replace(/\//g, '-');
  const cm = `m1/curated/${k}.json`, cr = `m1/curated/renders/${dash}.html`;
  if (!fs.existsSync(cm)) { out.push({ k, error: 'no curated model' }); continue; }
  try {
    execSync(`node m1/render.mjs ${cm} ${cr}`, { timeout: 60000 });
    const m = JSON.parse(execSync(`node m1/eval/metrics.mjs ${cm} ${cr} corpus/${k}`, { timeout: 60000 }).toString());
    const c = JSON.parse(execSync(`node m1/eval/source-coverage.mjs ${cr} corpus/${k} ${cm}`, { timeout: 60000 }).toString());
    // third target: Markdown. Same model, same evaluator — only the presentation differs.
    const mr = `.tmp/md-renders/${dash}.md`;
    execSync(`node m1/render-md.mjs ${cm} ${mr}`, { timeout: 60000 });
    const mm = JSON.parse(execSync(`node m1/eval/metrics.mjs ${cm} ${mr}`, { timeout: 60000 }).toString());
    out.push({ k, autoHigh: r.high, fid: m.factFidelity, facts: `${m.factsRendered}/${m.factsTotal}`, mdFid: mm.factFidelity, mdMissing: (mm.missing || []).slice(0, 5), high: c.high, med: c.medium, missing: (m.missing || []).slice(0, 5) });
  } catch (e) { out.push({ k, error: String(e.message).slice(0, 120) }); }
}
if (!only) fs.writeFileSync('m1/eval/m3-final.json', JSON.stringify(out, null, 1));

const ok = out.filter((o) => !o.error);
const under = ok.filter((o) => o.fid !== 1);
console.log(`[pipeline] 渲染 ${ok.length}/${rows.length} | 错误 ${out.filter((o) => o.error).length}`);
console.log(`[pipeline] 保真 1.00: ${ok.filter((o) => o.fid === 1).length}/${ok.length}${under.length ? ' | <1: ' + under.map((o) => o.k + ' ' + o.fid).join(', ') : ''}`);
if (under.length) for (const u of under) console.log('   missing:', u.k, JSON.stringify(u.missing));

// third target (Markdown) fidelity — measured with the SAME evaluator, never a bespoke one
const mdOk = ok.filter((o) => o.mdFid !== undefined);
const mdUnder = mdOk.filter((o) => o.mdFid !== 1);
console.log(`[pipeline] Markdown 目标: 渲染 ${mdOk.length}/${rows.length} | 保真 1.00: ${mdOk.filter((o) => o.mdFid === 1).length}/${mdOk.length}${mdUnder.length ? ' | <1: ' + mdUnder.map((o) => o.k + ' ' + o.mdFid).join(', ') : ''}`);
if (mdUnder.length) for (const u of mdUnder) console.log('   md missing:', u.k, JSON.stringify(u.mdMissing));

// ---- 1.5 gates: the validator must really refuse, and the M4-a foundations ----
// A gate that can never fail is not a gate (F-040): these three run every time.
const gate = (cmd) => {
  try { return { ok: true, out: execSync(cmd, { timeout: 300000 }).toString().trim() }; }
  catch (e) { return { ok: false, out: ((e.stdout ?? '').toString() + (e.stderr ?? '').toString()).trim() }; }
};
const gValid = gate(`node m1/validate.mjs $(find m1/curated -maxdepth 2 -name '*.json' -not -path '*/renders/*') m1/models/*/*.json`);
const nOk = gValid.out.split('\n').filter((l) => l.startsWith('ok ')).length;
console.log(`[pipeline] 模型校验: ${gValid.ok ? `${nOk} 个全通过` : '失败'}`);
if (!gValid.ok) console.log(gValid.out.split('\n').filter((l) => !l.startsWith('ok ')).join('\n'));
const gVST = gate('node m1/eval/validate-selftest.mjs');
console.log(`[pipeline] 校验器自测: ${gVST.ok ? '通过' : '失败'}`);
if (!gVST.ok) console.log(gVST.out);
const gFS = gate('node m1/eval/foundation-selftest.mjs');
console.log(`[pipeline] 地基自测(D1/D2/D3): ${gFS.ok ? '通过' : '失败'}`);
for (const l of gFS.out.split('\n')) if (l.startsWith('  ·') || l.includes('显式降级') || l.includes('地基自测')) console.log(`[pipeline] ${l.trim()}`);
if (!gFS.ok) console.log(gFS.out);
const gMS = gate('node m1/eval/metrics-selftest.mjs');
console.log(`[pipeline] 度量自测(F-052): ${gMS.ok ? '通过' : '失败'}`);
if (!gMS.ok) console.log(gMS.out);
// 5th gate: the second render target. Same blueprint, plain-text output — the axis
// semantics (F-031) must survive a non-HTML target, and the text render must not lose facts.
const gTS = gate('node m1/eval/text-selftest.mjs');
console.log(`[pipeline] 文本目标自测(F-031): ${gTS.ok ? '通过' : '失败'}`);
if (!gTS.ok) console.log(gTS.out);
// 6th gate: the two targets must make the SAME axis decision (F-031). The decision now
// lives once in m1/axis.mjs; this gate fails if a renderer re-derives a copy, or if the
// targets disagree on a compare-set verdict / degradation reason / form for a model.
const gAS = gate('node m1/eval/axis-selftest.mjs');
console.log(`[pipeline] 轴一致性自测(F-031 三目标): ${gAS.ok ? '通过' : '失败'}`);
if (!gAS.ok) console.log(gAS.out);
// 7th gate: the THIRD render target (Markdown, render-md.mjs). It must express the same
// axis semantics with presentation only, and must not lose facts.
const gMD = gate('node m1/eval/md-selftest.mjs');
console.log(`[pipeline] Markdown 目标自测(F-031): ${gMD.ok ? '通过' : '失败'}`);
if (!gMD.ok) console.log(gMD.out);
// 8th gate (round 33): the evidence gate itself must be able to fail AND must not fail on a
// byte-identical restore. Pins both refusal scenarios against the real `--check-shots` code path.
const gSH = gate('node m1/eval/shots-selftest.mjs');
console.log(`[pipeline] 证据门禁自测(哈希优先): ${gSH.ok ? '通过' : '失败'}`);
if (!gSH.ok) console.log(gSH.out);
const gatesFailed = !gValid.ok || !gVST.ok || !gFS.ok || !gMS.ok || !gTS.ok || !gAS.ok || !gMD.ok || !gSH.ok;

// ---- 2. audit (9-class visual self-audit) ----------------------------------
const auditTargets = only ? rows.map((r) => 'm1/curated/renders/' + r.k.replace(/\//g, '-') + '.html').join(' ') : '--all';
const auditTail = execSync('node m1/eval/audit-visual.mjs ' + auditTargets + ' 2>&1 | tail -4', { timeout: 900000 }).toString();
console.log(auditTail.trim());
const hardFails = (auditTail.match(/待修 (\d+)/) || [])[1];

// ---- 3. shots + gallery ----------------------------------------------------
if (wantShots) {
  const { chromium } = require(PW);
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  let n = 0;
  for (const r of rows) {
    const dash = r.k.replace(/\//g, '-');
    const html = 'm1/curated/renders/' + dash + '.html';
    if (!fs.existsSync(html)) continue;
    await p.goto('file://' + path.resolve(html));
    await p.screenshot({ path: 'm1/curated/renders/' + dash + '.png', fullPage: true });
    n++;
  }
  await b.close();
  const V = Date.now().toString(36);
  const scaleAll = JSON.parse(fs.readFileSync('m1/eval/m3-scale.json', 'utf8'));
  const tierOf = Object.fromEntries(scaleAll.map((x) => [x.k, x.tier]));
  const all = JSON.parse(fs.readFileSync('m1/eval/m3-final.json', 'utf8'));
  const cards = all.map((r) => {
    const dash = r.k.replace(/\//g, '-');
    const png = dash + '.png?v=' + V;
    const okShot = fs.existsSync('m1/curated/renders/' + dash + '.png');
    const cov = r.error ? '<em>' + r.error + '</em>' : 'fidelity <b>' + r.fid + '</b> (' + r.facts + ') · coverage high ' + r.high + ' / med ' + r.med;
    return '<figure class="card">' + (okShot ? '<a href="' + png + '"><img src="' + png + '" loading="lazy"></a>' : '<div class=missing>no shot</div>') +
      '<figcaption><span class="k">' + r.k + '</span><span class="tier">' + (tierOf[r.k] || '') + '</span><div class="m">' + cov + '</div></figcaption></figure>';
  }).join('\n');
  const html0 = fs.readFileSync('m1/curated/renders/index.html', 'utf8');
  const gridStart = html0.indexOf('<div class=grid>');
  const head = '<!doctype html><meta charset=utf-8><title>AutoFE M3 curated gallery</title>' +
    html0.slice(html0.indexOf('<style>'), gridStart).replace(/<h1>[^<]*<\/h1>/, '<h1>AutoFE · M3 蓝图渲染画廊（' + all.length + ' 页 · F-031 轴语义 · 版本 ' + V + '）</h1>');
  fs.writeFileSync('m1/curated/renders/index.html', head + '<div class=grid>' + cards + '</div>');
  console.log(`[pipeline] 截图 ${n} 张, 画廊 v=${V}`);
  // The manifest binds the shots to the exact HTML they were taken from. Written after the
  // gallery so `gallery.version` is the version that is now on disk.
  if (!only) {
    writeShotsManifest(V);
    console.log(`[pipeline] 证据清单 renders/manifest.json 已写（${n} 页, v=${V}）`);
  }
}

// ---- 4. evidence consistency: every default run checks PNG ⇄ HTML -----------
// An updated HTML that has not been re-shot must fail the pipeline here, not silently ship
// a stale gallery. `--shots` has just regenerated both, so it passes; a plain run after a
// renderer change fails until the screenshots are rebuilt.
let evidenceStale = false;
if (!only) {
  const res = checkShots();
  if (res.ok) console.log(`[pipeline] 证据一致性（PNG ⇄ HTML）: 通过（${rows.length} 页与截图同源, 画廊 v=${res.version}）`);
  else {
    evidenceStale = true;
    console.log(`[pipeline] 证据一致性（PNG ⇄ HTML）: 失败 ${res.stale.length}/${rows.length} 页（HTML/PNG 与清单哈希不一致）`);
    for (const s of res.stale.slice(0, 10)) console.log(`   ✗ ${s.k} — ${s.why}`);
    if (res.stale.length > 10) console.log(`   … 另 ${res.stale.length - 10} 页`);
  }
  printShotsHints(res);
}

const failed = gatesFailed || under.length > 0 || mdUnder.length > 0 || (hardFails && Number(hardFails) > 0) || out.some((o) => o.error) || evidenceStale;
process.exit(failed ? 1 : 0);
