import fs from 'node:fs';
import { walk, factsOf, valueTypeOf } from '../../m1/model-lib.mjs';

function pushFact(out, path, value) {
  const t = valueTypeOf(value);
  if (!t) return;
  if (t === 'text' || t === 'date') out.push({ path, type: t, text: value[t] });
  else if (t === 'money') out.push({ path, type: 'money', text: String(value.money) });
  else if (t === 'num') out.push({ path, type: 'num', text: String(value.num) });
  else if (t === 'list') value.list.forEach((e, i) => pushFact(out, `${path}[${i}]`, e));
}
function factValues(model) {
  const out = [];
  walk(model, (n, p) => {
    for (const f of factsOf(n)) pushFact(out, `${p}.${f.key}`, f.value);
    for (const [k, v] of Object.entries(n._fields ?? {})) pushFact(out, `${p}._fields.${k}`, v);
  });
  return out;
}
const files = process.argv.slice(2);
let all = [];
for (const f of files) {
  const m = JSON.parse(fs.readFileSync(f, 'utf8'));
  const facts = factValues(m);
  for (const x of facts) all.push({ file: f, ...x });
}
const norm = (s) => String(s).toLowerCase().replace(/&(amp|quot|apos|lt|gt|nbsp);/g, ' ').replace(/[\s\p{P}]+/gu, '');
const texts = all.filter(x => x.type === 'text' || x.type === 'date');
const byLen = {};
for (const t of texts) { const n = norm(t.text).length; byLen[n] = (byLen[n]||0)+1; }
console.log('total facts', all.length, 'texts', texts.length);
console.log('text norm-len histogram (len:count):', Object.entries(byLen).sort((a,b)=>a[0]-b[0]).map(([k,v])=>`${k}:${v}`).join(' '));
console.log('--- shortest 40 text values ---');
texts.slice().sort((a,b)=>norm(a.text).length-norm(b.text).length).slice(0,40).forEach(x=>console.log(norm(x.text).length, JSON.stringify(x.text), x.path));
console.log('--- all num/money distinct ---');
const nums = [...new Set(all.filter(x=>x.type==='num'||x.type==='money').map(x=>x.type+':'+x.text))];
console.log(nums.join(' '));
