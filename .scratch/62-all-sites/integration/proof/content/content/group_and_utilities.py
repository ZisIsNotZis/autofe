from source_tree import *
# Retain full article section ownership rather than heading-only siblings.
page='sspai-com/post-102392';m=model(page);items=m['body']['_lines'];groups=[];current={'_intent':'捕获的文章导入段落。','_lines':[]};groups.append(current)
for item in items:
 if set(item)=={'_title'}:
  current={'_intent':'该源站二级标题所管辖的图解与说明，保持原始章节归属。','_title':item['_title'],'_lines':[]};groups.append(current)
 elif item.get('_text',{}).get('text','').startswith('好了～'):
  current={'_intent':'源站分隔线之后的收尾与学习入口。','_lines':[item]};groups.append(current)
 elif '_text' in item and current['_lines'] and '_image' in current['_lines'][-1] and item['_text']['text'].startswith(('给图片','在 Dark Mode')):
  current['_lines'][-1]['_detail']=item['_text']
 else:current['_lines'].append(item)
m['body']['_lines']=groups;save(page,m)
# All captured visible footer actions, within existing source utility groups.
for page in ['36kr-com/home','36kr-com/information-technology','36kr-com/search-ai','36kr-com/search-viz']:
 m=model(page);r=load(page);ns={n['cleanedIndex']:n for n in json.loads(Path('corpus',page,'nodes.json').read_text())};footer=next(n for n in r.descendants() if n.hasclass('kr-footer'));seen=set();acts=[]
 for a in footer.descendants('a'):
  label=a.text();href=a.attrs.get('href','')
  if label and href and ns.get(a.index,{}).get('visible') and (label,href) not in seen:acts.append(link(a,'https://36kr.com'));seen.add((label,href))
 m['footer']={'_intent':'源站捕获且可见的说明、合作、联系和法规工具入口，保持原文及目标。','_items':acts}
 notice=next(n for n in footer.descendants() if n.hasclass('footer-center-top'));record=next(n for n in footer.descendants() if n.hasclass('footer-center-bottom'))
 m['footer']['notices']={'_intent':'捕获页脚服务、举报联系方式与备案声明原文。','_lines':[text_node(notice),text_node(record)]}
 header=next(n for n in r.descendants() if n.hasclass('kr-header'));acts=[];seen=set()
 for a in header.descendants('a'):
  label=a.text();href=a.attrs.get('href','')
  if label and href and ns.get(a.index,{}).get('visible') and (label,href) not in seen:acts.append(link(a,'https://36kr.com'));seen.add((label,href))
 if acts:m['navigation']={'_intent':'捕获的可见全站导航，不展开隐藏下拉菜单或重建登录行为。','_items':acts}
 save(page,m);print(page,'footer',len(m['footer']['_items']),'navigation',len(acts))
