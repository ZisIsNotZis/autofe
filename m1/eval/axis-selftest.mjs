// Axis consistency self-test (round 19, gate 6).
//
// THE CLAIM UNDER TEST: the two render targets (`render.mjs` → HTML, `render-text.mjs`
// → plain text) make the SAME axis decision (F-031) for the same node — the same form
// name, the same compare-set verdict and the same degradation reason. Before round 19
// that was only true because `selectForm`/`comparable`/`compareSetVerdict` were COPIED
// into both renderers; a copy can drift. Now the decision lives once in ../axis.mjs and
// both renderers import it.
//
// Two halves, both falsifiable (F-040):
//   A. static: both renderers import ./axis.mjs and keep no private copy of any shared
//      decision/constant — this is what makes recurrence impossible, and it FAILS the
//      moment someone re-derives a function in a renderer.
//   B/C. dynamic: constructed models are pushed through BOTH targets; their compare
//      degradation lists must be identical, and for each form the shared `selectForm`
//      must classify it while both targets render that form.
// Usage: node m1/eval/axis-selftest.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '../render.mjs';
import { renderText } from '../render-text.mjs';
import { selectForm, comparable, compareSetVerdict } from '../axis.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
let bad = 0;
let assertions = 0;
const check = (name, cond, detail = '') => {
  assertions++;
  if (cond) console.log(`ok   ${name}`);
  else { bad++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
};

// ---- A. single implementation (anti-recurrence) ----------------------------
// Every axis DECISION is named here. Round 19 lifted form selection/comparability/
// verdict/constants; round 20 lifted the four remaining decision families that were
// still duplicated in both renderers: collection grouping, control visibility+scope,
// `_primary` slot resolution, and the `key:`→label index / visible-text utilities.
const SHARED_NAMES = [
  'selectForm', 'comparable', 'compareSetVerdict', 'compareRowKeys', 'compareStats', 'compareHasCell',
  'shapeKeys', 'textLenOf', 'jaccardOf', 'isProseItem', 'isLabelOnlyItem', 'isImageOnlyItem', 'isPositionalKey',
  'CURRENCY_GLYPH', 'ROLE_UNIT', 'META_KEYS', 'LIST_QUALIFIER', 'COMPARE_MIN_FILL', 'hasTarget', 'hrefOf', 'hasOwnUnit',
  'labelOf', 'labelTextOf',
  // round 20
  'seqGroupsOf', 'actionVisible', 'itemScope', 'primarySlot', 'buildRefLabels', 'pageText',
  'groupKind', 'seqGroups', 'indexRefLabels', 'REF_LABELS',
];
for (const f of ['render.mjs', 'render-text.mjs']) {
  const src = fs.readFileSync(path.join(root, 'm1', f), 'utf8');
  check(`${f} imports the shared axis layer (./axis.mjs)`, /from '\.\/axis\.mjs'/.test(src));
  const dups = SHARED_NAMES.filter((name) => new RegExp(`(function|const|let|var)\\s+${name}\\b`).test(src));
  check(`${f} keeps no private copy of the axis layer`, dups.length === 0, `re-derived: ${dups.join(', ')}`);
}
// A2. structural: a private copy is not always a named function — the same decision can
// be hand-written inline. Round 20: grouping (`_rel.compare`), the primary-slot rule
// (`_primary`), its resolution, and the action-visibility condition must not reappear.
const NO_REDERIVE = [
  [/_rel\?\.compare|_rel\.compare/, 'compare grouping (`_rel.compare`)'],
  [/typeof\s+\w+\._primary/, 'primary-slot rule (`_primary`)'],
  [/resolveWithParent\s*\(/, 'primary resolution (`resolveWithParent`)'],
  [/\._action\.when\b/, 'action-visibility condition (`_action.when`)'],
];
for (const f of ['render.mjs', 'render-text.mjs']) {
  const src = fs.readFileSync(path.join(root, 'm1', f), 'utf8');
  for (const [re, what] of NO_REDERIVE) check(`${f} does not re-derive the ${what}`, !re.test(src), `matched ${re}`);
}
// A3. the metric's visible-text caliber is shared too (no private `pageText` in the evaluator).
{
  const src = fs.readFileSync(path.join(root, 'm1', 'eval', 'metrics.mjs'), 'utf8');
  check('metrics.mjs imports `pageText` from the shared axis layer',
    /import\s*\{[^}]*\bpageText\b[^}]*\}\s*from\s*'\.\.\/axis\.mjs'/.test(src));
  check('metrics.mjs keeps no private `pageText` copy', !/(function|const|let|var)\s+pageText\b/.test(src));
}

// ---- B/C. both targets agree on constructed models -------------------------
// A compare set is marked on its collection node; `key` lands in the degradation
// record so the two targets' reports can be compared element-for-element.
const compareNode = (items, key = 'set') => ({
  _intent: 'cmp', _title: { text: 'Compare' },
  set: { _key: key, _intent: 's', _rel: { compare: true }, _items: items },
});
const listNode = (items, rel = {}) => ({
  _intent: 'list', _title: { text: 'List' },
  list: { _intent: 'l', _rel: rel, _items: items },
});
const agree = (model) => {
  const h = []; const html = render(model, {}, h);
  const t = []; const text = renderText(model, {}, t);
  const rec = (a) => a.map((d) => `${d.key}|${d.entities}|${d.reason}`);
  return { h: rec(h), t: rec(t), html, text };
};

// B1. a genuine comparison set: no degradation in either target, both render a table.
{
  const r = agree(compareNode([
    { _name: { text: 'Alpha' }, _rating: { num: 4.8 } },
    { _name: { text: 'Beta' }, _rating: { num: 4.9 } },
  ]));
  check('B1 a valid compare set degrades in neither target',
    r.h.length === 0 && r.t.length === 0, `html=${JSON.stringify(r.h)} text=${JSON.stringify(r.t)}`);
  check('B1 both targets lay the entities out as a comparison table',
    r.html.includes('cmp-table') && r.text.split('\n').some((l) => l.includes('Alpha') && l.includes('Beta')));
}
// B2..B6. each explicit degradation reason arises identically in both targets.
const degradeCases = [
  ['B2 no comparable attribute', compareNode([
    { _name: { text: 'A' } }, { _name: { text: 'B' } },
  ]), 'no-comparable-attribute'],
  ['B3 a member has no name', compareNode([
    { _name: { text: 'A' }, _rating: { num: 1 } }, { _rating: { num: 2 } },
  ]), 'member-has-no-name'],
  ['B4 a member is a control', compareNode([
    { _name: { text: 'A' }, _rating: { num: 1 } },
    { _name: { text: 'B' }, _rating: { num: 2 }, _expose: { name: 'pick', type: 'text' } },
  ]), 'member-is-a-control'],
  ['B5 no shared attribute row', compareNode([
    { _name: { text: 'A' }, _detail: { text: 'only A' } },
    { _name: { text: 'B' }, _text: { text: 'only B' } },
  ]), 'degenerate-no-shared-attribute'],
  ['B6 fill rate below 0.4', compareNode([
    { _name: { text: 'A' }, _fields: { fa: { text: 'a-fa' }, fx: { text: 'x' } } },
    { _name: { text: 'B' }, _fields: { fb: { text: 'b-fb' }, fx: { text: 'x' } } },
    { _name: { text: 'C' }, _fields: { fc: { text: 'c-fc' } } },
    { _name: { text: 'D' }, _fields: { fd: { text: 'd-fd' } } },
  ]), 'degenerate-fill-rate:0.30'],
];
for (const [label, model, reason] of degradeCases) {
  const r = agree(model);
  const eq = JSON.stringify(r.h) === JSON.stringify(r.t);
  check(`${label}: both targets agree, reason "${reason}"`,
    eq && r.h.length === 1 && r.h[0] === `set|${model.set._items.length}|${reason}`,
    `html=${JSON.stringify(r.h)} text=${JSON.stringify(r.t)}`);
}
// B7. a lone marked leaf: ≥2 entities is required, and both targets say so.
{
  const r = agree(compareNode([{ _name: { text: 'A' }, _rating: { num: 1 } }]));
  check('B7 fewer-than-2-entities: both targets agree',
    JSON.stringify(r.h) === JSON.stringify(r.t) && r.h.length === 1 && r.h[0] === 'set|1|fewer-than-2-entities',
    `html=${JSON.stringify(r.h)} text=${JSON.stringify(r.t)}`);
}

// C. form name: the shared `selectForm` classifies the set, and BOTH targets render
// that same form (so neither can drift to a different form without failing here).
const formCases = [
  ['C1 comparable typed records ⇒ table', listNode([
    { _name: { text: 'Basic' }, _fields: { price: { money: 9.99, currency: 'USD' }, seats: { num: 1 } } },
    { _name: { text: 'Pro' }, _fields: { price: { money: 19.99, currency: 'USD' }, seats: { num: 5 } } },
  ]), undefined, 'table', (r) => r.html.includes('<table class="data"') && r.text.includes('Basic') && r.text.includes('$9.99')],
  ['C2 consecutive `_text` members ⇒ prose', listNode([
    { _text: { text: 'para one' } }, { _text: { text: 'para two' } },
  ]), undefined, 'prose', (r) => r.html.includes('<div class="prose"') && r.text.includes('para one')],
  ['C3 ordered label-only set ⇒ seq', listNode([
    { _name: { text: 'Step' } }, { _name: { text: 'Next' } },
  ], { order: 'sequence' }), 'sequence', 'seq', (r) => r.html.includes('<ol class="seq"') && r.text.includes('1. Step')],
  ['C4 image-only members ⇒ image-strip', listNode([
    { _image: { image: 'a.png', alt: 'ALT' } },
  ]), undefined, 'image-strip', (r) => r.html.includes('<figure class="strip"') && r.text.includes('[图片] ALT')],
  ['C5 non-comparable members ⇒ stack', listNode([
    { _name: { text: 'Alpha' }, _detail: { text: 'first block' } },
    { _name: { text: 'Beta' }, _summary: { text: 'second' } },
  ]), undefined, 'stack', (r) => r.html.includes('<section class="block"') && r.text.includes('Alpha') && r.text.includes('Beta')],
];
for (const [label, model, order, form, signature] of formCases) {
  const items = model.list._items;
  const chosen = selectForm(items, order);
  const r = agree(model);
  check(`${label}: shared selectForm + both targets agree`,
    chosen === form && signature(r),
    `form=${chosen} expected=${form} html=${r.html.includes('<table')} text=…`);
}

// The comparability gate itself is the shared one (and agrees with the verdict path).
check('C6 `comparable` is the same function the form gate uses',
  comparable([{ _name: { text: 'A' }, _rating: { num: 1 } }, { _name: { text: 'B' }, _rating: { num: 2 } }]) === true
  && comparable([{ _name: { text: 'A' }, _detail: { text: 'x' } }, { _name: { text: 'B' } }]) === false,
  'comparable() disagreed with expectation');
check('C7 `compareSetVerdict` returns ok:true for a dense set',
  compareSetVerdict([
    { _name: { text: 'A' }, _rating: { num: 1 } }, { _name: { text: 'B' }, _rating: { num: 2 } },
  ]).ok === true);

console.log(`\n轴一致性自测: ${bad === 0 ? '全部通过' : `待修 ${bad}`} (${assertions} 条断言)`);
process.exit(bad ? 1 : 0);
