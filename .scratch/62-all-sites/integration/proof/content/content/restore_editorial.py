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
