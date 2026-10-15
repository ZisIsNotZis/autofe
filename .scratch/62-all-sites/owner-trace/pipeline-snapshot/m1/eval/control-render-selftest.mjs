// Control-render self-test (round 53, 12th gate). THE CLAIM UNDER TEST: every `_expose` that
// the axis says renders as a CONTROL (axis.exposeRendersAsControl(node) !== null) must actually
// appear as a control in EVERY render target — a named `<input|select|textarea>` in HTML, a
// recognisable placeholder marker in text/Markdown. Fidelity only counts typed FACT text, so it
// is blind to a control that silently disappears: round 49's blanket "composite `_expose` is
// state" turned `search.query` from `<input name="query">` into a plain fact and fidelity did
// not move. This gate makes that class of disappearance impossible to ship silently.
//
// It is falsifiable (F-040): a tampered artifact with the declared control STRIPPED is fed to
// the same `auditPage` used over the corpus and MUST be reported (fixture D). The corpus half
// then runs the gate over all 42 exemplar pages and reports "rendered controls = expected
// `_expose` controls" with every inconsistency named.
// Usage: node m1/eval/control-render-selftest.mjs   (exit 0 = all assertions pass)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '../render.mjs';
import { renderText } from '../render-text.mjs';
import { renderMarkdown } from '../render-md.mjs';
import { exposeRendersAsControl, nodePlan } from '../axis.mjs';
import { exposeOf, childrenOf } from '../model-lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
let bad = 0, assertions = 0;
const check = (name, cond, detail = '') => {
  assertions++;
  if (cond) console.log(`ok   ${name}`);
  else { bad++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
};

// ---- what counts as "a control" in each target -----------------------------
// HTML: the renderer names every control after its exposure (`name="..."`). Today it emits
// `<input>`; the contract is the same for `<select>`/`<textarea>` should a renderer add one.
const CONTROL_TAG = /<(input|select|textarea)\b[^>]*\bname="([^"]+)"/g;
function htmlControlNames(html) {
  const s = new Set();
  for (const m of html.matchAll(CONTROL_TAG)) s.add(m[2]);
  return s;
}
// text / Markdown have no attributes: a control is the placeholder glyph the target emits
// (render-text.mjs / render-md.mjs): input `_____…`, secret `(密码)`, bool/choice `[ ]`/`( )`.
const TEXT_MARKER = /_{6,}|\(密码\)|\[\s*\]|\(\s*\)/g;
const textMarkers = (t) => (t.match(TEXT_MARKER) ?? []).length;

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
// Every node carrying `_expose`, with the axis verdict and the plan's widget kind. `_when`
// visibility is honoured (a correctly hidden control must NOT be demanded): `hidden` is a
// verdict, not a miss.
function collectExposures(model) {
  const out = [];
  (function walk(n, p) {
    if (!isPlainObject(n)) return;
    const exp = exposeOf(n);
    if (exp) {
      const plan = nodePlan(n, { chain: [], values: {}, depth: 1 });
      const kind = !plan.visible ? 'hidden' : (plan.choice ? plan.choice.kind : 'none');
      out.push({
        p, name: exp.name,
        control: exposeRendersAsControl(n) !== null,
        // a single-item `_items` set is a deliberate fact (choicePlan `plain-fact`), not a widget
        kind, widget: kind === 'input' || kind === 'bool' || kind === 'choice',
        itemName: kind === 'plain-fact' ? (plan.choice.itemName?.text ?? '') : '',
      });
    }
    for (const c of childrenOf(n)) walk(c.node, p ? `${p}.${c.key}` : c.key);
  })(model, '');
  return out;
}
// The gate over one model + its three rendered artifacts. Returns the expected widget
// exposures, the declared-state exposures, the single-item downgrades, and every mismatch.
function auditPage(model, art) {
  const exps = collectExposures(model);
  const names = htmlControlNames(art.html);
  const expected = exps.filter((e) => e.control && e.widget);
  const states = exps.filter((e) => !e.control);
  const downgraded = exps.filter((e) => e.control && e.kind === 'plain-fact');
  const mism = [];
  for (const e of expected) if (!names.has(e.name)) mism.push(`${e.p}#${e.name}: declared control has no <input|select|textarea name="${e.name}"> in HTML`);
  for (const e of exps) if (e.control && e.kind === 'none') mism.push(`${e.p}#${e.name}: axis says control but the plan renders no widget`);
  for (const e of states) if (names.has(e.name)) mism.push(`${e.p}#${e.name}: a state-slot _expose drew a control (must not)`);
  for (const e of downgraded) if (e.itemName && !art.html.includes(e.itemName)) mism.push(`${e.p}#${e.name}: single-item fact "${e.itemName}" not in HTML`);
  const tm = textMarkers(art.text), mm = textMarkers(art.md);
  if (expected.length && tm < expected.length) mism.push(`text target: ${tm} control markers < ${expected.length} expected`);
  if (expected.length && mm < expected.length) mism.push(`md target: ${mm} control markers < ${expected.length} expected`);
  return { expected, states, downgraded, mism, tm, mm };
}
const artOf = (model) => ({ html: render(model), text: renderText(model), md: renderMarkdown(model) });

// ---- A. plain node: `_expose` is the user's input slot → a control ----------
{
  const m = { _intent: 'x', _key: 'p', _title: { text: 'P' }, q: { _intent: 'q', _label: { text: 'Keyword' }, _expose: { name: 'kw', type: 'text' } } };
  const a = artOf(m);
  check('A plain node `_expose` renders a named control in all three targets',
    exposeRendersAsControl(m.q) !== null && htmlControlNames(a.html).has('kw') && textMarkers(a.text) >= 1 && textMarkers(a.md) >= 1,
    JSON.stringify({ html: htmlControlNames(a.html).has('kw'), text: textMarkers(a.text), md: textMarkers(a.md) }));
}

// ---- B/D. composite `field` slot (the search.query family) → a control ------
{
  const search = { _intent: 'x', _key: 's', _composite: 'search', _label: { text: '搜索' }, _expose: { name: 'query', type: 'text' } };
  const good = artOf(search);
  check('B a composite `field` slot renders its control (<input name="query">)',
    exposeRendersAsControl(search)?.name === 'query' && htmlControlNames(good.html).has('query'),
    JSON.stringify([...htmlControlNames(good.html)]));
  // D. FALSIFICATION: a "declared field but no control rendered" artifact MUST be reported.
  const stripped = { ...good, html: good.html.replace(/<input[^>]*\bname="query"[^>]*>/g, '') };
  check('D the gate passes the intact artifact', auditPage(search, good).mism.length === 0, auditPage(search, good).mism.join(' | '));
  check('D the gate FAILS the same model when the declared control is stripped (falsifiable)',
    auditPage(search, stripped).mism.some((x) => /query/.test(x)), JSON.stringify(auditPage(search, stripped).mism));
}

// ---- C. composite `state` slot (login.signed-in) → NEVER a control ----------
{
  const login = { _intent: 'x', _key: 'l', _composite: 'login', _expose: { name: 'signed-in', type: 'bool' },
    identifier: { _expose: { name: 'id', type: 'text' } }, secret: { _expose: { name: 'pw', type: 'secret' } }, submit: { _action: { verb: 'submit' } } };
  const a = artOf(login);
  const names = htmlControlNames(a.html);
  check('C a composite `state` slot draws no widget, but its `field` children do',
    exposeRendersAsControl(login) === null && !names.has('signed-in') && names.has('id') && names.has('pw'),
    JSON.stringify([...names]));
  check('C the role rule holds in all three targets (state absent, fields present)',
    !/\bsigned-in\b/.test(a.html) && textMarkers(a.text) >= 2 && textMarkers(a.md) >= 2, '');
}

// ---- corpus: all 42 exemplar pages, "controls rendered = controls expected" ---
const scale = JSON.parse(fs.readFileSync(path.join(root, 'm1/eval/m3-scale.json'), 'utf8')).filter((x) => x.tier === 'exemplar');
let expectedTotal = 0, foundTotal = 0, downgradedTotal = 0, stateTotal = 0;
const allMism = [];
for (const r of scale) {
  const model = JSON.parse(fs.readFileSync(path.join(root, 'm1/curated', `${r.k}.json`), 'utf8'));
  let audit;
  try {
    const a = artOf(model);
    audit = auditPage(model, a);
    // how many distinct expected names are actually present in HTML (the control count)
    const names = htmlControlNames(a.html);
    foundTotal += audit.expected.filter((e) => names.has(e.name)).length;
  } catch (e) {
    audit = { expected: [], mism: [`render threw: ${e.message}`] };
  }
  expectedTotal += audit.expected.length;
  downgradedTotal += audit.downgraded.length;
  stateTotal += audit.states.length;
  for (const m of audit.mism) allMism.push(`${r.k}: ${m}`);
  check(`${r.k}: rendered controls = expected _expose controls (${audit.expected.length})`, audit.mism.length === 0, audit.mism.join(' | '));
}
console.log(`\n控件对照: 应渲染 _expose 控件 ${expectedTotal} | HTML 命中 ${foundTotal} | 单项降级为事实(非控件) ${downgradedTotal} | state(不画控件) ${stateTotal}`);
if (allMism.length) { console.log('不一致清单:'); for (const m of allMism) console.log(`   ✗ ${m}`); }
else console.log(`不一致清单: 无（42 页全部一致）`);

console.log(`\n控件渲染自测(第12道): ${bad === 0 ? '全部通过' : `待修 ${bad}`} (${assertions} 条断言)`);
process.exit(bad ? 1 : 0);
