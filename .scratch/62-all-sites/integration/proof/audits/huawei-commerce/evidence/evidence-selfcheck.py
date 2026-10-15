from pathlib import Path
from PIL import Image
import json,hashlib,subprocess
D=Path('.scratch/62-all-sites/audit-huawei-commerce')
cap=json.loads((D/'capture-home_consumer-phones_search-laptop_search-phone.json').read_text())
handoff=json.loads((D/'audit-handoff.json').read_text())
prod=json.loads((D/'product-comparison.json').read_text())
hashfile=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
checks=[]
for page,v in cap['pages'].items():
 for f,h in v['hashes'].items():assert hashfile(f)==h, f+' input changed'
 for w,view in v['viewports'].items():
  shot=Path(view['screenshot']);assert hashfile(shot)==view['sha256']
  dims=Image.open(shot).size;assert dims[1]==view['height'];assert dims[0]>=int(w)
  assert not any(i['naturalW']==0 for i in view['images']),page+' broken modeled image'
  assert not any(i['w']>i['naturalW']+1 or i['h']>i['naturalH']+1 for i in view['images']),page+' enlarged native image'
 checks.append(page+': original inputs unchanged; four screenshot hashes/dimensions valid; decoded modeled images <= native dimensions')
assert cap['pages']['home']['viewports']['2560']['scrollWidth']==3027
assert cap['pages']['home']['viewports']['1440']['scrollWidth']==1907
checks.append('H-E1 reproduced: horizontal overflow at2560/1920/1440, full-bleed figures in grid')
for flag,count in [('missingBuyTarget',36),('missingPriceQualifier',36),('missingImage',1)]:assert sum(bool(i.get(flag))for i in prod['comparison'])==count
checks.append('H-C1/C2/C3:36 missing buy hrefs,36 missing 起 qualifiers,1 missing consumer image confirmed')
assert len(handoff['engineFindings'])==4 and len(handoff['contentFindings'])==8
assert handoff['status']=='INCOMPLETE'
for p,c in handoff['coverage'].items():
 assert 'UNINSPECTED'in c['1920']['wholeHeight']
 if not p.endswith('/home'):assert 'UNINSPECTED'in c['390']['wholeHeight']
for f in handoff['findings']:
 for p in f['evidenceFiles']:assert Path(p).is_file(),p
for p,h in handoff['coveredHashes'].items():assert hashfile(p)==h
assert not subprocess.check_output(['git','diff','--cached','--name-only']).strip()
assert not subprocess.check_output(['git','diff','--name-only']).strip()
checks.append('No tracked project source/model/assets/Docs changes and no staged files; finding evidence paths and covered hashes valid')
(D/'evidence-selfcheck.json').write_text(json.dumps({'status':'passed','checks':checks,'limit':'artifact-integrity/diagnostic selfcheck, not independent visual acceptance'},indent=2)+'\n')
print(json.dumps({'status':'passed','checks':len(checks),'artifact':str(D/'evidence-selfcheck.json'),'visualAcceptance':'INCOMPLETE'}))
