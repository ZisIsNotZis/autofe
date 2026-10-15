import {createRequire} from 'node:module';
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const require=createRequire('/home/z/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core/package.json');
const {chromium}=require('playwright-core');
const dir=path.resolve('.scratch/62-all-sites/audit-huawei-commerce');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const pages=process.argv.slice(2); const all={baseline:'403cd5be096db89b428e130ad57cca730b425fdc',time:new Date().toISOString(),pages:{}};
const b=await chromium.launch({executablePath:'/home/z/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox']});
try {
 const p=await b.newPage({viewport:{width:2560,height:1000}});
 for (const key of pages) {
  const html=path.resolve(`m1/curated/renders/huawei-cn-${key}.html`);
  const info={hashes:{},viewports:{}};
  for(const file of [html,`m1/curated/huawei-cn/${key}.json`,...['dom.html','nodes.json','full.png','meta.json'].map(f=>`corpus/huawei-cn/${key}/${f}`)])info.hashes[path.relative(process.cwd(),file)]=hash(file);
  const errors=[]; p.on('pageerror',e=>errors.push(String(e)));
  await p.setViewportSize({width:2560,height:1000});
  await p.goto('file://'+html,{waitUntil:'domcontentloaded',timeout:20000});
  await p.evaluate(()=>Promise.race([Promise.all([...document.images].map(i=>i.complete?Promise.resolve():new Promise(r=>{i.onload=i.onerror=r}))),new Promise(r=>setTimeout(r,18000))]));
  for (const width of [2560,1920,1440,390]) {
   await p.setViewportSize({width,height:1000}); await p.waitForTimeout(200);
   const measurements=await p.evaluate(()=>{
    const box=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {tag:e.tagName,id:e.id,class:e.className,text:e.textContent?.trim().slice(0,130),x:r.x,y:r.y,w:r.width,h:r.height,font:s.fontSize,color:s.color,bg:s.backgroundColor,display:s.display}};
    return {viewport:innerWidth,height:document.documentElement.scrollHeight,scrollWidth:document.documentElement.scrollWidth,main:box(document.querySelector('main')),root:box(document.querySelector('.depth-0')),title:box(document.querySelector('h1')),sections:[...document.querySelectorAll('.depth-1')].map(box),forms:[...document.querySelectorAll('input,select,fieldset,.controls,.paginator')].map(box),images:[...document.images].map(e=>({...box(e),src:e.getAttribute('src'),complete:e.complete,naturalW:e.naturalWidth,naturalH:e.naturalHeight})),actions:[...document.querySelectorAll('a')].map(e=>({...box(e),href:e.getAttribute('href')})),overflow:[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1||r.left< -1}).map(box).slice(0,80),groups:[...document.querySelectorAll('.cards,.product-cards,.deflist,.defrow,.seq,.seq-item,.chipbar,.footer,footer,table')].map(box)};
   });
   const shot=path.join(dir,`huawei-cn-${key}-${width}.png`); await p.screenshot({path:shot,fullPage:true,timeout:15000});
   info.viewports[width]={...measurements,screenshot:path.relative(process.cwd(),shot),sha256:hash(shot),errors:[...errors]};
  }
  all.pages[key]=info; fs.writeFileSync(path.join(dir,`capture-${pages.join('_')}.json`),JSON.stringify(all,null,2));
  console.log(JSON.stringify({page:key,viewports:Object.fromEntries(Object.entries(info.viewports).map(([w,v])=>[w,{height:v.height,scrollWidth:v.scrollWidth,brokenImages:v.images.filter(i=>!i.naturalW).length,overflow:v.overflow.length}]))}));
 }
} finally {await b.close()}
