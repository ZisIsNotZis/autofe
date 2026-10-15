// Self-test for m1/eval/imgattr.mjs. Every case is a constructed HTML fragment whose correct
// attribution is known by construction, including the regression the round-42 tool exists for:
// an image that follows a CLOSED <a> must not inherit that (preceding) anchor.
// Run: node m1/eval/imgattr-selftest.mjs   (exit 0 = all assertions pass)
import fs from 'node:fs';
import { scanDom, imageRows, attribute, attrOf, norm } from './imgattr.mjs';

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log('  ok  ', msg); }
  else { failed++; console.log('  FAIL', msg); }
}
// Build a capture-shaped nodes.json from the fragment: open-tag index == cleanedIndex,
// anchors get the accessible name we declare per href, images a 200x200 box.
function nodesFor(html, aNameByHref = {}, imgBox = { w: 200, h: 200 }) {
  const { tags } = scanDom(html);
  const nodes = [];
  for (let k = 0; k < tags.length; k++) {
    const t = tags[k];
    const box = t.name === 'img' ? { x: 0, y: 0, ...imgBox } : { x: 0, y: 0, w: 10, h: 10 };
    const href = t.name === 'a' ? attrOf(t.attrs, 'href') : '';
    nodes.push({ cleanedIndex: k, tag: t.name, name: t.name === 'a' ? (aNameByHref[href] || '') : '', bbox: box });
  }
  return nodes;
}
const meta = { url: 'https://example.test/page', redirectedUrl: 'https://example.test/page' };
const rowsOf = (html, names) => imageRows({ html, nodes: nodesFor(html, names), meta, minW: 100, minH: 60 });

console.log('S1 — nested <a>: the NEAREST enclosing anchor wins');
{
  const html = '<a href="/outer">OUTER<a href="/inner">INNER<img src="/a.png"></a></a>';
  const { rows, dangling } = rowsOf(html, { '/outer': 'OUTER', '/inner': 'INNER' });
  const img = rows.find((r) => r.src.endsWith('/a.png'));
  assert(dangling === 0, `well-formed fragment has dangling-open-tags=0 (got ${dangling})`);
  assert(img && img.href === 'https://example.test/inner', `img's enclosing anchor is /inner (got ${img && img.href})`);
}

console.log('S2 — image AFTER a CLOSED <a> must NOT inherit it (the round-42 regression)');
{
  const html = '<a href="/closed">CARD X</a><div class="content"><img src="/y.png"></div>';
  const { rows } = rowsOf(html, { '/closed': 'CARD X' });
  const img = rows.find((r) => r.src.endsWith('/y.png'));
  assert(img && img.enclosingAnchorIdx === -1 && img.href === '', `img has no anchor ancestor (got href=${img && img.href})`);
}

console.log('S3 — unclosed <a> is reported, and does not swallow the next card');
{
  const html = '<a href="/one">ONE<img src="/u1.png"><a href="/two">TWO<img src="/u2.png"></a>';
  const { rows, dangling, unmatchedClose } = rowsOf(html, { '/one': 'ONE', '/two': 'TWO' });
  assert(dangling > 0, `unclosed fragment reports dangling-open-tags>0 (got ${dangling})`);
  assert(unmatchedClose === 0, `no spurious unmatched close (got ${unmatchedClose})`);
  const i2 = rows.find((r) => r.src.endsWith('/u2.png'));
  assert(i2 && i2.href === 'https://example.test/two', `second card's img stays on /two (got ${i2 && i2.href})`);
}

console.log('S4 — <picture> multi-source: the <img> is the candidate, its chain passes through <picture>');
{
  const html = '<a href="/pic"><picture><source srcset="/p1.webp"><source srcset="/p2.jpg"><img src="/p.jpg" alt="PIC"></picture></a>';
  const { rows } = rowsOf(html, { '/pic': 'PIC' });
  const img = rows.find((r) => r.src.endsWith('/p.jpg'));
  assert(img && img.href === 'https://example.test/pic', `img anchor is /pic (got ${img && img.href})`);
  assert(img && img.chain.includes('picture'), `ancestor chain passes through <picture> (got ${img && img.chain.join('<')})`);
}

console.log('S5 — multiple images inside one entry both map to that entry');
{
  const html = '<a href="/entry">ENTRY<img src="/e1.png"><img src="/e2.png"></a>';
  const { rows } = rowsOf(html, { '/entry': 'ENTRY' });
  const h1 = rows.find((r) => r.src.endsWith('/e1.png'))?.href;
  const h2 = rows.find((r) => r.src.endsWith('/e2.png'))?.href;
  assert(h1 === 'https://example.test/entry' && h2 === 'https://example.test/entry', `both imgs -> /entry (got ${h1} / ${h2})`);
}

console.log('S6 — anchor text is bounded by its own </a> (no spill into the next sibling)');
{
  const html = '<a href="/a1"><img src="/card.png" alt="PRODUCT ONE"></a><a href="/a2">PRODUCT TWO</a>';
  const { rows } = rowsOf(html, { '/a1': 'PRODUCT ONE', '/a2': 'PRODUCT TWO' });
  const img = rows.find((r) => r.src.endsWith('/card.png'));
  assert(img && norm(img.anchorName) === 'PRODUCTONE', `anchor name is exactly the image's own alt (got ${img && JSON.stringify(img.anchorName)})`);
}

console.log('S7 — end-to-end attribute(): M3 matches the ENCLOSING anchor name, not a preceding one');
{
  const dir = '.tmp/imgattr-selftest';
  fs.mkdirSync(dir, { recursive: true });
  const html = '<a href="/post/cv1">Article One</a><section><img src="/wrong.png"></section>'
    + '<a href="/post/cv2">Article Two<img src="/right.png"></a>';
  fs.writeFileSync(`${dir}/dom.html`, html);
  fs.writeFileSync(`${dir}/meta.json`, JSON.stringify(meta));
  fs.writeFileSync(`${dir}/nodes.json`, JSON.stringify(nodesFor(html, { '/post/cv1': 'Article One', '/post/cv2': 'Article Two' })));
  const model = { _lines: [{ _title: { text: 'Article One' }, _action: { to: 'https://example.test/post/cv1' } }, { _title: { text: 'Article Two' }, _action: { to: 'https://example.test/post/cv2' } }] };
  fs.writeFileSync(`${dir}/model.json`, JSON.stringify(model));
  const res = attribute({ dir, modelPath: `${dir}/model.json`, minW: 100, minH: 60 });
  assert(res.dangling === 0, `dangling 0 (got ${res.dangling})`);
  const two = res.assignments.find((a) => norm(a.title) === 'ArticleTwo');
  const one = res.assignments.find((a) => norm(a.title) === 'ArticleOne');
  assert(!!two && two.url.endsWith('/right.png'), `Article Two gets /right.png (got ${two && two.url})`);
  assert(!one && !res.assignments.some((a) => a.url.endsWith('/wrong.png')), 'the image after the closed anchor is left unmatched');
}

console.log(`归属工具自测: ${failed === 0 ? '全部通过' : '有失败'} (${passed} 条断言${failed ? `, ${failed} 失败` : ''})`);
process.exit(failed === 0 ? 0 : 1);
