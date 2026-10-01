// attrib.mjs — round 29 helper.
// Reuses scanElementTags-style tokenization (same rules as .scratch/26-images/imgmap.mjs)
// to walk the raw dom.html tag stream with a nesting stack, so we can report for a given
// cleanedIndex the enclosing <a href> and the concatenated text of the nearest card ancestor.
// No URL is invented: hrefs come verbatim from dom.html.
import fs from 'node:fs';
import path from 'node:path';

const RAW_TEXT = new Set(['script', 'style']);
function scanElementTags(html) {
  const out = [];
  let i = 0;
  const n = html.length;
  while (i < n) {
    const lt = html.indexOf('<', i);
    if (lt < 0) break;
    i = lt + 1;
    const c = html[i];
    if (c === '!') {
      if (html.startsWith('!--', i)) { const e = html.indexOf('-->', i); i = e < 0 ? n : e + 3; } else { const e = html.indexOf('>', i); i = e < 0 ? n : e + 1; }
      continue;
    }
    if (c === '?' || c === '/') { const e = html.indexOf('>', i); i = e < 0 ? n : e + 1; continue; }
    if (!/[A-Za-z]/.test(c)) continue;
    let j = i;
    while (j < n && !/[\s/>]/.test(html[j])) j++;
    const name = html.slice(i, j).toLowerCase();
    const gt = html.indexOf('>', j);
    const end = gt < 0 ? n : gt;
    const attrs = html.slice(j, end);
    const raw = html.slice(lt, end + 1);
    out.push({ name, attrs, raw, start: lt, end: end + 1 });
    i = end + 1;
    if (RAW_TEXT.has(name)) {
      const close = html.indexOf('</' + name, i);
      if (close >= 0) { const e = html.indexOf('>', close); i = e < 0 ? n : e + 1; }
    }
  }
  return out;
}

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
function attrOf(attrs, name) {
  const re = new RegExp('\\s' + name + '\\s*=\\s*"([^"]*)"', 'i');
  const m = attrs.match(re) ?? attrs.match(new RegExp('\\s' + name + "\\s*=\\s*'([^']*)'", 'i'));
  return m ? m[1] : '';
}

const dir = process.argv[2];
const idxs = process.argv[3].split(',').map(Number);
const html = fs.readFileSync(path.join(dir, 'dom.html'), 'utf8');
const tags = scanElementTags(html);

// Build parent links over the token stream.
const parent = new Array(tags.length).fill(-1);
const stack = [];
for (let k = 0; k < tags.length; k++) {
  const t = tags[k];
  if (t.raw.startsWith('</')) {
    // closing tag: pop to matching open
    for (let s = stack.length - 1; s >= 0; s--) {
      if (tags[stack[s]].name === t.name) { stack.length = s; break; }
    }
    continue;
  }
  const selfClose = /\/>$/.test(t.raw.trim()) || VOID.has(t.name);
  parent[k] = stack.length ? stack[stack.length - 1] : -1;
  if (!selfClose) stack.push(k);
}

function textBetween(a, b) {
  let out = '';
  for (let k = a + 1; k <= b && k < tags.length; k++) {
    const gap = html.slice(k > a ? tags[k - 1].end : 0, tags[k].start);
    if (gap && !/^[\s>]*$/.test(gap)) out += gap.replace(/\s+/g, ' ');
  }
  return out.replace(/\s+/g, ' ').trim();
}

for (const idx of idxs) {
  const t = tags[idx];
  if (!t || t.name !== 'img') { console.log(`${idx}\tNOT-IMG(${t ? t.name : 'oob'})`); continue; }
  // enclosing <a>
  let aIdx = -1, cardIdx = -1;
  let p = parent[idx];
  const chain = [];
  while (p >= 0) {
    chain.push(tags[p].name);
    if (aIdx < 0 && tags[p].name === 'a') aIdx = p;
    if (cardIdx < 0 && (tags[p].name === 'li' || tags[p].name === 'figure')) cardIdx = p;
    p = parent[p];
  }
  const href = aIdx >= 0 ? attrOf(tags[aIdx].attrs, 'href') : '';
  // find end of card by matching close: scan for the matching close index of cardIdx
  let cardText = '';
  if (aIdx >= 0) {
    // text inside <a> until its close
    let depth = 0, endA = -1;
    for (let k = aIdx + 1; k < tags.length; k++) {
      if (tags[k].raw.startsWith('</') && tags[k].name === 'a') { if (depth === 0) { endA = k; break; } depth--; }
      else if (tags[k].name === 'a' && !tags[k].raw.startsWith('</')) depth++;
    }
    if (endA > 0) cardText = textBetween(aIdx, endA);
  }
  console.log(`${idx}\tcard=${cardIdx >= 0 ? tags[cardIdx].name : '-'}\thref=${href}\ttext=${cardText.slice(0, 160)}`);
}
