import {createRequire} from 'node:module';
import fs from 'node:fs';
import crypto from 'node:crypto';
const out='.scratch/62-all-sites/audit-public-technical-docs';
const pages=['gov-uk/ni-rates-letters','gov-uk/register-birth-abroad','learn-microsoft/vm-sizes','stripe-docs/payments'];
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const require=createRequire('/home/z/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core/package.json');
const {chromium}=require('playwright-core');
const hashes={}; const measurements={};const errors=[];
const browser=await chromium.launch({executablePath:'/home/z/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox']});
try {
 const p=await browser.newPage({viewport:{width:2560,height:1000}});
 await p.route(/^https?:/,r=>r.abort());
 p.on('pageerror',e=>errors.push(String(e)));
 for (const key of pages) {
  const flat=key.replaceAll('/','-');
  const html=`m1/curated/renders/${flat}.html`;
  for(const f of [html,`m1/curated/${key}.json`,...['dom.html','nodes.json','full.png','meta.json'].map(x=>`corpus/${key}/${x}`)]) hashes[f]=sha(f);
  measurements[key]={};
  for(const width of [2560,1920,1440,390]) {
   await p.setViewportSize({width,height:1000});
   await p.goto('file://'+process.cwd()+'/'+html,{waitUntil:'load',timeout:30000});
   await p.evaluate(()=>document.fonts.ready);
   measurements[key][width]=await p.evaluate(()=>{
    const rect=e=>{const r=e.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y+scrollY),w:Math.round(r.width),h:Math.round(r.height)}};
    const style=e=>{const s=getComputedStyle(e);return {color:s.color,background:s.backgroundColor,font:s.fontSize,lineHeight:s.lineHeight,overflowX:s.overflowX}};
    const short=e=>({tag:e.tagName,id:e.id,cls:e.className,text:e.textContent.trim().replace(/\s+/g,' ').slice(0,130),...rect(e),...style(e)});
    return {viewport:{w:innerWidth,h:innerHeight},document:{w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight},main:[...document.querySelectorAll('main,article,.depth-0,.depth-1')].map(short),headings:[...document.querySelectorAll('h1,h2,h3,h4')].map(short),tables:[...document.querySelectorAll('table')].map(e=>({...short(e),rows:e.rows.length,headers:[...e.querySelectorAll('th')].map(n=>n.textContent),parent:short(e.parentElement),cells:[...e.querySelectorAll('th,td')].map(short)})),controls:[...document.querySelectorAll('input,select,fieldset,.controls,.action,.ctl')].map(short),links:[...document.querySelectorAll('a')].map(e=>({...short(e),href:e.getAttribute('href')})),images:[...document.images].map(e=>({...short(e),src:e.getAttribute('src'),naturalWidth:e.naturalWidth,naturalHeight:e.naturalHeight})),overflows:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width && (r.right>innerWidth+1 || r.left < -1)}).map(short)};
   });
   const shot=`${out}/${flat}-${width}.png`;
   await p.screenshot({path:shot,fullPage:true,timeout:30000}); hashes[shot]=sha(shot);
  }
  fs.writeFileSync(`${out}/measurements.json`,JSON.stringify(measurements,null,2));
  fs.writeFileSync(`${out}/hashes.json`,JSON.stringify(hashes,null,2));
  console.log(key,JSON.stringify(Object.fromEntries(Object.entries(measurements[key]).map(([w,m])=>[w,{height:m.document.h,width:m.document.w,main:m.main.map(x=>[x.id,x.x,x.w,x.h]),tables:m.tables.length,links:m.links.length,overflows:m.overflows.length}]))));
 }
 fs.writeFileSync(`${out}/browser-errors.json`,JSON.stringify(errors,null,2));
} finally {await browser.close();}
