// Second render target for the SAME M1 blueprint (round-18 "one model, any target" test).
//
// HARD CONSTRAINT: imports ONLY ./model-lib.mjs + ./axis.mjs (shared model semantics and
// the shared axis-decision layer).
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
  factsOf,
} from './model-lib.mjs';
// The axis-decision layer is SHARED with the HTML target (round 19); the node render plan
// (round 22) lets this target draw the decisions without re-deriving any of them.
// Role labels / table column labels / compare row labels come from the same layer
// (round 24) — this target keeps no label vocabulary of its own.
import {
  labelOf, labelTextOf, compareRowKeys, compareHeaderEntries, nestedCollections,
  CURRENCY_GLYPH, LIST_QUALIFIER, ROLE_UNIT, hasOwnUnit,
  itemActionPlan, nodePlan, runPlan, compareCellOf, resolveRowLabel, columnLabel, roleLabel,
} from './axis.mjs';

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

// ---- item-set form selection and compare verdict: shared in ./axis.mjs ----
// (round 19: `selectForm`/`comparable`/`compareSetVerdict` used to be ported here
// from render.mjs; that duplication is gone — the axis layer is imported, not copied.)

// ---- actions / controls (F-031-§4) ----------------------------------------
// 可见性与作用域判定在 axis.mjs（itemActionPlan, F-042/F-020）；这里只管文本呈现。
// control text: "[标签]"; returns the empty string when the action is not a control
function controlOf(a) { return a?.label ? `[${a.label}]` : ''; }
function itemControl(it, chain, ctx) {
  const a = itemActionPlan(it, chain, ctx.values);
  return a && a.isControl ? controlOf(a) : '';
}
// One line for every control of THIS element (round 27). The row/primary decision is the
// shared `plan.actionRow` (axis.mjs), exactly as HTML draws it: text writes the same row
// on one line, and marks the shared primary with a leading `*` once the row has a choice.
function actionRowText(row) {
  return row.map((c) => `${row.length > 1 && c.primary ? '*' : ''}[${c.label}]`).join(' ');
}

// ---- node renderer ---------------------------------------------------------
const IND = (d) => '  '.repeat(d);
const head = (depth, text) => `${IND(depth)}${'#'.repeat(Math.min(depth + 1, 6))} ${text}`;
const line = (depth, text) => `${IND(depth)}${text}`;

function renderTable(items, chain, ctx, depth, node) {
  // F-051 table/card threshold is shared (`runPlan` in axis.mjs); this is only the text layout.
  const rp = runPlan(items);
  if (!rp.isTable) return items.map((it) => renderNode(it, [...chain], false, ctx, depth + 1)).filter(Boolean).join('\n');
  const header = rp.cols.map((c) => columnLabel(c));
  const rows = items.map((it) => rp.cols.map((col) => { const v = rp.cellValue(it, col); return v ? fmt(v) : ''; }));
  return textTable(header, rows, IND(depth));
}

function renderCompareTable(items, chain, ctx, depth) {
  const rowKeys = compareRowKeys(items);
  // 表头属性集合是共享决策（compareHeaderEntries）；这里只把它画成文本记号（标签套 []）。
  const header = ['', ...items.map((it) => {
    const parts = compareHeaderEntries(it).map((e) => (e.key === '_tag' ? `[${fmt(e.value)}]` : fmt(e.value)));
    const ctl = itemControl(it, chain, ctx);
    if (ctl) parts.push(ctl);
    // an entity's own nested collection belongs inside its own column (F-031-§3.1)
    for (const col of nestedCollections(it)) {
      const nested = renderForm(col.form, col.items, [...chain, it], ctx, depth + 1, it);
      if (nested) parts.push(nested.split('\n').map((s) => s.trim()).filter(Boolean).join(' / '));
    }
    return parts.join(' ');
  })];
  const rows = rowKeys.map((key) => {
    const label = resolveRowLabel(items, key);
    const cells = items.map((it) => {
      const c = compareCellOf(it, key);
      if (c.kind === 'empty') return '';
      if (c.kind === 'node') return renderNode(c.node, [...chain, it], false, ctx, depth + 1);
      return fmt(c.value);
    });
    return [label, ...cells];
  });
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
      const a = itemActionPlan(it, chain, ctx.values);
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

function modelScalar(v) {
  if (v?.text !== undefined) return v.text;
  if (v?.num !== undefined) return fmt(v);
  if (v?.money !== undefined) return fmt(v);
  if (v?.date !== undefined) return v.date;
  if (v?.list) return v.list.map(fmt).join('、');
  return fmt(v);
}

function renderNode(node, chain, isHero, ctx, depth) {
  // The whole node decision is the shared plan (axis.mjs); this function draws it as text.
  const plan = nodePlan(node, { chain, values: ctx.values, hidden: ctx.hide.get(node), depth, degradations: ctx.degradations });
  if (!plan.visible) return '';
  const blocks = [];
  const consumed = new Set();

  // title / heading
  let titleText = plan.headingValue ? fmt(plan.headingValue) : null;
  const demoted = plan.demoted;

  // _primary: the one point the storyline conveys; hide it from the normal fact flow.
  if (plan.primary) {
    if (!ctx.hide.has(plan.primary.holder)) ctx.hide.set(plan.primary.holder, new Set());
    ctx.hide.get(plan.primary.holder).add(plan.primary.key);
    blocks.push(line(depth, `★ 主指: ${modelScalar(plan.primary.value)}`));
  }

  // action that is the heading itself, or a labelled action on this node
  const titleIsControl = plan.titleIsControl;

  // expose widget (the form decision is shared: chapter kind + legend/hint + options)
  if (plan.choice) {
    const ch = plan.choice;
    const lbl = ch.legend ? fmt(ch.legend) : '';
    const hint = ch.hint ? fmt(ch.hint) : '';
    if (ch.kind === 'plain-fact') {
      const v = ch.itemName;
      blocks.push(line(depth, `${lbl ? lbl + ': ' : ''}${v ? fmt(v) : ''} ${ch.itemExtra.map((x) => fmt(x.value)).join(' ')}`.trim()));
    } else if (ch.kind === 'choice') {
      blocks.push(line(depth, `${lbl || (ch.multi ? '可多选' : '单选')}${hint ? ` (${hint})` : ''}`));
      for (const o of ch.options) {
        const v = o.name;
        const extra = o.extra.map((x) => fmt(x.value)).join(' ');
        blocks.push(line(depth + 1, `${ch.multi ? '[ ]' : '( )'} ${v ? fmt(v) : '选项'}${extra ? ' ' + extra : ''}`));
      }
    } else if (ch.kind === 'bool') {
      const name = lbl || (ch.nodeName ? fmt(ch.nodeName) : '');
      blocks.push(line(depth, `[ ] ${name}`.trim()));
    } else if (ch.type === 'secret') {
      // A secret field never echoes its value in the text target: only a placeholder (round 46).
      blocks.push(line(depth, `${lbl ? lbl + ': ' : ''}(密码)${hint ? ` (${hint})` : ''}`));
    } else {
      blocks.push(line(depth, `${lbl ? lbl + ': ' : ''}__________${hint ? ` (${hint})` : ''} [${ch.type}]`));
    }
  }
  if (plan.titleConsumed) titleText = null;   // the heading IS the switch label: show it once, on the control

  // every control of this element is ONE row, from the shared `plan.actionRow` (round 27):
  // own `_action` + toolbar children + inner-control children. No target groups here.
  const actionRow = plan.actionRow.length ? actionRowText(plan.actionRow) : '';
  for (const n of plan.rowConsumed) consumed.add(n);

  // facts (visible / hidden slots decided in the plan)
  const factLines = [];
  for (const f of plan.facts.list) {
    if (f.category === 'meta' || f.category === 'unit') { factLines.push(roleFact(f)); continue; }
    if (f.category === 'was') { factLines.push(`(原价) ${fmt(f.value)}`); continue; }
    const lab = roleLabel(f.key);
    factLines.push(lab ? `${lab}: ${modelScalar(f.value)}` : roleFact(f));
  }
  for (const f of plan.facts.fields) factLines.push(`${f.label}${f.label ? ': ' : ''}${fmt(f.value)}`);
  if (factLines.length) blocks.push(factLines.map((t) => line(depth, t)).join('\n'));

  // ordered item sets + compare grouping (shared in axis.mjs: seqGroupsOf)
  const { groups } = plan.items;
  for (const g of groups) {
    const body = renderForm(g.form, g.items, [...chain, node], ctx, depth, node);
    if (body) blocks.push(body);
  }
  if (plan.emptyState) {
    const inner = renderNode(plan.emptyState, [...chain, node], false, ctx, depth + 1);
    if (inner) blocks.push(inner);
  }

  // named child groups (non-array children)
  let prevGroupHadTitle = false;
  for (const c of plan.namedChildren) {
    if (consumed.has(c.node)) continue;
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
  const heroImg = plan.facts.hero ? imageText(plan.facts.hero) : '';
  if (heroImg) parts.push(line(innerD, heroImg));
  for (const b of blocks) parts.push(shiftBlock(b, demoted ? 1 : 0));
  // a control whose heading IS its own label renders as a control, never as a section heading (F-031-§4)
  // a control whose heading IS its own label is the heading's link; any further controls of
  // the same element are still the SAME row, never dropped (bilibili video channel block).
  if (titleIsControl) parts.push(line(innerD, `[${titleText}]`));
  if (actionRow) parts.push(line(innerD, actionRow));
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
