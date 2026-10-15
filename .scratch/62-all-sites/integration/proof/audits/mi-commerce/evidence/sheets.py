from PIL import Image,ImageDraw
from pathlib import Path
import math,json,hashlib
out=Path('.scratch/62-all-sites/audit-mi-commerce')
keys=['home','search-earbuds','search-phone','shop-category-list']
index=[]
def sheet(im,name,x=0,w=None,ncols=2,strip=2200):
    w=w or im.width
    im=im.crop((x,0,x+w,im.height))
    n=math.ceil(im.height/strip); rows=math.ceil(n/ncols)
    canvas=Image.new('RGB',(w*ncols,(strip+40)*rows),'#dbe3ec'); d=ImageDraw.Draw(canvas)
    for i in range(n):
        xx=(i%ncols)*w; yy=(i//ncols)*(strip+40)
        a=i*strip; b=min(a+strip,im.height)
        d.text((xx+8,yy+8),f'{name}: full-height original y={a}..{b}, crop x={x}..{x+w}',fill='black')
        canvas.paste(im.crop((0,a,w,b)),(xx,yy+40))
    p=out/f'{name}-sheet.png'; canvas.save(p); index.append({'path':str(p),'sourceHeight':im.height,'cropX':x,'cropWidth':w,'stripHeight':strip,'columns':ncols,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
for k in keys:
    for width in [2560,1440]:
        im=Image.open(out/f'{k}-{width}.png'); sheet(im,f'{k}-{width}',x=(width-1280)//2,w=1280,ncols=2,strip=2200)
    im=Image.open(out/f'{k}-390.png'); sheet(im,f'{k}-390',ncols=5 if im.height>8000 else 2,strip=3000 if im.height>8000 else 2200)
    im=Image.open(f'corpus/mi-com/{k}/full.png'); sheet(im,f'{k}-source',ncols=3 if im.height>5000 else 2,strip=2400)
(out/'sheets.json').write_text(json.dumps(index,indent=2))
print('16 full-height labeled sheets generated without dropping vertical content; desktop side gutters outside 1280px main cropped only.')
