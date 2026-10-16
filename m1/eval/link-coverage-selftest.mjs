// Link-coverage self-test (round 55, the 13th gate). THE CLAIM UNDER TEST: when the capture
// made a piece of text a LINK (the anchor has a real href) and the model carries that text
// as a fact, the node holding the fact must carry a target (`_action.to`, the existing
// mechanism) — or the difference must be declared, in writing, in `link-coverage-allow.json`.
// A rendered link must never point at a domain the capture does not link to.
//
// WHY A GATE: fidelity certifies MODEL → RENDER; the capture↔model gate certifies fact
// VALUES. Neither sees LINK STRUCTURE, which is how the user's U-01/U-03/U-04 shipped:
// navigation and promo anchors arrived as dead text and every gate stayed green.
//
// It is falsifiable (F-040): fixtures A–H pin both refusal directions against the SAME
// `checkPage` used over the corpus — deleting a target from the model MUST be reported,
// a fabricated link domain MUST be reported, a declared exception MUST pass, an anchor the
// capture itself left target-less (`javascript:void(0)`) MUST NOT be demanded (nothing can
// be reconstructed there without inventing a URL — F-025), a short nav word MUST NOT
// participate. The corpus half then runs the gate over all 42 exemplar pages and names
// every undeclared difference.
// Usage: node m1/eval/link-coverage-selftest.mjs   (exit 0 = all assertions pass)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkPage, loadAllow, sourceAnchors, renderRuns, TEXT_MIN } from './link-coverage.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
let bad = 0, assertions = 0;
const check = (name, cond, detail = '') => {
  assertions++;
  if (cond) console.log(`ok   ${name}`);
  else { bad++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
};
const EMPTY = { entries: [], index: new Map() };

// ---- fixture capture: one anchor WITH a target, one WITHOUT, one 2-char nav word ----
const PAGE = 'demo-com/page';
const DOM = '<html><body>'
  + '<a href="/buy">立即购买</a>'
  + '<a href="javascript:void(0);">更多</a>'
  + '<a href="/search?q=x">电视</a>'
  + '<p>普通正文</p></body></html>';
const BASE = 'https://demo.com/page1';
const MODEL = (action) => ({
  _intent: 'demo', _key: 'p', _title: { text: '演示页' },
  cta: { _intent: 'cta', _name: { text: '立即购买' }, ...(action ? { _action: action } : {}) },
});

// A. the model keeps the target ⇒ no finding.
{
  const r = checkPage(PAGE, MODEL({ verb: 'navigate', to: 'https://demo.com/buy' }), '<p><a href="https://demo.com/buy">立即购买</a></p>', DOM, BASE, EMPTY);
  check('A a kept target produces no finding', r.findings.length === 0, JSON.stringify(r.findings));
  check('A the capture denominator counts targeted and target-less anchors separately',
    r.anchors === 3 && r.anchorsWithTarget === 2 && r.anchorsWithoutTarget === 1, JSON.stringify(r));
}

// B. FALSIFICATION: deleting the target from the model MUST be reported (the task's
//    "临时删一个 href" scenario, decided without re-rendering).
{
  const r = checkPage(PAGE, MODEL({ verb: 'navigate' }), '<p>立即购买</p>', DOM, BASE, EMPTY);
  check('B a fact whose capture anchor had a target is reported when the model drops it',
    r.findings.some((f) => f.kind === 'anchor-dropped' && f.text === '立即购买'), JSON.stringify(r.findings));
  check('B the finding names the node path and the target the capture carried',
    r.findings.find((f) => f.text === '立即购买')?.path.endsWith('cta._name')
    && r.findings.find((f) => f.text === '立即购买')?.expect.includes('https://demo.com/buy'), JSON.stringify(r.findings));
}

// C. a declared exception passes, is reported separately, and carries its round.
{
  const allow = { entries: [], index: new Map([[`${PAGE}\x00anchor-dropped\x00立即购买`, { reason: '同卡片名已是链接', round: 55 }]]) };
  const r = checkPage(PAGE, MODEL(null), '<p>立即购买</p>', DOM, BASE, allow);
  check('C a declared anchor-dropped exception passes and prints its reason/round',
    r.findings.length === 0 && r.declared.length === 1 && r.declared[0].round === 55, JSON.stringify(r));
}

// D. FALSIFICATION: a link to a domain the capture never links to MUST be reported.
{
  const html = '<p><a href="https://evil.example/buy">立即购买</a></p>';
  const r = checkPage(PAGE, MODEL({ verb: 'navigate', to: 'https://demo.com/buy' }), html, DOM, BASE, EMPTY);
  check('D a fabricated link domain is reported (wrong-target)',
    r.findings.some((f) => f.kind === 'wrong-target' && f.href === 'https://evil.example/buy'), JSON.stringify(r.findings));
}

// E. a capture anchor with no target is never demanded — there is nothing to keep.
{
  const r = checkPage(PAGE, MODEL(null), '<p>更多</p>', DOM, BASE, EMPTY);
  check('E a `javascript:` anchor is not demanded (no URL may be invented)',
    !r.findings.some((f) => f.text === '更多'), JSON.stringify(r.findings));
}

// F. the information threshold + in-page references.
{
  check(`F TEXT_MIN is ${TEXT_MIN} (short nav words do not participate)`, TEXT_MIN === 3, String(TEXT_MIN));
  const shortModel = { _intent: 'd', tv: { _name: { text: '电视' } } };
  const r = checkPage(PAGE, shortModel, '<p>电视</p>', DOM, BASE, EMPTY);
  check('F a 2-char anchor text is skipped (a heading is not that nav link)', r.findings.length === 0, JSON.stringify(r.findings));
  const r2 = checkPage(PAGE, MODEL({ verb: 'navigate', to: '#buy' }), '<p><a href="#buy">立即购买</a></p>', DOM, BASE, EMPTY);
  check('F an invented in-page target cannot replace a captured external target', r2.findings.some((f) => f.kind === 'wrong-target'), JSON.stringify(r2.findings));
}

// Exact association falsification: same domain is not enough; render loss is not enough.
for (const target of ['https://demo.com/other', 'https://demo.com/buy?q=wrong', 'https://demo.com/buy#wrong']) {
  const r = checkPage(PAGE, MODEL({ verb: 'navigate', to: target }), `<a href="${target}">立即购买</a>`, DOM, BASE, EMPTY);
  check(`exact captured target rejects ${target}`, r.findings.some((f) => f.kind === 'wrong-target'));
}
{
  const r = checkPage(PAGE, MODEL({ verb: 'navigate', to: 'https://demo.com/buy' }), '<p>立即购买</p>', DOM, BASE, EMPTY);
  check('correct model target with dropped rendered link fails', r.findings.some((f) => f.kind === 'anchor-dropped'));
}

// G. the scanners really read structure, not words.
{
  const runs = renderRuns('<p>before</p><a href="/x">in</a><p>after</p>');
  check('G renderRuns tags the link run with its href and the rest as plain',
    runs.length === 3 && runs[1].href === '/x' && runs[0].href === null && runs[2].href === null, JSON.stringify(runs));
  const a = sourceAnchors(DOM, BASE);
  check('G sourceAnchors marks `javascript:` as target-less and absolutizes the rest',
    a.length === 3 && a[0].norm === 'https://demo.com/buy' && a[1].real === false, JSON.stringify(a));
}

// H. allowlist enforcement: a reason-less, round-less or unknown-kind entry is a hard error.
{
  const tmp = path.join(root, '.tmp', 'link-coverage-allow-bad.json');
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  const cases = [
    [{ page: PAGE, kind: 'anchor-dropped', text: 'x', round: 55 }, /reason/, 'reason-less'],
    [{ page: PAGE, kind: 'anchor-dropped', text: 'x', reason: 'r' }, /round/, 'round-less'],
    [{ page: PAGE, kind: 'whatever', text: 'x', reason: 'r', round: 55 }, /kind/, 'unknown kind'],
  ];
  for (const [entry, re, label] of cases) {
    let threw = '';
    fs.writeFileSync(tmp, JSON.stringify({ entries: [entry] }));
    try { loadAllow(tmp); } catch (e) { threw = e.message; }
    check(`H a ${label} allow entry is a hard load error`, re.test(threw), threw);
  }
  fs.rmSync(tmp, { force: true });
}

// ---- corpus: all 42 exemplar pages -----------------------------------------
const scale = JSON.parse(fs.readFileSync(path.join(root, 'm1/eval/m3-scale.json'), 'utf8')).filter((x) => x.tier === 'exemplar');
const allow = loadAllow(path.join(root, 'm1/eval/link-coverage-allow.json'));
let anchors = 0, withTarget = 0, noTarget = 0, facts = 0, linked = 0, declared = 0;
const allFindings = [];
for (const r of scale) {
  const htmlPath = path.join(root, 'm1/curated/renders', `${r.k.replace(/\//g, '-')}.html`);
  const modelPath = path.join(root, 'm1/curated', `${r.k}.json`);
  const corpusDir = path.join(root, 'corpus', r.k);
  if (!fs.existsSync(htmlPath) || !fs.existsSync(modelPath) || !fs.existsSync(path.join(corpusDir, 'dom.html'))) {
    check(`${r.k}: model + render + capture available`, false, 'missing artifact');
    continue;
  }
  let base = '';
  try { const meta = JSON.parse(fs.readFileSync(path.join(corpusDir, 'meta.json'), 'utf8')); base = meta.redirectedUrl ?? meta.url ?? ''; } catch { /* relative targets stay as-is */ }
  const res = checkPage(r.k, JSON.parse(fs.readFileSync(modelPath, 'utf8')), fs.readFileSync(htmlPath, 'utf8'), fs.readFileSync(path.join(corpusDir, 'dom.html'), 'utf8'), base, allow);
  anchors += res.anchors; withTarget += res.anchorsWithTarget; noTarget += res.anchorsWithoutTarget;
  facts += res.factsToLink; linked += res.linked; declared += res.declared.length;
  for (const f of res.findings) allFindings.push(`${r.k}: [${f.kind}] "${f.text.slice(0, 50)}" ${f.path ?? ''}${f.href ? ` → ${f.href.slice(0, 70)}` : ''}`);
  check(`${r.k}: every captured anchor target is kept or declared (${res.linked}/${res.factsToLink} model facts that reproduce an anchor)`,
    res.findings.length === 0, res.findings.map((f) => `${f.kind}:"${f.text.slice(0, 30)}"`).join(' | '));
}
console.log(`\n链接对照: 源站锚点 ${anchors}（有目标 ${withTarget} / 源站本身无目标 ${noTarget}）| 模型复现的锚点事实 ${facts}｜已有目标 ${linked} | 未声明差额 ${allFindings.length} | 白名单声明 ${declared}（共 ${allow.entries.length} 条）`);
if (allFindings.length) { console.log('未声明差额清单:'); for (const f of allFindings) console.log(`   ✗ ${f}`); }
else console.log(`未声明差额清单: 无（${scale.length} 页的锚点事实全部有目标或有书面理由）`);

console.log(`\n链接覆盖自测(第13道): ${bad === 0 ? '全部通过' : `待修 ${bad}`} (${assertions} 条断言)`);
process.exit(bad ? 1 : 0);
