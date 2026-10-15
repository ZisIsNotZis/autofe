from pathlib import Path
import json,re,urllib.parse
exec(Path('.scratch/62-all-sites/audit-huawei-commerce/source-probe.py').read_text().split('out={}')[0])
p=P();p.feed(Path('corpus/huawei-cn/consumer-phones/dom.html').read_text())
base='https://consumer.huawei.com/cn/phones/'
normtext=lambda t:re.sub(r'[\s\u2060]','',t)
def descendants(idx):
 out=[]
 for n in p.nodes:
  a=n
  while a['parent'] is not None:
   if a['parent']==idx:out.append(n);break
   a=p.nodes[a['parent']]
 return out
products=[]
for n in p.nodes:
 if 'product-col' not in n['attrs'].get('class',''):continue
 kids=descendants(n['index']);titles=[k for k in kids if 'product-title' in k['attrs'].get('class','')]
 if not titles:continue
 images=[k for k in kids if k['tag']=='img'];prices=[k for k in kids if k['attrs'].get('class')=='price-origin'];buys=[k for k in kids if k['tag']=='a' and 'global-buy-button'in k['attrs'].get('class','')]
 products.append({'index':n['index'],'name':titles[0]['text'],'image':[{'index':i['index'],'url':urllib.parse.urljoin(base,i['attrs'].get('data-src',i['attrs'].get('src','')))}for i in images],'prices':[{'index':i['index'],'text':i['text']}for i in prices],'buys':[{'index':i['index'],'href':urllib.parse.urljoin(base,i['attrs'].get('href',''))}for i in buys]})
model=json.loads(Path('m1/curated/huawei-cn/consumer-phones.json').read_text());diff=[]
for series in ['catalog-mate','catalog-pura','catalog-pocket','catalog-nova','catalog-enjoy']:
 for j,it in enumerate(model[series]['_items']):
  match=[s for s in products if normtext(s['name'])==normtext(it['_name']['text'])]
  name=it['_name']['text'];path=f'/{series}/_items/{j}';item={'path':path,'name':name,'modelPrice':it.get('_price'),'modelBuy':it.get('buy'),'modelImage':it.get('_image'),'source':match}
  if match:
   if any('起'in a['text'] for m in match for a in m['prices']) and not it.get('_price',{}).get('qualifier'):item['missingPriceQualifier']=True
   if any(m['buys'] for m in match) and not it.get('buy',{}).get('_action',{}).get('to'):item['missingBuyTarget']=True
   if any(m['image'] for m in match) and '_image'not in it:item['missingImage']=True
  else:item['sourceNameNotMatched']=True
  diff.append(item)
out={'products':products,'comparison':diff}
Path('.scratch/62-all-sites/audit-huawei-commerce/product-comparison.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
print(json.dumps({'missingPriceQualifiers':[i['path'] for i in diff if i.get('missingPriceQualifier')],'missingBuyTargets':[i['path']for i in diff if i.get('missingBuyTarget')],'missingImages':[i['path']for i in diff if i.get('missingImage')],'unmatched':[i['path']for i in diff if i.get('sourceNameNotMatched')]},ensure_ascii=False))
