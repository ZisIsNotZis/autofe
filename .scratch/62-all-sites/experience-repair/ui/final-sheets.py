from pathlib import Path
from PIL import Image,ImageDraw
import json
r=Path('.scratch/62-all-sites/experience-repair/ui')
def crop(p,box):return Image.open(p).convert('RGB').crop(box)
def join(name,images):
 out=Image.new('RGB',(sum(i.width for _,i in images),max(i.height for _,i in images)+30),'#eee');d=ImageDraw.Draw(out);x=0
 for label,i in images:d.text((x+5,5),label,fill='black');out.paste(i,(x,30));x+=i.width
 out.save(r/name)
# Final all-height overview delta; native samples remain separate, not represented as all-readable.
families=['news','editorial','instructions','footer','search','technical','auth','protected'];out=Image.new('RGB',(1600,2400),'#eee')
for j,f in enumerate(families):
 im=Image.open(r/f'{f}-wholeheight.jpg').convert('RGB');im.thumbnail((800,600));out.paste(im,((j%2)*800,(j//2)*600))
out.save(r/'final-wholeheight-delta.jpg')
# Current identity and mobile footer after compact-control fixes.
join('final-identity-footer.jpg',[('identity current 2560',crop(r/'sspai-com-u-jtc092al-2560.png',(640,70,1280,420))),('footer current 390',crop(r/'mi-com-search-phone-390.png',(0,11800,390,13205)))])
join('final-microsoft-source.jpg',[('current 2560 naming',crop(r/'learn-microsoft-vm-sizes-2560.png',(640,1320,1440,2370))),('captured source naming',crop('corpus/learn-microsoft/vm-sizes/full.png',(376,1850,1064,2950)))])
join('final-instruction-source-access.jpg',[('current 390 original access',crop(r/'snippet-0-native-access.png',(0,1200,390,2600))),('captured instruction sequence',crop('corpus/sspai-com/post-102392/full.png',(380,1600,1060,2800)))])
join('final-news-source-measure.jpg',[('current long summary 2560',crop(r/'36kr-com-search-ai-2560.png',(640,2700,1920,3700))),('captured compact news 1440',crop('corpus/36kr-com/search-ai/full.png',(275,320,1070,1250)))])
join('final-auth.jpg',[(n,crop(r/f'{n}-390.png',(0,0,390,1000)))for n in ['github-com-login','stripe-dashboard-login','xiaomi-account-login']])
join('final-stripe-ecs-access.jpg',[('current Stripe intro 2560',crop(r/'stripe-docs-payments-2560.png',(640,0,1920,650))),('current ECS native 390',crop(r/'native-access.png',(0,0,390,1000)))])
