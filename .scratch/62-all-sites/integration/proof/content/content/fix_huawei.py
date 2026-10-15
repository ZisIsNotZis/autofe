from source_tree import *
from assets import fetch
from urllib.parse import urljoin,urlparse,parse_qs
import re
records=[]
page='huawei-cn/consumer-phones';m=model(page);r=load(page);nodes={n.index:n for n in r.descendants()};inp=json.loads(Path('/home/z/vibe/autofe-worktrees/62-all-sites/audit-huawei-commerce/.scratch/62-all-sites/audit-huawei-commerce/product-comparison.json').read_text())
count=0
for row in inp['comparison']:
 item=m
 for key in row['path'].strip('/').split('/'):item=item[int(key)] if isinstance(item,list) else item[key]
 source=row['source'];assert len(source)==1
 s=source[0]
 if row.get('missingBuyTarget'):
  a=nodes[s['buys'][0]['index']];assert a.tag=='a' and urljoin('https://consumer.huawei.com',a.attrs['href'])==s['buys'][0]['href'];item['buy']['_action']['to']=s['buys'][0]['href'];count+=1
 if row.get('missingPriceQualifier'):
  p=nodes[s['prices'][0]['index']];assert '起' in p.text();item['_price']['qualifier']='起'
 if not item.get('_image') and s.get('image'):
  img=nodes[s['image'][0]['index']];assert img.tag=='img';url=img.attrs.get('data-src',img.attrs.get('src'));assert urljoin('https://consumer.huawei.com',url)==s['image'][0]['url'];item['_image']={'image':s['image'][0]['url'],'alt':img.attrs.get('alt','')}
assert count==36;save(page,m);records.append({'page':page,'findings':['H-C1','H-C2','H-C3'],'buyTargets':count,'details':'Captured36 global-buy-button hrefs +36 original 起 qualifiers; source-lazy missing Mate70Pro image URL preserved with lazy-pixel coverage unresolved'})
for page in ['huawei-cn/search-laptop','huawei-cn/search-phone']:
 m=model(page);r=load(page);meta=json.loads(Path('corpus',page,'meta.json').read_text());base=meta['redirectedUrl'];query=parse_qs(urlparse(base).query)['keywords'][0];m['query']['_default']={'text':query};m['query']['submit']={'_intent':'捕获的搜索提交功能，无实际提交目标，不编造 endpoint。','_action':{'verb':'submit'}}
 m['filters']['_default']=m['filters']['_items'][0]['_name'];m['sort']={'_intent':'捕获的当前排序值与改变排序动作，不建任意文本输入、不编造选项或网络地址。','_text':{'text':'相关性'},'_action':{'verb':'select'}}
 items=m['results'].get('_items',m['results'].get('_lines'))
 ids=[199,226,241,256,271,286,301] if 'laptop' in page else [212,256,273]
 imageCount=0
 for img in r.descendants('img'):
  if img.index not in ids:continue
  a=img
  while a.tag!='a':a=a.parent
  target=urljoin(base,a.attrs['href']);matches=[x for x in items if x['_action']['to']==target]
  if 'laptop' in page and img.index==199:
   item=items[1];item['_action']['to']=target;matches=[item]
  if len(matches)>1:
   # Duplicate phone accessories share their captured href; DOM order maps their distinct image facts to source order.
   remaining=[x for x in matches if '_image' not in x];matches=[remaining[0]]
  assert len(matches)==1,(page,img.index,target)
  val=fetch(page,img,'results '+str(img.index))
  if val:matches[0]['_image']=val;imageCount+=1
 save(page,m);records.append({'page':page,'findings':['H-C3','H-C4','H-C5'],'queryProvenance':'meta.redirectedUrl keywords query (no screenshot transcription)','images':imageCount,'sourceImageCount':len(ids),'details':'Exact captured targets/current category; closed search default+targetless submit; captured sort fact and selection action'})
page='huawei-cn/home';m=model(page);r=load(page);meta=json.loads(Path('corpus',page,'meta.json').read_text());m['_title']={'text':meta['title'].split(' - ')[0]};m['_intent']+=' 根级标题无源站可见文本标题，依据 meta.json 文档标题首段回退为「华为」；完整文档标题「'+meta['title']+'」保留为出处，不把 SEO 品牌主张作为大标题。'
item=m['featured']['_items'][1];old=item['_action']['to'];a=next(a for a in r.descendants('a') if a.attrs.get('href','').startswith(old) and a.attrs['href'].endswith('-200w'));item['_action']['to']=a.attrs['href'];save(page,m);records.append({'page':page,'findings':['H-C6','H-C8'],'details':'Fallback title/provenance and exact captured campaign suffix'})
for page in ['huawei-cn/home','huawei-cn/consumer-phones','huawei-cn/search-laptop','huawei-cn/search-phone']:
 m=model(page);r=load(page);meta=json.loads(Path('corpus',page,'meta.json').read_text());base=meta['redirectedUrl'];ns={n['cleanedIndex']:n for n in json.loads(Path('corpus',page,'nodes.json').read_text())};footer=next(r.descendants('footer'));links=[];seen=set()
 for a in footer.descendants('a'):
  label=a.text();href=a.attrs.get('href','')
  if label and href and ns.get(a.index,{}).get('visible') and (label,href) not in seen:
   links.append(link(a,base));seen.add((label,href))
 facts=[]
 for n in footer.descendants():
  if n.tag=='p' and n.text() and ns.get(n.index,{}).get('visible'):facts.append(text_node(n))
 # Source consumer disclaimers are list items rather than paragraphs.
 if page.endswith('consumer-phones'):
  for li in footer.descendants('li'):
   if len(li.text())>100 and not list(li.descendants('a')) and ns.get(li.index,{}).get('visible'):facts.append(text_node(li))
 m['footer']={'_intent':'捕获并可见的支持/公司/法律页脚入口及原文说明，不重建 cookie 行为。','_items':links}
 if facts:m['footer']['notices']={'_intent':'捕获页面可见的页脚说明与免责声明。','_lines':facts}
 # Visible corporate navigation links only (closed dropdown-hidden links are not inflated).
 headers=list(r.descendants('header'));nav=[];seen=set()
 for header in headers:
  for a in header.descendants('a'):
   href=a.attrs.get('href','');label=a.text()
   if label and href and ns.get(a.index,{}).get('visible') and (label,href) not in seen:nav.append(link(a,base));seen.add((label,href))
 if nav:m['navigation']={'_intent':'捕获的可见顶栏导航入口，不展开隐藏菜单或重造品牌标题。','_items':nav}
 save(page,m);records.append({'page':page,'finding':'H-C7','footerLinks':len(links),'footerNotices':len(facts),'navigation':len(nav),'limits':'Image-only utility actions without captured text labels are not invented; global chrome completeness still requires final source review'})
Path('.scratch/62-all-sites/content/huawei-changes.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n');print(json.dumps(records,ensure_ascii=False))
