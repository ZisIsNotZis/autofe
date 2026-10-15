import {createRequire} from 'node:module';import fs from 'node:fs';import path from 'node:path';
const require=createRequire('/home/z/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core/package.json');const {chromium}=require('playwright-core');
const out='.scratch/62-all-sites/audit-36kr-news-search';const b=await chromium.launch({executablePath:process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox']});const p=await b.newPage();const results=[];
try{for(const slug of ['home','information-technology','search-ai','search-viz'])for(const width of [2560,390]){
 await p.setViewportSize({width,height:900});await p.goto('file://'+path.resolve(`m1/curated/renders/36kr-com-${slug}.html`),{waitUntil:'load',timeout:20000});
 results.push({page:'36kr-com/'+slug,width,...await p.evaluate(()=>{
 const box=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
 const select=q=>[...document.querySelectorAll(q)];
 return {choices:select('fieldset.chipbar').map(e=>({class:e.className,rect:box(e),links:select('a').filter(a=>e.contains(a)).map(a=>a.href),options:[...e.querySelectorAll('input')].map(i=>({name:i.name,value:i.value,checked:i.checked,outerHTML:i.parentElement.outerHTML}))})),
 defrows:select('.g-featured .defrow,.g-hot .defrow').map(e=>({row:box(e),label:box(e.querySelector('.deflabel')),image:box(e.querySelector('img')),labelHref:e.querySelector('.deflabel a')?.href,imageHref:e.querySelector('img')?.closest('a')?.href})),
 cards:select('.g-results .cards .item,.g-feed .cards .item').map(e=>({text:e.innerText.slice(0,80),rect:box(e),images:[...e.querySelectorAll('img')].map(i=>({box:box(i),natural:[i.naturalWidth,i.naturalHeight],href:i.closest('a')?.href}))})),
 linkStyles:select('.self-link,.deflabel a').slice(0,4).map(e=>({selector:e.className,text:e.innerText,fontSize:getComputedStyle(e).fontSize,fontWeight:getComputedStyle(e).fontWeight,color:getComputedStyle(e).color,background:getComputedStyle(document.body).backgroundColor}))};
 })});
}}finally{await b.close();fs.writeFileSync(out+'/detail-probe.json',JSON.stringify(results,null,2));}
console.log('Captured precise defrow/choice/image-link/card geometry for four pages × 2560/390; no source mutation.');
