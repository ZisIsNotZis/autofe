from pathlib import Path
from urllib.parse import urljoin
from PIL import Image
import hashlib, json, subprocess, io, math
ROOT=Path('.scratch/62-all-sites/content'); MANIFEST=ROOT/'asset-provenance.json'
records=json.loads(MANIFEST.read_text()) if MANIFEST.exists() else []
def digest(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def persist():MANIFEST.write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
def fetch(page,node,owner):
    url=node.attrs.get('src','')
    if not url or url.startswith('data:'):return None
    base=json.loads(Path('corpus',page,'meta.json').read_text());url=urljoin(base.get('redirectedUrl',base['url']),url)
    name='62-'+page.replace('/','-')+'-'+hashlib.sha256(url.encode()).hexdigest()[:12]
    existing=next((r for r in records if r.get('url')==url and r.get('status')=='retrieved'),None)
    if existing:return {'image':'../assets/'+Path(existing['asset']).name,'alt':node.attrs.get('alt','')}
    recovered=next((r for r in records if r.get('url')==url and r.get('status')=='source-screenshot-crop'),None)
    if recovered:return {'image':'../assets/'+Path(recovered['asset']).name,'alt':node.attrs.get('alt','')}
    failed=next((r for r in records if r.get('url')==url and r.get('status')=='unavailable'),None)
    if failed:
        return recover_403(page,node,owner,url,failed) if '403' in failed.get('error','') else None
    download=ROOT/(name+'.download')
    result=subprocess.run(['curl','--fail','--silent','--show-error','--location','--proto','=https','--max-time','20','--connect-timeout','8','--output',str(download),url],capture_output=True,text=True,timeout=25)
    rec={'page':page,'owner':owner,'url':url,'source':f'corpus/{page}/dom.html','sourceHash':digest(Path('corpus',page,'dom.html')),'alt':node.attrs.get('alt',''),'status':'unavailable'}
    if result.returncode==0:
        try:
            with Image.open(download) as im:
                im.load();rec['naturalSize']=list(im.size);rec['format']=im.format
                ext={'PNG':'png','JPEG':'jpg','WEBP':'webp','GIF':'gif'}[im.format]
            asset=Path('m1/curated/assets',name+'.'+ext);asset.write_bytes(download.read_bytes());rec.update(status='retrieved',asset=str(asset),sha256=digest(asset));records.append(rec);persist()
            return {'image':'../assets/'+asset.name,'alt':node.attrs.get('alt','')}
        except Exception as e:rec['error']=str(e)
    else:rec['error']=result.stderr.strip()
    records.append(rec);persist()
    return recover_403(page,node,owner,url,rec) if '403' in rec.get('error','') else None

def recover_403(page,node,owner,url,failure):
    if not page.startswith('sspai-com/'):return None
    nodes=json.loads(Path('corpus',page,'nodes.json').read_text())
    captured=next((n for n in nodes if n.get('cleanedIndex')==node.index and n.get('tag')=='img' and n.get('visible')),None)
    if not captured:return None
    b=captured['bbox'];bbox=[math.ceil(b['x']),math.ceil(b['y']),math.floor(b['x']+b['w']),math.floor(b['y']+b['h'])]
    source=Path('corpus',page,'full.png')
    with Image.open(source) as im:
        if bbox[0]<0 or bbox[1]<0 or bbox[2]>im.width or bbox[3]>im.height or bbox[2]<=bbox[0] or bbox[3]<=bbox[1]:return None
    val=crop(page,bbox,'recovered-'+page.replace('/','-')+'-'+hashlib.sha256(url.encode()).hexdigest()[:12],owner,{'nodes':f'corpus/{page}/nodes.json','nodeHash':digest(Path('corpus',page,'nodes.json')),'cleanedIndex':node.index,'cleanedPath':captured['cleanedPath'],'bbox':b})
    records[-1].update(url=url,originalAssetUnavailable=failure['error'],clipping='Fully within captured image; inward integer rounding trims at most one subpixel edge. Occlusion/content completeness requires image review.',alt=node.attrs.get('alt',''));persist();val['alt']=node.attrs.get('alt','');return val

def crop(page,bbox,name,owner,domEvidence):
    source=Path('corpus',page,'full.png');asset=Path('m1/curated/assets','62-'+name+'.png')
    with Image.open(source) as im: im.crop(tuple(bbox)).save(asset)
    rec={'page':page,'owner':owner,'source':str(source),'sourceHash':digest(source),'bbox':bbox,'domEvidence':domEvidence,'asset':str(asset),'sha256':digest(asset),'naturalSize':[bbox[2]-bbox[0],bbox[3]-bbox[1]],'status':'source-screenshot-crop','command':f'PIL.Image.open({str(source)!r}).crop({tuple(bbox)!r}).save({str(asset)!r})','limits':'Static captured demo pixels; no interactive behavior recreated, no text transcribed from image.'};records.append(rec);persist()
    return {'image':'../assets/'+asset.name,'alt':''}
