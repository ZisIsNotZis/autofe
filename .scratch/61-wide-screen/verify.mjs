import {createRequire} from 'node:module';
import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const require=createRequire('/home/z/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core/package.json');
const {chromium}=require('playwright-core');
const keys=['sspai-com-post-114716','taobao-com-home','mi-com-product-detail-mi15','apple-com-home','apple-com-ipad-air','airbnb-com-room-28871','bilibili-com-home'];
const b=await chromium.launch({executablePath:process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox']});
const p=await b.newPage();const results=[];
try {
 for(const width of [2560,1920,1440,390]) {
  await p.setViewportSize({width,height:width===2560?1440:900});
  for(const key of keys) {
   const htmlPath='m1/curated/renders/'+key+'.html';
   await p.goto('file://'+process.cwd()+'/'+htmlPath,{waitUntil:'networkidle',timeout:30000});
   const r=await p.evaluate(()=>{
    const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
    const root=document.querySelector('main>.node');
    return {width:innerWidth,height:document.body.scrollHeight,profile:root.className,
     overflow:document.documentElement.scrollWidth-innerWidth,
     broken:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),
     enlarged:[...document.images].filter(i=>i.getBoundingClientRect().width>i.naturalWidth+1).map(i=>i.src),
     sections:[...root.querySelectorAll('.depth-1')].map(e=>({...rect(e),id:e.id,title:e.querySelector('.title')?.textContent})),
     reading:[...root.querySelectorAll('.reading-page .depth-1')].map(rect),
     cover:root.querySelector(':scope>.band')?rect(root.querySelector(':scope>.band')):null,
     footer:root.querySelector('.g-footer')?rect(root.querySelector('.g-footer')):null,
     task:root.querySelector('.detail-task')?rect(root.querySelector('.detail-task')):null,
     detailMain:root.querySelector('.detail-main')?rect(root.querySelector('.detail-main')):null,
     banners:[...root.querySelectorAll('.banner-integrated')].map(e=>({...rect(e),bg:getComputedStyle(e).backgroundColor})),
     main:rect(document.querySelector('main'))};
   });
   results.push({key,sha256:crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex'),...r});
   assert(r.overflow<=1,key+' overflow '+r.overflow);
   assert.equal(r.broken.length,0,key+' broken');assert.equal(r.enlarged.length,0,key+' enlarged');
   if(key==='taobao-com-home'||key==='apple-com-ipad-air') {
    const first=r.sections[0];for(const s of r.sections){assert(Math.abs(s.x-first.x)<1,key+' inconsistent left');assert(Math.abs(s.w-first.w)<1,key+' inconsistent width');}
   }
   if(key.startsWith('sspai'))for(const s of r.reading){assert(Math.abs(s.x-r.cover.x)<1);assert(Math.abs(s.w-r.cover.w)<1);}
   if(key==='apple-com-home') {
    assert.equal(r.banners.length,3);for(const s of r.sections){assert(Math.abs(s.x-r.banners[0].x)<1);assert(Math.abs(s.w-r.banners[0].w)<1);}
    if(width>=1920){assert(r.banners[0].w<=1680);assert(r.banners[0].x>0);}
   }
   if(key.startsWith('airbnb')){assert(r.task);if(width>900){assert(r.task.x>=r.detailMain.x+r.detailMain.w);assert(r.task.h<600);}else assert(r.task.y>=r.detailMain.y+r.detailMain.h-1);}
   if(key.startsWith('mi-')&&width>=1440)assert(r.footer.h<500);
   if(width===2560||width===390)await p.screenshot({path:'.scratch/61-wide-screen/'+key+'-'+width+'.png',fullPage:true});
  }
 }
} finally {fs.writeFileSync('.scratch/61-wide-screen/measurements.json',JSON.stringify(results,null,2));await b.close();}
console.log('PASS: seven pages × 2560/1920/1440/390; consistent page frames, detail columns, no overflow/broken/enlarged images.');
