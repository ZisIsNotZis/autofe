// Quote-emphasis self-test (round 56, the 15th gate). THE CLAIM UNDER TEST: a source's
// SALIENT emphasis must survive into the model as `_quote` — bidirectionally (F-040):
//   → if the capture shows quote evidence (a `blockquote`, or a whole-paragraph <strong>
//     inside a <p>, per quote-evidence.mjs) and the model does not carry that text as
//     `_quote`, the emphasis was flattened to body prose ⇒ FAIL ("quote-dropped", U-13);
//   ← if the model carries a `_quote` whose text has NO capture evidence, the engine's
//     prominent quote form is drawn for an unbacked passage ⇒ FAIL ("quote-unsupported").
// Both directions are whitelistable in `m1/eval/quote-allow.json` with a written reason
// (e.g. an abridged `_quote` whose wording is a capture-integrity-declared conversion, or
// a gap explicitly left for a later round). An allow entry that suppresses nothing is
// itself a failure — declarations rot too.
//
// WHY A GATE: fidelity counts fact TEXT, so it is blind to emphasis being lost or invented
// (S-5 in the round-54 findings). The analyzer half is quote-evidence.mjs; this file pins
// it with fixtures A–E and then runs the corpus over all 42 exemplar pages.
// Usage: node m1/eval/quote-selftest.mjs   (exit 0 = all assertions pass)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { quoteEvidence } from './quote-evidence.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const ALLOW_FILE = path.join(here, 'quote-allow.json');
const norm = (s) => String(s ?? '').replace(/\s+/g, '').toLowerCase();

// Every `_quote` fact in a model, with its path (for naming findings).
export function collectQuotes(node, out = [], path = '') {
  if (Array.isArray(node)) { node.forEach((x, i) => collectQuotes(x, out, `${path}[${i}]`)); return out; }
  if (!node || typeof node !== 'object') return out;
  for (const [k, v] of Object.entries(node)) {
    if (k === '_quote') out.push({ path: `${path}._quote`, text: v && typeof v === 'object' ? v.text : v });
    else collectQuotes(v, out, `${path}.${k}`);
  }
  return out;
}

const declaredBy = (allow, k, kind, text) =>
  allow.find((a) => a.page === k && a.kind === kind && norm(text).startsWith(norm(a.text)));

// One page, both directions. `subtracted` also reports the RAW differences (before the
// whitelist) so the caller can verify which allow entries are actually doing work.
export function auditPage(k, model, evidence, allow) {
  const quotes = collectQuotes(model);
  const qTexts = new Set(quotes.map((q) => norm(q.text)));
  const evTexts = new Set(evidence.map((e) => norm(e.text)));
  const droppedAll = evidence.filter((e) => !qTexts.has(norm(e.text)));
  const unsupportedAll = quotes.filter((q) => !evTexts.has(norm(q.text)));
  const used = [];
  for (const e of droppedAll) { const a = declaredBy(allow, k, 'dropped', e.text); if (a) used.push(a); }
  for (const q of unsupportedAll) { const a = declaredBy(allow, k, 'unsupported', q.text); if (a) used.push(a); }
  return {
    dropped: droppedAll.filter((e) => !declaredBy(allow, k, 'dropped', e.text)),
    unsupported: unsupportedAll.filter((q) => !declaredBy(allow, k, 'unsupported', q.text)),
    droppedAll, unsupportedAll, used, quotes,
  };
}

async function main() {
  let bad = 0, assertions = 0;
  const check = (name, cond, detail = '') => {
    assertions++;
    if (cond) console.log(`ok   ${name}`);
    else { bad++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
  };
  const allow = fs.existsSync(ALLOW_FILE) ? JSON.parse(fs.readFileSync(ALLOW_FILE, 'utf8')).entries : [];
  const EV = [{ kind: 'blockquote', text: '开启废物清除计划。' }];
  const MODEL = { lead: { _quote: { text: '开启废物清除计划。' } } };

  // A. evidence carried as `_quote` ⇒ no finding.
  {
    const r = auditPage('demo-com/page', MODEL, EV, allow);
    check('A a captured blockquote carried as _quote produces no finding',
      r.dropped.length === 0 && r.unsupported.length === 0, JSON.stringify(r));
  }
  // B. FALSIFICATION (→): the same passage carried as plain `_summary` ⇒ quote-dropped.
  {
    const r = auditPage('demo-com/page', { lead: { _summary: { text: '开启废物清除计划。' } } }, EV, allow);
    check('B evidence flattened to a non-quote fact is reported', r.dropped.length === 1, JSON.stringify(r.dropped));
  }
  // C. FALSIFICATION (←): a `_quote` with no capture evidence ⇒ quote-unsupported.
  {
    const r = auditPage('demo-com/page', { lead: { _quote: { text: '抓取里没有这句话' } }, body: { _quote: { text: '开启废物清除计划。' } } }, EV, allow);
    check('C an unbacked _quote is reported', r.unsupported.length === 1 && norm(r.unsupported[0].text) === norm('抓取里没有这句话'), JSON.stringify(r.unsupported));
  }
  // D. a declared allow entry (with written reason) suppresses the finding.
  {
    const a2 = [...allow, { page: 'demo-com/page', kind: 'dropped', text: '开启废物清除计划', why: 'fixture' }];
    const r = auditPage('demo-com/page', { lead: { _summary: { text: '开启废物清除计划。' } } }, EV, a2);
    check('D a declared allow entry suppresses the finding', r.dropped.length === 0 && r.used.length === 1, JSON.stringify(r));
  }
  // E. an allow entry that suppresses nothing is stale and must be reported.
  {
    const stale = [{ page: 'demo-com/page', kind: 'dropped', text: '不存在的文本', why: '过期声明示例' }];
    const r = auditPage('demo-com/page', MODEL, EV, stale);
    check('E an allow entry that matches nothing is reported as stale', r.used.length === 0, JSON.stringify(r.used));
  }

  // ---- corpus: all 42 exemplar pages ------------------------------------------
  const scale = JSON.parse(fs.readFileSync(path.join(root, 'm1/eval/m3-scale.json'), 'utf8')).filter((x) => x.tier === 'exemplar');
  let evTotal = 0, qTotal = 0; const problems = [], usedEntries = new Set();
  for (const s of scale) {
    const f = path.join(root, 'm1/curated', `${s.k}.json`);
    if (!fs.existsSync(f)) continue;
    const model = JSON.parse(fs.readFileSync(f, 'utf8'));
    const quotes = collectQuotes(model);
    const { ev } = quoteEvidence(s.k);
    if (!ev?.length && !quotes.length) continue;
    evTotal += ev?.length ?? 0; qTotal += quotes.length;
    const r = auditPage(s.k, model, ev ?? [], allow);
    for (const d of r.dropped) problems.push({ k: s.k, kind: 'dropped', text: d.text });
    for (const u of r.unsupported) problems.push({ k: s.k, kind: 'unsupported', text: String(u.text), path: u.path });
    for (const a of r.used) usedEntries.add(a);
  }
  const stale = allow.filter((a) => !usedEntries.has(a));
  console.log(`[强调保真] 页面 ${scale.length} | 抓取引用证据 ${evTotal} | 模型 _quote ${qTotal} | 双向未声明差额 ${problems.length} | 白名单命中 ${usedEntries.size}/${allow.length}`);
  for (const p of problems.slice(0, 20)) console.log(`   ✗ ${p.k} — ${p.kind === 'dropped' ? '证据未以 _quote 承载' : '_quote 无抓取证据'}: ${JSON.stringify(String(p.text).slice(0, 60))}`);
  if (problems.length > 20) console.log(`   … 另 ${problems.length - 20} 条`);
  for (const a of stale) console.log(`   ✗ 过期白名单（压不住任何差额）: ${a.page} ${a.kind} ${JSON.stringify(String(a.text).slice(0, 40))}`);
  check('F corpus quote emphasis is bidirectionally carried or declared in writing', problems.length === 0 && stale.length === 0, `${problems.length} problems, ${stale.length} stale allow entries`);
  console.log(bad ? `强调保真自测: ${bad} 项失败` : '强调保真自测: 全部通过');
  process.exit(bad ? 1 : 0);
}
if (import.meta.url === `file://${process.argv[1]}`) await main();
