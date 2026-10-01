import fs from 'node:fs';
import { exposeRendersAsControl, nodePlan } from '../../m1/axis.mjs';
import { childrenOf } from '../../m1/model-lib.mjs';
const scale = JSON.parse(fs.readFileSync('m1/eval/m3-scale.json','utf8')).filter(x=>x.tier==='exemplar');
let total=0; const rows=[];
for (const r of scale) {
  const m = JSON.parse(fs.readFileSync('m1/curated/'+r.k+'.json','utf8'));
  const expos=[];
  (function w(n,p){
    if(!n||typeof n!=='object'||Array.isArray(n))return;
    const exp=exposeRendersAsControl(n);
    if(exp){
      const plan=nodePlan(n,{chain:[],values:{},depth:1});
      expos.push({name:exp.name,kind:plan.choice?plan.choice.kind:'none',visible:plan.visible});
      total++;
    }
    for(const c of childrenOf(n)) w(c.node,p+'.'+c.key);
  })(m,'');
  if(expos.length) rows.push([r.k,expos]);
}
for(const [k,ex] of rows){ console.log(k); for(const e of ex) console.log('   ', JSON.stringify(e)); }
console.log('TOTAL exposures with control=true:', total);
console.log('kinds:', JSON.stringify(rows.flatMap(([k,ex])=>ex.map(e=>e.kind)).reduce((a,k)=>(a[k]=(a[k]||0)+1,a),{})));
