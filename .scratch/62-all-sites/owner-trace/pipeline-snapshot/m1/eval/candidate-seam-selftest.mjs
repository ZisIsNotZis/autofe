// Optional frozen content lane inputs; never writes models/assets or generated gallery.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { render } from '../render.mjs';
import { renderMarkdown } from '../render-md.mjs';
import { renderText } from '../render-text.mjs';
import { choicePlan, nodePlan, pageLayoutOf, hasTarget, hrefOf } from '../axis.mjs';
const exp={name:'selection',type:'text'};
const fixture={_expose:exp,_default:{text:'Two'},_items:[{_name:{text:'One'},_action:{to:'https://example.test/one'}},{_name:{text:'Two'},_action:{to:'https://example.test/two'}}]};
assert.deepEqual(choicePlan(fixture,exp).options.map(o=>o.selected),[false,true]);
assert.deepEqual(choicePlan(fixture,exp,[],{selection:'One'}).options.map(o=>o.selected),[true,false]);
assert.deepEqual(choicePlan({...fixture,_default:{text:'Absent'}},exp).options.map(o=>o.selected),[false,false]);
assert.match(render(fixture),/value="Two" checked/);
assert.match(renderMarkdown(fixture),/\(●\) \[Two\]\(https:\/\/example.test\/two\)/);
assert.match(renderText(fixture),/\(●\) Two/);
assert.match(renderMarkdown({_text:{text:'az vm list-skus --location <region> --output table'}}),/&lt;region&gt;/);
assert.doesNotMatch(render({_expose:{name:'password',type:'secret'},_default:{text:'never-emit-this'}}),/never-emit-this/);
const excerpts={_items:Array.from({length:4},(_,i)=>({_name:{text:`Result ${i}`},_summary:{text:'Long captured excerpt. '.repeat(10)},_action:{to:`https://example.test/result/${i}`}}))};
assert.ok(nodePlan(excerpts).items.groups.every(g=>!g.cols),'long summaries cannot become narrow named-feature grids');
const features={_items:Array.from({length:4},(_,i)=>({_name:{text:`Feature ${i}`},_detail:{text:'Capability description. '.repeat(10)}}))};
assert.ok(nodePlan(features).items.groups.some(g=>g.cols),'named feature-detail cards preserve accepted form');
const directory={_items:Array.from({length:12},(_,i)=>({_name:{text:`Ordinary longer product name ${i}`},_action:{to:`https://example.test/product/${i}`}}))};
assert.equal(nodePlan(directory).items.groups[0].cols,3);
assert.match(render(directory),/linklist cols3/);
assert.equal(nodePlan({_items:directory._items.map(it=>({...it,_name:{text:'Long sentence '.repeat(8)}}))}).items.groups[0].cols,0);
const login={login:{_composite:'login',identifier:{_expose:{name:'email',type:'text'},_label:{text:'Email'}},secret:{_expose:{name:'password',type:'secret'},_label:{text:'Password'}}}};
assert.equal(pageLayoutOf(login).kind,'authentication');assert.equal(nodePlan(login.login).taskForm,true);
assert.match(render(login),/authentication-page/);assert.match(render(login),/task-form/);
assert.match(render({_items:[{_name:{text:'Product'},_image:{image:'https://example.test/image.png'},_action:{verb:'navigate',to:'https://example.test/product'}}]}),/<a class="media-link" href="https:\/\/example.test\/product"><img/);
console.log('PASS defaults, override, absent choice, three targets, literal angle syntax, secret default, excerpt/feature distinction, shared directory columns, login task frame and owned media links');
const root=process.argv[2];
if(root){
 const handoff=JSON.parse(fs.readFileSync(root+'/.scratch/62-all-sites/content-handoff.json'));
 let total=0;
 const esc=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 for(const f of handoff.files.filter(f=>f.endsWith('.json'))){
  const m=JSON.parse(fs.readFileSync(root+'/'+f));const html=render(m),md=renderMarkdown(m);const targets=new Map();
  function walk(n){if(!n||typeof n!=='object')return;if(hasTarget(n._action)){const t=hrefOf(n._action.to);targets.set(t,(targets.get(t)||0)+1)}for(const [k,v]of Object.entries(n))if(k!=='_action')walk(v)}walk(m);
  for(const [t,count]of targets){assert.ok(html.split(`href="${esc(t)}"`).length-1>=count,`${f}: HTML occurrence loss ${t}`);assert.ok(md.split(`](${t})`).length-1>=count,`${f}: MD occurrence loss ${t}`);total+=count;}
 }
 console.log(`PASS27 frozen candidate models: ${total} safe per-node target occurrences preserved HTML+Markdown`);
}
