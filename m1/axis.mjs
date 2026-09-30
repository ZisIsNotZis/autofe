// Shared AXIS-DECISION layer (round 19): the engine decisions that are true of the
// model, not of any one render target (docs/m1/layout-axes.md, F-030/F-031).
//
// WHY THIS FILE EXISTS: F-031 claims the axis semantics are presentation-neutral, but
// `selectForm` / `comparable` / `compareSetVerdict` (and their constants/predicates)
// used to live inside `render.mjs`, so the second target (`render-text.mjs`) had to
// RE-COPY them to agree. A claim that only survives by duplication is not a shared
// layer. This module is the single implementation; both renderers import it and
// neither keeps a private copy. It imports ONLY `model-lib.mjs` — never a renderer —
// so it stays target-neutral by construction.
//
// What belongs here: "is this set one comparable row or a stack?", "does this compare
// set form a table or degrade, and why?", "what is a member's label?" — i.e. decisions
// any target must make identically. What does NOT belong here: HTML `<table>` markup,
// text-table column alignment, `<span class="was">` strikethrough — those are the
// presentation of a decision, and there is exactly one per target.
import {
  childrenOf, factsOf, resolveWithParent, isRoleKey, parseExpr, evalExpr, scopeFor, exposeOf, FIELDS,
} from './model-lib.mjs';

// ---- shared display constants (target-neutral semantics) -------------------
export const CURRENCY_GLYPH = { CNY: '¥', USD: '$', HKD: 'HK$', EUR: '€', GBP: '£' };
// offer（提案 §4.3，用现有键、零新语法）：`_amount` 的“原价”语义必须由**显式限定词**
// 给出——`qualifier === 'list'`（引擎**不做金额比较**，M4-a/D3）。该标记是内部语义，
// 渲染为弱化+删除线但**绝不作为文案输出**。词表闭式化（`vocab.qualifiers`）待人类决策。
export const LIST_QUALIFIER = 'list';
// 数值事实必须带角色/单位（F-031-§6）：裸数字在屏幕上没有归属
export const ROLE_UNIT = { _rating: '分', '_rating-count': '条评价' };
// 哪些角色事实进「meta」这类弱化分组——目标差异可接受，但分组依据必须一致
export const META_KEYS = new Set(['_count', '_measure', '_duration', '_deadline', '_author', '_source', '_provider', '_brand', '_stock']);
// 角色单位只是兜底：事实自带 unit 时绝不追加，否则两个单位连排（「870 人好评 条评价」，F-037）
export const hasOwnUnit = (v) => Boolean(v && typeof v === 'object' && !Array.isArray(v) && 'num' in v && v.unit);

// ---- link targets (target validation + `key:` → in-page anchor) ------------
export const hasTarget = (a) => Boolean(a?.to) && (/^https?:/i.test(a.to) || a.to.startsWith('/') || a.to.startsWith('key:'));
// `key:` 目标是页内引用（id 由 `_key` 生成）：降为 `#锚点`，与 fmt() 的 ref 处理一致（父代理裁定 5）
export const hrefOf = (to) => (typeof to === 'string' && to.startsWith('key:') ? '#' + to.slice(4).replace(/[^A-Za-z0-9_-]/g, '-') : to);

// ---- member predicates / label extraction ----------------------------------
export const labelOf = (it) => it._name ?? it._title ?? it._text;
export const labelTextOf = (it) => (labelOf(it)?.text ?? '');
export function isLabelOnlyItem(it) {
  return factsOf(it).every((f) => ['_name', '_title'].includes(f.key)) && !it._fields && childrenOf(it).length === 0;
}
export function isImageOnlyItem(it) {
  return Boolean(it._image) && childrenOf(it).length === 0
    && factsOf(it).every((f) => f.key === '_image');
}
export function isProseItem(it) {
  const f = factsOf(it);
  return f.length > 0 && f.every((x) => x.key === '_text') && !it._fields && childrenOf(it).length === 0 && !it._action;
}

// ---- item-set form selection (F-030) ---------------------------------------
export function selectForm(items, order) {
  if (!items.length) return 'none';
  if (items.every(isImageOnlyItem)) return 'image-strip';   // 图像主导 ⇒ 满幅（F-031-§7）
  if (items.every(isProseItem)) return 'prose';
  if (items.some((it) => it._fields && Object.keys(it._fields).length)) return 'table';
  if (items.length > 1 && items.some((it) => it._expose)) return 'stack';   // 表单步骤是序列，不是一行
  if (items.every(isLabelOnlyItem)) {
    // long sentence labels are a list/sequence of links/questions, not filter chips or control pills (F-030)
    const long = items.every((it) => {
      const t = labelOf(it);
      const len = t ? (t.text ?? '').length : 0;
      return len >= 16 || /[?？]$/.test((t?.text ?? '').trim());
    });
    if (order === 'sequence' || order === 'time') return 'seq';   // 有序集合 ⇒ 序列，不是一行 chip（F-031-§1）
    if (long) return 'list';
    if (items.every((it) => it._action)) return 'controls';        // 只有短标签的控件集合才走控件条
    return 'chips';
  }
  if (!comparable(items)) return 'stack';
  // a "product card" needs a name: a price with no named product is not a card (F-030)
  if (items.some((it) => it._price) && items.every((it) => it._name || it._title)) return 'product-cards';
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

// ---- 轴语义：可比性闸门（F-031）--------------------------------------------
export function jaccardOf(a, b) {
  if (!a.length || !b.length) return 0;
  const inter = a.filter((k) => b.includes(k)).length;
  return inter / new Set([...a, ...b]).size;
}
export function shapeKeys(it) {
  const ks = factsOf(it).filter((f) => !['_name', '_title'].includes(f.key)).map((f) => f.key);
  for (const c of childrenOf(it)) ks.push('#' + c.key.replace(/\[\d+\]$/, ''));
  if (it._image) ks.push('#image');
  if (it._action) ks.push('#action');
  return [...new Set(ks)].sort();
}
export function textLenOf(it) {
  let n = 0;
  const own = it._name ?? it._title ?? it._text;
  if (own?.text) n += own.text.length;
  for (const f of factsOf(it)) {
    if (['_name', '_title'].includes(f.key)) continue;
    if (f.value?.text) n += f.value.text.length;
    if (f.value?.list) n += JSON.stringify(f.value.list).length;
  }
  return n;
}
// 一行 = 可比：同形 + 同粒度 + 紧凑。任一不满足即序列（堆叠）
export function comparable(items) {
  if (items.length < 2) return false;
  if (items.every(isLabelOnlyItem)) return true;
  const ks = items.map(shapeKeys);
  const sims = ks.map((k) => ks.reduce((a, b) => a + jaccardOf(k, b), 0) / ks.length);
  const avgSim = sims.reduce((a, b) => a + b, 0) / sims.length;
  const lens = items.map(textLenOf);
  const maxLen = Math.max(...lens), minLen = Math.min(...lens);
  const childCounts = items.map((it) => childrenOf(it).length);
  return avgSim >= 0.6 && maxLen <= 400 && (minLen === 0 || maxLen / Math.max(minLen, 40) <= 4) && Math.max(...childCounts) <= 2;
}

// ---- compare-table entity header attributes (F-031 §3, round 23) ------------
// 哪些属性描述「实体本身」因而进对比表**列头**（而不是可比的行）：实体名 + 标签/价格/
// 副标题/摘要。这份清单是**一个**决策：`compareRowKeys` 据它排除表头键，三个目标据
// `compareHeaderEntries` 画出同一集合。上移前它被三个渲染器各写一遍（且顺序不同），
// 只有保真门禁兜着；现在它是共享层的单一实现（门禁 F 断言三目标同集合）。
export const COMPARE_HEADER_KEYS = ['_name', '_title', '_tag', '_price', '_subtitle', '_summary'];
// 一个实体**实际存在**的表头属性（`null`/`undefined` 不产出），按共享的规范顺序排列：
// 名称 → 标签 → 价格 → 副标题 → 摘要。`_name`/`_title` 坍缩为同一个「名称」位（名优先）。
// 目标只负责把 `{ key, value }` 画成自己的记号（HTML 元素 / 文本空格拼接 / Markdown 语法），
// 绝不再自行决定「哪些键属于表头」。
export function compareHeaderEntries(entity) {
  const out = [];
  if (entity?._name != null) out.push({ key: '_name', value: entity._name });
  else if (entity?._title != null) out.push({ key: '_title', value: entity._title });
  for (const key of ['_tag', '_price', '_subtitle', '_summary']) {
    if (entity?.[key] != null) out.push({ key, value: entity[key] });
  }
  return out;
}

// ---- compare-set verdict (D2 / layout-axes §3) -----------------------------
// 行 = 两个以上实体共有的可对照属性；实体名/标签/价格/副标题/摘要进表头，不当行（F-031-§3）
// 数组元素（`_items[i]`/`_lines[i]`）**不是**可比属性：按下标对齐两个无关列表是“配对”而非对照。
export const isPositionalKey = (k) => /^_(items|lines)\[\d+\]$/.test(k);
export function compareRowKeys(items) {
  const rowKeys = [];
  const seen = new Set();
  for (const it of items) {
    for (const k of Object.keys(it._fields ?? {})) if (!seen.has(k)) { seen.add(k); rowKeys.push(k); }
    for (const f of factsOf(it)) {
      if (COMPARE_HEADER_KEYS.includes(f.key)) continue;   // 表头属性不是行（compareHeaderEntries）
      if (!seen.has(f.key)) { seen.add(f.key); rowKeys.push(f.key); }
    }
    for (const c of childrenOf(it)) {
      if (isPositionalKey(c.key)) continue;
      if (!seen.has(c.key)) { seen.add(c.key); rowKeys.push(c.key); }
    }
  }
  return rowKeys;
}

// 单元格是否有值（口径与渲染器的 cellOf 一致：类型化字段 / 角色事实 / 命名子节点）
export function compareHasCell(it, key) {
  if (it._fields?.[key]) return true;
  if (factsOf(it).some((f) => f.key === key)) return true;
  return childrenOf(it).some((c) => c.key === key);
}

// 退化判据（明文规则见 docs/m1/layout-axes.md §3）：一个对比集若渲染出的表没有一条被 ≥2 个实体
// 共享的属性行（“空壳”，哪怕每格都填了字），或整体填充率低于阈值，就不成其为对照表。
export const COMPARE_MIN_FILL = 0.4;
export function compareStats(items) {
  const rowKeys = compareRowKeys(items);
  let filledCells = 0, sharedRows = 0;
  for (const k of rowKeys) {
    const n = items.filter((it) => compareHasCell(it, k)).length;
    filledCells += n;
    if (n >= 2) sharedRows += 1;
  }
  const cells = rowKeys.length * items.length;
  return { rowKeys, rows: rowKeys.length, sharedRows, fill: cells ? filledCells / cells : 0 };
}

// D2：对照语义与位置无关。一组 ≥2 个被标为对照实体的条目要么成对比表（列=实体、行=属性），
// 要么带着显式理由降级——绝不静默变形。能成表的条件：每个实体有名字（表头）、没有成员是控件、
// 至少有一个可对照属性（否则只剩表头，成不了表），且该表不是空壳。
export function compareSetVerdict(items) {
  if (items.length < 2) return { ok: false, reason: 'fewer-than-2-entities' };
  if (items.some((it) => it._expose)) return { ok: false, reason: 'member-is-a-control' };
  if (items.some((it) => !(it._name ?? it._title))) return { ok: false, reason: 'member-has-no-name' };
  const st = compareStats(items);
  if (!st.rows) return { ok: false, reason: 'no-comparable-attribute' };
  if (!st.sharedRows) return { ok: false, reason: 'degenerate-no-shared-attribute' };
  if (st.fill < COMPARE_MIN_FILL) return { ok: false, reason: `degenerate-fill-rate:${st.fill.toFixed(2)}` };
  return { ok: true };
}

// ---- ordered item-set grouping (F-031 §1/§3, D2, P3) -----------------------
// An ordered collection splits into consecutive runs that each render in ONE form:
//   compare — members marked as compared entities (marker on the set ⇒ all members;
//             on a member ⇒ that member); a lone marked member that is itself a
//             collection is NOT an entity (its marker describes ITS members) ⇒ plain.
//   prose   — consecutive `_text` paragraphs merge into one block (≥2 required, else plain).
//   plain   — everything else, form chosen by `selectForm`.
// The form for a run is decided here too, and a compare run that cannot become a table
// records its explicit degradation reason (D2: never silently deform).
// Returns `{ groups: [{ kind, items, form }], order }` — the order is the `_rel.order`
// the forms were selected with (targets still need it, e.g. for the timeline rail).
export function seqGroupsOf(items, node, degradations = null) {
  const rel = node?._rel;
  const forcedCmp = rel?.compare === true;
  const isProse = items.map(isProseItem);
  const kindOf = (i) => {
    if (forcedCmp || Boolean(items[i]._rel?.compare)) return 'compare';
    return isProse[i] && (isProse[i - 1] || isProse[i + 1]) ? 'prose' : 'plain';
  };
  const groups = [];
  for (let i = 0; i < items.length; i++) {
    const kind = kindOf(i);
    const last = groups[groups.length - 1];
    if (last && last.kind === kind) last.items.push(items[i]);
    else groups.push({ kind, items: [items[i]] });
  }
  for (const g of groups) {
    const it = g.items[0];
    if (g.kind === 'compare' && g.items.length === 1 && (Array.isArray(it._items) || Array.isArray(it._lines))) g.kind = 'plain';
  }
  const order = rel?.order;
  for (const g of groups) {
    if (g.kind !== 'compare') { g.form = selectForm(g.items, order); continue; }
    const verdict = compareSetVerdict(g.items);
    if (verdict.ok) { g.form = 'compare-table'; continue; }
    // 不能成表：记下显式降级理由（审计输出），再按普通集合渲染
    if (degradations) degradations.push({ key: node?._key ?? null, entities: g.items.length, reason: verdict.reason });
    g.form = selectForm(g.items, order);
  }
  return { groups, order };
}

// ---- action visibility & item scope (F-031 §4 / F-020 / F-042) -------------
// An item/node `_action.when` is a condition like any other: evaluated against the
// same scope, and an unmet condition hides the control. Unparsable expressions are
// left to the validator, never guessed (an unparsable `when` stays visible).
export function actionVisible(a, scope) {
  if (!a) return false;
  if (typeof a.when === 'string') { const ast = parseExpr(a.when); if (ast.ok && !evalExpr(ast, scope)) return false; }
  return true;
}
// Scope of a member item: the context values plus everything the ancestor chain and
// the item itself contribute (`_fields`/role facts/its own `_expose`).
export const itemScope = (it, chain, ctx) => ({ ...ctx.values, ...scopeFor([...chain, it], ctx.values) });

// ---- `_primary` slot resolution (hide the fact the hero already shows) -----
// `_primary` names the storyline's main FACT. Resolving it and deciding whether it
// gets a hero slot (must resolve to a role fact; the node's own heading slot already
// shows it ⇒ no slot) is the same for every target. Each target stores the "hidden"
// fact in its own way (HTML: {keys,nodes}; text: a Set) — that storage is presentation.
// Returns `{ holder, key, value }` (the node holding the resolved fact, the fact key,
// and the resolved fact node), or null when there is no valid slot.
export function primarySlot(node, headingKey) {
  if (typeof node._primary !== 'string') return null;
  const r = resolveWithParent(node, node, node._primary);
  if (!r.ok || !isRoleKey(r.lastKey)) return null;
  if (r.holder === node && r.lastKey === headingKey) return null;
  return { holder: r.holder, key: r.lastKey, value: r.node };
}

// ==== node render plan (round 22) ===========================================
// THE CONTRACT: a render target must not decide anything about the MODEL. `nodePlan`
// folds the eleven node-level decisions that used to be re-derived inside every target
// (heading key, node visibility, visible/hidden facts, choice-set form, compare cell +
// row label, control-toolbar grouping, demotion, title-is-control, `_empty`, boolean
// title consumption, F-051 table/card threshold) into ONE pure, target-neutral object.
// A target receives the plan and only DRAWS it: HTML elements, text columns, Markdown
// syntax. Before this round `_expose` was a select table in HTML and an option list in
// text/Markdown — the same model, two different AXIS decisions; now all three consume
// one `choice.kind` and only their drawing differs.

export function headingKeyOf(node) { return node._title ? '_title' : (node._name ? '_name' : null); }
export function isDemoted(node) { return (node?._rel?.level ?? 0) >= 2; }
export const isActionOnlyNode = (n) => Boolean(n?._action) && factsOf(n).length === 0 && childrenOf(n).length === 0;
export const arrayChildEntries = (node) => childrenOf(node).filter((c) => c.key.startsWith('_items[') || c.key.startsWith('_lines['));
export const namedChildEntries = (node) => childrenOf(node).filter((c) => !c.key.startsWith('_items[') && !c.key.startsWith('_lines['));
// An entity's own nested collections (`_items`/`_lines` arrays) belong inside its column;
// each run's form is the shared `selectForm` (F-031-§3.1) — never paired by index across entities.
export function nestedCollections(it) {
  const out = [];
  for (const k of ['_items', '_lines']) {
    const arr = it?.[k];
    if (Array.isArray(arr) && arr.length) out.push({ key: k, items: arr, form: selectForm(arr, it._rel?.order) });
  }
  return out;
}

// A control: visibility + scope are decided here; label/target stay raw data shaped by
// each target ([标签] / `[标签](href)` / `<a class="ctl">`).
export function actionPlan(node, chain, values = {}) {
  const a = node?._action;
  if (!a) return null;
  if (!actionVisible(a, { ...values, ...scopeFor([...chain, node], values) })) return null;
  const has = hasTarget(a);
  return { label: typeof a.label === 'string' ? a.label : '', verb: a.verb ?? null, hasTarget: has, href: has ? hrefOf(a.to) : null };
}
// An item's action: same as actionPlan, plus whether it is the source's own control copy.
// A label identical to the item's own name is the same fact twice, not a control.
export function itemActionPlan(it, chain, values = {}) {
  const a = actionPlan(it, chain, values);
  if (!a) return null;
  return { ...a, isControl: Boolean(a.label) && a.label !== labelTextOf(it) };
}

// F-051: a set of records is a table only when it has an identity column (member name) or
// at least one DECLARED domain label, and at least two attribute columns. One column is a
// list, identity+one attribute is a deflist — neither is a table. Decision, not markup.
export function runPlan(items) {
  const named = items.some((it) => Boolean(it._name ?? it._title));
  const attrs = [...new Set(items.flatMap((it) => [...Object.keys(it._fields ?? {}), ...factsOf(it).filter((f) => !['_name', '_title'].includes(f.key)).map((f) => f.key)]))];
  const cols = named ? ['_name', ...attrs] : attrs;
  const isTable = attrs.length >= 2 && (named || attrs.some((c) => FIELDS[c]?.label));
  const cellValue = (n, col) => {
    if (col === '_name') return n._name ?? n._title ?? null;
    if (n._fields?.[col]) return n._fields[col];
    const f = factsOf(n).find((x) => x.key === col);
    return f ? f.value : null;
  };
  return { named, attrs, cols, isTable, cellValue };
}

// A choice set's form (F-030): one option is not a choice (plain fact); two or more are a
// choice set; a bare `_expose` is a boolean switch or an input. `rich` says the options
// carry their own attributes — a target may draw those as a table or as annotated options.
function optionOf(it, i) {
  const fieldsFirst = it._fields ? Object.values(it._fields)[0] : undefined;
  return {
    node: it, index: i,
    key: typeof it._key === 'string' ? it._key : null,
    name: it._name ?? it._title ?? null,
    fieldsName: it._fields ? { text: String(fieldsFirst?.text ?? fieldsFirst?.num ?? '') } : null,
    extra: factsOf(it).filter((x) => !['_name', '_title'].includes(x.key)),
    ops: namedChildEntries(it).map((c) => c.node),
  };
}
function selectTablePlan(items, options) {
  const typed = items.some((it) => it._fields && Object.keys(it._fields).length);
  const cols = typed
    ? [...new Set(items.flatMap((it) => [...Object.keys(it._fields ?? {}), ...factsOf(it).filter((f) => !['_name', '_title'].includes(f.key)).map((f) => f.key)]))]
    : ['_name', ...new Set(items.flatMap((it) => factsOf(it).filter((f) => !['_name', '_title'].includes(f.key)).map((f) => f.key)))];
  const cellValue = (n, col) => {
    if (col === '_name') return n._name ?? n._title ?? null;
    if (n._fields?.[col]) return n._fields[col];
    const f = factsOf(n).find((x) => x.key === col);
    return f ? f.value : null;
  };
  const labelKey = (c) => FIELDS[c]?.label ?? (c === '_name' ? '' : '');
  const anyOps = options.some((o) => o.ops.length > 0);
  return { cols, cellValue, labelKey, anyOps, showHead: cols.some((c) => labelKey(c)) || anyOps, typed };
}
export function choicePlan(node, exp) {
  if (!exp) return null;
  const items = Array.isArray(node._items) ? node._items : [];
  const legend = node._label ?? null;
  const hint = node._summary ?? null;
  const multi = exp.multiple === true;
  if (items.length) {
    if (items.length < 2) {
      return { kind: 'plain-fact', items, item: items[0], legend, hint, multi, name: exp.name,
        itemName: items[0]._name ?? items[0]._title ?? null,
        itemExtra: factsOf(items[0]).filter((x) => !['_name', '_title'].includes(x.key)) };
    }
    const options = items.map(optionOf);
    const rich = items.some((it) => (it._fields && Object.keys(it._fields).length))
      || items.some((it) => factsOf(it).some((f) => !['_name', '_title'].includes(f.key)));
    return { kind: 'choice', items, options, legend, hint, multi, name: exp.name, type: exp.type, rich,
      table: rich ? selectTablePlan(items, options) : null };
  }
  if (exp.type === 'bool') return { kind: 'bool', items, legend, hint, name: exp.name, nodeName: node._name ?? node._title ?? null };
  return { kind: 'input', items, legend, hint, name: exp.name, type: exp.type };
}

// Compare-set cell: a declared field / role fact is a VALUE; a named child is either its
// own simple text (when it has a single plain fact and no structure) or a NODE to render.
export function compareCellOf(it, key) {
  if (it._fields?.[key]) return { kind: 'value', value: it._fields[key] };
  const f = factsOf(it).find((x) => x.key === key);
  if (f) return { kind: 'value', value: f.value };
  const c = childrenOf(it).find((x) => x.key === key) ?? childrenOf(it).find((x) => x.key.replace(/\[\d+\]$/, '') === key);
  if (!c) return { kind: 'empty' };
  const n = c.node;
  const only = n._detail ?? n._text ?? n._name ?? n._title;
  const rich = (n._items ?? []).length > 0 || Object.keys(n._fields ?? {}).length > 0
    || childrenOf(n).some((x) => !x.key.startsWith('_items[')) || factsOf(n).length > 1;
  if (only && !rich) return { kind: 'text', value: only };
  return { kind: 'node', node: n };
}
// Compare-set row label: the child block's own title/name wins, then the declared field
// label, then no label — an internal key is never printed (F-022/F-029).
export function compareRowLabel(items, key) {
  for (const it of items) {
    const c = childrenOf(it).find((x) => x.key === key || x.key.replace(/\[\d+\]$/, '') === key);
    const t = c && (c.node._title ?? c.node._name);
    if (t?.text) return t.text;
  }
  return null;
}

// The whole node plan. `ctx`: { chain, values, hidden (Set of already-hidden fact keys),
// depth, degradations }. Returns `{ ok:false, visible:false }` for a hidden/invalid node.
export function nodePlan(node, ctx = {}) {
  const chain = ctx.chain ?? [];
  const values = ctx.values ?? {};
  const depth = ctx.depth ?? 0;
  const hidden = ctx.hidden instanceof Set ? ctx.hidden : new Set();
  if (!node || typeof node !== 'object' || Array.isArray(node)) return { ok: false, visible: false };
  const scope = { ...values, ...scopeFor([...chain, node], values) };
  if (typeof node._when === 'string') {
    const ast = parseExpr(node._when);
    if (ast.ok && !evalExpr(ast, scope)) return { ok: false, visible: false };
  }
  const headingKey = headingKeyOf(node);
  const exp = exposeOf(node);
  const primary = primarySlot(node, headingKey);
  const hid = new Set(hidden);
  if (primary && primary.holder === node) hid.add(primary.key);

  const facts = { list: [], hero: null, fields: [] };
  for (const f of factsOf(node)) {
    if (hid.has(f.key)) continue;                                   // already shown (e.g. hero/primary)
    if (f.key === headingKey) continue;                             // the heading carries it
    if (exp && (f.key === '_label' || f.key === '_summary')) continue;  // legend/hint, not body
    if (f.key === '_brand' && depth === 0) continue;                // the site header carries the brand
    if (f.key === '_image' && depth === 0) { facts.hero = f.value; continue; }  // edge-to-edge hero (F-031-§7)
    if (f.key === '_amount' && f.value?.qualifier === LIST_QUALIFIER) { facts.list.push({ ...f, category: 'was' }); continue; }
    if (META_KEYS.has(f.key)) { facts.list.push({ ...f, category: 'meta' }); continue; }
    if (ROLE_UNIT[f.key]) { facts.list.push({ ...f, category: 'unit' }); continue; }
    facts.list.push({ ...f, category: 'body' });
  }
  for (const [k, v] of Object.entries(node._fields ?? {})) facts.fields.push({ key: k, value: v, label: FIELDS[k]?.label ?? '' });

  const ap = actionPlan(node, chain, values);
  const headingText = headingKey ? (node[headingKey]?.text ?? '') : '';
  const titleIsControl = Boolean(ap && ap.label && headingText && ap.label === headingText);
  const labellessLink = Boolean(ap && !ap.label && ['navigate', 'open'].includes(ap.verb) && ap.hasTarget);
  const action = ap ? {
    ...ap, isTitleControl: titleIsControl, isLabellessLink: labellessLink,
    linkTo: titleIsControl ? (ap.hasTarget ? ap.href : null) : (labellessLink ? ap.href : null),
  } : null;

  const choice = choicePlan(node, exp);
  const toolbar = namedChildEntries(node)
    .filter((c) => isActionOnlyNode(c.node) && actionPlan(c.node, [...chain, node], values))
    .map((c) => c.node);
  const consumedArray = new Set(exp && Array.isArray(node._items) ? node._items : []);
  const rawItems = arrayChildEntries(node).map((c) => c.node).filter((it) => !consumedArray.has(it));
  const items = seqGroupsOf(rawItems, node, ctx.degradations ?? null);
  const namedChildren = namedChildEntries(node);
  const emptyState = (Array.isArray(node._items) && node._items.length === 0 && node._empty) ? node._empty : null;
  const titleConsumed = Boolean(choice && choice.kind === 'bool' && headingKey);
  return {
    ok: true, visible: true, scope, headingKey, headingValue: headingKey ? node[headingKey] : null,
    headingText, demoted: isDemoted(node), primary, facts, action, hasAction: Boolean(node._action),
    titleIsControl, choice, toolbar, items, namedChildren, emptyState, titleConsumed,
  };
}

// ---- model-wide `key:` → label index (target-neutral) ----------------------
// A `key:` target points at an element identified by `_key`; on screen the raw key must
// never leak (F-022) — the label is that element's own title/name. Building this index
// walks the whole model, so it is done once per render and shared by any target that
// has to print such a reference.
export function buildRefLabels(model) {
  const labels = new Map();
  (function walk(n) {
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (!n || typeof n !== 'object') return;
    if (n._key) {
      const t = n._title ?? n._name;
      if (t?.text) labels.set(String(n._key), t.text);
    }
    for (const v of Object.values(n)) walk(v);
  })(model);
  return labels;
}

// ---- visible page text (metric caliber, target-neutral) --------------------
// What a fact may be certified by: the page's *visible text* — style/script bodies and
// tag attributes removed. Only WELL-FORMED tags are stripped (`<[a-zA-Z/][^>]*>`); the
// old `/<[^>]*>/g` erased anything between a `<` and a `>` (round-19 report §5).
export function pageText(html) {
  return String(html)
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[a-zA-Z/][^>]*>/g, '<>');
}
