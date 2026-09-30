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
  factsOf, FIELDS,
} from './model-lib.mjs';
// The axis-decision layer is shared, not re-derived per target (round 19; the node render
// plan round 22). This renderer consumes `nodePlan` and the plan helpers and only DRAWS
// the decisions as HTML — it holds no model semantics of its own.
import {
  CURRENCY_GLYPH, LIST_QUALIFIER, ROLE_UNIT, hasOwnUnit,
  labelOf, labelTextOf, compareRowKeys, nestedCollections, namedChildEntries,
  nodePlan, itemActionPlan, runPlan, compareCellOf, compareRowLabel, buildRefLabels,
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

// 集合条目的动作（F-031-§4 / F-020）：条目名是内容；带 label 的动作是源站自己的控件文字，
// 必须作为控件出现。二者同字时只渲染一遍（此时条目名降级为链接目标，不新增文案）。
// 可见性/作用域/「是否源站控件」在 axis.mjs（itemActionPlan）；这里只管 HTML 呈现。
function itemExtra(it, chain, ctx) {
  const a = itemActionPlan(it, chain, ctx.values);
  if (!a) return { linkTo: null, ctl: '' };
  const ctl = a.hasTarget ? `<a class="ctl" href="${esc(a.href)}">${esc(a.label)}</a>` : `<span class="ctl">${esc(a.label)}</span>`;
  return a.isControl ? { linkTo: null, ctl } : { linkTo: a.hasTarget ? a.href : null, ctl: '' };
}
function renderList(items, chain, ctx) {
  const lis = items.map((it) => {
    const v = labelOf(it);
    const label = v ? fmt(v) : '';
    if (!label) return '';
    const ex = itemExtra(it, chain, ctx);
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
    const ex = itemExtra(it, chain, ctx);
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
    const ex = itemExtra(it, chain, ctx);
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
    const ex = itemExtra(it, chain, ctx);
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
function renderRun(items, chain, hide, ctx) {
  // F-051 table/card threshold is a shared decision (`runPlan` in axis.mjs); this is only
  // the HTML shape of it: a `<table class="data">` with an optional row-ops column.
  const rp = runPlan(items);
  if (rp.isTable) {
    const anyOps = items.some((it) => namedChildEntries(it).length > 0);
    const showHead = rp.cols.some((c) => FIELDS[c]?.label) || anyOps;
    const head = showHead ? `<tr>${rp.cols.map((c) => `<th>${esc(FIELDS[c]?.label ?? '')}</th>`).join('')}${anyOps ? '<th></th>' : ''}</tr>` : '';
    const trs = items.map((it) => {
      const tds = rp.cols.map((col) => { const v = rp.cellValue(it, col); return `<td>${v ? fmt(v) : ''}</td>`; }).join('');
      const ops = namedChildEntries(it).map((ch) => renderNode(ch.node, [...chain, it], false, hide, ctx, 4)).join('');
      return `<tr>${tds}${anyOps ? `<td class="row-ops">${ops}</td>` : ''}</tr>`;
    }).join('');
    return `<table class="data"><thead>${head}</thead><tbody>${trs}</tbody></table>`;
  }
  return `<div class="cards">${items.map((it) => `<div class="item">${renderNode(it, [...chain, it], false, hide, ctx, 4)}</div>`).join('')}</div>`;
}

// The choice-set decision (`kind`, `rich`, options, columns) is shared in axis.mjs; this is
// the HTML drawing of it: a select table for rich options, a chipbar fieldset otherwise.
function renderSelectTable(ch, node, chain, hide, ctx) {
  const t = ch.table;
  const legend = ch.legend ? fmt(ch.legend) : esc(ch.name);
  // an all-blank header row is visual noise: emit the header only when a column is labeled (T-107)
  const head = t.showHead ? `<tr><th class="sel"></th>${t.cols.map((c) => `<th>${esc(t.labelKey(c))}</th>`).join('')}${t.anyOps ? '<th></th>' : ''}</tr>` : '';
  const rows = ch.options.map((o) => {
    const tds = t.cols.map((col) => { const v = t.cellValue(o.node, col); return `<td>${v ? fmt(v) : ''}</td>`; }).join('');
    const ops = o.ops.map((n) => renderNode(n, [...chain, o.node], false, hide, ctx, 4)).join('');
    const val = o.key ? `key:${o.key}` : String(o.index);
    return `<tr><td class="sel"><input type="${ch.multi ? 'checkbox' : 'radio'}" name="${esc(ch.name)}" value="${esc(val)}"></td>${tds}${t.anyOps ? `<td class="row-ops">${ops}</td>` : ''}</tr>`;
  }).join('');
  return `<fieldset class="expose expose-${esc(ch.name)}"><legend>${legend}</legend><table class="data"><thead>${head}</thead><tbody>${rows}</tbody></table></fieldset>`;
}
function renderChoice(ch, node, chain, hide, ctx) {
  if (ch.kind === 'plain-fact') {
    const lbl = ch.legend ? fmt(ch.legend) : '';
    const v = ch.itemName;
    return `<div class="defrow">${lbl ? `<div class="deflabel">${lbl}</div>` : ''}<div class="defval">${v ? fmt(v) : ''} ${ch.itemExtra.map((x) => fmt(x.value)).join(' ')}</div></div>`;
  }
  if (ch.kind === 'choice') {
    if (ch.rich) return renderSelectTable(ch, node, chain, hide, ctx);
    const opts = ch.options.map((o) => {
      const v = o.name ?? o.fieldsName;
      const extra = o.extra.map((x) => fmt(x.value)).join(' ');
      const label = (v && (v.text !== undefined || v.num !== undefined) ? fmt(v) : `option ${o.index + 1}`) + (extra ? ` <span class="choice-extra">${extra}</span>` : '');
      const val = o.key ? `key:${o.key}` : (v ? v.text : String(o.index));
      return `<label class="choice"><input type="${ch.multi ? 'checkbox' : 'radio'}" name="${esc(ch.name)}" value="${esc(val)}"> ${label}</label>`;
    }).join('');
    const legend = ch.legend ? fmt(ch.legend) : '';
    const hint = ch.hint ? `<span class="hint">${fmt(ch.hint)}</span>` : '';
    return `<fieldset class="expose chipbar expose-${esc(ch.name)}">${legend ? `<legend>${legend}</legend>` : ''}${hint}${opts}</fieldset>`;
  }
  if (ch.kind === 'bool') {
    // a boolean switch is a checkbox with its name on the control (F-031-§6), not an empty text box
    const name = (ch.legend ? fmt(ch.legend) : '') || (ch.nodeName ? fmt(ch.nodeName) : '');
    return `<label class="choice expose-${esc(ch.name)}"><input type="checkbox" name="${esc(ch.name)}" value="true"> ${name}</label>`;
  }
  const lbl = ch.legend ? fmt(ch.legend) : '';   // never print a raw identifier as a label
  const hint = ch.hint ? `<span class="hint">${fmt(ch.hint)}</span>` : '';
  const itype = ch.type === 'date' ? 'date' : (ch.type === 'time' ? 'datetime-local' : (ch.type === 'num' ? 'number' : 'text'));
  // aria-label 只放源站文案；无文案时绝不把内部标识符（expose name）写进属性
  return `<span class="expose expose-${esc(ch.name)}">${lbl ? `<span class="deflabel">${lbl}</span>` : ''}${hint}<input type="${itype}" name="${esc(ch.name)}" data-type="${esc(ch.type)}"${lbl ? ` aria-label="${esc(lbl)}"` : ''}></span>`;
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
  if (form === 'table') return renderRun(items, chain, hide, ctx);
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
    const a = itemActionPlan(it, chain, ctx.values);
    const name = labelTextOf(it);
    const ctl = a?.label ?? '';
    const otherFact = Boolean(name && ctl && !name.includes(ctl) && !ctl.includes(name));
    const text = name || ctl;
    if (!text) return '';
    const to = (s) => (a?.hasTarget ? `<a class="ctl" href="${esc(a.href)}">${s}</a>` : `<span class="ctl"${a?.verb ? ` data-verb="${esc(a.verb)}"` : ''}>${s}</span>`);
    return otherFact ? to(esc(text)) + to(esc(ctl)) : to(esc(text));
  }).join('');
  return btns ? `<div class="controls">${btns}</div>` : '';
}
// 横向对比表（F-031-§3）：行键/单元格/行标题/退化判定均在 axis.mjs；这里只管 HTML 呈现。
function renderCompareTable(items, chain, hide, ctx) {
  const rowKeys = compareRowKeys(items);
  const head = `<tr><th class="cmp-row"></th>${items.map((it) => {
    const name = it._name ?? it._title;
    const ex = itemExtra(it, chain, ctx);   // 实体自己的动作控件不得因进表而丢失（F-033）
    const label = name ? fmt(name) : '';
    const nm = label && ex.linkTo ? `<a href="${esc(ex.linkTo)}">${label}</a>` : label;
    const tag = it._tag ? `<span class="cmp-tag">${fmt(it._tag)}</span>` : '';
    const price = it._price ? `<div class="cmp-price">${fmt(it._price)}</div>` : '';
    const sum = (it._summary ? `<div class="cmp-sub">${fmt(it._summary)}</div>` : '')
      + (it._subtitle ? `<div class="cmp-sub">${fmt(it._subtitle)}</div>` : '');
    // 实体自己的嵌套集合（如机身颜色）属于该实体，渲染在它的列内——绝不与另一实体的列表按下标配对
    let nested = '';
    for (const col of nestedCollections(it)) nested += renderForm(col.form, col.items, [...chain, it], hide, ctx, 5, it);
    const nestedHtml = nested ? `<div class="cmp-nested">${nested}</div>` : '';
    const ctl = ex.ctl ? `<div class="cmp-ctl">${ex.ctl}</div>` : '';
    return `<th class="cmp-col">${nm}${tag}${price}${sum}${nestedHtml}${ctl}</th>`;
  }).join('')}</tr>`;
  const body = rowKeys.map((key) => {
    // never print an internal key as a row label (F-022/F-029): child title → declared field label → no label
    const label = compareRowLabel(items, key) ?? FIELDS[key]?.label ?? '';
    const cells = items.map((it) => {
      const c = compareCellOf(it, key);
      if (c.kind === 'empty') return '<td class="cmp-cell"></td>';
      if (c.kind === 'node') return `<td class="cmp-cell">${renderNode(c.node, [...chain, it], false, hide, ctx, 4)}</td>`;
      return `<td class="cmp-cell">${fmt(c.value)}</td>`;
    }).join('');
    return `<tr><th class="cmp-row">${esc(label)}</th>${cells}</tr>`;
  }).join('');
  return `<div class="cmp-scroll"><table class="cmp-table"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}

const renderAction = (a) => {
  // `verb` is internal semantics, never visible copy (F-022/F-029): no label ⇒ no text
  if (!a.label) return '';
  // no capture-backed target: keep the source's own words, shaped like a control (T-101/F-031-§4)
  return a.hasTarget
    ? `<a class="action verb-${esc(a.verb)}" href="${esc(a.href)}">${esc(a.label)}</a>`
    : `<span class="action-plain">${esc(a.label)}</span>`;
};

function renderNode(node, chain, isHero, hide, ctx, depth) {
  // The whole node decision is the shared plan (axis.mjs); this function draws it.
  const plan = nodePlan(node, { chain, values: ctx.values, hidden: hide.get(node), depth, degradations: ctx.degradations });
  if (!plan.visible) return '';

  // explicit labeled actions; label-less navigate/open lowers to the element's own link (F-020)
  let action = '';
  let linkTo = null;
  const titleIsControl = plan.titleIsControl;
  if (plan.action) {
    if (plan.action.isTitleControl || plan.action.isLabellessLink) linkTo = plan.action.linkTo;
    else if (plan.action.label) action = renderAction(plan.action);
  }

  // _primary FACT gets the enlarged hero slot (axis.mjs primarySlot); subtree primaries
  // stay in place (no reordering). Hiding the shown fact is per-target storage.
  let heroHtml = '';
  if (plan.primary) {
    heroHtml = `<div class="hero fact-hero">${factHtml(plan.primary.value)}</div>`;
    if (!hide.has(plan.primary.holder)) hide.set(plan.primary.holder, new Set());
    hide.get(plan.primary.holder).add(plan.primary.key);
  }

  let titleText = plan.headingValue ? fmt(plan.headingValue) : null;
  const cls = ['node', `depth-${Math.min(depth, 4)}`];
  if (isHero) cls.push('hero-branch');
  const demoted = plan.demoted;

  const itemsConsumed = new Set();
  let bodyLead = '';
  let heroImage = '';
  const metaParts = [];
  for (const f of plan.facts.list) {
    if (f.category === 'meta') metaParts.push(factHtmlInline(f.value));
    else if (f.category === 'unit') metaParts.push(roleFact(f));   // 评分/评分数：带角色与单位，不留裸数字
    // 显式原价事实 ⇒ 弱化（删除线）；`list` 标记不进文案（fmt 已忽略）
    else if (f.category === 'was') bodyLead += `<div class="fact was"><span class="val">${fmt(f.value)}</span></div>`;
    else bodyLead += factHtml(f.value);
  }
  if (metaParts.length) bodyLead += `<div class="meta">${metaParts.join('<span class="sep">·</span>')}</div>`;
  for (const f of plan.facts.fields) bodyLead += factHtml(f.value);
  if (plan.facts.hero) heroImage = imageFigures(plan.facts.hero);   // image-dominant main visual: edge-to-edge (F-031-§7)

  let body = '';
  if (plan.choice) body += renderChoice(plan.choice, node, chain, hide, ctx);
  if (plan.titleConsumed) titleText = null;   // the heading IS the switch label: show it once, on the control

  // every sibling block item renders in ONE form; nothing renders twice (T-103)
  // 轴分组（compare 实体/连续正文段/普通集合）在 axis.mjs seqGroupsOf；D2/P3 同理。
  const { groups, order } = plan.items;
  for (const g of groups) body += renderForm(g.form, g.items, chain, hide, ctx, depth, node);
  for (const g of groups) g.items.forEach((it) => itemsConsumed.add(it));
  // order:time shows a time axis only over a vertical sequence — never a stray rail across a grid (F-031-§1)
  if (order === 'time' && groups.length && groups.every((g) => g.form === 'deflist' || g.form === 'seq')) cls.push('timeline');
  // an empty collection still renders its empty-state storyline (F-013): every declared fact must render
  if (plan.emptyState) body += renderNode(plan.emptyState, [...chain, node], false, hide, ctx, depth + 1);

  // toolbar: consecutive action-only children render inline (grouping decided in plan.toolbar)
  if (plan.toolbar.length >= 2) {
    const tools = plan.toolbar.filter((n) => !itemsConsumed.has(n)).map((n) => {
      const a = itemActionPlan(n, [...chain, node], ctx.values);
      // `verb` is internal semantics, never visible copy (F-022/F-029): no label ⇒ no tool
      if (!a || !a.label) return '';
      return a.hasTarget ? `<a class="tool" href="${esc(a.href)}">${esc(a.label)}</a>` : `<span class="tool">${esc(a.label)}</span>`;
    }).filter(Boolean).join('');
    if (tools) body += `<div class="toolbar">${tools}</div>`;
    plan.toolbar.forEach((n) => itemsConsumed.add(n));
  }

  let prevGroupHadTitle = false;
  for (const c of plan.namedChildren) {
    if (itemsConsumed.has(c.node)) continue;
    const h = renderNode(c.node, [...chain, node], false, hide, ctx, depth + 1);
    if (!h) continue;
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
  const bareTitle = depth > 0 && titleText && !bodyLead && !heroHtml && !heroImage && !body && !action && !plan.hasAction;
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