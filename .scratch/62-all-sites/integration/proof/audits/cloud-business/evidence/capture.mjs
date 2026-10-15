import {createRequire} from 'node:module';
import fs from 'node:fs';import crypto from 'node:crypto';
const require=createRequire('/home/z/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core/package.json');
const {chromium}=require('playwright-core');
const out='.scratch/62-all-sites/audit-cloud-business';
const pages=['aliyun-com/home','aliyun-com/product-ecs','aws-amazon/ec2-on-demand','stripe-com/pricing','grafana-play/play-home'];
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const hashes={};for(const k of pages)for(const p of [`m1/curated/${k}.json`,`m1/curated/renders/${k.replaceAll('/','-')}.html`,`m1/curated/renders/${k.replaceAll('/','-')}.png`,...['full.png','dom.html','nodes.json'].map(f=>`corpus/${k}/${f}`)])hashes[p]=hash(p);
fs.writeFileSync(out+'/input-hashes.json',JSON.stringify(hashes,null,2));
const browser=await chromium.launch({executablePath:process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox']});
const page=await browser.newPage();const results=[];const network=[];
page.on('requestfailed',r=>network.push({url:r.url(),error:r.failure()}));
try {
 for(const key of pages){
  for(const width of [2560,1920,1440,390]){
   await page.setViewportSize({width,height:900});
   await page.goto('file://'+process.cwd()+'/m1/curated/renders/'+key.replaceAll('/','-')+'.html',{waitUntil:'load',timeout:25000});
   await page.waitForTimeout(250);
   const measured=await page.evaluate(()=>{
    const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
    const info=e=>({tag:e.tagName,id:e.id,class:e.className,text:e.textContent.trim().slice(0,180),...rect(e)});
    const root=document.querySelector('main>.node');
    const style=e=>{const c=getComputedStyle(e);return {...info(e),color:c.color,bg:c.backgroundColor,fontSize:c.fontSize,fontWeight:c.fontWeight,backgroundImage:c.backgroundImage,parents:[e.parentElement,e.parentElement?.parentElement].filter(Boolean).map(p=>({class:p.className,bg:getComputedStyle(p).backgroundColor}))}};
    return {viewport:innerWidth,height:document.documentElement.scrollHeight,overflow:document.documentElement.scrollWidth-innerWidth,main:info(document.querySelector('main')),root:info(root),sections:[...root.querySelectorAll('.depth-1')].map(info),groups:[...root.children].map(info),tables:[...document.querySelectorAll('table')].map(e=>({...info(e),columns:e.rows[0]?.cells.length,rows:e.rows.length,scrollParent:info(e.parentElement)})),inputs:[...document.querySelectorAll('input,select,textarea')].map(info),images:[...document.images].map(i=>({...info(i),src:i.getAttribute('src'),naturalW:i.naturalWidth,naturalH:i.naturalHeight,broken:!i.complete||!i.naturalWidth,enlarged:i.getBoundingClientRect().width>i.naturalWidth+1})),links:[...document.querySelectorAll('a')].map(e=>({text:e.textContent.trim(),href:e.getAttribute('href'),...rect(e)})),textStyles:[...document.querySelectorAll('.title,.val,.controls,.ctl,.g-footer,.g-toolbar')].map(style),overflowElements:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.x< -1||r.right>innerWidth+1}).slice(0,80).map(info)};
   });
   const shot=out+'/'+key.replaceAll('/','-')+'-'+width+'.png';await page.screenshot({path:shot,fullPage:true,timeout:20000});
   results.push({key,width,htmlSha256:hash('m1/curated/renders/'+key.replaceAll('/','-')+'.html'),shot,shotSha256:hash(shot),...measured});
   fs.writeFileSync(out+'/measurements.json',JSON.stringify(results,null,2));
   console.log(JSON.stringify({key,width,height:measured.height,overflow:measured.overflow,broken:measured.images.filter(i=>i.broken).length,enlarged:measured.images.filter(i=>i.enlarged).length}));
  }
 }
}finally{fs.writeFileSync(out+'/network.json',JSON.stringify(network,null,2));await browser.close();}
