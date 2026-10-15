import json,re
from html.parser import HTMLParser
from pathlib import Path
OUT=Path('.scratch/62-all-sites/audit-sspai-editorial')
class Inventory(HTMLParser):
 def __init__(self):super().__init__();self.anchors=[];self.images=[];self.text=[];self.stack=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='a':
   record={'attrs':a,'text':''};self.anchors.append(record);self.stack.append(record)
  if tag=='img':self.images.append(a)
 def handle_endtag(self,tag):
  if tag=='a' and self.stack:self.stack.pop()
 def handle_data(self,data):
  self.text.append(data)
  for a in self.stack:a['text']+=data

def walk(obj,at='$'):
 if isinstance(obj,dict):
  for k,v in obj.items():
   if k=='_action':yield (at+'.'+k,v)
   else:yield from walk(v,at+'.'+k)
 elif isinstance(obj,list):
  for i,v in enumerate(obj):yield from walk(v,at+f'[{i}]')
res=[]
for p in ['home','matrix','post-102392','post-114699','u-jtc092al']:
 parser=Inventory();parser.feed(Path(f'corpus/sspai-com/{p}/dom.html').read_text())
 model=json.loads(Path(f'm1/curated/sspai-com/{p}.json').read_text());actions=[{'path':k,**v} for k,v in walk(model)]
 source_urls={a['attrs'].get('href') for a in parser.anchors}
 mismatch=[a for a in actions if a.get('to') and a['to'] not in source_urls and a['to'].removeprefix('https://sspai.com') not in source_urls]
 row={'page':p,'anchors':parser.anchors,'images':parser.images,'modelActions':actions,'targetNotExactInSource':mismatch};res.append(row)
 print(p,'source images',len(parser.images),'anchors',len(parser.anchors),'model actions',len(actions),'targets not exact',len(mismatch))
 for a in mismatch:print('  ',a['path'],a.get('to'))
 if p=='post-102392':
  for a in parser.anchors:
   if any(s in a['text'] for s in ['VLOOK','手册','专题','License','OSCHINA','充电']):print(' SOURCE',a['text'][:80],a['attrs'].get('href'))
 if p=='home':
  for a in parser.anchors:
   if any(s in a['text'] for s in ['iPhone','开学季']):print(' SOURCE',a['text'][:120],a['attrs'].get('href'))
 if p=='u-jtc092al':
  s=Path(f'corpus/sspai-com/{p}/dom.html').read_text()
  for term in ['16557','23535','529','充电']:
   i=s.find(term);print(' CONTEXT',term,s[max(i-240,0):i+180])
OUT.joinpath('source-inventory.json').write_text(json.dumps(res,ensure_ascii=False,indent=2))
