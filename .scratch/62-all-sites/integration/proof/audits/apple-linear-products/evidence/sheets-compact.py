import json,math
from pathlib import Path
from PIL import Image,ImageDraw
out=Path('.scratch/62-all-sites/audit-apple-linear-products')
def sheet(inp,dest,tileh=1200,cw=640,cols=3,detail=False):
 im=Image.open(inp).convert('RGB');w,h=im.size
 overvieww=80; ovh=math.ceil(h*overvieww/w)
 body=im
 if detail and w>1280: body=im.crop(((w-1280)//2,0,(w+1280)//2,h))
 bw=body.width;n=math.ceil(h/tileh);ch=math.ceil(tileh*cw/bw)+32
 ca=Image.new('RGB',(overvieww+cols*cw,max(ovh+32,math.ceil(n/cols)*ch)),'#e9e9e9');d=ImageDraw.Draw(ca)
 d.text((3,4),f'{Path(inp).stem} WHOLE WIDTH / HEIGHT',fill='black');ca.paste(im.resize((overvieww,ovh)),(0,32))
 for i,y in enumerate(range(0,h,tileh)):
  tile=body.crop((0,y,bw,min(h,y+tileh))).resize((cw,math.ceil(min(tileh,h-y)*cw/bw)))
  x=overvieww+(i%cols)*cw;z=(i//cols)*ch
  d.text((x+5,z+6),f'y={y}..{min(h,y+tileh)}; central width {bw}',fill='black');ca.paste(tile,(x,z+30))
 ca.save(dest)
for page in ['apple-com-cn/iphone-17','apple-com/iphone-16','apple-com/macbook-air','linear-app/home']:
 key=page.replace('/','-');base=out/'online' if 'iphone-17' in page or 'macbook-air' in page else out
 for width in [2560,1440]:sheet(base/f'{key}-{width}.png',out/f'{key}-{width}-compact.png',detail=True)
 sheet(Path('corpus')/page/'full.png',out/f'{key}-source-compact.png',tileh=1500,cw=640)
 sheet(base/f'{key}-390.png',out/f'{key}-390-compact.png',cw=390,cols=5)
