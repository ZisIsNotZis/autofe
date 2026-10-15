import {createRequire} from 'node:module';import fs from 'node:fs';
const require=createRequire('/home/z/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core/package.json');const {chromium}=require('playwright-core');
const out='.scratch/62-all-sites/audit-cloud-business';const b=await chromium.launch({executablePath:process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox']});const p=await b.newPage();let results=[];
try{for(const key of ['grafana-play/play-home','aliyun-com/product-ecs','stripe-com/pricing'])for(const width of [2560,1920,1440,390]){
await p.setViewportSize({width,height:900});await p.goto('file://'+process.cwd()+'/m1/curated/renders/'+key.replaceAll('/','-')+'.html',{waitUntil:'load',timeout:20000});
const v=await p.evaluate(()=>{
 const col=s=>(s.match(/[\d.]+/g)||[]).map(Number);const blend=(a,b)=>{const o=a[3]??1;return a.slice(0,3).map((c,i)=>c*o+b[i]*(1-o))};
 const bg=e=>!e?[255,255,255]:blend(col(getComputedStyle(e).backgroundColor),bg(e.parentElement));
 const lum=a=>{const v=a.map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4});return .2126*v[0]+.7152*v[1]+.0722*v[2]};
 const rt=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
 const links=[...document.querySelectorAll('a,.ctl')].map(e=>{const s=getComputedStyle(e),back=bg(e),fore=blend(col(s.color),back),a=lum(fore),z=lum(back);return {text:e.textContent,tag:e.tagName,class:e.className,href:e.getAttribute('href'),color:s.color,effectiveBg:back,ratio:(Math.max(a,z)+.05)/(Math.min(a,z)+.05),fontSize:s.fontSize,...rt(e)}});
 const scrolls=[...document.querySelectorAll('table')].map(t=>{const par=t.parentElement;let scroll=par;while(scroll&&scroll.scrollWidth<=scroll.clientWidth+1)scroll=scroll.parentElement;const before=scroll?.scrollLeft; if(scroll)scroll.scrollLeft=scroll.scrollWidth;return {table:rt(t),rows:t.rows.length,scrollElement:scroll?.className,clientWidth:scroll?.clientWidth,scrollWidth:scroll?.scrollWidth,before,after:scroll?.scrollLeft}});
 return {links,scrolls,toolbar:document.querySelector('.g-toolbar')?.outerHTML,cta:document.querySelector('.g-cta')?.outerHTML,bodyBg:getComputedStyle(document.body).backgroundColor};
});results.push({key,width,...v});}
}finally{fs.writeFileSync(out+'/targeted-probes.json',JSON.stringify(results,null,2));await b.close();}
console.log(JSON.stringify(results.map(r=>({key:r.key,width:r.width,lowContrast:r.links.filter(a=>a.ratio<4.5).map(a=>({text:a.text,ratio:a.ratio})),scrolls:r.scrolls})),null,2));
