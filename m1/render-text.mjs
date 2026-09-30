// Second render target for the SAME M1 blueprint (round-18 "one model, any target" test).
//
// HARD CONSTRAINT: imports ONLY ./model-lib.mjs (shared model semantics).
// It must NOT import ./render.mjs. Every piece of axis/decision knowledge this file had
// to RE-DERIVE from render.mjs is recorded in .scratch/18-second-target/report.md
// §语义泄漏清单 — that list is the point of this exercise, not an accident.
//
// Axis semantics (docs/m1/layout-axes.md F-031) expressed in plain text:
//   comparable ("同一行")   -> text table laid out HORIZONTALLY (members = columns)
//   stack / not comparable  -> vertical sections, each with its own heading
//   _rel {compare:true}    -> table with the entities as COLUMNS
//   image                   -> its alt text, annotated [图片]
//   control (_action.label) -> [标签]
//   _expose                 -> "( ) option" (single) / "[ ] option" (multiple)
//   _rel.level >= 2         -> indented "参考" section
//   _when                   -> scoped evaluation via the same scopeFor() as model-lib
//
// Usage: node m1/render-text.mjs <model.json> <out.txt>
import fs from 'node:fs';
import {
  childrenOf, factsOf, parseExpr, evalExpr, scopeFor,
  exposeOf, FIELDS,
} from './model-lib.mjs';
// The axis-decision layer is SHARED with the HTML target (round 19): this file no
// longer re-copies `selectForm`/`comparable`/`compareSetVerdict`/constants from
// `render.mjs`. It imports only the shared model layer and ./axis.mjs — never a
// renderer. See .scratch/19-shared-axis/report.md.
import {
  labelOf, labelTextOf, selectForm, compareRowKeys,
  CURRENCY_GLYPH, LIST_QUALIFIER, ROLE_UNIT, META_KEYS, hasOwnUnit,
  actionVisible, itemScope, seqGroupsOf, primarySlot,
} from './axis.mjs';

// role-fact display (target-local): the human `ROLE_LABEL` map is text-only copy.
const ROLE_LABEL = {
  _title: '', _name: '', _label: '', _subtitle: '副标题', _summary: '', _detail: '', _text: '',
  _category: '分类', _tag: '标签', _status: '状态', _variant: '版本', _option: '选项',
  _count: '数量', _measure: '规格', _stock: '库存', _price: '价格', _amount: '金额',
  _datetime: '时间', _duration: '时长', _deadline: '截止', _author: '作者', _source: '来源',
  _provider: '提供方', _brand: '品牌', _image: '图片', _video: '视频', _icon: '图标',
  _rating: '评分', '_rating-count': '评价数', _ref: '引用', _place: '地点', _region: '地区', _audience: '受众',
};

// ---- width-aware plain-text table ------------------------------------------
const WIDE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/;
function dispWidth(s) { let w = 0; for (const ch of String(s)) w += WIDE.test(ch) ? 2 : 1; return w; }
function padEnd(s, w) { s = String(s); return s + ' '.repeat(Math.max(0, w - dispWidth(s))); }
function textTable(header, rows, ind, { head = true } = {}) {
  const all = head ? [header, ...rows] : rows;
  const cols = Math.max(...all.map((r) => r.length), 1);
  const widths = [];
  for (let c = 0; c < cols; c++) widths[c] = Math.max(0, ...all.map((r) => dispWidth(r[c] ?? '')));
  const fmtRow = (r) => ind + r.map((cell, c) => padEnd(cell ?? '', widths[c])).join('  ').replace(/\s+$/, '');
  const out = all.map(fmtRow);
  if (head) out.splice(1, 0, ind + widths.map((w) => '-'.repeat(w)).join('  '));
  return out.join('\n');
}

// ---- typed values ----------------------------------------------------------
function imageText(v) {
  const list = Array.isArray(v?.list) ? v.list.filter((e) => e && typeof e === 'object' && 'image' in e) : ('image' in (v ?? {}) ? [v] : []);
  return list.map((e) => {
    const alt = e.alt == null ? '' : String(e.alt).trim();
    return alt ? `[图片] ${alt}` : '[图片]';
  }).join(' ');
}
function fmt(v) {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.map(fmt).join('、');
  if ('list' in v) return v.list.map(fmt).join('、');
  if ('text' in v) return String(v.text);
  if ('num' in v) return String(v.num) + (v.unit ? ` ${v.unit}` : '');
  if ('money' in v) {
    const sym = CURRENCY_GLYPH[v.currency] ?? (v.currency ? String(v.currency) + ' ' : '');
    const prefix = v.qualifier && v.qualifier !== LIST_QUALIFIER ? String(v.qualifier) + ' ' : '';
    return prefix + sym + v.money;
  }
  if ('date' in v) return String(v.date);
  if ('bool' in v) return v.bool ? '是' : '否';
  if ('icon' in v) return String(v.icon);
  if ('video' in v) return '[视频]';
  if ('image' in v) return imageText(v);
  if ('ref' in v) return String(v.ref).replace(/^key:/, '#');   // anchor, never the raw key semantics
  return JSON.stringify(v);
}
// role fact, with the fallback unit for numbers that would otherwise be bare (F-031-§6)
const roleFact = (f) => `${fmt(f.value)}${ROLE_UNIT[f.key] && !hasOwnUnit(f.value) ? ` ${ROLE_UNIT[f.key]}` : ''}`;
const roleLabel = (key) => (key in ROLE_LABEL ? ROLE_LABEL[key] : '');

// ---- item-set form selection and compare verdict: shared in ./axis.mjs ----
// (round 19: `selectForm`/`comparable`/`compareSetVerdict` used to be ported here
// from render.mjs; that duplication is gone — the axis layer is imported, not copied.)

// ---- actions / controls (F-031-§4) ----------------------------------------
// 可见性与作用域判定在 axis.mjs（actionVisible/itemScope, F-042/F-020）；这里只管文本呈现。
// control text: "[标签]"; returns the empty string when the action has no visible label
function controlOf(a) { return a?.label ? `[${a.label}]` : ''; }
function itemControl(it, chain, ctx) {
  const a = it._action;
  if (!a || !actionVisible(a, itemScope(it, chain, ctx))) return '';
  const text = labelTextOf(it);
  if (!a.label) return '';                      // label-less navigate/open has no text of its own
  if (a.label === text) return '';              // same fact twice => keep the content alone
  return controlOf(a);
}

// ---- node renderer ---------------------------------------------------------
const IND = (d) => '  '.repeat(d);
const head = (depth, text) => `${IND(depth)}${'#'.repeat(Math.min(depth + 1, 6))} ${text}`;
const line = (depth, text) => `${IND(depth)}${text}`;

function renderTable(items, chain, ctx, depth, node) {
  const named = items.some((it) => Boolean(it._name ?? it._title));
  const attrs = [...new Set(items.flatMap((it) => [...Object.keys(it._fields ?? {}), ...factsOf(it).filter((f) => !['_name', '_title'].includes(f.key)).map((f) => f.key)]))];
  const isTable = attrs.length >= 2 && (named || attrs.some((c) => FIELDS[c]?.label));
  const valuesOf = (n, col) => {
    if (col === '_name') return n._name ? fmt(n._name) : (n._title ? fmt(n._title) : '');
    if (n._fields?.[col]) return fmt(n._fields[col]);
    const f = factsOf(n).find((x) => x.key === col);
    return f ? fmt(f.value) : '';
  };
  if (!isTable) return items.map((it) => renderNode(it, [...chain], false, ctx, depth + 1)).filter(Boolean).join('\n');
  const cols = named ? ['_name', ...attrs] : attrs;
  const header = cols.map((c) => (c === '_name' ? '名称' : (ROLE_LABEL[c] ?? FIELDS[c]?.label ?? '')));
  const rows = items.map((it) => cols.map((col) => valuesOf(it, col)));
  return textTable(header, rows, IND(depth));
}

function renderCompareTable(items, chain, ctx, depth) {
  const rowKeys = compareRowKeys(items);
  const cellOf = (it, key) => {
    if (it._fields?.[key]) return fmt(it._fields[key]);
    const f = factsOf(it).find((x) => x.key === key);
    if (f) return fmt(f.value);
    const c = childrenOf(it).find((x) => x.key === key) ?? childrenOf(it).find((x) => x.key.replace(/\[\d+\]$/, '') === key);
    if (!c) return '';
    const n = c.node;
    const only = n._detail ?? n._text ?? n._name ?? n._title;
    const rich = (n._items ?? []).length > 0 || Object.keys(n._fields ?? {}).length > 0
      || childrenOf(n).some((x) => !x.key.startsWith('_items[')) || factsOf(n).length > 1;
    if (only && !rich) return fmt(only);
    return renderNode(n, [...chain, it], false, ctx, depth + 1);
  };
  const childLabel = (key) => {
    for (const it of items) {
      const c = childrenOf(it).find((x) => x.key === key || x.key.replace(/\[\d+\]$/, '') === key);
      const t = c && (c.node._title ?? c.node._name);
      if (t?.text) return t.text;
    }
    return null;
  };
  const header = ['', ...items.map((it) => {
    const parts = [fmt(it._name ?? it._title ?? { text: '' })];
    if (it._tag) parts.push(`[${fmt(it._tag)}]`);
    if (it._price) parts.push(fmt(it._price));
    if (it._subtitle) parts.push(fmt(it._subtitle));
    if (it._summary) parts.push(fmt(it._summary));
    const ctl = itemControl(it, chain, ctx);
    if (ctl) parts.push(ctl);
    // an entity's own nested collection belongs inside its own column (F-031-§3.1)
    for (const arrKey of ['_items', '_lines']) {
      const arr = it[arrKey];
      if (Array.isArray(arr) && arr.length) {
        const nf = selectForm(arr, it._rel?.order);
        const nested = renderForm(nf, arr, [...chain, it], ctx, depth + 1, it);
        if (nested) parts.push(nested.split('\n').map((s) => s.trim()).filter(Boolean).join(' / '));
      }
    }
    return parts.join(' ');
  })];
  const rows = rowKeys.map((key) => [childLabel(key) ?? ROLE_LABEL[key] ?? FIELDS[key]?.label ?? '', ...items.map((it) => cellOf(it, key))]);
  return textTable(header, rows, IND(depth));
}

function renderForm(form, items, chain, ctx, depth, node) {
  if (form === 'compare-table') return renderCompareTable(items, chain, ctx, depth);
  if (form === 'image-strip') return items.map((it) => line(depth, imageText(it._image))).filter((l) => l.trim()).join('\n');
  if (form === 'prose') return items.map((it) => { const t = labelOf(it); return t ? line(depth, fmt(t)) : ''; }).filter(Boolean).join('\n\n');
  if (form === 'seq') return items.map((it, i) => renderListItem(it, chain, ctx, depth, `${i + 1}.`)).filter(Boolean).join('\n');
  if (form === 'list') return items.map((it) => renderListItem(it, chain, ctx, depth, '-')).filter(Boolean).join('\n');
  if (form === 'chips') return items.map((it) => {
    const v = labelOf(it); if (!v) return '';
    return line(depth, fmt(v) + (itemControl(it, chain, ctx) ? ' ' + itemControl(it, chain, ctx) : ''));
  }).filter(Boolean).join('\n');
  if (form === 'controls') {
    // F-031-§4: controls. The member's own name is content (still a fact); the action
    // label is the source's control copy. Both render when they differ (mirrors render.mjs).
    const parts = items.map((it) => {
      const a = actionVisible(it._action, itemScope(it, chain, ctx)) ? it._action : null;
      const name = labelTextOf(it);
      const ctl = a?.label ?? '';
      const other = Boolean(name && ctl && !name.includes(ctl) && !ctl.includes(name));
      if (!name && !ctl) return '';
      if (!ctl) return name;
      if (!name) return `[${ctl}]`;
      return other ? `${name} [${ctl}]` : name;
    }).filter(Boolean);
    return parts.length ? line(depth, parts.join('  ')) : '';
  }
  if (form === 'table') return renderTable(items, chain, ctx, depth, node);
  if (form === 'stack') return renderStack(items, chain, ctx, depth);
  if (form === 'deflist') return renderDeflist(items, chain, ctx, depth);
  if (form === 'accordion') return renderAccordion(items, chain, ctx, depth);
  // product-cards / cards
  return items.map((it) => renderNode(it, [...chain, node], false, ctx, depth + 1)).filter(Boolean).join('\n\n');
}

function renderListItem(it, chain, ctx, depth, bullet) {
  const v = labelOf(it); const label = v ? fmt(v) : '';
  const ctl = itemControl(it, chain, ctx);
  if (!label && !ctl) return '';
  return line(depth, `${bullet} ${label}${ctl ? ' ' + ctl : ''}`.trim());
}
function renderDeflist(items, chain, ctx, depth) {
  return items.map((it) => {
    const label = it._name ?? it._title;
    const rest = factsOf(it).filter((x) => !['_name', '_title'].includes(x.key));
    const l = label ? fmt(label) : '';
    const v = rest.map((x) => roleFact(x)).join(' ');
    const ctl = itemControl(it, chain, ctx);
    const val = (v + (ctl ? ' ' + ctl : '')).trim();
    if (!l && !val) return '';
    return line(depth, `${l ? l + ': ' : ''}${val}`.trim());
  }).filter(Boolean).join('\n');
}
function renderAccordion(items, chain, ctx, depth) {
  return items.map((it) => {
    const q = labelOf(it);
    const a = factsOf(it).filter((x) => ['_detail', '_summary', '_text'].includes(x.key) && x.value !== q);
    const answer = a.map((x) => fmt(x.value)).join(' ');
    if (!q && !answer) return '';
    if (!q) return line(depth + 1, answer);
    return line(depth, `Q ${fmt(q)}`) + '\n' + (answer ? line(depth + 1, `A ${answer}`) : '');
  }).filter(Boolean).join('\n');
}
// stack: each block stands on its own, carrying its own heading (F-031 §1/§5)
function renderStack(items, chain, ctx, depth) {
  let out = '';
  let prevHadTitle = false;
  for (const it of items) {
    const inner = renderNode(it, chain, false, ctx, depth);
    if (!inner) continue;
    const hasTitle = Boolean(it._title || it._name || it._text || it._summary);
    if (!hasTitle && prevHadTitle) out += (out ? '\n' : '') + line(depth, '----');
    out += (out ? '\n' : '') + inner;
    prevHadTitle = hasTitle;
  }
  return out;
}

function factsLines(node, chain, ctx, depth, hidden, exp = null) {
  const out = [];
  const headingKey = node._title ? '_title' : (node._name ? '_name' : null);
  for (const f of factsOf(node)) {
    if (hidden.has(f.key)) continue;
    if (f.key === headingKey) continue;                                  // the heading already carries it
    if (exp && (f.key === '_label' || f.key === '_summary')) continue;   // expose legend/hint, not body facts
    if (f.key === '_image' && depth === 0) continue;      // hero image handled separately (F-031-§7)
    if (f.key === '_brand' && depth === 0) continue;      // site header carries the brand once
    if (META_KEYS.has(f.key) || ROLE_UNIT[f.key]) { out.push(roleFact(f)); continue; }
    if (f.key === '_amount' && f.value?.qualifier === LIST_QUALIFIER) { out.push(`(原价) ${fmt(f.value)}`); continue; }
    const lab = roleLabel(f.key);
    out.push(lab ? `${lab}: ${modelScalar(f.value)}` : roleFact(f));
  }
  for (const [k, v] of Object.entries(node._fields ?? {})) out.push(`${FIELDS[k]?.label ?? ''}${FIELDS[k]?.label ? ': ' : ''}${fmt(v)}`);
  return out;
}
function modelScalar(v) {
  if (v?.text !== undefined) return v.text;
  if (v?.num !== undefined) return fmt(v);
  if (v?.money !== undefined) return fmt(v);
  if (v?.date !== undefined) return v.date;
  if (v?.list) return v.list.map(fmt).join('、');
  return fmt(v);
}

function renderNode(node, chain, isHero, ctx, depth) {
  if (node === null || typeof node !== 'object' || Array.isArray(node)) return '';
  const scope = { ...ctx.values, ...scopeFor([...chain, node], ctx.values) };
  if (typeof node._when === 'string') {
    const ast = parseExpr(node._when);
    if (ast.ok && !evalExpr(ast, scope)) return '';
  }
  const headingKey = node._title ? '_title' : (node._name ? '_name' : null);
  if (!ctx.hide.has(node)) ctx.hide.set(node, new Set());
  const hidden = ctx.hide.get(node);
  const exp = exposeOf(node);
  const itemsConsumed = new Set();

  const blocks = [];

  // title / heading
  let titleText = headingKey ? fmt(node[headingKey]) : null;
  const demoted = (node._rel?.level ?? 0) >= 2;

  // _primary: the one point the storyline conveys; hide it from the normal fact flow.
  // 解析与「槽位是否有效」在 axis.mjs（primarySlot）；隐藏的存储方式（Set）属本目标。
  const slot = primarySlot(node, headingKey);
  if (slot) {
    ctx.hide.get(slot.holder) ?? ctx.hide.set(slot.holder, new Set());
    ctx.hide.get(slot.holder).add(slot.key);
    blocks.push(line(depth, `★ 主指: ${modelScalar(slot.value)}`));
  }

  // action that is the heading itself, or a labelled action on this node
  let actionText = '';
  let titleIsControl = false;
  if (node._action && actionVisible(node._action, scope)) {
    const a = node._action;
    if (a.label && titleText && a.label === titleText) { titleIsControl = true; actionText = controlOf(a); }
    else if (a.label) actionText = controlOf(a);
  }

  // expose widget
  if (exp) {
    const lbl = node._label ? fmt(node._label) : '';
    const hint = node._summary ? fmt(node._summary) : '';
    if (node._items?.length === 1 && exp.type) {
      const it = node._items[0];
      const v = it._name ?? it._title;
      const extra = factsOf(it).filter((x) => !['_name', '_title'].includes(x.key));
      blocks.push(line(depth, `${lbl ? lbl + ': ' : ''}${v ? fmt(v) : ''} ${extra.map((x) => fmt(x.value)).join(' ')}`.trim()));
      itemsConsumed.add(it);
    } else if (node._items?.length) {
      const multi = exp.multiple === true;
      blocks.push(line(depth, `${lbl || (multi ? '可多选' : '单选')}${hint ? ` (${hint})` : ''}`));
      for (const it of node._items) {
        const v = it._name ?? it._title;
        const extra = factsOf(it).filter((x) => !['_name', '_title'].includes(x.key)).map((x) => fmt(x.value)).join(' ');
        blocks.push(line(depth + 1, `${multi ? '[ ]' : '( )'} ${v ? fmt(v) : '选项'}${extra ? ' ' + extra : ''}`));
        itemsConsumed.add(it);
      }
    } else if (exp.type === 'bool') {
      const name = lbl || (node._name ? fmt(node._name) : '');
      blocks.push(line(depth, `[ ] ${name}`.trim()));
      if (headingKey) titleText = null;
    } else {
      blocks.push(line(depth, `${lbl ? lbl + ': ' : ''}__________${hint ? ` (${hint})` : ''} [${exp.type}]`));
    }
  }

  // consecutive action-only children -> a control toolbar (must consume them BEFORE
  // the named-child pass below, or the same control renders twice)
  const actionKids = childrenOf(node).filter((c) => !itemsConsumed.has(c.node) && c.node._action &&
    factsOf(c.node).length === 0 && childrenOf(c.node).length === 0 &&
    actionVisible(c.node._action, { ...ctx.values, ...scopeFor([...chain, node, c.node], ctx.values) }));
  if (actionKids.length >= 2) {
    const tools = actionKids.map((c) => controlOf(c.node._action)).filter(Boolean);
    if (tools.length) { blocks.push(line(depth, tools.join(' '))); actionKids.forEach((c) => itemsConsumed.add(c.node)); }
  }

  // facts
  const factLines = factsLines(node, chain, ctx, depth, hidden, exp);
  if (factLines.length) blocks.push(factLines.map((t) => line(depth, t)).join('\n'));

  // ordered item sets + compare grouping (shared in axis.mjs: seqGroupsOf)
  const ordered = childrenOf(node).filter((c) => (c.key.startsWith('_lines[') || c.key.startsWith('_items[')) && !itemsConsumed.has(c.node));
  const rawItems = ordered.map((c) => c.node);
  const { groups } = seqGroupsOf(rawItems, node, ctx.degradations);
  for (const g of groups) {
    const body = renderForm(g.form, g.items, [...chain, node], ctx, depth, node);
    if (body) blocks.push(body);
    g.items.forEach((it) => itemsConsumed.add(it));
  }
  if (Array.isArray(node._items) && node._items.length === 0 && node._empty) {
    const inner = renderNode(node._empty, [...chain, node], false, ctx, depth + 1);
    if (inner) blocks.push(inner);
  }

  // named child groups (non-array children)
  let prevGroupHadTitle = false;
  for (const c of childrenOf(node)) {
    if (itemsConsumed.has(c.node) || c.key.startsWith('_items[') || c.key.startsWith('_lines[')) continue;
    const inner = renderNode(c.node, [...chain, node], false, ctx, depth + 1);
    if (!inner) continue;
    const hasTitle = Boolean(c.node._title || c.node._name || c.node._text);
    if (!hasTitle && prevGroupHadTitle) blocks.push(line(depth + 1, '----'));
    blocks.push(inner);
    prevGroupHadTitle = hasTitle;
  }

  const demotedPrefix = demoted ? line(depth, '参考:') + '\n' : '';
  const innerD = demoted ? depth + 1 : depth;
  // re-render at the (possibly deeper) indent so a demoted branch is visibly a reference section
  let parts = [];
  if (titleText && !titleIsControl) parts.push(head(innerD, titleText));
  const heroImg = node._image && depth === 0 ? imageText(node._image) : '';
  if (heroImg) parts.push(line(innerD, heroImg));
  for (const b of blocks) parts.push(shiftBlock(b, demoted ? 1 : 0));
  // a control whose heading IS its own label renders as a control, never as a section heading (F-031-§4)
  if (titleIsControl) parts.push(line(innerD, `[${titleText}]`));
  else if (actionText) parts.push(line(innerD, actionText));
  const out = parts.filter(Boolean).join('\n');
  if (!out.trim()) return '';
  return demotedPrefix + out;
}

// shift a pre-rendered block one (or more) indent levels right
function shiftBlock(text, levels) {
  if (!levels) return text;
  const pad = '  '.repeat(levels);
  return text.split('\n').map((l) => (l.trim() ? pad + l : l)).join('\n');
}

export function renderText(model, context = {}, report = null) {
  const ctx = { values: context.values ?? {}, hide: new Map(), degradations: report ?? [] };
  const body = renderNode(model, [], false, ctx, 0);
  const title = model._title ? fmt(model._title) : (typeof model._intent === 'string' ? model._intent : 'surface');
  const brand = model._brand ? fmt(model._brand) : '';
  // the root node already emits its own `# title`; only add a fallback/brand line
  const header = model._title ? (brand && brand !== title ? `品牌: ${brand}\n\n` : '') : `# ${title}\n\n`;
  return `${header}${body}\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [inp, out] = process.argv.slice(2);
  if (!inp) { console.error('usage: node m1/render-text.mjs <model.json> [out.txt]'); process.exit(2); }
  const txt = renderText(JSON.parse(fs.readFileSync(inp, 'utf8')));
  if (out) fs.writeFileSync(out, txt); else process.stdout.write(txt);
}
