// Minimal deterministic renderer for AutoFE M1 axioms v0 (§9 contract).
// Pure function: same model + context => byte-identical HTML. No AI, no network, no clock.
// Hierarchy: root title = H1, top-level storyline headings = H2, deeper = H3+.
// Group nodes without _title render their _intent as the heading (it IS the
// storyline's heading when no title exists). Presentation forms (table/cards/
// checklist/aside) are chosen here by heuristics (F-018); the model never
// names a presentation form.
// Usage: node m1/render.mjs <model.json> [out.html]
import fs from 'node:fs';
import {
  isRoleKey, roleOf, resolvePath, resolveWithParent, childrenOf, factsOf,
  parseExpr, evalExpr, scopeFor, exposeOf, FIELDS,
} from './model-lib.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function fmt(v) {
  if (v === null || v === undefined) return '';
  if ('list' in v) return v.list.map((e) => `<span class="chip">${fmt(e)}</span>`).join(' ');
  if ('text' in v) return esc(v.text);
  if ('num' in v) return esc(v.num) + (v.unit ? ` ${esc(v.unit)}` : '');
  if ('money' in v) {
    const sym = { CNY: '¥', USD: '$', HKD: 'HK$', EUR: '€', GBP: '£' }[v.currency] ?? (v.currency ? esc(v.currency) + ' ' : '');
    return (v.qualifier ? esc(v.qualifier) + ' ' : '') + sym + esc(v.money);
  }
  if ('date' in v) return esc(v.date);
  if ('bool' in v) return v.bool ? 'yes' : 'no';
  if ('icon' in v) return esc(v.icon);
  if ('video' in v) return `<a href="${esc(v.video)}">video</a>`;
  if ('image' in v) return `<img src="${esc(v.image)}" alt="${esc(v.alt ?? '')}">`;
  if ('ref' in v) return `<span class="ref">${esc(v.ref)}</span>`;
  return esc(JSON.stringify(v));
}
const factHtml = (v) => `<div class="fact"><span class="val">${fmt(v)}</span></div>`;

// ---- engine heuristic (F-018): discover homogeneous runs among siblings ----
const fieldKeys = (n) => Object.keys(n._fields ?? {});
function similar(a, b) {
  const ka = fieldKeys(a), kb = fieldKeys(b);
  if (!ka.length || !kb.length) return false;
  const inter = ka.filter((k) => kb.includes(k)).length;
  return inter / new Set([...ka, ...kb]).size >= 0.6;
}
function discoverRuns(orderedChildren) {
  const runs = []; let run = [];
  for (const c of orderedChildren) {
    if (run.length === 0 || similar(run[run.length - 1].node, c.node)) run.push(c);
    else { if (run.length >= 2) runs.push(run); run = [c]; }
  }
  if (run.length >= 2) runs.push(run);
  return runs;
}
// simple-shape items => checklist form (name/detail pairs, no nested structure)
function isChecklist(items) {
  if (!items || items.length < 3) return false;
  return items.every((it) => {
    const f = factsOf(it).filter((x) => !['_title', '_name'].includes(x.key));
    return !it._fields && childrenOf(it).length === 0 && factsOf(it).length >= 1 && factsOf(it).length <= 2;
  });
}
function renderChecklist(items, chain, hide, ctx) {
  const lis = items.map((it) => {
    const label = it._name ?? it._title;
    const rest = factsOf(it).filter((x) => !['_name', '_title'].includes(x.key));
    const inner = (label ? `<strong>${fmt(label)}</strong>` : '') +
      rest.map((x) => `<span>${fmt(x.value)}</span>`).join(' ');
    void chain;
    const a = it._action;
    return `<li>${inner}${a?.to ? `<a class="check-link" href="${esc(a.to)}">${esc(a.label ?? '→')}</a>` : ''}</li>`;
  }).join('');
  return `<ul class="checklist">${lis}</ul>`;
}
function renderRun(run, chain, hide, ctx) {
  const cols = [...new Set(run.flatMap((c) => [...fieldKeys(c.node), ...factsOf(c.node).filter((f) => !['_title', '_name'].includes(f.key)).map((f) => f.key)]))];
  const valuesOf = (n, col) => {
    const fv = n._fields?.[col];
    if (fv) return fmt(fv);
    const f = factsOf(n).find((x) => x.key === col);
    return f ? fmt(f.value) : '';
  };
  if (cols.length >= 3) {
    const head = `<tr>${cols.map((c) => `<th>${esc(FIELDS[c]?.label ?? c.replace(/^_/, ''))}</th>`).join('')}<th></th></tr>`;
    const trs = run.map((c) => {
      const tds = cols.map((col) => `<td>${valuesOf(c.node, col)}</td>`).join('');
      const ops = childrenOf(c.node).filter((ch) => !ch.key.startsWith('_items['))
        .map((ch) => renderNode(ch.node, [...chain, c.node], false, hide, ctx, 3)).join('');
      return `<tr>${tds}<td class="row-ops">${ops}</td></tr>`;
    }).join('');
    return `<table class="data"><thead>${head}</thead><tbody>${trs}</tbody></table>`;
  }
  return `<div class="cards">${run.map((c) => `<div class="item">${renderNode(c.node, [...chain, c.node], false, hide, ctx, 3)}</div>`).join('')}</div>`;
}

function renderNode(node, chain, isHero, hide, ctx, depth) {
  if (node === null || typeof node !== 'object') return '';
  const scope = { ...ctx.values, ...scopeFor([...chain, node]) };
  if (typeof node._when === 'string') {
    const ast = parseExpr(node._when);
    if (ast.ok && !evalExpr(ast, scope)) return '';
  }
  const headingKey = node._title ? '_title' : (node._name ? '_name' : null);

  let action = '';
  let linkTo = null;
  if (node._action) {
    let show = true;
    if (typeof node._action.when === 'string') {
      const ast = parseExpr(node._action.when);
      if (ast.ok) show = Boolean(evalExpr(ast, scope));
    }
    if (show) {
      const a = node._action;
      const labelless = !a.label && ['navigate', 'open'].includes(a.verb);
      if (labelless && a.to && (/^https?:/i.test(a.to) || a.to.startsWith('/') || a.to.startsWith('key:'))) {
        linkTo = a.to; // the element itself is the affordance (F-020) — never an "open" chip
      } else {
        const copy = a.label ?? a.verb;
        action = a.to && (/^https?:/i.test(a.to) || a.to.startsWith('/') || a.to.startsWith('key:'))
          ? `<a class="action verb-${esc(a.verb)}" href="${esc(a.to)}">${esc(copy)}</a>`
          : `<button class="action verb-${esc(a.verb)}" type="button">${esc(copy)}</button>`;
      }
    }
  }

  // _primary hero: fact or subtree, hidden from its normal position
  let heroHtml = '';
  if (typeof node._primary === 'string') {
    const r = resolveWithParent(node, node, node._primary);
    if (r.ok && r.node !== node) {
      if (isRoleKey(r.lastKey)) {
        heroHtml = `<div class="hero fact-hero">${factHtml(r.node)}</div>`;
        if (!hide.has(r.holder)) hide.set(r.holder, { keys: new Set(), nodes: new Set() });
        hide.get(r.holder).keys.add(r.lastKey);
      } else {
        // subtree primaries stay in their declared place (no reordering); facts get the hero slot
        heroHtml = '';
      }
    }
  }

  const hid = hide.get(node);
  const kids = childrenOf(node).filter((c) => !(hid?.nodes.has(c.node)));
  const facts = factsOf(node).filter((f) => !(hid?.keys.has(f.key)));
  const titleText = headingKey ? fmt(node[headingKey]) : null;
  const intentHeading = null; // _intent is internal planning copy — never rendered (F1)

  const cls = ['node', `depth-${Math.min(depth, 4)}`];
  if (isHero) cls.push('hero-branch');
  if (node._rel?.compare) cls.push('compare');
  if (node._rel?.order === 'time') cls.push('timeline');
  const demoted = (node._rel?.level ?? 0) >= 2;

  let bodyLead = '';
  for (const f of facts) { if (headingKey && f.key === headingKey) continue; bodyLead += factHtml(f.value); }
  if (node._fields) for (const [k, v] of Object.entries(node._fields)) bodyLead += factHtml(v);
  let body = '';

  const ordered = kids.filter((c) => c.key.startsWith('_lines[') || c.key.startsWith('_items['));
  const runs = discoverRuns(ordered);
  const inRun = new Set(runs.flat().map((c) => c.node));

  const exp = exposeOf(node);
  const simpleChoice = exp && node._items?.length && node._items.every((it) =>
    Object.keys(it).every((k) => ['_name', '_title', '_key', '_intent'].includes(k)));
  if (exp && node._items?.length) {
    const multi = exp.multiple === true;
    const opts = node._items.map((it, i) => {
      const v = it._name ?? it._title;
      const label = v ? fmt(v) : `option ${i + 1}`;
      const val = it._key ? `key:${it._key}` : (v ? v.text : String(i));
      return `<label class="choice"><input type="${multi ? 'checkbox' : 'radio'}" name="${esc(exp.name)}" value="${esc(val)}"> ${label}</label>`;
    }).join('');
    body += `<fieldset class="expose expose-${esc(exp.name)}"><legend>${esc(node._label ? fmt(node._label) : exp.name)}</legend>${opts}</fieldset>`;
  } else if (exp) {
    body += `<label class="expose expose-${esc(exp.name)}"><span class="val"><input type="text" name="${esc(exp.name)}" data-type="${esc(exp.type)}"></label>`;
  }

  // checklist form: simple name/detail item sets
  const itemsKids = kids.filter((c) => c.key.startsWith('_items['));
  const rawItems = (node._items ?? []).filter((it) => !inRun.has(it));
  const asChecklist = rawItems.length > 0 && isChecklist(rawItems);
  const itemsConsumed = new Set();
  if (asChecklist) {
    body += renderChecklist(rawItems, chain, hide, ctx);
    rawItems.forEach((it) => itemsConsumed.add(it));
  } else {
    for (const run of runs) body += renderRun(run, chain, hide, ctx);
    if (Array.isArray(node._items) && node._items.length === 0 && node._empty) {
      body += renderNode(node._empty, [...chain, node], false, hide, ctx, depth + 1);
    }
  }

  const headingLevel = Math.min(depth + 1, 6);
  const headingTag = depth === 0 ? 'h1' : `h${headingLevel}`;
  let head = '';
  if (titleText) {
    const t = linkTo ? `<a class="self-link" href="${esc(linkTo)}">${titleText}</a>` : titleText;
    head = `<${headingTag} class="title">${t}</${headingTag}>`;
  }

  for (const c of kids) {
    if (inRun.has(c.node)) continue;
    if (itemsConsumed.has(c.node)) continue;
    if (ordered.includes(c) && simpleChoice) continue;
    const h = renderNode(c.node, [...chain, node], false, hide, ctx, depth + 1);
    if (!h) continue;
    body += c.key.startsWith('_items[')
      ? `<div class="item">${h}</div>`
      : `<section class="group g-${esc(c.key)}">${h}</section>`;
  }

  // root-level trailing groups (after the primary content) render as an aside zone
  if (depth === 0 && !demoted) {
    // visual separation handled by CSS on .zone
  }
  const anchorId = node._key ? ` id="${esc(String(node._key).replace(/[^A-Za-z0-9_-]/g, '-'))}"` : '';
  const article = `<article${anchorId} class="${cls.join(' ')}">${head}${bodyLead}${heroHtml}${body}${action}</article>`;
  return demoted ? `<aside class="zone">${article}</aside>` : article;
}

export function render(model, context = {}) {
  const hide = new Map();
  const ctx = { values: context.values ?? {} };
  const html = renderNode(model, [], false, hide, ctx, 0);
  const title = esc(model._title ? fmt(model._title) : (model._intent ?? 'surface'));
  const brand = model._brand ? fmt(model._brand) : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${title}</title>
<style>
:root{color-scheme:light}
*{box-sizing:border-box}
body{margin:0;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;color:#17212b;background:#fff}
main{max-width:1100px;margin:0 auto;padding:32px 20px 80px}
header.site{display:flex;align-items:center;gap:10px;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #17212b}
header.site .brand{font-weight:700;font-size:1.15em;letter-spacing:.02em}
h1.title{font-size:2em;line-height:1.25;margin:.1em 0 .3em;font-weight:750}
h2.title,h2.intent-h{font-size:1.45em;margin:1.2em 0 .5em;font-weight:700}
h3.title,h3.intent-h{font-size:1.15em;margin:.9em 0 .4em;font-weight:650}
h4.title,h4.intent-h{font-size:1em;margin:.7em 0 .3em;font-weight:600;color:#3c4a58}
.hero{margin:6px 0 26px}
.hero.fact-hero .fact .val{font-size:2em;font-weight:700}
article{margin:14px 0}
.group{margin:10px 0 22px}
.compare{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;align-items:start}
.compare>.node{border:1px solid #e6eaf0;border-radius:10px;padding:12px;margin:0}
.timeline{border-left:2px solid #d6dde6;margin-left:8px;padding-left:18px}
.timeline .item{position:relative;padding:6px 0}
.timeline .item::before{content:"";position:absolute;left:-24px;top:14px;width:9px;height:9px;border-radius:50%;background:#17212b}
.items{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.cards .item{border:1px solid #e6eaf0;border-radius:10px;padding:12px;margin:0}
.fact{margin:4px 0}
.val{overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
.fact .val{font-size:.98em}
.checklist{list-style:none;padding:0;margin:8px 0}
.checklist li{padding:7px 0 7px 30px;position:relative;border-bottom:1px dashed #eef1f5}
.checklist li::before{content:"✓";position:absolute;left:6px;color:#2e7d32;font-weight:700}
.checklist li strong{margin-right:8px}
.checklist li span{color:#5b6a78}
.check-link{margin-left:8px;font-size:.85em}
.expose{display:block;margin:8px 0}
.choice{display:inline-flex;gap:6px;align-items:center;margin:0 14px 6px 0;padding:6px 12px;border:1px solid #d6dde6;border-radius:8px}
fieldset.expose{border:1px solid #e6eaf0;border-radius:10px;padding:10px 12px}
legend{font-size:.8em;color:#68788a;text-transform:uppercase;letter-spacing:.04em}
input[type=text]{padding:7px 10px;border:1px solid #d6dde6;border-radius:8px;font:inherit}
.action{display:inline-block;margin:10px 0 0;padding:9px 18px;border-radius:9px;background:#17212b;color:#fff;text-decoration:none;border:0;font:inherit;cursor:pointer}
img{max-width:100%;border-radius:10px;display:block}
table.data{border-collapse:collapse;width:100%;font-size:.92em;margin:10px 0}
table.data th,table.data td{border-bottom:1px solid #e6eaf0;padding:8px 10px;text-align:left;vertical-align:top}
table.data th{color:#5b6a78;font-weight:600;background:#f7f9fb}
.chip{display:inline-block;background:#eef2f7;border-radius:999px;padding:2px 10px;margin:1px 4px 1px 0;font-size:.85em}
.row-ops{display:flex;flex-direction:column;gap:4px}
.row-ops .action{margin:2px 0;padding:4px 10px;font-size:.85em}
aside.zone{margin-top:56px;padding-top:24px;border-top:1px solid #d6dde6}
aside.zone .title,.aside-h{font-size:1em;color:#5b6a78}
.depth-2 article,.depth-3 article{margin:8px 0}
/* proximity follows depth (F-028): deeper relationships sit visually tighter */
main>article>.group{margin-top:34px}
main>article .group .group{margin-top:18px}
main>article .group .group .group{margin-top:10px}
</style></head>
<body><main>${brand ? `<header class="site"><span class="brand">${brand}</span></header>` : ''}${html}</main></body></html>
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [inp, out] = process.argv.slice(2);
  if (!inp) { console.error('usage: node m1/render.mjs <model.json> [out.html]'); process.exit(2); }
  const html = render(JSON.parse(fs.readFileSync(inp, 'utf8')));
  if (out) fs.writeFileSync(out, html); else process.stdout.write(html);
}
