import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {checkPage,normalizeHref,compact} from '../../../m1/eval/link-coverage.mjs';import {ownerOracle} from '../../../m1/eval/link-owners.mjs';
const dir='.scratch/62-all-sites/owner-trace',inv=JSON.parse(fs.readFileSync(dir+'/inventory.json')),empty={entries:[],index:new Map()},entries=JSON.parse(fs.readFileSync('m1/eval/link-owner-witnesses.json')).entries;
const data=new Map(),result=[],probes=[];const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
for(const [phenotype,cases]of Object.entries(inv.groups)){
 for(const c of cases){if(!data.has(c.page)){const modelBytes=fs.readFileSync('m1/curated/'+c.page+'.json','utf8'),html=fs.readFileSync('m1/curated/renders/'+c.page.replaceAll('/','-')+'.html','utf8'),dom=fs.readFileSync('corpus/'+c.page+'/dom.html','utf8'),meta=JSON.parse(fs.readFileSync('corpus/'+c.page+'/meta.json'));const model=JSON.parse(modelBytes),base=meta.redirectedUrl??meta.url;const checked=checkPage(c.page,model,html,dom,base,empty,entries.filter(e=>e.page===c.page));data.set(c.page,{model,html,dom,base,checked,oracle:ownerOracle(model,html,dom,base),hashes:{model:sha(modelBytes),html:sha(html),source:sha(dom)}});}
  const d=data.get(c.page),addresses=[...new Set(c.contexts.map(x=>x.renderAddress).filter(Boolean))],target=normalizeHref(c.finding.href,d.base);
  const proofs=d.checked.ownership.filter(o=>o.status==='owned-exact-action'&&o.expected.includes(target)&&o.renderWitnesses?.some(w=>addresses.includes(w.address)&&w.target===target));
  const disposition=proofs.length?'VERIFIED_EXACT_OWNER_CONSUMPTION':'UNVERIFIED';const currentContexts=c.contexts.map(ctx=>{let node=d.model;const path=ctx.modelOwner;if(typeof path!=='string')return {...ctx,unsupported:'no model owner address in inherited case'};for(const k of path.replaceAll('[','.').replaceAll(']','').split('.').filter(Boolean))node=node?.[k];if(!node)return {...ctx,unsupported:'inherited model owner address unavailable'};const x=d.oracle.contexts(node);return {modelOwner:path,modelAction:node._action,modelFacts:Object.fromEntries(Object.entries(node).filter(([k,v])=>k.startsWith('_')&&v?.text)),sourceScopes:x.source.map(s=>({addresses:(s.members??[s.node]).map(n=>n.address),score:s.score,text:s.node.text,anchors:s.anchors.map(a=>({address:a.address,text:a.text,attrs:a.attrs}))})),renderConsumers:x.render.map(n=>({address:n.address,text:n.text,attrs:n.attrs})),action:d.oracle.action(node)};});
  const out={...c,phenotype,disposition,hashes:d.hashes,currentProof:proofs,currentContexts,currentFindings:d.checked.findings.filter(f=>f.href===c.finding.href&&compact(f.text)===compact(c.finding.text))};result.push(out);
  fs.writeFileSync(dir+'/classification.json',JSON.stringify({count:result.length,cases:result,probeCount:probes.length,probes},null,2));
  console.log(c.id,disposition);
  if(!proofs.length)continue;
  for(const addr of addresses){const anchor=d.oracle.allRender.find(a=>a.address===addr);if(!anchor||normalizeHref(anchor.attrs.href,d.base)!==target)continue;
   const ix=d.oracle.allRender.indexOf(anchor),matches=[...d.html.matchAll(/<a\b[^>]*>/gi)];assert.equal(matches.length,d.oracle.allRender.length,'render anchor token/address census');const token=matches[ix],start=token.index;
   const ownerAt=a=>{for(let n=a;n;n=n.parent)if(n.attrs['data-model-owner']!==undefined)return n.attrs['data-model-owner'];return null;};
   const owner=ownerAt(anchor),shape=s=>s?.replace(/\[\d+\]/g,'[*]');
   const choices=d.oracle.allRender.filter(a=>normalizeHref(a.attrs.href,d.base)!==target&&a.attrs.href&&!a.attrs.href.startsWith('#')&&ownerAt(a)!==owner);
   const other=choices[0]?.attrs.href,neighbor=choices.find(a=>shape(ownerAt(a))===shape(owner))?.attrs.href;
   for(const [kind,href]of [['drop',null],['path',target+'/wrong-owner-path'],['query',target+(target.includes('?')?'&':'?')+'owner-probe=wrong'],['fragment',target+'#wrong-owner'],['existing-other-owner',other],['existing-neighbor-owner',neighbor]]){
    if(kind.startsWith('existing-')&&!href)continue;
    const replacement=token[0].replace(/\bhref\s*=\s*("[^"]*"|'[^']*')/i,href===null?'data-owner-dropped="true"':'href="'+href.replaceAll('&','&amp;').replaceAll('"','&quot;')+'"');const html=d.html.slice(0,start)+replacement+d.html.slice(start+token[0].length);
    const oracle=ownerOracle(d.model,html,d.dom,d.base);
    for(const proof of proofs){const path=proof.path.replace(/\._[^.]+$/,'');let node=d.model;for(const k of path.replaceAll('[','.').replaceAll(']','').split('.').filter(Boolean))node=node[k];
     const tested=proof.path.endsWith('._action')?oracle.action(node):oracle.fact(node,proof.text,[node._action]);
     const surviving=tested?.status==='owned-exact-action'&&tested.renderWitnesses?.some(w=>w.address===addr&&w.target===normalizeHref(href,d.base));
     assert.equal(Boolean(surviving),false,c.id+' '+kind+' must not retain exact consumption proof');
    }
    if(kind==='drop'){
     const checked=checkPage(c.page,d.model,html,d.dom,d.base,empty,entries.filter(e=>e.page===c.page));
     assert(checked.findings.length>d.checked.findings.length,c.id+' dropping actual consumption must fail complete production gate');
    }
    probes.push({id:c.id,renderAddress:addr,kind,status:'PASS',...(kind==='drop'?{fullProductionGate:true}:{})});
   }
  }
 }
 fs.writeFileSync(dir+'/classification.json',JSON.stringify({count:result.length,cases:result,probeCount:probes.length,probes},null,2));console.log('CHECKPOINT',phenotype,'cases',cases.length,'verified',result.filter(c=>c.phenotype===phenotype&&c.disposition.startsWith('VERIFIED')).length,'probes',probes.length);
 fs.appendFileSync(dir+'/ticket.md','\n'+new Date().toISOString()+' actor=finish-owner-consumption phenotype='+phenotype+' classified='+cases.length+' verified='+result.filter(c=>c.phenotype===phenotype&&c.disposition.startsWith('VERIFIED')).length+' production-render-negatives='+probes.length+'; full case witnesses/dispositions in classification.json.\n');
}
console.log('RESULT',result.length,'verified',result.filter(c=>c.disposition.startsWith('VERIFIED')).length,'unknown',result.filter(c=>c.disposition==='UNVERIFIED').length,'probes',probes.length);
