from html.parser import HTMLParser
from pathlib import Path
import json,re
D=Path('.scratch/62-all-sites/audit-huawei-commerce')
class P(HTMLParser):
 def __init__(self):super().__init__();self.stack=[];self.nodes=[]
 def handle_starttag(self,t,attrs):
  n={'index':len(self.nodes),'tag':t,'attrs':dict(attrs),'text':'','parent':self.stack[-1] if self.stack else None};self.nodes.append(n)
  if t not in ['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']: self.stack.append(n['index'])
 def handle_endtag(self,t):
  for i in range(len(self.stack)-1,-1,-1):
   if self.nodes[self.stack[i]]['tag']==t:self.stack=self.stack[:i];break
 def handle_data(self,s):
  for i in self.stack:self.nodes[i]['text']+=s
out={}
for page in ['home','consumer-phones','search-laptop','search-phone']:
 p=P();p.feed(Path(f'corpus/huawei-cn/{page}/dom.html').read_text())
 ns=json.loads(Path(f'corpus/huawei-cn/{page}/nodes.json').read_text())
 model=json.loads(Path(f'm1/curated/huawei-cn/{page}.json').read_text())
 acts=[];imgs=[];texts=[]
 def visit(n,path=''):
  if isinstance(n,dict):
   if '_action'in n and n['_action'].get('to'):acts.append({'path':path+'/_action/to','label':n.get('_name',n.get('_title',{})).get('text'), 'target':n['_action']['to']})
   if '_image'in n:imgs.append({'path':path+'/_image/image','image':n['_image']['image']})
   for k,v in n.items():
    if isinstance(v,dict) and isinstance(v.get('text'),str):texts.append({'path':path+'/'+k,'text':v['text']})
    if k!='_intent':visit(v,path+'/'+k)
  elif isinstance(n,list):
   for i,v in enumerate(n):visit(v,path+'/'+str(i))
 visit(model)
 srcActs=[{'index':n['index'],'text':re.sub(r'\s+',' ',n['text']).strip(),'href':n['attrs'].get('href')} for n in p.nodes if n['tag']=='a']
 missing=[a for a in acts if not a['target'].startswith('key:') and a['target'] not in [s['href'] for s in srcActs]]
 controls=[n for n in p.nodes if n['tag']=='input' or re.search(r'search|sortby|pagination',n['attrs'].get('class',''),re.I) and len(n['text'])<500]
 productImages=[n for n in p.nodes if n['tag']=='img']
 visibleLeaves=[{'domPath':n['domPath'],'cleanedIndex':n.get('cleanedIndex'),'tag':n['tag'],'text':n.get('text'),'bbox':n.get('bbox')} for n in ns if n.get('visible') and n.get('text') and not any(k in n['tag'] for k in ['html','body'])]
 missingTexts=[t for t in texts if re.sub(r'\s+','',t['text']) not in re.sub(r'\s+','',p.nodes[0]['text'])]
 out[page]={'modelActions':acts,'notExactSourceTargets':missing,'sourceActions':srcActs,'sourceInputsAndSearchSortControls':controls,'sourceImages':productImages,'modelImages':imgs,'notExactSourceTexts':missingTexts,'sourceVisibleNodes':visibleLeaves}
D.joinpath('source-inventory.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
for p,v in out.items():
 print(p,'modelActions',len(v['modelActions']),'sourceActions',len(v['sourceActions']),'notExactSourceTargets',v['notExactSourceTargets']); print('notExactSourceTexts',v['notExactSourceTexts'])
 if p.startswith('search'):
  print('source controls',v['sourceInputsAndSearchSortControls'][:16]);print('productImages',[(n['index'],n['attrs']) for n in v['sourceImages'] if n['attrs'].get('class')=='search-image'])
