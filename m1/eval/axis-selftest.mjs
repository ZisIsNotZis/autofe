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
import { selectForm, comparable, compareSetVerdict, nodePlan, runPlan, compareHeaderEntries, compareRowKeys, resolveRowLabel, COMPARE_HEADER_KEYS, rankedSequence, isVisibleFieldName, hasValue, tableRowLabel, exposeRendersAsControl } from '../axis.mjs';

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
  // round 47: the declared-but-empty decision
  'hasValue', 'tableRowLabel',
  // round 49: `_expose` is a control on a plain node, declared state on a composite (F-092)
  'exposeRendersAsControl',
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
// Round 32: a multi-control row with NO commitment verb has no primary (docs §4.1), so the
// marker count can only be pinned for rows that DO have a shared primary; H6/H7 cover the
// primary-less rows in a constructed model.
// Only nodes the node renderer actually draws count. A collection member in an inline form
// (list/deflist/table/chips/controls/compare-table entity) is a cell, not a node block, and
// its action row is drawn by that form in every target — so it must not be counted here.
const NODE_FORMS = new Set(['cards', 'product-cards', 'stack']);
const primaryActionRows = (model) => {
  let multi = 0;
  (function visit(node, chain, depth) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    const plan = nodePlan(node, { chain, values: {}, depth });
    if (!plan.visible) return;
    if (plan.actionRow.length > 1 && plan.actionRow.some((c) => c.primary)) multi++;
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
    const n = primaryActionRows(model);
    if (!n) continue;
    pages++; rows += n;
    const text = renderText(model);
    const md = renderMarkdown(model);
    const tCount = text.split('\n').filter((l) => l.includes('*[')).length;
    const mCount = (md.match(/\*\*\[/g) || []).length;
    if (tCount !== n) textMiss++;
    if (mCount !== n) mdMiss++;
  }
  check(`H4 all ${rows} multi-control rows with a shared primary on ${pages} curated pages are grouped in text`, textMiss === 0, `${textMiss} pages mismatched`);
  check(`H5 all ${rows} multi-control rows with a shared primary on ${pages} curated pages are grouped in Markdown`, mdMiss === 0, `${mdMiss} pages mismatched`);
}

// I. FORM SELECTION must not swallow declared facts (round 32). A member that carries an
// `_image` or an `_action` is not a help-doc Q&A line: putting it in a `<details>` accordion
// silently drops the image and the control it declared (huawei 推荐信息 lost all four of
// each). Only a bare title+detail(+more facts) member with neither becomes an accordion; a
// titled set with images/actions becomes cards and keeps them, in every target.
{
  const bare = [1, 2, 3, 4].map((i) => ({ _title: { text: `Q${i}` }, _detail: { text: `A${i}` }, _summary: { text: `s${i}` } }));
  const media = bare.map((it, i) => ({ ...it, _image: { image: `https://x.test/${i}.png`, alt: `alt ${i}` }, _action: { verb: 'open', label: '了解更多', to: `https://x.test/${i}` } }));
  check('I0 a bare title+detail set is still an accordion', selectForm(bare) === 'accordion', selectForm(bare));
  check('I1 a titled set whose members carry an image/action is NOT an accordion', selectForm(media) === 'stack', selectForm(media));
  const html = render({ _intent: 'x', _title: { text: 'Top' }, featured: { _intent: 'f', _title: { text: '推荐信息' }, _items: media } });
  const imgs = (html.match(/<img /g) || []).length;
  const ctls = (html.match(/了解更多/g) || []).length;
  check('I2 the members render with every image and every action (no <details>)',
    !html.includes('<details') && imgs === 4 && ctls === 4, `imgs=${imgs} ctls=${ctls}`);
}

// J. PRIMARY CTA is claimed only by a commitment verb (round 32). A row whose controls are
// property actions (`共享` / `添加至心愿单`, both `operate`) must have NO solid primary — the
// old "else the element's own action, else the first" fallback promoted `共享` on
// airbnb-com/room-28871. Text/Markdown draw the same row on one line with no marker.
{
  const model = {
    _intent: 'x', _title: { text: 'Share' },
    actions: {
      _intent: 'a',
      share: { _action: { verb: 'operate', label: '共享' } },
      save: { _action: { verb: 'operate', label: '添加至心愿单' } },
    },
  };
  const plan = nodePlan(model.actions, { chain: ['actions'], values: {}, depth: 1 });
  check('J0 a row with no commitment verb has NO primary',
    plan.actionRow.length === 2 && plan.actionRow.every((c) => !c.primary), JSON.stringify(plan.actionRow));
  const html = render(model);
  check('J1 HTML draws both as secondary .ctl (no solid .action/.action-plain)',
    /<span class="ctl"[^>]*>共享<\/span>/.test(html) && /<span class="ctl"[^>]*>添加至心愿单<\/span>/.test(html)
    && !/<span class="action-plain">共享<\/span>/.test(html) && !/class="action[^"]*"[^>]*>共享/.test(html),
    html.match(/<div class="controls">[\s\S]*?<\/div>/)?.[0] ?? '');
  const tLine = renderText(model).split('\n').find((l) => l.includes('共享') && l.includes('添加至心愿单'));
  check('J2 text draws the same row on one line with no primary marker', Boolean(tLine) && !tLine.includes('*['), JSON.stringify(tLine));
  const mdLine = renderMarkdown(model).split('\n').find((l) => l.includes('共享') && l.includes('添加至心愿单'));
  check('J3 Markdown draws the same row on one line with no bold marker', Boolean(mdLine) && !mdLine.includes('**['), JSON.stringify(mdLine));
}

// K. lead-in / footnote order (round 37). A description fact declared AFTER the collection is
// the collection's footnote and must render BELOW it; the lead-in declared before stays directly
// above. gov-uk register-birth-abroad was split because its trailing `_detail` interrupted the
// lead-in (`…for example when you:`) and its own bullet list.
{
  const model = {
    _intent: 'x', _title: { text: 'T' },
    sec: {
      _intent: 's',
      _summary: { text: '…for example when you:' },
      _items: [{ _name: { text: 'apply for a passport' } }, { _name: { text: 'register with a school or doctor' } }],
      _detail: { text: 'If it’s not in English, translate it.' },
    },
  };
  const plan = nodePlan(model.sec, { chain: [], values: {}, depth: 1 });
  check('K0 the fact declared after the collection is the plan footnote (facts.trailing)',
    plan.facts.trailing.length === 1 && plan.facts.trailing[0].key === '_detail',
    JSON.stringify(plan.facts.trailing.map((f) => f.key)));
  const html = render(model);
  const iS = html.indexOf('for example when you:');
  const iL = html.indexOf('apply for a passport');
  const iD = html.indexOf('If it’s not in English');
  check('K1 HTML draws lead-in → list → footnote (the lead-in stays adjacent to its list)',
    iS >= 0 && iL > iS && iD > iL, `summary=${iS} list=${iL} detail=${iD}`);
}

// L. ranked sequence (round 37; DECLARED in round 39). Only a set DECLARED as a leaderboard
// (`_rel.order: 'rank'`) is numbered; `sequence` is a display order and is never numbered.
// Round 37 guessed "leaderboard" from "no member carries an image"; the declaration replaces
// the guess, so a leaderboard keeps its ordinals when its entries have thumbnails.
{
  const plain = [1, 2, 3].map((i) => ({ _name: { text: `item ${i}` } }));
  const banner = plain.map((it, i) => ({ ...it, _image: { image: `https://x.test/${i}.png`, alt: `a${i}` } }));
  check('L0 a declared leaderboard (rank) is numbered', rankedSequence(plain, 'rank') === true);
  check('L1 a declared leaderboard keeps its ordinals when its entries carry images', rankedSequence(banner, 'rank') === true);
  check('L2 a display sequence is never numbered, even without images', rankedSequence(plain, 'sequence') === false);
  check('L3 a non-ordinal order is never numbered', rankedSequence(plain, 'none') === false);
  const hero = {
    _intent: 'x', _title: { text: 'Hero' },
    hero: { _intent: 'h', _rel: { order: 'sequence' }, _items: banner.map((it) => ({ _name: it._name, _image: it._image, _action: { verb: 'open', label: '了解更多', to: 'https://x.test' } })) },
  };
  const html = render(hero);
  check('L4 a hero-like sequence renders with no ordinals',
    !html.includes('class="rank"') && !/<ol class="seq">/.test(html),
    html.match(/<div class="deflist[^"]*"[^>]*>/)?.[0] ?? '');
  const board = {
    _intent: 'x', _title: { text: 'Board' },
    hot: { _intent: 'h', _rel: { order: 'rank' }, _title: { text: '热榜' }, _items: banner.map((it) => ({ _name: it._name, _image: it._image, _action: { verb: 'open', to: 'https://x.test' } })) },
  };
  const boardHtml = render(board);
  check('L5 a declared leaderboard with thumbnails draws BOTH ordinals and images',
    boardHtml.includes('class="deflist ranked"') && boardHtml.includes('class="rank">1<') && /<img[^>]*src="https:\/\/x\.test\/0\.png"/.test(boardHtml),
    boardHtml.match(/<div class="deflist[^"]*"[^>]*>/)?.[0] ?? '');
}

// M. captured input default value (round 37). `_text` on a bare text input is the field's
// current value and must be drawn as the input's VISIBLE `value` (D-3: a name AND a default).
{
  const model = { _intent: 'x', _title: { text: 'Search' }, query: { _intent: 'q', _label: { text: '请输入关键词' }, _text: { text: '人工智能' }, _expose: { name: 'query', type: 'text' } } };
  const plan = nodePlan(model.query, { chain: [], values: {}, depth: 1 });
  check('M0 the bare text input carries the captured default value', plan.choice?.value?.text === '人工智能', JSON.stringify(plan.choice?.value ?? null));
  const html = render(model);
  check('M1 HTML draws the default value as the input value', /<input[^>]*value="人工智能"/.test(html), html.match(/<input[^>]*>/)?.[0] ?? '');
  check('M2 the default value stays a certified fact in the document', html.includes('人工智能'), '');
}

// N. label vs watermark (round 37 / §6.1 revised). A visible field label stays visible; only
// placeholder/example copy (the source had no visible label) becomes the in-box watermark.
{
  const mk = (label) => ({ _intent: 'x', _title: { text: 'Form' }, field: { _intent: 'f', _label: { text: label }, _expose: { name: 'field', type: 'text' } } });
  const visible = render(mk('邮件地址'));
  check('N0 a visible field label (邮件地址) is NOT demoted to a watermark',
    visible.includes('<span class="deflabel">邮件地址</span>') && !visible.includes('placeholder="邮件地址"'), '');
  const ph = render(mk('请输入关键词'));
  check('N1 placeholder copy (请输入关键词) still becomes the in-box watermark', ph.includes('placeholder="请输入关键词"'), '');
  check('N2 isVisibleFieldName classifies field names, not placeholder copy',
    isVisibleFieldName({ text: 'Password' }) === true && isVisibleFieldName({ text: '说点什么...' }) === false
    && isVisibleFieldName({ text: '邮箱/手机号码/小米ID' }) === true && isVisibleFieldName({ text: '磊哥游戏' }) === false, '');
}

// O. secret field (round 46 / F-046 closed-type addition). `secret` is the semantic "secret
// input": HTML must draw <input type="password">, and the field's value must never be drawn
// in ANY target (no value attr, no sr-only copy); text/Markdown degrade to a `(密码)` placeholder.
{
  const model = { _intent: 'x', _title: { text: 'Login' }, pw: { _intent: 'p', _label: { text: '密码' }, _text: { text: 'hunter2' }, _expose: { name: 'password', type: 'secret' } } };
  const html = render(model);
  check('O0 a `secret` field renders as <input type="password">', /<input[^>]*type="password"/.test(html), html.match(/<input[^>]*>/)?.[0] ?? '');
  check('O1 the secret value never enters the HTML document', !html.includes('hunter2'), '');
  const txt = renderText(model);
  check('O2 the text target shows a secret placeholder, never the value', txt.includes('(密码)') && !txt.includes('hunter2'), txt);
  const md = renderMarkdown(model);
  check('O3 the Markdown target shows a secret placeholder, never the value', md.includes('(密码)') && !md.includes('hunter2'), md);
}

// P. inline body link (round 46 / §9). An `_action` whose label is part of the node's OWN body
// sentence is an INLINE link: HTML draws it inside the sentence and no standalone button appears.
{
  const model = { _intent: 'x', _title: { text: 'Doc' },
    para: { _intent: 'p', _detail: { text: 'You need an approved translator.' },
      _action: { verb: 'open', to: 'https://x.test/t', label: 'approved translator' } } };
  const html = render(model);
  check('P0 an action label embedded in a body sentence renders inline', /<a class="body-link"[^>]*>approved translator<\/a>/.test(html), html);
  check('P1 that inline link is NOT also drawn as a standalone button',
    !/>approved translator<\/a><\/div><a class="action/.test(html) && !/class="ctl"[^>]*>approved translator</.test(html), html);
  const txt = renderText(model);
  check('P2 the text target keeps the sentence and adds no bracketed control',
    txt.includes('approved translator') && !txt.includes('[approved translator]'), txt);
}

// Q. sort control (round 46). A declared sort field is a real control, not a plain fact.
{
  const model = { _intent: 'x', _title: { text: '结果' }, sort: { _intent: 's', _label: { text: '排序' }, _text: { text: '相关性' }, _expose: { name: 'sort', type: 'text' } } };
  const html = render(model);
  check('Q0 a declared sort field renders as an <input> control carrying the current value',
    /<input[^>]*name="sort"[^>]*>/.test(html) && /value="相关性"/.test(html), html.match(/<input[^>]*>/)?.[0] ?? '');
}

// R. time-flow text (弹幕, round 46). `_rel.order = "stream"` renders a compact INLINE flow,
// never the dozens-of-rows vertical wall the plain chips-rows form produced.
{
  const items = Array.from({ length: 40 }, (_, i) => ({ _name: { text: `弹幕第${i}条` } }));
  const model = { _intent: 'x', _title: { text: '视频' }, danmaku: { _intent: 'd', _rel: { order: 'stream' }, _title: { text: '弹幕' }, _items: items } };
  const html = render(model);
  check('R0 a stream renders as an inline compact flow (every item kept)',
    /<div class="stream">/.test(html) && (html.match(/<span class="stream-item">/g) || []).length === 40, '');
  check('R1 a stream is NOT a rows wall', !/class="chips chips-rows"/.test(html), '');
}

// T. declared-but-empty value (round 47 S0.1, docs/m1/composites.md §空值约定). `{text:""}`
// means "declared but empty" (the aws `data-transfer` group rows get an explicit blank so the
// row key sets are consistent). It must NOT turn the source's group row into a pric-less data
// row — and the value/row decision is shared by all three targets (axis.hasValue/tableRowLabel).
{
  const groupRow = { _fields: { 'transfer-tier': { text: '数据自互联网传入 Amazon EC2' }, 'data-transfer-price': { text: '' } } };
  const dataRow = { _fields: { 'transfer-tier': { text: '每月前 10TB' }, 'data-transfer-price': { money: 0.09, currency: 'USD', qualifier: '每 GB' } } };
  const model = { _intent: 'x', _title: { text: '价格' }, table: { _intent: 't', _title: { text: '数据传输' }, _items: [groupRow, dataRow] } };
  const rp = runPlan([groupRow, dataRow]);
  check('T0 a declared-but-empty cell / list is not a value; 0 / false / text are',
    hasValue({ text: '' }) === false && hasValue({ list: [] }) === false && hasValue(null) === false
    && hasValue({ money: 0 }) === true && hasValue({ text: 'x' }) === true && hasValue({ bool: false }) === true);
  check('T1 the group-row decision is shared: only the first-column value ⇒ group; a real second value ⇒ data row',
    tableRowLabel(rp, groupRow) !== null && tableRowLabel(rp, dataRow) === null);
  const html = render(model);
  check('T2 HTML still draws the explicitly-empty row as a spanning group row',
    /<tr class="row-group"><th colspan="2">数据自互联网传入 Amazon EC2<\/th><\/tr>/.test(html),
    html.match(/<tr class="row-group">[\s\S]*?<\/tr>/)?.[0] ?? '(no group row)');
  check('T2b HTML draws the row with a real price as a normal data row (no row-group)',
    /<tr><td>每月前 10TB<\/td><td>\$0\.09 每 GB<\/td><\/tr>/.test(html),
    html.match(/<tr><td>每月前 10TB[\s\S]*?<\/tr>/)?.[0] ?? '');
  const txt = renderText(model);
  const md = renderMarkdown(model);
  const tLine = txt.split('\n').find((l) => l.includes('数据自互联网传入 Amazon EC2'));
  const mdLine = md.split('\n').find((l) => l.includes('数据自互联网传入 Amazon EC2'));
  check('T3 text makes the same decision (group label on its own line, no phantom price)',
    Boolean(tLine) && tLine.trim() === '数据自互联网传入 Amazon EC2', JSON.stringify(tLine ?? null));
  check('T3b Markdown makes the same decision (label in the first cell, empty second cell)',
    Boolean(mdLine) && /^\|\s*数据自互联网传入 Amazon EC2\s*\|\s*\|/.test(mdLine), JSON.stringify(mdLine ?? null));
}

// U. `_expose` dual meaning (round 49, F-092): on a PLAIN node it is the user's input slot (a
// control); on a COMPOSITE node it is the state the composite declares to the page (referable
// by `_when`/paths), never a widget — the composite's inputs are its schema `fields`. One shared
// decision (`axis.exposeRendersAsControl`) is consumed by every target, so a composite's state
// can never silently become a checkbox on the page.
{
  const composite = { _intent: 'x', _composite: 'login', _expose: { name: 'signed-in', type: 'bool' },
    identifier: { _expose: { name: 'id', type: 'text' } }, secret: { _expose: { name: 'pw', type: 'secret' } }, submit: { _action: { verb: 'submit' } } };
  const canvas = { _intent: 'x', _title: { text: 'Gate' }, gate: composite };
  const plainCanvas = { _intent: 'x', _title: { text: 'Gate' }, gate: { _intent: 'g', _label: { text: 'Signed in' }, _expose: { name: 'signed-in', type: 'bool' } } };
  check('U0 exposeRendersAsControl: composite `_expose` is state (null), plain `_expose` is a control',
    exposeRendersAsControl(composite) === null && exposeRendersAsControl(plainCanvas.gate)?.name === 'signed-in');
  const pc = nodePlan(composite, { chain: [], values: {}, depth: 1 });
  const pp = nodePlan(plainCanvas.gate, { chain: [], values: {}, depth: 1 });
  check('U1 a composite with `_expose` draws NO choice control', pc.ok && pc.choice === null, JSON.stringify(pc.choice));
  check('U2 an isomorphic plain node still draws its control (bool switch)', pp.ok && pp.choice?.kind === 'bool', JSON.stringify(pp.choice && pp.choice.kind));
  const html = render(canvas), text = renderText(canvas), md = renderMarkdown(canvas);
  check('U3 the composite state adds no widget in any target',
    !html.includes('type="checkbox"') && !html.includes('expose-signed-in') && !/\[\s*\]/.test(text) && !/- \[\s*\]/.test(md),
    JSON.stringify({ html: /checkbox/.test(html), text: /\[\s*\]/.test(text), md: /- \[\s*\]/.test(md) }));
  const html2 = render(plainCanvas), text2 = renderText(plainCanvas);
  check('U3b the plain node still renders a checkbox in HTML and `[ ]` in text', html2.includes('type="checkbox"') && text2.includes('[ ]'), 'control missing for the plain node');
  // the state is still a referable FACT: a descendant `_when` on it is gated by its value
  const gated = { ...composite, note: { _intent: 'n', _when: 'signed-in', _text: { text: 'dashboard' } } };
  const seen = (v) => nodePlan(gated.note, { chain: [gated], values: { 'signed-in': v }, depth: 2 }).visible;
  check('U4 the composite state is referable by `_when` (true⇒visible, false/undefined⇒hidden)',
    seen(true) === true && seen(false) === false && seen(undefined) === false, JSON.stringify([seen(true), seen(false), seen(undefined)]));
}

console.log(`\n轴一致性自测(三目标): ${bad === 0 ? '全部通过' : `待修 ${bad}`} (${assertions} 条断言)`);
process.exit(bad ? 1 : 0);
