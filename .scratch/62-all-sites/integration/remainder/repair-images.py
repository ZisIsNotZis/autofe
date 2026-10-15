import json,urllib.request,hashlib,io
from pathlib import Path
from PIL import Image
from datetime import datetime
root=Path.cwd();summary=json.load(open('.scratch/62-all-sites/integration/geometry-summary.json'));out=[]
for page,urls in summary['failedImages'].items():
 p=Path('m1/curated/'+page+'.json');model=json.load(open(p));dom=Path('corpus/'+page+'/dom.html').read_text();nodes=Path('corpus/'+page+'/nodes.json').read_text();sourcehash={f:hashlib.sha256(Path('corpus/'+page+'/'+f).read_bytes()).hexdigest() for f in ['dom.html','nodes.json','full.png']};mapping={}
 for url in urls:
  assert url in dom or url in nodes or url.removeprefix('https:') in dom or url.removeprefix('https:') in nodes,('URL not captured',page,url)
  try:
   with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=12)as r:
    assert r.status==200;data=r.read();mime=r.headers.get('Content-Type');im=Image.open(io.BytesIO(data));im.load();fmt=im.format;ext={'JPEG':'jpg','WEBP':'webp','PNG':'png'}[fmt];h=hashlib.sha256(data).hexdigest();asset=Path('m1/curated/assets')/('62-resource-'+h[:16]+'.'+ext);asset.write_bytes(data);mapping[url]='../assets/'+asset.name;out.append({'page':page,'sourceUrl':url,'asset':str(asset),'sha256':h,'bytes':len(data),'naturalWidth':im.width,'naturalHeight':im.height,'status':r.status,'contentType':mime,'sourceHashes':sourcehash,'sourceMatch':'captured URL in DOM/nodes with protocol-relative HTTPS normalization only; no access-control bypass or pixel crop','retrievalTime':datetime.now().astimezone().isoformat(),'modelPaths':[]})
  except Exception as e:out.append({'page':page,'sourceUrl':url,'failure':str(e)})
 def visit(v,path='$'):
  if isinstance(v,dict):
   if isinstance(v.get('image'),str) and v['image'] in mapping:
    old=v['image'];v['image']=mapping[old]
    next(x for x in out if x.get('page')==page and x.get('sourceUrl')==old and 'asset'in x)['modelPaths'].append(path+'.image')
   for k,c in v.items():visit(c,path+'.'+k)
  elif isinstance(v,list):
   for i,c in enumerate(v):visit(c,path+'['+str(i)+']')
 visit(model);p.write_text(json.dumps(model,ensure_ascii=False,indent=2)+'\n')
json.dump(out,open('.scratch/62-all-sites/integration/remainder/image-resource-provenance.json','w'),indent=2,ensure_ascii=False);print('Source-exact resource assets',sum('asset'in x for x in out),'failures',sum('failure'in x for x in out))
