"""Read-only audit of model image and action targets against baseline curated HTML."""
import json,sys
from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent
PAGES=['apple-com-cn/iphone-17','apple-com/iphone-16','apple-com/macbook-air','linear-app/home']
class Rendered(HTMLParser):
 def __init__(self):super().__init__();self.hrefs=[];self.images=[]
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if t=='a':self.hrefs.append(a.get('href'))
  if t=='img':self.images.append(a.get('src'))
results={}
for page in PAGES:
 model=json.loads((ROOT/'m1/curated'/f'{page}.json').read_text())
 rendered=Rendered();rendered.feed((ROOT/'m1/curated/renders'/f'{page.replace("/","-")}.html').read_text())
 actions=[];images=[]
 def walk(v,path=''):
  if isinstance(v,dict):
   if isinstance(v.get('_action'),dict):actions.append({'path':path+'._action',**v['_action']})
   if isinstance(v.get('_image'),dict):images.append({'path':path+'._image',**v['_image']})
   for key,value in v.items():walk(value,path+'.'+key)
  elif isinstance(v,list):
   for i,value in enumerate(v):walk(value,path+f'[{i}]')
 walk(model)
 results[page]={'modelActions':len(actions),'modelTargetActions':sum(bool(a.get('to')) for a in actions),'renderedAnchors':len(rendered.hrefs),'missingActionTargets':[a for a in actions if a.get('to') and a['to'] not in rendered.hrefs],'modelImages':len(images),'missingImages':[im for im in images if im['image'] not in rendered.images],'actions':actions}
(OUT/'model-render-fidelity.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
missing=sum(len(p['missingActionTargets'])+len(p['missingImages']) for p in results.values())
print(json.dumps({'status':'FAIL' if missing else 'PASS','missing':missing,'report':str(OUT/'model-render-fidelity.json')}))
sys.exit(bool(missing))
