from PIL import Image,ImageDraw
from pathlib import Path
import json,math
D=Path('.scratch/62-all-sites/audit-media-auth-utility');(D/'sheets').mkdir(exist_ok=True)
rows=json.loads((D/'measurements.json').read_text())['rows']
def load(k,w): return Image.open(D/'shots'/f'{k}-{w}.png').convert('RGB')
def label(im,text):
 out=Image.new('RGB',(im.width,im.height+28),'#f0f0f0');out.paste(im,(0,28));ImageDraw.Draw(out).text((8,5),text,fill='black');return out
def compose(ims,name,cols):
 cw=max(i.width for i in ims);ch=max(i.height for i in ims);out=Image.new('RGB',(cw*cols,ch*math.ceil(len(ims)/cols)),'#ddd')
 for j,im in enumerate(ims):out.paste(im,((j%cols)*cw,(j//cols)*ch))
 out.save(D/'sheets'/name)
for k in ['github-com-login','stripe-dashboard-login','xiaomi-account-login']:
 wide=[]
 for w in [2560,1920,1440]:
  im=load(k,w); im.thumbnail((1280,900));wide.append(label(im,f'{k} / {w} full-height overview'))
 im=load(k,2560);wide.append(label(im.crop((820,0,1740,900)), '2560 native content crop x820..1740 / all y'))
 wide.append(label(load(k,390),'390 whole-height native'))
 compose(wide,k+'-widths.png',2)
k='bilibili-com-read-home'
ov=[]
for w in [2560,1920,1440,390]:
 im=load(k,w);im.thumbnail((640,1600));ov.append(label(im,f'{w} FULL height overview'))
compose(ov,k+'-whole.png',4)
# six overlapping native content strips, complete y coverage at 2560.
im=load(k,2560)
for j,starts in enumerate([[0,1320],[2640,3960],[5280,6600]]):
 compose([label(im.crop((820,y,1740,min(y+1380,im.height))),f'2560 native x820..1740 y{y}..{min(y+1380,im.height)}') for y in starts],f'{k}-detail-{j+1}.png',2)
# full 1440 source + native source center, still preserves perimeter in left panel.
im=Image.open('corpus/bilibili-com/read-home/full.png').convert('RGB');ov=im.copy();ov.thumbnail((720,1400));compose([label(ov,'SOURCE 1440 full height'),label(im.crop((180,0,1260,im.height)),'SOURCE native main and sidebar full height')],k+'-source.png',2)
k='bilibili-com-video-bv1gj411x7h7'
for w in [2560,1440]:
 im=load(k,w);ov=im.copy();ov.thumbnail((640,1600));x=(w-1280)//2
 strips=[label(ov,f'{w} FULL height overview')]+[label(im.crop((x,y,x+1280,min(y+1040,im.height))),f'{w} native page frame y{y}..{min(y+1040,im.height)}') for y in [0,1000,2000]]
 compose(strips,f'{k}-{w}-sheet.png',2)
im=Image.open('corpus/bilibili-com/video-bv1gj411x7h7/full.png').convert('RGB');ov=im.copy();ov.thumbnail((720,1400));compose([label(ov,'SOURCE full 1440 height'),label(im.crop((160,0,1320,1360)),'SOURCE top native'),label(im.crop((160,1300,1320,2660)),'SOURCE bottom native')],k+'-source.png',2)
# 390 complete video page split into overlapping vertical strips.
im=load(k,390);compose([label(im.crop((0,y,390,min(y+1400,im.height))),f'390 y{y}..{min(y+1400,im.height)}') for y in [0,1300,2600,3900]],k+'-390-sheet.png',4)
