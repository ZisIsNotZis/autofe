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
  childrenOf, factsOf, resolveWithParent, isRoleKey, parseExpr, evalExpr, scopeFor,
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
      if (['_name', '_title', '_tag', '_price', '_subtitle', '_summary'].includes(f.key)) continue;
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
