// Metrics self-test (F-052): the fidelity gate must *see* every typed value,
// including `{money}`/`{list}`/`{num}` held under `_fields` (a table cell).
// Before this pin, `factValues` walked only text/date/num `_fields` entries, so
// aws-amazon/ec2-on-demand's 74 prices and learn-microsoft/vm-sizes' 159 link
// cells were absent from the denominator and "42/42 fidelity 1.00" overstated
// coverage. A gate that cannot fail on a missing cell is not a gate (F-040).
// F-054 pins (bottom half): the gate must be *precise* too — a value is only
// rendered when it is delimited, not when the same characters occur inside a
// longer number/word or in markup the reader never sees.
// Usage: node m1/eval/metrics-selftest.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { render } from '../render.mjs';
import { evaluate } from './metrics.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'autofe-metrics-'));
let seq = 0;
const score = (model, html) => {
  const f = path.join(dir, `m${++seq}.html`);
  fs.writeFileSync(f, html);
  return evaluate(model, f);
};
let bad = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`ok   ${name}`);
  else { bad++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
};

// A node whose cells are `{money}`/`{num}`/`{list}` renders as a table.
const priced = {
  _intent: 'price list', _key: 'pricing', _title: { text: 'Price list' },
  plans: { _intent: 'plans', _items: [
    { _key: 'p1', _name: { text: 'Basic' }, _fields: { price: { money: 9.99, currency: 'USD' }, seats: { num: 1 } } },
    { _key: 'p2', _name: { text: 'Pro' }, _fields: { price: { money: 19.99, currency: 'USD' }, seats: { num: 5 } } },
  ] },
};
const html = render(priced);
check('fixture: `_fields` money cells actually render', html.includes('$9.99') && html.includes('$19.99'));

// The denominator counts title + 2 names + 2 prices + 2 seat numbers.
const ok = score(priced, html);
check('money/num `_fields` cells are in the fact denominator', ok.factsTotal === 7, `factsTotal=${ok.factsTotal}`);
check('a fully rendered model keeps fidelity 1.00', ok.factFidelity === 1, `fidelity=${ok.factFidelity}`);

// The regression pin: delete a money cell from the render ⇒ fidelity must drop.
const tampered = score(priced, html.replace('$9.99', '').replace('$19.99', ''));
check('a `_fields` money value absent from the render ⇒ fidelity < 1.00',
  tampered.factFidelity < 1, `fidelity=${tampered.factFidelity}`);
check('the missing money fact is reported by path',
  tampered.missing.some((m) => m.includes('_fields.price') && m.includes('9.99')), JSON.stringify(tampered.missing));

// Lists under `_fields` are cells too (vm-sizes' `Links` column).
const tagged = {
  _intent: 'tags', _title: { text: 't' },
  things: { _intent: 'g', _items: [
    { _key: 'a', _name: { text: 'Alpha' }, _fields: { tags: { list: [{ text: 'one' }, { text: 'two' }] } } },
    { _key: 'b', _name: { text: 'Beta' }, _fields: { tags: { list: [{ text: 'three' }] } } },
  ] },
};
const th = render(tagged);
const okList = score(tagged, th);
check('list `_fields` elements are in the fact denominator', okList.factsTotal === 6, `factsTotal=${okList.factsTotal}`);
check('a rendered list keeps fidelity 1.00', okList.factFidelity === 1, `fidelity=${okList.factFidelity}`);
const tamperedList = score(tagged, th.replace('>one<', '>X<').replace('>three<', '>X<'));
check('a `_fields` list element absent from the render ⇒ fidelity < 1.00',
  tamperedList.factFidelity < 1, `fidelity=${tamperedList.factFidelity}`);

// ---- F-054: matching is boundary-aware -------------------------------------
// A single-character numeric fact used to be "rendered" as soon as the digit
// appeared anywhere on the page (inside `2026`, `10.5`, `1,000`, a stylesheet or
// a class name). Each pin below fails on the pre-F-054 rule.
const zero = {
  _intent: 'price list', _key: 'pricing', _title: { text: 'Zero' },
  plans: { _intent: 'plans', _items: [
    { _key: 'p1', _name: { text: 'Free' }, _fields: { price: { money: 0, currency: 'USD' } } },
  ] },
};
const zeroHtml = render(zero);
const withoutZero = (s) => s.replace(/\$0(?![\d.,])/g, 'X');   // delete the `$0` cell
// ② a `0` that occurs as `$0` is rendered.
check('fixture: a `{money: 0}` cell renders as $0', zeroHtml.includes('$0'));
check('a `0` occurring in `$0` counts as rendered', score(zero, zeroHtml).factFidelity === 1,
  `fidelity=${score(zero, zeroHtml).factFidelity}`);
// ① a `0` that only occurs inside a longer number is NOT rendered.
for (const token of ['2026', '10.5', '1,000']) {
  const r = score(zero, zeroHtml.replace(/\$0(?![\d.,])/g, token));
  check(`a \`0\` occurring only inside \`${token}\` does NOT count as rendered`,
    r.factFidelity < 1 && r.missing.some((m) => m.includes('_fields.price')),
    `fidelity=${r.factFidelity} missing=${JSON.stringify(r.missing)}`);
}
// Neither do digits the reader never sees: stylesheet bodies and attributes.
const styled = score(zero, withoutZero(zeroHtml) + '<p class="depth-0">n/a</p><style>.pad{padding:0 0 0 0}</style>');
check('a `0` occurring only in a class name / stylesheet does NOT count as rendered',
  styled.factFidelity < 1, `fidelity=${styled.factFidelity}`);
// A digit next to its unit is still rendered (CJK units glue onto the number).
const counted = { _intent: 'rated', _key: 'rated', _title: { text: '评价' }, _count: { num: 870 } };
const countedHtml = '<article><h2 class="title">评价</h2><div class="meta">870人好评</div></article>';
check('a number whose unit glues onto it still counts as rendered',
  score(counted, countedHtml).factFidelity === 1, `fidelity=${score(counted, countedHtml).factFidelity}`);
check('the same number inside a longer number does NOT count',
  score(counted, countedHtml.replace('870人', '87041人')).factFidelity < 1);
// Word edges: delimiter-separated text still matches, glued text does not.
const sub = { _intent: 'detail', _key: 'detail', _title: { text: 'Subtitle probe' }, _summary: { text: 'Pro further.' } };
const subHtml = '<article><h2 class="title">Subtitle probe</h2><div class="cmp-sub">Pro further.</div></article>';
check('a multi-word value matches across its own punctuation',
  score(sub, subHtml).factFidelity === 1, `fidelity=${score(sub, subHtml).factFidelity}`);
check('the same value glued into a longer word does NOT count (word edge)',
  score(sub, subHtml.replace('Pro further.', 'Profurtherx')).factFidelity < 1);

console.log(`\n度量自测: ${bad === 0 ? '全部通过' : `待修 ${bad}`}`);
process.exit(bad ? 1 : 0);
