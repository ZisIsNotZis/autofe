// Round-55 one-off: back-fill link targets from the capture (task §1: “以 corpus/<site>/<page>/dom.html
// 为唯一真相，为动作/条目回填指向目标；不得新增语法”).
//
// RULE (no guessing): a model node whose heading text is VERBATIM the visible text of a capture
// anchor that HAS a real href gets `_action: {verb:'navigate', to:<that href, absolutized>}` —
// the existing action mechanism, no new syntax, the href lifted from the DOM and never built.
// Ambiguity is refused, not resolved: if the same text maps to two different hrefs on the page,
// nothing is written for it (reported as 无法确证). A node that already carries an action is
// left alone (its own link is the curator's declared choice).
// Usage: node .scratch/54-user-review/backfill-links.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { sourceAnchors, compact, normalizeHref } from '../../m1/eval/link-coverage.mjs';
import { isRoleKey, childrenOf } from '../../m1/model-lib.mjs';

const dry = process.argv.includes('--dry');
const ROOT = '.';
const scale = JSON.parse(fs.readFileSync('m1/eval/m3-scale.json', 'utf8')).filter((x) => x.tier === 'exemplar');
const HEADINGS = ['_name', '_title'];

let totalAdded = 0, totalAmbiguous = 0;
for (const r of scale) {
  const modelPath = `m1/curated/${r.k}.json`;
  const corpusDir = `corpus/${r.k}`;
  if (!fs.existsSync(modelPath) || !fs.existsSync(`${corpusDir}/dom.html`)) continue;
  let base = '';
  try { base = JSON.parse(fs.readFileSync(`${corpusDir}/meta.json`, 'utf8')).url ?? ''; } catch { /* relative hrefs stay relative */ }
  const anchors = sourceAnchors(fs.readFileSync(`${corpusDir}/dom.html`, 'utf8'), base);
  // text → the SET of absolutized hrefs the capture gives it (a set of 1 is evidence; 2 is a coin flip)
  const index = new Map();
  for (const a of anchors) {
    if (!a.real) continue;
    const k = compact(a.text);
    if (!index.has(k)) index.set(k, new Set());
    index.get(k).add(normalizeHref(a.href, base));
  }
  const raw = fs.readFileSync(modelPath, 'utf8');
  const model = JSON.parse(raw);
  // Keep each file's own formatting so the diff shows only the added links (the corpus mixes
  // 1-space and 2-space indentation; re-serializing with one setting would reformat whole files).
  const indent = [1, 2, 3, 4].find((i) => JSON.stringify(model, null, i) + '\n' === raw) ?? 1;
  const added = [], ambiguous = [];
  const visit = (node) => {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!node || typeof node !== 'object') return;
    // A node whose heading (or whose control label) is VERBATIM a capture anchor text with a
    // single real target gets that target: an existing action gains `to` (keeping its verb and
    // the source's own control copy), an action-less node gains the plain 'navigate' link.
    const keys = node._action && !node._action.to ? [...HEADINGS, '_action'] : (node._action === undefined ? HEADINGS : []);
    for (const hk of keys) {
      const t = hk === '_action' ? node._action?.label : node[hk]?.text;
      if (typeof t !== 'string' || !t) continue;
      const hit = index.get(compact(t));
      if (!hit) continue;
      if (hit.size > 1) { ambiguous.push(t); break; }
      const to = [...hit][0];
      if (!to || !/^https?:\/\//i.test(to)) break;
      if (node._action === undefined) node._action = { verb: 'navigate', to };
      else node._action.to = to;
      added.push(`${hk}="${t}" -> ${to}`);
      break;
    }
    for (const c of childrenOf(node)) visit(c.node);
  };
  visit(model);
  totalAdded += added.length; totalAmbiguous += ambiguous.length;
  if (added.length || ambiguous.length) {
    console.log(`· ${r.k}: +${added.length} 链接${ambiguous.length ? ` | 无法确证(同文本多目标) ${ambiguous.length}` : ''}`);
    for (const a of added) console.log(`    + ${a}`);
    for (const a of ambiguous) console.log(`    ? 无法确证: "${a}"`);
  }
  if (added.length && !dry) fs.writeFileSync(modelPath, JSON.stringify(model, null, indent) + '\n');
}
console.log(`\n回填链接 ${totalAdded} 条（${dry ? 'dry-run，未写盘' : '已写盘'}）| 无法确证 ${totalAmbiguous} 条`);
