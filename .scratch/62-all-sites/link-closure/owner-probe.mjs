// Source-bound contract probe, NOT a replacement production acceptance oracle.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { normalizeHref } from '../../../m1/eval/link-coverage.mjs';
const data=JSON.parse(fs.readFileSync('.scratch/62-all-sites/link-closure/structural-cases.json'));
const hw=data.cases.find(c=>c.id==='huawei-cn/consumer-phones:1');
const base='https://consumer.huawei.com/cn/phones/';
const src=hw.structuralSourceCandidates[0].anchors[0];
const owner=hw.structuralRenderCandidates.find(c=>c.anchors.length===2&&c.anchors[0].href.endsWith('/'));
const expected=normalizeHref(src.href,base);
// Exact rendered owner address, derived from actual structural witness, is fixed in this probe.
// A future production oracle must prove correspondence itself; these addresses are not identities.
const check=anchors=>anchors.some(a=>a.owner===owner.address&&normalizeHref(a.href,base)===expected);
const actual=owner.anchors.map(a=>({...a,owner:owner.address}));
let assertions=0;const test=(name,fn)=>{fn();assertions++;console.log('PASS',name)};
test('captured Huawei title target available through correct owned action with plain title',()=>assert.equal(check(actual),true));
test('same-host wrong path rejected',()=>assert.equal(check(actual.map(a=>({...a,href:'https://consumer.huawei.com/cn/phones/mate-80/'}))),false));
test('query change rejected',()=>assert.equal(check(actual.map(a=>({...a,href:a.href+'?variant=other'}))),false));
test('fragment change rejected',()=>assert.equal(check(actual.map(a=>({...a,href:a.href+'#other'}))),false));
test('dropped target rejected',()=>assert.equal(check([]),false));
test('neighbor owner action relocation rejected',()=>assert.equal(check(actual.map(a=>({...a,owner:owner.address+'-neighbor'}))),false));
test('global URL reuse cannot satisfy owner',()=>assert.equal(check([{href:src.href,owner:'/global/navigation'}]),false));
const neighbor=data.cases.find(c=>c.page==='huawei-cn/consumer-phones'&&c.finding.expect?.[0]!==expected&&c.finding.expect?.[0]);
test('swapped to another actual captured source target rejected',()=>assert.equal(check(actual.map(a=>({...a,href:neighbor.finding.expect[0]}))),false));
const author=data.cases.find(c=>c.id==='36kr-com/home:1');
test('36kr author is a distinct source card action, absent from corresponding render card',()=>{
 assert.equal(author.structuralSourceCandidates.length,1);assert.equal(author.structuralRenderCandidates.length,1);
 const s=author.structuralSourceCandidates[0];assert(s.text.includes('HYROX道歉'));assert(s.anchors.some(a=>a.href==='/user/5922386'&&a.text==='贺哲馨'));
 assert(!author.structuralRenderCandidates[0].anchors.some(a=>normalizeHref(a.href,'https://36kr.com')==='https://36kr.com/user/5922386'));
});
console.log(`${assertions} source-bound contract probes passed; production oracle remains INCOMPLETE`);
