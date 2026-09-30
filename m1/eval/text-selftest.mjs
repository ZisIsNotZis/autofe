// Text-target self-test (round 18, gate 5): the second render target must express the
// SAME axis semantics (docs/m1/layout-axes.md F-031) in plain text, and must not lose
// facts. Each assertion is a constructed model, independent of the curated corpus, so
// this gate can fail on its own (F-040: a gate that cannot fail is not a gate).
// Usage: node m1/eval/text-selftest.mjs
import { renderText } from '../render-text.mjs';
import { evaluate } from './metrics.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'autofe-text-'));
let seq = 0;
let bad = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`ok   ${name}`);
  else { bad++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
};
const textOf = (model, ctx) => renderText(model, ctx);
// fidelity of a text render is measured by the SAME evaluator used for HTML (see report)
const fidelityOf = (model, ctx) => {
  const f = path.join(dir, `t${++seq}.txt`);
  fs.writeFileSync(f, textOf(model, ctx));
  return evaluate(model, f).factFidelity;
};

// 1. 行=可比：records with attributes become a text table (item = row, attribute = column)
const priced = {
  _intent: 'price list', _title: { text: 'Price list' },
  plans: { _intent: 'plans', _items: [
    { _name: { text: 'Basic' }, _fields: { price: { money: 9.99, currency: 'USD' }, seats: { num: 1 } } },
    { _name: { text: 'Pro' }, _fields: { price: { money: 19.99, currency: 'USD' }, seats: { num: 5 } } },
  ] },
};
const pricedText = textOf(priced);
check('comparable record set renders as a text table (name + value on one row)',
  /Basic\s+\$9\.99\s+1/.test(pricedText) && /Pro\s+\$19\.99\s+5/.test(pricedText), pricedText.split('\n').slice(0, 8).join(' / '));
check('typed `_fields` values keep their fidelity in text (metrics evaluator)',
  fidelityOf(priced) === 1, `fidelity=${fidelityOf(priced)}`);

// 2. 堆叠：non-comparable members become vertical sections, each with its own heading
const heterogeneous = {
  _intent: 'x', _title: { text: 'Top' },
  things: { _intent: 'things', _items: [
    { _title: { text: 'Alpha' }, _detail: { text: 'first block' } },
    { _name: { text: 'Beta' }, _summary: { text: 'second' }, _count: { num: 3 } },
  ] },
};
const hetText = textOf(heterogeneous);
check('non-comparable members stack as titled sections',
  /^\s*#+\s+Alpha$/m.test(hetText) && /^\s*#+\s+Beta$/m.test(hetText), hetText);

// 3. 图片=alt 文本（标注“图片”），空 alt 不消失
const gallery = {
  _intent: 'gallery', _title: { text: 'Photos' },
  shots: { _intent: 'shots', _items: [
    { _image: { image: 'a.png', alt: 'MIRROR SHOT' } },
    { _image: { image: '', alt: '' } },
  ] },
};
const galText = textOf(gallery);
check('images degrade to annotated alt text',
  galText.includes('[图片] MIRROR SHOT'), galText);
check('an image with no alt still renders as a labelled placeholder',
  (galText.match(/\[图片\]/g) || []).length === 2, galText);

// 4. 控件=[标签]
const controls = {
  _intent: 'c', _title: { text: 'Actions' },
  actions: { _intent: 'a', _items: [
    { _action: { verb: 'operate', label: '购买' } },
    { _action: { verb: 'operate', label: '收藏' } },
  ] },
};
const ctlText = textOf(controls);
check('controls render as bracketed labels', ctlText.includes('[购买]') && ctlText.includes('[收藏]'), ctlText);

// 5. _expose：单选 `( ) 选项` / 多选 `[ ] 选项`
const single = {
  _intent: 's', _title: { text: 'Choose' },
  color: { _intent: 'c', _expose: { name: 'color', type: 'text' }, _items: [
    { _name: { text: '白色' } }, { _name: { text: '黑色' } },
  ] },
};
const multi = {
  _intent: 'm', _title: { text: 'Choose many' },
  tags: { _intent: 't', _expose: { name: 'tags', type: 'text', multiple: true }, _items: [
    { _name: { text: '新' } }, { _name: { text: '热' } },
  ] },
};
const sText = textOf(single), mText = textOf(multi);
check('single-select options render as `( )`', sText.includes('( ) 白色') && sText.includes('( ) 黑色'), sText);
check('multi-select options render as `[ ]`', mText.includes('[ ] 新') && mText.includes('[ ] 热'), mText);

// 6. _when 作用域求值（与 model-lib scopeFor 一致）：事实条件 + 暴露事实条件
const cond = {
  _intent: 'cond', _title: { text: 'Stock' }, _stock: { num: 0 },
  offer: { _when: 'stock > 0', _detail: { text: 'IN-STOCK-NOW' } },
  gate: { _intent: 'gate', _expose: { name: 'signed-in', type: 'bool' }, _label: { text: '登录' },
    member: { _when: 'signed-in == true', _detail: { text: 'SIGNED-BLOCK' } } },
};
const off = textOf(cond);
check('a falsy `_when` scoped to an ancestor fact hides the block',
  !off.includes('IN-STOCK-NOW') && !off.includes('SIGNED-BLOCK'), off);
const on = textOf({ ...cond, _stock: { num: 5 } }, { values: { 'signed-in': true } });
check('a truthy `_when` shows the block, and an ancestor `_expose` name is in scope',
  on.includes('IN-STOCK-NOW') && on.includes('SIGNED-BLOCK'), on);

// 7. _rel.compare：entities as COLUMNS, shared attribute as a row
const compare = {
  _intent: 'cmp', _title: { text: 'Ratings' },
  aspects: { _intent: 'a', _rel: { compare: true }, _items: [
    { _name: { text: '干净卫生' }, _rating: { num: 4.8 } },
    { _name: { text: '如实描述' }, _rating: { num: 4.9 } },
  ] },
};
const cmpText = textOf(compare);
check('a compare set lays entities out as table COLUMNS',
  cmpText.split('\n').some((l) => l.includes('干净卫生') && l.includes('如实描述')), cmpText);
check('the shared attribute is a row labelled by the semantic role',
  cmpText.split('\n').some((l) => l.includes('评分') && l.includes('4.8') && l.includes('4.9')), cmpText);

// 8. _rel.level >= 2 → indented 参考 section
const demoted = {
  _intent: 'd', _title: { text: 'Main' },
  aside: { _intent: 'a', _rel: { level: 2 }, _title: { text: 'Small print' }, _detail: { text: 'TERMS' } },
};
const demText = textOf(demoted);
check('a demoted branch becomes an indented 参考 section',
  demText.includes('参考:') && demText.includes('TERMS'), demText);

console.log(`\n文本渲染自测: ${bad === 0 ? '全部通过' : `待修 ${bad}`}`);
process.exit(bad ? 1 : 0);
