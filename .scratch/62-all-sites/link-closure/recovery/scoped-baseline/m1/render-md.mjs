// THIRD render target for the SAME M1 blueprint (round-21 "is the shared-axis claim
// real?" test). It exists to falsify or confirm one claim: after rounds 19/20 lifted
// every shared axis DECISION into `m1/axis.mjs`, a new target should be implementable
// as PRESENTATION ONLY.
//
// HARD CONSTRAINT (same as render-text.mjs): imports ONLY ./model-lib.mjs (model
// semantics) and ./axis.mjs (axis decisions). It must NOT import ./render.mjs or
// ./render-text.mjs. Every piece of NON-presentation knowledge this file still had to
// re-write is recorded in .scratch/21-third-target/report.md §3 — that list is the
// finding of this round, not an accident.
//
// Axis semantics (docs/m1/layout-axes.md F-031) expressed in Markdown:
//   comparable ("同一行")   -> GFM table, members = rows
//   stack / not comparable  -> `##`/`###` sections, each block stands on its own
//   _rel {compare:true}    -> table with the entities as COLUMNS
//   image                   -> `![alt](src)`; no src ⇒ only the alt text remains
//   control (_action.label) -> `[标签](href)` (link when a target exists, else `[标签]`)
//   _expose single/multiple -> `- ( ) 选项` / `- [ ] 选项`
//   _rel.level >= 2         -> blockquote `> …`
//   currency / role unit    -> the SAME constants as every other target (axis.mjs)
//
// Usage: node m1/render-md.mjs <model.json> <out.md>
import fs from 'node:fs';
import {
  factsOf,
} from './model-lib.mjs';
import {
  labelOf, labelTextOf, compareRowKeys, compareHeaderEntries, nestedCollections,
  CURRENCY_GLYPH, LIST_QUALIFIER, ROLE_UNIT, hasOwnUnit,
  itemActionPlan, controlItemPlan, nodePlan, runPlan, compareCellOf, resolveRowLabel, columnLabel, roleLabel, buildRefLabels,
  hasValue, tableRowLabel, tableCellLinks,
} from './axis.mjs';

// `key:` label index (axis.mjs buildRefLabels) — held for the duration of one render.
let refLabels = new Map();

// ---- Markdown presentation helpers -----------------------------------------
const oneLine = (s) => String(s).replace(/\s*\n\s*/g, ' ').trim();
const cell = (s) => oneLine(s).replace(/\|/g, '\\|');       // a table cell is one line, pipes escaped
// GFM `~~` is this target's strikethrough delimiter, so a captured `~` must never be
// able to pair up with it and strike through unrelated copy (round-21 finding §4).
const escTilde = (s) => String(s).replace(/~/g, '\\~');
function mdTable(header, rows) {
  const cols = Math.max(header.length, ...rows.map((r) => r.length), 1);
  const pad = (r) => Array.from({ length: cols }, (_, i) => cell(r[i] ?? ''));
  return [
    `| ${pad(header).join(' | ')} |`,
    `| ${Array.from({ length: cols }, () => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${pad(r).join(' | ')} |`),
  ].join('\n');
}

// ---- typed values ----------------------------------------------------------
// An `_image` value is one image or a `list` of them (extractor collapses a
// storyline's images into a list value). Markdown has no broken-icon concept, but a
// missing src still must not become `![]()`: it degrades to the captured alt text.
function imageMd(v) {
  const list = Array.isArray(v?.list)
    ? v.list.filter((e) => e && typeof e === 'object' && 'image' in e)
    : (v && typeof v === 'object' && 'image' in v ? [v] : []);
  return list.map((e) => {
    const alt = e.alt == null ? '' : String(e.alt).trim();
    const src = typeof e.image === 'string' ? e.image.trim() : '';
    return src ? `![${alt}](${src})` : alt;
  }).filter(Boolean).join(' ');
}
function fmt(v) {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.map(fmt).join('、');
  if ('list' in v) return v.list.map(fmt).join('、');
  if ('text' in v) return escTilde(String(v.text)).replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  if ('num' in v) return String(v.num) + (v.unit ? ` ${v.unit}` : '');
  if ('money' in v) {
    const sym = CURRENCY_GLYPH[v.currency] ?? (v.currency ? String(v.currency) + ' ' : '');
    const prefix = v.qualifier && v.qualifier !== LIST_QUALIFIER ? String(v.qualifier) + ' ' : '';
    return prefix + sym + v.money;
  }
  if ('date' in v) return escTilde(String(v.date));
  if ('bool' in v) return v.bool ? '是' : '否';
  if ('icon' in v) return String(v.icon);
  if ('video' in v) return `[视频](${v.video})`;
  if ('image' in v) return imageMd(v);
  if ('ref' in v) {
    const raw = String(v.ref);
    const id = raw.replace(/^key:/, '').replace(/[^A-Za-z0-9_-]/g, '-');
    if (raw.startsWith('key:')) {
      const label = refLabels.get(raw.slice(4));
      return label ? `[${label}](#${id})` : '';   // never print the raw key (F-022)
    }
    return `[${raw}](#${id})`;
  }
  return JSON.stringify(v);
}
const roleFact = (f) => `${fmt(f.value)}${ROLE_UNIT[f.key] && !hasOwnUnit(f.value) ? ` ${ROLE_UNIT[f.key]}` : ''}`;

// ---- actions / controls (F-031-§4) ----------------------------------------
// Visibility + scope are shared (axis.mjs itemActionPlan); Markdown only decides the
// notation: a real target is a link, a target-less control keeps the source's own words.
const controlMd = (a) => {
  const t = escTilde(a.label);
  return a.hasTarget ? `[${t}](${a.href})` : `[${t}]`;
};
const controlOf = (a) => (a?.label ? controlMd(a) : '');
function itemControl(it, chain, ctx) {
  const a = itemActionPlan(it, chain, ctx.values);
  return a && a.isControl ? controlMd(a) : '';
}
// One line for every control of THIS element (round 27). The row/primary decision is the
// shared `plan.actionRow` (axis.mjs), exactly as HTML draws it: Markdown writes the same
// row as inline links, and bolds the shared primary once the row has a real choice.
function actionRowMd(row) {
  return row.map((c) => {
    const link = c.href ? controlMd({ label: c.label, hasTarget: true, href: c.href }) : `[${escTilde(c.label)}]`;
    return row.length > 1 && c.primary ? `**${link}**` : link;
  }).join(' ');
}

// ---- item-set forms: all chosen in ./axis.mjs, only written out here -------
function renderTable(items, chain, ctx, depth, node) {
  // F-051 table/card threshold is shared (`runPlan` in axis.mjs); this is only the GFM layout.
  const rp = runPlan(items);
  if (!rp.isTable) return items.map((it) => renderNode(it, [...chain], false, ctx, depth + 1)).filter(Boolean).join('\n\n');
  const header = rp.cols.map((c) => columnLabel(c));
  const bindings = tableCellLinks(node, chain);
  const cellMd = (v, links) => {
    if (v?.list) return v.list.map((x) => cellMd(x, links)).join('<br>');
    const link = links?.get(v?.text);
    return link ? `[${fmt(v)}](${link.href})` : fmt(v);
  };
  // The group-row / empty-cell decision is shared (axis.hasValue / tableRowLabel, round 47).
  const rows = items.map((it) => {
    const g = tableRowLabel(rp, it);
    if (g) return [fmt(g)];
    return rp.cols.map((col) => { const v = rp.cellValue(it, col); return hasValue(v) ? cellMd(v, bindings.get(it)) : ''; });
  });
  return mdTable(header, rows);
}

function renderCompareTable(items, chain, ctx) {
  const rowKeys = compareRowKeys(items);
  // 表头属性集合是共享决策（compareHeaderEntries）；这里只把它画成 GFM 表头文本。
  const header = ['', ...items.map((it) => {
    const ep = nodePlan(it, { chain, values: ctx.values, depth: 5, grid: true });
    const parts = compareHeaderEntries(it).map((e) => {
      const text = fmt(e.value);
      const target = ['_name', '_title'].includes(e.key) ? ep.action?.linkTo : null;
      return target ? `[${text}](${target})` : text;
    });
    const ctl = actionRowMd(ep.actionRow);
    if (ctl) parts.push(ctl);
    // an entity's own nested collection belongs inside its own column (F-031-§3.1)
    for (const col of nestedCollections(it)) {
      const nested = renderForm(col.form, col.items, [...chain, it], ctx, 5, it);
      if (nested) parts.push(oneLine(nested));
    }
    return parts.filter(Boolean).join(' ');
  })];
  const rows = rowKeys.map((key) => {
    const label = resolveRowLabel(items, key);
    const cells = items.map((it) => {
      const c = compareCellOf(it, key);
      if (c.kind === 'empty') return '';
      if (c.kind === 'node') return renderNode(c.node, [...chain, it], false, ctx, 5);
      return fmt(c.value);
    });
    return [label, ...cells];
  });
  return mdTable(header, rows);
}

function renderForm(form, items, chain, ctx, depth, node) {
  if (form === 'compare-table') return renderCompareTable(items, chain, ctx);
  if (form === 'image-strip') return items.map((it) => imageMd(it._image)).filter(Boolean).join('\n\n');
  if (form === 'prose') return items.map((it) => { const t = labelOf(it); return t ? fmt(t) : ''; }).filter(Boolean).join('\n\n');
  if (form === 'seq') return items.map((it, i) => renderListItem(it, chain, ctx, `${i + 1}.`)).filter(Boolean).join('\n');
  if (form === 'list') return items.map((it) => renderListItem(it, chain, ctx, '-')).filter(Boolean).join('\n');
  // Markdown has no chip row: a label-only run reads as a `·`-separated line.
  if (form === 'chips') return items.map((it) => {
    const v = labelOf(it); if (!v) return '';
    const ctl = itemControl(it, chain, ctx);
    const a = itemActionPlan(it, chain, ctx.values);
    const text = fmt(v);
    const name = a?.hasTarget && !a.isControl ? `[${text}](${a.href})` : text;
    return name + (ctl ? ' ' + ctl : '');
  }).filter(Boolean).join(' · ');
  if (form === 'controls') {
    // the member's own name is content; the action label is the source's control copy
    return items.map((it) => {
      const c = controlItemPlan(it, chain, ctx.values);
      const ctl = c.label ? controlMd({ label: c.label, hasTarget: Boolean(c.href), href: c.href }) : '';
      return c.accessibleLabel ? `${ctl} (${c.accessibleLabel})` : ctl;
    }).filter(Boolean).join(' ');
  }
  if (form === 'table') return renderTable(items, chain, ctx, depth, node);
  if (form === 'stack') return items.map((it) => renderNode(it, chain, false, ctx, depth + 1)).filter(Boolean).join('\n\n');
  if (form === 'deflist') return renderDeflist(items, chain, ctx);
  if (form === 'accordion') return renderAccordion(items, chain, ctx);
  // product-cards / cards
  return items.map((it) => renderNode(it, [...chain, node], false, ctx, depth + 1)).filter(Boolean).join('\n\n');
}

function renderListItem(it, chain, ctx, bullet) {
  const v = labelOf(it); const label = v ? fmt(v) : '';
  const ctl = itemControl(it, chain, ctx);
  if (!label && !ctl) return '';
  // MD 目的地条目（轮 57）：条目名自身带目标且非控件 ⇒ `[文本](href)`（名字即链接，与 HTML
  // 目的地列表等价）；控件仍走 itemControl，两者不重复。
  const a = itemActionPlan(it, chain, ctx.values);
  const name = a && a.hasTarget && !a.isControl ? controlMd({ label, hasTarget: true, href: a.href }) : label;
  return `${bullet} ${name}${ctl ? ' ' + ctl : ''}`.trim();
}
function renderDeflist(items, chain, ctx) {
  return items.map((it) => {
    const label = it._name ?? it._title;
    const rest = factsOf(it).filter((x) => !['_name', '_title'].includes(x.key));
    const text = label ? fmt(label) : '';
    const a = itemActionPlan(it, chain, ctx.values);
    const l = text && a?.hasTarget && !a.isControl ? `[${text}](${a.href})` : text;
    const v = rest.map((x) => roleFact(x)).join(' ');
    const ctl = itemControl(it, chain, ctx);
    const val = (v + (ctl ? ' ' + ctl : '')).trim();
    if (!l && !val) return '';
    return `- ${l ? `**${l}**: ` : ''}${val}`;
  }).filter(Boolean).join('\n');
}
function renderAccordion(items, chain, ctx) {
  return items.map((it) => {
    const q = labelOf(it);
    const a = factsOf(it).filter((x) => ['_detail', '_summary', '_text'].includes(x.key) && x.value !== q);
    const answer = a.map((x) => fmt(x.value)).join(' ');
    if (!q && !answer) return '';
    if (!q) return answer;
    return `**${fmt(q)}**${answer ? `\n\n${answer}` : ''}`;
  }).filter(Boolean).join('\n\n');
}

function renderNode(node, chain, isHero, ctx, depth) {
  // The whole node decision is the shared plan (axis.mjs); this function draws it as Markdown.
  const plan = nodePlan(node, { chain, values: ctx.values, hidden: ctx.hide.get(node), depth, degradations: ctx.degradations });
  if (!plan.visible) return '';
  const blocks = [];
  const consumed = new Set();
  let titleText = plan.headingValue ? fmt(plan.headingValue) : null;
  const demoted = plan.demoted;

  // _primary: the storyline's main fact. Resolution + slot validity are shared
  // (axis.mjs primarySlot); the hidden-key storage (a Set) is this target's own.
  if (plan.primary) {
    if (!ctx.hide.has(plan.primary.holder)) ctx.hide.set(plan.primary.holder, new Set());
    ctx.hide.get(plan.primary.holder).add(plan.primary.key);
    blocks.push(`> **主指**: ${fmt(plan.primary.value)}`);
  }

  const titleIsControl = plan.titleIsControl;

  // expose widget -> an option list (the form decision is shared: kind + legend/hint + options)
  if (plan.choice) {
    const ch = plan.choice;
    const lbl = ch.legend ? fmt(ch.legend) : '';
    const hint = ch.hint ? fmt(ch.hint) : '';
    if (ch.kind === 'plain-fact') {
      const v = ch.itemName;
      const text = v ? fmt(v) : '';
      const name = ch.itemAction?.href ? `[${text}](${ch.itemAction.href})` : text;
      blocks.push(`${lbl ? lbl + ': ' : ''}${name} ${ch.itemExtra.map((x) => fmt(x.value)).join(' ')}`.trim());
    } else if (ch.kind === 'choice') {
      blocks.push(`${lbl || (ch.multi ? '可多选' : '单选')}${hint ? ` (${hint})` : ''}`);
      blocks.push(ch.options.map((o) => {
        const v = o.name;
        const extra = o.extra.map((x) => fmt(x.value)).join(' ');
        const text = v ? fmt(v) : '选项';
        const name = o.action?.href ? `[${text}](${o.action.href})` : text;
        return `- ${ch.multi ? (o.selected ? '[x]' : '[ ]') : (o.selected ? '(●)' : '( )')} ${name}${extra ? ' ' + extra : ''}`;
      }).join('\n'));
    } else if (ch.kind === 'bool') {
      const name = lbl || (ch.nodeName ? fmt(ch.nodeName) : '');
      blocks.push(`- [ ] ${name}`.trim());
    } else if (ch.type === 'secret') {
      // A secret field never echoes its value in the Markdown target: only a placeholder (round 46).
      blocks.push(`${lbl ? lbl + ': ' : ''}(密码)${hint ? ` (${hint})` : ''}`);
    } else {
      const sub = plan.fieldSubmit && plan.action?.label ? ` ${controlMd(plan.action)}` : '';
      blocks.push(`${lbl ? lbl + ': ' : ''}________${hint ? ` (${hint})` : ''} \`[${ch.type}]\`${sub}`);
    }
  }
  if (plan.titleConsumed) titleText = null;   // the heading IS the switch label

  // every control of this element is ONE row, from the shared `plan.actionRow` (round 27).
  const actionRow = plan.actionRow.length ? actionRowMd(plan.actionRow) : '';
  for (const n of plan.rowConsumed) consumed.add(n);

  // 分期时长并入承载行（U-28，轴层 installmentCarrierOf 已归属）：接在同一行尾，独立的
  // installment 条目跳过 —— 与 HTML/文本同一决策、各自的行内形态。
  const attachedTail = (f) => plan.facts.list
    .filter((d) => d.category === 'installment' && d.attachTo === f)
    .map((d) => ` ${fmt(d.value)}`).join('');
  const factLines = [];
  for (const f of plan.facts.list) {
    if (f.category === 'installment') continue;   // 并入承载行（U-28），不单独成行
    if (f.category === 'meta' || f.category === 'unit') { factLines.push(roleFact(f)); continue; }
    const inlineValue = () => {
      let value = fmt(f.value);
      for (const a of plan.inlineChildren.filter((c) => c.key === f.key)) value = value.replace(fmt({text:a.label}), `[${fmt({text:a.label})}](${a.href})`);
      return value;
    };
    if (f.category === 'quote') { factLines.push(`> **${inlineValue()}**`); continue; }
    if (f.category === 'was') { factLines.push(`~~${fmt(f.value)}~~${attachedTail(f)}`); continue; }
    const lab = roleLabel(f.key);
    let value = plan.inlineChildren.some((c) => c.key === f.key) ? inlineValue() : lab ? `${lab}: ${fmt(f.value)}` : roleFact(f);
    if (plan.action?.inlineInto === f.key && plan.action.href) value = value.replace(escTilde(plan.action.label), controlMd(plan.action));
    factLines.push(value + attachedTail(f));
  }
  for (const f of plan.facts.fields) factLines.push(`${f.label ? f.label + ': ' : ''}${fmt(f.value)}`);
  if (factLines.length) blocks.push(factLines.join('\n\n'));
  if (plan.leadAction && actionRow) blocks.push(actionRow);

  // ordered item sets + compare grouping (axis.mjs seqGroupsOf)
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
  // 轮 58（L-2）区域钉扎：header 组永远最顶（页面标题之上），footer 组永远最后；元素级动作
  // 留在内容区、footer 之前。排序决策在共享轴层（orderedNamedChildren → entry.region），
  // Markdown 目标只选槽位：header 块在标题之前输出，footer 块在动作行之后输出。
  const headBlocks = [], footBlocks = [];
  for (const c of plan.namedChildren) {
    if (consumed.has(c.node)) continue;
    const inner = renderNode(c.node, [...chain, node], false, ctx, depth + 1);
    if (!inner) continue;
    if (c.region === 'header') { headBlocks.push(inner); continue; }
    if (c.region === 'footer') { footBlocks.push(inner); continue; }
    blocks.push(inner);
  }

  const parts = [];
  for (const b of headBlocks) if (b && b.trim()) parts.push(b);   // header 在页面标题之上（L-2）
  if (titleText && !titleIsControl) {
    const title = plan.action?.isLabellessLink ? `[${titleText}](${plan.action.href})` : titleText;
    parts.push(`${'#'.repeat(Math.min(depth + 1, 6))} ${title}`);
  }
  if (plan.facts.hero) { const hero = imageMd(plan.facts.hero); if (hero) parts.push(hero); }
  for (const b of blocks) if (b && b.trim()) parts.push(b);
  // a control whose heading IS its own label is the heading's link; any further controls of
  // the same element are still the SAME row, never dropped (bilibili video channel block).
  if (titleIsControl) parts.push(controlOf(plan.action) || `[${titleText}]`);
  if (actionRow && !plan.leadAction) parts.push(actionRow);
  for (const b of footBlocks) if (b && b.trim()) parts.push(b);   // footer 永远最后（L-2）
  const out = parts.join('\n\n');
  if (!out.trim()) return '';
  // demotion ≥2: a demoted branch is a reference aside -> blockquote (Markdown's aside)
  return demoted ? out.split('\n').map((l) => (l.trim() ? `> ${l}` : '>')).join('\n') : out;
}

export function renderMarkdown(model, context = {}, report = null) {
  refLabels = buildRefLabels(model);
  const ctx = { values: context.values ?? {}, hide: new Map(), degradations: report ?? [] };
  const body = renderNode(model, [], false, ctx, 0);
  const title = model._title ? fmt(model._title) : (typeof model._intent === 'string' ? model._intent : 'surface');
  const brand = model._brand ? fmt(model._brand) : '';
  const header = model._title ? (brand && brand !== title ? `> 品牌: ${brand}\n\n` : '') : `# ${title}\n\n`;
  return `${header}${body}\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [inp, out] = process.argv.slice(2);
  if (!inp) { console.error('usage: node m1/render-md.mjs <model.json> <out.md>'); process.exit(2); }
  const md = renderMarkdown(JSON.parse(fs.readFileSync(inp, 'utf8')));
  if (out) fs.writeFileSync(out, md); else process.stdout.write(md);
}
