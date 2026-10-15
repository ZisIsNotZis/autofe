from source_tree import *
from urllib.parse import urljoin
from datetime import datetime
import copy
changes=[]
def record(page,finding,detail): changes.append({'page':page,'finding':finding,'detail':detail,'source':f'corpus/{page}/dom.html'})
# Exact destinations disproven by stored source.
j=json.loads(Path('/home/z/vibe/autofe-worktrees/62-all-sites/audit-sspai-editorial/.scratch/62-all-sites/audit-handoff.json').read_text())
for target in j['wrongTargets']:
 page=target['page']; p=Path('m1/curated',page+'.json'); s=p.read_text(); assert target['source'] in [urljoin('https://sspai.com',a.attrs.get('href','')) for a in load(page).descendants('a')]; assert target['actual'] in s
 p.write_text(s.replace(target['actual'],target['source']));record(page,'sspai C1',target['path'])
page='aliyun-com/product-ecs';m=model(page);r=load(page)
target='https://ecs-buy.aliyun.com/buyRedirect.htm?period=1&periodType=Yearly';assert any(a.attrs.get('href')==target for a in r.descendants('a'))
m['_action']['to']=target
for i,item in enumerate(m['instances']['_items']):
 item['_action'].pop('to');
 if i<3: item['_price']['qualifier']='/1年起' if i==0 else '/1年'
m['instances']['_intent']='四个实例按规格对照，列为实例、行为属性；规格与金额来自捕获页面。前三项保留源站年度计价及 e 实例的起价限定。各卡立即购买按钮无捕获目标，不编造 spec 路由。g9i 源站没有金额，不编造价格。'
save(page,m);record(page,'CB-C1/CB-C2','Exact root buy URL, targetless offer controls, captured annual qualifiers; g9i amount remains absent')
page='apple-com/iphone-16';m=model(page);m['compare']['_rel']={'compare':True};m['compare']['_intent']='源站五款 iPhone 选型对照：每款为独立实体，保留共同属性及各自的嵌套事实；源站按实体列对照，不把不同实体的位置列表配成属性行。';save(page,m);record(page,'Apple C3','Source-proven comparison relation')
page='stripe-docs/payments';m=model(page);r=load(page);h1=next(r.descendants('h1'));assert h1.text()=='付款';m['_title']={'text':h1.text()};save(page,m);record(page,'Docs C5','Captured visible H1 instead of SEO title')
page='sspai-com/u-jtc092al';m=model(page);r=load(page);assert next(n for n in r.descendants() if n.attrs.get('id')=='writeCount').text()=='16557'
m['_lines'][2]['_lines'][3]={'_name':{'text':'创作字数'},'_measure':{'num':16557},'_intent':'源站 writeCount=16557，对应 character--fill 字数图标；不是未捕获的充电量。'}
save(page,m);record(page,'sspai C3','Remove unsupported charging4; preserve captured character count16557 with DOM icon provenance')
for page in ['36kr-com/information-technology','36kr-com/search-ai','36kr-com/search-viz']:
 m=model(page);r=load(page);more=next(n for n in r.descendants() if n.hasclass('kr-loading-more-button') and n.hasclass('show'));m['continuation']={'_intent':'已捕获列表的继续加载控件，无 href，不编造网络目标。',**action(more.text(),verb='open')}
 if 'search-' in page:
  m['search-type']['_default']={'text':'文章'};m['sort']['_default']={'text':'相关性'}
 else: m['channels']['_default']={'text':'科技'}
 save(page,m);record(page,'36kr C1/C2','Targetless captured continuation and captured current exposure values')
# Compact captured utilities retain exact labels and targets, not entire global menu recreation.
for page in ['36kr-com/home','36kr-com/information-technology','36kr-com/search-ai','36kr-com/search-viz']:
 m=model(page);r=load(page);a=next(a for a in r.descendants('a') if a.attrs.get('href')=='/pages/about');m['footer']={'_intent':'捕获页面的站点说明入口，保留原文与目标。','_items':[link(a,'https://36kr.com')]};save(page,m);record(page,'36kr C3','Captured about utility')
for page in ['sspai-com/home','sspai-com/matrix','sspai-com/post-102392','sspai-com/post-114699','sspai-com/u-jtc092al']:
 m=model(page);r=load(page);anchors=list(r.descendants('a'))
 nav=[]
 for path in ['/create','/prime','/matrix','/series']:
  a=next(a for a in anchors if a.attrs.get('href')==path and a.text());nav.append(link(a,'https://sspai.com'))
 m['navigation']={'_intent':'捕获的少数派主导航入口，保持站点原文与目标。','_items':nav}
 if 'u-jtc' not in page:
  footer=[];seen=set()
  for a in anchors:
   href=a.attrs.get('href','');label=a.text()
   if label and any(s in label for s in ['关于我们','用户协议','商务合作','联系我们','下载App','下载 App','下载应用']) and href and href not in seen:
    footer.append(link(a,'https://sspai.com'));seen.add(href)
  if footer:m['footer']={'_intent':'捕获的站点说明、协议与联系下载工具入口，不编造额外站点信息。','_items':footer}
 save(page,m);record(page,'sspai C5','Captured navigation and available utility labels/targets')
page='linear-app/home';m=model(page);r=load(page)
ps=[p for p in r.descendants('p') if p.hasclass('b-30Va_descriptionText')];assert len(ps)==4
for item,p,path in zip(m['beats']['_lines'],ps,['/intake','/plan','/ai','/build']):
 a=next(a for a in r.descendants('a') if a.attrs.get('href')==path and 'Learn more' in a.text());item['_detail']={'text':p.text()};item['_action']={'verb':'navigate','to':urljoin('https://linear.app',path),'label':a.text()}
m['changelog']['_items']=[]
for a in r.descendants('a'):
 if '/changelog/' not in a.attrs.get('href',''):continue
 spans=[n for n in a.descendants('span') if n.text()];assert len(spans)==3
 m['changelog']['_items'].append({'_title':{'text':spans[0].text()},'_summary':{'text':spans[1].text()},'_datetime':{'date':datetime.strptime(spans[2].text(),'%b %d, %Y').strftime('%Y-%m-%d')},'_action':{'verb':'open','to':urljoin('https://linear.app',a.attrs['href'])}})
# Correct paraphrased proof statements to exact captured body text.
proof=[p for p in r.descendants('p') if 'kFzTUE' in p.attrs.get('class','')];assert len(proof)==3
m['proof']['_summary']={'text':proof[0].text()}
for item,p in zip(m['proof']['_lines'],proof[1:]):item['_detail']={'text':p.text()}
save(page,m);record(page,'Linear C1/C2','Actual four changelog entries with visible dates (not URL inferred); exact feature explanations/targets and proof text')
Path('.scratch/62-all-sites/content/initial-changes.json').write_text(json.dumps(changes,ensure_ascii=False,indent=2)+'\n')
print('Implemented',len(changes),'source-grounded corrections')
