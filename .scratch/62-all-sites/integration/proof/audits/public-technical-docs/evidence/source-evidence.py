from html.parser import HTMLParser
from pathlib import Path
import json
from urllib.parse import urljoin
class Node:
 def __init__(self,tag,attrs,line,parent): self.tag=tag;self.attrs=dict(attrs);self.line=line;self.parent=parent;self.kids=[]
 def text(self): return ' '.join(' '.join(k if isinstance(k,str) else k.text() for k in self.kids).split())
 def ancestry(self):
  p=self; a=[]
  while p: a.append(p.tag+('#'+p.attrs['id'] if p.attrs.get('id') else ''));p=p.parent
  return '/'.join(reversed(a))
class Parser(HTMLParser):
 def __init__(self): super().__init__(convert_charrefs=True);self.root=Node('root',[],0,None);self.stack=[self.root];self.nodes=[]
 def handle_starttag(self,t,a):
  n=Node(t,a,self.getpos()[0],self.stack[-1]);self.stack[-1].kids.append(n);self.nodes.append(n)
  if t not in ['img','meta','link','br','hr','input','source','area','base','wbr','embed','param','col']:self.stack.append(n)
 def handle_endtag(self,t):
  for i in range(len(self.stack)-1,0,-1):
   if self.stack[i].tag==t: self.stack=self.stack[:i];break
 def handle_data(self,d): self.stack[-1].kids.append(d)
pages=['gov-uk/ni-rates-letters','gov-uk/register-birth-abroad','learn-microsoft/vm-sizes','stripe-docs/payments']
out=Path('.scratch/62-all-sites/audit-public-technical-docs');data={}
for key in pages:
 p=Parser();p.feed(Path(f'corpus/{key}/dom.html').read_text());model=Path(f'm1/curated/{key}.json').read_text();render=Parser();render.feed(Path('m1/curated/renders/'+key.replace('/','-')+'.html').read_text());n=json.loads(Path(f'corpus/{key}/nodes.json').read_text())
 data[key]={'sourceAnchors':[{'line':a.line,'path':a.ancestry(),'text':a.text(),'href':a.attrs.get('href')} for a in p.nodes if a.tag=='a'], 'sourceImages':[{'line':a.line,'path':a.ancestry(),'attrs':a.attrs} for a in p.nodes if a.tag in ['img','video']], 'sourceHeadings':[{'line':a.line,'path':a.ancestry(),'tag':a.tag,'text':a.text()} for a in p.nodes if a.tag in ['h1','h2','h3','h4']], 'sourceTables':[{'line':a.line,'path':a.ancestry(),'text':a.text()} for a in p.nodes if a.tag=='table'], 'renderedAnchors':[{'text':a.text(),'href':a.attrs.get('href'),'line':a.line} for a in render.nodes if a.tag=='a']}
 data[key]['modelActions']=[]
 def visit(m,path='$'):
  if isinstance(m,dict):
   if '_action' in m:data[key]['modelActions'].append({'path':path+'._action',**m['_action']})
   for k,v in m.items():visit(v,path+'.'+k)
  elif isinstance(m,list):
   for i,v in enumerate(m):visit(v,f'{path}[{i}]')
 visit(json.loads(model))
 data[key]['sourceRelevantNodes']=[x for x in n if x.get('tag') in ['h1','h2','h3','h4','table','img','a'] and any(y in (x.get('text','')+' '+x.get('name','')) for y in ['Class 1A','Example','Av2-series','Dsv7','Name structure','Enter the','付款','Overseas.Registration','past employee','Series','category letter'])]
(out/'source-evidence.json').write_text(json.dumps(data,indent=2))
for key,d in data.items():
 print('\n'+key, 'source anchors',len(d['sourceAnchors']),'model actions',len(d['modelActions']),'render anchors',len(d['renderedAnchors']))
 print('headings',[(x['text'],x['line']) for x in d['sourceHeadings'] if 'Cookie' not in x['text']])
 print('images',[(x['line'],x['attrs'].get('alt'),x['attrs'].get('src')) for x in d['sourceImages']])
 if 'ni-rates' in key:match=['past employee','expenses and benefits','Class 1A','category letter','calculators','2025 to 2026','redundancy','printable']
 elif 'birth' in key:match=['Overseas.Registration']
 elif 'vm-sizes' in key:match=['Av2-series','Dsv7','A-family',"Enter the 'Series'", "Enter the 'Size'"]
 else:match=['查找您的用例','线上收款','创建订阅']
 print('matched anchors',[x for x in d['sourceAnchors'] if any(v in x['text'] for v in match)])
