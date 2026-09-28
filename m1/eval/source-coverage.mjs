// M2.5 source-coverage warnings (user proposal, 2026-09-18).
// Direction: ORIGINAL page -> RENDER (complements metrics.mjs which is MODEL -> render).
// Catches facts that exist on the original page but never made it into the model
// (encoding failures). Warnings only — never hard failures; triage decides.
// Key strings = headings, price/number-bearing texts, and short action labels.
// Usage: node m1/eval/source-coverage.mjs <render.html> <sourceDir> [model.json]
import fs from 'node:fs';
import { walk } from '../model-lib.mjs';

const norm = (s) => String(s).toLowerCase().replace(/[\s\p{P}]+/gu, '');
const NOISE = /cookie|javascript|版权|©|all rights|skip to|关闭广告|说点什么|登录|注册|搜索/i;
const CODELIKE = /^(const|let|var|import|function|export|jsx|return\b)|=>|;\s*$|[{}]\s*$/;
const CODE_OBJECT = /['\"]\s*:|:\s*['\"]|,\s*$/; // object-literal lines from embedded code samples
const CHROME = /^\d+ \/ \d+$|^\d+\/\d+$|^[\d/:. 年月日时秒分]+$/u;
const normDate = (t) => t.replace(/(\d{4})年(\d{1,2})月(\d{1,2})日/g, (m, y, mo, d) => `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`);

export function sourceWarnings(renderHtml, sourceDir, model) {
  const H = norm(fs.readFileSync(renderHtml, 'utf8'));
  // model-authored text is backed by definition; never warn about it
  const modelText = new Set();
  if (model) walk(model, (n) => {
    for (const [k, v] of Object.entries(n)) {
      if (k.startsWith('_') && v && typeof v === 'object' && !Array.isArray(v)) {
        for (const [t, tv] of Object.entries(v)) if (typeof tv === 'string') modelText.add(norm(tv));
      }
    }
    if (n._fields) for (const v of Object.values(n._fields)) for (const tv of Object.values(v)) if (typeof tv === 'string') modelText.add(norm(tv));
  });

  const nodes = JSON.parse(fs.readFileSync(`${sourceDir}/nodes.json`, 'utf8'));
  const seen = new Set();
  const warnings = [];
  for (const x of nodes) {
    const raw = (x.text && x.text.length >= (x.text || '').length ? x.text : x.name) || x.name || x.text || '';
    const t = normDate(String(raw).trim());
    if (t.length < 2 || t.length > 90 || NOISE.test(t)) continue;
    if (CODELIKE.test(t) || CHROME.test(t)) continue;
    if (CODE_OBJECT.test(t) && /,\s*$/.test(t)) continue;
    if (!/\s/.test(t) && t.length > 30) continue; // concatenated menu soup
    const hasNumber = /\d/.test(t) && /(¥|\$|€|£|HK\$|%|USD|CNY|\d{2,})/.test(t);
    const isHeading = x.role === 'heading';
    const isAction = (x.role === 'link' || x.role === 'button') && t.length >= 3 && t.length <= 40;
    if (!isHeading && !hasNumber && !isAction) continue;
    const key = norm(t);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (H.includes(key)) continue;
    if ([...modelText].some((m) => m && (m.includes(key) || key.includes(m)))) continue;
    const severity = hasNumber ? 'high' : isHeading ? 'medium' : 'info';
    warnings.push({ severity, role: x.role, text: t.slice(0, 80) });
  }
  const order = { high: 0, medium: 1, info: 2 };
  warnings.sort((a, b) => order[a.severity] - order[b.severity]);
  return {
    checked: seen.size,
    warnings,
    high: warnings.filter((w) => w.severity === 'high').length,
    medium: warnings.filter((w) => w.severity === 'medium').length,
    info: warnings.filter((w) => w.severity === 'info').length,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [render, sourceDir, model] = process.argv.slice(2);
  const r = sourceWarnings(render, sourceDir, model ? JSON.parse(fs.readFileSync(model, 'utf8')) : null);
  console.log(JSON.stringify(r, null, 2));
}
