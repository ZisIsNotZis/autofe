from PIL import Image, ImageDraw
from pathlib import Path
import json,math,hashlib
out=Path('.scratch/62-all-sites/audit-cloud-business')
manifest={}
def sheet(name,path,scale=1,columns=3,chunk=1000,box=None,start=0,end=None):
 im=Image.open(path).convert('RGB'); end=end or im.height
 x0,y0,x1,y1=box or (0,0,im.width,im.height)
 crop=im.crop((x0,max(y0,start),x1,min(y1,end)))
 width=round(crop.width*scale);h=round(chunk*scale); n=math.ceil(crop.height/chunk)
 canvas=Image.new('RGB',(columns*(width+12),math.ceil(n/columns)*(h+30)), '#d8d8d8');d=ImageDraw.Draw(canvas)
 for i in range(n):
  piece=crop.crop((0,i*chunk,crop.width,min((i+1)*chunk,crop.height)))
  piece=piece.resize((width,round(piece.height*scale)))
  x=(i%columns)*(width+12);y=(i//columns)*(h+30)
  canvas.paste(piece,(x,y+25));d.text((x+3,y+3),f'{name} y={max(y0,start)+i*chunk}..{min(max(y0,start)+(i+1)*chunk,min(y1,end))}',fill='black')
 pathout=out/(name+'.png');canvas.save(pathout)
 manifest[name]={'path':str(pathout),'input':str(path),'sha256':hashlib.sha256(pathout.read_bytes()).hexdigest(),'range':[start,end],'crop':[x0,y0,x1,y1],'scale':scale,'100PercentHeight':start==0 and end==im.height}
for key in ['aliyun-com-home','aliyun-com-product-ecs','aws-amazon-ec2-on-demand']:
 sheet(key+'-2560-sheet',out/(key+'-2560.png'),.7 if 'home' in key else .8,3,1000, (0,0,2560,7439) if 'home' in key else (640,0,1920,99999))
 sheet(key+'-1440-sheet',out/(key+'-1440.png'),.85,3,1000)
 source=Path('corpus')/key.rsplit('-',1)[0] # explicit mapping below
maps={'aliyun-com-home':'aliyun-com/home','aliyun-com-product-ecs':'aliyun-com/product-ecs','aws-amazon-ec2-on-demand':'aws-amazon/ec2-on-demand'}
for key,p in maps.items():sheet(key+'-source-sheet',Path('corpus')/p/'full.png',.55,4,1500)
sheet('stripe-2560-upper',out/'stripe-com-pricing-2560.png',1,3,1500,(824,0,1736,17440),0,9000)
sheet('stripe-2560-lower',out/'stripe-com-pricing-2560.png',1,3,1500,(824,0,1736,17440),9000,17440)
sheet('stripe-1440-sheet',out/'stripe-com-pricing-1440.png',.7,4,1400,(264,0,1176,17440))
sheet('stripe-source-upper',Path('corpus/stripe-com/pricing/full.png'),.6,4,1400,start=0,end=8400)
sheet('stripe-source-lower',Path('corpus/stripe-com/pricing/full.png'),.6,4,1400,start=8400)
sheet('grafana-2560-sheet',out/'grafana-play-play-home-2560.png',1,1,900,(640,0,1920,900))
sheet('grafana-source',Path('corpus/grafana-play/play-home/full.png'),1,1,900)
# Supplemental relevant 1440+390 Grafana captures; entire height of both.
a=Image.open(out/'grafana-play-play-home-1440.png');b=Image.open(out/'grafana-play-play-home-390.png');c=Image.new('RGB',(a.width+b.width,max(a.height,b.height)), '#ddd');c.paste(a,(0,0));c.paste(b,(a.width,0));c.save(out/'grafana-1440-390.png')
manifest['grafana-1440-390']={'path':str(out/'grafana-1440-390.png'),'sha256':hashlib.sha256((out/'grafana-1440-390.png').read_bytes()).hexdigest(),'100PercentHeight':True}
(out/'sheet-manifest.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps({k:v['path'] for k,v in manifest.items()},indent=2))
