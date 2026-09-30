// Validator for the AutoFE M1 axioms (docs/m1/axioms-v0.md). All findings are
// blocking errors: the grammar is closed, so an unknown key is a failure, not
// a warning. Usage: node m1/validate.mjs <model.json> [more.json...]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const CONTEXT = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'vocab-context.json'), 'utf8')).context;
import {
  VOCAB, ROLES, VERBS, FIELDS, isReserved, isRoleKey, roleOf, isNamedChildKey,
  valueTypeOf, resolvePath, findKey, childrenOf, walk, parseExpr, exprPaths, exposeOf,
} from './model-lib.mjs';

// typed values are a closed set: a reserved key holding a non-typed object is a hard error (F-031)
const VALUE_KEYS = ['text', 'num', 'money', 'date', 'time', 'bool', 'image', 'video', 'icon', 'ref', 'list'];
function isTypedValue(v) {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  return Object.keys(v).some((k) => VALUE_KEYS.includes(k));
}
const VALUE_HOLDERS = ['_image', '_video', '_icon', '_name', '_title', '_label', '_text', '_subtitle', '_detail', '_summary', '_price', '_count', '_measure', '_author', '_category', '_tag', '_status', '_variant', '_option'];
export function validate(model) {
  const shapeErrors = [];
  // _expose.type must be a known value type, else it silently becomes plain text (F-031)
  const errors = [];
  const err = (p, msg) => errors.push({ path: p || '/', message: msg });
  const keysSeenByKeyValue = new Map();

  function checkNode(node, p, chain, isItemEl = false) {
    if (node === null || typeof node !== 'object' || Array.isArray(node)) {
      err(p, 'node must be an object'); return;
    }
    const keys = Object.keys(node);
    const hasChildren = keys.some((k) => !k.startsWith('_')) || Array.isArray(node._lines) || Array.isArray(node._items);

    for (const k of keys) {
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
        if (r.order !== undefined && !['sequence', 'time', 'none'].includes(r.order)) err(`${p}._rel.order`, 'order must be sequence|time|none');
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
    for (const rp of exprPaths(ast)) {
      const head = rp.split(/[.\[]/)[0];
      if (!(head in scope)) err(at, `condition path "${rp}" resolves to no fact, exposure, or context name`);
    }
    void scope;  }

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
  return { ok: errors.length === 0, errors };
}

export function validateFiles(files) {
  let bad = 0;
  for (const f of files) {
    const model = JSON.parse(fs.readFileSync(f, 'utf8'));
    const r = validate(model);
    if (!r.ok) {
      bad++;
      console.error(`FAIL ${f}`);
      for (const e of r.errors) console.error(`   ${e.path}: ${e.message}`);
    } else console.log(`ok   ${f}`);
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
