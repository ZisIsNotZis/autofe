from source_tree import *
from assets import digest
from urllib.parse import urljoin
from PIL import Image,ImageChops
import subprocess
checks=[]
def test(name,fn):
 try:fn();checks.append({'name':name,'status':'passed'})
 except Exception as e:checks.append({'name':name,'status':'failed','error':str(e)})
def require(x,message='assertion failed'):
 if not x:raise AssertionError(message)
def walk(n):
 if isinstance(n,dict):
  yield n
  for v in n.values():yield from walk(v)
 elif isinstance(n,list):
  for v in n:yield from walk(v)
def texts(m):return [v['text'] for v in walk(m) if isinstance(v.get('text'),str)]
def flattext(m):return ' '.join(texts(m))
report=json.loads(Path('.scratch/62-all-sites/content/content-selftest.json').read_text())
for change in report['actionChanges']:
 page=change['page'];r=load(page);meta=json.loads(Path('corpus',page,'meta.json').read_text());base=meta['redirectedUrl'];targets={urljoin(base,a.attrs['href']) for a in r.descendants('a') if a.attrs.get('href')} | {urljoin(base,f.attrs['action']) for f in r.descendants('form') if f.attrs.get('action')}
 for a in change['addedTargets']:test(page+' source target '+a['path'],lambda a=a:require(a['target'] in targets,a['target']))
page='learn-microsoft/vm-sizes';r=load(page);m=model(page);meta=json.loads(Path('corpus',page,'meta.json').read_text());base=meta['redirectedUrl'];tables=list(r.descendants('table'));groups=[m['vm-size-and-series-naming']['classification-links']]+[m['families-by-type'][k]['destinations'] for k in ['general-purpose','compute-optimized','memory-optimized','storage-optimized','gpu-accelerated','fpga-accelerated','high-performance-compute']]
for ti,(table,group) in enumerate(zip(tables,groups)):
 rows=[row for row in list(table.descendants('tr'))[1:] if list(row.descendants('a'))]
 test('Microsoft table'+str(ti)+' row group count',lambda:require(len(rows)==len(group['_lines'])))
 for ri,(row,mg) in enumerate(zip(rows,group['_lines'])):
  cell=next(n for n in row.parts if isinstance(n,Node) and n.tag in ['td','th']);anchors=[a for a in row.descendants('a') if a.attrs.get('href') and a.text()]
  test(f'Microsoft table{ti} row{ri} identity',lambda:require(mg['_title']['text']==cell.text()))
  test(f'Microsoft table{ti} row{ri} anchor order/labels',lambda:require([(a.text(),urljoin(base,a.attrs['href'])) for a in anchors]==[(i['_action']['label'],i['_action']['to']) for i in mg['_items']]))
body=next(n for n in r.descendants('div') if n.hasclass('content') and any(p.text().startswith('Applies to:') for p in n.descendants('p')));modeltext=flattext(m)
for p in body.descendants('p'):
 if p.text() and p.text()!='Note':test('Microsoft source paragraph '+str(p.index),lambda p=p:require(p.text() in modeltext,p.text()))
for page in ['sspai-com/post-102392','sspai-com/post-114699']:
 r=load(page);m=model(page);t=flattext(m)
 if page.endswith('102392'):bodies=[next(n for n in r.descendants() if n.hasclass('article__main__content'))]
 else:bodies=[n for n in r.descendants() if n.hasclass('post__body__extend__item__content')]
 for body in bodies:
  for p in body.descendants('p'):
   if p.text():test(page+' source paragraph '+str(p.index),lambda p=p:require(p.text() in t,p.text()))
for page in ['huawei-cn/search-laptop','huawei-cn/search-phone']:
 meta=json.loads(Path('corpus',page,'meta.json').read_text());m=model(page)
 from urllib.parse import urlparse,parse_qs
 test(page+' query URL provenance',lambda:require(m['query']['_default']['text']==parse_qs(urlparse(meta['redirectedUrl']).query)['keywords'][0]))
records=json.loads(Path('.scratch/62-all-sites/content/asset-provenance.json').read_text());referenced=set()
for f in report['changedModels']:
 for v in walk(json.loads(Path(f).read_text())):
  if isinstance(v.get('image'),str) and v['image'].startswith('../assets/62-'):referenced.add(str(Path('m1/curated/assets',Path(v['image']).name)))
for rec in records:
 if not rec.get('asset'):continue
 test(rec['asset']+' source hash',lambda:require(digest(rec['source'])==rec['sourceHash']))
 test(rec['asset']+' asset hash',lambda:require(digest(rec['asset'])==rec['sha256']))
 test(rec['asset']+' referenced',lambda:require(rec['asset'] in referenced))
 if rec['status']=='source-screenshot-crop':
  def pixels(rec=rec):
   with Image.open(rec['source']) as source,Image.open(rec['asset']) as asset:
    require(source.crop(tuple(rec['bbox'])).tobytes()==asset.tobytes(),'source pixels differ')
    require(list(asset.size)==rec['naturalSize'])
  test(rec['asset']+' exact captured pixels/no upscale',pixels)
for asset in referenced:test(asset+' provenance home',lambda asset=asset:require(any(r.get('asset')==asset for r in records)))
result={'checks':checks,'status':'PASS' if all(c['status']=='passed' for c in checks) else 'FAIL','newSourceTargets':sum(len(x['addedTargets']) for x in report['actionChanges']),'referencedAssets':len(referenced),'limits':['Exact captured DOM/source/media integrity only, not final visual/user acceptance.','Source-screenshot crops retain captured element pixels, not proof of complete original remote asset;403 retained.','Source lazy placeholders not invented; partial source coverage remains explicit.']}
Path('.scratch/62-all-sites/content/source-fidelity-test.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='checks'},ensure_ascii=False));print('failed',json.dumps([x for x in checks if x['status']=='failed'],ensure_ascii=False));raise SystemExit(result['status']!='PASS')
