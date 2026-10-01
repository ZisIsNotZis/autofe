// Composite-metaphor self-test (round 47, docs/m1/composites.md §2/§3/§4).
// A gate that can never fail is not a gate (F-040): this pins the validator's composite
// behaviour — unknown type / missing required part / nesting / undeclared field slot /
// cardinality / table row consistency / unresolved path references — with inline fixtures,
// and pins that a legal instance passes. The registry (m1/composites.json) is the single
// closed source of truth; the codes asserted here are the contract S2–S6 migrate onto.
// Usage: node m1/eval/composite-selftest.mjs
import { validate } from '../validate.mjs';

const REJECT = [
  ['unknown _composite type', { _intent: 'x', _composite: 'searchbox', _label: { text: 's' } }, 'E_COMPOSITE_UNKNOWN_TYPE'],
  ['missing required field (search has no name)', { _intent: 'x', _composite: 'search', query: { _expose: { name: 'q', type: 'text' } } }, 'E_COMPOSITE_MISSING_REQUIRED'],
  ['nested composite', { _intent: 'x', _composite: 'search', _label: { text: 's' }, query: { _expose: { name: 'q', type: 'text' }, _composite: 'form' } }, 'E_COMPOSITE_NESTED'],
  ['undeclared field slot on a search (_items)', { _intent: 'x', _composite: 'search', _label: { text: 's' }, query: { _expose: { name: 'q', type: 'text' } }, _items: [{ _text: { text: 'z' } }] }, 'E_COMPOSITE_NOT_ALLOWED'],
  ['form with a single field (needs ≥2)', { _intent: 'x', _composite: 'form', one: { _expose: { name: 'a', type: 'text' } }, submit: { _action: { verb: 'submit' } } }, 'E_COMPOSITE_BAD_FIELD'],
  ['_default that is not a closed typed value', { _intent: 'x', _composite: 'search', _label: { text: 's' }, _default: 'abc', query: { _expose: { name: 'q', type: 'text' } } }, 'E_COMPOSITE_BAD_FIELD'],
  ['login never declares its signed-in state', { _intent: 'x', _composite: 'login', identifier: { _expose: { name: 'id', type: 'text' } }, secret: { _expose: { name: 'pw', type: 'secret' } }, submit: { _action: { verb: 'submit' } } }, 'E_COMPOSITE_EXPOSE_MISSING'],
  ['login missing its secret part', { _intent: 'x', _composite: 'login', _expose: { name: 'signed-in', type: 'bool' }, identifier: { _expose: { name: 'id', type: 'text' } }, submit: { _action: { verb: 'submit' } } }, 'E_COMPOSITE_MISSING_REQUIRED'],
  ['login with two submit actions', { _intent: 'x', _composite: 'login', _expose: { name: 'signed-in', type: 'bool' }, identifier: { _expose: { name: 'id', type: 'text' } }, secret: { _expose: { name: 'pw', type: 'secret' } }, submit: { _action: { verb: 'submit' } }, again: { _action: { verb: 'operate' } } }, 'E_COMPOSITE_ACTION_CARDINALITY'],
  ['table rows with inconsistent field sets', { _intent: 'x', _composite: 'table', _title: { text: 't' }, _items: [{ _fields: { 'first-name': { text: 'A' }, 'last-name': { text: 'B' } } }, { _fields: { 'first-name': { text: 'C' } } }] }, 'E_COMPOSITE_ROWS_INCONSISTENT'],
  ['table field not declared in vocab-fields.json', { _intent: 'x', _composite: 'table', _title: { text: 't' }, _items: [{ _fields: { 'first-name': { text: 'A' }, 'nope-col': { text: 'B' } } }, { _fields: { 'first-name': { text: 'C' }, 'nope-col': { text: 'D' } } }] }, 'E_COMPOSITE_FIELD_UNDECLARED'],
  ['paginator whose _ref resolves to nothing', { _intent: 'x', _composite: 'paginator', _ref: { ref: '/no/such/collection' }, _items: [{ _text: { text: 'Next' } }] }, 'E_COMPOSITE_REF_UNRESOLVED'],
  ['condition dot-path that resolves to no node', { _intent: 'x', _key: 'k', _title: { text: 't' }, _when: 'nope.thing' }, 'E_PATH_UNRESOLVED'],
  ['condition dot-path ending at a plain group (not a fact)', { _intent: 'x', _key: 'k', _title: { text: 't' }, wrap: { _intent: 'w', inner: { _intent: 'i', _text: { text: 'y' } } }, _when: 'wrap.inner' }, 'E_PATH_NOT_A_FACT'],
];

const ACCEPT = [
  ['a legal search instance', { _intent: 'x', _key: 's', _composite: 'search', _label: { text: '搜索' }, query: { _expose: { name: 'query', type: 'text' } } }],
  ['a legal login instance', { _intent: 'x', _key: 'l', _composite: 'login', _title: { text: 'Sign in' }, _expose: { name: 'signed-in', type: 'bool' }, identifier: { _expose: { name: 'id', type: 'text' } }, secret: { _expose: { name: 'pw', type: 'secret' } }, submit: { _action: { verb: 'submit' } } }],
  ['a legal table instance (consistent rows, declared fields)', { _intent: 'x', _key: 't', _composite: 'table', _title: { text: 'tbl' }, _items: [{ _fields: { 'first-name': { text: 'A' }, 'last-name': { text: 'B' } } }, { _fields: { 'first-name': { text: 'C' }, 'last-name': { text: 'D' } } }] }],
  ['a legal paginator instance', { _intent: 'x', _key: 'pg', _composite: 'paginator', _ref: { ref: '/results' }, _items: [{ _key: '1', _text: { text: '1' } }], results: { _intent: 'r', _items: [{ _text: { text: 'row' } }] } }],
  ['a dot-path condition climbing to the search instance (search.query)', { _intent: 'x', _key: 'p', _title: { text: '页' }, search: { _intent: 'r', _key: 's', _composite: 'search', _label: { text: '搜索' }, query: { _expose: { name: 'q', type: 'text' } } }, go: { _intent: '跳', _when: 'search.query', _text: { text: 'x' } } }],
];

let bad = 0;
const total = REJECT.length + ACCEPT.length;
for (const [name, model, code] of REJECT) {
  const r = validate(model);
  const hit = r.ok ? null : r.errors.find((e) => e.code === code);
  if (hit) console.log(`ok   rejects: ${name}  (${hit.path}: ${code})`);
  else {
    bad++;
    console.log(`FAIL must-reject [${code}]: ${name} — ${r.ok ? 'the validator accepted it' : `rejected without ${code}: ${r.errors.map((e) => `${e.code ?? '-'}@${e.path}`).join(', ')}`}`);
  }
}
for (const [name, model] of ACCEPT) {
  const r = validate(model);
  if (r.ok) console.log(`ok   accepts: ${name}`);
  else { bad++; console.log(`FAIL must-accept: ${name} — ${r.errors.map((e) => `${e.path}: ${e.message}`).join(' | ')}`); }
}
console.log(`\n复合元语自测: ${total - bad}/${total} 通过${bad ? ` | 待修 ${bad}` : ''}`);
process.exit(bad ? 1 : 0);
