// Structural evidence, not presentation grammar. Addresses identify captured nodes only.
import { decodeEntities, compact, normalizeHref, hrefIsReal } from './link-coverage.mjs';
import { walk } from '../model-lib.mjs';
export function parseLinkTree(html) {
 const root={tag:'root',attrs:{},parent:null,children:[],parts:[],address:''};let cur=root;
 const voids=new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
 for(const m of String(html).matchAll(/<!--[\s\S]*?-->|<![^>]*>|<[^>]*>|[^<]+/g)) {
  const t=m[0];if(t.startsWith('<!--')||t.startsWith('<!'))continue;
  if(t.startsWith('</')){const tag=/^<\/\s*([^\s>]+)/.exec(t)?.[1].toLowerCase();let n=cur;while(n.parent&&n.tag!==tag)n=n.parent;if(n.tag===tag&&n.parent)cur=n.parent;continue;}
  if(t.startsWith('<')){const tag=/^<\s*([^\s/>]+)/.exec(t)?.[1].toLowerCase();if(!tag)continue;
   const attrs={};for(const a of t.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))attrs[a[1].toLowerCase()]=decodeEntities(a[2]??a[3]??a[4]);
   const n={tag,attrs,parent:cur,children:[],parts:[],address:cur.address+'/'+tag+'['+cur.children.length+']'};cur.children.push(n);cur.parts.push(n);if(!voids.has(tag)&&!t.endsWith('/>'))cur=n;
  }else if(!['script','style'].includes(cur.tag))cur.parts.push(decodeEntities(t));
 }
 function finish(n){n.text=n.parts.map(p=>typeof p==='string'?p:finish(p)).join(' ').replace(/\s+/g,' ').trim();n.key=compact(n.text);return n.text;}finish(root);return root;
}
export function descendants(n){return [n,...n.children.flatMap(descendants)];}
const textFacts=n=>Object.entries(n).filter(([k,v])=>k.startsWith('_')&&(typeof v?.text==='string'||typeof v?.num==='number')).map(([key,v])=>({key,text:String(v.text??v.num),ck:compact(v.text??v.num)}));
const identityOf=n=>n._title?.text??n._name?.text??n._text?.text??n._action?.label??null;
function ownRenderText(n){return n.parts.map(p=>typeof p==='string'?p:p.tag==='article'?'':ownRenderText(p)).join(' ');}
function ownedAnchors(n,render=false){return descendants(n).filter(a=>a.tag==='a'&&(!render||n.tag!=='article'||nearestArticle(a)===n));}
function nearestArticle(n){for(let p=n.parent;p;p=p.parent)if(p.tag==='article')return p;return null;}
function sourceScopes(node,root,contextFacts=[],rootOwner=false) {
 const id=identityOf(node);if(!id)return [];
 const ck=compact(id);if(!ck)return [];
 const facts=[...contextFacts,...textFacts(node),...(rootOwner?[]:Object.entries(node).flatMap(([k,v])=>!k.startsWith('_')&&v&&typeof v==='object'&&identityOf(v)?[{ck:compact(identityOf(v))}]:Array.isArray(v)?v.filter(c=>identityOf(c)).map(c=>({ck:compact(identityOf(c))})):[]))].filter(f=>f.ck.length>=3);
 const seeds=descendants(root).filter(n=>n.tag!=='root'&&!['script','style'].includes(n.tag)&&n.key.includes(ck)&&n.key.length<=6000&&!n.children.some(c=>c.key.includes(ck)));
 const candidates=[];
 // A heading owns following source siblings only until the next peer heading.
 // Retain the actual member addresses, never a synthetic business identifier.
 for(const seed of seeds){let heading=seed;while(heading.parent&&!/^h[1-6]$/.test(heading.tag))heading=heading.parent;
  if(!/^h[1-6]$/.test(heading.tag)||heading.key!==ck)continue;
  const siblings=heading.parent.children,start=siblings.indexOf(heading),members=[heading];
  for(const next of siblings.slice(start+1)){if(/^h[1-6]$/.test(next.tag)&&Number(next.tag[1])<=Number(heading.tag[1]))break;if(members.length>=12)break;members.push(next);}
  const key=compact(members.map(n=>n.text).join(' '));
  if(key.length<=6000)candidates.push({node:heading,members,score:facts.filter(f=>key.includes(f.ck)).length,anchors:members.flatMap(n=>ownedAnchors(n))});
 }
 for(const seed of seeds){let n=seed;for(let depth=0;n&&depth<9;depth++,n=n.parent){
  if(n.key.length>6000)break;
  const score=facts.filter(f=>n.key.includes(f.ck)).length;
  const anchors=ownedAnchors(n);if(anchors.length>80)break;
  candidates.push({node:n,score,anchors});
 }}
 if(!candidates.length)return [];
 const supported=candidates.filter(c=>(c.score>=2 || descendants(c.node).some(n=>n.key===ck))
  && (!rootOwner||!node._action?.label||(c.anchors.some(a=>a.key===compact(node._action.label))||node._action.verb==='submit'&&descendants(c.node).some(n=>n.tag==='form'&&n.attrs.action))));
 if(!supported.length)return [];
 const max=Math.max(...supported.map(c=>c.score));
 // Smallest structural context carrying the most independently preserved own facts.
 const tied=supported.filter(c=>c.score===max);
 const enclosing=tied.filter(c=>c.anchors.some(a=>textFacts(node).filter(f=>f.ck.length>=3&&a.key.includes(f.ck)).length>=2));
 const winners=enclosing.length?enclosing:tied;
 return winners.filter(c=>!winners.some(d=>d!==c&&d.node!==c.node&&d.node.key.length<c.node.key.length&&isInside(d.node,c.node))).filter((c,i,a)=>a.findIndex(d=>d.node===c.node)===i);
}
function isInside(n,p){for(let c=n.parent;c;c=c.parent)if(c===p)return true;return false;}
export function ownerOracle(model,html,dom,base) {
 const source=parseLinkTree(dom),render=parseLinkTree(html),allSource=descendants(source).filter(n=>n.tag==='a'),allRender=descendants(render).filter(n=>n.tag==='a');
 const cache=new WeakMap(),paths=new WeakMap(),parents=new WeakMap();walk(model,(n,p,parent)=>{paths.set(n,p);if(parent)parents.set(n,parent);});
 function contexts(node){if(cache.has(node))return cache.get(node);
  const id=identityOf(node),ck=compact(id??'');const facts=textFacts(node);
  let rs=descendants(render).filter(n=>n.tag==='article'&&n.children.some(c=>/^h[1-6]$/.test(c.tag)&&compact(c.text)===ck));
  if(rs.length>1){const scores=rs.map(n=>({n,score:facts.filter(f=>compact(ownRenderText(n)).includes(f.ck)).length}));const max=Math.max(...scores.map(s=>s.score));rs=scores.filter(s=>s.score===max).map(s=>s.n);}
  if (!rs.length && ck) rs=descendants(render).filter(n=>n.key===ck&&n.tag==='a');
  if (!rs.length && ck) rs=descendants(render).filter(n=>n.tag==='th'&&n.key.includes(ck));
  const bound=descendants(render).filter(n=>n.attrs['data-model-owner']===paths.get(node));
  if(bound.length)rs=bound.filter(n=>!ck||compact(ownRenderText(n)).includes(ck));
  const parent=parents.get(node);
  const extra=parent?[...textFacts(parent),...['_items','_lines'].flatMap(k=>(parent[k]??[]).filter(c=>c!==node&&identityOf(c)).map(c=>({ck:compact(identityOf(c))})))]:[];
  const siblings=parent?['_items','_lines'].flatMap(k=>parent[k]??[]):[];
  const bareDirectory=siblings.length>1 && siblings.every(c=>Object.keys(c).every(k=>['_name','_title','_text','_action','_intent','_key'].includes(k)));
  const inlineOwner=parent?._action&&node._action&&['navigate','open'].includes(node._action.verb)&&!node._items&&!node._lines&&textFacts(node).length===1;
  const value={source:sourceScopes(node,source,bareDirectory?extra:inlineOwner?textFacts(parent):[],paths.get(node)===''),render:rs};cache.set(node,value);return value;
 }
 const norm=a=>normalizeHref(a.attrs.href,base);
 const witness=a=>({address:a.address,text:a.text,href:a.attrs.href,target:norm(a)});
 const sourceOwners=ctx=>ctx.source.flatMap(c=>(c.members??[c.node]).map(n=>n.address));
 return {source,render,allSource,allRender,contexts,
  action(node) {
   const ctx=contexts(node),a=node._action;
   if(!a||!ctx.source.length)return null;
   const label=a.label||identityOf(node)||'';
   const labeled=ctx.source.flatMap(c=>c.anchors.filter(s=>compact(s.text)===compact(label)
    || s.key.includes(compact(label)) && (descendants(s).some(d=>d.key===compact(label))
     || textFacts(node).filter(f=>f.ck.length>=3&&s.key.includes(f.ck)).length>=2)));
   const matches=labeled.filter(s=>hrefIsReal(s.attrs.href)||s.attrs.href?.startsWith('#')&&s.attrs.href.length>1);
   if(a.verb==='submit')for(const c of ctx.source)for(const form of descendants(c.node).filter(n=>n.tag==='form'&&n.attrs.action))matches.push({...form,attrs:{...form.attrs,href:form.attrs.action}});
   if(!matches.length){
    if(labeled.length && hrefIsReal(a.to))return {status:'missing-owned-action',expected:[],sourceWitnesses:labeled.map(witness),sourceOwners:sourceOwners(ctx),renderOwners:ctx.render.map(n=>n.address)};
    return null;
   }
   const expected=[...new Set(matches.map(norm))],target=normalizeHref(a.to,base);
   const rendered=ctx.render.flatMap(n=>ownedAnchors(n,true));
   return {status:expected.includes(target)&&rendered.some(r=>norm(r)===target)?'owned-exact-action':'missing-owned-action',expected,sourceWitnesses:matches.map(witness),sourceOwners:sourceOwners(ctx),renderOwners:ctx.render.map(n=>n.address)};
  },
  fact(node,text,actionCandidates=[]){
   const ctx=contexts(node),ck=compact(text);
   if(!ctx.source.length)return null;
   const locals=ctx.source.flatMap(c=>c.anchors.filter(a=>(compact(a.text)===ck || compact(identityOf(node)??'')===ck && (descendants(a).some(d=>d.key===ck)||a.key.includes(ck)&&textFacts(node).filter(f=>f.ck.length>=3&&a.key.includes(f.ck)).length>=2))&&hrefIsReal(a.attrs.href)));
   const expected=new Set(locals.map(norm));
   if(!locals.length)return {status:'plain-context-fact',expected:[],sourceOwners:sourceOwners(ctx),renderOwners:ctx.render.map(n=>n.address),sourceWitnesses:ctx.source.flatMap(c=>c.anchors.map(witness))};
   const actions=actionCandidates.filter(a=>a&&expected.has(normalizeHref(a.to,base)));
   const rendered=ctx.render.flatMap(n=>ownedAnchors(n,true));
   const present=actions.some(a=>rendered.some(r=>norm(r)===normalizeHref(a.to,base)));
   return {status:present?'owned-exact-action':'missing-owned-action',expected:[...expected],sourceWitnesses:locals.map(witness),sourceOwners:sourceOwners(ctx),renderOwners:ctx.render.map(n=>n.address)};
  }
 };
}
