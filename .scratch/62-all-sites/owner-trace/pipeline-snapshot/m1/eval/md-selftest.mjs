// Markdown-target self-test (round 21, gate 7): the THIRD render target must express the
// SAME axis semantics (docs/m1/layout-axes.md F-031) in Markdown, and must not lose facts.
// Each assertion is a constructed model, independent of the curated corpus, so this gate
// can fail on its own (F-040: a gate that cannot fail is not a gate).
//
// What it adds over `text-selftest.mjs`: the Markdown target's OWN presentation contract —
// GFM table syntax, `![alt](src)` with a no-src degradation, `[label](href)` controls,
// `- [ ]`/`- ( )` option lists, blockquote asides — and the static proof that it is
// presentation only (imports ./model-lib.mjs + ./axis.mjs, never another renderer).
// Usage: node m1/eval/md-selftest.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMarkdown } from '../render-md.mjs';
import { CURRENCY_GLYPH, ROLE_UNIT } from '../axis.mjs';
import { evaluate } from './metrics.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'autofe-md-'));
let seq = 0;
let bad = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`ok   ${name}`);
  else { bad++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
};
const mdOf = (model, ctx) => renderMarkdown(model, ctx);
// fidelity of a Markdown render is measured by the SAME evaluator used for HTML/text
const fidelityOf = (model, ctx) => {
  const f = path.join(dir, `t${++seq}.md`);
  fs.writeFileSync(f, mdOf(model, ctx));
  return evaluate(model, f).factFidelity;
};

// 0. static: the third target is presentation only — model semantics + axis decisions,
//    never another renderer (a wrapper over HTML/text would not be a third target).
{
  const src = fs.readFileSync(path.join(here, '..', 'render-md.mjs'), 'utf8');
  const imports = [...src.matchAll(/from '([^']+)'/g)].map((m) => m[1]).sort();
  check('render-md.mjs imports only ./model-lib.mjs and ./axis.mjs',
    JSON.stringify(imports) === JSON.stringify(['./axis.mjs', './model-lib.mjs', 'node:fs']), imports.join(', '));
}

// 1. 行=可比：records with attributes become a GFM table (member = row, attribute = column)
const priced = {
  _intent: 'price list', _title: { text: 'Price list' },
  plans: { _intent: 'plans', _items: [
    { _name: { text: 'Basic' }, _fields: { price: { money: 9.99, currency: 'USD' }, seats: { num: 1 } } },
    { _name: { text: 'Pro' }, _fields: { price: { money: 19.99, currency: 'USD' }, seats: { num: 5 } } },
  ] },
};
const pricedMd = mdOf(priced);
check('comparable record set renders as a GFM table (header + separator + rows)',
  pricedMd.split('\n').some((l) => l.startsWith('| 名称 |'))
  && pricedMd.split('\n').some((l) => /^\|(\s*---\s*\|)+$/.test(l))
  && pricedMd.split('\n').some((l) => /\|\s*Basic\s*\|\s*\$9\.99\s*\|\s*1\s*\|/.test(l)), pricedMd);
check('the money glyph comes from the shared axis constant',
  pricedMd.includes(CURRENCY_GLYPH.USD + '9.99'), `expected ${CURRENCY_GLYPH.USD}9.99`);
check('a role fact\u2019s fallback unit comes from the shared axis constant',
  mdOf({ _intent: 'r', _title: { text: 'R' }, _rating: { num: 4.8 }, _detail: { text: 'D' } })
    .includes(`4.8 ${ROLE_UNIT._rating}`), `expected 4.8 ${ROLE_UNIT._rating}`);
check('typed `_fields` values keep their fidelity in Markdown (metrics evaluator)',
  fidelityOf(priced) === 1, `fidelity=${fidelityOf(priced)}`);

// 2. 堆叠：non-comparable members become `##`/`###` sections, each standing on its own
const heterogeneous = {
  _intent: 'x', _title: { text: 'Top' },
  things: { _intent: 'things', _items: [
    { _title: { text: 'Alpha' }, _detail: { text: 'first block' } },
    { _name: { text: 'Beta' }, _summary: { text: 'second' }, _count: { num: 3 } },
  ] },
};
const hetMd = mdOf(heterogeneous);
check('non-comparable members stack as their own Markdown sections',
  /^\s*#{2,6}\s+Alpha$/m.test(hetMd) && /^\s*#{2,6}\s+Beta$/m.test(hetMd), hetMd);

// 3. 图片=`![alt](src)`；无 src ⇒ 只留 alt 文本（绝不输出空 src 的图片）
const gallery = {
  _intent: 'gallery', _title: { text: 'Photos' },
  shots: { _intent: 'shots', _items: [
    { _image: { image: 'a.png', alt: 'MIRROR SHOT' } },
    { _image: { image: '', alt: 'NO SOURCE' } },
  ] },
};
const galMd = mdOf(gallery);
check('an image renders as `![alt](src)`', galMd.includes('![MIRROR SHOT](a.png)'), galMd);
check('an image with no src leaves only its captured alt text, never `![]()`',
  galMd.includes('NO SOURCE') && !galMd.includes('![NO SOURCE]()'), galMd);

// 4. 控件=`[标签](href)`（有目标）/ `[标签]`（无目标）
const controls = {
  _intent: 'c', _title: { text: 'Actions' },
  actions: { _intent: 'a', _items: [
    { _action: { verb: 'operate', label: '购买', to: 'https://x.test/buy' } },
    { _action: { verb: 'operate', label: '收藏' } },
  ] },
};
const ctlMd = mdOf(controls);
check('a control with a target becomes a Markdown link',
  ctlMd.includes('[购买](https://x.test/buy)'), ctlMd);
check('a control without a target keeps the source label in brackets',
  ctlMd.includes('[收藏]') && !ctlMd.includes('[收藏]('), ctlMd);

// 5. _expose：单选 `- ( ) 选项` / 多选 `- [ ] 选项`（选项列表）
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
const sMd = mdOf(single), mMd = mdOf(multi);
check('single-select options render as an option list `- ( )`', sMd.includes('- ( ) 白色') && sMd.includes('- ( ) 黑色'), sMd);
check('multi-select options render as a checklist `- [ ]`', mMd.includes('- [ ] 新') && mMd.includes('- [ ] 热'), mMd);

// 6. _when 作用域求值（与 model-lib scopeFor 一致）：事实条件 + 暴露事实条件
const cond = {
  _intent: 'cond', _title: { text: 'Stock' }, _stock: { num: 0 },
  offer: { _when: 'stock > 0', _detail: { text: 'IN-STOCK-NOW' } },
  gate: { _intent: 'gate', _expose: { name: 'signed-in', type: 'bool' }, _label: { text: '登录' },
    member: { _when: 'signed-in == true', _detail: { text: 'SIGNED-BLOCK' } } },
};
const off = mdOf(cond);
check('a falsy `_when` scoped to an ancestor fact hides the block',
  !off.includes('IN-STOCK-NOW') && !off.includes('SIGNED-BLOCK'), off);
const on = mdOf({ ...cond, _stock: { num: 5 } }, { values: { 'signed-in': true } });
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
const cmpMd = mdOf(compare);
check('a compare set lays entities out as table COLUMNS',
  cmpMd.split('\n').some((l) => l.startsWith('|') && l.includes('干净卫生') && l.includes('如实描述')), cmpMd);
check('the shared attribute is a row labelled by the semantic role',
  cmpMd.split('\n').some((l) => /\|\s*评分\s*\|\s*4\.8\s*\|\s*4\.9\s*\|/.test(l)), cmpMd);

// 8. _rel.level >= 2 → blockquote（Markdown 的 aside）
const demoted = {
  _intent: 'd', _title: { text: 'Main' },
  aside: { _intent: 'a', _rel: { level: 2 }, _title: { text: 'Small print' }, _detail: { text: 'TERMS' } },
};
const demMd = mdOf(demoted);
check('a demoted branch becomes a blockquote aside',
  demMd.split('\n').some((l) => l.startsWith('>') && l.includes('Small print')) && demMd.includes('TERMS'), demMd);

// 9. _amount + list qualifier ⇒ strikethrough (GFM), never the internal marker as copy
const offer = {
  _intent: 'o', _title: { text: 'Offer' },
  price: { _intent: 'p', _amount: { money: 99, currency: 'CNY', qualifier: 'list' }, _detail: { text: 'DEAL' } },
};
const offerMd = mdOf(offer);
check('a list-qualified `_amount` is struck through, and the qualifier never leaks as copy',
  offerMd.includes(`~~${CURRENCY_GLYPH.CNY}99~~`) && !offerMd.includes('list'), offerMd);

// 10. the output is Markdown, not HTML smuggled through a third renderer
const all = [pricedMd, hetMd, galMd, sMd, mMd, cmpMd, demMd, offerMd].join('\n');
check('no HTML elements leak into the Markdown target', !/<(div|table|span|section|figure|ul|li|ol|article)\b/.test(all));
check('overall fidelity of the constructed models stays 1.00',
  [priced, heterogeneous, gallery, single, multi, cond, compare, demoted, offer].every((m) => fidelityOf(m) === 1));

console.log(`\nMarkdown 目标自测: ${bad === 0 ? '全部通过' : `待修 ${bad}`}`);
process.exit(bad ? 1 : 0);
