import fs from 'node:fs';
import { render } from '../../../m1/render.mjs';
import { renderMarkdown } from '../../../m1/render-md.mjs';
import { evaluate } from '../../../m1/eval/metrics.mjs';
import { validate } from '../../../m1/validate.mjs';
import { checkPage } from '../../../m1/eval/capture-integrity.mjs';
import { render as baselineRender } from './baseline-seam/render.mjs';
import { renderMarkdown as baselineMarkdown } from './baseline-seam/render-md.mjs';
const out='.scratch/62-all-sites/engine/fidelity';fs.mkdirSync(out,{recursive:true});
const rows=JSON.parse(fs.readFileSync('m1/eval/m3-scale.json')).filter(r=>r.tier==='exemplar');
const results=rows.map(({k})=>{
 const model=JSON.parse(fs.readFileSync('m1/curated/'+k+'.json')),site=k.split('/')[0],dash=k.replaceAll('/','-');
 const values={html:render(model,{site}),markdown:renderMarkdown(model),baselineHtml:baselineRender(model,{site}),baselineMarkdown:baselineMarkdown(model)};
 const metrics={};for(const [target,value]of Object.entries(values)){const file=out+'/'+dash+'-'+target+(target.toLowerCase().includes('html')?'.html':'.md');fs.writeFileSync(file,value);metrics[target]=evaluate(model,file);}
 return{k,validation:validate(model),...metrics,captureIntegrity:checkPage(k,model)};
});
fs.writeFileSync('.scratch/62-all-sites/engine/fidelity-validation.json',JSON.stringify(results,null,2));
console.log(JSON.stringify({pages:results.length,valid:results.filter(r=>r.validation.ok).length,htmlFidelityOne:results.filter(r=>r.html.factFidelity===1).length,markdownFidelityOne:results.filter(r=>r.markdown.factFidelity===1).length,introducedFidelityFailures:results.filter(r=>r.html.factFidelity<r.baselineHtml.factFidelity||r.markdown.factFidelity<r.baselineMarkdown.factFidelity).map(r=>r.k),limits:'Model-to-render fidelity does not establish source fact/action/image completeness.'}));
