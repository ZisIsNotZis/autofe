import json, hashlib, re
from html.parser import HTMLParser
from pathlib import Path
D=Path('.scratch/62-all-sites/link-closure')
class Node:
 def __init__(self,tag,attrs,parent,address): self.tag=tag;self.attrs=dict(attrs);self.parent=parent;self.address=address;self.children=[];self.parts=[]
 def text(self): return ''.join(x.text() if isinstance(x,Node) else x for x in self.parts)
 def desc(self):
  yield self
  for x in self.children: yield from x.desc()
class Parser(HTMLParser):
 def __init__(self,s):
  super().__init__(convert_charrefs=True);self.root=Node('root',[],None,'');self.cur=self.root;self.feed(s)
 def handle_starttag(self,t,a):
  n=Node(t,a,self.cur,self.cur.address+'/'+t+'['+str(len(self.cur.children))+']');self.cur.children.append(n);self.cur.parts.append(n)
  if t not in ['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']:self.cur=n
 def handle_endtag(self,t):
  n=self.cur
  while n.parent and n.tag!=t:n=n.parent
  if n.tag==t and n.parent:self.cur=n.parent
 def handle_data(self,d): self.cur.parts.append(d)
def compact(s): return ''.join(c.lower() for c in s if c.isalnum())
def witness(n):return {'address':n.address,'tag':n.tag,'attributes':n.attrs,'text':n.text(),'anchors':[{'address':a.address,'href':a.attrs.get('href'),'text':a.text()} for a in n.desc() if a.tag=='a']}
x=json.loads((D/'cases.json').read_text());cache={}
for c in x['cases']:
 p=c['page']
 if p not in cache:cache[p]=(Parser(Path('corpus',p,'dom.html').read_text()).root,Parser(Path('m1/curated/renders',p.replace('/','-')+'.html').read_text()).root)
 src,render=cache[p];text=compact(c['finding']['text']);owners=c['modelOwners'];primary=owners[0] if owners else None
 title=next((f['text'] for f in primary['facts'] if f['key'] in ['_title','_name']),None) if primary else None
 # Exact title/fact co-location narrows diagnostic candidates, never establishes acceptance automatically.
 source=[]
 for a in src.desc():
  if a.tag!='a' or compact(a.text())!=text:continue
  n=a
  for i in range(8):
   if title and compact(title) in compact(n.text()):source.append(witness(n));break
   if not n.parent:break
   n=n.parent
 renders=[]
 for n in render.desc():
  if n.tag!='article':continue
  own=[a for a in n.children if a.tag in ['h1','h2','h3','h4','h5','h6']]
  if title and any(compact(a.text())==compact(title) for a in own):renders.append(witness(n))
 c['structuralSourceCandidates']=source;c['structuralRenderCandidates']=renders
(D/'structural-cases.json').write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
print('Structural candidate evidence retained for',len(x['cases']),'cases; no acceptance dispositions inferred')
