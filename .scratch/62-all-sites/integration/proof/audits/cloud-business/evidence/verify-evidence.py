from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin
from PIL import Image
import json,hashlib,subprocess
out=Path('.scratch/62-all-sites/audit-cloud-business')
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
hashes=json.loads((out/'input-hashes.json').read_text())
assert all(sha(p)==h for p,h in hashes.items()), 'Baseline input changed'
r=json.loads((out/'measurements.json').read_text())
assert len(r)==20
assert all(x['overflow']==0 for x in r)
assert all(not i['broken'] and not i['enlarged'] for x in r for i in x['images'])
for x in r:
 assert sha(x['shot'])==x['shotSha256']
 im=Image.open(x['shot']);assert im.width==x['width'] and abs(im.height-x['height'])<=1
class Parser(HTMLParser):
 def __init__(self):super().__init__();self.anchors=[]
 def handle_starttag(self,t,a):
  if t=='a':self.anchors.append(dict(a))
actions={}
for key in sorted(set(x['key'] for x in r)):
 j=json.loads(Path('m1/curated/'+key+'.json').read_text())
 srcdom=Path('corpus/'+key+'/dom.html').read_text();srcnodes=Path('corpus/'+key+'/nodes.json').read_text()
 render=Path('m1/curated/renders/'+key.replace('/','-')+'.html').read_text()
 p=Parser();p.feed(srcdom);q=Parser();q.feed(render)
 base='https://www.aliyun.com' if key.startswith('aliyun') else 'https://stripe.com' if key.startswith('stripe') else 'https://play.grafana.org' if key.startswith('grafana') else 'https://aws.amazon.com'
 src=set(urljoin(base,a['href']) for a in p.anchors if a.get('href'));targets=set(a['href'] for a in q.anchors if a.get('href'));rows=[]
 def walk(v,path=''):
  if isinstance(v,dict):
   if '_action' in v:
    a=v['_action'];t=a.get('to');rows.append({'modelPath':path+'._action','target':t,'targetInSourceAnchors':None if not t else t in src,'targetStringInCapture':None if not t else t in srcdom or t in srcnodes,'targetRendered':None if not t else t in targets,'targetStringInRenderedHtml':None if not t else t in render})
   for k,x in v.items():walk(x,path+'.'+k)
  elif isinstance(v,list):
   for i,x in enumerate(v):walk(x,path+'['+str(i)+']')
 walk(j);actions[key]=rows
(out/'action-target-checks.json').write_text(json.dumps(actions,ensure_ascii=False,indent=2)+'\n')
missing=[x for x in actions['aliyun-com/home'] if x['targetRendered'] is False]
assert len(missing)==7 and all(x['targetStringInCapture'] and not x['targetStringInRenderedHtml'] for x in missing)
unsupported=[x for x in actions['aliyun-com/product-ecs'] if x['targetStringInCapture'] is False]
assert len(unsupported)==5
assert not any(x['targetInSourceAnchors'] is False or x['targetRendered'] is False for x in actions['stripe-com/pricing'])
probes=json.loads((out/'targeted-probes.json').read_text())
grafana=[x for x in probes if x['key']=='grafana-play/play-home']
assert len(grafana)==4 and all(len([a for a in x['links'] if a['ratio']<2])==2 for x in grafana)
assert all('Enter edit mode' in x['toolbar'] and '>Edit<' in x['toolbar'] for x in grafana)
ecs390=next(x for x in probes if x['key']=='aliyun-com/product-ecs' and x['width']==390)
assert ecs390['scrolls'][0]['after']==538
assert not subprocess.check_output(['git','diff','--name-only'],text=True).strip(), 'Tracked source/evidence changed unexpectedly'
assert not subprocess.check_output(['git','diff','--cached','--name-only'],text=True).strip(), 'Staged files present'
result={'status':'passed','checks':['30 initial HTML/model/source-capture hashes unchanged','20 complete PNG dimensions/hashes;20 zero-overflow cases;no broken/intrinsically enlarged images','7 missing Aliyun tab target URLs reproduced','5 unsupported ECS purchase target URLs reproduced','all66 Stripe actions capture-normalized and rendered','Grafana two contrast failures reproduced at4 widths;duplicate Edit retained','ECS390 horizontal scroll reaches538px','no tracked source changes;no staged files'],'experienceAcceptance':'INCOMPLETE; these checks detect defects and do not assert visual PASS'}
(out/'evidence-validation.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
