import fs from 'node:fs';
import { walk, factsOf, valueTypeOf } from '../../m1/model-lib.mjs';
function pushFact(out, path, value) {
  const t = valueTypeOf(value); if (!t) return;
  if (t === 'text' || t === 'date') out.push({ path, type: t, text: value[t] });
  else if (t === 'money') out.push({ path, type: 'money', text: String(value.money) });
  else if (t === 'num') out.push({ path, type: 'num', text: String(value.num) });
  else if (t === 'list') value.list.forEach((e, i) => pushFact(out, `${path}[${i}]`, e));
}
function factValues(model) { const out=[]; walk(model,(n,p)=>{ for(const f of factsOf(n)) pushFact(out,`${p}.${f.key}`,f.value); for(const [k,v] of Object.entries(n._fields??{})) pushFact(out,`${p}._fields.${k}`,v); }); return out; }
const norm = (s) => String(s).toLowerCase().replace(/&(amp|quot|apos|lt|gt|nbsp);/g, ' ').replace(/[\s\p{P}]+/gu, '');
const all=[];
for (const f of process.argv.slice(2)) { const m=JSON.parse(fs.readFileSync(f,'utf8')); for(const x of factValues(m)) all.push({file:f.replace('m1/curated/',''),...x}); }
const texts=all.filter(x=>x.type==='text'||x.type==='date');
const cjk = /\p{Script=Han}/u;
for (const len of [1,2,3]) {
  const v=texts.filter(x=>norm(x.text).length===len);
  const latinOnly=v.filter(x=>!cjk.test(x.text));
  console.log(`\n=== norm-len ${len}: total ${v.length}, latin-only ${latinOnly.length} ===`);
  console.log('latin-only sample:', [...new Set(latinOnly.map(x=>x.text))].slice(0,60).join(' | '));
  if(len>=2) console.log('with-CJK sample:', [...new Set(v.filter(x=>cjk.test(x.text)).map(x=>x.text))].slice(0,60).join(' | '));
}
