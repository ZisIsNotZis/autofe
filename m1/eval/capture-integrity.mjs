// Capture-integrity gate (F-078, round 43) — the 9th gate.
//
// Why this exists: `metrics.mjs` certifies MODEL → RENDER ("every model fact appears
// in the rendered page"), and `source-coverage.mjs` warns ORIGINAL → RENDER for
// *unmodelled* content. Neither certifies MODEL → CAPTURE, so a curator could write
// a wrong number and stay green as long as the render agreed with the model. That is
// exactly how `aliyun-com/product-ecs` shipped prices `1238`/`1385` while the captured
// price lines read `￥1438.68/1年`/`￥3459.90/1年`, at fidelity 1.00. F-025 ("抓取即真相")
// had no gate. This is that gate: every model fact value must be traceable to text in
// `corpus/<page>/dom.html` or `corpus/<page>/nodes.json`.
//
// ── Normalization rule table (what "the same value" means) ──────────────────────
// Applied to BOTH the model value and the capture text before comparison:
//   R1 HTML entities      `&amp; &quot; &apos; &lt; &gt; &nbsp;` and numeric
//                         `&#39;`/`&#x27;`/`&#NNN;` decode to their character.
//   R2 full/half width    FULLWIDTH forms U+FF01..U+FF5E → ASCII (－0xFEE0); U+3000 → space.
//   R3 case               ASCII lowercased.
//   R4 whitespace/punct   whitespace, punctuation (`\p{P}`), symbols (`\p{S}`,
//                         incl. currency `￥ ¥ $ € £` and `+ % °`), invisible format
//                         characters (`\p{Cf}`: zero-width space/joiner, soft hyphen,
//                         BOM) and emoji variation selectors (U+FE00–FE0F) are dropped
//                         for text matching; a run of them never separates a match.
//                         (Source pages inject U+2060 WORD JOINER and U+FE0F into CJK/emoji
//                         runs; without R4 they made byte-equal text look different.)
//   R5 numbers            compared NUMERICALLY, not as strings: a value is matched
//                         when the capture contains a *whole* number token that parses
//                         to the same float. This covers `99` ⇄ `￥99.00`,
//                         `3459.9` ⇄ `3459.90`, thousands separators `1,438.68`,
//                         currency symbols/codes and `num`+unit splits (`2` ⇄ `2核2G`).
//                         A token boundary is the digit run itself, so `99` never
//                         matches inside `1990`.
//   R6 dates              `YYYY年M月D日` / `YYYY-M-D` / `YYYY/M/D` / `YYYY.M.D`
//                         normalize to the same 8-digit key (`2026-09-18` ⇄ `2026年09月18日`).
//
// ── Information threshold (anti-false-positive; short values do NOT participate) ──
//   T1 numbers (`num`/`money`): participate only when |value| >= 10. 0–9 and sub-10
//      decimals (`1`, `2`, `0.5`) also occur in margins, class names, counts and
//      ordinals, so matching them proves nothing. Excluded values are NOT counted as
//      scanned — the honest denominator is smaller, never padded.
//   T2 text/date: the compact form needs >= 2 characters AND at least one letter
//      (`\p{L}`, incl. CJK); a value with no letter at all (`"357"`, `"15%"`) is a number
//      in text clothing and is skipped. Latin/digit-only values need length >= 3
//      (`"AI"`/`"5G"` skipped; CJK counts double because 2 Han chars are informative
//      while 2 ASCII chars are not).
//
// ── Whitelist (declarative) ──────────────────────────────────────────────────────
// `m1/eval/capture-integrity-allow.json` holds the *legitimate conversions* — values
// that are derived/aggregated/re-formatted rather than lifted verbatim (totals,
// "共 N 条", installment copy, reformatted dates, screenshot-derived assets, …).
// EVERY entry must carry a `reason` and the `round` it was added; an entry without a
// reason is a load error. The entry count IS the honest count of facts we cannot
// trace — it is reported, never hidden. Real errors (a model value that contradicts
// the capture) must be FIXED in the model, never whitelisted; capture gaps (lazy-load
// / unrendered DOM) are collection TODOs, also never whitelisted.
//
// Usage:
//   node m1/eval/capture-integrity.mjs                 # all exemplar models via m3-scale.json
//   node m1/eval/capture-integrity.mjs --only a/b,c/d  # subset
//   node m1/eval/capture-integrity.mjs --json          # machine-readable report
//   node m1/eval/capture-integrity.mjs --model m1/curated/a/b.json --corpus corpus/a/b
// Exit 1 when any scanned value is neither matched nor whitelisted (gate fails).
import fs from 'node:fs';
import path from 'node:path';
import { pageText } from '../axis.mjs';
import { factValues, suppressedNodes } from './metrics.mjs';
import { iconProofs } from './icon-provenance.mjs';

// T1/T2 thresholds — see the rule table above.
export const NUM_MIN_ABS = 10;   // |num|/|money| must be >= 10 to participate
export const TEXT_MIN = 2;       // compact length floor for text/date
export const LATIN_MIN = 3;      // latin/digit-only text needs this many chars

const ENTITY = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
const NAMED = /^&(#x?[0-9a-f]+|[a-z]+);/i;

export function decodeEntities(s) {
  return String(s).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, g) => {
    if (g[0] === '#') {
      const cp = g[1].toLowerCase() === 'x' ? parseInt(g.slice(2), 16) : Number(g.slice(1));
      return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
    }
    return ENTITY[g.toLowerCase()] ?? m;
  });
}
const fullToHalf = (s) => String(s)
  .replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
  .replace(/\u3000/g, ' ');
const DROP = /[\s\p{P}\p{S}\p{Cf}\ufe00-\ufe0f]/u;
const compactOf = (s) => [...fullToHalf(decodeEntities(s)).toLowerCase()].filter((c) => !DROP.test(c)).join('');
const WIDE = /[\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/u;
const LETTER = /\p{L}/u;

// Does this fact carry enough information for a miss to mean something? (T1/T2)
export function participates(fact) {
  if (fact.type === 'num' || fact.type === 'money') {
    const n = Number(fact.text);
    return Number.isFinite(n) && Math.abs(n) >= NUM_MIN_ABS;
  }
  const c = compactOf(fact.text);
  if (c.length < TEXT_MIN || !LETTER.test(c)) return false;
  if (!WIDE.test(c) && c.length < LATIN_MIN) return false;
  return true;
}

// A capture haystack with the character→raw-offset map needed for "nearest snippet".
// Iteration is by CODE POINT (not UTF-16 unit): a surrogate pair must be dropped as the
// single symbol `🥇` it is — iterating raw units left two lone surrogates that `\p{S}`
// cannot match, so an emoji-bearing source string compared unequal to the same text with
// the emoji removed from the model value.
function compactIndex(source) {
  const raw = String(source);
  const text = [], start = [], end = [];
  let i = 0;
  while (i < raw.length) {
    let chunk, span;
    const m = raw[i] === '&' ? NAMED.exec(raw.slice(i)) : null;
    if (m) { chunk = decodeEntities(m[0]); span = m[0].length; }
    else { const cp = raw.codePointAt(i); chunk = String.fromCodePoint(cp); span = cp > 0xffff ? 2 : 1; }
    for (const c of fullToHalf(chunk).toLowerCase()) {
      if (DROP.test(c)) continue;
      text.push(c); start.push(i); end.push(i + span);
    }
    i += span;
  }
  return { raw, text: text.join(''), start, end };
}
// R5: whole-number tokens, parsed to the same canonical float string on both sides.
function numericTokens(source) {
  const s = fullToHalf(decodeEntities(source));
  const set = new Set();
  for (const m of s.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
    const n = Number(m[0].replace(/,/g, ''));
    if (Number.isFinite(n)) set.add(String(n));
  }
  return set;
}
// R6: every date form collapses to a YYYYMMDD key.
function dateKeys(source) {
  const s = fullToHalf(decodeEntities(source));
  const set = new Set();
  for (const m of s.matchAll(/(\d{4})\s*[年\-/.]\s*(\d{1,2})\s*[月\-/.]\s*(\d{1,2})\s*[日]?/g)) {
    set.add(`${m[1]}${m[2].padStart(2, '0')}${m[3].padStart(2, '0')}`);
  }
  return set;
}

export function loadHaystack(corpusDir) {
  const dom = fs.readFileSync(path.join(corpusDir, 'dom.html'), 'utf8');
  const nodes = JSON.parse(fs.readFileSync(path.join(corpusDir, 'nodes.json'), 'utf8'));
  const domText = pageText(dom);
  // Text-bearing attributes are captured content too: a page's `_summary` may be lifted
  // verbatim from `<meta name=description content=…>`, an item name from an `alt`/`title`,
  // a control from `aria-label`. Only text-bearing attribute names are admitted — never
  // `class`/`id`/`href`/`src`/`style`, which would let a styled husk certify a value.
  const attrText = [...dom.matchAll(/\b(alt|title|aria-label|content|placeholder|value)\s*=\s*"([^"]*)"/gi)].map((m) => m[2]).join('\n');
  const nodesText = nodes.map((n) => `${n.name ?? ''}\n${n.text ?? ''}`).join('\n');
  const nums = numericTokens(domText), dates = dateKeys(domText);
  for (const t of numericTokens(nodesText)) nums.add(t);
  for (const d of dateKeys(nodesText)) dates.add(d);
  const hay = { ...compactIndex(`${domText}\n${attrText}\n${nodesText}`), nums, dates };
  return hay;
}

export function matches(fact, hay) {
  if (fact.type === 'num' || fact.type === 'money') {
    const n = Number(fact.text);
    return Number.isFinite(n) && hay.nums.has(String(n));
  }
  if (fact.type === 'date') {
    const key = String(fact.text).replace(/\D/g, '');
    if (key.length === 8 && hay.dates.has(key)) return true;
  }
  const needle = compactOf(fact.text);
  return needle.length > 0 && hay.text.includes(needle);
}

// Closest capture fragment: longest-leading-substring search over the compact text,
// then a window around the raw offsets. (Only computed for misses, so cost is bounded.)
export function nearestSnippet(hay, value, width = 60) {
  const needle = compactOf(value);
  if (!needle) return '';
  const floor = Math.min(needle.length, 4);
  for (let L = needle.length; L >= floor; L--) {
    const idx = hay.text.indexOf(needle.slice(0, L));
    if (idx < 0) continue;
    const a = Math.max(0, hay.start[idx] - width);
    const b = Math.min(hay.raw.length, hay.end[idx + L - 1] + width);
    return hay.raw.slice(a, b).replace(/\s+/g, ' ').trim();
  }
  return '';
}

export function loadAllow(p = 'm1/eval/capture-integrity-allow.json') {
  if (!fs.existsSync(p)) return { entries: [], index: new Map() };
  const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
  const entries = doc.entries ?? [];
  const index = new Map();
  for (const [i, e] of entries.entries()) {
    const kind = e.kind ?? 'conversion';
    if (kind !== 'conversion' && kind !== 'capture-gap') {
      throw new Error(`capture-integrity-allow.json entries[${i}] kind must be 'conversion' or 'capture-gap'`);
    }
    if (typeof e.page !== 'string' || typeof e.value !== 'string' || typeof e.reason !== 'string' || !e.reason.trim()) {
      throw new Error(`capture-integrity-allow.json entries[${i}] must carry page, value and a non-empty reason`);
    }
    if (kind === 'capture-gap' && (typeof e.evidence !== 'string' || !e.evidence.trim())) {
      throw new Error(`capture-integrity-allow.json entries[${i}] is a capture-gap and must carry evidence`);
    }
    if (e.round === undefined || e.round === null || e.round === '') {
      throw new Error(`capture-integrity-allow.json entries[${i}] must carry the round it was recorded in`);
    }
    index.set(`${e.page}\x00${e.value}`, { ...e, kind });
  }
  return { entries, index };
}

// Check one curated model against its corpus. Returns the scanned/matched/unmatched
// split; unmatched values are partitioned into declared conversions, declared capture
// gaps (collection TODOs) and OPEN (gate-failing) items.
export function checkPage(page, model, corpusDir = `corpus/${page}`, allow = loadAllow()) {
  const hay = loadHaystack(corpusDir);
  const icons = iconProofs(page, model, corpusDir);
  const dead = suppressedNodes(model);
  const facts = factValues(model, dead);
  const scanned = [], unmatched = [], allowlisted = [], captureGaps = [];
  let total = 0;
  for (const f of facts) {
    total++;
    if (!participates(f)) continue;
    scanned.push(f.path);
    if (matches(f, hay) || icons.matched.some((p) => p.path === f.path && p.label === f.text)) continue;
    const key = `${page}\x00${f.text}`;
    const hit = allow.index?.get(key);
    if (hit && hit.kind === 'capture-gap') captureGaps.push({ path: f.path, value: f.text, type: f.type, reason: hit.reason, evidence: hit.evidence, round: hit.round });
    else if (hit) allowlisted.push({ path: f.path, value: f.text, type: f.type, reason: hit.reason, round: hit.round });
    else unmatched.push({ path: f.path, value: f.text, type: f.type, nearest: nearestSnippet(hay, f.text) });
  }
  return { page, factsTotal: total, scanned: scanned.length, unmatched, allowlisted, captureGaps, iconEvidence: icons.matched, provenanceErrors: icons.errors };
}

// Run the whole set of exemplar rows (default) or an explicit list.
export function run(rows, { root = '.', allow = loadAllow(path.join(root, 'm1/eval/capture-integrity-allow.json')) } = {}) {
  const pages = [];
  for (const r of rows) {
    const modelPath = path.join(root, 'm1/curated', `${r.k}.json`);
    if (!fs.existsSync(modelPath)) { pages.push({ page: r.k, error: 'no curated model' }); continue; }
    pages.push(checkPage(r.k, JSON.parse(fs.readFileSync(modelPath, 'utf8')), path.join(root, 'corpus', r.k), allow));
  }
  const agg = pages.reduce((a, p) => {
    if (p.error) return a;
    a.factsTotal += p.factsTotal; a.scanned += p.scanned;
    a.unmatched += p.unmatched.length; a.allowlisted += p.allowlisted.length; a.captureGaps += p.captureGaps.length;
    a.iconMatched += p.iconEvidence?.length ?? 0; a.provenanceErrors += p.provenanceErrors?.length ?? 0;
    return a;
  }, { pages: pages.length, factsTotal: 0, scanned: 0, unmatched: 0, allowlisted: 0, captureGaps: 0, iconMatched: 0, provenanceErrors: 0 });
  return { agg, pages, allowEntries: allow.entries.length, ok: pages.every((p) => !p.error && !(p.provenanceErrors ?? []).length) && agg.unmatched === 0 };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const onlyArg = args.find((a) => a.startsWith('--only'));
  const only = onlyArg ? (onlyArg.includes('=') ? onlyArg.split('=')[1] : args[args.indexOf(onlyArg) + 1]).split(',').map((s) => s.trim()).filter(Boolean) : null;
  const modelArg = args.includes('--model') ? args[args.indexOf('--model') + 1] : null;
  let rows;
  if (modelArg) {
    const m = JSON.parse(fs.readFileSync(modelArg, 'utf8'));
    const corpusDir = args.includes('--corpus') ? args[args.indexOf('--corpus') + 1] : `corpus/${path.dirname(modelArg).replace(/^m1\/curated\//, '')}/${path.basename(modelArg, '.json')}`;
    const res = { agg: {}, pages: [checkPage(modelArg, m, corpusDir)], allowEntries: 0, ok: false };
    res.agg.scanned = res.pages[0].scanned; res.agg.unmatched = res.pages[0].unmatched.length;
    res.agg.allowlisted = res.pages[0].allowlisted.length; res.agg.factsTotal = res.pages[0].factsTotal;
    res.ok = res.agg.unmatched === 0 && !res.pages[0].provenanceErrors.length;
    console.log(json ? JSON.stringify(res, null, 2) : JSON.stringify(res.pages[0], null, 2));
    process.exit(res.ok ? 0 : 1);
  }
  const scale = JSON.parse(fs.readFileSync('m1/eval/m3-scale.json', 'utf8')).filter((x) => x.tier === 'exemplar');
  rows = only ? scale.filter((s) => only.includes(s.k)) : scale;
  const res = run(rows);
  if (json) { console.log(JSON.stringify(res, null, 2)); process.exit(res.ok ? 0 : 1); }
  for (const p of res.pages) {
    if (p.error) { console.log(`ERROR ${p.page}: ${p.error}`); continue; }
    if (!p.unmatched.length && !p.allowlisted.length && !(p.captureGaps ?? []).length && !p.provenanceErrors?.length && !p.iconEvidence?.length) continue;
    for (const e of p.provenanceErrors ?? []) console.log(`   ✗ icon provenance: ${e.reason}`);
    for (const e of p.iconEvidence ?? []) console.log(`   ✓ source-bound icon: ${e.label} ${e.selector} local=${e.value} hash=${e.domSha256}`);
    console.log(`${p.unmatched.length ? '✗' : '·'} ${p.page}  扫描 ${p.scanned}/${p.factsTotal}`);
    for (const u of p.unmatched) console.log(`   ✗ [${u.type}] "${u.value}"  ${u.path}\n       最近: ${u.nearest.slice(0, 160) || '(无近似片段)'}`);
    for (const a of p.allowlisted) console.log(`   ✓ 白名单(转换) "${a.value}"  ${a.path}\n       理由(${a.round}): ${a.reason}`);
    for (const a of p.captureGaps ?? []) console.log(`   ⧗ 采集缺口 "${a.value}"  ${a.path}\n       理由(${a.round}): ${a.reason}\n       证据: ${a.evidence}`);
  }
  const { agg } = res;
  console.log(`\n[采集↔模型一致性] 页面 ${agg.pages} | 事实 ${agg.factsTotal} | 参与判定 ${agg.scanned} | 未命中 ${agg.unmatched} | 白名单(转换) ${agg.allowlisted} | 采集缺口 ${agg.captureGaps}（声明白名单共 ${res.allowEntries} 条）`);
  console.log(res.ok ? `[采集↔模型一致性] 通过（来源图标关联 ${agg.iconMatched}，关联错误 ${agg.provenanceErrors}）` : `[采集↔模型一致性] 失败 ${agg.unmatched} 个未命中值未在白名单；来源关联错误 ${agg.provenanceErrors}`);
  process.exit(res.ok ? 0 : 1);
}
