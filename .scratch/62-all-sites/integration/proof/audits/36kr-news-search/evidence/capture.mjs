import {createRequire} from 'node:module';
import fs from 'node:fs'; import crypto from 'node:crypto'; import path from 'node:path';
const require=createRequire('/home/z/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core/package.json');
const {chromium}=require('playwright-core');
const out='.scratch/62-all-sites/audit-36kr-news-search';
const pages=['home','information-technology','search-ai','search-viz'];
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const hashes={revision:'403cd5be096db89b428e130ad57cca730b425fdc',files:{}};
for(const slug of pages) for(const f of [`m1/curated/36kr-com/${slug}.json`,`m1/curated/renders/36kr-com-${slug}.html`,`m1/curated/renders/36kr-com-${slug}.png`,...['dom.html','nodes.json','meta.json','full.png'].map(f=>`corpus/36kr-com/${slug}/${f}`)])hashes.files[f]=sha(f);
fs.writeFileSync(`${out}/covered-hashes.json`,JSON.stringify(hashes,null,2));
const b=await chromium.launch({executablePath:process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox']});
const p=await b.newPage();const result=[];const errors=[];
p.on('pageerror',e=>errors.push(String(e)));
try {
 for(const slug of pages) {
  for(const width of [2560,1920,1440,390]) {
   await p.setViewportSize({width,height:900});
   await p.goto('file://'+path.resolve(`m1/curated/renders/36kr-com-${slug}.html`),{waitUntil:'load',timeout:20000});
   await p.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.complete?Promise.resolve():new Promise(r=>{i.onload=r;i.onerror=r;setTimeout(r,5000)})))});
   const data=await p.evaluate(()=>{
    const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
    const info=e=>({tag:e.tagName,class:e.className,id:e.id,text:(e.innerText||'').slice(0,120),...rect(e)});
    const root=document.querySelector('main>.node');
    return {width:innerWidth,height:document.documentElement.scrollHeight,overflow:document.documentElement.scrollWidth-innerWidth,main:info(document.querySelector('main')),root:info(root),title:info(root.querySelector(':scope>.title')),
     sections:[...root.children].filter(e=>e.matches('section,.band,.group,.node,hr')).map(info),
     regions:[...root.querySelectorAll('.depth-1')].map(info),
     inputs:[...document.querySelectorAll('input,button,fieldset')].map(info),
     images:[...document.images].map(i=>({src:i.src,alt:i.alt,natural:[i.naturalWidth,i.naturalHeight],complete:i.complete,...rect(i)})),
     anchors:[...document.querySelectorAll('a')].map(a=>({href:a.getAttribute('href'),text:a.innerText,...rect(a)})),
     overflowNodes:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.x<-.5||r.right>innerWidth+.5}).map(info).slice(0,80),
     colors:[...document.querySelectorAll('.title,.chip-item,.ctl,.action,.meta,.val,legend')].map(e=>({class:e.className,text:e.innerText.slice(0,90),color:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundColor,font:getComputedStyle(e).fontSize})).filter((e,i,a)=>a.findIndex(x=>x.class===e.class&&x.color===e.color&&x.bg===e.bg)===i)
    };
   });
   await p.screenshot({path:`${out}/${slug}-${width}.png`,fullPage:true});
   result.push({page:'36kr-com/'+slug,htmlHash:hashes.files[`m1/curated/renders/36kr-com-${slug}.html`],...data});
   fs.writeFileSync(`${out}/geometry.json`,JSON.stringify({errors,result},null,2));
   console.log(slug,width,'height',data.height,'overflow',data.overflow,'broken',data.images.filter(i=>!i.natural[0]).length,'enlarged',data.images.filter(i=>i.w>i.natural[0]+1).length);
  }
  fs.appendFileSync(`${out}/ticket.md`,`\n- ${new Date().toISOString()} — actor audit-36kr-news-search: captured ${slug} sequentially at 2560/1920/1440/390; geometry and source/model/HTML hashes persisted. Images not yet judged; no PASS inferred.\n`);
 }
} finally {await b.close();}
for(const slug of pages)for(const width of [2560,1920,1440,390])hashes.files[`${out}/${slug}-${width}.png`]=sha(`${out}/${slug}-${width}.png`);
fs.writeFileSync(`${out}/covered-hashes.json`,JSON.stringify(hashes,null,2));
