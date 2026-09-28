// Minimal deterministic renderer for AutoFE M1 axioms v0 (§9 contract).
// Pure function: same model => byte-identical HTML. No AI, no network, no clock.
// Usage: node m1/render.mjs <model.json> [out.html]
import fs from 'node:fs';
import {
  isRoleKey, roleOf, resolvePath, resolveWithParent, childrenOf, factsOf,
  parseExpr, evalExpr, scopeFor, exposeOf,
} from './model-lib.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function fmt(v) {
  if ('text' in v) return esc(v.text);
  if ('num' in v) return esc(v.num) + (v.unit ? ` ${esc(v.unit)}` : '');
  if ('money' in v) return esc(v.money) + (v.currency ? ` ${esc(v.currency)}` : '');
  if ('date' in v) return esc(v.date);
  if ('bool' in v) return v.bool ? 'yes' : 'no';
  if ('icon' in v) return esc(v.icon);
  if ('video' in v) return `<a href="${esc(v.video)}">video</a>`;
  if ('image' in v) return `<img src="${esc(v.image)}" alt="${esc(v.alt ?? '')}">`;
  if ('ref' in v) return `<span class="ref">${esc(v.ref)}</span>`;
  return esc(JSON.stringify(v));
}
const factHtml = (role, v) => `<div class="fact fact-${esc(role)}"><span class="role">${esc(role)}</span><span class="val">${fmt(v)}</span></div>`;

// Renders a node. hide = Map<node, {keys:Set, nodes:Set}> naming facts/subtrees
// already rendered elsewhere (the _primary hero), so nothing is dropped or duplicated.
function renderNode(node, chain, isHero, hide, ctx) {
  if (node === null || typeof node !== 'object') return '';
  const scope = { ...ctx.values, ...scopeFor([...chain, node]) };
  if (typeof node._when === 'string') {
    const ast = parseExpr(node._when);
    if (ast.ok && !evalExpr(ast, scope)) return '';
  }
  const headingKey = node._title ? '_title' : (node._name ? '_name' : null);
  const titleText = headingKey ? fmt(node[headingKey]) : null;

  const cls = ['node'];
  if (isHero) cls.push('hero');
  if (node._rel?.compare) cls.push('compare');
  if (node._rel?.order === 'time') cls.push('timeline');
  if (node._rel?.level !== undefined) cls.push(`level-${Math.max(0, Math.min(3, Math.floor(node._rel.level)))}`);

  let action = '';
  if (node._action) {
    let show = true;
    if (typeof node._action.when === 'string') {
      const ast = parseExpr(node._action.when);
      if (ast.ok) show = Boolean(evalExpr(ast, scope));
    }
    if (show) {
      const a = node._action;
      action = a.to && (/^https?:/i.test(a.to) || a.to.startsWith('/') || a.to.startsWith('key:'))
        ? `<a class="action verb-${esc(a.verb)}" href="${esc(a.to)}">${esc(a.verb)}</a>`
        : `<button class="action verb-${esc(a.verb)}" type="button">${esc(a.verb)}</button>`;
    }
  }

  let heroHtml = '';
  if (typeof node._primary === 'string') {
    const r = resolveWithParent(node, node, node._primary);
    if (r.ok && r.node !== node) {
      const childChain = [...chain, node];
      if (isRoleKey(r.lastKey)) {
        heroHtml = `<div class="hero">${factHtml(roleOf(r.lastKey), r.node)}</div>`;
        if (!hide.has(r.holder)) hide.set(r.holder, { keys: new Set(), nodes: new Set() });
        hide.get(r.holder).keys.add(r.lastKey);
      } else {
        heroHtml = `<div class="hero">${renderNode(r.node, childChain, true, hide, ctx)}</div>`;
        if (!hide.has(r.holder)) hide.set(r.holder, { keys: new Set(), nodes: new Set() });
        hide.get(r.holder).nodes.add(r.node);
      }
    }
  }

  const hid = hide.get(node);
  const kids = childrenOf(node).filter((c) => !(hid?.nodes.has(c.node)));
  const facts = factsOf(node).filter((f) => !(hid?.keys.has(f.key)));

  let body = '';
  for (const f of facts) { if (headingKey && f.key === headingKey) continue; body += factHtml(f.role, f.value); }

  const exp = exposeOf(node);
  if (exp && node._items?.length) {
    const opts = node._items.map((it, i) => {
      const v = it._name ?? it._title;
      const label = v ? fmt(v) : `option ${i + 1}`;
      const val = v ? v.text : String(i);
      return `<label class="choice"><input type="radio" name="${esc(exp.name)}" value="${esc(val)}"> ${label}</label>`;
    }).join('');
    body += `<fieldset class="expose expose-${esc(exp.name)}"><legend>${esc(exp.name)}</legend>${opts}</fieldset>`;
  } else if (exp) {
    body += `<label class="expose expose-${esc(exp.name)}"><span class="role">${esc(exp.name)}</span><input type="text" name="${esc(exp.name)}" data-type="${esc(exp.type)}"></label>`;
  }

  if (kids.length) {
    const parts = [];
    for (const c of kids) {
      if (exp && c.key.startsWith('_items[')) continue;
      const h = renderNode(c.node, [...chain, node], false, hide, ctx);
      if (!h) continue;
      if (c.key.startsWith('_lines[')) parts.push(`<section class="line">${h}</section>`);
      else if (c.key.startsWith('_items[')) parts.push(`<div class="item">${h}</div>`);
      else parts.push(`<section class="group g-${esc(c.key)}">${h}</section>`);
    }
    let inner = parts.join('');
    if (node._items?.length) {
      const wrap = node._rel?.order === 'time' ? 'ol' : 'div';
      inner = `<${wrap} class="items${node._rel?.order === 'time' ? ' ol' : ''}">${inner}</${wrap}>`;
    }
    body += inner;
  }

  const head = titleText
    ? `<h3 class="title">${titleText}</h3>`
    : (node._intent && kids.length ? `<h4 class="intent">${esc(node._intent)}</h4>` : '');
  return `<article class="${cls.join(' ')}">${heroHtml}${head}${body}${action}</article>`;
}

export function render(model, context = {}) {
  const hide = new Map();
  const ctx = { values: context.values ?? {} };
  const html = renderNode(model, [], false, hide, ctx);
  const intent = esc(model._intent ?? '');
  const title = esc(model._title ? fmt(model._title) : (model._intent ?? 'surface'));
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${title}</title>
<style>
:root{color-scheme:light}
*{box-sizing:border-box}
body{margin:0;font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;color:#17212b;background:#fff}
main{max-width:1100px;margin:0 auto;padding:32px 20px 80px}
.page-intent{color:#5b6a78;font-size:.9em;border-bottom:1px solid #e6eaf0;padding-bottom:10px}
.hero{border-bottom:2px solid #17212b;padding-bottom:18px;margin-bottom:26px}
.hero .fact .val{font-size:1.9em;font-weight:650}
article{margin:14px 0}
h3.title{margin:.2em 0 .4em;font-size:1.25em}
h4.intent{margin:.2em 0 .6em;font-weight:500;color:#5b6a78;font-size:.92em}
.group{border-top:1px solid #e6eaf0;padding-top:12px}
.compare{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;align-items:start}
.compare>.node{border:1px solid #e6eaf0;border-radius:10px;padding:12px;margin:0}
.timeline{border-left:2px solid #d6dde6;margin-left:8px;padding-left:18px}
.timeline .item{position:relative;padding:6px 0}
.timeline .item::before{content:"";position:absolute;left:-24px;top:14px;width:9px;height:9px;border-radius:50%;background:#17212b}
.items{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.items.ol{display:block}
.fact{display:flex;gap:10px;align-items:baseline;margin:3px 0}
.role{min-width:104px;color:#68788a;font-size:.78em;text-transform:uppercase;letter-spacing:.04em}
.val{font-variant-numeric:tabular-nums}
.expose{display:block;margin:8px 0}.expose .role{display:block;margin-bottom:4px}
.choice{display:inline-flex;gap:6px;align-items:center;margin:0 14px 6px 0;padding:6px 12px;border:1px solid #d6dde6;border-radius:8px}
fieldset.expose{border:1px solid #e6eaf0;border-radius:10px;padding:10px 12px}
legend{font-size:.8em;color:#68788a;text-transform:uppercase;letter-spacing:.04em}
input[type=text]{padding:7px 10px;border:1px solid #d6dde6;border-radius:8px;font:inherit}
.action{display:inline-block;margin:10px 0 0;padding:9px 18px;border-radius:9px;background:#17212b;color:#fff;text-decoration:none;border:0;font:inherit;cursor:pointer}
img{max-width:100%;border-radius:10px;display:block}
.level-1{opacity:.92}.level-2{opacity:.85}.level-3{opacity:.78}
</style></head>
<body><main><p class="page-intent">${intent}</p>${html}</main></body></html>
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [inp, out] = process.argv.slice(2);
  if (!inp) { console.error('usage: node m1/render.mjs <model.json> [out.html]'); process.exit(2); }
  const html = render(JSON.parse(fs.readFileSync(inp, 'utf8')));
  if (out) fs.writeFileSync(out, html); else process.stdout.write(html);
}
