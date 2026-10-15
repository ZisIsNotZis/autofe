from pathlib import Path
exec(Path('.scratch/62-all-sites/content-review/check.py').read_text().split('files=subprocess')[0])
r=[]
for page in ['learn-microsoft/vm-sizes','sspai-com/post-102392','sspai-com/post-114699']:
 p=P();p.feed(Path('corpus',page,'dom.html').read_text());ns=list(p.root.walk());m=json.loads(Path('m1/curated',page+'.json').read_text());text=norm(' '.join(x['text']for _,x in walk(m) if isinstance(x.get('text'),str)))
 if page.startswith('learn-'):bodies=[n for n in ns if n.t=='div' and 'content'in n.a.get('class','').split() and any(c.t=='p' and c.text().startswith('Applies to:')for c in n.walk())]
 else:bodies=[n for n in ns if any(c in n.a.get('class','').split()for c in ['article__main__content','post__body__extend__item__content'])]
 paras=[n.text()for b in bodies for n in b.walk() if n.t=='p' and n.text() and n.text()!='Note'];r.append({'page':page,'bodyCount':len(bodies),'paragraphs':len(paras),'missing':[s for s in paras if s not in text]})
# Verify all source-attributed assets are actually referenced by candidate; bind DOM URLs literally.
p=json.loads(Path('.scratch/62-all-sites/content/asset-provenance.json').read_text());ar=[]
for a in p:
 if not a.get('asset'):continue
 m=json.loads(Path('m1/curated',a['page']+'.json').read_text());references=[path for path,x in walk(m)if x.get('image')=='../assets/'+Path(a['asset']).name];dom=Path('corpus',a['page'],'dom.html').read_text();dp=P();dp.feed(dom);meta=json.loads(Path('corpus',a['page'],'meta.json').read_text());base=meta.get('redirectedUrl') or meta['url'];urls={urljoin(base,v) for n in dp.root.walk() for k,v in n.a.items() if k in ['src','href','data-src','data-original']};ar.append({'asset':a['asset'],'references':references,'urlInCapturedDOM':not a.get('url') or a['url'] in urls})
(O/'body-and-references.json').write_text(json.dumps({'bodies':r,'assets':ar},ensure_ascii=False,indent=2)+'\n');print(r);print('asset failures',[a for a in ar if not a['references'] or not a['urlInCapturedDOM']])
