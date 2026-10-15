from source_tree import *
from assets import fetch,crop
from urllib.parse import urljoin
import math
log=[]
def blocks(n,page,owner,base):
    out=[]
    for c in n.parts:
        if not isinstance(c,Node):continue
        if c.tag in ['h2','h3']:
            out.append({'_title':{'text':c.text()}})
        elif c.tag in ['p','blockquote','li','pre']:
            item={}
            if c.text():item['_text']={'text':c.text()}
            for i,img in enumerate(c.descendants('img')):
                val=fetch(page,img,owner)
                if val:item['media-'+str(i)]={'_image':val}
            anchors=[a for a in c.descendants('a') if a.attrs.get('href') and a.text()]
            for i,a in enumerate(anchors):item['link-'+str(i)]=link(a,base)
            if any(not k.startswith('_') for k in item):item['_intent']='保留本段捕获的文字、媒体和对应原文链接。'
            if item:out.append(item)
        elif c.tag in ['ul','ol']:
            for li in c.parts:
                if isinstance(li,Node) and li.tag=='li':
                    holder=Node('holder');holder.parts=[li];out.extend(blocks(holder,page,owner,base))
        elif c.tag=='figure':
            imgs=list(c.descendants('img'))
            for img in imgs:
                val=fetch(page,img,owner)
                if val:out.append({'_image':val})
            captions=list(c.descendants('figcaption'))
            for cap in captions:
                if cap.text():out.append(text_node(cap))
    return out
page='gov-uk/ni-rates-letters';m=model(page);r=load(page);anchors=list(r.descendants('a'));base='https://www.gov.uk'
def a_for(href):return next(a for a in anchors if a.attrs.get('href')==href)
m['contribution-rates']['category-letter']=link(a_for('/national-insurance-rates-letters/category-letters'),base)
# Table schema admits only action-shaped row children. Main-guide notes belong next to, not inside, typed tables.
ordered={}
for k,v in m.items():
 if k=='example':continue
 ordered[k]=v
 if k=='employee-rates':
  ordered['past-employee-rates']={'_intent':'源站雇员表的历史费率链接。',**link(a_for('/government/publications/rates-and-allowances-national-insurance-contributions'),base)}
  ordered['example']=m['example']
 if k=='employer-rates':
  p=next(p for p in r.descendants('p') if 'has full rates and thresholds' in p.text())
  years=[a for a in anchors if a.text() in ['2025 to 2026','2024 to 2025','2023 to 2024','2022 to 2023']]
  ordered['historical-rates']={'_intent':'源站雇主表后的 HMRC 历史税年费率与阈值入口。','_summary':{'text':p.text()},'_items':[link(a,base) for a in years]}
  p=next(p for p in r.descendants('p') if 'calculators and tables' in p.text())
  ordered['payroll-calculators']={'_intent':'源站核查雇员国民保险的工具入口。','_summary':{'text':p.text()},**link(a_for('/government/collections/how-to-manually-check-your-payroll-calculations'),base)}
classnode=ordered['class-1a-1b'];ps=[p for p in r.descendants('p') if 'Employers pay Class 1A' in p.text() or 'some other lump sum' in p.text()]
classnode['_text']={'text':' '.join(p.text() for p in ps)}
for i,a in enumerate(a for p in ps for a in p.descendants('a')):classnode['guide-'+str(i)]=link(a,base)
ordered['print-guide']={'_intent':'捕获的整篇指南打印入口。',**link(a_for('/national-insurance-rates-letters/print'),base)}
save(page,ordered);log.append({'page':page,'findings':'C1/C2','restored':'Original employee example association; all captured main-guide inline/tool/print actions and Class1A lump-sum obligation'})
page='learn-microsoft/vm-sizes';m=model(page);r=load(page);meta=json.loads(Path('corpus',page,'meta.json').read_text());base=meta['redirectedUrl'];tables=list(r.descendants('table'));assert len(tables)==8
naming=m['vm-size-and-series-naming'];classification=naming.pop('name-structure-breakdown');classification.pop('_title',None);naming['classification']=classification
body=next(n for n in r.descendants('div') if n.hasclass('content') and any(p.text().startswith('Applies to:') for p in n.descendants('p')))
intro=[]
for n in body.parts:
 if not isinstance(n,Node):continue
 if n.tag=='div' and list(n.descendants('h2')):break
 holder=Node('holder');holder.parts=[n];intro.extend(blocks(holder,page,'intro',base))
# Retain table text exactly, plus adjacent source-labelled action groups by source row.
alltables=[classification]+list(m['families-by-type'].values())[2:]
# Ordering avoids relying on metadata-key count.
keys=['general-purpose','compute-optimized','memory-optimized','storage-optimized','gpu-accelerated','fpga-accelerated','high-performance-compute']
alltables=[classification]+[m['families-by-type'][k] for k in keys]
count=0
for idx,(table,tm) in enumerate(zip(tables,alltables)):
 rows=list(table.descendants('tr'))[1:]; groups=[]
 for rowidx,row in enumerate(rows):
  cells=[c for c in row.parts if isinstance(c,Node) and c.tag in ['td','th']];links=[a for a in row.descendants('a') if a.attrs.get('href') and a.text()]
  if not links:continue
  label=cells[0].text();group={'_intent':f'源站表格第{rowidx+1}行 {label} 的原文导航入口，按该行捕获顺序保留；类型化表格事实保持不变。','_title':{'text':label},'_items':[link(a,base) for a in links]};groups.append(group);count+=len(links)
 if idx==0:naming['classification-links']={'_intent':'分类表逐行导航入口；冻结语法不支持链接单元格，故相邻保留行归属与目标，最终可用性待独立审查。','_lines':groups}
 else:
  tm.pop('_composite',None)
  wrapped={'_intent':'该工作负载类型的说明、原始类型化表格和逐行导航入口，保留共同归属。','_title':tm.pop('_title')}
  # The source h3 is a heading-wrapper sibling; following paragraphs before next table are workload explanations.
  heading=next(n for n in body.descendants('h3') if n.attrs.get('id')==keys[idx-1]);siblings=[p for p in body.parts if isinstance(p,Node)];start=siblings.index(heading.parent)+1;descs=[]
  for s in siblings[start:]:
   if s.tag=='div' and (list(s.descendants('table')) or list(s.descendants('h3'))):break
   if s.tag=='p' and s.text():descs.append(text_node(s))
  if descs:wrapped['description']={'_intent':'源站类型标题下的工作负载说明。','_lines':descs}
  tm['_composite']='table';wrapped['families']=tm;wrapped['destinations']={'_intent':'表格逐行源链接；保留行名与顺序，最终紧凑性/可用性待独立审查。','_lines':groups};m['families-by-type'][keys[idx-1]]=wrapped
assert count==127,count
# Naming explanation paragraphs and diagram already present in captured section.
section=next(n for n in r.descendants('section') if n.attrs.get('id')=='tabpanel_1_breakdownseries')
naming['name-structure-breakdown']={'_intent':'实际命名结构解释、原始图解与五项脚注，不再把上方分类表误标为本节。','_key':'name-structure-breakdown','_title':{'text':'Name structure breakdown'},'_lines':blocks(section,page,'name-structure-breakdown',base)}
for alert in section.descendants('div'):
 if alert.hasclass('alert'):naming['name-structure-breakdown']['_lines'].extend(blocks(alert,page,'naming-note',base))
# Source introductory naming and family-navigation explanations.
for group,id in [(naming,'vm-size-and-series-naming'),(m['families-by-type'],'list-of-vm-size-families-by-type')]:
 heading=next(n for n in body.descendants('h2') if n.attrs.get('id')==id);siblings=[n for n in body.parts if isinstance(n,Node)];start=siblings.index(heading.parent)+1;ps=[]
 for n in siblings[start:]:
  if n.tag=='div' and (list(n.descendants('table')) or list(n.descendants('h3'))):break
  if n.tag=='p':ps.append(text_node(n))
 group['introduction']={'_intent':'源站本节开头的解释段落。','_lines':ps}
# Lower article regions from first heading through Next steps, no global chrome.
siblings=[n for n in body.parts if isinstance(n,Node)];start=next(i for i,n in enumerate(siblings) if any(h.attrs.get('id')=='list-available-machine-sizes-by-region' for h in n.descendants('h3')))
lower={};current=None
for n in siblings[start:]:
 hs=list(n.descendants('h2'))+list(n.descendants('h3')) if n.tag=='div' else []
 if hs:
  h=hs[0];current={'_intent':'保留源站对应正文区域的事实与原文目标。','_title':{'text':h.text()},'_lines':[]};lower[h.attrs['id']]=current
 elif current is not None:
  holder=Node('holder');holder.parts=[n];current['_lines'].extend(blocks(holder,page,current['_title']['text'],base))
# Source HPC retirement note belongs after that family table.
notes=[n for n in body.descendants('div') if n.hasclass('alert') and 'will be retired' in n.text()]
if notes:m['families-by-type']['high-performance-compute']['retirement']={'_intent':'捕获的 HC 系列退役告知，日期原样保留。','_lines':blocks(notes[0],page,'HPC retirement',base)}
m={'_intent':m['_intent'],'_title':m['_title'],'introduction':{'_intent':'源站正文适用范围与概述及视频入口。','_lines':intro},'vm-size-and-series-naming':naming,'families-by-type':m['families-by-type'],**lower}
save(page,m);log.append({'page':page,'findings':'C3/C4','tableAnchors':count,'restored':'8 immutable typed table grids plus adjacent127 row-associated source actions; actual naming explanation/diagram, intro, workloads, retirement and lower regions','tradeoff':'Frozen grammar has no linked table value; final row association/compact usability must be independently reviewed'})
page='sspai-com/post-102392';m=model(page);r=load(page);body=next(n for n in r.descendants() if n.hasclass('article__main__content'));items=blocks(body,page,'article-body','https://sspai.com');m['body']={'_intent':'捕获文章正文按原始顺序保留段落、两种深色模式图解、说明与学习入口；不从图像转写文字。','_rel':{'order':'sequence'},'_lines':items};m.pop('lead',None);m.pop('closing',None)
# Preserve original related entry and recover source-proven four titles/actions, but never synthesize lazy pixels.
related=[]
for card in r.descendants('article'):
 if card.hasclass('article__card'):
  title=next(p for p in card.descendants('p') if p.hasclass('article__card__title'));a=next(a for a in card.descendants('a') if '/post/' in a.attrs.get('href',''));related.append({'_title':{'text':title.text()},'_action':{'verb':'open','to':urljoin('https://sspai.com',a.attrs['href'])}})
assert len(related)==4
old=m['related']['_lines'][0]
for item in related:
 if item['_action']['to']==old['_action']['to'] and '_image' in old:item['_image']=old['_image']
m['related'].pop('_lines');m['related']['_items']=related;save(page,m);log.append({'page':page,'findings':'C2','restored':'All captured substantive body paragraphs, four instructional images and exact manual/learning anchors; four related titles/actions (lazy missing image bytes not fabricated)'})
page='sspai-com/post-114699';m=model(page);r=load(page);news=[n for n in r.descendants() if n.hasclass('post__body__extend__item__content')];assert len(news)==8
for item,source in zip(m['news']['_items'],news[:7]):
 item.pop('_summary',None);item.pop('_subtitle',None);item['body']={'_intent':'该新闻源站完整正文、图像和原文出处按捕获顺序保留。','_lines':blocks(source,page,item['_title']['text'],'https://sspai.com')}
# Eighth source block is existing first brief, restore its full article prose in the same owned context.
if m['briefs']['_items']:
 m['briefs']['_items'][0]['body']={'_intent':'捕获简讯完整正文。','_lines':blocks(news[7],page,'brief-0','https://sspai.com')}
cover=next(i for i in r.descendants('img') if '045d7312' in i.attrs.get('src',''));val=fetch(page,cover,'root cover')
if val:m['_image']=val
save(page,m);log.append({'page':page,'findings':'C2','restored':'All seven full news bodies plus eighth brief; captured cover and Panasonic/Bose illustrations; source labels/targets'})
page='stripe-docs/payments';m=model(page);r=load(page);img=next(i for i in r.descendants('img') if 'payments-hero.' in i.attrs.get('src',''));val=fetch(page,img,'intro')
if val:m['_lines'][0]['_image']=val
save(page,m);log.append({'page':page,'findings':'C6','restored':bool(val)})
# Meaningful static product demos use capture-only crops of the corresponding DOM panel.
page='linear-app/home';m=model(page);nodes=json.loads(Path('corpus',page,'nodes.json').read_text());ids=[223,871,1385,2136,2384]
for idx,id in enumerate(ids):
 n=next(n for n in nodes if n['cleanedIndex']==id);b=n['bbox'];bbox=[math.floor(b['x']),math.floor(b['y']),math.ceil(b['x']+b['w']),math.ceil(b['y']+b['h'])];val=crop(page,bbox,'linear-demo-'+str(idx),'hero-demo' if idx==0 else f'beats._lines[{idx-1}]',{'nodes':f'corpus/{page}/nodes.json','cleanedIndex':id,'cleanedPath':n['cleanedPath'],'bbox':b})
 if idx==0:
  r=load(page);p=next(p for p in r.descendants('p') if 'vehicle_state sync' in p.text());m['demo']={'_intent':'源站 hero 的工作区示例，不是 Changelog。静态演示像素来自捕获图；事实文字来自 DOM，原始完整 DOM/nodes 保留为 provenance。','_image':val,'_title':{'text':'Faster app launch'},'_detail':{'text':p.text()}}
 else:m['beats']['_lines'][idx-1]['_image']=val
save(page,m);log.append({'page':page,'finding':'C4','restored':'Five bounded DOM-backed visual demo crops, source facts retain captured DOM provenance, no screenshot text transcription/whole-page bypass'})
Path('.scratch/62-all-sites/content/article-changes.json').write_text(json.dumps(log,ensure_ascii=False,indent=2)+'\n');print('Restored',len(log),'article/source-media groups')
