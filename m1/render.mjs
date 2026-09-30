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
  childrenOf, factsOf, parseExpr, evalExpr, scopeFor, exposeOf, FIELDS,
} from './model-lib.mjs';
// The axis-decision layer is shared, not re-derived per target (round 19): form
// selection, comparability, compare-set verdict, shared constants and the
// `key:`→`#` target normalization live in ./axis.mjs. This renderer owns only the
// HTML presentation of those decisions.
import {
  CURRENCY_GLYPH, LIST_QUALIFIER, ROLE_UNIT, META_KEYS, hasOwnUnit, hasTarget, hrefOf,
  labelOf, labelTextOf, selectForm, compareRowKeys,
  actionVisible, itemScope, seqGroupsOf, primarySlot, buildRefLabels,
} from './axis.mjs';

const decodeEntities = (s) => String(s).replace(/&(nbsp|amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (m, e) => {
  const map = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  const k = e.toLowerCase();
  if (k in map) return map[k];
  const code = k.startsWith('#x') ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
  return Number.isFinite(code) ? String.fromCodePoint(code) : m;
});
const esc = (s) => decodeEntities(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// An `<img>` with no usable src is a broken icon in every browser (round-15 holdout
// finding: 25/69 uncrafted pages). The capture's alt text is a captured fact, so an
// image without a URL degrades to its alt text — never to `<img src="">`, and never
// to a made-up URL (F-055).
function imgHtml(src, alt) {
  const s = typeof src === 'string' ? src.trim() : '';
  const a = alt == null ? '' : String(alt);
  if (!s) return a ? `<span class="img-alt">${esc(a)}</span>` : '';
  return `<img src="${esc(s)}" alt="${esc(a)}">`;
}

// An `_image` fact value is either an image value or a `list` of them (the extractor
// collapses several images of one storyline into a list value). Both shapes are images.
function imageEntries(v) {
  if (!v || typeof v !== 'object') return [];
  if (Array.isArray(v.list)) return v.list.filter((e) => e && typeof e === 'object' && 'image' in e);
  return 'image' in v ? [v] : [];
}
const imageFigures = (v) => imageEntries(v)
  .map((e) => imgHtml(e.image, e.alt)).filter(Boolean)
  .map((img) => `<figure class="strip">${img}</figure>`).join('');

function fmt(v) {
  if (v === null || v === undefined) return '';
  if ('list' in v) return v.list.map((e) => `<span class="chip">${fmt(e)}</span>`).join(' ');
  if ('text' in v) return esc(v.text);
  if ('num' in v) return esc(v.num) + (v.unit ? ` ${esc(v.unit)}` : '');
  if ('money' in v) {
    const sym = CURRENCY_GLYPH[v.currency] ?? (v.currency ? esc(v.currency) + ' ' : '');
    // `list` 是内部语义标记，不是显示前缀（`from`/`起`/`订金` 等才是）
    const prefix = v.qualifier && v.qualifier !== LIST_QUALIFIER ? esc(v.qualifier) + ' ' : '';
    return prefix + sym + esc(v.money);
  }
  if ('date' in v) return esc(v.date);
  if ('bool' in v) return v.bool ? 'yes' : 'no';
  if ('icon' in v) return esc(v.icon);
  if ('video' in v) return `<a href="${esc(v.video)}">video</a>`;
  if ('image' in v) return imgHtml(v.image, v.alt);
  if ('ref' in v) {
    const raw = String(v.ref);
    const id = raw.replace(/^key:/, '').replace(/[^A-Za-z0-9_-]/g, '-');
    if (raw.startsWith('key:')) {
      const label = refLabels.get(raw.slice(4));
      return label ? `<a class="ref" href="#${esc(id)}">${esc(label)}</a>` : '';  // never print the raw key
    }
    return `<a class="ref" href="#${esc(id)}">${esc(raw)}</a>`;
  }
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

// 集合条目的动作（F-031-§4 / F-020）：条目名是内容；带 label 的动作是源站自己的控件文字，
// 必须作为控件出现。二者同字时只渲染一遍（此时条目名降级为链接目标，不新增文案）。
// 可见性与作用域判定在 axis.mjs（actionVisible/itemScope, F-042）；这里只管 HTML 呈现。
function itemExtra(it, scope) {
  const a = it._action;
  const content = labelTextOf(it);
  if (!a || !actionVisible(a, scope)) return { linkTo: null, ctl: '' };
  if (a.label && a.label !== content) {
    return { linkTo: null, ctl: hasTarget(a) ? `<a class="ctl" href="${esc(hrefOf(a.to))}">${esc(a.label)}</a>` : `<span class="ctl">${esc(a.label)}</span>` };
  }
  return { linkTo: hasTarget(a) ? hrefOf(a.to) : null, ctl: '' };
}
function renderList(items, chain, ctx) {
  const lis = items.map((it) => {
    const v = labelOf(it);
    const label = v ? fmt(v) : '';
    if (!label) return '';
    const ex = itemExtra(it, itemScope(it, chain, ctx));
    const inner = ex.linkTo ? `<a href="${esc(ex.linkTo)}">${label}</a>` : label;
    return `<li>${inner}${ex.ctl}</li>`;
  }).join('');
  return lis ? `<ul class="linklist${items.length > 4 && items.every((it) => ((labelOf(it)?.text) ?? '').length <= 12) ? ' cols2' : ''}">${lis}</ul>` : '';
}
// 有序集合（_rel.order = sequence|time）：每一项自成一行，顺序即语义（F-031-§1）
function renderSeq(items, chain, ctx) {
  const lis = items.map((it) => {
    const v = labelOf(it);
    const label = v ? fmt(v) : '';
    if (!label) return '';
    const ex = itemExtra(it, itemScope(it, chain, ctx));
    const inner = ex.linkTo ? `<a href="${esc(ex.linkTo)}">${label}</a>` : label;
    return `<li>${inner}${ex.ctl}</li>`;
  }).join('');
  return lis ? `<ol class="seq">${lis}</ol>` : '';
}
function renderImageStrip(items) {
  return items.map((it) => imageFigures(it._image)).join('');
}
function factHtmlInline(v) {
  const h = factHtml(v);
  return h.replace(/^<div class="fact">|<\/div>$/g, '').replace(/^<span class="val">|<\/span>$/g, '');
}
function renderProse(items) {
  return `<div class="prose">${items.map((it) => {
    const t = labelOf(it);
    return t ? `<p>${fmt(t)}</p>` : '';
  }).join('')}</div>`;
}

// `key:` 标签索引：构建规则在 axis.mjs（buildRefLabels）；这里只保存结果供 fmt() 使用。
let refLabels = new Map();
function renderChips(items, chain, ctx) {
  const chips = items.map((it) => {
    const v = labelOf(it);
    const label = v ? fmt(v) : '';
    if (!label) return '';            // no label, no chip (never an empty control)
    const ex = itemExtra(it, itemScope(it, chain, ctx));
    const inner = ex.linkTo ? `<a href="${esc(ex.linkTo)}">${label}</a>` : label;
    return `<span class="chip-item">${inner}${ex.ctl}</span>`;
  }).join('');
  // 成员是句子或带旁注（含句读/括号）时不排成一行 chip 流：每条自成一行（F-031-§1）
  const rows = items.some((it) => /[，。；、（）：]/.test(labelTextOf(it)));
  return chips ? `<div class="chips${rows ? ' chips-rows' : ''}">${chips}</div>` : '';
}
// 角色单位兜底（ROLE_UNIT / hasOwnUnit 见 axis.mjs）：事实自带 unit 时绝不追加，否则两个单位连排（「870 人好评 条评价」，F-037）
const roleFact = (f) => `${fmt(f.value)}${ROLE_UNIT[f.key] && !hasOwnUnit(f.value) ? ` ${ROLE_UNIT[f.key]}` : ''}`;
function renderDeflist(items, chain, ctx) {
  const rows = items.map((it) => {
    const label = it._name ?? it._title;
    const rest = factsOf(it).filter((x) => !['_name', '_title'].includes(x.key));
    const l0 = label ? fmt(label) : '';
    const ex = itemExtra(it, itemScope(it, chain, ctx));
    const l = l0 && ex.linkTo ? `<a href="${esc(ex.linkTo)}">${l0}</a>` : l0;
    const v = (rest.map((x) => roleFact(x)).join(' ') + (ex.ctl ? ` ${ex.ctl}` : '')).trim();
    if (!l && !v) return '';
    // no empty label cell: an unlabeled row keeps its full width (F-031-§5)
    return `<div class="defrow">${l ? `<div class="deflabel">${l}</div>` : ''}<div class="defval">${v}</div></div>`;
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
  // F-051（明文规则见 docs/m1/layout-axes.md §3.3）：表 = 身份列（成员名，有则必含）+ 已声明属性列。
  // 属性列 = `_fields` 的键 ∪ 非 name 角色事实。成立条件：有身份列 ⇒ 属性列 ≥2；无身份列 ⇒ 属性列 ≥2
  // 且至少一列有已声明列标签（列名只来自已声明域字段，不印内部键）。单列不是表（那是列表）；
  // 身份列 + 1 个属性列不是表（那是 deflist）。旧的「≥3 列」阈值把源站 2 列价目表（标签|价格）一律降级成卡片。
  const named = run.some((c) => Boolean(c.node._name ?? c.node._title));
  const attrs = [...new Set(run.flatMap((c) => [...fieldKeys(c.node), ...factsOf(c.node).filter((f) => !['_name', '_title'].includes(f.key)).map((f) => f.key)]))];
  const cols = named ? ['_name', ...attrs] : attrs;
  const isTable = attrs.length >= 2 && (named || attrs.some((c) => FIELDS[c]?.label));
  const valuesOf = (n, col) => {
    if (col === '_name') return n._name ? fmt(n._name) : (n._title ? fmt(n._title) : '');
    const fv = n._fields?.[col];
    if (fv) return fmt(fv);
    const f = factsOf(n).find((x) => x.key === col);
    return f ? fmt(f.value) : '';
  };
  if (isTable) {
    const anyOps = run.some((c) => childrenOf(c.node).some((ch) => !ch.key.startsWith('_items[')));
    const showHead = cols.some((c) => FIELDS[c]?.label) || anyOps;
    const head = showHead ? `<tr>${cols.map((c) => `<th>${esc(FIELDS[c]?.label ?? '')}</th>`).join('')}${anyOps ? '<th></th>' : ''}</tr>` : '';
    const trs = run.map((c) => {
      const tds = cols.map((col) => `<td>${valuesOf(c.node, col)}</td>`).join('');
      const ops = childrenOf(c.node).filter((ch) => !ch.key.startsWith('_items['))
        .map((ch) => renderNode(ch.node, [...chain, c.node], false, hide, ctx, 4)).join('');
      return `<tr>${tds}${anyOps ? `<td class="row-ops">${ops}</td>` : ''}</tr>`;
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
  const labelOfKey = (c) => FIELDS[c]?.label ?? (c === '_name' ? '' : '');
  const anyOps = items.some((it) => childrenOf(it).some((ch) => !ch.key.startsWith('_items[')));
  // an all-blank header row is visual noise: emit the header only when a column is labeled (T-107)
  const showHead = cols.some((c) => labelOfKey(c)) || anyOps;
  const head = showHead ? `<tr><th class="sel"></th>${cols.map((c) => `<th>${esc(labelOfKey(c))}</th>`).join('')}${anyOps ? '<th></th>' : ''}</tr>` : '';
  const rows = items.map((it) => {
    const tds = cols.map((col) => `<td>${valuesOf(it, col)}</td>`).join('');
    const ops = childrenOf(it).filter((ch) => !ch.key.startsWith('_items['))
      .map((ch) => renderNode(ch.node, [...chain, it], false, hide, ctx, 4)).join('');
    const val = it._key ? `key:${it._key}` : String(items.indexOf(it));
    return `<tr><td class="sel"><input type="${multi ? 'checkbox' : 'radio'}" name="${esc(exp.name)}" value="${esc(val)}"></td>${tds}${anyOps ? `<td class="row-ops">${ops}</td>` : ''}</tr>`;
  }).join('');
  return `<fieldset class="expose expose-${esc(exp.name)}"><legend>${legend}</legend><table class="data"><thead>${head}</thead><tbody>${rows}</tbody></table></fieldset>`;
}

function renderForm(form, items, chain, hide, ctx, depth, node) {
  if (form === 'compare-table') return renderCompareTable(items, chain, hide, ctx);
  if (form === 'chips') return renderChips(items, chain, ctx);
  if (form === 'list') return renderList(items, chain, ctx);
  if (form === 'seq') return renderSeq(items, chain, ctx);
  if (form === 'controls') return renderControls(items, chain, ctx);
  if (form === 'stack') return renderStack(items, chain, hide, ctx, depth);
  if (form === 'image-strip') return renderImageStrip(items);
  if (form === 'prose') return renderProse(items);
  if (form === 'deflist') return renderDeflist(items, chain, ctx);
  if (form === 'accordion') return renderAccordion(items, chain, hide, ctx);
  if (form === 'table') {
    let out = renderRun(items.map((it) => ({ key: '_items[x]', node: it })), chain, hide, ctx);
    if ((node._items ?? []).length === 0 && node._empty) out += renderNode(node._empty, [...chain, node], false, hide, ctx, depth + 1);
    return out;
  }
  const cls = form === 'product-cards' ? 'cards product-cards' : 'cards';
  const cards = items.map((it) => {
    const inner = renderNode(it, [...chain, node], false, hide, ctx, depth + 1);
    return inner ? `<div class="item">${inner}</div>` : '';
  }).join('');
  return cards ? `<div class="${cls}">${cards}</div>` : '';
}

// 序列：不可比的区块各自成立，各带标题；无标题块用区域分隔（F-031-§1/§5）
function renderStack(items, chain, hide, ctx, depth) {
  let out = '';
  let prevHadTitle = false;
  for (const it of items) {
    const inner = renderNode(it, [...chain], false, hide, ctx, depth + 1);
    if (!inner) continue;
    const hasTitle = Boolean(it._title || it._name || it._text);
    if (!hasTitle && prevHadTitle) out += '<hr class="region">';
    out += `<section class="block">${inner}</section>`;
    prevHadTitle = hasTitle;
  }
  return out;
}
// 控件条：_action-only 成员是控件，不是内容（F-031-§4）；动作 label 是源站自己的控件文字（F-022），
// 与条目名不是同一事实时另出一枚控件；同一事实的两种写法（一个包含另一个）只渲染信息更全的一处。
function renderControls(items, chain, ctx) {
  const btns = items.map((it) => {
    // a conditional action that the scope suppresses hides only the control; the
    // member's own name is content and still renders (F-042, F-031-§4)
    const a = actionVisible(it._action, itemScope(it, chain, ctx)) ? it._action : null;
    const name = labelTextOf(it);
    const ctl = a?.label ?? '';
    const otherFact = Boolean(name && ctl && !name.includes(ctl) && !ctl.includes(name));
    const text = name || ctl;
    if (!text) return '';
    const to = (s) => (hasTarget(a) ? `<a class="ctl" href="${esc(hrefOf(a.to))}">${s}</a>` : `<span class="ctl"${a?.verb ? ` data-verb="${esc(a.verb)}"` : ''}>${s}</span>`);
    return otherFact ? to(esc(text)) + to(esc(ctl)) : to(esc(text));
  }).join('');
  return btns ? `<div class="controls">${btns}</div>` : '';
}
// 横向对比表（F-031-§3）：对照集的行键/退化判定在 axis.mjs；这里只管 HTML 呈现。
function renderCompareTable(items, chain, hide, ctx) {
  const rowKeys = compareRowKeys(items);
  const cellOf = (it, key) => {
    if (it._fields?.[key]) return fmt(it._fields[key]);
    const f = factsOf(it).find((x) => x.key === key);
    if (f) return fmt(f.value);
    const c = childrenOf(it).find((x) => x.key === key) ?? childrenOf(it).find((x) => x.key.replace(/\[\d+\]$/, '') === key);
    if (!c) return '';
    const node = c.node;
    const only = node._detail ?? node._text ?? node._name ?? node._title;
    const rich = (node._items ?? []).length > 0
      || Object.keys(node._fields ?? {}).length > 0
      || childrenOf(node).some((x) => !x.key.startsWith('_items['))
      || factsOf(node).length > 1;
    if (only && !rich) return fmt(only);
    return renderNode(node, [...chain, it], false, hide, ctx, 4);
  };
  const head = `<tr><th class="cmp-row">${esc(items[0]._name ? '' : '')}</th>${items.map((it) => {
    const name = it._name ?? it._title;
    const ex = itemExtra(it, itemScope(it, chain, ctx));   // 实体自己的动作控件不得因进表而丢失（F-033）
    const label = name ? fmt(name) : '';
    const nm = label && ex.linkTo ? `<a href="${esc(ex.linkTo)}">${label}</a>` : label;
    const tag = it._tag ? `<span class="cmp-tag">${fmt(it._tag)}</span>` : '';
    const price = it._price ? `<div class="cmp-price">${fmt(it._price)}</div>` : '';
    const sum = (it._summary ? `<div class="cmp-sub">${fmt(it._summary)}</div>` : '')
      + (it._subtitle ? `<div class="cmp-sub">${fmt(it._subtitle)}</div>` : '');
    // 实体自己的嵌套集合（如机身颜色）属于该实体，渲染在它的列内——绝不与另一实体的列表按下标配对
    let nested = '';
    for (const arrKey of ['_items', '_lines']) {
      const arr = it[arrKey];
      if (Array.isArray(arr) && arr.length) {
        const f = selectForm(arr, it._rel?.order);
        nested += renderForm(f, arr, [...chain, it], hide, ctx, 5, it);
      }
    }
    const nestedHtml = nested ? `<div class="cmp-nested">${nested}</div>` : '';
    const ctl = ex.ctl ? `<div class="cmp-ctl">${ex.ctl}</div>` : '';
    return `<th class="cmp-col">${nm}${tag}${price}${sum}${nestedHtml}${ctl}</th>`;
  }).join('')}</tr>`;
  // row label: prefer the child block's own title/name (F-031-§3), then the declared field label
  const childLabel = (key) => {
    for (const it of items) {
      const c = childrenOf(it).find((x) => x.key === key || x.key.replace(/\[\d+\]$/, '') === key);
      const t = c && (c.node._title ?? c.node._name);
      if (t?.text) return t.text;
    }
    return null;
  };
  const body = rowKeys.map((key) => {
    // never print an internal key as a row label (F-022/F-029): child title → declared field label → no label
    const label = childLabel(key) ?? FIELDS[key]?.label ?? '';
    return `<tr><th class="cmp-row">${esc(label)}</th>${items.map((it) => `<td class="cmp-cell">${cellOf(it, key)}</td>`).join('')}</tr>`;
  }).join('');
  return `<div class="cmp-scroll"><table class="cmp-table"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}

const actionHtml = (a) => {
  // `verb` is internal semantics, never visible copy (F-022/F-029): no label ⇒ no text
  if (!a.label) return '';
  // no capture-backed target: keep the source's own words, shaped like a control (T-101/F-031-§4)
  return hasTarget(a)
    ? `<a class="action verb-${esc(a.verb)}" href="${esc(hrefOf(a.to))}">${esc(a.label)}</a>`
    : `<span class="action-plain">${esc(a.label)}</span>`;
};

function renderNode(node, chain, isHero, hide, ctx, depth) {
  if (node === null || typeof node !== 'object') return '';
  const scope = { ...ctx.values, ...scopeFor([...chain, node], ctx.values) };
  if (typeof node._when === 'string') {
    const ast = parseExpr(node._when);
    if (ast.ok && !evalExpr(ast, scope)) return '';
  }
  const headingKey = node._title ? '_title' : (node._name ? '_name' : null);

  // explicit labeled actions; label-less navigate/open lowers to the element's own link (F-020)
  let action = '';
  let linkTo = null;
  let titleIsControl = false;
  if (actionVisible(node._action, scope)) {
    const a = node._action;
    const titleTxt = headingKey ? (node[headingKey]?.text ?? '') : '';
    if (a.label && titleTxt && a.label === titleTxt) {
      // the block's own heading is the control: render it as such, once (F-031-§4)
      linkTo = hasTarget(a) ? hrefOf(a.to) : null;
      titleIsControl = true;
    } else {
    const labelless = !a.label && ['navigate', 'open'].includes(a.verb);
    if (labelless && a.to && (/^https?:/i.test(a.to) || a.to.startsWith('/') || a.to.startsWith('key:'))) {
      linkTo = hrefOf(a.to);
    } else {
      action = actionHtml(a);
    }
    }
  }

  // _primary FACT gets the enlarged hero slot (axis.mjs primarySlot); subtree primaries
  // stay in place (no reordering). Hiding the shown fact is per-target storage.
  let heroHtml = '';
  const slot = primarySlot(node, headingKey);
  if (slot) {
    heroHtml = `<div class="hero fact-hero">${factHtml(slot.value)}</div>`;
    if (!hide.has(slot.holder)) hide.set(slot.holder, { keys: new Set(), nodes: new Set() });
    hide.get(slot.holder).keys.add(slot.key);
  }

  const hid = hide.get(node);
  const kids = childrenOf(node).filter((c) => !(hid?.nodes.has(c.node)));
  const facts = factsOf(node).filter((f) => !(hid?.keys.has(f.key)));
  let titleText = headingKey ? fmt(node[headingKey]) : null;

  const cls = ['node', `depth-${Math.min(depth, 4)}`];
  if (isHero) cls.push('hero-branch');
  const demoted = (node._rel?.level ?? 0) >= 2;

  const exp = exposeOf(node);
  const itemsConsumed = new Set();
  let bodyLead = '';
  let heroImage = '';
  const metaParts = [];
  for (const f of facts) {
    if (headingKey && f.key === headingKey) continue;
    if (exp && (f.key === '_label' || f.key === '_summary')) continue;
    if (f.key === '_brand' && depth === 0) continue;   // the site header already carries the brand (one fact, one place)
    if (f.key === '_image' && depth === 0) {           // image-dominant main visual: edge-to-edge (F-031-§7)
      const heroInner = imageFigures(f.value);
      heroImage = heroInner;
      continue;
    }
    if (META_KEYS.has(f.key)) { metaParts.push(factHtmlInline(f.value)); continue; }
    if (ROLE_UNIT[f.key]) { metaParts.push(roleFact(f)); continue; }   // 评分/评分数：带角色与单位，不留裸数字
    // 显式原价事实 ⇒ 弱化（删除线）；`list` 标记不进文案（fmt 已忽略）
    if (f.key === '_amount' && f.value?.qualifier === LIST_QUALIFIER) {
      bodyLead += `<div class="fact was"><span class="val">${fmt(f.value)}</span></div>`;
      continue;
    }
    bodyLead += factHtml(f.value);
  }
  if (metaParts.length) bodyLead += `<div class="meta">${metaParts.join('<span class="sep">·</span>')}</div>`;
  if (node._fields) for (const [k, v] of Object.entries(node._fields)) bodyLead += factHtml(v);

  const ordered = kids.filter((c) => c.key.startsWith('_lines[') || c.key.startsWith('_items['));

  let body = '';
  if (exp && node._items?.length && node._items.length < 2) {
    // a one-option "choice" is not a choice: render the fact plainly (F-030)
    const it = node._items[0];
    const v = it._name ?? it._title;
    const extra = factsOf(it).filter((x) => !['_name', '_title'].includes(x.key));
    const lbl = node._label ? fmt(node._label) : '';
    body += `<div class="defrow">${lbl ? `<div class="deflabel">${lbl}</div>` : ''}<div class="defval">${v ? fmt(v) : ''} ${extra.map((x) => fmt(x.value)).join(' ')}</div></div>`;
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
    const legend = node._label ? fmt(node._label) : '';
    const hint = node._summary ? `<span class="hint">${fmt(node._summary)}</span>` : '';
    body += `<fieldset class="expose chipbar expose-${esc(exp.name)}">${legend ? `<legend>${legend}</legend>` : ''}${hint}${opts}</fieldset>`;
    // the choice set IS the rendering of these items — nothing renders again below
    node._items.forEach((it) => itemsConsumed.add(it));
  } else if (exp) {
    const lbl = node._label ? fmt(node._label) : '';   // never print a raw identifier as a label
    const hint = node._summary ? `<span class="hint">${fmt(node._summary)}</span>` : '';
    if (exp.type === 'bool') {
      // a boolean switch is a checkbox with its name on the control (F-031-§6), not an empty text box
      const name = lbl || (node._name ? fmt(node._name) : (node._title ? fmt(node._title) : ''));
      if (headingKey) titleText = null;   // the heading IS the switch label: show it once, on the control
      body += `<label class="choice expose-${esc(exp.name)}"><input type="checkbox" name="${esc(exp.name)}" value="true"> ${name}</label>`;
    } else {
      const itype = exp.type === 'date' ? 'date' : (exp.type === 'time' ? 'datetime-local' : (exp.type === 'num' ? 'number' : 'text'));
      // aria-label 只放源站文案；无文案时绝不把内部标识符（expose name）写进属性
      body += `<span class="expose expose-${esc(exp.name)}">${lbl ? `<span class="deflabel">${lbl}</span>` : ''}${hint}<input type="${itype}" name="${esc(exp.name)}" data-type="${esc(exp.type)}"${lbl ? ` aria-label="${esc(lbl)}"` : ''}></span>`;
    }
  }

  // every sibling block item renders in ONE form; nothing renders twice (T-103)
  const rawItems = ordered.map((c) => c.node).filter((it) => !itemsConsumed.has(it));
  // 轴分组：compare 标记的连续成员 = 被对照的实体（表），其余按各自形态（F-031-§3）。
  // D2：标记落在集合节点上等价于“它的全部成员都是对照实体”（位置无关）。
  // P3（提案 §6 决策 3 方案 A）：连续的 `_text` 段合并为一个正文块——段落不是区块，
  // 之间不插 `<hr class="region">`。只有**成串（≥2）**的 `_text` 才切出来；孤立的
  // `_text` 段保持原有集合形态（避免为单个事实改动既有页面）。
  const { groups, order } = seqGroupsOf(rawItems, node, ctx.degradations);
  for (const g of groups) body += renderForm(g.form, g.items, chain, hide, ctx, depth, node);
  // order:time shows a time axis only over a vertical sequence — never a stray rail across a grid (F-031-§1)
  if (order === 'time' && groups.length && groups.every((g) => g.form === 'deflist' || g.form === 'seq')) cls.push('timeline');
  // an empty collection still renders its empty-state storyline (F-013): every declared fact must render
  if (Array.isArray(node._items) && node._items.length === 0 && node._empty) {
    body += renderNode(node._empty, [...chain, node], false, hide, ctx, depth + 1);
  }
  if (false) {
  if (form === 'chips') {
    body += renderChips(rawItems, chain, hide, ctx);
  } else if (form === 'list') {
    body += renderList(rawItems, chain, ctx);
  } else if (form === 'compare-table') {
    body += renderCompareTable(rawItems, chain, hide, ctx);
  } else if (form === 'controls') {
    body += renderControls(rawItems, chain, ctx);
  } else if (form === 'stack') {
    body += renderStack(rawItems, chain, hide, ctx, depth);
  } else if (form === 'prose') {
    body += renderProse(rawItems);
  } else if (form === 'deflist') {
    body += renderDeflist(rawItems, chain, ctx);
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
  }
  rawItems.forEach((it) => itemsConsumed.add(it));

  // toolbar: consecutive action-only children render inline
  const actionKids = kids.filter((c) => !itemsConsumed.has(c.node) && !ordered.includes(c) && c.node._action &&
    factsOf(c.node).length === 0 && childrenOf(c.node).length === 0 &&
    actionVisible(c.node._action, { ...ctx.values, ...scopeFor([...chain, node, c.node], ctx.values) }));
  if (actionKids.length >= 2) {
    const tools = actionKids.map((c) => {
      const a = c.node._action;
      // `verb` is internal semantics, never visible copy (F-022/F-029): no label ⇒ no tool
      if (!a.label) return '';
      return a.to && (/^https?:/i.test(a.to) || a.to.startsWith('/') || a.to.startsWith('key:'))
        ? `<a class="tool" href="${esc(hrefOf(a.to))}">${esc(a.label)}</a>` : `<span class="tool">${esc(a.label)}</span>`;
    }).filter(Boolean).join('');
    if (tools) body += `<div class="toolbar">${tools}</div>`;
    actionKids.forEach((c) => itemsConsumed.add(c.node));
  }

  let prevGroupHadTitle = false;
  for (const c of kids) {
    if (itemsConsumed.has(c.node)) continue;
    const h = renderNode(c.node, [...chain, node], false, hide, ctx, depth + 1);
    if (!h) continue;
    if (c.key.startsWith('_items[')) {
      body += `<div class="item">${h}</div>`;
      continue;
    }
    // 兄弟区块：无标题块紧随有标题块 ⇒ 区域分隔，读者不把两段读成一串（F-031-§5）
    const hasTitle = Boolean(c.node._title || c.node._name || c.node._text);
    if (!hasTitle && prevGroupHadTitle) body += '<hr class="region">';
    body += `<section class="group g-${esc(c.key)}">${h}</section>`;
    prevGroupHadTitle = hasTitle;
  }

  // a control whose only content is its own title renders as a control bar, not a promo card (F-031-§4)
  if (depth > 0 && titleText && (titleIsControl || linkTo) && !bodyLead && !heroHtml && !heroImage && !body && !action) {
    const inner = linkTo ? `<a class="ctl" href="${esc(linkTo)}">${titleText}</a>` : `<span class="ctl">${titleText}</span>`;
    return `<div class="controls">${inner}</div>`;
  }
  // a bare-title block (source banners/ads) is a promo card, never a section heading (T-106)
  const bareTitle = depth > 0 && titleText && !bodyLead && !heroHtml && !heroImage && !body && !action && !node._action;
  if (bareTitle) {
    const img = node._image ? imageEntries(node._image).map((e) => imgHtml(e.image, e.alt)).join('') : '';
    return `<div class="promo${img ? ' promo-image' : ''}">${img}${titleText ? `<span class="promo-label">${titleText}</span>` : ''}</div>`;
  }

  const headingLevel = Math.min(depth + 1, 6);
  const headingTag = depth === 0 ? 'h1' : `h${headingLevel}`;
  let head = '';
  if (titleText) {
    const t = titleIsControl
      ? (linkTo ? `<a class="ctl" href="${esc(linkTo)}">${titleText}</a>` : `<span class="ctl">${titleText}</span>`)
      : (linkTo ? `<a class="self-link" href="${esc(linkTo)}">${titleText}</a>` : titleText);
    head = `<${headingTag} class="title${titleIsControl ? ' title-control' : ''}">${t}</${headingTag}>`;
  }

  const anchorId = node._key ? ` id="${esc(String(node._key).replace(/[^A-Za-z0-9_-]/g, '-'))}"` : '';
  // nothing to say: emit nothing at all (never an empty block)
  if (!head && !bodyLead && !heroHtml && !heroImage && !body && !action) return '';
  const article = `<article${anchorId} class="${cls.join(' ')}">${head}${heroImage}${bodyLead}${heroHtml}${body}${action}</article>`;
  return demoted ? `<aside class="zone">${article}</aside>` : article;
}

// expose groups skip their label/summary facts in bodyLead (they become legend/hint)
// `report` (optional): an array the renderer appends compare degradations to (D2 audit)
export function render(model, context = {}, report = null) {
  refLabels = buildRefLabels(model);
  const hide = new Map();
  const ctx = { values: context.values ?? {}, degradations: report ?? [] };
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
.timeline{border-left:2px solid #d6dde6;margin-left:8px;padding-left:18px}
.timeline .item{position:relative;padding:6px 0}
.timeline .item::before{content:"";position:absolute;left:-24px;top:14px;width:9px;height:9px;border-radius:50%;background:#17212b}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;align-items:start}
.cards .item{border:1px solid #e6eaf0;border-radius:10px;padding:12px;margin:0}
.fact{margin:3px 0}
.fact.was .val{text-decoration:line-through;color:#8493a3;font-weight:400}
.val{overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.chips-rows{display:block}
.chips-rows .chip-item{padding:3px 0}
.cards .item img,.run .item img,.cards img{width:100%;height:150px;object-fit:cover;border-radius:8px;display:block}
.action-plain{display:inline-block;padding:7px 16px;border:1px solid #c9d3de;border-radius:999px;color:#0b62d0;font-size:.95em;font-weight:600}
.promo{border:1px solid #e3e8ee;background:#f8fafc;border-radius:10px;padding:10px 14px;color:#33475b;font-weight:600;margin:10px 0}
.promo-image{padding:0;overflow:hidden}
.promo-image img{width:100%;height:auto;display:block;border-radius:9px}
.promo-label{display:block;padding:8px 12px}
.meta{display:flex;flex-wrap:wrap;gap:0 6px;color:#5b6a78;font-size:.9em;margin-top:2px}
.meta .sep{color:#c2ccd6}
.prose p{margin:.5em 0;line-height:1.75;max-width:74ch}
/* F-031-§7 图像主导页：满幅图带 */
.strip{margin:0;padding:0}
.strip img{width:100%;height:auto;display:block}
/* F-055 无源图片：退化为已抓取的 alt 文本（绝不输出空 src 的 img 标签） */
.img-alt{display:block;color:#5b6a78;font-size:.9em;padding:8px 12px;background:#f4f7fa;border-radius:8px}
.promo-image .img-alt{padding:10px 14px;border-radius:0}
main>.node>.strip:first-child,article>.strip{margin:0}
/* F-031: 序列区块（不可比内容各自成立） */
.block{margin:18px 0;padding:0 0 6px}
.block>.node{max-width:none}
hr.region{border:0;border-top:1px solid #e3e8ee;margin:22px 0}
/* F-031-§4 控件条 */
.controls{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0}
.ctl{display:inline-block;padding:7px 16px;border:1px solid #c9d3de;border-radius:999px;color:#0b62d0;font-size:.95em;text-decoration:none;background:#fff}
a.ctl{font-weight:600}
a.ctl:hover{background:#f2f7ff}
/* F-031-§3 横向对比表：列=实体 行=属性，不换行可横滚 */
.cmp-scroll{overflow-x:auto;margin:14px 0;border:1px solid #e6eaf0;border-radius:10px}
.cmp-table{border-collapse:collapse;width:100%;font-size:.95em}
.cmp-table th,.cmp-table td{border-bottom:1px solid #eef2f6;padding:10px 12px;vertical-align:top;text-align:left}
.cmp-table th.cmp-row{white-space:nowrap;color:#5b6a78;font-weight:600;background:#fafcfe;width:1%;position:sticky;left:0}
.cmp-table th.cmp-col{min-width:210px;font-size:1.02em;color:#13202c}
.cmp-tag{display:inline-block;margin-left:6px;font-size:.78em;color:#0b62d0;background:#eaf3ff;border-radius:999px;padding:1px 8px}
.cmp-price{font-weight:700;margin-top:4px}
.cmp-sub{color:#5b6a78;font-size:.92em;margin-top:2px}
.cmp-ctl{margin-top:6px}
.linklist{margin:8px 0;padding-left:1.1em}
.linklist.cols2{columns:2;column-gap:28px}
.linklist li{margin:5px 0;line-height:1.5}
.linklist a{color:#0b62d0}
.seq{margin:8px 0;padding-left:1.5em}
.seq li{margin:4px 0;line-height:1.55}
.seq a{color:#0b62d0}
.chip-item{display:block;break-inside:avoid;padding:4px 0;font-size:.95em}
.chips a{color:inherit;text-decoration:none}
.chips a:hover{text-decoration:underline}
.deflist{margin:8px 0}
.defrow{display:flex;gap:14px;padding:7px 0;border-bottom:1px dashed #eef1f5;align-items:baseline}
.deflabel{min-width:130px;font-weight:600}
.deflabel a{color:inherit;text-decoration:none}
.timeline .defrow{position:relative}
.timeline .defrow::before{content:"";position:absolute;left:-24px;top:14px;width:9px;height:9px;border-radius:50%;background:#17212b}
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

// Same render, plus the explicit compare-degradation list (D2). The HTML of
// render(model, ctx) is unchanged: the audit only observes what the renderer did.
export function renderWithAudit(model, context = {}) {
  const degradations = [];
  const html = render(model, context, degradations);
  return { html, degradations };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [inp, out] = process.argv.slice(2);
  if (!inp) { console.error('usage: node m1/render.mjs <model.json> [out.html]'); process.exit(2); }
  const html = render(JSON.parse(fs.readFileSync(inp, 'utf8')));
  if (out) fs.writeFileSync(out, html); else process.stdout.write(html);
}