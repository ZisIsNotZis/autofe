import fs from 'node:fs';
import assert from 'node:assert/strict';
import {render} from './render.mjs';
import {renderMarkdown} from './render-md.mjs';
import {childrenOf,factsOf} from './model-lib.mjs';
import {nodePlan} from './axis.mjs';
const get=(s,p)=>JSON.parse(fs.readFileSync(`m1/curated/${s}/${p}.json`));
const actions=(n)=>[...(n._action?[n._action]:[]),...childrenOf(n).flatMap(c=>actions(c.node))];
let assertions=0;const check=(v,message)=>{assert.ok(v,message);assertions++};
for(const s of ['github-com','stripe-dashboard','xiaomi-account']){const m=get(s,'login'),p=nodePlan(m.login);check(p.actionBeforeChild==='alternatives',s+' submit position');for(const h of [render(m),renderMarkdown(m)]){const submit=m.login.submit._action.label;check(h.indexOf(submit)<h.indexOf(m.login.alternatives._items[0]._action.label),s+' credential before providers');}}
for(const p of ['search-phone','search-laptop']){const h=render(get('huawei-cn',p));check(h.includes('class="action search-submit"'),'visible targetless search');check(!h.includes('form action='),'no invented endpoint');}
for(const [s,p,owner]of [['36kr-com','home','feed'],['36kr-com','search-ai','results'],['sspai-com','home','feed'],['huawei-cn','search-phone','results']]){const m=get(s,p),parent=m[owner];const list=parent._items??parent._lines;check(list.every(n=>nodePlan(n,{chain:[m,parent]}).recordMember),s+p+' coherent records');}
check(!render(get('bilibili-com','home')).includes('record-member"'),'accepted video cards not editorial records');
check(render(get('sspai-com','post-102392')).includes('instruction-media'),'sequential instruction imagery');
check((render(get('sspai-com','post-102392')).match(/<details class="resource-view"/g)||[]).length===4,'four original image disclosures');
for(const p of ['home','search-phone','search-earbuds','shop-category-list']){const m=get('mi-com',p),base=JSON.parse(fs.readFileSync(`.scratch/62-all-sites/experience-repair/ui/baseline/${p}.json`));assert.deepEqual(actions(m),actions(base),'lossless action sequence '+p);assertions++;const plan=nodePlan(m.footer,{chain:[m]});check(plan.actionRow.length===0,p+' all legal actions consumed inline');const h=render(m);check(h.includes('选购指南')&&h.includes('服务中心'),'source footer groups');const para=m.footer.notices._lines.find(n=>n._text.text.includes('小米商城 |'));check(nodePlan(para,{chain:[m,m.footer,m.footer.notices]}).inlineChildren.length===14,'all14 source legal paragraph links once');}
const m=get('learn-microsoft','vm-sizes');const find=n=>n['name-structure-breakdown']??childrenOf(n).map(c=>find(c.node)).find(Boolean);const units=find(m)._lines;check(units[1]._image&&units.slice(2,7).every((n,i)=>n._text.text.startsWith(String(i+1)+' ')),'diagram then five numbered units');const base=JSON.parse(fs.readFileSync('.scratch/62-all-sites/experience-repair/ui/baseline/vm-sizes.json'));assert.deepEqual(actions(m),actions(base),'all Microsoft table/actions/order unchanged');assertions++;check(units.slice(2,7).map(n=>n._text.text).join(' ')===find(base)._lines[1]._text.text,'exact explanation text lossless');
console.log(`PASS ${assertions} UX assertions; visual/owner integration acceptance separate`);
