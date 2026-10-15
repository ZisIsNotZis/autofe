import {createRequire} from 'node:module';import fs from 'node:fs';
const require=createRequire('/home/z/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core/package.json');const {chromium}=require('playwright-core');
const out='.scratch/62-all-sites/audit-sspai-editorial';const pages=['home','matrix','post-102392','post-114699','u-jtc092al'];const results=[];
const b=await chromium.launch({executablePath:process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox']});const p=await b.newPage();
try{for(const page of pages){for(const width of [2560,390]){await p.setViewportSize({width,height:1000});await p.goto('file://'+process.cwd()+`/m1/curated/renders/sspai-com-${page}.html`,{waitUntil:'networkidle',timeout:20000});results.push({page,width,...await p.evaluate(()=>{
 const selector=e=>{if(!e)return null;let s=e.tagName.toLowerCase();for(const c of e.classList)s+='.'+c;return s};
 const rec=e=>{const r=e.getBoundingClientRect(),st=getComputedStyle(e);let a=e;let bg='rgba(0, 0, 0, 0)';while(a&&bg==='rgba(0, 0, 0, 0)'){bg=getComputedStyle(a).backgroundColor;a=a.parentElement;}return {selector:selector(e),parent:selector(e.parentElement),text:e.innerText?.slice(0,160),x:r.x,y:r.y,w:r.width,h:r.height,color:st.color,bg,fontSize:st.fontSize,fontWeight:st.fontWeight,tag:e.tagName,href:e.getAttribute('href'),placeholder:e.getAttribute('placeholder')};};
 const root=document.querySelector('main>.node');return {structure:[...root.children].map(rec),links:[...document.querySelectorAll('a')].map(rec),readables:[...document.querySelectorAll('.prose,.val,.name,.meta,.title,fieldset,input,.input-placeholder')].map(rec),images:[...document.images].map(e=>({...rec(e),src:e.getAttribute('src')}))};
 })});}}
}finally{await b.close();fs.writeFileSync(out+'/focus.json',JSON.stringify(results,null,2));}
console.log('Saved focus DOM:10 page-width pairs, exact selectors/boxes/surface and foreground pairs.');
