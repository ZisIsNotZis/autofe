// M2 deterministic evaluation (design-basis §7 layer 1).
// For one model + its source-page capture + rendered HTML:
//   1. fact fidelity   — every typed fact value in the model appears in the render
//   2. storyline rank  — Kendall tau between our storyline order and the source
//                        page's own heading order (layout-derived, used as a
//                        FEATURE only; the fidelity oracle stays the model, §7)
// Usage: node m1/eval/metrics.mjs <model.json> <render.html> [sourceDir]
import fs from 'node:fs';
import { walk, childrenOf, factsOf, valueTypeOf, parseExpr, evalExpr, scopeFor } from '../model-lib.mjs';

const norm = (s) => String(s).toLowerCase().replace(/[\s\p{P}]+/gu, '');

function suppressedNodes(model, ctxValues = {}) {
  const out = new Set();
  (function rec(n, chain) {
    if (out.has(n)) return;
    const scope = { ...ctxValues, ...scopeFor([...chain, n]) };
    let dead = false;
    if (typeof n._when === 'string') { const a = parseExpr(n._when); if (a.ok && !evalExpr(a, scope)) dead = true; }
    if (dead) { walk(n, (x) => out.add(x)); return; }
    for (const c of childrenOf(n)) rec(c.node, [...chain, n]);
  })(model, []);
  return out;
}
function factValues(model, dead) {
  const out = [];
  walk(model, (n, p) => {
    if (dead.has(n)) return;
    for (const f of factsOf(n)) {
      const v = f.value;
      const t = valueTypeOf(v);
      if (t === 'text' || t === 'date') out.push({ path: `${p}.${f.key}`, text: v[t] });
      else if (t === 'money') out.push({ path: `${p}.${f.key}`, text: String(v.money) });
      else if (t === 'num') out.push({ path: `${p}._fields?${f.key}`, text: String(v.num), skip: f.key.startsWith('_') === false && !n._fields?.[f.key.slice(1)] });
      else if (t === 'list') v.list.forEach((e, i) => { const tt = valueTypeOf(e); if (tt === 'text') out.push({ path: `${p}.${f.key}[${i}]`, text: e.text }); });
    }
    if (n._fields) for (const [k, v] of Object.entries(n._fields)) {
      const t = valueTypeOf(v);
      if (t === 'text' || t === 'date') out.push({ path: `${p}._fields.${k}`, text: v[t] });
      else if (t === 'num') out.push({ path: `${p}._fields.${k}`, text: String(v.num) });
    }
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
  const H = norm(html);
  const dead = suppressedNodes(model);
  const facts = factValues(model, dead);
  const missing = facts.filter((f) => !H.includes(norm(f.text))).map((f) => `${f.path} := "${f.text}"`);
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
