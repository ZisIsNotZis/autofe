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
  factsOf, FIELDS,
} from './model-lib.mjs';
import {
  labelOf, labelTextOf, compareRowKeys, nestedCollections,
  CURRENCY_GLYPH, LIST_QUALIFIER, ROLE_UNIT, hasOwnUnit,
  itemActionPlan, nodePlan, runPlan, compareCellOf, compareRowLabel, buildRefLabels,
} from './axis.mjs';

// role-fact display copy (target-local, like render-text.mjs's ROLE_LABEL): which
// human label precedes a weak fact. Declared-domain `_fields` labels come from the
// shared vocab (`FIELDS`); this map is only the language of the Markdown target.
const ROLE_LABEL = {
  _title: '', _name: '', _label: '', _subtitle: '副标题', _summary: '', _detail: '', _text: '',
  _category: '分类', _tag: '标签', _status: '状态', _variant: '版本', _option: '选项',
  _count: '数量', _measure: '规格', _stock: '库存', _price: '价格', _amount: '金额',
  _datetime: '时间', _duration: '时长', _deadline: '截止', _author: '作者', _source: '来源',
  _provider: '提供方', _brand: '品牌', _image: '图片', _video: '视频', _icon: '图标',
  _rating: '评分', '_rating-count': '评价数', _ref: '引用', _place: '地点', _region: '地区', _audience: '受众',
};

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
  if ('text' in v) return escTilde(String(v.text));
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
const roleLabel = (key) => (key in ROLE_LABEL ? ROLE_LABEL[key] : '');

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

// ---- item-set forms: all chosen in ./axis.mjs, only written out here -------
function renderTable(items, chain, ctx, depth, node) {
  // F-051 table/card threshold is shared (`runPlan` in axis.mjs); this is only the GFM layout.
  const rp = runPlan(items);
  if (!rp.isTable) return items.map((it) => renderNode(it, [...chain], false, ctx, depth + 1)).filter(Boolean).join('\n\n');
  const header = rp.cols.map((c) => (c === '_name' ? '名称' : (ROLE_LABEL[c] ?? FIELDS[c]?.label ?? '')));
  const rows = items.map((it) => rp.cols.map((col) => { const v = rp.cellValue(it, col); return v ? fmt(v) : ''; }));
  return mdTable(header, rows);
}

function renderCompareTable(items, chain, ctx) {
  const rowKeys = compareRowKeys(items);
  const header = ['', ...items.map((it) => {
    const parts = [fmt(it._name ?? it._title ?? { text: '' })];
    if (it._tag) parts.push(fmt(it._tag));
    if (it._price) parts.push(fmt(it._price));
    if (it._subtitle) parts.push(fmt(it._subtitle));
    if (it._summary) parts.push(fmt(it._summary));
    const ctl = itemControl(it, chain, ctx);
    if (ctl) parts.push(ctl);
    // an entity's own nested collection belongs inside its own column (F-031-§3.1)
    for (const col of nestedCollections(it)) {
      const nested = renderForm(col.form, col.items, [...chain, it], ctx, 5, it);
      if (nested) parts.push(oneLine(nested));
    }
    return parts.filter(Boolean).join(' ');
  })];
  const rows = rowKeys.map((key) => {
    const label = compareRowLabel(items, key) ?? ROLE_LABEL[key] ?? FIELDS[key]?.label ?? '';
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
    return fmt(v) + (ctl ? ' ' + ctl : '');
  }).filter(Boolean).join(' · ');
  if (form === 'controls') {
    // the member's own name is content; the action label is the source's control copy
    return items.map((it) => {
      const a = itemActionPlan(it, chain, ctx.values);
      const name = labelTextOf(it);
      const ctl = a?.label ?? '';
      const other = Boolean(name && ctl && !name.includes(ctl) && !ctl.includes(name));
      if (!name && !ctl) return '';
      if (!ctl) return name;
      if (!name) return controlMd(a, ctl);
      return other ? `${name} ${controlMd(a, ctl)}` : name;
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
  return `${bullet} ${label}${ctl ? ' ' + ctl : ''}`.trim();
}
function renderDeflist(items, chain, ctx) {
  return items.map((it) => {
    const label = it._name ?? it._title;
    const rest = factsOf(it).filter((x) => !['_name', '_title'].includes(x.key));
    const l = label ? fmt(label) : '';
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

  let actionText = '';
  const titleIsControl = plan.titleIsControl;
  if (plan.action && plan.action.label) actionText = controlOf(plan.action);

  // expose widget -> an option list (the form decision is shared: kind + legend/hint + options)
  if (plan.choice) {
    const ch = plan.choice;
    const lbl = ch.legend ? fmt(ch.legend) : '';
    const hint = ch.hint ? fmt(ch.hint) : '';
    if (ch.kind === 'plain-fact') {
      const v = ch.itemName;
      blocks.push(`${lbl ? lbl + ': ' : ''}${v ? fmt(v) : ''} ${ch.itemExtra.map((x) => fmt(x.value)).join(' ')}`.trim());
    } else if (ch.kind === 'choice') {
      blocks.push(`${lbl || (ch.multi ? '可多选' : '单选')}${hint ? ` (${hint})` : ''}`);
      blocks.push(ch.options.map((o) => {
        const v = o.name;
        const extra = o.extra.map((x) => fmt(x.value)).join(' ');
        return `- ${ch.multi ? '[ ]' : '( )'} ${v ? fmt(v) : '选项'}${extra ? ' ' + extra : ''}`;
      }).join('\n'));
    } else if (ch.kind === 'bool') {
      const name = lbl || (ch.nodeName ? fmt(ch.nodeName) : '');
      blocks.push(`- [ ] ${name}`.trim());
    } else {
      blocks.push(`${lbl ? lbl + ': ' : ''}________${hint ? ` (${hint})` : ''} \`[${ch.type}]\``);
    }
  }
  if (plan.titleConsumed) titleText = null;   // the heading IS the switch label

  // consecutive action-only children -> one control line (grouping decided in plan.toolbar)
  if (plan.toolbar.length >= 2) {
    const tools = plan.toolbar.map((n) => { const a = itemActionPlan(n, [...chain, node], ctx.values); return a && a.label ? controlOf(a) : ''; }).filter(Boolean);
    if (tools.length) { blocks.push(tools.join(' ')); plan.toolbar.forEach((n) => consumed.add(n)); }
  }

  const factLines = [];
  for (const f of plan.facts.list) {
    if (f.category === 'meta' || f.category === 'unit') { factLines.push(roleFact(f)); continue; }
    if (f.category === 'was') { factLines.push(`~~${fmt(f.value)}~~`); continue; }
    const lab = roleLabel(f.key);
    factLines.push(lab ? `${lab}: ${fmt(f.value)}` : roleFact(f));
  }
  for (const f of plan.facts.fields) factLines.push(`${f.label ? f.label + ': ' : ''}${fmt(f.value)}`);
  if (factLines.length) blocks.push(factLines.join('\n\n'));

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
  for (const c of plan.namedChildren) {
    if (consumed.has(c.node)) continue;
    const inner = renderNode(c.node, [...chain, node], false, ctx, depth + 1);
    if (inner) blocks.push(inner);
  }

  const parts = [];
  if (titleText && !titleIsControl) parts.push(`${'#'.repeat(Math.min(depth + 1, 6))} ${titleText}`);
  if (plan.facts.hero) { const hero = imageMd(plan.facts.hero); if (hero) parts.push(hero); }
  for (const b of blocks) if (b && b.trim()) parts.push(b);
  if (titleIsControl) parts.push(controlOf(plan.action) || `[${titleText}]`);
  else if (actionText) parts.push(actionText);
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
