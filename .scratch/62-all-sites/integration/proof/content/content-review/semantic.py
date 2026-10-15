# Independent delta text attribution and Microsoft row ownership check. No worker imports.
from pathlib import Path
exec(Path('.scratch/62-all-sites/content-review/check.py').read_text().split('files=subprocess')[0])
out={'text':[],'microsoft':[],'protected':[]}
for d in H['dispositions']:
 page=d['page'];f='m1/curated/'+page+'.json';m=json.loads(Path(f).read_text());old=json.loads(subprocess.check_output(['git','show',B+':'+f],text=True));p=P();p.feed(Path('corpus',page,'dom.html').read_text());source=p.root.text();oldtext={norm(x['text']) for _,x in walk(old) if isinstance(x.get('text'),str)}
 new=[(path,norm(x['text'])) for path,x in walk(m) if isinstance(x.get('text'),str) and norm(x['text']) not in oldtext];out['text'].append({'page':page,'newTextCount':len(new),'nonLiteral':[{'path':path,'text':s} for path,s in new if s not in source]})
page='learn-microsoft/vm-sizes';p=P();p.feed(Path('corpus',page,'dom.html').read_text());tables=[n for n in p.root.walk() if n.t=='table'];m=json.loads(Path('m1/curated',page+'.json').read_text());meta=json.loads(Path('corpus',page,'meta.json').read_text());base=meta['redirectedUrl'];modeltables=[(path,x) for path,x in walk(m) if x.get('_composite')=='table'];groups=[(path,x) for path,x in walk(m) if (path.endswith('-links') or path.endswith('/destinations')) and '_lines'in x]
for i,t in enumerate(tables):
 rows=[]
 for row in [n for n in t.walk() if n.t=='tr'][1:]:
  anchors=[(n.text(),urljoin(base,n.a['href'])) for n in row.walk() if n.t=='a' and 'href'in n.a];cells=[n for n in row.parts if isinstance(n,N) and n.t in ['td','th']];rows.append({'label':cells[0].text() if cells else '', 'anchors':anchors})
 if i<len(groups):
  path,g=groups[i];actual=[{'label':r.get('_title',{}).get('text',''),'anchors':[(a.get('label',''),a.get('to')) for _,a in actions(r)]}for r in g['_lines']];expected=[r for r in rows if r['anchors']];out['microsoft'].append({'table':i,'groupPath':path,'expected':expected,'actual':actual,'exact':expected==actual})
 else:out['microsoft'].append({'table':i,'missingGroup':True})
for page in ['airbnb-com/room-28871','apple-com/home','apple-com/ipad-air','bilibili-com/home','mi-com/product-detail-mi15','sspai-com/post-114716','taobao-com/home']:
 f='m1/curated/'+page+'.json';out['protected'].append({'page':page,'unchanged':subprocess.check_output(['git','show',B+':'+f])==Path(f).read_bytes(),'hash':sha(f)})
(O/'semantic-checks.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'text':[(p['page'],len(p['nonLiteral']))for p in out['text']],'microsoft':[(t['table'],t.get('exact'))for t in out['microsoft']],'protected':all(p['unchanged']for p in out['protected'])}))
