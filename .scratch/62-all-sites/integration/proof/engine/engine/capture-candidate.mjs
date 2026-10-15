import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { render } from '../../../m1/render.mjs';
const candidate='/home/z/vibe/autofe-worktrees/62-all-sites/content';
const modelFile=k=>fs.existsSync(candidate+'/m1/curated/'+k+'.json')?candidate+'/m1/curated/'+k+'.json':'m1/curated/'+k+'.json';
const root=process.cwd(), out=path.join(root,'.scratch/62-all-sites/engine',process.env.ENGINE_PROOF_DIR || 'recovery/render-proof'); fs.mkdirSync(out,{recursive:true});
const sha=(v)=>crypto.createHash('sha256').update(v).digest('hex');
const roster=JSON.parse(fs.readFileSync('m1/eval/m3-scale.json')).filter(r=>r.tier==='exemplar').map(r=>r.k);
const args=process.argv.slice(2); const pages=args.length?roster.filter(k=>args.includes(k)):roster;
const htmls=Object.fromEntries(pages.map(k=>{const [site,slug]=k.split('/');const model=JSON.parse(fs.readFileSync(modelFile(k)));return[k,render(model,{site})];}));
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://local'); const key=decodeURIComponent(u.pathname.slice(6));
 if(u.pathname.startsWith('/page/')&&htmls[key]){res.setHeader('content-type','text/html');res.end(htmls[key].replace('<head>','<head><base href="'+origin+'/renders/">'));return;}
 if(u.pathname.startsWith('/assets/')){const f=path.resolve(candidate,'m1/curated','.'+u.pathname);if(f.startsWith(candidate+'/m1/curated/assets/')&&fs.existsSync(f)){const ext=path.extname(f);res.setHeader('content-type',ext==='.png'?'image/png':ext==='.svg'?'image/svg+xml':ext==='.webp'?'image/webp':'image/jpeg');res.end(fs.readFileSync(f));return;}}
 res.statusCode=404;res.end('Not found');
});
await new Promise(r=>server.listen(0,'127.0.0.1',r)); const origin='http://127.0.0.1:'+server.address().port;
const {chromium}=createRequire(import.meta.url)(process.env.HOME+'/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core');
const browser=await chromium.launch({executablePath:process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox']});
const result={sourceHashes:Object.fromEntries(['m1/render.mjs','m1/axis.mjs','m1/render-md.mjs','m1/render-text.mjs','m1/brand-tokens.json','m1/media-surfaces.json','m1/eval/page-frame-selftest.mjs','m1/eval/pipeline.mjs','docs/m1/layout-axes.md'].map(f=>[f,sha(fs.readFileSync(f))])),pages:{},modality:'browser geometry + full-height screenshots; visual inspection not inferred'};
try{
 const p=await browser.newPage({viewport:{width:2560,height:900}});p.setDefaultTimeout(15000);
 for(const k of pages){
  const dash=k.replaceAll('/','-'); const hp=path.join(out,dash+'.html');fs.writeFileSync(hp,htmls[k].replace('<head>','<head><base href="file://'+root+'/m1/curated/renders/">'));
  const entry={htmlHash:sha(htmls[k]),inspectableHtmlHash:sha(fs.readFileSync(hp)),modelHash:sha(fs.readFileSync(modelFile(k))),sourceHashes:{},widths:{}};
  for(const f of ['dom.html','nodes.json','full.png'])entry.sourceHashes[f]=sha(fs.readFileSync('corpus/'+k+'/'+f));
  for(const width of [2560,1920,1440,390]){
   await p.setViewportSize({width,height:900});
   // Relative assets are siblings of the render directory, as in the actual gallery.
   const pageHtml=htmls[k].replace('<head>','<head><base href="'+origin+'/renders/">');
   if(width===2560){await p.goto(origin+'/page/'+k,{waitUntil:'domcontentloaded',timeout:15000});await p.evaluate(()=>Promise.race([Promise.all([...document.images].map(i=>i.complete?Promise.resolve():new Promise(r=>{i.onload=r;i.onerror=r}))),new Promise(r=>setTimeout(r,8000))]));}
   await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(120);
   const measures=await p.evaluate(()=>{
    const rect=e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return{text:e.textContent.trim().slice(0,140),x:r.x,y:r.y,w:r.width,h:r.height,font:s.fontSize,color:s.color,background:s.backgroundColor,align:s.textAlign}};
    const root=document.querySelector('main>.node');
    return{height:document.documentElement.scrollHeight,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
      root:rect(root),headings:[...document.querySelectorAll('.title')].map(rect),frames:[...document.querySelectorAll('.depth-1')].map(rect),
      rootActions:[...root.querySelectorAll(':scope>.action,:scope>.controls')].map(rect),
      images:[...document.images].map(i=>({...rect(i),src:i.src,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,complete:i.complete})),
      links:[...document.querySelectorAll('a')].map(a=>({...rect(a),href:a.getAttribute('href')})),
      defrows:[...document.querySelectorAll('.defrow')].map(rect),
      tables:[...document.querySelectorAll('table')].map(t=>({...rect(t),parent:rect(t.parentElement),cells:[...t.querySelectorAll('th,td')].slice(0,12).map(rect)}))};
   });
   const file=path.join(out,`${dash}-${width}.png`);await p.screenshot({path:file,fullPage:true,timeout:30000});
   entry.widths[width]={...measures,screenshot:file,screenshotHash:sha(fs.readFileSync(file)),visualStatus:'UNINSPECTED',failedImages:measures.images.filter(i=>!i.naturalWidth).length};
  }
  result.pages[k]=entry;fs.writeFileSync(path.join(out,'measurements.json'),JSON.stringify(result,null,2));
  console.log(k+' captured four widths; failedImages='+entry.widths[2560].failedImages);
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
console.log('Evidence '+out+'/measurements.json');
