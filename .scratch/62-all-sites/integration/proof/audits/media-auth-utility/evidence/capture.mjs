import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const require=createRequire('/home/z/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core/package.json');
const {chromium}=require('playwright-core');
const dir='.scratch/62-all-sites/audit-media-auth-utility';
const keys=['bilibili-com-read-home','bilibili-com-video-bv1gj411x7h7','github-com-login','stripe-dashboard-login','xiaomi-account-login'];
const hash=buf=>crypto.createHash('sha256').update(buf).digest('hex');
fs.mkdirSync(dir+'/shots',{recursive:true});fs.mkdirSync(dir+'/image-responses',{recursive:true});
const rows=[],responses=[],failures=[];
const browser=await chromium.launch({executablePath:process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox']});
const p=await browser.newPage();
p.on('requestfailed',r=>failures.push({url:r.url(),failure:r.failure()}));
p.on('response',async r=>{if(r.request().resourceType()==='image'){try{const bytes=await r.body();const sha256=hash(bytes);const file=dir+'/image-responses/'+sha256;fs.writeFileSync(file,bytes);responses.push({url:r.url(),status:r.status(),sha256,file});}catch(e){failures.push({url:r.url(),error:String(e)})}}});
try {
 for(const key of keys){
  for(const width of [2560,1920,1440,390]){
   await p.setViewportSize({width,height:900});
   const htmlPath='m1/curated/renders/'+key+'.html';
   await p.goto('file://'+path.resolve(htmlPath),{waitUntil:'load',timeout:20000});
   await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(100);
   const metrics=await p.evaluate(()=>{
    const rect=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {tag:e.tagName,cls:e.className,text:e.textContent?.trim().slice(0,110),x:r.x,y:r.y,w:r.width,h:r.height,fg:s.color,bg:s.backgroundColor,font:s.fontSize}};
    const sels=['main','h1','.depth-1','.group','.controls','.action-plain','.ctl','.expose-input','input','.fact','.item','.g-footer'];
    return {viewport:{w:innerWidth,h:innerHeight},document:{w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight},elements:Object.fromEntries(sels.map(s=>[s,[...document.querySelectorAll(s)].map(rect)])),images:[...document.images].map(i=>({src:i.src,alt:i.alt,natural:[i.naturalWidth,i.naturalHeight],complete:i.complete,...rect(i)})),links:[...document.querySelectorAll('a')].map(e=>({label:e.textContent,href:e.getAttribute('href')})),text:document.body.innerText};
   });
   const shot=dir+'/shots/'+key+'-'+width+'.png';await p.screenshot({path:shot,fullPage:true});
   rows.push({key,width,htmlPath,htmlSha256:hash(fs.readFileSync(htmlPath)),shot,shotSha256:hash(fs.readFileSync(shot)),...metrics});
   fs.writeFileSync(dir+'/measurements.json',JSON.stringify({baseline:'403cd5be096db89b428e130ad57cca730b425fdc',rows,responses,failures},null,2));
   console.log(key,width,metrics.document.h,'overflow',metrics.document.w-width,'broken',metrics.images.filter(i=>!i.natural[0]).length);
  }
  fs.appendFileSync(dir+'/ticket.md','\n- '+execFileSync('date',['-Iseconds'],{encoding:'utf8'}).trim()+' — audit-media-auth-utility worker checkpoint: '+key+' captured four whole-height widths; geometry/hash evidence persisted; visual inspection not yet claimed.\n');
 }
} finally {await browser.close();fs.writeFileSync(dir+'/measurements.json',JSON.stringify({baseline:'403cd5be096db89b428e130ad57cca730b425fdc',rows,responses,failures},null,2));}
