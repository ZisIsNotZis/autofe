// Label-language self-test (round 56, the 14th gate). THE CLAIM UNDER TEST: rendered
// visible text must never leak INTERNAL vocabulary — the engine's action verbs and enum
// names (navigate / open / submit / select / toggle / operate / text / date / …) are
// semantics, never copy (F-022/F-029: "verb is internal semantics, never visible copy").
// English the SOURCE ITSELF shows is not a leak: a visible run whose full text appears in
// the page capture's visible text is exempt as source-original, and each exemption is
// printed with that provenance (this is the gate's written record). Anything else must be
// declared in `m1/eval/label-language-allow.json` with a written reason or the gate fails.
//
// WHY A GATE: fidelity counts fact text, coverage counts source presence — neither can see
// a label that was generated from an internal name instead of human copy. U-16/U-17 (the
// user's round-54 finding) were exactly such English fragments on Chinese pages.
//
// It is falsifiable (F-040): fixtures A–E pin both directions — an injected internal verb
// in a fixture render MUST be reported; the same verb inside a capture-verbatim run MUST
// NOT be; a declared allow entry MUST pass; word boundaries MUST NOT fire on "operator"/
// "submitting"/"operating". The corpus half then runs the gate over all 42 exemplar pages.
// Usage: node m1/eval/label-language-selftest.mjs   (exit 0 = all assertions pass)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const ALLOW_FILE = path.join(here, 'label-language-allow.json');

// ---- vocabulary: every internal name the engine owns ------------------------
// Collected from vocab.json itself (verbs list, value types, role names): if the engine
// renames or extends its vocabulary the gate follows automatically.
export function internalTerms(vocab) {
  const terms = new Set();
  const addWord = (w) => { if (/^[a-z][a-z-]*$/.test(w)) terms.add(w); };
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') for (const [k, vv] of Object.entries(v)) { if (!k.startsWith('$') && k !== 'version') addWord(k.replace(/^_/, '')); walk(vv); }
    else if (typeof v === 'string') addWord(v);
  };
  walk(vocab);
  return [...terms].sort();
}

// ---- visible text runs of a rendered HTML page -------------------------------
// Everything inside tags (incl. data-verb attributes) and <style> blocks never reaches the
// reader, so it does not participate. <script> text is KEPT: this extractor is also used on
// the capture's dom.html, where Apple embeds the page's marketing prose in inline JSON.
export function visibleRuns(html) {
  return String(html)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, ' ')
    .split(/<[^>]+>/)
    .map((s) => s.replace(/&[a-zA-Z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((s) => s.length >= 2);
}
// Capture and model may differ in punctuation that is pure typography (Apple uses the
// non-breaking hyphen U+2011; smart quotes; ellipsis). Fold to the ASCII form on BOTH sides
// before matching — the same normalizations capture-integrity declares for values.
const fold = (s) => String(s || '')
  .replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[‐‑‒–—−]/g, '-').replace(/…/g, '...');
const norm = (s) => fold(s).replace(/\s+/g, ' ').trim().toLowerCase();
// Occurrence matching compares a whitespace-form window against a pool of TRIMMED chunks
// joined without separators, so spacing/punctuation layout cannot be assumed faithful:
// a renderer may join adjacent source items with " · ", the capture may split a sentence
// across elements (", and" arriving as its own chunk), and the model may add a trailing
// period. In the window regex, spaces are layout (\s*), list separators are optional
// layout, and punctuation allows flexible adjacent spacing — but WORD SEQUENCE and the
// words themselves must be verbatim. If the window is empty (nothing to vouch), no match.
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function winRx(win) {
  if (!win) return null;
  let rx = '';
  for (const ch of win) {
    if (/\s/.test(ch)) rx += '\\s*';
    else if ('·•|'.includes(ch)) rx += '[\\s]*[·•|]?[\\s]*';
    else if (',.;:!？？，。；：！？、：'.includes(ch)) rx += `[\\s]*${esc(ch)}[\\s]*`;
    else rx += esc(ch);
  }
  return new RegExp(rx, 'i');
}

// ---- one page: leak = internal term in a visible run with no provenance -------
// kind: 'leak' (must be fixed or declared) | 'capture' (source-original) | 'allow' (declared)
export function checkRuns(runs, captureTexts, allowEntries, page, conversions = []) {
  // Three provenance pools, each with written provenance:
  // 1. capture visible text (nodes.json truncated-to-64 prefixes + raw dom.html with script
  //    prose included) in canonical form; a term occurrence counts as source-original iff a
  //    ~80-char window around it (canonical) appears in the pool.
  // 2. allow entries (label-language-allow.json, per page+phrase, written reason).
  // 3. capture-integrity-allow.json declared conversions — text the capture gate ALREADY
  //    adjudicated as a non-verbatim conversion; the term rides on that written reason.
  const cap = norm((captureTexts || []).filter(Boolean).join(''));
  const findings = [], exempt = [];
  for (const run of runs) {
    const n = norm(run);
    for (const term of allowEntries._terms) {
      const m = new RegExp(`\\b${term}\\b`, 'i').exec(n);
      if (!m) continue;
      // Provenance is judged at the OCCURRENCE, not the run: a ±30-char window around the
      // term must be found in the capture pool (nodes.json truncates texts, dom.html is
      // complete; the window regex absorbs spacing/separator/punctuation layout drift).
      const win = n.slice(Math.max(0, m.index - 30), m.index + term.length + 30).replace(/[.。，,;；!！?？:：]+$/, '');
      const declared = allowEntries.find((a) => a.page === page && n.includes(norm(a.match)));
      if (declared) { exempt.push({ term, run, kind: 'allow', why: declared.why }); continue; }
      const rx = winRx(win);
      if (rx && rx.test(cap)) { exempt.push({ term, run, kind: 'capture' }); continue; }
      const conv = conversions.find((c) => norm(c.value) === n || (n.length >= 30 && norm(c.value).includes(n.slice(0, 60))));
      if (conv) { exempt.push({ term, run, kind: 'conversion', why: `采集一致性已声明转换：${conv.reason}` }); continue; }
      findings.push({ term, run });
    }
  }
  return { findings, exempt };
}

async function main() {
  let bad = 0, assertions = 0;
  const check = (name, cond, detail = '') => {
    assertions++;
    if (cond) console.log(`ok   ${name}`);
    else { bad++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
  };

  const vocab = JSON.parse(fs.readFileSync(path.join(root, 'm1/vocab.json'), 'utf8'));
  const terms = internalTerms(vocab);
  const withTerms = (entries) => { entries._terms = terms; return entries; };
  const allow = fs.existsSync(ALLOW_FILE) ? JSON.parse(fs.readFileSync(ALLOW_FILE, 'utf8')).entries ?? [] : [];
  const emptyAllow = withTerms([]);

  // ---- fixtures: both refusal directions, on the SAME checker the corpus uses ----
  // A. an injected internal verb with no capture provenance MUST be reported.
  {
    const r = checkRuns(visibleRuns('<p>Click <b>Toggle</b> to switch.</p>'), ['无关的中文文本'], emptyAllow, 'demo-com/page');
    check('A an injected internal verb is reported', r.findings.some((f) => f.term === 'toggle'), JSON.stringify(r.findings));
  }
  // B. the same run verbatim in the capture is source-original: exempt, recorded.
  {
    const r = checkRuns(visibleRuns('<p>Click <b>Toggle</b> to switch.</p>'), ['请点击 Toggle to switch 继续'], emptyAllow, 'demo-com/page');
    check('B a capture-verbatim run is exempt as source-original', r.findings.length === 0 && r.exempt.some((e) => e.kind === 'capture' && e.term === 'toggle'), JSON.stringify(r));
  }
  // C. a declared allow entry (with written reason) passes.
  {
    const r = checkRuns(visibleRuns('<p>Operate the crane.</p>'), [], withTerms([{ page: 'demo-com/page', match: 'Operate the crane', why: '源站按钮原文（书面理由示例）' }]), 'demo-com/page');
    check('C a declared allow entry passes', r.findings.length === 0 && r.exempt.some((e) => e.kind === 'allow'), JSON.stringify(r));
  }
  // D. word boundaries: longer English words containing a term are NOT leaks.
  {
    const r = checkRuns(visibleRuns('<p>The operator guide and submitting forms while operating.</p>'), [], emptyAllow, 'demo-com/page');
    check('D word boundaries do not fire on operator/submitting/operating', r.findings.length === 0, JSON.stringify(r.findings));
  }
  // E. enum names are internal too: a bare role name with no provenance is reported.
  {
    const r = checkRuns(visibleRuns('<p>summary</p>'), ['别的文字'], emptyAllow, 'demo-com/page');
    check('E a bare enum/role name is reported', r.findings.some((f) => f.term === 'summary'), JSON.stringify(r.findings));
  }

  // ---- corpus: all 42 exemplar pages, renders vs capture -----------------------
  const scale = JSON.parse(fs.readFileSync(path.join(root, 'm1/eval/m3-scale.json'), 'utf8')).filter((x) => x.tier === 'exemplar');
  const convAll = JSON.parse(fs.readFileSync(path.join(root, 'm1/eval/capture-integrity-allow.json'), 'utf8')).entries ?? [];
  let runsTotal = 0, capTotal = 0, allowTotal = 0, convTotal = 0; const leaks = []; const byPage = {};
  for (const s of scale) {
    const dash = s.k.replace(/\//g, '-');
    const htmlFile = path.join(root, 'm1/curated/renders', dash + '.html');
    const nodesFile = path.join(root, 'corpus', s.k, 'nodes.json');
    if (!fs.existsSync(htmlFile) || !fs.existsSync(nodesFile)) continue;
    const runs = visibleRuns(fs.readFileSync(htmlFile, 'utf8'));
    // Provenance pools: nodes.json visible texts (truncated to ~64 chars/node) PLUS the raw
    // dom.html visible text incl. inline-script prose (the same source of truth the
    // link-coverage gate uses).
    const cap = JSON.parse(fs.readFileSync(nodesFile, 'utf8')).filter((n) => n.visible).map((n) => n.text || '');
    const dom = visibleRuns(fs.readFileSync(path.join(root, 'corpus', s.k, 'dom.html'), 'utf8'));
    const conversions = convAll.filter((c) => c.page === s.k && c.kind === 'conversion');
    const r = checkRuns(runs, [...cap, ...dom], withTerms(allow), s.k, conversions);
    runsTotal += runs.length; capTotal += r.exempt.filter((e) => e.kind === 'capture').length;
    allowTotal += r.exempt.filter((e) => e.kind === 'allow').length; convTotal += r.exempt.filter((e) => e.kind === 'conversion').length;
    if (r.exempt.length) byPage[s.k] = r.exempt.length;
    for (const f of r.findings) leaks.push({ k: s.k, ...f });
  }
  console.log(`[可见英文标签] 页面 ${scale.length} | 可见文本段 ${runsTotal} | 内部词命中（源站原文豁免 ${capTotal} / 白名单声明 ${allowTotal} / 已声明转换 ${convTotal}）| 泄漏 ${leaks.length}`);
  const pages = Object.keys(byPage);
  if (pages.length) console.log(`[可见英文标签] 源站原文豁免分布: ${pages.map((p) => `${p} ×${byPage[p]}`).join(' · ')}`);
  for (const f of leaks.slice(0, 20)) console.log(`   ✗ ${f.k} — "${f.run.slice(0, 70)}" 含内部词 ${f.term}`);
  if (leaks.length > 20) console.log(`   … 另 ${leaks.length - 20} 条`);
  check('F corpus has no undeclared internal vocabulary in visible text', leaks.length === 0, `${leaks.length} leaks`);
  console.log(bad ? `可见英文标签自测: ${bad} 项失败` : '可见英文标签自测: 全部通过');
  process.exit(bad ? 1 : 0);
}
if (import.meta.url === `file://${process.argv[1]}`) await main();
