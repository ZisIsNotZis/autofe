import fs from 'fs';
function text(html){
  let s = html.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'');
  s = s.replace(/<[^>]+>/g,'\n');
  s = s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ');
  return s.split('\n').map(x=>x.trim()).filter(Boolean).join('\n');
}
const f = process.argv[2];
console.log(text(fs.readFileSync(f,'utf8')));
