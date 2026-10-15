from pathlib import Path
import json,hashlib
from PIL import Image
p=json.load(open('.scratch/62-all-sites/content/asset-provenance.json'));r=[]
for a in p:
 if 'asset'not in a:continue
 errors=[];de=a.get('domEvidence',{});nh=None
 if de:
  nodes=json.load(open(de['nodes']));matches=[n for n in nodes if n.get('cleanedIndex')==de['cleanedIndex'] and n.get('cleanedPath')==de['cleanedPath']]
  if not matches or matches[0]['bbox']!=de['bbox']:errors.append('DOM bbox/index mismatch')
  nh=hashlib.sha256(Path(de['nodes']).read_bytes()).hexdigest()
  if de.get('nodeHash') and nh!=de['nodeHash']:errors.append('node hash mismatch')
 if a['status']=='retrieved':
  f=Path('.scratch/62-all-sites/content')/(Path(a['asset']).stem+'.download');orig=Image.open(f);im=Image.open(a['asset']);th=orig.copy();th.thumbnail(a.get('transform',{}).get('maximumSourceCapturedSize',orig.size),Image.Resampling.LANCZOS)
  if hashlib.sha256(f.read_bytes()).hexdigest()!=a.get('retrievedOriginalHash',a['sha256']):errors.append('original hash mismatch')
  if im.width>orig.width or im.height>orig.height:errors.append('upscaled')
  if th.size!=im.size:errors.append('transform size mismatch')
 r.append({'asset':a['asset'],'nodeHash':nh,'errors':errors})
Path('.scratch/62-all-sites/content-review/provenance-checks.json').write_text(json.dumps(r,indent=2)+'\n');print([x for x in r if x['errors']])
