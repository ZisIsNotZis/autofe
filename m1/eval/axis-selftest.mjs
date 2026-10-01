// Axis consistency self-test (round 19, gate 6; extended to THREE targets in round 21).
//
// THE CLAIM UNDER TEST: the render targets (`render.mjs` → HTML, `render-text.mjs`
// → plain text, `render-md.mjs` → Markdown) make the SAME axis decision (F-031) for the
// same node — the same form name, the same compare-set verdict and the same degradation
// reason. Before round 19 that was only true because `selectForm`/`comparable`/
// `compareSetVerdict` were COPIED into both renderers; a copy can drift. Now the decision
// lives once in ../axis.mjs and every renderer imports it.
//
// Round 21 adds the third target to every half. The stronger claim it tests: a new target
// is expressible as presentation only. If `render-md.mjs` had to re-write an axis decision
// the static half fails exactly the way it would for a hand-copied function.
//
// Two halves, both falsifiable (F-040):
//   A. static: all renderers import ./axis.mjs and keep no private copy of any shared
//      decision/constant — this is what makes recurrence impossible, and it FAILS the
//      moment someone re-derives a function in a renderer.
//   B/C. dynamic: constructed models are pushed through ALL targets; their compare
//      degradation lists must be identical, and for each form the shared `selectForm`
//      must classify it while every target renders that form.
// Usage: node m1/eval/axis-selftest.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '../render.mjs';
import { renderText } from '../render-text.mjs';
import { renderMarkdown } from '../render-md.mjs';
import { selectForm, comparable, compareSetVerdict, nodePlan, runPlan, compareHeaderEntries, compareRowKeys, resolveRowLabel, COMPARE_HEADER_KEYS } from '../axis.mjs';

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
const TARGETS = ['render.mjs', 'render-text.mjs', 'render-md.mjs'];
const SHARED_NAMES = [
  'selectForm', 'comparable', 'compareSetVerdict', 'compareRowKeys', 'compareStats', 'compareHasCell',
  'shapeKeys', 'textLenOf', 'jaccardOf', 'isProseItem', 'isLabelOnlyItem', 'isImageOnlyItem', 'isPositionalKey',
  'CURRENCY_GLYPH', 'ROLE_UNIT', 'META_KEYS', 'LIST_QUALIFIER', 'COMPARE_MIN_FILL', 'hasTarget', 'hrefOf', 'hasOwnUnit',
  'labelOf', 'labelTextOf',
  // round 20
  'seqGroupsOf', 'actionVisible', 'itemScope', 'primarySlot', 'buildRefLabels', 'pageText',
  'groupKind', 'seqGroups', 'indexRefLabels', 'REF_LABELS',
  // round 22: the node render plan and every plan helper it exports
  'nodePlan', 'headingKeyOf', 'isDemoted', 'actionPlan', 'itemActionPlan', 'choicePlan', 'runPlan',
  'selectTablePlan', 'compareCellOf', 'compareRowLabel', 'nestedCollections', 'namedChildEntries',
  'arrayChildEntries', 'isActionOnlyNode',
  // round 23: the compare-table entity header attribute set (was re-written per target)
  'compareHeaderEntries', 'COMPARE_HEADER_KEYS',
  // round 24: the role-label vocabulary and the compare row-label / table column-label decisions
  'ROLE_LABEL', 'roleLabel', 'NAME_COLUMN_LABEL', 'columnLabel', 'resolveRowLabel',
];
for (const f of TARGETS) {
  const src = fs.readFileSync(path.join(root, 'm1', f), 'utf8');
  check(`${f} imports the shared axis layer (./axis.mjs)`, /from '\.\/axis\.mjs'/.test(src));
  const dups = SHARED_NAMES.filter((name) => new RegExp(`(function|const|let|var)\\s+${name}\\b`).test(src));
  check(`${f} keeps no private copy of the axis layer`, dups.length === 0, `re-derived: ${dups.join(', ')}`);
}
// A1b. a target must not reach for another target's implementation either (round 21:
// the Markdown target has to be a third presentation, never a wrapper over HTML/text).
for (const f of ['render-text.mjs', 'render-md.mjs']) {
  const src = fs.readFileSync(path.join(root, 'm1', f), 'utf8');
  check(`${f} does not import another renderer`,
    !/from '\.\/render(-text)?\.mjs'/.test(src), `imports a sibling renderer`);
}
// A1c-b. the compare-table header decision is consumed, not re-derived (round 23). The
// header ATTRIBUTE SET (`_name`/`_tag`/`_price`/`_subtitle`/`_summary`) used to be spelled
// out inside all three targets with a different order per target; now `compareHeaderEntries`
// is the one decision and every target draws it.
for (const f of TARGETS) {
  const src = fs.readFileSync(path.join(root, 'm1', f), 'utf8');
  check(`${f} consumes the shared compare-header decision`, /\bcompareHeaderEntries\s*\(/.test(src));
}
// A1c. the node render plan is imported and actually consumed (round 22): the eleven
// node-level decisions must be drawn, not re-derived.
for (const f of TARGETS) {
  const src = fs.readFileSync(path.join(root, 'm1', f), 'utf8');
  check(`${f} consumes the shared node plan`, /\bnodePlan\s*\(/.test(src));
}
// A1d. the compare-set ROW LABEL and the data-table COLUMN LABEL are one shared decision
// (round 24). This is the half that would have failed before the role-label vocabulary
// moved to axis.mjs: HTML resolved the row label through the domain dict only, so the
// identical row printed `评分` in text/Markdown and empty in HTML (airbnb-com/room-28871).
for (const f of TARGETS) {
  const src = fs.readFileSync(path.join(root, 'm1', f), 'utf8');
  check(`${f} consumes the shared compare row-label decision`, /\bresolveRowLabel\s*\(/.test(src));
  check(`${f} consumes the shared role-label vocabulary`, /\b(columnLabel|roleLabel)\s*\(/.test(src));
  check(`${f} keeps no private role-label map`, !/ROLE_LABEL|const\s+roleLabel\b/.test(src));
}
// A2b. STRUCTURAL (round 22): the forbidden set is the model-semantic KEYS, not the function
// names. A renamed private copy of a decision still has to read the model (`.\_expose`,
// `.\_when`, `.\_fields`, `.\_rel`, `.\_primary`, `.\_empty`, `.\_items`, `.\_lines`, `.\_action`),
// so scanning comment-free source for those tokens catches the copy that the old name-based
// half could not. A target may still read `_name`/`_title`/`_label`... for display copy — those
// are allowed and are listed in the round-22 report §exceptions.
const FORBIDDEN_TOKENS = ['_rel', '_when', '_expose', '_fields', '_primary', '_empty', '_items', '_lines', '_action'];
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
for (const f of TARGETS) {
  const code = stripComments(fs.readFileSync(path.join(root, 'm1', f), 'utf8'));
  const found = FORBIDDEN_TOKENS.filter((t) => new RegExp(`(?<![\\w$])${t}\\b`).test(code));
  check(`${f} holds no model-semantic token (${FORBIDDEN_TOKENS.join(' ')})`, found.length === 0, `found: ${found.join(', ')}`);
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
for (const f of TARGETS) {
  const src = fs.readFileSync(path.join(root, 'm1', f), 'utf8');
  for (const [re, what] of NO_REDERIVE) check(`${f} does not re-derive the ${what}`, !re.test(src), `matched ${re}`);
}
// A4. the ACTION ROW is one shared decision (round 27). Before this round only HTML consumed
// `nodePlan().actionRow`; text/Markdown grouped controls on their own (a `plan.toolbar` line
// when ≥2, the own action separately, a lone toolbar child dropped), so the same node could
// get a different control grouping per target. Every target must now draw the SAME row and
// none may group actions itself.
for (const f of TARGETS) {
  const src = fs.readFileSync(path.join(root, 'm1', f), 'utf8');
  check(`${f} consumes the shared action row`, /\bplan\.actionRow\b/.test(src));
  check(`${f} keeps no private action grouping`, !/\b(actionKids|actionRowOf|plan\.toolbar)\b/.test(src));
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
  const m = []; const md = renderMarkdown(model, {}, m);
  const rec = (a) => a.map((d) => `${d.key}|${d.entities}|${d.reason}`);
  // `same` is the three-way agreement this gate exists for: no target may report a
  // different compare-set verdict than another for the SAME node.
  const hh = rec(h);
  const same = JSON.stringify(hh) === JSON.stringify(rec(t)) && JSON.stringify(hh) === JSON.stringify(rec(m));
  return { h: hh, t: rec(t), m: rec(m), same, html, text, md };
};

// B1. a genuine comparison set: no degradation in either target, both render a table.
{
  const r = agree(compareNode([
    { _name: { text: 'Alpha' }, _rating: { num: 4.8 } },
    { _name: { text: 'Beta' }, _rating: { num: 4.9 } },
  ]));
  check('B1 a valid compare set degrades in no target',
    r.h.length === 0 && r.t.length === 0 && r.m.length === 0,
    `html=${JSON.stringify(r.h)} text=${JSON.stringify(r.t)} md=${JSON.stringify(r.m)}`);
  check('B1 all targets lay the entities out as a comparison table',
    r.html.includes('cmp-table')
    && r.text.split('\n').some((l) => l.includes('Alpha') && l.includes('Beta'))
    && r.md.split('\n').some((l) => l.startsWith('|') && l.includes('Alpha') && l.includes('Beta')));
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
  check(`${label}: all targets agree, reason "${reason}"`,
    r.same && r.h.length === 1 && r.h[0] === `set|${model.set._items.length}|${reason}`,
    `html=${JSON.stringify(r.h)} text=${JSON.stringify(r.t)} md=${JSON.stringify(r.m)}`);
}
// B7. a lone marked leaf: ≥2 entities is required, and all targets say so.
{
  const r = agree(compareNode([{ _name: { text: 'A' }, _rating: { num: 1 } }]));
  check('B7 fewer-than-2-entities: all targets agree',
    r.same && r.h.length === 1 && r.h[0] === 'set|1|fewer-than-2-entities',
    `html=${JSON.stringify(r.h)} text=${JSON.stringify(r.t)} md=${JSON.stringify(r.m)}`);
}

// C. form name: the shared `selectForm` classifies the set, and BOTH targets render
// that same form (so neither can drift to a different form without failing here).
const formCases = [
  ['C1 comparable typed records ⇒ table', listNode([
    { _name: { text: 'Basic' }, _fields: { price: { money: 9.99, currency: 'USD' }, seats: { num: 1 } } },
    { _name: { text: 'Pro' }, _fields: { price: { money: 19.99, currency: 'USD' }, seats: { num: 5 } } },
  ]), undefined, 'table', (r) => r.html.includes('<table class="data"')
    && r.text.includes('Basic') && r.text.includes('$9.99')
    && r.md.split('\n').some((l) => l.startsWith('|') && l.includes('Basic') && l.includes('$9.99'))],
  ['C2 consecutive `_text` members ⇒ prose', listNode([
    { _text: { text: 'para one' } }, { _text: { text: 'para two' } },
  ]), undefined, 'prose', (r) => r.html.includes('<div class="prose"') && r.text.includes('para one') && r.md.includes('para one')],
  ['C3 ordered label-only set ⇒ seq', listNode([
    { _name: { text: 'Step' } }, { _name: { text: 'Next' } },
  ], { order: 'sequence' }), 'sequence', 'seq', (r) => r.html.includes('<ol class="seq"') && r.text.includes('1. Step') && r.md.includes('1. Step')],
  ['C4 image-only members ⇒ image-strip', listNode([
    { _image: { image: 'a.png', alt: 'ALT' } },
  ]), undefined, 'image-strip', (r) => r.html.includes('<figure class="strip"') && r.text.includes('[图片] ALT') && r.md.includes('![ALT](a.png)')],
  ['C5 non-comparable members ⇒ stack', listNode([
    { _name: { text: 'Alpha' }, _detail: { text: 'first block' } },
    { _name: { text: 'Beta' }, _summary: { text: 'second' } },
  ]), undefined, 'stack', (r) => r.html.includes('<section class="block"')
    && r.md.includes('Alpha') && r.md.includes('Beta')
    && /^\s*#{1,6}\s+Alpha$/m.test(r.md) && /^\s*#{1,6}\s+Beta$/m.test(r.md)],
];
for (const [label, model, order, form, signature] of formCases) {
  const items = model.list._items;
  const chosen = selectForm(items, order);
  const r = agree(model);
  check(`${label}: shared selectForm + all targets agree`,
    chosen === form && signature(r),
    `form=${chosen} expected=${form} html=${r.html.includes('<table')} md=${r.md.split('\n').find((l) => l.startsWith('| '))}`);
}

check('C6 `comparable` is the same function the form gate uses',
  comparable([{ _name: { text: 'A' }, _rating: { num: 1 } }, { _name: { text: 'B' }, _rating: { num: 2 } }]) === true
  && comparable([{ _name: { text: 'A' }, _detail: { text: 'x' } }, { _name: { text: 'B' } }]) === false,
  'comparable() disagreed with expectation');
check('C7 `compareSetVerdict` returns ok:true for a dense set',
  compareSetVerdict([
    { _name: { text: 'A' }, _rating: { num: 1 } }, { _name: { text: 'B' }, _rating: { num: 2 } },
  ]).ok === true);

// D. choice-set form (round 22). Before this round `_expose` was TWO axis decisions: HTML made
// a select table when the options carried attributes, text/Markdown made an option list. Now
// there is ONE plan decision (`choice.kind === 'choice'`), and each target only chooses a
// drawing: a select table (HTML) vs an option list (text `( )`, Markdown `- ( )`).
{
  const model = { _intent: 'x', _title: { text: 'Pick' }, pick: {
    _intent: 'p', _label: { text: 'Size' }, _expose: { name: 'size', type: 'text' }, _items: [
      { _name: { text: 'Small' }, _detail: { text: 'fits' } },
      { _name: { text: 'Large' }, _detail: { text: 'roomy' } },
    ] } };
  const p = nodePlan(model.pick, { chain: [], values: {}, depth: 1 });
  const h = []; const html = render(model, {}, h);
  const t = []; const text = renderText(model, {}, t);
  const m = []; const md = renderMarkdown(model, {}, m);
  check('D1 one shared choice-set decision for every target',
    p.ok && p.choice && p.choice.kind === 'choice' && p.choice.rich === true && p.choice.multi === false,
    JSON.stringify(p.choice && { kind: p.choice.kind, rich: p.choice.rich, multi: p.choice.multi }));
  check('D2 HTML draws the shared decision as a select table',
    html.includes('table class="data"') && html.includes('type="radio"') && html.includes('Small') && html.includes('fits'),
    'no select table');
  check('D3 text draws the shared decision as an option list',
    text.includes('( ) Small') && text.includes('( ) Large'), 'no option list');
  check('D4 Markdown draws the shared decision as an option list',
    md.includes('- ( ) Small') && md.includes('- ( ) Large'), 'no option list');
}

// E. corpus-wide: on the real curated models, all three targets must record the SAME
// compare-set degradation list AND draw the SAME compare-table header set (round 23).
// The header half is the explicit three-target assertion the round-22 residual asked for:
// for every compare entity on every real page, each of its header attributes (name/tag/
// price/subtitle/summary) reaches ALL THREE outputs — no target silently drops one.
const plainValue = (v) => {
  if (v == null) return null;
  if (typeof v !== 'object') return String(v);
  if ('text' in v) return String(v.text ?? '');
  if ('num' in v) return String(v.num ?? '');
  if ('money' in v) return String(v.money ?? '');
  if ('date' in v) return String(v.date ?? '');
  return null;
};
const escaped = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const containsHeaderValue = (out, v) => {
  const t = plainValue(v);
  if (!t || !t.trim()) return true;
  return out.includes(t) || out.includes(escaped(t));
};
const compareEntities = (model) => {
  const out = [];
  const isCompareSet = (n) => n && typeof n === 'object' && !Array.isArray(n)
    && (n._rel?.compare === true || (Array.isArray(n._items) && n._items.some((it) => it?._rel?.compare === true)));
  (function walk(n) {
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (!n || typeof n !== 'object') return;
    if (isCompareSet(n) && Array.isArray(n._items)) out.push(...n._items.filter((it) => it && typeof it === 'object'));
    for (const v of Object.values(n)) walk(v);
  })(model);
  return out;
};
const headerHalf = () => {
  const scale = JSON.parse(fs.readFileSync(path.join(root, 'm1', 'eval', 'm3-scale.json'), 'utf8')).filter((x) => x.tier === 'exemplar');
  let decisionMismatch = 0, headerMismatch = 0, n = 0, entities = 0;
  for (const r of scale) {
    const mp = path.join(root, 'm1', 'curated', `${r.k}.json`);
    if (!fs.existsSync(mp)) continue;
    const model = JSON.parse(fs.readFileSync(mp, 'utf8'));
    const h = []; const html = render(model, {}, h);
    const t = []; const text = renderText(model, {}, t);
    const m = []; const md = renderMarkdown(model, {}, m);
    n++;
    if (JSON.stringify(h) !== JSON.stringify(t) || JSON.stringify(h) !== JSON.stringify(m)) decisionMismatch++;
    for (const it of compareEntities(model)) {
      entities++;
      for (const e of compareHeaderEntries(it)) {
        if (!containsHeaderValue(html, e.value) || !containsHeaderValue(text, e.value) || !containsHeaderValue(md, e.value)) headerMismatch++;
      }
    }
  }
  return { n, entities, decisionMismatch, headerMismatch };
};

// E0. the decision itself: a full entity yields exactly the canonical header key set, and
// `_name`/`_title` collapse to one name slot (never both).
{
  const full = { _name: { text: 'N' }, _title: { text: 'T' }, _tag: { text: 'g' }, _price: { money: 1, currency: 'USD' }, _subtitle: { text: 's' }, _summary: { text: 'm' } };
  const keys = compareHeaderEntries(full).map((e) => e.key);
  check('E0 compareHeaderEntries yields the canonical header key set (name collapses)',
    JSON.stringify(keys) === JSON.stringify(['_name', '_tag', '_price', '_subtitle', '_summary'])
    && COMPARE_HEADER_KEYS.includes('_tag') && COMPARE_HEADER_KEYS.includes('_subtitle')
    && compareHeaderEntries({ _title: { text: 'T' } }).map((e) => e.key).join(',') === '_title',
    JSON.stringify(keys));
}
// E1/E2. corpus: same axis decision in every target, and every header attribute of every
// real compare entity reaches all three outputs.
{
  const { n, entities, decisionMismatch, headerMismatch } = headerHalf();
  check(`E1 all ${n} curated models make the same axis decision in every target`, decisionMismatch === 0, `${decisionMismatch} mismatched`);
  check(`E2 all ${entities} compare entities draw the same header set in every target`, headerMismatch === 0, `${headerMismatch} mismatched header values`);
}

// F. constructed compare set carrying ALL five header attributes (round 23). The strongest
// form of "one decision, three drawings": the SAME attribute set must appear in ALL THREE
// outputs. A target that drops `_tag`/`_subtitle`/`_summary` — or draws a different set —
// fails here even though the fidelity gate might not notice on a page without those keys.
{
  const ent = (n, tag, price, sub, sum) => ({
    _key: 'e' + n, _name: { text: 'EntName' + n }, _tag: { text: tag },
    _price: { money: price, currency: 'USD' }, _subtitle: { text: sub }, _summary: { text: sum },
    _rating: { num: 4 + n / 10 },
  });
  const model = compareNode([ent(1, 'TagOne', '11.11', 'SubOne', 'SumOne'), ent(2, 'TagTwo', '22.22', 'SubTwo', 'SumTwo')]);
  const r = agree(model);
  const vals = ['EntName1', 'TagOne', '11.11', 'SubOne', 'SumOne'];
  const seen = (out) => vals.map((v) => containsHeaderValue(out, { text: v }) || out.includes(v));
  const allTrue = vals.map(() => true);
  check('F1 the shared header function yields the canonical set for a full entity',
    JSON.stringify(compareHeaderEntries(model.set._items[0]).map((e) => e.key))
      === JSON.stringify(['_name', '_tag', '_price', '_subtitle', '_summary']),
    JSON.stringify(compareHeaderEntries(model.set._items[0]).map((e) => e.key)));
  check('F2 all three targets draw every header attribute (identical set)',
    JSON.stringify(seen(r.html)) === JSON.stringify(allTrue)
    && JSON.stringify(seen(r.text)) === JSON.stringify(allTrue)
    && JSON.stringify(seen(r.md)) === JSON.stringify(allTrue),
    `html=${JSON.stringify(seen(r.html))} text=${JSON.stringify(seen(r.text))} md=${JSON.stringify(seen(r.md))}`);
}

// G. compare-set ROW LABEL: one decision, three drawings (round 24). The chain
// (row's child title/name → shared role vocabulary → domain field dictionary → empty) is
// the same for every target; these halves fail if a target prints a different label for
// the same row, INCLUDING the case where every target must print an empty label.
const htmlRowLabels = (html) => [...html.matchAll(/<th class="cmp-row">([^<]*)<\/th>/g)].map((m) => m[1]);
const htmlRowLabelOf = (html, cell) => {
  const i = html.indexOf(cell);
  if (i < 0) return null;
  const ms = [...html.slice(0, i).matchAll(/<th class="cmp-row">([^<]*)<\/th>/g)];
  return ms.length ? ms[ms.length - 1][1] : null;
};
const textRowLabelOf = (text, cell) => {
  const line = text.split('\n').find((l) => l.includes(cell));
  if (line == null) return null;
  const t = line.trimStart();
  if (t.startsWith(cell)) return '';
  const cut = t.indexOf(cell);
  return cut < 0 ? null : t.slice(0, cut).replace(/\s+$/, '');
};
const mdRowLabelOf = (md, cell) => {
  const line = md.split('\n').find((l) => l.startsWith('|') && l.includes(cell));
  return line == null ? null : (line.split('|')[1] ?? '').trim();
};
const rowLabelCase = (label, items, key, cell, expect) => {
  const r = agree(compareNode(items));
  const got = { html: htmlRowLabelOf(r.html, cell), md: mdRowLabelOf(r.md, cell) };
  // text: a node cell renders multi-line, so the exact "label immediately before the cell"
  // probe only works for single-line rows; fall back to "a line begins with this label".
  const textExact = textRowLabelOf(r.text, cell);
  const textOk = expect === '' ? textExact === '' : new RegExp('^\\s*' + expect.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=\\s|$)', 'm').test(r.text);
  check(`${label}: shared decision says ${JSON.stringify(expect)}`,
    resolveRowLabel(items, key) === expect, `resolveRowLabel=${JSON.stringify(resolveRowLabel(items, key))}`);
  check(`${label}: all three targets print ${JSON.stringify(expect)}`,
    got.html === expect && got.md === expect && textOk,
    `html=${JSON.stringify(got.html)} text=${JSON.stringify(textExact)} md=${JSON.stringify(got.md)}`);
};
// G1 role-fact row (the airbnb case): no child title ⇒ the shared role vocabulary names it.
rowLabelCase('G1 role-fact row', [
  { _name: { text: 'A' }, _rating: { num: 4.8 } },
  { _name: { text: 'B' }, _rating: { num: 4.9 } },
], '_rating', '4.8', '评分');
// G2 child block's own title wins over the vocabulary.
rowLabelCase('G2 child-title row', [
  { _name: { text: 'A' }, widget: { _title: { text: '部件' }, _detail: { text: 'W1' } } },
  { _name: { text: 'B' }, widget: { _title: { text: '部件' }, _detail: { text: 'W2' } } },
], 'widget', 'W1', '部件');
// G3 declared domain field ⇒ its own dictionary label.
rowLabelCase('G3 domain-field row', [
  { _name: { text: 'A' }, _fields: { email: { text: 'zz@zz' } } },
  { _name: { text: 'B' }, _fields: { email: { text: 'yy@yy' } } },
], 'email', 'zz@zz', 'Email');
// G4 no label anywhere ⇒ ALL THREE must print an empty row label together.
rowLabelCase('G4 unlabeled row', [
  { _name: { text: 'A' }, widget: { _detail: { text: 'W1' } } },
  { _name: { text: 'B' }, widget: { _detail: { text: 'W2' } } },
], 'widget', 'W1', '');

// G5/G6. corpus: on every real curated page, every resolved compare-set row label must
// reach every target. G5 is exact for HTML (the label must appear in a row-header cell,
// not merely somewhere on the page — plain `includes` would have passed the airbnb bug
// because `总体评分` happens to contain `评分`).
const compareGroups = (model) => {
  const out = [];
  (function visit(node, chain, depth) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    const plan = nodePlan(node, { chain, values: {}, depth });
    if (!plan.visible) return;
    for (const g of plan.items.groups) {
      if (g.form === 'compare-table') out.push(g);
      for (const it of g.items) visit(it, [...chain, node], depth + 1);
    }
    if (plan.emptyState) visit(plan.emptyState, [...chain, node], depth + 1);
    for (const c of plan.namedChildren) visit(c.node, [...chain, node], depth + 1);
  })(model, [], 0);
  return out;
};
{
  const scale = JSON.parse(fs.readFileSync(path.join(root, 'm1', 'eval', 'm3-scale.json'), 'utf8')).filter((x) => x.tier === 'exemplar');
  let tables = 0, rows = 0, htmlMiss = 0, anywhereMiss = 0;
  for (const r of scale) {
    const mp = path.join(root, 'm1', 'curated', `${r.k}.json`);
    if (!fs.existsSync(mp)) continue;
    const model = JSON.parse(fs.readFileSync(mp, 'utf8'));
    const h = []; const html = render(model, {}, h);
    const t = []; const text = renderText(model, {}, t);
    const m = []; const md = renderMarkdown(model, {}, m);
    const inRowHeader = new Set(htmlRowLabels(html).filter(Boolean));
    for (const g of compareGroups(model)) {
      tables++;
      for (const key of compareRowKeys(g.items)) {
        const label = resolveRowLabel(g.items, key);
        if (!label) continue;                                // empty is covered by G4
        rows++;
        if (!inRowHeader.has(label)) htmlMiss++;
        if (!text.includes(label) || !md.includes(label)) anywhereMiss++;
      }
    }
  }
  check(`G5 all ${rows} resolved compare row labels on ${tables} real compare tables appear as HTML row headers`, htmlMiss === 0, `${htmlMiss} missing from HTML row headers`);
  check(`G6 all ${rows} resolved compare row labels reach all three targets`, anywhereMiss === 0, `${anywhereMiss} missing from text/Markdown`);
}

// H. ACTION ROW: one decision, three drawings (round 27). The row grouping and the primary
// CTA are decided once (`nodePlan().actionRow`); each target only chooses the drawing — HTML
// `.action`/`.ctl` in one `.controls`, text `*[primary] [secondary]` on one line, Markdown a
// bold primary link beside the rest. These halves fail if any target re-groups or re-orders.
const actionLabels = (row) => row.map((c) => c.label);
const htmlActionRow = (html) => {
  const m = html.match(/<div class="controls">([\s\S]*?)<\/div>/);
  if (!m) return null;
  return [...m[1].matchAll(/<(a|span) class="([^"]*)"[^>]*>([^<]*)<\/\1>/g)].map((x) => ({ cls: x[2], label: x[3] }));
};
const rowLine = (out, labels) => out.split('\n').find((l) => labels.every((x) => l.includes(x))) ?? null;
{
  const model = {
    _intent: 'x', _title: { text: 'Actions' },
    hero: {
      _intent: 'h', _title: { text: 'iPhone' },
      _action: { verb: 'open', label: 'Learn more', to: 'https://x.test/learn' },
      buy: { _title: { text: 'Buy' }, _action: { verb: 'buy', label: 'Buy', to: 'https://x.test/buy' } },
    },
  };
  const plan = nodePlan(model.hero, { chain: [], values: {}, depth: 1 });
  const labels = actionLabels(plan.actionRow);
  const primaryLabel = plan.actionRow.find((c) => c.primary)?.label;
  const html = render(model);
  const text = renderText(model);
  const md = renderMarkdown(model);
  const hRow = htmlActionRow(html);
  check('H0 the shared row holds both controls with exactly one primary',
    labels.length === 2 && labels[0] === 'Learn more' && labels[1] === 'Buy' && primaryLabel === 'Buy',
    JSON.stringify(plan.actionRow));
  check('H1 HTML draws that one row (own=ctl, inner commit=action)',
    Boolean(hRow) && hRow.map((x) => x.label).join('|') === labels.join('|')
    && hRow.filter((x) => /(^|\s)action(\s|$)/.test(x.cls)).length === 1
    && hRow.find((x) => /(^|\s)action(\s|$)/.test(x.cls)).label === primaryLabel,
    JSON.stringify(hRow));
  const tLine = rowLine(text, labels);
  const tPrimary = tLine ? (tLine.match(/\*\[([^\]]*)\]/) || [])[1] : null;
  check('H2 text draws that one row on one line, primary marked once',
    Boolean(tLine) && tPrimary === primaryLabel && (tLine.match(/\*\[/g) || []).length === 1,
    `line=${JSON.stringify(tLine)}`);
  const mLine = rowLine(md, labels);
  const mPrimary = mLine ? (mLine.match(/\*\*\[([^\]]*)\]/) || [])[1] : null;
  check('H3 Markdown draws that one row on one line, primary bold once',
    Boolean(mLine) && mPrimary === primaryLabel && (mLine.match(/\*\*\[/g) || []).length === 1,
    `line=${JSON.stringify(mLine)}`);
}
// H4. corpus: on every curated page, the number of multi-control rows the shared decision
// yields equals the number of grouped rows each of text and Markdown actually draws. A target
// that splits a row into pieces, drops a lone toolbar child, or groups without the decision
// changes the count and fails here even when no constructed case covers that page.
// Only nodes the node renderer actually draws count. A collection member in an inline form
// (list/deflist/table/chips/controls/compare-table entity) is a cell, not a node block, and
// its action row is drawn by that form in every target — so it must not be counted here.
const NODE_FORMS = new Set(['cards', 'product-cards', 'stack']);
const multiActionRows = (model) => {
  let multi = 0;
  (function visit(node, chain, depth) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    const plan = nodePlan(node, { chain, values: {}, depth });
    if (!plan.visible) return;
    if (plan.actionRow.length > 1) multi++;
    for (const g of plan.items.groups) {
      if (g.form === 'compare-table') continue;
      if (NODE_FORMS.has(g.form) || (g.form === 'table' && !runPlan(g.items).isTable))
        for (const it of g.items) visit(it, [...chain, node], depth + 1);
    }
    if (plan.emptyState) visit(plan.emptyState, [...chain, node], depth + 1);
    const consumed = new Set(plan.rowConsumed);
    for (const c of plan.namedChildren) if (!consumed.has(c.node)) visit(c.node, [...chain, node], depth + 1);
  })(model, [], 0);
  return multi;
};
{
  const scale = JSON.parse(fs.readFileSync(path.join(root, 'm1', 'eval', 'm3-scale.json'), 'utf8')).filter((x) => x.tier === 'exemplar');
  let pages = 0, rows = 0, textMiss = 0, mdMiss = 0;
  for (const r of scale) {
    const mp = path.join(root, 'm1', 'curated', `${r.k}.json`);
    if (!fs.existsSync(mp)) continue;
    const model = JSON.parse(fs.readFileSync(mp, 'utf8'));
    const n = multiActionRows(model);
    if (!n) continue;
    pages++; rows += n;
    const text = renderText(model);
    const md = renderMarkdown(model);
    const tCount = text.split('\n').filter((l) => l.includes('*[')).length;
    const mCount = (md.match(/\*\*\[/g) || []).length;
    if (tCount !== n) textMiss++;
    if (mCount !== n) mdMiss++;
  }
  check(`H4 all ${rows} multi-control rows on ${pages} curated pages are grouped in text`, textMiss === 0, `${textMiss} pages mismatched`);
  check(`H5 all ${rows} multi-control rows on ${pages} curated pages are grouped in Markdown`, mdMiss === 0, `${mdMiss} pages mismatched`);
}

console.log(`\n轴一致性自测(三目标): ${bad === 0 ? '全部通过' : `待修 ${bad}`} (${assertions} 条断言)`);
process.exit(bad ? 1 : 0);
