from PIL import Image,ImageDraw
from pathlib import Path
import math
D=Path('.scratch/62-all-sites/audit-huawei-commerce')
def sheet(src,dest,w=700,h=1100):
 im=Image.open(src).convert('RGB'); im=im.resize((w,round(im.height*w/im.width)))
 n=math.ceil(im.height/h);out=Image.new('RGB',(n*(w+8),h+32),'#ddd');draw=ImageDraw.Draw(out)
 for i in range(n):
  tile=im.crop((0,i*h,w,min((i+1)*h,im.height)));out.paste(tile,(i*(w+8),32));draw.text((i*(w+8)+4,8),f'{src.name} strip {i+1}/{n}',fill='#000')
 out.save(dest)
for p in ['home','consumer-phones','search-laptop','search-phone']:
 for w in [2560,1440]:sheet(D/f'huawei-cn-{p}-{w}.png',D/f'{p}-{w}-sheet.png')
 sheet(Path(f'corpus/huawei-cn/{p}/full.png'),D/f'{p}-source-sheet.png',w=600)
