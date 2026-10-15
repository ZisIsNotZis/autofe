from source_tree import *
from assets import fetch
from urllib.parse import urljoin
records=[]
for page in ['mi-com/home','mi-com/search-earbuds','mi-com/search-phone','mi-com/shop-category-list']:
 m=model(page);r=load(page);meta=json.loads(Path('corpus',page,'meta.json').read_text());base=meta['redirectedUrl'];ns={n['cleanedIndex']:n for n in json.loads(Path('corpus',page,'nodes.json').read_text())}
 footerNodes=[n for n in r.descendants() if n.hasclass('site-footer') or n.hasclass('site-info')];seen=set();links=[];facts=[]
 for footer in footerNodes:
  for a in footer.descendants('a'):
   label=a.text();href=a.attrs.get('href','')
   if label and href and not href.startswith('javascript:') and ns.get(a.index,{}).get('visible') and (label,href) not in seen:links.append(link(a,base));seen.add((label,href))
  for p in footer.descendants('p'):
   if p.text() and ns.get(p.index,{}).get('visible'):facts.append(text_node(p))
 m['footer']={'_intent':'捕获且可见的服务、联系、法律与站点说明入口，保留原文目标；不重建未知 banner 点击或 lazy 营销内容。','_items':links}
 if facts:m['footer']['notices']={'_intent':'源站页脚电话、时间、适用条件与备案等原文说明。','_lines':facts}
 top=next(n for n in r.descendants() if n.hasclass('site-topbar') or n.hasclass('header-container'));links=[];seen=set()
 for a in top.descendants('a'):
  label=a.text();href=a.attrs.get('href','')
  if label and href and not href.startswith('javascript:') and ns.get(a.index,{}).get('visible') and (label,href) not in seen:links.append(link(a,base));seen.add((label,href))
 m['navigation']={'_intent':'捕获的可见小米站点工具导航。','_items':links}
 if not page.endswith('/home'):
  form=next(f for f in r.descendants('form') if f.attrs.get('id')=='J_searchForm');field=next(i for i in form.descendants('input') if i.attrs.get('name')=='keyword')
  m['query']={'_intent':'捕获 form#J_searchForm 的 GET 搜索入口；输入名 keyword，原 DOM 占位文字耳机；没有可证实的当前值，不把请求页关键词或截图文字当作输入默认值。','_composite':'search','_label':{'text':field.attrs['placeholder']},'_expose':{'name':field.attrs['name'],'type':'text'},'submit':{'_intent':'原站捕获的搜索提交目标，未实现网络执行或站点后端。','_title':{'text':'站内搜索'},'_action':{'verb':'submit','to':urljoin(base,form.attrs['action']),'params':{'keyword':'text'},'label':'站内搜索'}}}
 save(page,m);records.append({'page':page,'findings':['MI-C1','MI-C2'],'footerLinks':len(m['footer']['_items']),'footerFactParagraphs':len(facts),'navLinks':len(links),'limits':'Query current value unproven, no default invented; icon-only actions not given fabricated text labels.'})
page='mi-com/search-phone';m=model(page);r=load(page)
# Original numeric pagination contains targetless javascript anchors. Preserve accessible captured labels only.
pageNodes=[n for n in r.descendants() if n.hasclass('mi-pagenav')];assert len(pageNodes)==1
controls=[]
for a in pageNodes[0].descendants('a'):
 label=a.attrs.get('title') or a.attrs.get('aria-label') or a.text()
 if label and not any(0xe000<=ord(c)<=0xf8ff for c in label):controls.append(action(label,verb='navigate'))
# Current page may be a span, not an anchor.
current=next(n for n in pageNodes[0].descendants() if n.hasclass('current'));label=current.text()
if not any(c['_title']['text']==label for c in controls):controls.insert(0,{'_name':{'text':label}})
pagination={'_intent':'捕获的页码与当前页，原站 javascript:void(0) 控件没有导航 URL，不伪造翻页后台。','_items':controls,'_expose':{'name':'page','type':'text'},'_default':{'text':label}}
ordered={}
for k,v in m.items():
 ordered[k]=v
 if k=='results':ordered['pagination']=pagination
save(page,ordered);records.append({'page':page,'finding':'MI-C3','controls':len(controls),'limits':'Glyph-only previous/next labels require source icon semantics support; not invented as text.'})
page='mi-com/shop-category-list';m=model(page);r=load(page);names=['智能家庭','小爱音箱','家庭屏'];moved=[]
for name in names:
 item=next(i for i in m['audio']['_items'] if i.get('_name',i.get('_title',{})).get('text')==name);m['audio']['_items'].remove(item);moved.append(item)
# Source order interleaves these three existing entries with the old smart-home entries.
merged=m['smart-home']['_items']+moved;anchors=list(r.descendants('a'))
def sourceorder(item):
 target=item['_action']['to'];name=item.get('_name',item.get('_title',{}))['text'];return next(a.index for a in anchors if urljoin('https://www.mi.com',a.attrs.get('href',''))==target and a.text()==name)
m['smart-home']['_items']=sorted(merged,key=sourceorder);save(page,m);records.append({'page':page,'finding':'MI-C4','moved':names,'details':'Existing complete entities moved only, order from captured matching target+label anchors'})
page='mi-com/search-earbuds';m=model(page);r=load(page);added=0
for item in m['recommended']['_items']:
 name=item.get('_name',item.get('_title',{}))['text'];target=item['_action']['to'];img=next(i for i in r.descendants('img') if i.attrs.get('alt','').strip()==name and i.attrs.get('data-src'))
 a=img
 while a.tag!='a':a=a.parent
 assert urljoin('https://www.mi.com',a.attrs['href'])==target
 # Exact source data-src attribution, original lazy capture not presented as painted image proof.
 loaded=Node('img',list(img.attrs.items()));loaded.index=img.index;loaded.attrs['src']=img.attrs['data-src'];val=fetch(page,loaded,'recommended '+name)
 if val:item['_image']=val;added+=1
save(page,m);records.append({'page':page,'finding':'MI-C5','sourceAttributedImages':added,'limits':'Original capture images were lazy placeholders; direct public retrieved source URL bytes attributed, original painted-pixel comparison incomplete.'})
page='github-com/login';m=model(page);r=load(page);labels=['Terms','Privacy','Docs','Contact GitHub Support','Manage cookies','Do not share my personal information'];items=[]
for label in labels:
 n=next(n for n in r.descendants() if n.tag in ['a','button'] and n.text()==label);items.append(link(n,'https://github.com') if n.tag=='a' else action(n.text(),verb='operate'))
m['footer']={'_intent':'捕获的法律、支持与隐私 cookie 工具入口；无 href 的按钮只保留动作含义，不模拟同意状态后端。','_items':items};save(page,m);records.append({'page':page,'finding':'MAU-C1','retainedUtilities':labels})
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
