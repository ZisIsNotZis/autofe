from pathlib import Path
from PIL import Image,ImageDraw
import json
r=Path('.scratch/62-all-sites/experience-repair/ui');g=json.loads((r/'geometry.json').read_text())
families={'news':['36kr-com-home','36kr-com-information-technology','36kr-com-search-ai','36kr-com-search-viz'],'editorial':['sspai-com-home','sspai-com-u-jtc092al'],'instructions':['sspai-com-post-102392'],'footer':['mi-com-home','mi-com-search-earbuds','mi-com-search-phone','mi-com-shop-category-list'],'search':['huawei-cn-search-laptop','huawei-cn-search-phone'],'technical':['stripe-docs-payments','learn-microsoft-vm-sizes','aliyun-com-product-ecs'],'auth':['github-com-login','stripe-dashboard-login','xiaomi-account-login'],'protected':['airbnb-com-room-28871','apple-com-home','apple-com-ipad-air','bilibili-com-home','mi-com-product-detail-mi15','sspai-com-post-114716','taobao-com-home']}
for family,names in families.items():
 sheet=Image.new('RGB',(len(names)*420,1500),'#eee');d=ImageDraw.Draw(sheet)
 for k,n in enumerate(names):
  for j,w in enumerate([2560,1920,1440,390]):
   im=Image.open(r/f'{n}-{w}.png').convert('RGB');im.thumbnail((100,1420));sheet.paste(im,(k*420+j*105,60));d.text((k*420+j*105,35),str(w),fill='black')
  d.text((k*420,10),n,fill='black')
 sheet.save(r/f'{family}-wholeheight.jpg')
# Native crops, retain desktop pixels (no enlargement); source crops are separately bound.
for family,names in families.items():
 crops=[]
 for n in names:
  for w in [2560,390]:
   row=next(x for x in g if x['name']==n and x['width']==w);im=Image.open(r/f'{n}-{w}.png').convert('RGB');x=640 if w==2560 else 0;cw=1280 if w==2560 else 390
   if family=='news':y=max(0,int(row['records'][0]['y'])-25);height=900
   elif family=='footer':y=max(0,im.height-1150);height=1150
   elif family=='instructions':y=1100;height=1800
   elif family=='search':y=0;height=min(im.height,2600)
   elif family=='technical' and 'learn-' in n:y=1600;height=1600
   else:y=0;height=1000
   if n=='apple-com-home' and w==2560:x=416;cw=1728
   if n=='sspai-com-post-114716' and w==2560:x=880;cw=800
   crop=im.crop((x,y,min(im.width,x+cw),min(im.height,y+height)))
   label=Image.new('RGB',(crop.width,crop.height+30),'white');ImageDraw.Draw(label).text((5,5),f'{n} {w} y={y}',fill='black');label.paste(crop,(0,30));crops.append(label)
 width=max(c.width for c in crops);height=sum(c.height for c in crops);out=Image.new('RGB',(width,height),'#eee');y=0
 for c in crops:out.paste(c,(0,y));y+=c.height
 # Keep separate native crops to avoid tool scaling long contact sheets.
 for j,c in enumerate(crops):c.save(r/f'{family}-native-{j}.png')
 out.save(r/f'{family}-native-all.jpg')
