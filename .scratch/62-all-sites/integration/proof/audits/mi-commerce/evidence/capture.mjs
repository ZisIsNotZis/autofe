import {createRequire} from 'node:module';
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const require=createRequire('/home/z/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core/package.json');
const {chromium}=require('playwright-core');
const pages=['home','search-earbuds','search-phone','shop-category-list'];
const out='.scratch/62-all-sites/audit-mi-commerce';
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const hashes={};
for(const key of pages)for(const p of [`m1/curated/mi-com/${key}.json`,`m1/curated/renders/mi-com-${key}.html`,`corpus/mi-com/${key}/dom.html`,`corpus/mi-com/${key}/nodes.json`,`corpus/mi-com/${key}/full.png`])hashes[p]=hash(p);
const browser=await chromium.launch({executablePath:'/home/z/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox']});
const page=await browser.newPage(); const results=[];
await page.route('http://**',r=>r.abort());await page.route('https://**',r=>r.abort());
try{
for(const key of pages){
 for(const width of [2560,1920,1440,390]){
  await page.setViewportSize({width,height:900});
  await page.goto('file://'+process.cwd()+`/m1/curated/renders/mi-com-${key}.html`,{waitUntil:'load',timeout:15000});
  await page.evaluate(()=>document.fonts.ready);
  const data=await page.evaluate(()=>{
   const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
   const info=e=>({tag:e.tagName,id:e.id,class:e.className,text:(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,170),...rect(e)});
   const root=document.querySelector('main>.node');
   return {width:innerWidth,height:document.documentElement.scrollHeight,overflow:document.documentElement.scrollWidth-innerWidth,main:info(document.querySelector('main')),root:info(root),sections:[...root.querySelectorAll('.depth-1')].map(info),headings:[...document.querySelectorAll('h1,h2,h3,legend')].map(info),fields:[...document.querySelectorAll('input,select,fieldset')].map(info),tables:[...document.querySelectorAll('table')].map(info),footer:[...document.querySelectorAll('.g-footer,footer')].map(info),images:[...document.images].map(i=>({...info(i),src:i.getAttribute('src'),complete:i.complete,naturalW:i.naturalWidth,naturalH:i.naturalHeight,broken:!i.complete||!i.naturalWidth,enlarged:i.getBoundingClientRect().width>i.naturalWidth+1})),actions:[...document.querySelectorAll('a,[role=button],.ctl,.action')].map(e=>({...info(e),href:e.getAttribute('href')})),contrast:[...document.querySelectorAll('.title,.fact,.ctl,.action,.g-footer a,.header-bar a')].map(e=>({text:e.textContent.trim().slice(0,70),color:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundColor,parentBg:getComputedStyle(e.parentElement).backgroundColor,...rect(e)}))};
  });
  const png=`${out}/${key}-${width}.png`; await page.screenshot({path:png,fullPage:true});
  hashes[png]=hash(png);
  for(const i of data.images){const p=path.resolve('m1/curated/renders',i.src); if(fs.existsSync(p))hashes[path.relative(process.cwd(),p)]=hash(p);}
  results.push({key,...data,screenshot:png});
 }
 fs.writeFileSync(`${out}/geometry.json`,JSON.stringify(results,null,2));
 fs.writeFileSync(`${out}/hashes.json`,JSON.stringify(hashes,null,2));
 console.log(key,results.filter(r=>r.key===key).map(r=>({w:r.width,h:r.height,overflow:r.overflow,broken:r.images.filter(i=>i.broken).length,enlarged:r.images.filter(i=>i.enlarged).length,sections:r.sections.length})));
}
} finally {await browser.close();}
console.log('Captured 16 full-height local renders; baseline HTML/models/capture/assets hashed. No live-source requests allowed.');
