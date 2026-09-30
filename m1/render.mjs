// Minimal deterministic renderer for AutoFE M1 axioms v0 (§9 contract).
// Pure function: same model + context => byte-identical HTML. No AI, no network, no clock.
//
// Form selection (F-030): the model says what item sets ARE; the renderer picks
// the form — table (typed field sets), chips (label-only lists/menus/credits),
// product cards (priced items), deflist (name + one detail), accordion (Q&A).
// No ✓ markers: a checkmark means "included/done" and item sets are not that.
// Hierarchy: root title H1; depth-1 storyline headings H2; deeper H3+.
// _intent is internal planning copy and is NEVER rendered (F-029/F1).
// Usage: node m1/render.mjs <model.json> [out.html]
import fs from 'node:fs';
import {
  isRoleKey, resolvePath, resolveWithParent, childrenOf, factsOf,
  parseExpr, evalExpr, scopeFor, exposeOf, FIELDS,
} from './model-lib.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CURRENCY_GLYPH = { CNY: '¥', USD: '$', HKD: 'HK$', EUR: '€', GBP: '£' };

function fmt(v) {
  if (v === null || v === undefined) return '';
  if ('list' in v) return v.list.map((e) => `<span class="chip">${fmt(e)}</span>`).join(' ');
  if ('text' in v) return esc(v.text);
  if ('num' in v) return esc(v.num) + (v.unit ? ` ${esc(v.unit)}` : '');
  if ('money' in v) {
    const sym = CURRENCY_GLYPH[v.currency] ?? (v.currency ? esc(v.currency) + ' ' : '');
    return (v.qualifier ? esc(v.qualifier) + ' ' : '') + sym + esc(v.money);
  }
  if ('date' in v) return esc(v.date);
  if ('bool' in v) return v.bool ? 'yes' : 'no';
  if ('icon' in v) return esc(v.icon);
  if ('video' in v) return `<a href="${esc(v.video)}">video</a>`;
  if ('image' in v) return `<img src="${esc(v.image)}" alt="${esc(v.alt ?? '')}">`;
  if ('ref' in v) return `<a class="ref" href="#${esc(String(v.ref).replace(/^key:/, '').replace(/[^A-Za-z0-9_-]/g, '-'))}">${esc(v.ref)}</a>`;
  return esc(JSON.stringify(v));
}
const factHtml = (v) => `<div class="fact"><span class="val">${fmt(v)}</span></div>`;

// ---- engine heuristic (F-018): homogeneous runs by field-shape similarity ----
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

// ---- item-set form selection (F-030) ---------------------------------------
function isLabelOnlyItem(it) {
  return factsOf(it).every((f) => ['_name', '_title'].includes(f.key)) && !it._fields && childrenOf(it).length === 0;
}
function isProseItem(it) {
  const f = factsOf(it);
  return f.length > 0 && f.every((x) => x.key === '_text') && !it._fields && childrenOf(it).length === 0 && !it._action;
}
function selectForm(items) {
  if (!items.length) return 'none';
  if (items.every(isProseItem)) return 'prose';
  if (items.some((it) => it._fields && Object.keys(it._fields).length)) return 'table';
  if (items.every(isLabelOnlyItem)) {
    // long sentence labels are a list of links/questions, not filter chips (F-030)
    const long = items.every((it) => {
      const t = labelOf(it);
      const len = t ? (t.text ?? '').length : 0;
      return len >= 16 || /[?？]$/.test((t?.text ?? '').trim());
    });
    return long ? 'list' : 'chips';
  }
  if (items.some((it) => it._price)) return 'product-cards';
  const deflist = items.every((it) => {
    if (it._fields || childrenOf(it).length) return false;
    const f = factsOf(it);
    if (f.length < 1 || f.length > 2) return false;
    return JSON.stringify(f.map((x) => x.value.text ?? x.value.num ?? '')).length <= 240;
  });
  if (deflist) return 'deflist';
  const accordion = items.every((it) => factsOf(it).some((f) => f.key === '_title') && factsOf(it).some((f) => f.key === '_detail') && childrenOf(it).length === 0);
  if (accordion) return 'accordion';
  return 'cards';
}

const labelOf = (it) => it._name ?? it._title ?? it._text;
function renderList(items) {
  const lis = items.map((it) => {
    const v = labelOf(it);
    const label = v ? fmt(v) : '';
    if (!label) return '';
    const inner = it._action && hasTarget(it._action) ? `<a href="${esc(it._action.to)}">${label}</a>` : label;
    return `<li>${inner}</li>`;
  }).join('');
  return lis ? `<ul class="linklist">${lis}</ul>` : '';
}
function renderProse(items) {
  return `<div class="prose">${items.map((it) => {
    const t = labelOf(it);
    return t ? `<p>${fmt(t)}</p>` : '';
  }).join('')}</div>`;
}
function renderChips(items) {
  const chips = items.map((it) => {
    const v = labelOf(it);
    const label = v ? fmt(v) : '';
    if (!label) return '';            // no label, no chip (never an empty control)
    const a = it._action;
    const inner = hasTarget(a) ? `<a href="${esc(a.to)}">${label}</a>` : label;
    return `<span class="chip-item">${inner}</span>`;
  }).join('');
  return chips ? `<div class="chips">${chips}</div>` : '';
}
function renderDeflist(items) {
  const rows = items.map((it) => {
    const label = it._name ?? it._title;
    const rest = factsOf(it).filter((x) => !['_name', '_title'].includes(x.key));
    const l0 = label ? fmt(label) : '';
    const l = l0 && hasTarget(it._action) ? `<a href="${esc(it._action.to)}">${l0}</a>` : l0;
    const v = rest.map((x) => fmt(x.value)).join(' ').trim();
    if (!l && !v) return '';
    return `<div class="defrow"><div class="deflabel">${l}</div><div class="defval">${v}</div></div>`;
  }).join('');
  return rows ? `<div class="deflist">${rows}</div>` : '';
}
function renderAccordion(items, chain, hide, ctx) {
  const det = items.map((it) => {
    const q = labelOf(it);
    const a = factsOf(it).filter((x) => ['_detail', '_summary', '_text'].includes(x.key) && x.value !== q);
    const answer = a.map((x) => fmt(x.value)).join(' ');
    if (!q && !answer) return '';
    if (!q) return `<div class="qa-a">${answer}</div>`;
    return `<details class="qa"><summary>${fmt(q)}</summary><div class="qa-a">${answer}</div></details>`;
  }).join('');
  return `<div class="accordion">${det}</div>`;
}
function renderRun(run, chain, hide, ctx) {
  const cols = [...new Set(run.flatMap((c) => [...fieldKeys(c.node), ...factsOf(c.node).filter((f) => !['_name', '_title'].includes(f.key)).map((f) => f.key)]))];
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
        .map((ch) => renderNode(ch.node, [...chain, c.node], false, hide, ctx, 4)).join('');
      return `<tr>${tds}<td class="row-ops">${ops}</td></tr>`;
    }).join('');
    return `<table class="data"><thead>${head}</thead><tbody>${trs}</tbody></table>`;
  }
  return `<div class="cards">${run.map((c) => `<div class="item">${renderNode(c.node, [...chain, c.node], false, hide, ctx, 4)}</div>`).join('')}</div>`;
}


function renderSelectTable(items, exp, chain, hide, ctx) {
  const typed = items.some((it) => it._fields && Object.keys(it._fields).length);
  const cols = typed
    ? [...new Set(items.flatMap((it) => [...Object.keys(it._fields ?? {}), ...factsOf(it).filter((f) => !['_name', '_title'].includes(f.key)).map((f) => f.key)]))]
    : ['_name', ...new Set(items.flatMap((it) => factsOf(it).filter((f) => !['_name', '_title'].includes(f.key)).map((f) => f.key)))];
  const multi = exp.multiple === true;
  const legend = exp.legend;
  const valuesOf = (n, col) => {
    if (col === '_name') return n._name ? fmt(n._name) : (n._title ? fmt(n._title) : '');
    const fv = n._fields?.[col];
    if (fv) return fmt(fv);
    const f = factsOf(n).find((x) => x.key === col);
    return f ? fmt(f.value) : '';
  };
  const head = `<tr><th class="sel"></th>${cols.map((c) => `<th>${esc(FIELDS[c]?.label ?? (c === '_name' ? '' : c.replace(/^_/, '')))}</th>`).join('')}<th></th></tr>`;
  const rows = items.map((it) => {
    const tds = cols.map((col) => `<td>${valuesOf(it, col)}</td>`).join('');
    const ops = childrenOf(it).filter((ch) => !ch.key.startsWith('_items['))
      .map((ch) => renderNode(ch.node, [...chain, it], false, hide, ctx, 4)).join('');
    const val = it._key ? `key:${it._key}` : String(items.indexOf(it));
    return `<tr><td class="sel"><input type="${multi ? 'checkbox' : 'radio'}" name="${esc(exp.name)}" value="${esc(val)}"></td>${tds}<td class="row-ops">${ops}</td></tr>`;
  }).join('');
  return `<fieldset class="expose expose-${esc(exp.name)}"><legend>${legend}</legend><table class="data"><thead>${head}</thead><tbody>${rows}</tbody></table></fieldset>`;
}

const hasTarget = (a) => Boolean(a?.to) && (/^https?:/i.test(a.to) || a.to.startsWith('/') || a.to.startsWith('key:'));
const actionHtml = (a) => {
  const copy = a.label ?? a.verb;
  if (!copy && !a.label) return '';   // icon-only link with no captured label: nothing to say
  // no capture-backed target: keep the source's own words as plain text (T-101)
  return hasTarget(a)
    ? `<a class="action verb-${esc(a.verb)}" href="${esc(a.to)}">${esc(copy)}</a>`
    : `<span class="action-plain">${esc(copy)}</span>`;
};

function renderNode(node, chain, isHero, hide, ctx, depth) {
  if (node === null || typeof node !== 'object') return '';
  const scope = { ...ctx.values, ...scopeFor([...chain, node]) };
  if (typeof node._when === 'string') {
    const ast = parseExpr(node._when);
    if (ast.ok && !evalExpr(ast, scope)) return '';
  }
  const headingKey = node._title ? '_title' : (node._name ? '_name' : null);

  // explicit labeled actions; label-less navigate/open lowers to the element's own link (F-020)
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
        linkTo = a.to;
      } else {
        action = actionHtml(a);
      }
    }
  }

  // _primary FACT gets the enlarged hero slot; subtree primaries stay in place (no reordering)
  let heroHtml = '';
  if (typeof node._primary === 'string') {
    const r = resolveWithParent(node, node, node._primary);
    if (r.ok && isRoleKey(r.lastKey)) {
      heroHtml = `<div class="hero fact-hero">${factHtml(r.node)}</div>`;
      if (!hide.has(r.holder)) hide.set(r.holder, { keys: new Set(), nodes: new Set() });
      hide.get(r.holder).keys.add(r.lastKey);
    }
  }

  const hid = hide.get(node);
  const kids = childrenOf(node).filter((c) => !(hid?.nodes.has(c.node)));
  const facts = factsOf(node).filter((f) => !(hid?.keys.has(f.key)));
  const titleText = headingKey ? fmt(node[headingKey]) : null;

  const cls = ['node', `depth-${Math.min(depth, 4)}`];
  if (isHero) cls.push('hero-branch');
  if (node._rel?.compare) cls.push('compare');
  if (node._rel?.order === 'time') cls.push('timeline');
  const demoted = (node._rel?.level ?? 0) >= 2;

  const exp = exposeOf(node);
  const itemsConsumed = new Set();
  let bodyLead = '';
  for (const f of facts) {
    if (headingKey && f.key === headingKey) continue;
    if (exp && (f.key === '_label' || f.key === '_summary')) continue;
    bodyLead += factHtml(f.value);
  }
  if (node._fields) for (const [k, v] of Object.entries(node._fields)) bodyLead += factHtml(v);

  const ordered = kids.filter((c) => c.key.startsWith('_lines[') || c.key.startsWith('_items['));

  let body = '';
  if (exp && node._items?.length && node._items.length < 2) {
    // a one-option "choice" is not a choice: render the fact plainly (F-030)
    const it = node._items[0];
    const v = it._name ?? it._title;
    const extra = factsOf(it).filter((x) => !['_name', '_title'].includes(x.key));
    const lbl = node._label ? fmt(node._label) : esc(exp.name);
    body += `<div class="defrow"><div class="deflabel">${lbl}</div><div class="defval">${v ? fmt(v) : ''} ${extra.map((x) => fmt(x.value)).join(' ')}</div></div>`;
    itemsConsumed.add(it);
  } else if (exp && node._items?.length && node._items.some((it) => it._fields && Object.keys(it._fields).length)) {
    // typed-field rows with a selection column: the admin-table form
    const legend = node._label ? fmt(node._label) : esc(exp.name);
    body += renderSelectTable(node._items, { ...exp, legend }, chain, hide, ctx);
    node._items.forEach((it) => itemsConsumed.add(it));
  } else if (exp && node._items?.length && node._items.some((it) => factsOf(it).some((f) => !['_name', '_title'].includes(f.key)))) {
    // a choice set where options carry their own details is a table, not a chip row (T-107)
    const legend = node._label ? fmt(node._label) : esc(exp.name);
    body += renderSelectTable(node._items, { ...exp, legend }, chain, hide, ctx);
    node._items.forEach((it) => itemsConsumed.add(it));
  } else if (exp && node._items?.length) {
    const multi = exp.multiple === true;
    const opts = node._items.map((it, i) => {
      const v = it._name ?? it._title ?? (it._fields ? { text: Object.values(it._fields)[0]?.text ?? Object.values(it._fields)[0]?.num ?? '' } : undefined);
      const extra = factsOf(it).filter((x) => !['_name', '_title'].includes(x.key)).map((x) => fmt(x.value)).join(' ');
      const label = (v && (v.text !== undefined || v.num !== undefined) ? fmt(v) : `option ${i + 1}`) + (extra ? ` <span class="choice-extra">${extra}</span>` : '');
      const val = it._key ? `key:${it._key}` : (v ? v.text : String(i));
      return `<label class="choice"><input type="${multi ? 'checkbox' : 'radio'}" name="${esc(exp.name)}" value="${esc(val)}"> ${label}</label>`;
    }).join('');
    const legend = node._label ? fmt(node._label) : esc(exp.name);
    const hint = node._summary ? `<span class="hint">${fmt(node._summary)}</span>` : '';
    body += `<fieldset class="expose chipbar expose-${esc(exp.name)}"><legend>${legend}</legend>${hint}${opts}</fieldset>`;
    // the choice set IS the rendering of these items — nothing renders again below
    node._items.forEach((it) => itemsConsumed.add(it));
  } else if (exp) {
    const lbl = node._label ? fmt(node._label) : esc(exp.name);
    const hint = node._summary ? `<span class="hint">${fmt(node._summary)}</span>` : '';
    body += `<label class="expose expose-${esc(exp.name)}"><span class="deflabel">${lbl}</span>${hint}<input type="text" name="${esc(exp.name)}" data-type="${esc(exp.type)}"></label>`;
  }

  // every sibling block item renders in ONE form; nothing renders twice (T-103)
  const rawItems = ordered.map((c) => c.node).filter((it) => !itemsConsumed.has(it));
  const form = rawItems.length ? selectForm(rawItems) : 'none';
  if (form === 'chips') {
    body += renderChips(rawItems, chain, hide, ctx);
  } else if (form === 'list') {
    body += renderList(rawItems);
  } else if (form === 'prose') {
    body += renderProse(rawItems);
  } else if (form === 'deflist') {
    body += renderDeflist(rawItems);
  } else if (form === 'accordion') {
    body += renderAccordion(rawItems, chain, hide, ctx);
  } else if (form === 'table') {
    body += renderRun(rawItems.map((it) => ({ key: '_items[x]', node: it })), chain, hide, ctx);
    if ((node._items ?? []).length === 0 && node._empty) body += renderNode(node._empty, [...chain, node], false, hide, ctx, depth + 1);
  } else if (form === 'cards' || form === 'product-cards') {
    const cards = rawItems.map((it) => {
      const inner = renderNode(it, [...chain, node], false, hide, ctx, depth + 1);
      return inner ? `<div class="item">${inner}</div>` : '';
    }).join('');
    if (cards) body += `<div class="cards${form === 'product-cards' ? ' product-cards' : ''}">${cards}</div>`;
  }
  rawItems.forEach((it) => itemsConsumed.add(it));

  // toolbar: consecutive action-only children render inline
  const actionKids = kids.filter((c) => !itemsConsumed.has(c.node) && !ordered.includes(c) && c.node._action &&
    factsOf(c.node).length === 0 && childrenOf(c.node).length === 0);
  if (actionKids.length >= 2) {
    const tools = actionKids.map((c) => {
      const a = c.node._action;
      const copy = a.label ?? a.verb;
      return a.to && (/^https?:/i.test(a.to) || a.to.startsWith('/') || a.to.startsWith('key:'))
        ? `<a class="tool" href="${esc(a.to)}">${esc(copy)}</a>` : `<span class="tool">${esc(copy)}</span>`;
    }).join('');
    body += `<div class="toolbar">${tools}</div>`;
    actionKids.forEach((c) => itemsConsumed.add(c.node));
  }

  for (const c of kids) {
    if (itemsConsumed.has(c.node) || actionKids.includes(c)) continue;
    const h = renderNode(c.node, [...chain, node], false, hide, ctx, depth + 1);
    if (!h) continue;
    body += c.key.startsWith('_items[')
      ? `<div class="item">${h}</div>`
      : `<section class="group g-${esc(c.key)}">${h}</section>`;
  }

  // a bare-title block (source banners/ads) is a promo card, never a section heading (T-106)
  const bareTitle = depth > 0 && titleText && !bodyLead && !heroHtml && !body && !action;
  if (bareTitle) return `<div class="promo">${titleText}</div>`;

  const headingLevel = Math.min(depth + 1, 6);
  const headingTag = depth === 0 ? 'h1' : `h${headingLevel}`;
  let head = '';
  if (titleText) {
    const t = linkTo ? `<a class="self-link" href="${esc(linkTo)}">${titleText}</a>` : titleText;
    head = `<${headingTag} class="title">${t}</${headingTag}>`;
  }

  const anchorId = node._key ? ` id="${esc(String(node._key).replace(/[^A-Za-z0-9_-]/g, '-'))}"` : '';
  // nothing to say: emit nothing at all (never an empty block)
  if (!head && !bodyLead && !heroHtml && !body && !action) return '';
  const article = `<article${anchorId} class="${cls.join(' ')}">${head}${bodyLead}${heroHtml}${body}${action}</article>`;
  return demoted ? `<aside class="zone">${article}</aside>` : article;
}

// expose groups skip their label/summary facts in bodyLead (they become legend/hint)
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
h1.title{font-size:2em;line-height:1.25;margin:.1em 0 .35em;font-weight:750}
h2.title{font-size:1.45em;margin:1.1em 0 .45em;font-weight:700}
h3.title{font-size:1.12em;margin:.8em 0 .35em;font-weight:650}
.hero{margin:4px 0 24px}
.hero.fact-hero .fact .val{font-size:2em;font-weight:700}
article{margin:12px 0}
.compare{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px;align-items:start}
.compare>.node{border:1px solid #e6eaf0;border-radius:10px;padding:12px;margin:0}
.timeline{border-left:2px solid #d6dde6;margin-left:8px;padding-left:18px}
.timeline .item{position:relative;padding:6px 0}
.timeline .item::before{content:"";position:absolute;left:-24px;top:14px;width:9px;height:9px;border-radius:50%;background:#17212b}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}
.cards .item{border:1px solid #e6eaf0;border-radius:10px;padding:12px;margin:0}
.fact{margin:3px 0}
.val{overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.cards .item img,.run .item img,.cards img{width:100%;height:150px;object-fit:cover;border-radius:8px;display:block}
.action-plain{color:#4a5a68;font-size:.95em}
.promo{border:1px solid #e3e8ee;background:#f8fafc;border-radius:10px;padding:10px 14px;color:#33475b;font-weight:600;margin:10px 0}
.prose p{margin:.5em 0;line-height:1.75}
.linklist{margin:8px 0;padding-left:1.1em;columns:2;column-gap:28px}
.linklist li{margin:5px 0;line-height:1.5}
.linklist a{color:#0b62d0}
.chip-item{display:block;break-inside:avoid;padding:4px 0;font-size:.95em}
.chips a{color:inherit;text-decoration:none}
.chips a:hover{text-decoration:underline}
.deflist{margin:8px 0}
.defrow{display:flex;gap:14px;padding:7px 0;border-bottom:1px dashed #eef1f5;align-items:baseline}
.deflabel{min-width:130px;font-weight:600}
.defval{color:#3c4a58;font-size:.95em;overflow-wrap:anywhere}
.accordion{margin:8px 0}
details.qa{border-bottom:1px solid #eef1f5;padding:6px 0}
details.qa summary{cursor:pointer;font-weight:600;padding:4px 0}
details.qa .qa-a{padding:6px 0;color:#3c4a58;font-size:.95em}
.toolbar{display:flex;flex-wrap:wrap;gap:10px;margin:10px 0;align-items:center}
.toolbar .tool{padding:6px 14px;border:1px solid #d6dde6;border-radius:8px;text-decoration:none;color:inherit;font-size:.9em}
.expose{display:block;margin:8px 0}
.choice{display:inline-flex;gap:6px;align-items:center;margin:0 14px 6px 0;padding:6px 12px;border:1px solid #d6dde6;border-radius:8px}
fieldset.expose{border:1px solid #e6eaf0;border-radius:10px;padding:10px 12px}
legend{font-size:.8em;color:#68788a;text-transform:uppercase;letter-spacing:.04em}
.expose .hint{display:block;color:#5b6a78;font-size:.85em;margin:2px 0 8px}
.choice-extra{color:#5b6a78;font-size:.9em;margin-left:4px}
input[type=text]{padding:7px 10px;border:1px solid #d6dde6;border-radius:8px;font:inherit}
.action{display:inline-block;margin:10px 0 0;padding:9px 18px;border-radius:9px;background:#17212b;color:#fff;text-decoration:none;border:0;font:inherit;cursor:pointer}
img{max-width:100%;border-radius:10px;display:block}
table.data{border-collapse:collapse;width:100%;font-size:.92em;margin:10px 0}
table.data th,table.data td{border-bottom:1px solid #e6eaf0;padding:8px 10px;text-align:left;vertical-align:top}
table.data th{color:#5b6a78;font-weight:600;background:#f7f9fb}
table.data td.sel,table.data th.sel{width:34px;text-align:center}
.chip{display:inline-block;background:#eef2f7;border-radius:999px;padding:2px 10px;margin:1px 4px 1px 0;font-size:.85em}
.row-ops{display:flex;flex-direction:column;gap:4px}
.row-ops .action{margin:2px 0;padding:4px 10px;font-size:.85em}
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
