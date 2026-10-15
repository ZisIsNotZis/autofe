from source_tree import load
from assets import records,persist,digest
from pathlib import Path
from urllib.parse import urljoin
from PIL import Image
import json,math
count=0
for rec in records:
 if rec['status']!='retrieved':continue
 page=rec['page'];r=load(page);meta=json.loads(Path('corpus',page,'meta.json').read_text());base=meta['redirectedUrl']
 img=next(i for i in r.descendants('img') if rec['url'] in [urljoin(base,i.attrs.get('src','')),urljoin(base,i.attrs.get('data-src',''))]);ns=json.loads(Path('corpus',page,'nodes.json').read_text());n=next((n for n in ns if n['cleanedIndex']==img.index and n['tag']=='img'),None)
 if not n:rec['sourceDisplaySizeStatus']='UNVERIFIED: no exact captured node';continue
 b=n['bbox'];maxsize=(math.floor(b['w']),math.floor(b['h']));rec['domEvidence']={'nodes':f'corpus/{page}/nodes.json','nodeHash':digest(Path('corpus',page,'nodes.json')),'cleanedIndex':img.index,'cleanedPath':n['cleanedPath'],'bbox':b,'visible':n['visible']}
 if min(maxsize)<=0:rec['sourceDisplaySizeStatus']='UNVERIFIED: empty captured box';continue
 with Image.open(rec['asset']) as im:
  im.load();before=list(im.size);oldhash=digest(rec['asset'])
  im.thumbnail(maxsize,Image.Resampling.LANCZOS)
  if list(im.size)!=before:
   im.save(rec['asset']);rec['retrievedOriginalHash']=oldhash;rec['retrievedOriginalSize']=before;rec['naturalSize']=list(im.size);rec['sha256']=digest(rec['asset']);rec['transform']={'method':'PIL.Image.thumbnail','maximumSourceCapturedSize':list(maxsize),'resample':'LANCZOS','upscale':False,'reason':'Keep retrieved source-attributable media at or below captured displayed image size; no presentation width in models.'};count+=1
 rec['sourceDisplaySizeStatus']='bounded by exact captured box (no enlargement); original/lazy painted-pixel fidelity still requires source review'
persist();print('Downsampled',count,'retrieved originals to source displayed bounds; source provenance retained')
