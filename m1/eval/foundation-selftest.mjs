// M4-a foundation self-test: constructed assertions for the three engine defects
//   D1 — an `_expose` fact is referenceable by conditions (and is not, when unset)
//   D2 — `_rel.compare` is position-independent: ≥2 entities ⇒ a comparison table,
//        or an explicit degradation reason (never a silent transformation)
//   D3 — the renderer performs no business arithmetic on money
// Usage: node m1/eval/foundation-selftest.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, renderWithAudit } from '../render.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
let bad = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`ok   ${name}`);
  else { bad++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
};

// ---- D1: `_expose` facts are in scope, bound by the injected context ---------
const ANT = JSON.parse(fs.readFileSync(path.join(root, 'm1/models/ant-design/components-table.json'), 'utf8'));
const BATCH = 'Batch operations apply to every selected row.';
check('D1 unset selection ⇒ the gated block does not render', !render(ANT).includes(BATCH));
check('D1 selected=[] ⇒ the gated block does not render', !render(ANT, { values: { selected: [] } }).includes(BATCH));
check('D1 selected=[john] ⇒ the gated block renders', render(ANT, { values: { selected: ['person-john-brown'] } }).includes(BATCH));
const one = { _intent: 'x', _title: { text: 't' }, _expose: { name: 'pick', type: 'text' }, body: { _intent: 'b', _when: 'pick', _summary: { text: 'PICKED' } } };
check('D1 unset single expose ⇒ falsy', !render(one).includes('PICKED'));
check('D1 injected single expose ⇒ truthy', render(one, { values: { pick: 'a' } }).includes('PICKED'));

// ---- D2: position-independence (marker on the collection ≡ on its entities) --
const collection = (itemMarker) => ({
  _intent: 'compare', _title: { text: 'Pick one' },
  _rel: { compare: true },
  _items: [
    { _key: 'a', _name: { text: 'Alpha' }, _detail: { text: 'first' } },
    { _key: 'b', _name: { text: 'Beta' }, _detail: { text: 'second' } },
  ].map((it) => (itemMarker ? { ...it, _rel: { compare: true } } : it)),
});
const onCollection = render(collection(false));
const onEntities = render({ ...collection(false), _rel: {}, _items: collection(true)._items });
check('D2 marker on the collection ⇒ comparison table', onCollection.includes('<table class="cmp-table">') && onCollection.includes('Alpha') && onCollection.includes('second'));
check('D2 marker on the entities ⇒ the same comparison table', onEntities.includes('<table class="cmp-table">'));
check('D2 position-independent ⇒ byte-identical body', onCollection.replace(/<title>[^<]*<\/title>/, '') === onEntities.replace(/<title>[^<]*<\/title>/, ''));

const noAttrs = { _intent: 'c', _title: { text: 't' }, _rel: { compare: true }, _items: [{ _key: 'a', _name: { text: 'A' } }, { _key: 'b', _name: { text: 'B' } }] };
const deg = renderWithAudit(noAttrs);
check('D2 entities with no comparable attribute degrade explicitly', !deg.html.includes('<table class="cmp-table">') && deg.degradations.length === 1 && deg.degradations[0].reason === 'no-comparable-attribute',
  JSON.stringify(deg.degradations));

// ---- D2: the whole curated library is accounted for -------------------------
const models = [];
for (const site of fs.readdirSync(path.join(root, 'm1/curated')).sort()) {
  const d = path.join(root, 'm1/curated', site);
  if (!fs.statSync(d).isDirectory()) continue;
  for (const f of fs.readdirSync(d).sort()) if (f.endsWith('.json')) models.push([`${site}/${f.replace('.json', '')}`, path.join(d, f)]);
}
const inventory = [];
let silent = 0;
for (const [key, file] of models) {
  const model = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { html, degradations } = renderWithAudit(model);
  // every collection that declares `_rel.compare` and has ≥2 members must show up
  // either as a comparison table or as an explicit degradation
  (function walk(n) {
    for (const c of Object.values(n)) {
      if (!c || typeof c !== 'object' || Array.isArray(c)) continue;
      if (c._rel?.compare === true && Array.isArray(c._items) && c._items.length >= 2 && !html.includes('<table class="cmp-table">') && !degradations.some((d) => d.key === c._key)) silent++;
      walk(c);
    }
  })(model);
  for (const d of degradations) inventory.push(`${key}${d.key ? ' ' + d.key : ''} · n=${d.entities} · ${d.reason}`);
}
check('D2 every curated compare marker is a table or an explicit degradation', silent === 0, `${silent} silent`);
console.log(`\n显式降级清单（compare 标记但成不了对比表）:`);
if (!inventory.length) console.log('  （无）');
for (const r of inventory) console.log('  · ' + r);

// ---- D3: the renderer does no money arithmetic ------------------------------
const src = fs.readFileSync(path.join(root, 'm1/render.mjs'), 'utf8');
check('D3 the renderer compares no money values', !/\.money\s*[<>]/.test(src));
const EARBUDS = JSON.parse(fs.readFileSync(path.join(root, 'm1/curated/mi-com/search-earbuds.json'), 'utf8'));
const ear = render(EARBUDS);
const amounts = [];
(function walk(n) { for (const [k, v] of Object.entries(n)) { if (k === '_amount' && v?.money !== undefined) amounts.push(String(v.money)); else if (v && typeof v === 'object') walk(v); } })(EARBUDS);
check('D3 `_amount` facts still render (as plain facts)', amounts.length > 0 && amounts.every((m) => ear.includes(m)));
check('D3 no strike-through branch survives', !/class="fact was"/.test(ear));

console.log(`\n地基自测: ${bad === 0 ? '全部通过' : `待修 ${bad}`}`);
process.exit(bad ? 1 : 0);
