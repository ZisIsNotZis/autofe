import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {checkPage,normalizeHref} from './link-coverage.mjs';import {ownerOracle,parseLinkTree,descendants} from './link-owners.mjs';import {checkSourceWitnesses}from './link-source-witnesses.mjs';import{render}from '../render.mjs';import{walk}from '../model-lib.mjs';
const EMPTY={entries:[],index:new Map()},BASE='https://example.test/page';let count=0;const test=(name,fn)=>{fn();count++;console.log('PASS',name);};
const model={_title:{text:'Catalog'},_items:[{_name:{text:'Alpha device'},_detail:{text:'Distinct alpha context'},_action:{verb:'open',label:'Learn more',to:'https://example.test/alpha'}},{_name:{text:'Beta device'},_detail:{text:'Distinct beta context'},_action:{verb:'open',label:'Learn more',to:'https://example.test/beta'}}]};
const composite='<main><a href="/alpha"><h2>Alpha device</h2><p>Distinct alpha context</p><span>Learn more</span></a><a href="/beta"><h2>Beta device</h2><p>Distinct beta context</p><span>Learn more</span></a></main>';
test('composite source card maps plain caption to its intended owned CTA',()=>assert.equal(checkPage('fixture/composite',model,render(model),composite,BASE,EMPTY).findings.length,0));
test('composite other-owner target is rejected',()=>{const m=structuredClone(model);m._items[0]._action.to=m._items[1]._action.to;assert(checkPage('fixture/composite',m,render(m),composite,BASE,EMPTY).findings.length);});
const sections='<main><h3>Alpha device</h3><p>Distinct alpha context <a href="/alpha">Source</a></p><h3>Beta device</h3><p>Distinct beta context <a href="/beta">Source</a></p></main>',paragraphs=structuredClone(model);paragraphs._items.forEach(n=>n._action.label='Source');
test('heading owns following paragraph without borrowing peer source action',()=>assert.equal(checkPage('fixture/paragraph',paragraphs,render(paragraphs),sections,BASE,EMPTY).findings.length,0));
test('same-label neighboring paragraph target swap fails',()=>{const m=structuredClone(paragraphs);m._items[0]._action.to=m._items[1]._action.to;assert(checkPage('fixture/paragraph',m,render(m),sections,BASE,EMPTY).findings.length);});
const form={_title:{text:'Search catalog'},_action:{verb:'submit',label:'Search catalog',to:'https://example.test/search'}},formDom='<form action="/search"><label>Search catalog</label><input name="keyword"></form>';
test('captured form action is an independent exact target witness',()=>assert.equal(checkPage('fixture/form',form,render(form),formDom,BASE,EMPTY).findings.length,0));
for(const to of ['https://example.test/other','https://example.test/search?q=wrong','https://example.test/search#wrong'])test('form mutation rejects '+to,()=>{const m=structuredClone(form);m._action.to=to;assert(checkPage('fixture/form',m,render(m),formDom,BASE,EMPTY).findings.length);});
const fragment={_name:{text:'General purpose'},_action:{verb:'navigate',label:'General purpose',to:BASE+'#general-purpose'}},fragmentDom='<nav><a href="#general-purpose">General purpose</a><a href="#compute">Compute optimized</a></nav>';
test('source fragment target is preserved exactly',()=>assert.equal(checkPage('fixture/fragment',fragment,render(fragment),fragmentDom,BASE,EMPTY).findings.length,0));
for(const to of [BASE+'#compute',BASE,BASE+'?q=wrong#general-purpose'])test('fragment mutation rejects '+to,()=>{const m=structuredClone(fragment);m._action.to=to;assert(checkPage('fixture/fragment',m,render(m),fragmentDom,BASE,EMPTY).findings.length);});
const duplicate=structuredClone(model);duplicate._items.forEach(n=>n._name.text='Device caption');const duplicateDom=composite.replaceAll('Alpha device','Device caption').replaceAll('Beta device','Device caption');
test('duplicate/plain caption positive uses distinct source-owned context',()=>assert.equal(checkPage('fixture/duplicate',duplicate,render(duplicate),duplicateDom,BASE,EMPTY).findings.length,0));
test('duplicate caption swapped owner action is rejected',()=>{const m=structuredClone(duplicate);m._items[0]._action.to=m._items[1]._action.to;assert(checkPage('fixture/duplicate',m,render(m),duplicateDom,BASE,EMPTY).findings.length);});
const entries=JSON.parse(fs.readFileSync('m1/eval/link-owner-witnesses.json')).entries;
for(const page of new Set(entries.map(e=>e.page))){const es=entries.filter(e=>e.page===page),m=JSON.parse(fs.readFileSync(`m1/curated/${page}.json`)),dom=fs.readFileSync(`corpus/${page}/dom.html`,'utf8'),html=fs.readFileSync(`m1/curated/renders/${page.replaceAll('/','-')}.html`,'utf8'),meta=JSON.parse(fs.readFileSync(`corpus/${page}/meta.json`)),base=meta.redirectedUrl??meta.url,o=ownerOracle(m,html,dom,base);
 test(page+' all mandatory source-owned capabilities pass',()=>assert.deepEqual(checkSourceWitnesses(es,m,o,dom,base),[]));
 for(const e of es){
  if(e.referenceKey){
   for(const mutation of ['drop','existing-other-owner'])test(e.id+' generated reference rejects '+mutation,()=>{const changed=structuredClone(m),nodes=new Map();walk(changed,(n,p)=>nodes.set(p,n));if(mutation==='drop')delete nodes.get(e.modelOwner)._ref;else nodes.get(e.modelOwner)._ref.ref='key:highlights';assert(checkSourceWitnesses([e],changed,o,dom,base).length);});
   test(e.id+' generated reference rejects relocated render owner',()=>assert(checkSourceWitnesses([e],m,ownerOracle(m,html.replaceAll('href="#'+e.referenceKey+'"','data-removed="#'+e.referenceKey+'"')+'<aside><a href="#'+e.referenceKey+'">'+e.sourceTargetText+'</a></aside>',dom,base),dom,base).length));
   continue;
  }
  const clone=()=>{const changed=structuredClone(m),nodes=new Map();walk(changed,(n,p)=>nodes.set(p,n));return [changed,nodes.get(e.modelOwner)];};
  for(const mutation of ['drop','path','query','fragment'])test(e.id+' rejects '+mutation,()=>{const [changed,node]=clone();if(mutation==='drop')delete node._action;else{const url=new URL(e.target);if(mutation==='path')url.pathname+='/wrong';if(mutation==='query')url.search+='&wrong=1';if(mutation==='fragment')url.hash='#wrong';node._action.to=url.href;}assert(checkSourceWitnesses([e],changed,o,dom,base).length);});
  const other=es.find(a=>!a.referenceKey&&a.target!==e.target);
  if(other)test(e.id+' existing neighboring capability URL swap fails',()=>{const [changed,node]=clone();node._action.to=other.target;assert(checkSourceWitnesses([e],changed,o,dom,base).length);});
  test(e.id+' rejects invalid source-owner association',()=>assert(checkSourceWitnesses([{...e,sourceOwner:'/absent-owner'}],m,o,dom,base).length));
  const outside=html.replace(/href="([^"]*)"/g,(all,href)=>normalizeHref(href,base)===e.target?'data-removed="'+href+'"':all)+'<aside><a href="'+e.target+'">'+e.sourceText+'</a></aside>';
  test(e.id+' global URL elsewhere cannot replace bound rendered action',()=>assert(checkSourceWitnesses([e],m,ownerOracle(m,outside,dom,base),dom,base).length));
 }
 test(page+' stale capture binding fails closed',()=>assert(checkSourceWitnesses(es,m,o,dom+' ',base).length));
}
console.log(count+' source-witness/phenotype assertions passed');
