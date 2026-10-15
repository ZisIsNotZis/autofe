import json,re
from html.parser import HTMLParser
from urllib.parse import urljoin,unquote
from pathlib import Path
out=Path('.scratch/62-all-sites/audit-36kr-news-search')
class Parser(HTMLParser):
 def __init__(self): super().__init__();self.nodes=[];self.stack=[]
 def handle_starttag(self,tag,attrs):
  n={'index':len(self.nodes),'tag':tag,'attrs':dict(attrs),'text':'','ancestors':[x['index'] for x in self.stack]};self.nodes.append(n)
  if tag not in ['img','input','meta','link','br','hr','source','area','base','wbr']:self.stack.append(n)
 def handle_endtag(self,tag):
  for i in range(len(self.stack)-1,-1,-1):
   if self.stack[i]['tag']==tag:self.stack=self.stack[:i];break
 def handle_data(self,data):
  for n in self.stack:n['text']+=data
res={}
geometry=json.load(open(out/'geometry.json'))['result']
def norm(s):return unquote(urljoin('https://36kr.com',s)).rstrip('/')
for slug in ['home','information-technology','search-ai','search-viz']:
 p=Parser();p.feed(Path(f'corpus/36kr-com/{slug}/dom.html').read_text());model=json.loads(Path(f'm1/curated/36kr-com/{slug}.json').read_text());mtext=Path(f'm1/curated/36kr-com/{slug}.json').read_text()
 actions=[];images=[]
 def walk(n,path='$'):
  if isinstance(n,dict):
   if n.get('_action',{}).get('to'):actions.append({'path':path+'._action.to','to':n['_action']['to']})
   if n.get('_image',{}).get('image'):images.append({'path':path+'._image','image':n['_image']['image'],'alt':n['_image'].get('alt')})
   for k,v in n.items():walk(v,path+'.'+k)
  if isinstance(n,list):
   for i,v in enumerate(n):walk(v,path+f'[{i}]')
 walk(model)
 rendered=next(x for x in geometry if x['page']=='36kr-com/'+slug and x['width']==2560)
 hrefs={norm(a['href']) for a in rendered['anchors']};source_hrefs={norm(n['attrs']['href']) for n in p.nodes if n['attrs'].get('href')}
 source_imgs={urljoin('https://36kr.com',n['attrs']['src']) for n in p.nodes if n['tag']=='img' and n['attrs'].get('src')}
 choices=[]
 for group in ['channels','search-type']:
  for i,n in enumerate(model.get(group,{}).get('_items',[])):
   if n.get('_action',{}).get('to'):choices.append({'path':f'$.{group}._items[{i}]','text':n['_name']['text'],'to':n['_action']['to']})
 samples=[]
 for n in p.nodes:
  text=n['text'].strip()
  if (n['tag']=='div' and n['attrs'].get('class')=='kr-loading-more-button show') or (n['tag']=='a' and text in ['关于我们','首页','快讯','资讯','搜索','项目推荐','我要入驻','城市合作']):samples.append(n)
  if n['tag']=='img' and n['attrs'].get('alt')=='36氪空天探索计划':
   samples.append(n)
   samples.extend(p.nodes[i] for i in n['ancestors'] if p.nodes[i]['tag']=='a')
 ns=json.loads(Path(f'corpus/36kr-com/{slug}/nodes.json').read_text())
 node_samples=[n for n in ns if n.get('visible') and n.get('text') in ['关于我们','36氪空天探索计划','查看更多','文章','相关性','科技'] and (n.get('tag') in ['a','p','li','span'] or n.get('text')=='查看更多')]
 res[slug]={'modelActionCount':len(actions),'renderAnchorCount':len(rendered['anchors']),'modelTargetsMissingFromRender': [a for a in actions if norm(a['to']) not in hrefs], 'choiceActionsNotRenderedAtOption':choices,'modelTargetsNotFoundInSource':[a for a in actions if norm(a['to']) not in source_hrefs], 'modelImagesNotFoundInSource':[i for i in images if i['image'] not in source_imgs],'sourceDomSamples':samples,'sourceNodeSamples':node_samples,'modelHasMoreLabel':'查看更多' in mtext,'modelHasAboutTarget':'/pages/about' in mtext,'modelHasSpaceTopic':'36氪空天探索计划' in mtext}
json.dump(res,open(out/'source-evidence.json','w'),ensure_ascii=False,indent=2)
for slug,d in res.items():print(slug,'actions',d['modelActionCount'],'anchors',d['renderAnchorCount'],'missing targets',len(d['modelTargetsMissingFromRender']),'choice actions',len(d['choiceActionsNotRenderedAtOption']),'source absent action targets',len(d['modelTargetsNotFoundInSource']),'source absent images',len(d['modelImagesNotFoundInSource']))
def L(hex):
 vals=[int(hex[i:i+2],16)/255 for i in (1,3,5)];linear=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in vals];return sum(a*b for a,b in zip(linear,[.2126,.7152,.0722]))
pairs=[('#1890ff','#ffffff'),('#17212b','#ffffff'),('#536171','#ffffff'),('#ffffff','#17212b'),('#8493a3','#ffffff')]
json.dump([{'foreground':a,'background':b,'contrast':round((max(L(a),L(b))+.05)/(min(L(a),L(b))+.05),3)}for a,b in pairs],open(out/'contrast.json','w'),indent=2)
print('Contrast:',[(a,b,round((max(L(a),L(b))+.05)/(min(L(a),L(b))+.05),3)) for a,b in pairs])
