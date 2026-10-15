import fs from 'node:fs';
import crypto from 'node:crypto';
import {compact,sourceAnchors,normalizeHref} from '../../../m1/eval/link-coverage.mjs';
const dir='.scratch/62-all-sites/link-closure';
const original=JSON.parse(fs.readFileSync('.scratch/62-all-sites/focused-diagnosis/repair/links-final.json'));
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
// Evidence collection only: candidate actions do NOT establish semantic owner identity.
function indexTree(root){
 const out=[];
 function walk(n,p,anc){if(!n||typeof n!=='object')return;
 if(Array.isArray(n)){n.forEach((v,i)=>walk(v,`${p}[${i}]`,anc));return;}
 const owner={path:p,node:n};out.push({...owner,ancestors:anc});
 for(const [k,v] of Object.entries(n)) if(v&&typeof v==='object'&&!k.startsWith('_action'))walk(v,p?`${p}.${k}`:k,[...anc,owner]);}
 walk(root,'',[]);return out;
}
const cases=[];
for(const page of original.pages.filter(p=>p.findings.length)){
 const mp=`m1/curated/${page.page}.json`,sp=`corpus/${page.page}/dom.html`,rp=`m1/curated/renders/${page.page.replaceAll('/','-')}.html`;
 const mb=fs.readFileSync(mp),sb=fs.readFileSync(sp),rb=fs.readFileSync(rp);
 const model=JSON.parse(mb);const dom=sb.toString();const html=rb.toString();
 const meta=JSON.parse(fs.readFileSync(`corpus/${page.page}/meta.json`));const base=meta.redirectedUrl??meta.url;
 const tree=indexTree(model);const anchors=sourceAnchors(dom,base);
 for(const [i,f] of page.findings.entries()){
  const fp=f.path?.replace(/\._[^.]+$/,'');const entry=tree.find(e=>e.path===fp);
  const owners=entry?[entry,...entry.ancestors.toReversed()].slice(0,5).map(e=>({path:e.path,ownAction:e.node._action??null,facts:Object.entries(e.node).filter(([k,v])=>k.startsWith('_')&&v?.text).map(([k,v])=>({key:k,text:v.text})),actions:tree.filter(a=>a.path.startsWith(e.path+'.')&&a.node._action).map(a=>({path:a.path,action:a.node._action,label:a.node._name?.text??a.node._title?.text??null}))})):[];
  const matches=anchors.filter(a=>compact(a.text)===compact(f.text));
  const candidates=owners.map(o=>({path:o.path,actions:[...(o.ownAction?[{path:o.path,action:o.ownAction}]:[]),...o.actions].filter(a=>f.expect?.includes(normalizeHref(a.action.to,base)))})).filter(o=>o.actions.length);
  const needle=f.text;const offset=dom.indexOf(needle);const roffset=html.indexOf(needle);
  cases.push({id:`${page.page}:${i+1}`,page:page.page,finding:f,hashes:{model:hash(mb),source:hash(sb),render:hash(rb)},sourceAnchors:matches,sourceLiteralWitness:offset<0?null:{offset,context:dom.slice(Math.max(0,offset-800),offset+needle.length+1000)},renderLiteralWitness:roffset<0?null:{offset:roffset,context:html.slice(Math.max(0,roffset-500),roffset+needle.length+700)},modelOwners:owners,candidateExactOwnerActions:candidates,classification:'UNRESOLVED',reason:candidates.length?'Exact target exists in a candidate ancestor/subtree; source owner correspondence and render owner must still be proven.':'No exact target in nearest five model owner candidates; missing capability versus source-label coincidence still requires proof.'});
 }
}
fs.writeFileSync(`${dir}/cases.json`,JSON.stringify({revision:original.agg,cases},null,2)+'\n');
const summary={count:cases.length,pages:new Set(cases.map(c=>c.page)).size,candidateOwnerAction:cases.filter(c=>c.candidateExactOwnerActions.length).length,noCandidateOwnerAction:cases.filter(c=>!c.candidateExactOwnerActions.length).length,unresolved:cases.length};
fs.writeFileSync(`${dir}/classification-summary.json`,JSON.stringify(summary,null,2)+'\n');console.log(summary);
