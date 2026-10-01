// Validator self-test (F-040): a gate that can never fail is not a gate.
// The root walk of validate.mjs was accidentally deleted in 6740f1c and every
// node-level rule became dead code for days. This file pins the validator's
// *refusal* behaviour with inline bad models, so that regression can never
// happen silently again. Usage: node m1/eval/validate-selftest.mjs
import { validate } from '../validate.mjs';

const REJECT = [
  ['unknown reserved-style key', { _intent: 'x', _title: { text: 't' }, _bogus: { text: 'b' } }, '_bogus'],
  ['dangling _primary', { _intent: 'x', _title: { text: 't' }, _primary: 'nope', a: { _text: { text: 'a' } } }, '_primary'],
  ['_primary pointing at a named child node (not a role fact)', { _intent: 'x', _key: 'k', _title: { text: 't' }, featured: { _intent: 'f', _text: { text: 'b' } }, _primary: 'featured' }, '_primary'],
  ['_primary pointing at a collection element', { _intent: 'x', _key: 'k', _title: { text: 't' }, _items: [{ _name: { text: 'a' } }], _primary: '_items[0]' }, '_primary'],
  ['_when names an undeclared fact', { _intent: 'x', _title: { text: 't' }, _when: 'count(nope) > 0' }, '_when'],
  ['_expose with an unknown value type', { _intent: 'x', _title: { text: 't' }, _expose: { name: 'q', type: 'whatever' } }, '_expose'],
  ['_rel.order outside the closed enum', { _intent: 'x', _title: { text: 't' }, _rel: { order: 'hot' } }, '_rel.order'],
  ['role value that is not a closed typed value', { _intent: 'x', _title: { text: 't' }, _count: { amount: 3 } }, '_count'],
  ['a storyline group with no _intent', { _title: { text: 't' }, kid: { _intent: 'k', _text: { text: 'k' } } }, '_intent'],
  ['_action verb outside the vocabulary', { _intent: 'x', _title: { text: 't' }, _action: { verb: 'teleport' } }, '_action.verb'],
];

const ACCEPT = [
  ['a minimal legal page', { _intent: 'x', _key: 'k', _title: { text: 't' }, _primary: '_title', _lines: [{ _intent: 'l', _title: { text: 'l' }, _text: { text: 'b' } }] }],
  ['_when naming a declared exposure', { _intent: 'x', _key: 'k', _title: { text: 't' }, _expose: { name: 'picked', type: 'ref', multiple: true }, roster: { _intent: 'r', _items: [{ _key: 'a', _name: { text: 'a' } }], bulk: { _intent: 'b', _when: 'count(picked) > 0', _summary: { text: 's' } } } }],
  ['the closed `secret` value type (round 46)', { _intent: 'x', _key: 'k', _title: { text: 't' }, pw: { _intent: 'p', _label: { text: '密码' }, _expose: { name: 'password', type: 'secret' } } }],
];

let bad = 0;
for (const [name, model, needle] of REJECT) {
  const r = validate(model);
  const hit = r.ok ? null : r.errors.find((e) => e.path.includes(needle) || e.message.includes(needle));
  if (r.ok || !hit) { bad++; console.log(`FAIL must-reject: ${name}${r.ok ? ' — the validator accepted it' : ` — rejected, but not at "${needle}": ${r.errors.map((e) => e.path).join(',')}`}`); }
  else console.log(`ok   rejects: ${name}  (${hit.path}: ${hit.message.slice(0, 72)})`);
}
for (const [name, model] of ACCEPT) {
  const r = validate(model);
  if (!r.ok) { bad++; console.log(`FAIL must-accept: ${name} — ${r.errors.map((e) => `${e.path}: ${e.message}`).join(' | ')}`); }
  else console.log(`ok   accepts: ${name}`);
}
console.log(`\n校验器自测: ${REJECT.length + ACCEPT.length - bad}/${REJECT.length + ACCEPT.length} 通过${bad ? ` | 待修 ${bad}` : ''}`);
process.exit(bad ? 1 : 0);
