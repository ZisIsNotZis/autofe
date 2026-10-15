from html.parser import HTMLParser
from pathlib import Path
import html, json, re

class Node:
    def __init__(self, tag='', attrs=None, parent=None):
        self.tag, self.attrs, self.parent, self.parts = tag, dict(attrs or []), parent, []
    def descendants(self, tag=None):
        for p in self.parts:
            if isinstance(p, Node):
                if tag is None or p.tag == tag: yield p
                yield from p.descendants(tag)
    def text(self):
        return re.sub(r'\s+', ' ', ''.join(p.text() if isinstance(p, Node) else p for p in self.parts)).strip()
    def hasclass(self, name): return name in self.attrs.get('class','').split()

class Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True); self.root=Node('root'); self.current=self.root; self.index=0
    def handle_starttag(self, tag, attrs):
        n=Node(tag,attrs,self.current); n.index=self.index; self.index+=1; self.current.parts.append(n)
        if tag not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}: self.current=n
    def handle_startendtag(self, tag, attrs): self.handle_starttag(tag,attrs); self.handle_endtag(tag)
    def handle_endtag(self, tag):
        n=self.current
        while n.parent:
            if n.tag==tag: self.current=n.parent; return
            n=n.parent
    def handle_data(self,data): self.current.parts.append(data)

def load(page):
    p=Parser(); p.feed(Path('corpus',page,'dom.html').read_text()); return p.root

def model(page): return json.loads(Path('m1/curated',page+'.json').read_text())
def save(page,m): Path('m1/curated',page+'.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
def action(label,to=None,verb='navigate'):
    a={'verb':verb,'label':label}
    if to is not None: a['to']=to
    return {'_title':{'text':label},'_action':a}

def link(n,base):
    from urllib.parse import urljoin
    return action(n.text(),urljoin(base,n.attrs['href']))

def text_node(n): return {'_text':{'text':n.text()}}

if __name__=='__main__':
    import sys
    r=load(sys.argv[1])
    for n in r.descendants():
        if n.tag in {'h1','h2','h3','p'}: print(n.tag,n.attrs,n.text())
