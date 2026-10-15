import {createRequire} from 'node:module';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const require=createRequire('/home/z/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core/package.json');
const {chromium}=require('playwright-core');
const out='.scratch/62-all-sites/audit-sspai-editorial';
const pages=['home','matrix','post-102392','post-114699','u-jtc092al'];
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const hashes={};const results=[];const evidence=[];
for(const page of pages){for(const file of [`m1/curated/sspai-com/${page}.json`,`m1/curated/renders/sspai-com-${page}.html`,`corpus/sspai-com/${page}/dom.html`,`corpus/sspai-com/${page}/nodes.json`,`corpus/sspai-com/${page}/full.png`])hashes[file]=hash(file);}
const browser=await chromium.launch({executablePath:process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox']});
const tab=await browser.newPage();
try{
 for(const page of pages){
  for(const width of [2560,1920,1440,390]){
   await tab.setViewportSize({width,height:1000});
   await tab.goto('file://'+process.cwd()+`/m1/curated/renders/sspai-com-${page}.html`,{waitUntil:'networkidle',timeout:20000});
   await tab.evaluate(()=>document.fonts.ready);
   const data=await tab.evaluate(()=>{
    const box=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {tag:e.tagName,id:e.id,classes:e.className,x:r.x,y:r.y+scrollY,w:r.width,h:r.height,color:s.color,bg:s.backgroundColor,font:s.fontSize,display:s.display,text:e.innerText?.slice(0,200)}};
    const main=document.querySelector('main');
    const imgs=[...document.images].map(e=>({...box(e),src:e.getAttribute('src'),naturalW:e.naturalWidth,naturalH:e.naturalHeight,complete:e.complete}));
    return {height:document.documentElement.scrollHeight,scrollWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth-innerWidth,main:box(main),root:box(main.firstElementChild),sections:[...document.querySelectorAll('.depth-1')].map(box),headings:[...document.querySelectorAll('h1,h2,h3,h4')].map(box),utilities:[...document.querySelectorAll('.g-nav,.g-footer,.controls,.ctl,.action')].map(box),images:imgs,broken:imgs.filter(e=>!e.complete||!e.naturalW),enlarged:imgs.filter(e=>e.w>e.naturalW+1),links:[...document.querySelectorAll('a')].map(e=>({text:e.innerText,href:e.getAttribute('href')})),forms:[...document.querySelectorAll('fieldset,table,input,select,textarea')].map(box)};
   });
   results.push({page,width,...data});
   const file=`${out}/${page}-${width}.png`;await tab.screenshot({path:file,fullPage:true});evidence.push(file);
  }
  fs.appendFileSync(out+'/ticket.md',`\n- ${new Date().toISOString()} — actor audit-sspai-editorial worker: ${page} captured whole-height at2560/1920/1440/390 and geometry; image inspection pending.\n`);
 }
}finally{await browser.close();fs.writeFileSync(out+'/measurements.json',JSON.stringify(results,null,2));for(const file of evidence)hashes[file]=hash(file);fs.writeFileSync(out+'/covered-hashes.json',JSON.stringify(hashes,null,2));}
console.log(JSON.stringify(results.map(r=>({page:r.page,width:r.width,height:r.height,overflow:r.overflow,broken:r.broken.length,enlarged:r.enlarged.length,root:r.root.classes,sections:r.sections.map(s=>({id:s.id,x:s.x,w:s.w,h:s.h})),images:r.images.length})),null,2));
