import {createRequire} from 'node:module';import fs from 'node:fs';
const require=createRequire('/home/z/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core/package.json');
const {chromium}=require('playwright-core');
const b=await chromium.launch({executablePath:'/home/z/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox']});const p=await b.newPage();const out=[];
await p.route('http://**',r=>r.abort());await p.route('https://**',r=>r.abort());
try{for(const key of ['home','search-earbuds','search-phone','shop-category-list'])for(const width of [2560,1920,1440,390]){
 await p.setViewportSize({width,height:900});await p.goto('file://'+process.cwd()+`/m1/curated/renders/mi-com-${key}.html`,{waitUntil:'load',timeout:15000});
 const r=await p.evaluate(()=>{
  const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
  const info=e=>{const s=getComputedStyle(e);let a=e,bg=s.backgroundColor;while(bg==='rgba(0, 0, 0, 0)'&&a.parentElement){a=a.parentElement;bg=getComputedStyle(a).backgroundColor;}return {tag:e.tagName,class:e.className,text:e.textContent.trim().replace(/\s+/g,' ').slice(0,85),...rect(e),font:s.fontSize,weight:s.fontWeight,color:s.color,bg,href:e.getAttribute('href'),value:e.value,placeholder:e.getAttribute('placeholder')};};
  return {title:[...document.querySelectorAll('h1')].map(info),hero:[...document.querySelectorAll('.hero .val')].map(info),filterBools:[...document.querySelectorAll('input[type=checkbox]')].map(e=>info(e.closest('.node')||e.parentElement)),anchors:[...document.querySelectorAll('a')].map(info),submit:document.querySelectorAll('input[type=submit],button[type=submit],.fieldbar .ctl,.fieldbar .action').length,images:[...document.images].map(i=>({src:i.getAttribute('src'),parentTag:i.parentElement.tagName,clickable:!!i.closest('a'),natural:i.naturalWidth,...rect(i)}))};
 });
 out.push({key,width,...r});
}}finally{await b.close();}
fs.writeFileSync('.scratch/62-all-sites/audit-mi-commerce/runtime.json',JSON.stringify(out,null,2));console.log('Runtime probe: 16 page/width pairs saved; image clickability, input/submit, computed text/surface styles and geometry recorded.');
