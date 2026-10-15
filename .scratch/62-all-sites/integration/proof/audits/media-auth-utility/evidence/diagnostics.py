from pathlib import Path
import json,hashlib,re,html,subprocess
from html.parser import HTMLParser
D=Path('.scratch/62-all-sites/audit-media-auth-utility')
pages=['bilibili-com/read-home','bilibili-com/video-bv1gj411x7h7','github-com/login','stripe-dashboard/login','xiaomi-account/login']
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
measure=json.loads((D/'measurements.json').read_text());hashes={};fidelity=[]
def walk(n,p='$'):
 if isinstance(n,dict):
  yield p,n
  for k,v in n.items():yield from walk(v,p+'.'+k)
 elif isinstance(n,list):
  for i,v in enumerate(n):yield from walk(v,p+f'[{i}]')
for key in pages:
 name=key.replace('/','-');model=Path('m1/curated')/(key+'.json');render=Path('m1/curated/renders')/(name+'.html');source=Path('corpus')/key
 hashes[key]={'model':{'path':str(model),'sha256':sha(model)},'html':{'path':str(render),'sha256':sha(render)},'source':{file:{'path':str(source/file),'sha256':sha(source/file)} for file in ['dom.html','nodes.json','full.png','meta.json']},'shots':{str(r['width']):{'path':r['shot'],'sha256':r['shotSha256']} for r in measure['rows'] if r['key']==name}}
 s=html.unescape(render.read_text());expected=[];images=[]
 for p,n in walk(json.loads(model.read_text())):
  if '_action' in n and n['_action'].get('to'):expected.append({'modelPath':p+'._action.to','to':n['_action']['to'],'presentInHtml':n['_action']['to'] in s})
  if 'image' in n:images.append({'modelPath':p+'.image','url':n['image'],'presentInHtml':n['image'] in s})
 fidelity.append({'page':key,'explicitTargets':expected,'images':images,'allModeledTargetsAndImageUrlsPresent':all(e['presentInHtml'] for e in expected+images),'notProven':'Preservation of unmodeled source facts/actions; action affordance; cross-target Markdown fidelity; runtime login/playback.'})
(D/'covered-hashes.json').write_text(json.dumps(hashes,ensure_ascii=False,indent=2));(D/'modeled-target-image-fidelity.json').write_text(json.dumps(fidelity,ensure_ascii=False,indent=2))
summary=[]
for r in measure['rows']:
 summary.append({'page':r['key'],'width':r['width'],'height':r['document']['h'],'horizontalOverflow':r['document']['w']-r['width'],'brokenImages':len([i for i in r['images'] if not i['natural'][0]]),'enlargedImages':len([i for i in r['images'] if i['w']>i['natural'][0]+1]),'h1Left':r['elements']['h1'][0]['x'],'sectionLefts':sorted(set(e['x'] for e in r['elements']['.depth-1']))})
(D/'geometry-summary.json').write_text(json.dumps(summary,indent=2))
# Paired colors present in authored baseline CSS; this does not test every pseudo-state.
def luminance(h):
 c=[int(h[i:i+2],16)/255 for i in [1,3,5]];c=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c];return sum(v*w for v,w in zip(c,[.2126,.7152,.0722]))
pairs=[('#17212b','#ffffff'),('#536171','#ffffff'),('#0b62d0','#ffffff'),('#33475b','#eef2f7'),('#00699d','#ffffff')]
(D/'contrast-pairs.json').write_text(json.dumps([{'foreground':a,'background':b,'ratio':round((max(luminance(a),luminance(b))+.05)/(min(luminance(a),luminance(b))+.05),2),'scope':'baseline authored text/control/chip colors, not complete accessibility certification'} for a,b in pairs],indent=2))
# Capture DOM recommendation image attribution, without retaining login hidden values or credentials.
class Anchors(HTMLParser):
 def __init__(self):super().__init__();self.current=None;self.out=[]
 def handle_starttag(self,t,a):
  d=dict(a)
  if t=='a':self.current={'href':d.get('href'),'images':[]}
  if t=='img' and self.current:self.current['images'].append({k:v for k,v in d.items() if k in ['src','data-src','alt']})
 def handle_endtag(self,t):
  if t=='a' and self.current:self.out.append(self.current);self.current=None
parser=Anchors();parser.feed(Path('corpus/bilibili-com/video-bv1gj411x7h7/dom.html').read_text());model=json.loads(Path('m1/curated/bilibili-com/video-bv1gj411x7h7.json').read_text());imgrefs=[]
for i,item in enumerate(model['up-next']['_items']):
 target=item['_action']['to'];bv=re.search(r'/video/([^/?]+)',target).group(1);matches=[a for a in parser.out if a['href'] and '/video/'+bv in a['href'] and a['images']];imgrefs.append({'modelPath':f'$.up-next._items[{i}]','title':item['_name']['text'],'modeledImage':item.get('_image'),'sourceImageAnchors':matches})
(D/'source-recommendation-image-attribution.json').write_text(json.dumps(imgrefs,ensure_ascii=False,indent=2))
print('20 viewport probes;',sum(len(f['explicitTargets']) for f in fidelity),'modeled URLs and',sum(len(f['images']) for f in fidelity),'modeled image refs checked; all present:',all(f['allModeledTargetsAndImageUrlsPresent'] for f in fidelity))
print('Source recommendation image matches:',sum(bool(r['sourceImageAnchors']) for r in imgrefs),'of',len(imgrefs))
print('No-overflow/broken/enlarged across captures:',all(not (r['horizontalOverflow'] or r['brokenImages'] or r['enlargedImages']) for r in summary))
print('Source/source capture and model/HTML/shot hash manifest saved.')
