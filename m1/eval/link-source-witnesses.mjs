import crypto from 'node:crypto';
import {descendants} from './link-owners.mjs';
import {normalizeHref} from './link-coverage.mjs';
import {walk} from '../model-lib.mjs';
// Captured bindings add mandatory capabilities. They never waive the ordinary oracle.
export function checkSourceWitnesses(entries,model,oracle,dom,base){
 const sourceHash=crypto.createHash('sha256').update(dom).digest('hex'),sources=new Map(descendants(oracle.source).map(n=>[n.address,n])),nodes=new Map();walk(model,(n,p)=>nodes.set(p,n));
 const findings=[];
 for(const e of entries){
  const source=sources.get(e.sourceAddress),owner=sources.get(e.sourceOwner),node=nodes.get(e.modelOwner);
  const fail=reason=>findings.push({kind:'wrong-target',path:e.modelOwner+'._action',text:e.sourceText,expect:[e.target],href:node?._action?.to,reason,witnessId:e.id});
  if(e.referenceKey){
   const targetSource=sources.get(e.sourceTargetAddress),targetNode=nodes.get(e.targetModelOwner);
   if(e.sourceHash!==sourceHash||!source||!owner||source.text!==e.sourceText||owner.text!==e.ownerText
    || !(source===owner||source.address.startsWith(owner.address+'/'))||!targetSource||targetSource.text!==e.sourceTargetText
    || !targetNode||targetNode._key!==e.referenceKey||(targetNode._title?.text??targetNode._name?.text)!==e.sourceTargetText
    || node?._ref?.ref!=='key:'+e.referenceKey){fail('invalid generated-reference source/entity/owner binding');continue;}
   const targets=descendants(oracle.render).filter(n=>n.attrs.id===e.referenceKey&&n.attrs['data-model-owner']===e.targetModelOwner);
   const refs=oracle.allRender.filter(a=>a.attrs.href==='#'+e.referenceKey&&(()=>{for(let p=a.parent;p;p=p.parent)if(p.attrs['data-model-owner']!==undefined)return p.attrs['data-model-owner']===e.modelOwner;return false;})());
   if(targets.length!==1||!refs.length)fail('generated reference missing at owning rendered location or wrong target entity');
   continue;
  }
  if(e.sourceHash!==sourceHash||!source||!owner||source.text!==e.sourceText||owner.text!==e.ownerText
   || !(source===owner||source.address.startsWith(owner.address+'/'))
   || source.attrs[e.targetAttribute??'href']!==e.sourceHref
   || normalizeHref(e.sourceHref,base)!==e.target){fail('invalid captured source/owner witness');continue;}
  if(!node?._action||normalizeHref(node._action.to,base)!==e.target){fail('missing or changed mandatory captured capability');continue;}
  const rendered=oracle.allRender.filter(a=>a.attrs['data-model-owner']===(e.renderOwner??e.modelOwner)
   || (()=>{for(let p=a.parent;p;p=p.parent){if(p.attrs['data-model-owner']!==undefined)return p.attrs['data-model-owner']===(e.renderOwner??e.modelOwner);}return false;})());
  if(!rendered.some(a=>normalizeHref(a.attrs.href,base)===e.target))fail('mandatory action missing at bound rendered owner');
 }
 return findings;
}
