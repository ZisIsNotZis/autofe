import json,hashlib,subprocess,re,html
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin
from PIL import Image,ImageChops,ImageDraw
O=Path('.scratch/62-all-sites/content-review'); H=json.loads(Path('.scratch/62-all-sites/content-handoff.json').read_text()); B=H['refs']['baselineCommit']; C=H['refs']['commit']
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def norm(s):return re.sub(r'\s+',' ',html.unescape(str(s))).strip()
class N:
 def __init__(self,t='',a=[],parent=None):self.t=t;self.a=dict(a);self.p=parent;self.parts=[]
 def text(self):return norm(''.join(x.text() if isinstance(x,N) else x for x in self.parts))
 def walk(self):
  for x in self.parts:
   if isinstance(x,N):yield x;yield from x.walk()
class P(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.root=N();self.n=self.root
 def handle_starttag(self,t,a):
  n=N(t,a,self.n);self.n.parts.append(n)
  if t not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}:self.n=n
 def handle_endtag(self,t):
  n=self.n
  while n.p:
   if n.t==t:self.n=n.p;return
   n=n.p
 def handle_data(self,s):self.n.parts.append(s)
def walk(x,p=''):
 if isinstance(x,dict):
  yield p,x
  for k,v in x.items():yield from walk(v,p+'/'+k)
 elif isinstance(x,list):
  for i,v in enumerate(x):yield from walk(v,p+'/'+str(i))
def actions(m):return [(p,x['_action']) for p,x in walk(m) if '_action'in x]
files=subprocess.check_output(['git','diff','--name-only',B,C],text=True).splitlines()
result={'commit':C,'baseline':B,'fileCount':len(files),'hashMismatches':[f for f,h in H['hashes'].items() if sha(f)!=h], 'allowlistMismatch':sorted(set(files)^set(H['files'])),'pages':[],'assets':[]}
for d in H['dispositions']:
 page=d['page'];f='m1/curated/'+page+'.json';m=json.loads(Path(f).read_text());old=json.loads(subprocess.check_output(['git','show',B+':'+f],text=True));p=P();p.feed(Path('corpus',page,'dom.html').read_text());ns=list(p.root.walk());meta=json.loads(Path('corpus',page,'meta.json').read_text());base=next((n.a['href'] for n in ns if n.t=='base' and 'href'in n.a),meta.get('redirectedUrl') or meta['url']);
 # Captured hrefs in these DOMs are normally absolute; compare exact raw and URL-resolved forms.
 targets=set();pairs=[]
 for n in ns:
  for key in ['href','action']:
   if key in n.a:targets.update([n.a[key],urljoin(base,n.a[key])])
  if n.t=='a' and 'href'in n.a:pairs.append((n.text(),n.a['href']))
 olda={json.dumps(a,sort_keys=True,ensure_ascii=False) for _,a in actions(old)}
 added=[(path,a) for path,a in actions(m) if json.dumps(a,sort_keys=True,ensure_ascii=False) not in olda]
 gaps=[{'path':path,'action':a} for path,a in added if 'to'in a and a['to'] not in targets]
 labelgaps=[{'path':path,'action':a} for path,a in added if a.get('to') in targets and a.get('label') and not any(norm(a['label'])==label and a['to'] in [target,urljoin(base,target)] for label,target in pairs)]
 result['pages'].append({'page':page,'modelChanged':d['modelChanged'],'hash':sha(f),'sourceDomHash':sha('corpus/'+page+'/dom.html'),'newActions':len(added),'targetGaps':gaps,'labelPairsNeedingContext':labelgaps})
prov=json.loads(Path('.scratch/62-all-sites/content/asset-provenance.json').read_text());crops=[]
for a in prov:
 if 'asset' not in a:continue
 im=Image.open(a['asset']);r={'asset':a['asset'],'status':a['status'],'assetHashOK':sha(a['asset'])==a['sha256'],'sourceHashOK':sha(a['source'])==a['sourceHash'],'size':list(im.size)}
 if a['status']=='source-screenshot-crop':
  src=Image.open(a['source']);box=a['bbox'];cut=src.crop(box);r.update({'insideCapture':0<=box[0]<box[2]<=src.width and 0<=box[1]<box[3]<=src.height,'pixelExact':cut.size==im.size and ImageChops.difference(cut.convert('RGB'),im.convert('RGB')).getbbox() is None,'bbox':box});crops.append(a)
 result['assets'].append(r)
# Readable attribution contact sheets at native pixel sizes: large demos individually, small SSPAI thumbs in one sheet, article crops individually grouped by page.
for page in sorted(set(a['page'] for a in crops)):
 items=[a for a in crops if a['page']==page]
 if page=='linear-app/home':
  for i,a in enumerate(items):Image.open(a['asset']).save(O/f'linear-{i}.png')
 else:
  w=max(Image.open(a['asset']).width for a in items);hh=sum(Image.open(a['asset']).height+42 for a in items);sheet=Image.new('RGB',(max(700,w),hh),'#dddddd');dr=ImageDraw.Draw(sheet);y=0
  for a in items:
   im=Image.open(a['asset']);dr.text((0,y),Path(a['asset']).name,fill='black');dr.text((0,y+15),str(a['bbox']),fill='black');sheet.paste(im,(0,y+42));y+=im.height+42
  sheet.save(O/(page.replace('/','--')+'.png'))
(O/'independent-checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(files),'hashMismatches':result['hashMismatches'],'allowlistMismatch':result['allowlistMismatch'],'newActions':sum(p['newActions'] for p in result['pages']),'targetGaps':sum(len(p['targetGaps'])for p in result['pages']),'labelContext':sum(len(p['labelPairsNeedingContext'])for p in result['pages']),'assetFailures':[a for a in result['assets'] if not all(a.get(k,True)for k in ['assetHashOK','sourceHashOK','insideCapture','pixelExact'])]},ensure_ascii=False))
