import fs from 'node:fs';
const ex = JSON.parse(fs.readFileSync('m1/eval/m3-scale.json','utf8')).filter(x=>x.tier==='exemplar').map(x=>x.k);
const px = v => { const m=/^([\d.]+)px$/.exec(String(v||'')); return m?parseFloat(m[1]):null; };
const fw = v => { const m=/^(\d+)$/.exec(String(v||'')); return m?parseInt(m[1]):null; };
export function quoteEvidence(k){
  const f = `corpus/${k}/nodes.json`;
  if(!fs.existsSync(f)) return {error:'no nodes.json'};
  const nodes = JSON.parse(fs.readFileSync(f,'utf8'));
  const byPath = Object.fromEntries(nodes.map(n=>[n.cleanedPath,n]));
  const ev=[];
  for(const n of nodes){
    if(!n.visible) continue;
    const text=(n.text||'').trim(); if(!text) continue;
    if(n.tag==='blockquote'||n.role==='blockquote'){ ev.push({kind:'blockquote',text,path:n.cleanedPath||n.domPath,fs:px(n.styles?.fontSize),fw:fw(n.styles?.fontWeight)}); continue; }
    if(/^(strong|b)$/i.test(n.tag)){
      const p=n.cleanedPath.replace(/\/(strong|b)\[\d+\]$/,'');
      const par=byPath[p];
      if(par && (par.text||'').trim()===text && text.length>=12 && !/[：:]$/.test(text) && par.tag==='p'){
        ev.push({kind:'strong-paragraph',text,path:n.cleanedPath,fs:px(n.styles?.fontSize),fw:fw(n.styles?.fontWeight)});
      }
    }
  }
  return {ev};
}
if (import.meta.url===`file://${process.argv[1]}`){
  let tot=0;
  for(const k of ex){ const {ev,error}=quoteEvidence(k); if(error)continue; if(!ev.length)continue; tot+=ev.length;
    console.log(`### ${k} ${ev.length}`); for(const e of ev) console.log(`   [${e.kind}] ${JSON.stringify(e.text.slice(0,70))}`); }
  console.log('TOTAL',tot);
}
