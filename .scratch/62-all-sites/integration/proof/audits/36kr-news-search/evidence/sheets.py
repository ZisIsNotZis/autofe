from PIL import Image, ImageDraw
from pathlib import Path
import math
out=Path('.scratch/62-all-sites/audit-36kr-news-search')
for slug in ['home','information-technology','search-ai','search-viz']:
 for width in [2560,1440]:
  im=Image.open(out/f'{slug}-{width}.png').convert('RGB')
  # Full page width and height retained in overview, never discard the blank margins.
  factor= min(1,1280/im.width)
  im.resize((round(im.width*factor),round(im.height*factor))).save(out/f'{slug}-{width}-overview.png')
 # Readable main-frame strips preserve all 1440 content; overlap 40 pixels.
 im=Image.open(out/f'{slug}-1440.png').convert('RGB')
 im=im.crop((80,0,1360,im.height))
 cols=3 if slug=='home' else 2
 step=math.ceil(im.height/cols)
 sheet=Image.new('RGB',(1280*cols,step+65),'#d8dde3');d=ImageDraw.Draw(sheet)
 for i in range(cols):
  start=max(0,i*step-20);end=min(im.height,(i+1)*step+20)
  sheet.paste(im.crop((0,start,1280,end)),(i*1280,30))
  d.text((i*1280+12,8),f'1440 actual main frame — {slug} — y={start}..{end}',fill='black')
 sheet.save(out/f'{slug}-1440-sheet.png')
 im=Image.open(f'corpus/36kr-com/{slug}/full.png').convert('RGB')
 cols=3 if im.height>5000 else 2; step=math.ceil(im.height/cols)
 sheet=Image.new('RGB',(1440*cols,step+65),'#d8dde3');d=ImageDraw.Draw(sheet)
 for i in range(cols):
  start=max(0,i*step-20);end=min(im.height,(i+1)*step+20)
  sheet.paste(im.crop((0,start,1440,end)),(i*1440,30))
  d.text((i*1440+12,8),f'Source capture — {slug} — y={start}..{end}',fill='black')
 sheet.save(out/f'{slug}-source-sheet.png')
