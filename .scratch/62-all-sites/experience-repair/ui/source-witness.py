import json,re,hashlib,html
from pathlib import Path
from urllib.parse import urljoin
root=Path('.scratch/62-all-sites/experience-repair/ui')
h=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
text=lambda s: re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]*>','',s))).strip()
w=[]
for page in ['home','search-earbuds','search-phone','shop-category-list']:
 source=Path(f'corpus/mi-com/{page}/dom.html'); dom=source.read_text();model=json.loads(Path(f'm1/curated/mi-com/{page}.json').read_text());old=json.loads((root/'baseline'/f'{page}.json').read_text());
 groups=model['footer']['_lines'];remap=[]
 for i,g in enumerate(groups):
  if '_title' not in g: continue
  title=g['_title']['text']; fragments=[x for x in re.findall(r'<dl\b[^>]*class="col-links"[^>]*>(.*?)</dl>',dom,re.S) if re.search('<dt>'+re.escape(title)+'</dt>',x)]
  assert len(fragments)==1,(page,title)
  pairs=[(text(t),urljoin('https://www.mi.com/',html.unescape(u))) for u,t in re.findall(r'<a\b[^>]*href="([^"]*)"[^>]*>(.*?)</a>',fragments[0],re.S) if u and not u.startswith('javascript:')]
  actual=[(n['_action']['label'],n['_action']['to']) for n in g['_items']]
  assert actual==pairs,(page,title,actual,pairs)
  for j,n in enumerate(g['_items']):
   k=old['footer']['_items'].index(n);remap.append({'before':f'footer._items[{k}]','after':f'footer._lines[{i}]._items[{j}]','action':n['_action']})
  w.append({'page':'mi-com/'+page,'source':str(source),'sourceHash':h(source),'group':title,'modelOwner':f'footer._lines[{i}]','capturedMarkup':fragments[0],'orderedTargets':actual})
 (root/f'{page}-owner-remap.json').write_text(json.dumps(remap,ensure_ascii=False,indent=2))
source=Path('corpus/learn-microsoft/vm-sizes/dom.html');dom=source.read_text();section=dom[dom.index('<section id="tabpanel_1_breakdownseries"'):];paragraph=section[section.index('<sup>1</sup>'):section.index('</p>',section.index('<sup>1</sup>'))];units=[text(s) for s in re.split(r'<br\s*/?>',paragraph)];assert len(units)==5
m=json.loads(Path('m1/curated/learn-microsoft/vm-sizes.json').read_text())
def find(n):
 if isinstance(n,dict):
  if 'name-structure-breakdown' in n:return n['name-structure-breakdown']
  for v in n.values():
   r=find(v)
   if r:return r
 elif isinstance(n,list):
  for v in n:
   r=find(v)
   if r:return r
actual=[n['_text']['text'] for n in find(m)['_lines'][2:7]];assert units==actual,(units,actual)
w.append({'page':'learn-microsoft/vm-sizes','source':str(source),'sourceHash':h(source),'capturedMarkup':paragraph,'numberedUnits':units,'sequence':'intro → image → five numbered units → Note'})
for p in ['search-laptop','search-phone']:
 s=Path(f'corpus/huawei-cn/{p}/dom.html');d=s.read_text();a=d.index('id="b-search"');fragment=d[a:a+3000];assert 'btn-b-search' in fragment and 'icon-search' in fragment
 w.append({'page':'huawei-cn/'+p,'source':str(s),'sourceHash':h(s),'capturedMarkup':fragment,'interpretation':'source magnifier submit; no endpoint invented'})
(root/'source-witnesses.json').write_text(json.dumps(w,ensure_ascii=False,indent=2));print('PASS source-owned footer columns, Microsoft5 exact units and2 source search glyphs')
