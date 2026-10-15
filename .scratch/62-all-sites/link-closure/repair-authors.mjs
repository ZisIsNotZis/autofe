import fs from 'node:fs';
import {checkPage,loadAllow,compact,normalizeHref,hrefIsReal} from '../../../m1/eval/link-coverage.mjs';
import {ownerOracle} from '../../../m1/eval/link-owners.mjs';
import {resolvePath,walk} from '../../../m1/model-lib.mjs';
const rows=JSON.parse(fs.readFileSync('m1/eval/m3-scale.json')).filter(x=>x.tier==='exemplar');const repairs=[],unresolved=[];
for(const {k} of rows){const mp=`m1/curated/${k}.json`,rp=`m1/curated/renders/${k.replaceAll('/','-')}.html`,sp=`corpus/${k}/dom.html`;const model=JSON.parse(fs.readFileSync(mp));const html=fs.readFileSync(rp,'utf8'),dom=fs.readFileSync(sp,'utf8');const meta=JSON.parse(fs.readFileSync(`corpus/${k}/meta.json`)),base=meta.redirectedUrl??meta.url;const oracle=ownerOracle(model,html,dom,base);let changed=false;
walk(model,(node,p)=>{if(!node._author?.text||node.authorLink)return;const ck=compact(node._author.text),ctx=oracle.contexts(node);const matches=ctx.source.flatMap(c=>c.anchors.filter(a=>compact(a.text)===ck&&hrefIsReal(a.attrs.href)));const targets=[...new Set(matches.map(a=>normalizeHref(a.attrs.href,base)))];
 if(targets.length!==1){unresolved.push({page:k,path:p,text:node._author.text,targets});return;}
 const target=targets[0];node.authorLink={_name:{text:node._author.text},_action:{verb:'navigate',label:node._author.text,to:target}};changed=true;
 repairs.push({page:k,path:p+'.authorLink',sourceOwners:ctx.source.map(c=>c.node.address),sourceAnchors:matches.map(a=>({address:a.address,text:a.text,href:a.attrs.href})),to:target});
});if(changed)fs.writeFileSync(mp,JSON.stringify(model,null,2)+'\n');}
fs.writeFileSync('.scratch/62-all-sites/link-closure/author-repairs.json',JSON.stringify({repairs,unresolved},null,2)+'\n');console.log({repairs:repairs.length,unresolved:unresolved.length});
