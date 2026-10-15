from source_tree import *
from assets import fetch
page='sspai-com/matrix';m=model(page);r=load(page)
imgs=[i for i in r.descendants('img') if i.hasclass('post-cover')];items=m['feed']['_items'];assert len(imgs)==len(items)==20
count=0
for idx,(img,item) in enumerate(zip(imgs,items)):
 title=item.get('_title',item.get('_name'))['text'];assert title in img.parent.text(),(idx,title,img.parent.text())
 if img.attrs.get('src'):
  val=fetch(page,img,f'feed._items[{idx}]')
  if val:item['_image']=val;count+=1
save(page,m)
print(page,count,'loaded source covers restored')
page='sspai-com/u-jtc092al';m=model(page);r=load(page)
avatar=next(i for i in r.descendants('img') if i.attrs.get('alt')=='MaxChow');val=fetch(page,avatar,'_lines[0] identity')
if val:m['_lines'][0]['_image']=val
count=0
for img in r.descendants('img'):
 if not img.hasclass('user__content__card__image') or img.attrs.get('lazy')!='loaded':continue
 a=img
 while a.tag!='a':a=a.parent
 item=next(x for x in m['_lines'][3]['_items'] if x['_action']['to']=='https://sspai.com'+a.attrs['href'])
 val=fetch(page,img,'activity '+a.attrs['href'])
 if val:item['_image']=val;count+=1
save(page,m);print(page,count,'already-loaded covers + avatar restored; lazy source placeholders unchanged')
