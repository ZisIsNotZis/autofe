import fs from 'node:fs';
import {scanDom,attrOf,absolutize,imageRows} from '../../../m1/eval/imgattr.mjs';
const out='.scratch/62-all-sites/audit-mi-commerce';
const keys=['home','search-earbuds','search-phone','shop-category-list'];
const res={};
for(const key of keys){
 const dir=`corpus/mi-com/${key}`; const html=fs.readFileSync(dir+'/dom.html','utf8'),nodes=JSON.parse(fs.readFileSync(dir+'/nodes.json')),meta=JSON.parse(fs.readFileSync(dir+'/meta.json')),model=JSON.parse(fs.readFileSync(`m1/curated/mi-com/${key}.json`));
 const s=scanDom(html); const base=meta.redirectedUrl||meta.url;
 const links=nodes.filter(n=>n.visible&&n.tag==='a').map(n=>({...n,raw:s.tags[n.cleanedIndex]?.raw,href:absolutize(attrOf(s.tags[n.cleanedIndex]?.attrs||'','href'),base)}));
 const inputs=nodes.filter(n=>n.visible&&['input','button','form'].includes(n.tag)).map(n=>({...n,raw:s.tags[n.cleanedIndex]?.raw}));
 const actions=[];const texts=[];const images=[];
 function walk(n,p='$'){
  if(!n||typeof n!=='object')return;
  if(n._action)actions.push({path:p+'._action',...n._action,sourceMatches:links.filter(a=>a.href===n._action.to).map(a=>({cleanedIndex:a.cleanedIndex,domPath:a.domPath,text:a.text,name:a.name,bbox:a.bbox,raw:a.raw}))});
  for(const [k,v] of Object.entries(n)){if(v?.text)texts.push({path:p+'.'+k,text:v.text,visibleExactMatches:nodes.filter(a=>a.visible&&(a.text===v.text||a.name===v.text)).map(a=>a.cleanedIndex)});if(k==='_image')images.push({path:p+'.'+k,...v});if(typeof v==='object')walk(v,p+'.'+k);}
 }
 walk(model);
 const img=imageRows({html,nodes,meta,minW:60,minH:60});
 res[key]={sourceTitle:meta.title,scan:{dangling:s.dangling,unmatchedClose:s.unmatchedClose},modelRootKeys:Object.keys(model),modelActions:actions,sourceLinks:links,sourceFields:inputs,sourceImages:img,modelImages:images,modelText: texts};
}
fs.writeFileSync(out+'/provenance.json',JSON.stringify(res,null,2));
for(const [key,r]of Object.entries(res))console.log(key,JSON.stringify({scan:r.scan,sourceLinks:r.sourceLinks.length,modelActions:r.modelActions.length,actionsWithoutExactHref:r.modelActions.filter(a=>a.to&&!a.sourceMatches.length).length,sourceFields:r.sourceFields.map(a=>({tag:a.tag,index:a.cleanedIndex,raw:a.raw}))}));
