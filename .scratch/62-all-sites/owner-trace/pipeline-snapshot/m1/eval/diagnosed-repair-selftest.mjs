// Revision-bound falsification of diagnosed source/association repairs; not visual acceptance.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { render } from '../render.mjs';
import { renderMarkdown } from '../render-md.mjs';
import { renderText } from '../render-text.mjs';
import { selectForm, tableLinkPair, namedChildEntries, tableCellLinks } from '../axis.mjs';
import { auditPage } from './quote-selftest.mjs';
import { quoteEvidence } from './quote-evidence.mjs';
import { verifyIconBinding } from './icon-provenance.mjs';
const load = (k) => JSON.parse(fs.readFileSync(`m1/curated/${k}.json`));
const clean = (s) => s.replace(/\s+/g,'').toLowerCase();
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const clone = structuredClone;
let checks = 0;
const check = (label, value) => { assert.ok(value,label); checks++; console.log('ok ' + label); };
const icon = JSON.parse(fs.readFileSync('m1/eval/icon-provenance.json')).bindings[0];
const profile = load(icon.page), profileDom = fs.readFileSync(`corpus/${icon.page}/dom.html`,'utf8');
check('source-bound icon current proof', verifyIconBinding(profile,profileDom,icon).ok);
for (const mutation of ['count','order','label','target']) {
  const m = clone(profile), rows = m._lines[2]._lines;
  if (mutation === 'count') rows[2]._measure.num = 23535;
  if (mutation === 'order') [rows[2],rows[3]] = [rows[3],rows[2]];
  if (mutation === 'label') rows[2]._name.text = '获得充电';
  if (mutation === 'target') rows[2]._action = {verb:'navigate',to:'https://example.com'};
  check('icon refuses wrong '+mutation, !verifyIconBinding(m,profileDom,icon).ok);
}
check('evidence cannot declare arbitrary label for captured icon', !verifyIconBinding(profile,profileDom,{...icon,label:'获得充电'}).ok);
check('evidence cannot declare arbitrary semantic role', !verifyIconBinding(profile,profileDom,{...icon,role:'charging-count'}).ok);
const missingIcon = profileDom.replace(icon.iconClass,'removed-icon');
check('icon removal fails even at refreshed DOM hash', !verifyIconBinding(profile,missingIcon,{...icon,domSha256:sha(missingIcon)}).ok);
const quoteModel = load('sspai-com/post-102392'), ev = quoteEvidence('sspai-com/post-102392').ev;
const rawQuotes = (m) => auditPage('sspai-com/post-102392',m,ev,[]);
check('restored quotes have zero raw differences', !rawQuotes(quoteModel).droppedAll.length && !rawQuotes(quoteModel).unsupportedAll.length);
for (const i of [0,2]) {
  const m = clone(quoteModel), n = m.body._lines[0]._lines[i]; n._text=n._quote; delete n._quote;
  check('quote-to-text mutation '+i+' fails', rawQuotes(m).droppedAll.length > 0);
}
const briefModel = load('sspai-com/post-114699'), briefs = briefModel.briefs._lines;
check('eight complete ordered brief members, no duplicate body', briefs.length===8 && !briefModel.briefs._items && briefs.every((n)=>n._text && n['link-0']));
check('ordered linked paragraphs choose stack in shared form', selectForm(briefs,'sequence') === 'stack');
check('compact utility controls stay controls', selectForm([{_title:{text:'One'},_action:{verb:'navigate',to:'/one'}},{_title:{text:'Two'},_action:{verb:'navigate',to:'/two'}}],'set') === 'controls');
const require = createRequire(import.meta.url);
const { chromium } = require('/home/z/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core');
const executablePath = process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';
const browser = await chromium.launch({executablePath,headless:true,args:['--no-sandbox']});
try {
  const page = await browser.newPage(); await page.route('**/*',r=>r.abort());
  const dom = fs.readFileSync('corpus/sspai-com/post-114699/dom.html','utf8');
  await page.setContent(dom,{waitUntil:'domcontentloaded'});
  const sourceParagraphs = await page.locator('p,li').evaluateAll(ps=>ps.map(p=>({text:p.textContent,links:[...p.querySelectorAll('a[href]')].map(a=>[a.textContent,a.getAttribute('href')])})));
  const briefOracle = (m) => {
    const expected = sourceParagraphs.filter(p=>briefs.some(n=>clean(n._text.text)===clean(p.text)));
    return expected.length===8 && JSON.stringify(m.briefs._lines.map(n=>[clean(n._text.text),n['link-0']._action.to]))===JSON.stringify(expected.map(p=>[clean(p.text),p.links.at(-1)?.[1]]));
  };
  check('complete briefs source order/local targets',briefOracle(briefModel));
  const badBrief = clone(briefModel); [badBrief.briefs._lines[0]['link-0'],badBrief.briefs._lines[1]['link-0']]=[badBrief.briefs._lines[1]['link-0'],badBrief.briefs._lines[0]['link-0']];
  check('wrong-brief target relocation rejected', !briefOracle(badBrief));
  const utilities = sourceParagraphs.filter(p=>p.links.some(l=>l[1]==='https://sspai.com/page/client') || p.links.some(l=>l[1]==='https://sspai.com/mall'));
  const utilityOracle = (m) => {
    const actual=m['article-reading-utilities']._lines;
    return actual.length===2 && utilities.length===2 && actual.every((n,i)=>clean(n._text.text)===clean(utilities[i].text)
      && JSON.stringify(Object.values(n).filter(v=>v?._action).map(v=>[v._action.label,v._action.to]))===JSON.stringify(utilities[i].links))
      && Object.keys(m).indexOf('article-reading-utilities')<Object.keys(m).indexOf('support');
  };
  check('SRC-1 paragraph-local ordered targets and before support', utilityOracle(briefModel));
  for (const kind of ['move','swap','late']) {
    const m=clone(briefModel), ps=m['article-reading-utilities']._lines;
    if(kind==='move'){ps[1].client=ps[0].client;delete ps[0].client;}
    if(kind==='swap'){const x=ps[0].client;delete ps[0].client;ps[0].client=x;}
    if(kind==='late'){const x=m['article-reading-utilities'];delete m['article-reading-utilities'];m['article-reading-utilities']=x;}
    check('SRC-1 '+kind+' mutation fails',!utilityOracle(m));
  }
  await page.setContent(render(briefModel),{waitUntil:'domcontentloaded'});
  const serializedUtilities = await page.locator('.g-article-reading-utilities .fact').evaluateAll(ps=>ps.map(p=>({text:p.textContent,links:[...p.querySelectorAll('a[href]')].map(a=>[a.textContent,a.getAttribute('href')])})));
  check('SRC-1 HTML paragraph-local membership/order with no duplicate controls',JSON.stringify(serializedUtilities.map(p=>[clean(p.text),p.links]))===JSON.stringify(utilities.map(p=>[clean(p.text),p.links])));
  const renderedBriefs=await page.locator('.g-briefs .fact').evaluateAll(ps=>ps.map(p=>({text:p.textContent,links:[...p.querySelectorAll('a[href]')].map(a=>[a.textContent,a.getAttribute('href')])})));
  check('brief HTML complete single paragraphs/one local source each',renderedBriefs.length===8 && renderedBriefs.every((p,i)=>clean(p.text)===clean(briefs[i]._text.text) && p.links.length===1 && p.links[0][1]===briefs[i]['link-0']._action.to));
  const briefMd=renderMarkdown(briefModel), briefText=renderText(briefModel);
  for(const [i,n]of briefs.entries()) {
    check('brief Markdown single local source '+i,briefMd.includes('['+n['link-0']._action.label+']('+n['link-0']._action.to+')'));
    check('brief text single inline source '+i,briefText.includes(n._text.text.replace('来源','[来源]')));
  }
  const microsoft=load('learn-microsoft/vm-sizes');
  await page.setContent(fs.readFileSync('corpus/learn-microsoft/vm-sizes/dom.html','utf8'),{waitUntil:'domcontentloaded'});
  const base=JSON.parse(fs.readFileSync('corpus/learn-microsoft/vm-sizes/meta.json')).redirectedUrl;
  const sourceRows=await page.locator('table').evaluateAll(ts=>ts.map(t=>[...t.querySelectorAll('tbody tr')].map(r=>[...r.querySelectorAll('a[href]')].map(a=>[a.textContent.trim().replace(/\s+/g,' '),a.getAttribute('href')]))));
  const tableParents=[microsoft['vm-size-and-series-naming'],...Object.values(microsoft['families-by-type']).filter(n=>n?.families)];
  const tableNodes=[tableParents[0].classification,...tableParents.slice(1).map(n=>n.families)];
  const pairs=tableParents.map((p,i)=>tableLinkPair(p,tableNodes[i]));
  check('8 exact table pairs recognized',pairs.length===8 && pairs.every(Boolean));
  let total=0;
  for (let ti=0;ti<pairs.length;ti++) {
    const rows=tableNodes[ti]._items;
    for (let ri=0;ri<rows.length;ri++) {
      const actual=[...pairs[ti].bindings.get(rows[ri])].map(([label,link])=>[label,link.href]);
      const expect=sourceRows[ti][ri].map(([label,to])=>[label,new URL(to,base).href]); total+=expect.length;
      check(`source table${ti} row${ri} ordered exact targets`, JSON.stringify(actual)===JSON.stringify(expect));
    }
  }
  check('all127 source table anchors bound',total===127);
  const wrongParent=clone(tableParents[1]); const wrongInventory=wrongParent.destinations._lines;
  const moved=wrongInventory[0]._items.pop();wrongInventory[1]._items.push(moved);
  check('wrong-row relocation disables exact pairing',!tableLinkPair(wrongParent,wrongParent.families));
  await page.setContent(render(microsoft),{waitUntil:'domcontentloaded'});
  const renderedRows=await page.locator('table.data').evaluateAll(ts=>ts.map(t=>[...t.querySelectorAll('tbody tr')].map(r=>[...r.querySelectorAll('a[href]')].map(a=>[a.textContent.trim(),a.getAttribute('href')]))));
  check('render has8 source-owned tables, no detached inventory',renderedRows.length===8 && await page.locator('.g-destinations,.g-classification-links').count()===0);
  check('rendered23 rows retain exact127 local ordered links',JSON.stringify(renderedRows)===JSON.stringify(sourceRows.map(t=>t.map(r=>r.map(([label,to])=>[label,new URL(to,base).href])))));
  const md=renderMarkdown(microsoft), text=renderText(microsoft);
  for (const width of [2560,1920,1440,390]) {
    await page.setViewportSize({width,height:1000});
    await page.setContent(render(briefModel),{waitUntil:'domcontentloaded'});
    const rects=await page.locator('.g-briefs .fact').evaluateAll(ps=>ps.map(p=>{const r=p.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width}}));
    check(`brief8 distinct ordered reading edges ${width}`,rects.length===8 && rects.every((r,i)=>Math.abs(r.x-rects[0].x)<1 && Math.abs(r.w-rects[0].w)<1 && (!i||r.y>rects[i-1].y)));
    await page.setContent(render(microsoft),{waitUntil:'domcontentloaded'});
    const linkStyle=await page.locator('.table-link').first().evaluate(a=>({decoration:getComputedStyle(a).textDecorationLine,color:getComputedStyle(a).color,ink:getComputedStyle(a.closest('td')).color}));
    check(`table actions discoverable as links ${width}`,linkStyle.decoration.includes('underline') && linkStyle.color!==linkStyle.ink);
  }
  for(const pair of pairs)for(const links of pair.bindings.values())for(const[label,link]of links){check('Markdown exact cell target '+label,md.includes(']('+link.href+')'));check('text cell link shape '+label,text.includes('['+label+']'));}
} finally { await browser.close(); }
console.log(`Diagnosed repair selftest: PASS ${checks} assertions; source/structural proof only, not visual acceptance.`);
