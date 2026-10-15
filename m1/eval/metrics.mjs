// M2 deterministic evaluation (design-basis §7 layer 1).
// For one model + its source-page capture + rendered HTML:
//   1. fact fidelity   — every typed fact value in the model appears in the render
//   2. storyline rank  — Kendall tau between our storyline order and the source
//                        page's own heading order (layout-derived, used as a
//                        FEATURE only; the fidelity oracle stays the model, §7)
// Usage: node m1/eval/metrics.mjs <model.json> <render.html> [sourceDir]
import fs from 'node:fs';
import { walk, childrenOf, factsOf, valueTypeOf, parseExpr, evalExpr, scopeFor } from '../model-lib.mjs';
import { pageText } from '../axis.mjs';  // visible-text extraction is a shared, target-neutral utility

// F-054 — normalization deletes whitespace and punctuation, so a plain
// `hay.includes(needle)` accepts a value that only occurs *inside a longer
// token* (`"0"` matched `2026`, `10.5`, `1,000`), which can hide a genuinely
// unrendered short number. `indexNorm` keeps the historical normalization and
// adds a map from each kept character back to its offset in the raw HTML, so a
// hit can be rejected when the raw characters next to it continue the same
// token (see `isRendered`). Rubric: `m1/eval/rubric.md` "已渲染" 判定.
const ENTITIES = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
function indexNorm(source) {
  const raw = String(source);
  const text = [], start = [], end = [];
  for (let i = 0; i < raw.length; i++) {
    let ch = raw[i].toLowerCase(), span = 1;
    if (ch === '&') {
      const m = /^&(amp|quot|apos|lt|gt|nbsp);/.exec(raw.slice(i).toLowerCase());
      if (m) { ch = ENTITIES[m[1]]; span = m[0].length; }
    }
    // `<`/`>` are the visible-text tag placeholder `<>` (axis.pageText): drop them from the
    // normalized text so a value inside an inline element (e.g. a body link's label) is still
    // found, while `continuesLeft/Right` keep seeing the raw placeholder as a token boundary.
    if (!/[\s\p{P}<>]/u.test(ch)) { text.push(ch); start.push(i); end.push(i + span); }
    i += span - 1;
  }
  return { raw, text: text.join(''), start, end };
}
const norm = (s) => indexNorm(s).text;

const DIGIT = /[0-9]/;
const DECIMAL = /[.,]/;
const LETTER = /\p{L}/u;
// A neighbouring character continues the token when it extends the matched
// edge the same way: after/before a digit a digit (or a ./, that itself sits
// next to a digit) continues a *number*; after/before a non-digit a letter
// continues a *word*. Nothing else counts — whitespace, tags, `$`, `%`, `°`,
// CJK unit words (`870人`) and the value's own trailing punctuation (`… M5.`)
// all delimit.
function continuesLeft(raw, at, numericEdge) {
  const c = raw[at - 1];
  if (c === undefined) return false;
  if (!numericEdge) return LETTER.test(c);
  return DIGIT.test(c) || (DECIMAL.test(c) && DIGIT.test(raw[at - 2] ?? ''));
}
function continuesRight(raw, at, numericEdge) {
  const c = raw[at];
  if (c === undefined) return false;
  if (!numericEdge) return LETTER.test(c);
  return DIGIT.test(c) || (DECIMAL.test(c) && DIGIT.test(raw[at + 1] ?? ''));
}
// A fact counts as rendered when at least one occurrence of its normalized text
// is delimited on both sides. The value's own edge decides the continuation
// class, so multi-word values keep the old substring behaviour (`"Pro further."`
// in `…>Pro further.<…` still matches across the tag-free span).
function isRendered(hay, value) {
  const needle = norm(value);
  if (!needle) return true;
  const lNum = DIGIT.test(needle[0]), rNum = DIGIT.test(needle[needle.length - 1]);
  for (let i = hay.text.indexOf(needle); i >= 0; i = hay.text.indexOf(needle, i + 1)) {
    const before = hay.start[i], after = hay.end[i + needle.length - 1];
    if (!continuesLeft(hay.raw, before, lNum) && !continuesRight(hay.raw, after, rNum)) return true;
  }
  return false;
}

// What a fact may be certified by: the page's *visible text*. `pageText` (style/script
// bodies and tag attributes removed; only well-formed tags stripped, so a fact whose
// own text contains `<`/`>` is not erased) is the shared utility from ../axis.mjs, so
// the metric caliber exists once. Each tag collapses to `<>` so tags still delimit
// tokens for `isRendered` (adjacent text nodes stay separate).

export function suppressedNodes(model, ctxValues = {}) {
  const out = new Set();
  (function rec(n, chain) {
    if (out.has(n)) return;
    const scope = { ...ctxValues, ...scopeFor([...chain, n], ctxValues) };
    let dead = false;
    if (typeof n._when === 'string') { const a = parseExpr(n._when); if (a.ok && !evalExpr(a, scope)) dead = true; }
    if (dead) { walk(n, (x) => out.add(x)); return; }
    for (const c of childrenOf(n)) rec(c.node, [...chain, n]);
  })(model, []);
  return out;
}
// One typed value can contribute several expected fragments (a list contributes
// one per element). Role facts and `_fields` entries go through the same walk so
// no value type can silently fall out of the fidelity denominator (F-052: a
// `{money}`/`{list}` under `_fields` used to be invisible). `_fields` keys are
// disjoint from role keys in the corpus, so nothing is counted twice.
export function pushFact(out, path, value) {
  const t = valueTypeOf(value);
  if (t === 'text' || t === 'date') out.push({ path, type: t, text: value[t] });
  else if (t === 'money') out.push({ path, type: 'money', text: String(value.money) });
  else if (t === 'num') out.push({ path, type: 'num', text: String(value.num) });
  else if (t === 'list') value.list.forEach((e, i) => pushFact(out, `${path}[${i}]`, e));
}
// `type` is carried alongside each fragment so the capture-integrity gate
// (`capture-integrity.mjs`, F-078) can pick the right matching rule (numbers vs
// text vs date) without re-deriving the value type.
export function factValues(model, dead) {
  const out = [];
  walk(model, (n, p) => {
    if (dead.has(n)) return;
    for (const f of factsOf(n)) pushFact(out, `${p}.${f.key}`, f.value);
    for (const [k, v] of Object.entries(n._fields ?? {})) pushFact(out, `${p}._fields.${k}`, v);
  });
  return out;
}

function storylineTitles(model) {
  const out = [];
  walk(model, (n) => {
    for (const key of ['_lines', '_items']) {
      (n[key] ?? []).forEach((c) => {
        const t = c._title ?? c._name;
        if (t?.text) out.push(t.text);
      });
    }
  });
  return out;
}

function kendallTau(a, b) {
  if (a.length < 2) return null;
  let conc = 0, disc = 0;
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
    const sign = Math.sign(a[j] - a[i]) * Math.sign(b[j] - b[i]);
    if (sign > 0) conc++; else if (sign < 0) disc++;
  }
  return (conc - disc) / (conc + disc);
}

export function evaluate(model, renderHtml, sourceDir) {
  const html = fs.readFileSync(renderHtml, 'utf8');
  // Style/script bodies and attributes are not page content: `<td>0</td>` must
  // not be certified by `margin:0` in the stylesheet or by `class="depth-0"`.
  // Inline Markdown destinations are metadata, just like HTML href attributes.
  // Evaluate the visible label without interrupting its surrounding prose, and
  // never certify a fact solely because it occurs in the hidden destination.
  const visible = renderHtml.endsWith('.md') ? html.replace(/!?\[([^\]\n]*)\]\((?:\\.|[^)\n])*\)/g, '$1') : html;
  const H = indexNorm(pageText(visible));
  const dead = suppressedNodes(model);
  const facts = factValues(model, dead);
  const missing = facts.filter((f) => !isRendered(H, f.text)).map((f) => `${f.path} := "${f.text}"`);
  let suppressed = 0;
  walk(model, (n) => { if (dead.has(n)) suppressed += factsOf(n).length + Object.keys(n._fields ?? {}).length; });

  const res = {
    factsTotal: facts.length,
    factsRendered: facts.length - missing.length,
    factFidelity: facts.length ? +( (facts.length - missing.length) / facts.length ).toFixed(3) : 1,
    conditionSuppressedFacts: suppressed,
    missing,
  };

  if (sourceDir && fs.existsSync(`${sourceDir}/nodes.json`)) {
    const nodes = JSON.parse(fs.readFileSync(`${sourceDir}/nodes.json`, 'utf8'));
    const srcHeadings = [...new Set(nodes.filter((x) => x.role === 'heading').map((x) => norm(x.name)).filter(Boolean))];
    const titles = storylineTitles(model).map(norm);
    const pairs = [];
    titles.forEach((t, i) => {
      const hit = srcHeadings.findIndex((h) => h.includes(t) || t.includes(h));
      if (hit >= 0) pairs.push([i, hit]);
    });
    // dedupe: keep first occurrence per source heading
    const seen = new Set();
    const clean = pairs.filter(([, h]) => (seen.has(h) ? false : (seen.add(h), true)));
    res.storyline = {
      modelStorylines: titles.length,
      matchedToSource: clean.length,
      kendallTau: kendallTau(clean.map((p) => p[0]), clean.map((p) => p[1])),
    };
  }
  return res;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [model, render, sourceDir] = process.argv.slice(2);
  console.log(JSON.stringify(evaluate(JSON.parse(fs.readFileSync(model, 'utf8')), render, sourceDir), null, 2));
}
