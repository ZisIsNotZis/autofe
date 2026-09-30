// AutoFE 流水线（编排资产）：渲染全部策展模型 → 事实保真 → 源码覆盖 → 视觉自查（可选截图+画廊）
// 三个渲染目标都跑：HTML（render.mjs）/ 纯文本（render-text.mjs）/ Markdown（render-md.mjs）。
// 用法:
//   node m1/eval/pipeline.mjs            仅渲染 + 度量 + 审计（快，约 1 分钟）
//   node m1/eval/pipeline.mjs --shots    追加全页截图 + 画廊重建（需要 playwright，约 3 分钟）
//   node m1/eval/pipeline.mjs --only airbnb-com/room-28871,bilibili-com/home
// 退出码: 0 = 全部通过（三目标保真 1.00 且视觉自查无硬缺陷且七道门禁全过）; 1 = 有失败项
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const wantShots = args.includes('--shots');
const onlyArg = args.find((a) => a.startsWith('--only'));
const only = onlyArg ? (onlyArg.includes('=') ? onlyArg.split('=')[1] : args[args.indexOf(onlyArg) + 1]).split(',').map((s) => s.trim()).filter(Boolean) : null;

const require = createRequire(import.meta.url);
const PW = process.env.HOME + '/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core';
const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';

const scale = JSON.parse(fs.readFileSync('m1/eval/m3-scale.json', 'utf8')).filter((x) => x.tier === 'exemplar');
const rows = only ? scale.filter((s) => only.includes(s.k)) : scale;

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
const gValid = gate(`node m1/validate.mjs $(find m1/curated -maxdepth 2 -name '*.json') m1/models/*/*.json`);
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
const gatesFailed = !gValid.ok || !gVST.ok || !gFS.ok || !gMS.ok || !gTS.ok || !gAS.ok || !gMD.ok;

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
}

const failed = gatesFailed || under.length > 0 || mdUnder.length > 0 || (hardFails && Number(hardFails) > 0) || out.some((o) => o.error);
process.exit(failed ? 1 : 0);
