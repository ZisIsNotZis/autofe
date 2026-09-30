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

// ---- F-042: an item-level `_action.when` is evaluated (same scope as `_when`) ---
// The condition is read from the same scope the node-level `_when` uses; an unmet
// condition hides only the control, never the member's own name/content.
const gatedItems = (common) => ({
  _intent: 'rows', _title: { text: 'rows' },
  _items: [
    { _key: 'a', ...common, _action: { verb: 'open', label: 'Delete', when: 'role == "admin"', to: '/a' } },
    { _key: 'b', ...common, _action: { verb: 'open', label: 'Delete', when: 'role == "admin"', to: '/b' } },
  ],
});
const dl = gatedItems({ _name: { text: 'Row Alpha' }, _detail: { text: 'detail' } });
check('F-042 item action with an unmet condition is hidden', !render(dl).includes('>Delete<'));
check('F-042 item action with the condition met renders', render(dl, { values: { role: 'admin' } }).includes('>Delete<'));
const ac = gatedItems({ _name: { text: 'Row Alpha' } });
check('F-042 a suppressed control still shows the member name, without its action',
  render(ac).includes('<span class="ctl">Row Alpha</span>') && !render(ac).includes('href="/a"'));
check('F-042 the condition met restores the control target', render(ac, { values: { role: 'admin' } }).includes('href="/a"'));

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

// ---- D2b: a comparison table with no shared attribute row is an empty shell -----
// (the `_rel.compare` declaration is honest, but the entities share no comparable
// attribute: each row is filled by one entity only ⇒ degrade, with an explicit reason)
const sparse = { _intent: 'sparse', _title: { text: 't' }, _rel: { compare: true }, _items: [
  { _key: 'a', _name: { text: 'A' }, _detail: { text: 'only A' } },
  { _key: 'b', _name: { text: 'B' }, _text: { text: 'only B' } },
]};
const sp = renderWithAudit(sparse);
check('D2b a sparse set (no shared attribute row) does not become a table',
  !sp.html.includes('<table class="cmp-table">') && sp.degradations.length === 1 && sp.degradations[0].reason === 'degenerate-no-shared-attribute',
  JSON.stringify(sp.degradations));
// a dense set (every entity declares the same attributes) still becomes a table
const dense = { _intent: 'dense', _title: { text: 't' }, _rel: { compare: true }, _items: [
  { _key: 'a', _name: { text: 'A' }, _fields: { cpu: { num: 2, unit: '核' }, memory: { num: 4, unit: 'GB' } } },
  { _key: 'b', _name: { text: 'B' }, _fields: { cpu: { num: 4, unit: '核' }, memory: { num: 8, unit: 'GB' } } },
]};
const dn = renderWithAudit(dense);
check('D2b a dense set (shared attributes) becomes a comparison table',
  dn.html.includes('<table class="cmp-table">') && dn.degradations.length === 0, JSON.stringify(dn.degradations));
// low fill (one shared row under a mass of one-entity attributes) degrades with the rate
const thin = { _intent: 'thin', _title: { text: 't' }, _rel: { compare: true }, _items: [
  { _key: 'a', _name: { text: 'A' }, _fields: { k1: { text: 'A1' }, k2: { text: 'A2' }, k3: { text: 'A3' }, k4: { text: 'A4' }, k5: { text: 'A5' }, k6: { text: 'A6' } } },
  { _key: 'b', _name: { text: 'B' }, _fields: { k1: { text: 'B1' } } },
  { _key: 'c', _name: { text: 'C' }, _fields: { k1: { text: 'C1' } } },
  { _key: 'd', _name: { text: 'D' }, _fields: { k1: { text: 'D1' } } },
]};
const th = renderWithAudit(thin);
check('D2b a thin table (fill < 0.4) degrades with its fill rate',
  !th.html.includes('<table class="cmp-table">') && th.degradations.length === 1 && th.degradations[0].reason === 'degenerate-fill-rate:0.38',
  JSON.stringify(th.degradations));
// positional array elements are not attributes: an entity's own collection stays in its column
const withColors = { _intent: 'colors', _title: { text: 't' }, _rel: { compare: true }, _items: [
  { _key: 'a', _name: { text: 'A' }, display: { _title: { text: '显示屏' }, _detail: { text: 'A screen' } }, _items: [{ _key: 'a1', _name: { text: '红' } }, { _key: 'a2', _name: { text: '蓝' } }] },
  { _key: 'b', _name: { text: 'B' }, display: { _title: { text: '显示屏' }, _detail: { text: 'B screen' } }, _items: [{ _key: 'b1', _name: { text: '绿' } }] },
]};
const wc = renderWithAudit(withColors);
const wcRows = [...wc.html.matchAll(/<th class="cmp-row">([^<]*)<\/th>/g)].map((m) => m[1]);
check('D2b nested collections are not index-paired rows (colors stay in their column)',
  wc.html.includes('<table class="cmp-table">') && !['红', '蓝', '绿'].some((c) => wcRows.includes(c))
  && wc.html.includes('红') && wc.html.includes('蓝') && wc.html.includes('绿'),
  JSON.stringify(wcRows));

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
      const identified = (d) => (c._key != null ? d.key === c._key : d.key == null);
      if (c._rel?.compare === true && Array.isArray(c._items) && c._items.length >= 2 && !html.includes('<table class="cmp-table">') && !degradations.some(identified)) silent++;
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
