// Validator for the AutoFE M1 axioms (docs/m1/axioms-v0.md). All findings are
// blocking errors: the grammar is closed, so an unknown key is a failure, not
// a warning. Usage: node m1/validate.mjs <model.json> [more.json...]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const CONTEXT = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'vocab-context.json'), 'utf8')).context;
import {
  VOCAB, ROLES, VERBS, FIELDS, COMPOSITES, isReserved, isRoleKey, roleOf, isNamedChildKey,
  valueTypeOf, resolvePath, findKey, childrenOf, walk, parseExpr, exprPaths, exposeOf,
} from './model-lib.mjs';

// typed values are a closed set: a reserved key holding a non-typed object is a hard error (F-031)
const VALUE_KEYS = ['text', 'num', 'money', 'date', 'time', 'bool', 'image', 'video', 'icon', 'ref', 'list', 'secret'];
function isTypedValue(v) {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  return Object.keys(v).some((k) => VALUE_KEYS.includes(k));
}
const VALUE_HOLDERS = ['_image', '_video', '_icon', '_name', '_title', '_label', '_text', '_subtitle', '_detail', '_summary', '_price', '_count', '_measure', '_author', '_category', '_tag', '_status', '_variant', '_option', '_default'];
export function validate(model) {
  const shapeErrors = [];
  // _expose.type must be a known value type, else it silently becomes plain text (F-031)
  const errors = [];
  const err = (p, msg, code) => errors.push(code ? { path: p || '/', message: msg, code } : { path: p || '/', message: msg });
  // Warning channel (round 49, F-091.b): a composite can be structurally legal yet worth
  // telling the curator (docs/m1/composites.md §3.3). Warnings never affect `ok`/exit code,
  // but they MUST be printed and surfaced in the pipeline summary — a warning no one sees
  // is an error in disguise (the round-48 reason two single-row families were not migrated).
  const warnings = [];
  const warn = (p, msg, code) => warnings.push(code ? { path: p || '/', message: msg, code } : { path: p || '/', message: msg });
  const keysSeenByKeyValue = new Map();

  function checkNode(node, p, chain, isItemEl = false) {
    if (node === null || typeof node !== 'object' || Array.isArray(node)) {
      err(p, 'node must be an object'); return;
    }
    const keys = Object.keys(node);
    const hasChildren = keys.some((k) => !k.startsWith('_')) || Array.isArray(node._lines) || Array.isArray(node._items);
    if (node._composite !== undefined) checkCompositeNode(node, p);

    for (const k of keys) {
      if (k === '_composite') {
        if (typeof node[k] !== 'string' || !Object.prototype.hasOwnProperty.call(COMPOSITES.composites ?? {}, node[k])) {
          err(`${p}._composite`, `_composite type "${node[k]}" is not a key of the closed registry m1/composites.json (adding a type is a grammar+vocabulary change)`, 'E_COMPOSITE_UNKNOWN_TYPE');
        }
        continue;
      }
      if (k === '_fields') {
        const f = node[k];
        if (!f || typeof f !== 'object' || Array.isArray(f)) { err(`${p}._fields`, '_fields must be an object of declared domain fields'); continue; }
        for (const [fn, fv] of Object.entries(f)) {
          if (!FIELDS[fn]) err(`${p}._fields.${fn}`, `domain field "${fn}" not declared in vocab-fields.json (declare it there once per domain, with its column label)`);
          else if (valueTypeOf(fv) === null) err(`${p}._fields.${fn}`, 'field value must be a closed typed value');
        }
        continue;
      }
      if (k === '_empty') {
        if (typeof node[k] !== 'object' || node[k] === null || Array.isArray(node[k])) err(`${p}._empty`, '_empty must be a storyline node');
        if (!Array.isArray(node._items)) err(`${p}._empty`, '_empty is only meaningful on a collection (a node with _items)');
        continue;
      }
      if (VALUE_HOLDERS.includes(k)) {
        // a malformed typed value would silently print as raw JSON in the render
        if (valueTypeOf(node[k]) === null) err(`${p}.${k}`, `${k} must hold a closed typed value`);
        continue;
      }
      if (isReserved(k)) continue;
      if (isRoleKey(k)) {
        const t = valueTypeOf(node[k]);
        if (t === null) err(`${p}.${k}`, `value of role "${roleOf(k)}" is not a closed typed value (§2)`);
        continue;
      }
      if (k.startsWith('_')) { err(`${p}.${k}`, `unknown reserved-style key "_${k.slice(1)}" (not in §1 reserved set, not a vocabulary role)`); continue; }
      if (!isNamedChildKey(k)) { err(`${p}.${k}`, 'named child key must match [A-Za-z][A-Za-z0-9_-]*'); continue; }
      if (typeof node[k] !== 'object' || node[k] === null || Array.isArray(node[k])) err(`${p}.${k}`, 'named child must be a node object');
    }

    if (hasChildren && !isItemEl && typeof node._intent !== 'string') err(p, 'missing _intent: every group/storyline node must say why it exists (collection elements are exempt: their reason is the collection intent, F-017)');

    if (node._intent !== undefined && typeof node._intent !== 'string') err(`${p}._intent`, '_intent must be a string');
    if (node._key !== undefined && typeof node._key !== 'string') err(`${p}._key`, '_key must be a string');

    // _primary resolves within this subtree, relative to this node
    if (node._primary !== undefined) {
      if (typeof node._primary !== 'string') err(`${p}._primary`, '_primary must be a relative path string');
      else {
        const r = resolvePath(node, node, node._primary);
        if (!r.ok) err(`${p}._primary`, `_primary does not resolve: ${r.why} (${node._primary})`);
        else if (r.node === node) err(`${p}._primary`, '_primary must point at a descendant, not at itself');
        // 父代理裁定（轮 6/7）：_primary 的语义是“主事实”，必须解析到一个角色事实
        // （§2 的封闭类型化值）。指向节点或内联对象是非法声明，硬报错。
        else if (valueTypeOf(r.node) === null) err(`${p}._primary`, `_primary must resolve to a role fact (a closed typed value), not a node or inline object (${node._primary})`);
      }
    }

    // _when
    const nodeChain = [...chain, node];
    if (node._when !== undefined) checkExpr(node._when, `${p}._when`, nodeChain);

    // _action
    if (node._action !== undefined) {
      const a = node._action;
      if (a === null || typeof a !== 'object' || Array.isArray(a)) err(`${p}._action`, '_action must be an object');
      else {
        if (typeof a.verb !== 'string' || !VERBS.has(a.verb)) err(`${p}._action.verb`, `verb "${a.verb}" not in vocabulary (adding one is a vocabulary change, log it first)`);
        if (a.to !== undefined && typeof a.to !== 'string') err(`${p}._action.to`, 'to must be a string (key:, /path or URL)');
        if (a.label !== undefined && typeof a.label !== 'string') err(`${p}._action.label`, 'label must be a string (the action\'s display copy, F-022)');
        if (a.when !== undefined) checkExpr(a.when, `${p}._action.when`, nodeChain);
        if (a.params !== undefined) {
          if (typeof a.params !== 'object' || a.params === null || Array.isArray(a.params)) err(`${p}._action.params`, 'params must be an object of name -> type');
          else for (const [n, ty] of Object.entries(a.params)) {
            if (!VOCAB.valueTypes.includes(ty)) err(`${p}._action.params.${n}`, `param type "${ty}" not in closed value types`);
          }
        }
        const extra = Object.keys(a).filter((k) => !['verb', 'to', 'when', 'params', 'label'].includes(k));
        for (const k of extra) err(`${p}._action.${k}`, `unknown action key "${k}"`);
      }
    }

    // _expose
    if (node._expose !== undefined && exposeOf(node) === null) {
      err(`${p}._expose`, '_expose must be {name, type}: name is a page-scoped identifier (kebab-case), type is one of the closed value types');
    }

    // _rel
    if (node._rel !== undefined) {
      const r = node._rel;
      if (r === null || typeof r !== 'object' || Array.isArray(r)) err(`${p}._rel`, '_rel must be an object');
      else {
        if (r.compare !== undefined && typeof r.compare !== 'boolean') err(`${p}._rel.compare`, 'compare must be boolean');
        if (r.order !== undefined && !['sequence', 'time', 'rank', 'stream', 'none'].includes(r.order)) err(`${p}._rel.order`, 'order must be sequence|time|rank|stream|none');
        if (r.level !== undefined && (typeof r.level !== 'number' || r.level < 0)) err(`${p}._rel.level`, 'level must be a non-negative number');
        for (const k of Object.keys(r)) if (!['compare', 'order', 'level'].includes(k)) err(`${p}._rel.${k}`, `unknown relation predicate "${k}" (§4 is closed; presentation predicates are banned)`);
      }
    }

    // identity register (same _key = same element; legal, but must exist)
    if (typeof node._key === 'string') {
      const prev = keysSeenByKeyValue.get(node._key);
      if (prev !== undefined && prev._intent !== node._intent) err(p, `_key "${node._key}" reused with different _intent (a shared element must have one identity and one intent)`);
      keysSeenByKeyValue.set(node._key, node);
    }

    const nextChain = [...chain, node];
    for (const c of childrenOf(node)) {
      const isItem = c.key.startsWith('_items[');
      checkNode(c.node, p ? `${p}.${c.key}` : c.key, nextChain, isItem);
    }
  }

  function checkExpr(src, at, chain) {
    if (typeof src !== 'string') { err(at, 'condition must be a string'); return; }
    const ast = parseExpr(src);
    if (!ast.ok) { err(at, `condition does not parse: ${ast.why}`); return; }
    const scope = {};
    for (const n of chain) {
      for (const [k, v] of Object.entries(n)) if (isRoleKey(k)) scope[k.slice(1)] = v;
      const e = exposeOf(n); if (e) scope[e.name] = undefined; // declared exposure satisfies resolution
    }
    for (const name of Object.keys(CONTEXT)) scope[name] = scope[name] ?? undefined; // context names always resolve
    const root = chain[0];
    for (const rp of exprPaths(ast)) {
      // A bare identifier is a fact name (role / _expose.name / context): unchanged (§4.2).
      if (/^[A-Za-z][A-Za-z0-9_-]*$/.test(rp)) {
        if (!(rp in scope)) err(at, `condition path "${rp}" resolves to no fact, exposure, or context name`, 'E_EXPR_PATH');
        continue;
      }
      // A dotted/indexed path (or an absolute `/…` path) is a TREE path (§4.2): relative to the
      // node writing the condition, climbing to each ancestor; leading `/` from the document root.
      let r = null;
      if (rp.startsWith('/')) r = resolvePath(root, root, rp);
      else for (let i = chain.length - 1; i >= 0 && !r; i--) { const t = resolvePath(root, chain[i], rp); if (t.ok) r = t; }
      if (!r || !r.ok) { err(at, `condition path "${rp}" resolves to no node (${r ? r.why : 'relative resolution failed'})`, 'E_PATH_UNRESOLVED'); continue; }
      const term = r.node;
      const isFact = Array.isArray(term)
        || (term && typeof term === 'object' && (term._expose !== undefined || valueTypeOf(term) !== null || Array.isArray(term._items)));
      if (!isFact) err(at, `condition path "${rp}" does not end at an exposed fact (a node with _expose or a role fact)`, 'E_PATH_NOT_A_FACT');
    }
    void scope;  }

  // ---- composite instances (docs/m1/composites.md §2/§3) -------------------
  // The registry is the single closed source of truth. An instance is projected onto its
  // type's schema; every declared-but-missing REQUIRED slot is a hard error (that IS what
  // "missing a required part" means), every schema-undeclared field slot is a hard error,
  // and nesting is refused. Hard errors carry a stable `code` so gates/fixtures can assert by code.
  const CCODE = {
    UNKNOWN: 'E_COMPOSITE_UNKNOWN_TYPE', MISSING: 'E_COMPOSITE_MISSING_REQUIRED', BAD: 'E_COMPOSITE_BAD_FIELD',
    NOT_ALLOWED: 'E_COMPOSITE_NOT_ALLOWED', NESTED: 'E_COMPOSITE_NESTED', EXPOSE: 'E_COMPOSITE_EXPOSE_MISSING',
    ROWS: 'E_COMPOSITE_ROWS_INCONSISTENT', FIELD: 'E_COMPOSITE_FIELD_UNDECLARED',
    ACTION: 'E_COMPOSITE_ACTION_CARDINALITY', REF: 'E_COMPOSITE_REF_UNRESOLVED',
  };
  const FIELDISH = ['_items', '_fields', '_action', '_expose', '_ref', '_count', '_empty', '_default'];
  const expMatch = (e, d) => {
    if (!e || !d) return false;
    if (typeof d.name === 'string' && d.name !== '*' && e.name !== d.name) return false;
    if (d.type) { const ts = Array.isArray(d.type) ? d.type : [d.type]; if (!ts.includes(e.type)) return false; }
    return true;
  };
  function checkCompositeNode(inst, ip) {
    const type = inst._composite;
    const registry = COMPOSITES.composites ?? {};
    // the key loop already reports an unknown/non-string type as E_COMPOSITE_UNKNOWN_TYPE
    if (typeof type !== 'string' || !Object.prototype.hasOwnProperty.call(registry, type)) return;
    const schema = registry[type];
    const fields = schema.fields ?? {};
    // Nesting (round 51, ruling A.(4)): a composite MAY contain another composite iff the
    // outer schema declares a slot that carries that child type (e.g. form.pagination for a
    // nested paginator). A nested composite's own subtree is OUT OF the outer's field scope
    // (docs/m1/composites.md §5: "字段 = 子树减去任何嵌套复合件的子树"), so we stop collecting
    // there — its `_items`/`_ref`/`_expose` belong to the child, not the parent.
    const nodes = [], nested = [];
    (function collect(n, dp) {
      nodes.push({ n, p: dp ? `${ip}.${dp}` : ip });
      for (const c of childrenOf(n)) {
        const child = c.node;
        if (child && typeof child === 'object' && !Array.isArray(child) && child._composite !== undefined) {
          nested.push({ n: child, p: dp ? `${ip}.${dp}.${c.key}` : `${ip}.${c.key}` });
          continue;
        }
        collect(child, dp ? `${dp}.${c.key}` : c.key);
      }
    })(inst, '');
    for (const { n, p } of nested) {
      const declaredNested = Object.values(fields).some((f) => f.composite === n._composite);
      if (!declaredNested) err(p, `composite "${type}" must not nest another composite ("${n._composite}"): no slot declares it`, CCODE.NESTED);
    }
    const exposures = nodes.filter(({ n }) => exposeOf(n));
    const actions = nodes.filter(({ n }) => n._action && typeof n._action === 'object' && typeof n._action.verb === 'string');
    const declaredKeys = new Set(Object.values(fields).map((f) => f.key));
    const covered = (k) => {
      for (const f of Object.values(fields)) {
        if (f.key === k) return true;
        if (k === '_expose' && (f.key === '<expose>' || (f.key === '<child>' && f.expose))) return true;
        if (k === '_action' && f.action && (f.key === '<child>' || f.key === '_action')) return true;
        // Round 51 (ruling A.(1)): a slot DECLARED with shape 'expose-collection' (e.g.
        // search.scope: an …_items node that also carries _expose) covers its `_items`. The
        // validator previously honoured only 'collection', silently refusing a declared slot.
        if (k === '_items' && f.key === '<child>' && (f.shape === 'collection' || f.shape === 'expose-collection')) return true;
      }
      return false;
    };
    for (const k of FIELDISH) {
      if (!nodes.some(({ n }) => n && typeof n === 'object' && n[k] !== undefined)) continue;
      if (declaredKeys.has(k) || covered(k)) continue;
      err(ip, `composite "${type}" has no field slot for "${k}" (declared slots: ${[...declaredKeys].join(', ')})`, CCODE.NOT_ALLOWED);
    }
    const presence = {};
    for (const [slot, f] of Object.entries(fields)) {
      if (f.derived) { presence[slot] = true; continue; }
      const matches = (d) => exposures.filter(({ n }) => expMatch(exposeOf(n), d ?? {}));
      const expCount = matches(f.expose).length;
      let present;
      if (f.key === '<expose>') present = expCount > 0;
      else if (f.key === '<child>') {
        if (f.action) present = actions.some(({ n }) => (f.action.verbs ?? []).includes(n._action.verb));
        else if (f.expose) present = matches(f.expose).length > 0;
        else present = Object.keys(inst).some((k) => !k.startsWith('_'));
      } else if (f.key === '_expose') present = matches(f.expose).length > 0;
      else if (f.key === '_action') present = actions.some(({ n }) => (f.action?.verbs ?? []).includes(n._action.verb));
      else if (f.key === '_items') present = Array.isArray(inst._items) && inst._items.length > 0;
      else if (f.key === '_fields') present = Array.isArray(inst._items) && inst._items.some((r) => r && r._fields);
      else present = inst[f.key] !== undefined;
      presence[slot] = present;
      if (f.action) {
        const verbs = f.action.verbs ?? [];
        const matched = actions.filter(({ n }) => verbs.includes(n._action.verb));
        if (f.action.cardinality !== undefined) {
          if (matched.length !== f.action.cardinality) err(ip, `composite "${type}" field "${slot}" expects exactly ${f.action.cardinality} action(s) with verb ∈ {${verbs.join(', ')}}, found ${matched.length}`, CCODE.ACTION);
          continue;
        }
        // Round 51 (ruling A.(2)): `atMost` = "never two submits", optional when zero.
        // Many real forms apply instantly (a filter panel is one); the hard invariant worth
        // enforcing is that no form carries TWO submit actions. login keeps exact `cardinality`.
        if (f.action.atMost !== undefined) {
          if (matched.length > f.action.atMost) err(ip, `composite "${type}" field "${slot}" allows at most ${f.action.atMost} action(s) with verb ∈ {${verbs.join(', ')}}, found ${matched.length}`, CCODE.ACTION);
          continue;
        }
        if (!present && f.required) err(ip, `composite "${type}" is missing required field "${slot}" (schema m1/composites.json#${type}.fields.${slot})`, CCODE.MISSING);
        continue;
      }
      if (!present) {
        if (f.required) {
          const named = typeof f.expose?.name === 'string' && f.expose.name !== '*';
          err(ip, `composite "${type}" is missing required field "${slot}" (schema m1/composites.json#${type}.fields.${slot})`, named ? CCODE.EXPOSE : CCODE.MISSING);
        }
        continue;
      }
      if (f.type && inst[f.key] !== undefined) {
        const got = valueTypeOf(inst[f.key]);
        const want = Array.isArray(f.type) ? f.type : [f.type];
        if (got === null || !want.includes(got)) err(`${ip}.${f.key}`, `composite "${type}" field "${slot}" must hold a ${want.join('|')} value (got ${got ?? 'a non-value'})`, CCODE.BAD);
      }
      if (f.min !== undefined && expCount > 0 && expCount < f.min) err(ip, `composite "${type}" field "${slot}" needs ≥${f.min} fields, found ${expCount}`, CCODE.BAD);
    }
    for (const group of schema.requireOneOf ?? []) {
      if (!group.some((s) => presence[s])) err(ip, `composite "${type}" requires at least one of: ${group.join(', ')}`, CCODE.MISSING);
    }
    // W_COMPOSITE_NAME_ONLY_WATERMARK (round 50, S4; docs §3.3 / §6.4 S4①): a composite that
    // declares its NAME but no default value falls back to the engine watermarking the name
    // inside the box (§5.1 `render: watermark-fallback`). Structurally legal — it warns, never
    // blocks. Driven by the registry's own `render` marker, not a hardcoded type name.
    const nameSlot = Object.entries(fields).find(([, f]) => f.key === '_label');
    for (const [slot, f] of Object.entries(fields)) {
      if (f.render !== 'watermark-fallback' || presence[slot]) continue;
      if (!nameSlot || !presence[nameSlot[0]]) continue;
      warn(ip, `composite "${type}" declares its name but no "${slot}" value — the engine falls back to watermarking the name in the box (schema m1/composites.json#${type}.fields.${slot})`, 'W_COMPOSITE_NAME_ONLY_WATERMARK');
    }
    if (type === 'table') {
      const rows = Array.isArray(inst._items) ? inst._items.filter((r) => r && typeof r === 'object') : [];
      const withF = rows.filter((r) => r._fields);
      // F-091.a: a row with no `_fields` block at all must not slip past the per-row
      // consistency check. "every row declares the same column set" only holds if every
      // row declares a set; comparing just the rows that happen to have one is silent.
      const noFields = rows.filter((r) => !r._fields);
      if (withF.length && noFields.length) err(ip, `table row(s) declare no _fields at all: ${noFields.length} of ${rows.length} rows are missing their field block (every row must declare the same column set)`, CCODE.ROWS);
      // F-091.b: single-row table is legal but reads more like a deflist (docs §3.3).
      if (rows.length === 1) warn(ip, 'table has a single row — closer to a deflist than a table (structure is still legal; a curator call)', 'W_COMPOSITE_ROWS_TOO_FEW');
      if (withF.length) {
        const sigs = [...new Set(withF.map((r) => Object.keys(r._fields).sort().join('|')))];
        if (sigs.length > 1) err(ip, `table rows declare inconsistent field sets: ${sigs.map((s) => `[${s}]`).join(' vs ')}`, CCODE.ROWS);
        for (const r of withF) for (const [fn, fv] of Object.entries(r._fields)) {
          const decl = FIELDS[fn];
          if (!decl) { err(`${ip}._fields.${fn}`, `table field "${fn}" not declared in vocab-fields.json`, CCODE.FIELD); continue; }
          const vt = valueTypeOf(fv);
          const blank = vt === 'text' && fv.text === '';   // an explicit blank cell (S0: aws data-transfer group rows)
          if (vt === null) err(`${ip}._fields.${fn}`, `table field "${fn}" value must be a closed typed value`, CCODE.FIELD);
          else if (!blank && decl.type && vt !== decl.type) err(`${ip}._fields.${fn}`, `table field "${fn}" value type "${vt}" does not match declared "${decl.type}"`, CCODE.FIELD);
        }
      }
    }
    if (type === 'paginator' && inst._ref && valueTypeOf(inst._ref) === 'ref') {
      const target = inst._ref.ref;
      const dangling = target.startsWith('key:')
        ? !findKey(model, target.slice(4))
        : (target.startsWith('/') ? !resolvePath(model, model, target).ok : true);
      if (dangling) err(ip, `paginator _ref "${target}" does not resolve to a page collection`, CCODE.REF);
    }
  }

  checkNode(model, '', []);
  // refs resolve document-wide
  walk(model, (node, p) => {
    for (const [k, v] of Object.entries(node)) {
      if (!isRoleKey(k) || valueTypeOf(v) !== 'ref') continue;
      const target = v.ref;
      if (target.startsWith('key:')) { if (!findKey(model, target.slice(4))) err(`${p}.${k}`, `ref ${target}: no node carries that _key`); }
      else if (target.startsWith('/')) { const r = resolvePath(model, model, target); if (!r.ok) err(`${p}.${k}`, `ref ${target}: ${r.why}`); }
      else err(`${p}.${k}`, `ref must start with "key:" or "/" (got "${target}")`);
    }
    if (typeof node._action?.to === 'string' && (node._action.to.startsWith('key:') || node._action.to.startsWith('/'))) {
      const t = node._action.to;
      if (t.startsWith('key:')) { if (!findKey(model, t.slice(4))) err(`${p}._action.to`, `action target ${t}: no node carries that _key`); }
      else { const r = resolvePath(model, model, t); if (!r.ok) err(`${p}._action.to`, `action target ${t}: ${r.why}`); }
    }
  });
  return { ok: errors.length === 0, errors, warnings };
}

export function validateFiles(files) {
  let bad = 0;
  for (const f of files) {
    const model = JSON.parse(fs.readFileSync(f, 'utf8'));
    const r = validate(model);
    if (!r.ok) {
      bad++;
      console.error(`FAIL ${f}`);
      for (const e of r.errors) console.error(`   ${e.path}: ${e.message}${e.code ? ` (${e.code})` : ''}`);
    } else {
      console.log(`ok   ${f}`);
      for (const w of r.warnings) console.log(`   warn ${w.path}: ${w.message}${w.code ? ` (${w.code})` : ''}`);
    }
  }
  return bad;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = process.argv.slice(2);
  if (!files.length) { console.error('usage: node m1/validate.mjs <model.json>...'); process.exit(2); }
  let bad = 0;
  try { bad = validateFiles(files); } catch (e) { console.error('error:', e.message); process.exit(2); }
  process.exit(bad ? 1 : 0);
}
