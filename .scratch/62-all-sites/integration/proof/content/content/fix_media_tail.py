from source_tree import *
from assets import fetch
from urllib.parse import urljoin
records=[]
page='stripe-dashboard/login';m=model(page);r=load(page);items=[]
for a in r.descendants('a'):
 if a.text() in ['Cookie 政策','管理 Cookie']:items.append(link(a,'https://dashboard.stripe.com'))
for b in r.descendants('a'):
 if b.attrs.get('role')=='button' and b.text() in ['全部接受','全部拒绝']:items.append(action(b.text(),verb='operate'))
assert len(items)==4,len(items)
m['cookies']={'_intent':'捕获登录页显示的 cookie 政策与同意管理工具，只保留原文和可证实目标，不实现用户偏好状态或隐私后端。','_items':items};save(page,m);records.append({'page':page,'finding':'MAU-C1','cookieActions':len(items),'limits':'Source footer outside full900px capture not reconstructed/visually claimed.'})
page='xiaomi-account/login';m=model(page);r=load(page);anchors=list(r.descendants('a'));items=[]
for a in anchors:
 if '/about/protocol/' in a.attrs.get('href','') or '/helpcenter?' in a.attrs.get('href',''):items.append(link(a,'https://account.xiaomi.com'))
m['navigation']={'_intent':'捕获的用户协议、隐私政策与帮助中心工具入口。','_items':items[:3]}
m['login']['agreement-links']={'_intent':'同意布尔值保持独立；保留勾选文案所提及的协议与隐私文档目标，不把整个 checkbox 文案变成导航。','_items':items[3:]};save(page,m);records.append({'page':page,'finding':'MAU-C2','independentPolicyTargets':len(items)})
page='bilibili-com/video-bv1gj411x7h7';m=model(page);r=load(page);meta=json.loads(Path('corpus',page,'meta.json').read_text());base=meta['redirectedUrl'];added=0
for item in m['up-next']['_items']:
 target=item['_action']['to'];a=next(a for a in r.descendants('a') if urljoin(base,a.attrs.get('href','')).split('?')[0].rstrip('/')==target.split('?')[0].rstrip('/') and list(a.descendants('img')));img=next(a.descendants('img'));val=fetch(page,img,'up-next '+target)
 if val:item['_image']=val;added+=1
stats=m['stats'];stats.pop('_measure');interactions=[]
for classname,label in [('video-like','点赞（Q）'),('video-coin','投币（W）'),('video-fav','收藏（E）'),('video-share','分享')]:
 n=next(n for n in r.descendants() if n.hasclass(classname));title=n.attrs.get('title',label);interactions.append({'_name':{'text':title},'_count':{'text':n.text()},'_action':{'verb':'operate','label':title}})
stats['interactions']={'_intent':'源站图标关联的四种互动及其捕获计数，无可证实网络目标，不实现登录/点赞/投币后台。','_items':interactions};save(page,m);records.append({'page':page,'findings':['MAU-C3','MAU-C4'],'sourceAttributedImages':added,'sourceImageCount':20,'details':'Four captured counts restored with icon/title-proven labels and targetless actions; original report/notes retained'})
Path('.scratch/62-all-sites/content/mi-media-changes.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n');print(json.dumps(records,ensure_ascii=False))
