// AutoFE 流水线（编排资产）：渲染全部策展模型 → 事实保真 → 源码覆盖 → 视觉自查（可选截图+画廊）
// 三个渲染目标都跑：HTML（render.mjs）/ 纯文本（render-text.mjs）/ Markdown（render-md.mjs）。
// 用法:
//   node m1/eval/pipeline.mjs            仅渲染 + 度量 + 审计（快，约 1 分钟）
//   node m1/eval/pipeline.mjs --shots    追加全页截图 + 画廊重建 + 证据清单（需要 playwright，约 3 分钟）
//   node m1/eval/pipeline.mjs --check-shots  仅断言截图（PNG）与当前 HTML 同源，不重渲染（快）
//   node m1/eval/pipeline.mjs --only airbnb-com/room-28871,bilibili-com/home
// 退出码: 0 = 全部通过（三目标保真 1.00 且视觉自查无硬缺陷且十五道自测全过且截图与 HTML 同源）; 1 = 有失败项
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
const PW = process.env.AUTOFE_PLAYWRIGHT_CORE || (process.env.HOME + '/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core');
const CHROME = process.env.AUTOFE_CHROME_PATH || (process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell');

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
// warnings never block, but they must be visible in the run summary (F-091.b). The validator
// prints them on stdout as `   warn <path>: <msg> (W_COMPOSITE_*)` lines; the exit-code count
// above only looks at `ok `/`FAIL ` lines, so a warning can never flip the gate here.
const warnLines = gValid.out.split('\n').filter((l) => /\(W_COMPOSITE_/.test(l));
if (warnLines.length) {
  console.log(`[pipeline] 模型校验警告（不阻断）: ${warnLines.length} 条`);
  for (const l of warnLines) console.log(`   ! ${l.trim()}`);
}
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
// 8th gate (round 42): the image-attribution scanner must record closing tags and pop, so an
// image after a closed <a> is never attributed to that (preceding) anchor. F-081.
const gIA = gate('node m1/eval/imgattr-selftest.mjs');
console.log(`[pipeline] 归属工具自测(闭合标签): ${gIA.ok ? '通过' : '失败'}`);
if (!gIA.ok) console.log(gIA.out);
// 9th gate (round 43): capture↔model integrity (F-078). Fidelity certifies MODEL→RENDER;
// this certifies MODEL→CAPTURE, so a curator can no longer write a value the capture
// never carried (the `aliyun-com/product-ecs` 1238/1385 price stayed at 1.00 because
// the render agreed with the model). Every typed fact value must be traceable to
// corpus/<page>/dom.html|nodes.json under the declared normalization; misses must be a
// declared conversion/gap in capture-integrity-allow.json or the gate fails.
const gCI = gate('node m1/eval/capture-integrity.mjs');
console.log(`[pipeline] 采集↔模型一致性(F-078 · 第9道门禁): ${gCI.ok ? '通过' : '失败'}`);
for (const l of gCI.out.split('\n')) if (l.includes('[采集↔模型一致性]')) console.log(`[pipeline] ${l.trim()}`);
if (!gCI.ok) console.log(gCI.out);
// 9th self-test suite: the capture-integrity gate itself must be able to fail (F-040).
const gCIS = gate('node m1/eval/capture-integrity-selftest.mjs');
console.log(`[pipeline] 采集一致性自测(F-078): ${gCIS.ok ? '通过' : '失败'}`);
if (!gCIS.ok) console.log(gCIS.out);
// 10th self-test suite (round 46): images must never be upscaled (F-082). The renderer rule
// it pins existed since round 45 but had no gate in the pipeline; registering it keeps the
// "every rule has a gate" invariant — a regressed `width:100%` now fails the pipeline here.
const gNU = gate('node m1/eval/no-upscale-selftest.mjs');
console.log(`[pipeline] 图片不放大自测(F-082 · 第10道): ${gNU.ok ? '通过' : '失败'}`);
if (!gNU.ok) console.log(gNU.out);
// 11th self-test suite (round 47): the composite registry + validator (docs/m1/composites.md).
// Zero instances this round (S1 is registry+validator only): the gate pins the refusal
// behaviour (unknown type / missing required part / nesting / row inconsistency / path refs)
// against inline fixtures so S2–S6 migrate onto an already-failing gate.
const gCS = gate('node m1/eval/composite-selftest.mjs');
console.log(`[pipeline] 复合元语自测(轮47 · 第11道): ${gCS.ok ? '通过' : '失败'}`);
if (!gCS.ok) console.log(gCS.out);
// 12th self-test suite (round 53): every `_expose` the axis calls a CONTROL must be drawn as a
// control in all three targets. Fidelity counts fact text, so it is blind to a control that
// silently disappears (round 49: `search.query` field→state lost `<input name="query">` while
// fidelity stayed 1.00). The gate audits all 42 exemplar pages and is falsifiable (a stripped
// artifact MUST be reported).
const gCR = gate('node m1/eval/control-render-selftest.mjs');
console.log(`[pipeline] 控件渲染自测(轮53 · 第12道): ${gCR.ok ? '通过' : '失败'}`);
if (!gCR.ok) console.log(gCR.out);
for (const l of gCR.out.split('\n')) if (l.startsWith('控件对照') || l.includes('不一致清单:')) console.log(`[pipeline] ${l.trim()}`);
// 13th self-test suite (round 55): LINK COVERAGE. When the capture made a text a link (a real
// href) and the model carries that text as a fact, the node must carry a target or the
// difference must be declared in writing. Fidelity counts fact text and the capture gate
// counts values, so both were blind to the user's U-01/U-03/U-04 (anchors arriving as dead
// text). The gate audits all 42 exemplar pages and is falsifiable (a dropped target in the
// model MUST be reported; a fabricated link domain MUST be reported).
const gOWN = gate('node m1/eval/link-owner-selftest.mjs');
const gWIT = gate('node m1/eval/link-witness-selftest.mjs');
console.log(`[pipeline] 精确来源/语义所有者自测: ${gOWN.ok && gWIT.ok ? '通过' : '失败'}`);
if (!gOWN.ok) console.log(gOWN.out);
if (!gWIT.ok) console.log(gWIT.out);
const gLC = gate('node m1/eval/link-coverage-selftest.mjs');
console.log(`[pipeline] 链接覆盖自测(轮55 · 第13道): ${gLC.ok ? '通过' : '失败'}`);
if (!gLC.ok) console.log(gLC.out);
for (const l of gLC.out.split('\n')) if (l.startsWith('链接对照') || l.includes('未声明差额清单')) console.log(`[pipeline] ${l.trim()}`);
// 14th self-test suite (round 56): LABEL LANGUAGE. Rendered visible text must never leak
// internal vocabulary (the engine's verbs/enum names, collected from vocab.json). English
// the source itself shows is exempt only with provenance: an occurrence-window match in the
// capture, a written entry in label-language-allow.json, or a capture-integrity-declared
// conversion. U-16/U-17 (English fragments on Chinese pages) shipped because fidelity is
// blind to who authored a string; this gate makes authorship checkable.
const gLL = gate('node m1/eval/label-language-selftest.mjs');
console.log(`[pipeline] 可见英文标签自测(G-2 · 第14道): ${gLL.ok ? '通过' : '失败'}`);
if (!gLL.ok) console.log(gLL.out);
for (const l of gLL.out.split('\n')) if (l.startsWith('[可见英文标签]')) console.log(`[pipeline] ${l.trim()}`);
// 15th self-test suite (round 56): QUOTE EMPHASIS (bidirectional). Capture quote evidence
// (blockquote / whole-paragraph strong, per quote-evidence.mjs) must be carried as `_quote`,
// and every `_quote` must be backed by capture evidence — unless declared in writing in
// quote-allow.json. Fidelity counts text, so it was blind to emphasis being flattened (U-13).
const gQS = gate('node m1/eval/quote-selftest.mjs');
console.log(`[pipeline] 强调保真自测(G-5 · 第15道): ${gQS.ok ? '通过' : '失败'}`);
if (!gQS.ok) console.log(gQS.out);
for (const l of gQS.out.split('\n')) if (l.startsWith('[强调保真]')) console.log(`[pipeline] ${l.trim()}`);
// 16th self-test suite (round 57): LINK AFFORDANCE. The three-layer system (destination-list
// ›/• by declared target, prose accent+1px underline, title/card accent + nav ›), the header
// bar (region `header`), the hero/banner full-bleed rule and the measured `--accent` tokens
// (evidence-backed, fallback declared) are presentation rules fidelity is blind to; this gate
// pins their rendered artifacts (class names / CSS rules / token provenance) and is falsifiable.
const gAF = gate('node m1/eval/affordance-selftest.mjs');
console.log(`[pipeline] 可供性自测(轮57 · 第16道): ${gAF.ok ? '通过' : '失败'}`);
if (!gAF.ok) console.log(gAF.out);
// 17th self-test suite (round 58): LAYOUT SYSTEM. The page grid (one centered ≈1280px container;
// declared width tiers prose/narrow/wide/bleed), region pinning (header group above the page h1,
// footer group last, element-level actions above the footer), the image policy (max-width:100%,
// contained+centered content bands, full-bleed only for a declared hero/banner) and the column
// decision (auto-fill grids on wide-layer card/feed sets, media-first cards, single-column
// reading sets) are presentation rules fidelity is blind to (U-18…U-27). The gate pins fixtures
// AND all rendered exemplar pages and is falsifiable (four negative injections).
const gLO = gate('node m1/eval/layout-selftest.mjs');
console.log(`[pipeline] 布局系统自测(轮58 · 第17道): ${gLO.ok ? '通过' : '失败'}`);
if (!gLO.ok) console.log(gLO.out);
// 页面构图推导必须完备：40 页各自落到其 archetype 允许的闭式原型上，且含混页不得编造原型
// （composition.md §2/§5-1；负样本证明树会诚实返回 undefined）。
const gCOMP = gate('node m1/eval/composition-selftest.mjs');
console.log(`[pipeline] 构图推导自测(轮63): ${gCOMP.ok ? '通过' : '失败'}`);
if (!gCOMP.ok) console.log(gCOMP.out);
// Actual wide/mobile geometry + option-local actions; no static fallback or experience verdict.
const gPF = gate('node m1/eval/page-frame-selftest.mjs');
console.log(`[pipeline] 页面框架/动作可执行自测: ${gPF.ok ? '通过' : '失败'}`);
if (!gPF.ok) console.log(gPF.out);
const gDR = gate('node m1/eval/diagnosed-repair-selftest.mjs');
console.log(`[pipeline] 来源/关联修复可证伪自测: ${gDR.ok ? '通过' : '失败'}`);
if (!gDR.ok) console.log(gDR.out);
const gatesFailed = !gOWN.ok || !gWIT.ok || !gDR.ok || !gValid.ok || !gVST.ok || !gFS.ok || !gMS.ok || !gTS.ok || !gAS.ok || !gMD.ok || !gSH.ok || !gIA.ok || !gCI.ok || !gCIS.ok || !gNU.ok || !gCS.ok || !gCR.ok || !gLC.ok || !gLL.ok || !gQS.ok || !gAF.ok || !gLO.ok || !gPF.ok || !gCOMP.ok;

// ---- 2. audit (9-class visual self-audit) ----------------------------------
const auditTargets = only ? rows.map((r) => 'm1/curated/renders/' + r.k.replace(/\//g, '-') + '.html').join(' ') : '--all';
const auditTail = execSync('node m1/eval/audit-visual.mjs ' + auditTargets + ' 2>&1', { timeout: 300000 }).toString();
console.log(auditTail.trim());
const hardFails = (auditTail.match(/待修 (\d+)/) || [])[1];

// ---- 3. shots + gallery ----------------------------------------------------
if (wantShots) {
  const { chromium } = require(PW);
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  let n = 0;
  // Reuse only byte-bound HTML/PNG pairs; invalidated pages are captured normally.
  const staleShots = new Set(checkShots().stale.map(r=>r.k));
  for (const r of rows) {
    if (!staleShots.has(r.k)) continue;
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
