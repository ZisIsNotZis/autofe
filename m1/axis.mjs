// Shared AXIS-DECISION layer (round 19): the engine decisions that are true of the
// model, not of any one render target (docs/m1/layout-axes.md, F-030/F-031).
//
// WHY THIS FILE EXISTS: F-031 claims the axis semantics are presentation-neutral, but
// `selectForm` / `comparable` / `compareSetVerdict` (and their constants/predicates)
// used to live inside `render.mjs`, so the second target (`render-text.mjs`) had to
// RE-COPY them to agree. A claim that only survives by duplication is not a shared
// layer. This module is the single implementation; every renderer imports it and
// none keeps a private copy. It imports only `model-lib.mjs` (plus node builtins to
// read the declarative vocab files) — never a renderer — so it stays target-neutral.
//
// What belongs here: "is this set one comparable row or a stack?", "does this compare
// set form a table or degrade, and why?", "what is a member's label?" — i.e. decisions
// any target must make identically. What does NOT belong here: HTML `<table>` markup,
// text-table column alignment, `<span class="was">` strikethrough — those are the
// presentation of a decision, and there is exactly one per target.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  childrenOf, factsOf, resolveWithParent, isRoleKey, parseExpr, evalExpr, scopeFor, exposeOf, valueTypeOf, FIELDS, COMPOSITES,
} from './model-lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

// ---- shared display constants (target-neutral semantics) -------------------
export const CURRENCY_GLYPH = { CNY: '¥', USD: '$', HKD: 'HK$', EUR: '€', GBP: '£' };
// offer（提案 §4.3，用现有键、零新语法）：`_amount` 的“原价”语义必须由**显式限定词**
// 给出——`qualifier === 'list'`（引擎**不做金额比较**，M4-a/D3）。该标记是内部语义，
// 渲染为弱化+删除线但**绝不作为文案输出**。词表闭式化（`vocab.qualifiers`）待人类决策。
export const LIST_QUALIFIER = 'list';
// 数值事实必须带角色/单位（F-031-§6）：裸数字在屏幕上没有归属
export const ROLE_UNIT = { _rating: '分', '_rating-count': '条评价' };
// ---- price qualifier placement (round 30) ----------------------------------
// A money qualifier's POSITION is a grammatical fact about the word, not a target-local
// whim (docs/m1/layout-axes.md §「价格限定词的位置」). A Chinese lower-bound/per-unit
// modifier TRAILS the numeral (`RMB 6799 起`, `$0.09 每 GB`, `£50 per certificate`); a
// leading label or rate READS IN FRONT (`From $749`, `起始价：HK$4`, `订金 ¥…`,
// `3.4% + HK$2.35`). Default front; only a trailing modifier is postposed. This is why
// `起 RMB 6799` (front) was wrong for `RMB 6799 起`.
export const POSTPOSED_QUALIFIER = /^(?:起|含税|每月|每\s*\S+|per\s+\S+|each)$/i;
export const qualifierPlacement = (q) => (typeof q === 'string' && POSTPOSED_QUALIFIER.test(q.trim()) ? 'post' : 'pre');
// ---- role labels on bare numeric role facts (round 30) ---------------------
// A bare number has no owner (F-031-§6): a NUMERIC role fact that has a declared,
// non-empty role label prints that label so the reader knows what the number counts.
// Facts without a label keep their own unit untouched — nothing is invented
// (m1/vocab-role-labels.json, `roleLabel`). One shared decision, drawn by every target.
// Round 32: only UNAMBIGUOUS numeric roles carry a label. `_count`/`_measure` are generic
// counters whose meaning is site-specific (a bilibili `_count` is a view count, a `_measure`
// is the danmaku count — NOT a product spec); a generic `数量`/`规格` there is worse than the
// bare number (reviewers, round 31). They stay label-less unless the model gives its own copy.
export const NUMERIC_LABEL_KEYS = new Set(['_rating', '_rating-count', '_stock']);
const isQuantityValue = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v)
  && ('num' in v || ('text' in v && /^\s*[\d.,]/.test(String(v.text)) && !/[A-Za-z]{2}/.test(String(v.text))));
// `roleLabel` is declared below (the vocabulary file read); this arrow only CALLS it at
// render time, after the module has finished evaluating, so there is no TDZ surprise.
export const quantityLabel = (key, value) => (NUMERIC_LABEL_KEYS.has(key) && isQuantityValue(value) ? roleLabel(key) : '');
// 哪些角色事实进「meta」这类弱化分组——目标差异可接受，但分组依据必须一致
export const META_KEYS = new Set(['_count', '_measure', '_duration', '_deadline', '_datetime', '_author', '_source', '_provider', '_brand', '_stock']);
// 角色单位只是兜底：事实自带 unit 时绝不追加，否则两个单位连排（「870 人好评 条评价」，F-037）
export const hasOwnUnit = (v) => Boolean(v && typeof v === 'object' && !Array.isArray(v) && 'num' in v && v.unit);

// Role-label vocabulary (round 24): the human label of an internal role fact is ENGINE
// VOCABULARY, so it is DECLARED in m1/vocab-role-labels.json and read here once — not
// hand-copied into each render target (the copy is what let HTML print an empty compare
// row label while text/Markdown printed `评分`, airbnb-com/room-28871).
export const ROLE_LABEL = JSON.parse(fs.readFileSync(path.join(here, 'vocab-role-labels.json'), 'utf8')).labels;
export const roleLabel = (key) => (typeof key === 'string' && key in ROLE_LABEL ? ROLE_LABEL[key] : '');
// The identity column of a data table is named `名称` in text-like targets; HTML used to
// leave that header blank, which is the same class of target-local label decision.
export const NAME_COLUMN_LABEL = '名称';
// A run-table COLUMN header: identity column → `名称`, else the shared role vocabulary,
// then the declared domain field dictionary, then blank. One decision, three drawings.
export const columnLabel = (key) => (key === '_name' ? NAME_COLUMN_LABEL : (roleLabel(key) || FIELDS[key]?.label || ''));

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
  // A member carrying an image or an action is not a Q&A line: collapsing it into a
  // `<details>` drops the very facts the model declared (round 32: huawei 推荐信息 lost its
  // four images and four `了解更多` links). Only a title+detail member with neither becomes
  // an accordion; such members render as cards and keep the image and the control.
  if (items.every(isLabelOnlyItem)) {
    // long sentence labels are a list/sequence of links/questions, not filter chips or control pills (F-030)
    const long = items.every((it) => {
      const t = labelOf(it);
      const len = t ? (t.text ?? '').length : 0;
      return len >= 16 || /[?？]$/.test((t?.text ?? '').trim());
    });
    if (order === 'sequence' || order === 'time' || order === 'rank' || order === 'stream') return 'seq';   // 有序集合（含榜单/时间流）⇒ 序列，不是一行 chip（F-031-§1）
    // 长标签列表（长句子）是列表；一长串短标签的**链接菜单**（如类目/推荐词导航）也不是
    // 一排 pill 控件条——它是一份导航清单，分栏成紧凑形态（轮 35，taobao 首屏）。
    if (long || (items.length >= 8 && items.every((it) => it._action))) return 'list';
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
  const titleDetail = items.every((it) => factsOf(it).some((f) => f.key === '_title') && factsOf(it).some((f) => f.key === '_detail') && childrenOf(it).length === 0);
  // A title+detail member is a Q&A line ONLY when it is bare. One that carries an `_image`
  // or an `_action` is a content card: folding it into `<details>` silently drops the image
  // and the control (round 32, huawei 推荐信息 lost all four of each). Such a set renders as
  // a vertical SEQUENCE — each item stands on its own with its heading, image and control —
  // never as a `cards` grid: a grid of content images whose aspect ratios differ trips the
  // T-105 image-variance gate, and cropping to even them out is banned (F-031-§7.1).
  if (titleDetail) return items.every((it) => !it._image && !it._action) ? 'accordion' : 'stack';
  return 'cards';
}

// ---- media-first card groups (round 58 · L-6) ----------------------------------------------
// A card/feed group whose members are ALL image-led cards of card-sized text draws every
// image ABOVE its title — the video/feed card convention (U-27: bilibili《第五人格》卡片题在图下、
// 图题分居两处). Reading groups (long-text members, sspai 正文条目) and image bands keep
// title-first. GROUP-level so one grid never mixes the two layouts. Renderers draw the order
// per medium (HTML: flex order — the image never leaves its member article, so 图与标题不分家).
export function mediaFirstOf(items, form) {
  if (!['stack', 'cards', 'product-cards'].includes(form) || items.length < 2) return false;
  const imgShare = items.filter((it) => Boolean(it._image)).length;
  return imgShare / items.length >= 0.75 && items.every((it) => textLenOf(it) <= 96);
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
// ---- ranked（榜单）decision (round 37; declared in round 39) -----------------
// A leaderboard (榜单/热榜/排行榜) is DECLARED: `_rel.order === 'rank'` — its members are the
// SAME KIND of rankable entries, so the set is numbered AND may carry its own thumbnails.
// `sequence` is a display order only and is NEVER numbered. Round 37 inferred "leaderboard"
// from "no member carries an `_image`", which made the rule unstateable the moment a
// leaderboard has a thumbnail (round 39: `36kr-com/home` hot list). A declaration says what
// it means; inferring it from a picture is a guess (docs/m1/layout-axes.md §「榜单 vs 轮播」).
// A carousel/hero/feature band is `sequence` even though its members are distinct visual
// promos: numbering a banner carousel reads as a table of contents (round 37: `huawei-cn/home`
// hero rendered `1. / 2.`). The decision lives here, once, for every target; renderers draw it.
export function rankedSequence(items, order) {
  return order === 'rank' && items.length > 1;
}

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

// ---- region pinning (round 58 · L-2) ---------------------------------------
// The named-child KEY is the model's own region declaration: `header` is the site top bar,
// `footer` the site footer (the same key the headerBar decision reads). Everything else keeps
// document order, but the two site regions are PINNED: header renders above everything
// (including the page's own h1 — U-19), footer renders last (U-22) — element-level actions
// (mi15「用户评价」) stay in the content region, above the footer. One decision, three targets;
// a renderer only chooses the slot for each declared region, it never re-derives the rank.
export const regionOf = (key) => (key === 'header' || key === 'footer' ? key : 'body');
export function orderedNamedChildren(entries) {
  const rank = { header: 0, body: 1, footer: 2 };
  return entries
    .map((e) => ({ ...e, region: regionOf(e.key) }))
    .sort((a, b) => rank[a.region] - rank[b.region]);   // Array#sort is stable ⇒ document order kept within a rank
}
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
// §9 正文链接 vs 动作控件（轮 46）：一个 `_action` 的 label 若是本节点某条**正文文本事实**
// 的真子串（`_detail`/`_summary`/`_text` 里句子的一部分，如 gov-uk “approved translator”、
// “apply for a UK passport”），它就是句子里的**行内链接**，不是动作控件：
// 不得抽成独立按钮行；HTML 在句子里行内渲染 `<a>`，文本/Markdown 保持原句文本。
// label 整句等于文本（标题即控件）或等于 item 名的不算——那是标题控件，不是正文链接。
export function inlineBodyLinkKey(node) {
  const a = node?._action;
  if (!a || typeof a.label !== 'string' || !a.label) return null;
  const lab = a.label;
  for (const k of ['_detail', '_summary', '_text']) {
    const t = node[k]?.text;
    if (typeof t === 'string' && t.length > lab.length && t.includes(lab)) return k;
  }
  return null;
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

// ---- declared-but-empty values (round 47 S0.1, docs/m1/composites.md §空值约定) ----------
// `{text:""}` / `{list:[]}` mean "declared but empty": the S0.1 aws fix fills a missing
// column with an explicit blank (key set then consistent) WITHOUT fabricating content.
// "Has a value" is therefore ONE shared decision, not a per-target rendering preference:
// null/undefined/empty text/empty list are not values; num/money/bool (incl. 0/false) are.
// Every target consumes it (HTML group-row detection; text/Markdown cell + row).
export function hasValue(v) {
  if (v === null || v === undefined) return false;
  const t = valueTypeOf(v);
  if (t === null) return true;            // a node / non-typed object is present
  if (t === 'list') return (v.list ?? []).length > 0;
  if (t === 'text') return v.text !== '';
  return true;
}

// A table row is the source's own GROUP row when the only cell carrying a value is the
// first column (round 35 rule: a pric-less row must not read like a product with a missing
// price). An explicitly-empty second cell does not turn it into a data row. Round 47 lifts
// the decision here so HTML/text/Markdown make it identically instead of one renderer owning it.
export function tableRowLabel(rp, it) {
  const vals = rp.cols.map((col) => rp.cellValue(it, col));
  const present = vals.filter((v) => hasValue(v));
  return present.length === 1 && hasValue(vals[0]) ? vals[0] : null;
}

// ==== action row (round 27) ==================================================
// MEASURED, not assumed: the model has NO "which CTA is the main one" marker. What it has
// is F-020's two-element split — the element's own `_action` is the element's OWN action
// ("view details"), while a child whose whole content is its own control copy is a BUTTON
// inside it (axioms §6 example: `"buy": { "_title": { "text": "购买" }, "_action": { "verb": "buy" } }`).
// Emphasis therefore has to be DRAWN, and this is the one shared rule for it
// (docs/m1/layout-axes.md §4.1): one row per element; the primary CTA is the first
// commitment verb; a row with no commitment verb has NO primary (round 32); a lone
// control is the element's own action and keeps its original shape; the rest are secondary.
// Measured effect (round 27): `apple-com/home` draws `Buy` (child, `buy`) and `Learn more`
// (own, `open`) as two stacked lines with the emphasis inverted — the user-visible defect.
export const COMMIT_VERBS = new Set(['buy', 'preorder', 'add-to-cart', 'submit']);
// An INNER CONTROL is a named child that renders as nothing but its own control copy: its
// heading IS its action label and it holds no other fact and no child. That is the
// renderer's "control bar" case, decided here so no target has to re-derive it.
export function isInnerControlChild(child, parentChain, values = {}) {
  const key = headingKeyOf(child);
  if (!key) return false;
  const ap = actionPlan(child, parentChain, values);
  if (!ap || !ap.label || (child[key]?.text ?? '') !== ap.label) return false;
  const f = factsOf(child);
  return f.length === 1 && f[0].key === key && childrenOf(child).length === 0;
}
// The controls of ONE element as one row: the element's own action, its `_action`-only
// children (the toolbar), and its inner-control children. `primary` marks exactly one.
function actionRowOf(node, chain, values, action, toolbar) {
  const row = [];
  const push = (a, from) => {
    if (!a || !a.label) return;
    row.push({ label: a.label, href: a.hasTarget ? a.href : null, verb: a.verb ?? null, from });
  };
  if (action && action.label && !action.isTitleControl && !action.isLabellessLink) push(action, 'own');
  for (const n of toolbar) push(itemActionPlan(n, [...chain, node], values), 'inner');
  const inner = namedChildEntries(node).filter((c) => isInnerControlChild(c.node, [...chain, node], values));
  for (const c of inner) push(itemActionPlan(c.node, [...chain, node], values), 'inner');
  // 同一容器内完全相同的控件（同 label 同目标）只出现一次（轮 30）：重复即冗余。
  // 不同目标的同名控件（如 sspai 每条各自的「来源」链接）**不是**重复，不得合并。
  const seenCtl = new Set();
  const unique = row.filter((c) => {
    const sig = `${c.label}\u0000${c.href ?? ''}`;
    if (seenCtl.has(sig)) return false;
    seenCtl.add(sig);
    return true;
  });
  // Round 32: primary emphasis is claimed ONLY by a commitment verb. The old fallback
  // ("else the element's own action, else the first control") promoted a property control
  // to a solid CTA — airbnb `共享` (a room attribute, not an action) became the page's main
  // button and the real wish-list control was demoted. A row with no commitment verb now has
  // NO primary: every control is secondary. A LONE control is not a choice — it is the
  // element's own action and keeps its original shape (docs/m1/layout-axes.md §4.1 rule 3).
  let pi = unique.findIndex((c) => COMMIT_VERBS.has(c.verb));
  if (pi < 0 && unique.length === 1) pi = 0;
  return { row: unique.map((c, i) => ({ ...c, primary: i === pi })), consumed: [...toolbar, ...inner.map((c) => c.node)] };
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
// A text field's `_label` is a VISIBLE label when the source showed a real `<label>` naming the
// field's subject (邮件地址 / 密码 / Username…); it is placeholder copy (an instruction or example
// shown only inside the box: 请输入关键词 / 搜索专栏文章 / 磊哥游戏) when the source showed no
// visible label. D-3 的水印启发式只适用于后者（轮 37：stripe-dashboard/login 的邮件地址/密码被误降水印）。
const VISIBLE_FIELD_NAME = /(密码|邮件|邮箱|手机|账号|账户|用户|姓名|名称|地址|电话|号码|验证码|身份证|公司|城市|国家|地区|分类|颜色|尺寸|规格|\b(?:password|username|user|email|account|address|phone|mobile|name|code|login|sign\s?in)\b)/i;
export function isVisibleFieldName(label) {
  return Boolean(label && label.text && VISIBLE_FIELD_NAME.test(label.text));
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
  // D-3: for a TEXT input the captured label is the field's watermark (placeholder), not an
  // external caption; a date/number input keeps the label outside where a watermark can't read.
  // The watermark applies ONLY when the source had no visible label (no field-subject name).
  const labelAsPlaceholder = (exp.type === 'text' || exp.type == null) && Boolean(legend) && !isVisibleFieldName(legend);
  // `_text` on a bare text input is the field's current/default value (D-3: a name AND a default),
  // drawn as the input's value attribute — a captured default must never be dropped (round 37).
  // A SECRET field is the one exception: its value must never enter the document (no value attr,
  // no sr-only copy, no condition/log echoing), so no target ever draws it (round 46).
  const value = exp.type === 'secret' ? null : (node._text ?? null);
  return { kind: 'input', items, legend, hint, name: exp.name, type: exp.type, labelAsPlaceholder, value };
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
// Compare-set row label — child-block title/name only: the row's own child block's
// `_title`/`_name`, or null when the row has none. Never prints an internal key (F-022/F-029).
export function compareRowLabel(items, key) {
  for (const it of items) {
    const c = childrenOf(it).find((x) => x.key === key || x.key.replace(/\[\d+\]$/, '') === key);
    const t = c && (c.node._title ?? c.node._name);
    if (t?.text) return t.text;
  }
  return null;
}
// The full compare-set ROW-LABEL DECISION every target must apply identically: the row's
// own child title/name wins, then the shared role-label vocabulary, then the declared
// domain field dictionary, then no label. Empty is a shared outcome too — all three
// targets must print an empty label together, never one empty and two filled.
export function resolveRowLabel(items, key) {
  return compareRowLabel(items, key) ?? (roleLabel(key) || FIELDS[key]?.label || '');
}

// Round 49 (F-092) / round 50 (ruling A): what a slot's key MEANS depends on the SLOT's role,
// and the render target is the wrong place to decide it. The role is declared per slot in
// m1/composites.json: `state` = the composite's declared output (login's `signed-in`) → its
// `_expose` is NOT a widget; `field` = an input/surface slot (search's `query`) → its `_expose`
// renders as a control, exactly like a plain node's; `pointer` = a structural pointer (see
// refRendersAsFact). Round 49's blanket "a composite's `_expose` is state" was too coarse: it
// swallowed search's query input. One implementation; every target consumes it (nodePlan).
// Returns the exposure object when it should render as a control, else null.
const slotExposureMatches = (e, d) => {
  if (!e || !d) return false;
  if (typeof d.name === 'string' && d.name !== '*' && e.name !== d.name) return false;
  if (d.type) { const ts = Array.isArray(d.type) ? d.type : [d.type]; if (!ts.includes(e.type)) return false; }
  return true;
};
// The role of the schema slot a node's `key` projects onto, or null (plain node / no such slot).
function slotRoleOf(node, key) {
  const type = node?._composite;
  const schema = typeof type === 'string' ? (COMPOSITES.composites ?? {})[type] : null;
  if (!schema) return null;
  const exp = key === '_expose' ? exposeOf(node) : null;
  for (const f of Object.values(schema.fields ?? {})) {
    if (key === '_expose' ? (f.key !== '_expose' && f.key !== '<expose>') : f.key !== key) continue;
    if (exp && f.expose && !slotExposureMatches(exp, f.expose)) continue;
    if (f.role) return f.role;
  }
  return null;
}
export function exposeRendersAsControl(node) {
  if (!node) return null;
  if (node._composite === undefined) return exposeOf(node);   // plain node: unchanged
  return slotRoleOf(node, '_expose') === 'field' ? exposeOf(node) : null;
}
// A `_ref` is a visible reference fact on a plain node (unchanged). On a paginator it is a
// POINTER at the paged collection → never drawn: printing `/contribution-rates` (or its
// `#-path` anchor) would put an internal path on the page. Shared by all three targets.
export function refRendersAsFact(node) {
  if (!node || node._ref === undefined || node._composite === undefined) return true;
  return slotRoleOf(node, '_ref') !== 'pointer';
}

// ---- installment duration joins its price line (round 59 · U-28) -----------
// 分期时长不是独立事实块，而是价格/分期行的一部分（U-28）：`{num,unit:'mo.'/'期'}` 形态的
// `_duration` 一旦与所属价格行分家，就漂成孤立 meta 块（ipad-air 的 `12 mo.` 曾被画到容器
// 左界之外）。归属是**同节点内的分组决策**（nodePlan，三目标共享）：节点内存在价格行——可见
// 的价格事实，或提到月供/分期的文本事实——时长就并入该行（category:'installment'，attachTo
// 指向承载事实；各目标把它画进同一行，不再单独成块）。视频时长 `{text:'03:33'}`（无 num/unit）
// 与无价格行的时长不在此列，保持 meta 原状。纯呈现分组：模型语义零改动。
const DURATION_UNIT = /^(?:mo\.?|months?|期|月)$/i;
const INSTALLMENT_MENTION = /(?:\/mo\.|\/月|月供|每月|分期|[Ll]ease|[Ii]nstallment)/;
export function installmentCarrierOf(list, f) {
  if (f.key !== '_duration') return null;
  const v = f.value;
  if (!v || typeof v !== 'object' || Array.isArray(v) || !('num' in v) || !DURATION_UNIT.test(String(v.unit ?? ''))) return null;
  return list.find((c) => c !== f && (c.key === '_price' || c.key === '_amount'
    || (['_summary', '_text', '_detail'].includes(c.key) && INSTALLMENT_MENTION.test(String(c.value?.text ?? ''))))) ?? null;
}

// The whole node plan. `ctx`: { chain, values, hidden (Set of already-hidden fact keys),
// depth, degradations }. Returns `{ ok:false, visible:false }` for a hidden/invalid node.
export function nodePlan(node, ctx = {}) {
  const chain = ctx.chain ?? [];
  const values = ctx.values ?? {};
  const depth = ctx.depth ?? 0;
  // `region`：该节点在父模型里的命名子区域键（轮 57，呈现层布局语境，非模型语义）；
  // `grid`：调用方是否处于卡片/表格列内（横幅不满幅）。
  const region = typeof ctx.region === 'string' ? ctx.region : null;
  const hidden = ctx.hidden instanceof Set ? ctx.hidden : new Set();
  if (!node || typeof node !== 'object' || Array.isArray(node)) return { ok: false, visible: false };
  const scope = { ...values, ...scopeFor([...chain, node], values) };
  if (typeof node._when === 'string') {
    const ast = parseExpr(node._when);
    if (ast.ok && !evalExpr(ast, scope)) return { ok: false, visible: false };
  }
  const headingKey = headingKeyOf(node);
  // `_expose` has two meanings by node type (round 49, F-092): on a plain node it is the
  // user's input slot and renders as a control; on a composite node it is the composite's
  // DECLARED STATE/OUTPUT (referable by path), never a widget — its inputs are its schema
  // `fields`. Consuming the control-only exposure here means all three targets agree by
  // construction (a renderer that re-derived this would be a private copy).
  const controlExp = exposeRendersAsControl(node);
  const primary = primarySlot(node, headingKey);
  const hid = new Set(hidden);
  if (primary && primary.holder === node) hid.add(primary.key);

  const facts = { list: [], hero: null, fields: [] };
  for (const f of factsOf(node)) {
    if (hid.has(f.key)) continue;                                   // already shown (e.g. hero/primary)
    if (f.key === headingKey) continue;                             // the heading carries it
    if (f.key === '_ref' && !refRendersAsFact(node)) continue;      // a pointer slot is never drawn
    if (controlExp && (f.key === '_label' || f.key === '_summary')) continue;  // legend/hint, not body
    if (f.key === '_brand' && depth === 0) continue;                // the site header carries the brand
    if (f.key === '_image' && depth === 0) { facts.hero = f.value; continue; }  // edge-to-edge hero (F-031-§7)
    if (f.key === '_amount' && f.value?.qualifier === LIST_QUALIFIER) { facts.list.push({ ...f, category: 'was' }); continue; }
    if (META_KEYS.has(f.key)) { facts.list.push({ ...f, category: 'meta' }); continue; }
    if (ROLE_UNIT[f.key]) { facts.list.push({ ...f, category: 'unit' }); continue; }
    // `_quote` 是被引述/被显著强调的独立段落（轮 56 新角色）；它和正文不是一回事，必须由引擎
    // 标成自己的 category，三个目标各自画出醒目形态（引用块）。判定在这一处，渲染器不认键名。
    if (f.key === '_quote') { facts.list.push({ ...f, category: 'quote' }); continue; }
    facts.list.push({ ...f, category: 'body' });
  }
  for (const [k, v] of Object.entries(node._fields ?? {})) facts.fields.push({ key: k, value: v, label: FIELDS[k]?.label ?? '' });
  // 分期时长并入其价格行（U-28，上方 installmentCarrierOf）：在事实清单成形后做一次归属，
  // 承载事实与时长保持各自的对象身份（渲染器据此把时长画进承载行）。
  for (const f of facts.list) {
    if (f.category !== 'meta') continue;
    const carrier = installmentCarrierOf(facts.list, f);
    if (carrier) { f.category = 'installment'; f.attachTo = carrier; }
  }

  const ap = actionPlan(node, chain, values);
  const headingText = headingKey ? (node[headingKey]?.text ?? '') : '';
  const titleIsControl = Boolean(ap && ap.label && headingText && ap.label === headingText);
  const labellessLink = Boolean(ap && !ap.label && ['navigate', 'open'].includes(ap.verb) && ap.hasTarget);
  const action = ap ? {
    ...ap, isTitleControl: titleIsControl, isLabellessLink: labellessLink,
    linkTo: titleIsControl ? (ap.hasTarget ? ap.href : null) : (labellessLink ? ap.href : null),
  } : null;
  // §9: a label embedded in a body sentence is an inline link, not a control (round 46).
  const inlineInto = action ? inlineBodyLinkKey(node) : null;
  if (action && inlineInto) action.inlineInto = inlineInto;

  const choice = choicePlan(node, controlExp);
  // A secret field's captured default is never drawn by ANY target (round 46): drop it from the
  // body facts so text/Markdown cannot echo it either (HTML already skips a bare input's `_text`).
  if (choice && choice.type === 'secret') facts.list = facts.list.filter((f) => f.key !== '_text');
  const toolbar = namedChildEntries(node)
    .filter((c) => isActionOnlyNode(c.node) && actionPlan(c.node, [...chain, node], values))
    .map((c) => c.node);
  // 字段与其提交必须相邻成组（U-02）。源站的排列就是「字段 → 提交」，中间不夹别的内容；而我们的
  // 渲染顺序是（事实 / 字段 / 其它子件 / 自己的动作），于是 taobao 搜索的「宝贝/天猫/店铺」范围子件
  // 插到了输入框与「搜索」按钮之间。这是「模型形状 ⇒ 呈现分组」的决定，所以放在共享轴层：当一个元素
  // 自己的动作是它自己字段的 submit 时，该动作画在字段组内（紧跟字段），元素其余内容跟在组后。
  const fieldSubmit = Boolean(action && action.verb === 'submit' && controlExp);
  const actionRow = actionRowOf(node, chain, values, (inlineInto || fieldSubmit) ? null : action, toolbar);
  // 轮 57 hero/banner 判定（布局决策，三目标共享；呈现层不新增模型键）：一个集合成员元素
  // 同时满足 —— ① 带 `_image`；② 有标题（_title/_name）；③ 有动作（自己的 `_action` 或行内
  // 控件行）；④ 除标题外只带展示性文本事实（_subtitle/_summary/_detail，无 _price/_author 等
  // 记录性事实）—— 它就是源站的显示横幅（banner/hero）：大图 + 标题 + 按钮。横幅图按 F-031-§7
  // 满幅（hero 槽），不再锁 74ch。网格/表格单元格内的成员（ctx.grid）与自身即页面的深度 0 节点
  // 不在此列：卡片格里的图不是页框（F-031-§7 同款约束）。
  const imgFact = facts.list.find((f) => f.key === '_image');
  const banner = Boolean(!ctx.grid && depth > 0 && imgFact && headingKey
    && (action || actionRow.row.length)
    && facts.list.every((f) => ['_image', '_subtitle', '_summary', '_detail'].includes(f.key)));
  if (banner) { facts.hero = imgFact.value; facts.list = facts.list.filter((f) => f !== imgFact); }
  const consumedArray = new Set(controlExp && Array.isArray(node._items) ? node._items : []);
  const rawItems = arrayChildEntries(node).map((c) => c.node).filter((it) => !consumedArray.has(it));
  // A description fact declared AFTER this node's collection is the collection's FOOTNOTE, not
  // its lead-in: it must render directly BELOW the collection, never float above it and split
  // the lead-in from its own list (round 37: gov-uk `…for example when you:` + its bullets).
  // The split is by DECLARATION ORDER, the same order every renderer already trusts for facts.
  const ownKeys = Object.keys(node);
  const collAt = ownKeys.findIndex((k) => k === '_items' || k === '_lines');
  const trailing = collAt >= 0 ? facts.list.filter((f) => ownKeys.indexOf(f.key) > collAt) : [];
  const items = seqGroupsOf(rawItems, node, ctx.degradations ?? null);
  const namedChildren = namedChildEntries(node);
  const emptyState = (Array.isArray(node._items) && node._items.length === 0 && node._empty) ? node._empty : null;
  const titleConsumed = Boolean(choice && choice.kind === 'bool' && headingKey);
  // 轮 57 站点头区横栏（所有页的 header 同一规则）：模型里以命名子区域 `header` 声明的页眉
  // 区域是站点顶栏（导航项横排，无目标账号入口 pill 靠右）。判定只认区域名，不认站名；
  // HTML 用 .header-bar 画出横栏，文本/MD 目标保持逐行（同决策、目标各自形态）。
  const headerBar = region === 'header';
  // ---- width tier (round 58 · L-1): page-level sections declare ONE width, no per-page cases.
  // True page sections: every depth-1 node that is not a card/table cell (ctx.grid) — including
  // root-level `_lines` members (airbnb listing sections, taobao marketing rows, apple banner
  // units), which ARE page sections. bleed is ONLY a declared banner; a section whose collection
  // declares columns is wide (the grid needs the container); prose = an all-prose reading
  // section (74ch, centered); wide = card/feed/table sections; narrow = default content.
  // This kills same-page width jumps (U-23/U-25/U-26/U-27).
  const widthTier = (() => {
    if (ctx.grid || depth !== 1) return null;
    if (headerBar || region === 'footer') return 'wide';
    if (banner) return 'bleed';
    if (items.groups.some((g) => g.cols)) return 'wide';
    const forms = items.groups.map((g) => g.form);
    if (forms.length && forms.every((f) => f === 'prose')) return 'prose';
    if (forms.some((f) => ['cards', 'product-cards', 'image-strip', 'table', 'compare-table'].includes(f))) return 'wide';
    return 'narrow';
  })();
  // ---- column decision (round 58 · L-4): wide-layer card/feed sets declare an auto-fill grid
  // (2–4 columns at desktop width) when the members are PREDOMINANTLY image cards of card-sized
  // text (≥75% carry their own image; taobao 猜你喜欢 / bilibili 视频卡 / apple 媒体卡 — U-26/U-25).
  // The odd group-row member (intent + nested set, no image) stays a full-width text card inside
  // the grid. Reading sets (long text, sspai 正文) carry no images ⇒ stay single-column. The
  // declaration is shared; a linear target simply ignores it.
  for (const g of items.groups) {
    const imgShare = g.items.filter((it) => Boolean(it._image)).length;
    g.cols = ['stack', 'cards', 'product-cards'].includes(g.form) && g.items.length >= 3
      && imgShare / g.items.length >= 0.75
      && g.items.every((it) => textLenOf(it) <= 160) ? 'auto' : 0;
  }
  // ---- media-first (round 58 · L-6) is a GROUP decision: mediaFirstOf(items, form) below.
  return {
    ok: true, visible: true, scope, headingKey, headingValue: headingKey ? node[headingKey] : null,
    headingText, demoted: isDemoted(node), primary, facts: { ...facts, trailing }, action, hasAction: Boolean(node._action),
    titleIsControl, choice, actionRow: actionRow.row, rowConsumed: actionRow.consumed,
    items, namedChildren: orderedNamedChildren(namedChildEntries(node)), emptyState, titleConsumed, fieldSubmit, banner, headerBar,
    widthTier,
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
