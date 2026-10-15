// Link-coverage analyzer (round 55, the 13th gate's engine) — MODEL vs CAPTURE vs RENDER
// for links. Fidelity counts fact TEXT and is blind to "the source made this text a link,
// the model kept the words and dropped the link" — the user's U-01/U-03/U-04 class. The
// capture↔model gate (F-078) certifies VALUES, never STRUCTURE, so an anchor could lose its
// target and every gate stayed green.
//
// DECISION (one page at a time, three verdicts, no guessing):
//   1. wrong-target   — a rendered link whose target is not an href the capture actually
//                       carries. This is how a FABRICATED URL is caught (F-025: a URL may
//                       not be constructed, only lifted).
//   2. anchor-dropped — a run of rendered text that is VERBATIM the visible text of a
//                       capture anchor that HAS a real href, but is drawn as plain text
//                       (not inside `<a href>`). The source said "this is a link"; the
//                       render says "this is a word".
//   3. no-target      — a capture anchor whose href is `javascript:`/`#`/empty. The source
//                       itself carries no target, so nothing can be reconstructed; these
//                       are REPORTED (honest denominator) but never fail. Inventing a URL
//                       here would be the very thing F-025 forbids.
// An `anchor-dropped` or `wrong-target` finding is legal only when the whitelist
// (`link-coverage-allow.json`) declares it WITH a written reason and the round it was
// recorded; the declared count is printed, never hidden.
//
// Usage:
//   node m1/eval/link-coverage.mjs                  # all exemplar pages
//   node m1/eval/link-coverage.mjs --only a/b,c/d   # subset
//   node m1/eval/link-coverage.mjs --json
// Exit 1 when any finding is undeclared.
import fs from 'node:fs';
import path from 'node:path';
import { childrenOf } from '../model-lib.mjs';
import { namedChildEntries, tableLinkPair, labelTextOf } from '../axis.mjs';
import { ownerOracle } from './link-owners.mjs';

// A reserved key (`_action`, `_items`, …) is structure, never a visible fact.
const isReservedKey = (k) => ['_intent','_primary','_key','_when','_action','_rel','_expose','_composite','_default'].includes(k);

const ENTITY = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
export const decodeEntities = (s) => String(s).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, g) => {
  if (g[0] === '#') {
    const cp = g[1].toLowerCase() === 'x' ? parseInt(g.slice(2), 16) : Number(g.slice(1));
    return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
  }
  return ENTITY[g.toLowerCase()] ?? m;
});
const DROP = /[\s\p{P}\p{S}\p{Cf}\ufe00-\ufe0f]/u;
// The same normalization family the other gates use (whitespace/punctuation/symbols dropped,
// case folded, entities decoded) so a comparison never fails on decoration alone.
export const compact = (s) => [...decodeEntities(String(s)).toLowerCase()].filter((c) => !DROP.test(c)).join('');
const stripTags = (s) => decodeEntities(String(s).replace(/<[^>]*>/g, ' '));
// Information threshold (anti-false-positive, same family as the capture gate's T2): an
// anchor text of fewer than 3 compact characters (`电视`, `家电`) is a navigation word that
// occurs many times on a page — a plain run matching it proves nothing about THAT anchor
// (mi-com/shop-category-list's `电视` heading is not the `电视` nav link). Short texts are
// skipped, and the honest denominator is the anchors that DO participate, never padded.
export const TEXT_MIN = 3;
const visible = (s) => stripTags(s).replace(/\s+/g, ' ').trim();

// `javascript:`/`#`/empty targets exist but point nowhere: the capture itself has no target.
export function hrefIsReal(href) {
  if (typeof href !== 'string') return false;
  const h = href.trim();
  if (!h) return false;
  if (/^javascript:/i.test(h)) return false;
  if (h.startsWith('#')) return false;
  return true;
}
// Protocol-relative and root-relative targets are absolutized against the page's own URL
// (curation rule AD-1) before comparison; `&amp;` is the same ampersand either way.
export function normalizeHref(href, baseUrl) {
  if (typeof href !== 'string') return '';
  let h = decodeEntities(href.trim());
  if (!h) return '';
  if (h.startsWith('//')) h = 'https:' + h;
  else if (baseUrl && !/^[a-z][a-z\d+.-]*:/i.test(h)) {
    try { h = new URL(h, baseUrl).href; } catch { /* malformed target stays unmatched */ }
  }
  // URL serialization equates literal Unicode with its percent-encoded URI form;
  // it does not discard queries/fragments or reorder their association.
  if (/^https?:\/\//i.test(h)) { try { h = new URL(h).href; } catch { /* reject by exact comparison */ } }
  return h.replace(/\/+$/, '');
}
function baseUrlOf(corpusDir) {
  try { const meta = JSON.parse(fs.readFileSync(path.join(corpusDir, 'meta.json'), 'utf8')); return meta.redirectedUrl ?? meta.url ?? ''; } catch { return ''; }
}

// ---- capture side: every anchor with its visible text and href -------------
export function sourceAnchors(dom, baseUrl = '') {
  const out = [];
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(dom))) {
    const attrs = m[1];
    const h = /\bhref\s*=\s*"([^"]*)"/i.exec(attrs) ?? /\bhref\s*=\s*'([^']*)'/i.exec(attrs);
    const raw = h ? decodeEntities(h[1]) : null;
    const text = visible(m[2]);
    if (!compact(text)) continue;      // icon-only / empty anchors carry no fact
    out.push({ text, href: raw, real: hrefIsReal(raw), norm: hrefIsReal(raw) ? normalizeHref(raw, baseUrl) : null });
  }
  return out;
}

// ---- render side: visible text runs, each tagged link|plain ---------------
// One run = one TEXT NODE, not "everything between two anchors": a renderer emits each fact
// as its own element, so a text node is the unit a link can be attached to. Splitting at tag
// boundaries is what makes the verbatim match meaningful — a blob of a whole section would
// contain almost every anchor's words and flag nothing precisely.
export function renderRuns(html) {
  const h = String(html).replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  const runs = [];
  let depth = 0;
  const hrefs = [];
  let buf = [];
  const flush = () => {
    const t = visible(buf.join(''));
    if (t) runs.push({ text: t, href: depth ? (hrefs[hrefs.length - 1] ?? null) : null });
    buf = [];
  };
  for (const tok of h.split(/(<[^>]*>)/)) {
    if (!tok) continue;
    if (tok[0] === '<') {
      const open = /^<a\b([^>]*)>/i.exec(tok);
      if (open) { flush(); depth++; hrefs.push(/\bhref\s*=\s*"([^"]*)"/i.exec(open[1])?.[1] ?? null); continue; }
      if (/^<\/a\s*>/i.test(tok)) { flush(); depth = Math.max(0, depth - 1); hrefs.pop(); continue; }
      flush();
      continue;
    }
    buf.push(tok);
  }
  flush();
  return runs;
}

export function loadAllow(p = 'm1/eval/link-coverage-allow.json') {
  if (!fs.existsSync(p)) return { entries: [], index: new Map() };
  const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
  const entries = doc.entries ?? [];
  const index = new Map();
  for (const [i, e] of entries.entries()) {
    if (typeof e.page !== 'string' || typeof e.text !== 'string' || typeof e.reason !== 'string' || !e.reason.trim()) {
      throw new Error(`link-coverage-allow.json entries[${i}] must carry page, text and a non-empty reason`);
    }
    if (!['anchor-dropped', 'wrong-target'].includes(e.kind)) {
      throw new Error(`link-coverage-allow.json entries[${i}] kind must be 'anchor-dropped' or 'wrong-target'`);
    }
    if (e.round === undefined || e.round === null || e.round === '') {
      throw new Error(`link-coverage-allow.json entries[${i}] must carry the round it was recorded in`);
    }
    index.set(`${e.page}\x00${e.kind}\x00${compact(e.text)}`, e);
  }
  return { entries, index };
}

// One page: CAPTURE ⇄ MODEL (with the render as the fabrication witness).
//
// The unit of comparison is a capture anchor and the model fact that reproduces its words.
// When the capture made a text a LINK (it has a real href) and the model carries that same
// text as a FACT, the node holding the fact must carry a target (`_action.to`, the existing
// mechanism) — or the difference must be declared with a written reason. That is the user's
// U-01/U-03/U-04 class stated as a test: the source said "link", the model said "word".
//
// Why the model, not a text run: a renderer emits each fact as its own element, so
// "the words appear somewhere inside <a>" is satisfied by an unrelated link and proves
// nothing; matching runs verbatim instead flagged promo prices that the source's card
// anchor happens to contain (829 findings on `taobao-com/home` alone — noise that would bury
// the real ones). The model node is the unit that owns the fact, so it is the unit judged.
//
// The rendered artifact is still read, for the opposite direction: a link drawn to a domain
// the capture never links to is a FABRICATED target (F-025 forbids constructing a URL).
export function checkPage(page, model, html, domHtml, baseUrl = '', allow = loadAllow()) {
  const anchors = sourceAnchors(domHtml, baseUrl);
  const realKey = new Map();       // compact anchor text -> Set(normalized hrefs)
  const noTarget = new Map();      // compact anchor text -> raw href (javascript:/#/empty)
  for (const a of anchors) {
    const k = compact(a.text);
    if (!k) continue;
    if (a.real) { if (!realKey.has(k)) realKey.set(k, new Set()); realKey.get(k).add(a.norm); }
    else if (!noTarget.has(k)) noTarget.set(k, a.href);
  }
  const domainOf = (h) => {
    const m = /^(?:https?:)?\/\/([^/]+)/i.exec(String(h));
    if (!m) return '';
    const parts = m[1].toLowerCase().split(':')[0].split('.');
    return parts.length >= 2 ? parts.slice(-2).join('.') : m[1].toLowerCase();
  };
  const srcDomains = new Set(anchors.filter((a) => a.real).map((a) => domainOf(a.norm)).filter(Boolean));

  const boundActions = new Map();
  const bind = (node) => {
    for (const table of namedChildEntries(node)) {
      const pair = tableLinkPair(node, table.node);
      if (!pair) continue;
      for (const inventory of pair.inventory._lines) {
        const self = inventory._items.find((a) => labelTextOf(a) === labelTextOf(inventory));
        if (self) boundActions.set(inventory, self._action);
      }
    }
    for (const c of childrenOf(node)) bind(c.node);
  };
  bind(model);
  const findings = [], declared = [], ownership = [];
  const oracle = ownerOracle(model, html, domHtml, baseUrl);
  const runs = renderRuns(html);
  let factsToLink = 0, linked = 0, modelFactsTotal = 0;
  const visit = (node, p) => {
    if (Array.isArray(node)) { node.forEach((x, i) => visit(x, `${p}[${i}]`)); return; }
    if (!node || typeof node !== 'object') return;
    const action = node._action ?? boundActions.get(node);
    const has = Boolean(action && typeof action.to === 'string' && action.to);
    const seen = new Set();
    for (const [k, v] of Object.entries(node)) {
      if (!k.startsWith('_') || isReservedKey(k)) continue;
      const t = v && typeof v === 'object' && !Array.isArray(v) ? v.text : undefined;
      if (typeof t !== 'string' || !t) continue;
      const ck = compact(t);
      if (!ck || !realKey.has(ck) || ck.length < TEXT_MIN) continue;
      if (seen.has(ck)) continue;
      seen.add(ck);
      modelFactsTotal++;
      factsToLink++;
      const structural = !boundActions.has(node) ? oracle.fact(node, t, [action, ...namedChildEntries(node).map(c => c.node._action)]) : null;
      if (structural) ownership.push({path: `${p}.${k}`, text:t, ...structural});
      if (structural?.status === 'owned-exact-action' || structural?.status === 'plain-context-fact') { linked++; continue; }
      const expected = structural?.expected.length ? new Set(structural.expected) : realKey.get(ck);
      const target = has ? normalizeHref(action.to, baseUrl) : null;
      const rendered = runs.some((r) => compact(r.text) === ck && r.href !== null
        && normalizeHref(r.href, baseUrl) === target);
      if (!structural && has && expected.has(target) && rendered) { linked++; continue; }
      const kind = has && !expected.has(target) ? 'wrong-target' : 'anchor-dropped';
      const f = { kind, text: t, path: `${p}.${k}`, ...(has ? { href: action.to } : {}), expect: [...expected] };
      const hit = allow.index.get(`${page}\x00${kind}\x00${ck}`);
      if (hit) declared.push({ ...f, reason: hit.reason, round: hit.round }); else findings.push(f);
    }
    const association = p && !boundActions.has(node) ? oracle.action(node) : null;
    if (association) {
      ownership.push({path: `${p}._action`, text: action?.label ?? labelTextOf(node), ...association});
      if (association.status !== 'owned-exact-action' && !findings.some(f => f.path?.startsWith(p + '._'))) {
        const f={kind: association.expected.includes(normalizeHref(action?.to,baseUrl))?'anchor-dropped':'wrong-target',path:`${p}._action`,text:action?.label??labelTextOf(node),href:action?.to,expect:association.expected};
        const hit=allow.index.get(`${page}\x00${f.kind}\x00${compact(f.text)}`);
        if(hit)declared.push({...f,reason:hit.reason,round:hit.round});else findings.push(f);
      }
    }
    for (const c of childrenOf(node)) visit(c.node, p ? `${p}.${c.key}` : c.key);
  };
  visit(model, '');

  let links = 0;
  for (const r of runs) {
    if (r.href === null) continue;
    links++;
    const norm = normalizeHref(r.href, baseUrl);
    if (!norm || r.href.startsWith('#') && oracle.allRender.some(a => a.attrs.href === r.href) && /\bid\s*=/.test(html) && oracle.render && (() => {
      const find = n => n.attrs.id === decodeEntities(r.href.slice(1)) || n.children.some(find); return find(oracle.render);
    })()) continue; // A generated in-page reference must resolve to an actual owning element.
    const d = domainOf(norm);
    const sourceTargets = realKey.get(compact(r.text));
    const contextual = ownership.some(o => o.status === 'owned-exact-action' && o.expected.includes(norm)
      && oracle.allRender.some(a => normalizeHref(a.attrs.href, baseUrl) === norm && compact(a.text).includes(compact(r.text))
        && o.renderOwners.some(owner => a.address.startsWith(owner + '/') || a.address === owner)));
    if (contextual || (sourceTargets ? sourceTargets.has(norm) : oracle.allSource.some(a => a.attrs.href && !/^javascript:/i.test(a.attrs.href) && normalizeHref(a.attrs.href, baseUrl) === norm))) continue;
    const f = { kind: 'wrong-target', text: r.text, href: r.href, expect: [] };
    const hit = allow.index.get(`${page}\x00wrong-target\x00${compact(r.text)}`);
    if (hit) declared.push({ ...f, reason: hit.reason, round: hit.round }); else findings.push(f);
  }
  return {
    page, anchors: anchors.length, anchorsWithTarget: anchors.filter((a) => a.real).length,
    anchorsWithoutTarget: anchors.filter((a) => !a.real).length,
    anchorsCarried: realKey.size, factsToLink, linked, links, findings, declared, ownership,
  };
}

export function run(rows, { root = '.', allow = loadAllow(path.join(root, 'm1/eval/link-coverage-allow.json')) } = {}) {
  const pages = [];
  for (const r of rows) {
    const htmlPath = path.join(root, 'm1/curated/renders', `${r.k.replace(/\//g, '-')}.html`);
    const corpusDir = path.join(root, 'corpus', r.k);
    if (!fs.existsSync(htmlPath) || !fs.existsSync(path.join(corpusDir, 'dom.html'))) { pages.push({ page: r.k, error: 'no render or no capture' }); continue; }
    const modelPath = path.join(root, 'm1/curated', `${r.k}.json`);
    if (!fs.existsSync(modelPath)) { pages.push({ page: r.k, error: 'no curated model' }); continue; }
    pages.push(checkPage(r.k, JSON.parse(fs.readFileSync(modelPath, 'utf8')), fs.readFileSync(htmlPath, 'utf8'), fs.readFileSync(path.join(corpusDir, 'dom.html'), 'utf8'), baseUrlOf(corpusDir), allow));
  }
  const agg = pages.reduce((a, p) => {
    if (p.error) return a;
    a.anchors += p.anchors; a.anchorsWithTarget += p.anchorsWithTarget; a.anchorsWithoutTarget += p.anchorsWithoutTarget;
    a.scanned += p.factsToLink; a.mapped += p.linked;
    a.findings += p.findings.length; a.declared += p.declared.length;
    return a;
  }, { pages: pages.length, anchors: 0, anchorsWithTarget: 0, anchorsWithoutTarget: 0, scanned: 0, mapped: 0, findings: 0, declared: 0 });
  return { agg, pages, allowEntries: allow.entries.length, ok: pages.every((p) => !p.error) && agg.findings === 0 };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const onlyArg = args.find((a) => a.startsWith('--only'));
  const only = onlyArg ? (onlyArg.includes('=') ? onlyArg.split('=')[1] : args[args.indexOf(onlyArg) + 1]).split(',').map((s) => s.trim()).filter(Boolean) : null;
  const scale = JSON.parse(fs.readFileSync('m1/eval/m3-scale.json', 'utf8')).filter((x) => x.tier === 'exemplar');
  const rows = only ? scale.filter((s) => only.includes(s.k)) : scale;
  const res = run(rows);
  if (json) { console.log(JSON.stringify(res, null, 2)); process.exit(res.ok ? 0 : 1); }
  for (const p of res.pages) {
    if (p.error) { console.log(`ERROR ${p.page}: ${p.error}`); continue; }
    if (!p.findings.length && !p.declared.length) continue;
    console.log(`${p.findings.length ? '✗' : '·'} ${p.page}  源站锚点 ${p.anchors}（有目标 ${p.anchorsWithTarget}）| 模型复现锚点事实 ${p.factsToLink} | 已有目标 ${p.linked}`);
    for (const f of p.findings) console.log(`   ✗ [${f.kind}] "${f.text.slice(0, 60)}"  ${f.path ?? ''}${f.href ? ` → ${f.href.slice(0, 80)}` : ''}${f.expect?.length ? `  源站目标: ${f.expect[0].slice(0, 80)}` : ''}`);
    for (const d of p.declared) console.log(`   ✓ 白名单(${d.round}) "${d.text.slice(0, 60)}" — ${d.reason}`);
  }
  const { agg } = res;
  console.log(`\n[链接覆盖] 页面 ${agg.pages} | 源站锚点 ${agg.anchors}（有目标 ${agg.anchorsWithTarget} / 源站本身无目标 ${agg.anchorsWithoutTarget}）| 模型复现的锚点事实 ${agg.scanned} | 已有目标 ${agg.mapped} | 未声明差额 ${agg.findings} | 声明 ${agg.declared}`);
  console.log(res.ok ? '[链接覆盖] 通过' : `[链接覆盖] 失败 ${agg.findings} 条未声明差额`);
  process.exit(res.ok ? 0 : 1);
}
