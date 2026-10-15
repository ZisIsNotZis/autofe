import fs from 'node:fs';
import {render} from '../../../../m1/render.mjs';
import {renderMarkdown} from '../../../../m1/render-md.mjs';
import {evaluate} from '../../../../m1/eval/metrics.mjs';
const root='/home/z/vibe/autofe-worktrees/62-all-sites/content';
const handoff=JSON.parse(fs.readFileSync(root+'/.scratch/62-all-sites/content-handoff.json'));
const out='.scratch/62-all-sites/engine/recovery/candidate';fs.mkdirSync(out,{recursive:true});
const results=[];
for(const file of handoff.files.filter(f=>f.endsWith('.json'))){
 const model=JSON.parse(fs.readFileSync(root+'/'+file)),k=file.replace('m1/curated/','').replace('.json','');
 const html=render(model,{site:k.split('/')[0]}),md=renderMarkdown(model);
 const targets=[];function walk(n,p=''){if(!n||typeof n!=='object')return;if(n._action?.to)targets.push({path:p,label:n._action.label,to:n._action.to});for(const [key,v]of Object.entries(n))if(key!=='_action')walk(v,p+'/'+key)}walk(model);
 const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 const gaps=targets.filter(t=>!html.includes(escape(t.to))||!md.includes(t.to));
 fs.writeFileSync(out+'/'+k.replaceAll('/','-')+'.html',html);fs.writeFileSync(out+'/'+k.replaceAll('/','-')+'.md',md);
 results.push({k,targets:targets.length,gaps,html:evaluate(model,out+'/'+k.replaceAll('/','-')+'.html'),markdown:evaluate(model,out+'/'+k.replaceAll('/','-')+'.md')});
}
fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify({pages:results.length,gaps:results.reduce((s,r)=>s+r.gaps.length,0),fidelity:results.filter(r=>r.html.factFidelity<1||r.markdown.factFidelity<1).map(r=>({k:r.k,html:r.html.missing,md:r.markdown.missing}))}));
