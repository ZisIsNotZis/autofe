// Shared model helpers for the AutoFE M1 axioms (docs/m1/axioms-v0.md).
// Closed grammar: every key must be reserved, a role fact, or a named child.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const VOCAB = JSON.parse(fs.readFileSync(path.join(here, 'vocab.json'), 'utf8'));
export const ROLES = new Set(Object.values(VOCAB.roles).flat());
const domainPath = path.join(here, 'vocab-domain.json');
export const DOMAIN = fs.existsSync(domainPath) ? JSON.parse(fs.readFileSync(domainPath, 'utf8')) : { verbs: [] };
export const VERBS = new Set([...VOCAB.verbs, ...(DOMAIN.verbs ?? [])]);

export const RESERVED = new Set(['_intent', '_primary', '_key', '_when', '_action', '_rel', '_lines', '_items', '_expose', '_fields', '_empty']);
export const FIELDS = fs.existsSync(path.join(here, 'vocab-fields.json')) ? JSON.parse(fs.readFileSync(path.join(here, 'vocab-fields.json'), 'utf8')).fields : {};

export const isReserved = (k) => RESERVED.has(k);
export const roleOf = (k) => (k.startsWith('_') ? k.slice(1) : null);
export const isRoleKey = (k) => k.startsWith('_') && ROLES.has(k.slice(1));
export const isNamedChildKey = (k) => !k.startsWith('_') && /^[A-Za-z][A-Za-z0-9_-]*$/.test(k);

// ---- typed values (§2, closed) -------------------------------------------
const VALUE_SHAPE = {
  text: [], num: ['unit'], money: ['currency', 'qualifier'], date: [],
  bool: [], image: ['alt'], video: [], icon: [], ref: [], list: [], secret: [],
};
export function valueTypeOf(v) {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return null;
  const keys = Object.keys(v);
  const primary = keys.find((k) => k in VALUE_SHAPE);
  if (primary === undefined) return null;
  const extra = keys.filter((k) => k !== primary && !VALUE_SHAPE[primary].includes(k));
  if (extra.length) return null;
  const val = v[primary];
  if (primary === 'num' && typeof val !== 'number') return null;
  if (primary === 'money' && typeof val !== 'number') return null;
  if (primary === 'bool' && typeof val !== 'boolean') return null;
  if (primary === 'ref' && typeof val !== 'string') return null;
  if (primary === 'list' && (!Array.isArray(val) || val.some((e) => valueTypeOf(e) === null))) return null;
  if (['text', 'date', 'image', 'video', 'icon', 'secret'].includes(primary) && typeof val !== 'string') return null;
  return primary;
}
export function scalarOf(v) {
  const t = valueTypeOf(v);
  if (t === null) return undefined;
  if (t === 'list') return v.list.map(scalarOf);
  return v[t];
}

// ---- paths (§7): dot segments, each optionally indexed -------------------
const SEG = /^(_?[A-Za-z][A-Za-z0-9_-]*)(?:\[(\d+)\])?$/;
export function resolvePath(root, node, p) {
  if (typeof p !== 'string' || !p) return { ok: false, why: 'empty' };
  let cur = node, rest = p;
  if (p.startsWith('/')) { cur = root; rest = p.slice(1); }
  if (!rest) return { ok: false, why: 'empty' };
  for (const seg of rest.split('.')) {
    const m = SEG.exec(seg);
    if (!m) return { ok: false, why: `bad segment "${seg}"` };
    const v = cur[m[1]];
    if (v === undefined) return { ok: false, why: `no key "${m[1]}"` };
    if (m[2] !== undefined) {
      if (!Array.isArray(v)) return { ok: false, why: `"${m[1]}" is not a list` };
      if (!(+m[2] in v)) return { ok: false, why: `index ${m[2]} out of range` };
    }
    cur = m[2] === undefined ? v : v[+m[2]];
  }
  return { ok: true, node: cur };
}
export function findKey(root, key) {
  let found = null;
  walk(root, (n) => { if (found === null && n._key === key) found = n; });
  return found;
}

// ---- tree walk ------------------------------------------------------------
export function childrenOf(node) {
  const out = [];
  for (const [k, v] of Object.entries(node)) {
    if (k === '_lines' || k === '_items') { (v || []).forEach((c, i) => out.push({ key: `${k}[${i}]`, node: c })); }
    else if (!k.startsWith('_')) out.push({ key: k, node: v });
  }
  return out;
}
export function walk(node, fn, p = '', parent = null) {
  fn(node, p, parent);
  for (const c of childrenOf(node)) walk(c.node, fn, p ? `${p}.${c.key}` : c.key, node);
}
export function factsOf(node) {
  return Object.entries(node).filter(([k]) => isRoleKey(k)).map(([k, v]) => ({ role: roleOf(k), value: v, key: k }));
}

// ---- condition micro-grammar (§5) ----------------------------------------
const TOKEN = /\s*(>=|<=|==|!=|>|<|\(|\)|\b(?:and|or|true|false)\b|[A-Za-z][A-Za-z0-9_.\[\]-]*|\d+(?:\.\d+)?|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/gy;
export function tokenize(src) {
  const out = []; let pos = 0; TOKEN.lastIndex = 0;
  while (pos < src.length) {
    TOKEN.lastIndex = pos;
    const m = TOKEN.exec(src);
    if (!m) { if (src.slice(pos).trim() === '') break; return { ok: false, why: `bad token at "${src.slice(pos, pos + 12)}"` }; }
    out.push(m[1].trim()); pos = TOKEN.lastIndex;
  }
  return { ok: true, tokens: out };
}
export function parseExpr(src) {
  const t = tokenize(src); if (!t.ok) return t;
  const toks = t.tokens; let i = 0;
  const peek = () => toks[i];
  const eat = (x) => { if (toks[i] === x) { i++; return true; } return false; };
  function primary() {
    const tk = peek();
    if (tk === undefined) return { ok: false, why: 'unexpected end' };
    if (tk === '(') { i++; const e = or(); if (!e.ok) return e; if (!eat(')')) return { ok: false, why: 'missing )' }; return e; }
    if (tk === 'true' || tk === 'false') { i++; return { ok: true, kind: 'lit', value: tk === 'true' }; }
    if (/^["']/.test(tk)) { i++; return { ok: true, kind: 'lit', value: tk.slice(1, -1) }; }
    if (/^\d/.test(tk)) { i++; return { ok: true, kind: 'lit', value: parseFloat(tk) }; }
    if (tk === 'count') {
      i++;
      if (!eat('(')) return { ok: false, why: 'count( expects (' };
      const inner = peek();
      if (!inner || !/^[A-Za-z]/.test(inner)) return { ok: false, why: 'count( expects a path' };
      i++;
      if (!eat(')')) return { ok: false, why: 'count( missing )' };
      return { ok: true, kind: 'count', path: inner };
    }
    if (/^[A-Za-z]/.test(tk)) { i++; return { ok: true, kind: 'path', path: tk }; }
    return { ok: false, why: `unexpected "${tk}"` };
  }
  function cmp() {
    const a = primary(); if (!a.ok) return a;
    const op = peek();
    if (['==', '!=', '>', '<', '>=', '<='].includes(op)) { i++; const b = primary(); if (!b.ok) return b; return { ok: true, kind: 'cmp', op, a, b }; }
    return { ok: true, kind: 'truthy', a };
  }
  function and() { let e = cmp(); if (!e.ok) return e; while (peek() === 'and') { i++; const r = cmp(); if (!r.ok) return r; e = { ok: true, kind: 'and', a: e, b: r }; } return e; }
  function or() { let e = and(); if (!e.ok) return e; while (peek() === 'or') { i++; const r = and(); if (!r.ok) return r; e = { ok: true, kind: 'or', a: e, b: r }; } return e; }
  const e = or();
  if (!e.ok) return e;
  if (i !== toks.length) return { ok: false, why: `trailing "${toks.slice(i).join(' ')}"` };
  return e;
}
export function exprPaths(ast, out = []) {
  if (!ast || typeof ast !== 'object') return out;
  if (ast.kind === 'path' || ast.kind === 'count') out.push(ast.path);
  if (ast.a) exprPaths(ast.a, out);
  if (ast.b) exprPaths(ast.b, out);
  return out;
}
export function evalExpr(ast, scope) {
  const val = (n) => {
    if (n.kind === 'lit') return n.value;
    const v = scope[n.path];
    if (n.kind === 'count') return Array.isArray(v) ? v.length : (v === undefined ? undefined : 1);
    return v;
  };
  switch (ast.kind) {
    case 'lit': return ast.value;
    case 'path': return scope[ast.path];
    case 'truthy': return Boolean(val(ast.a));
    case 'cmp': {
      const a = val(ast.a), b = val(ast.b);
      if (a === undefined || b === undefined) return false;
      switch (ast.op) {
        case '==': return a === b; case '!=': return a !== b;
        case '>': return a > b; case '<': return a < b;
        case '>=': return a >= b; case '<=': return a <= b;
      }
      return false;
    }
    case 'and': return evalExpr(ast.a, scope) && evalExpr(ast.b, scope);
    case 'or': return evalExpr(ast.a, scope) || evalExpr(ast.b, scope);
  }
}
// scope: role -> scalar, nearest ancestor/node wins.
// An `_expose` declaration puts its name in scope too (D1): a node declaring
// `{name: "selected"}` makes `selected` referenceable by conditions. The VALUE is
// the context injection of that name (the backend's known state, design-basis §6
// 交互回路) when present; otherwise the declared-but-unset default ([] for a
// multiple choice, undefined for a single one). Nearest declaration wins.
export function scopeFor(chain, context = {}) {
  const s = {};
  for (const node of chain) {
    for (const f of factsOf(node)) s[f.role] = scalarOf(f.value);
    const e = exposeOf(node);
    if (e) s[e.name] = e.name in context ? context[e.name] : (e.multiple === true ? [] : undefined);
  }
  return s;
}

// resolve a path together with the object that holds its last segment
export function resolveWithParent(root, node, p) {
  if (typeof p !== 'string' || !p) return { ok: false, why: 'empty' };
  let cur = node, holder = null, lastKey = null, rest = p;
  if (p.startsWith('/')) { cur = root; rest = p.slice(1); }
  const segs = rest.split('.');
  for (let i = 0; i < segs.length; i++) {
    const m = SEG.exec(segs[i]);
    if (!m) return { ok: false, why: `bad segment "${segs[i]}"` };
    const v = cur[m[1]];
    if (v === undefined) return { ok: false, why: `no key "${m[1]}"` };
    if (m[2] !== undefined) {
      if (!Array.isArray(v)) return { ok: false, why: `"${m[1]}" is not a list` };
      if (!(+m[2] in v)) return { ok: false, why: `index ${m[2]} out of range` };
    }
    holder = cur; lastKey = m[1];
    cur = m[2] === undefined ? v : v[+m[2]];
  }
  return { ok: true, node: cur, holder, lastKey };
}

// ---- exposed facts (§6.1) -------------------------------------------------
// A node with _expose declares that interacting with it yields a fact.
// Groups with _items expose the chosen item's name/title; bare nodes expose an input.
export function exposeOf(node) {
  const e = node._expose;
  if (!e || typeof e !== 'object' || Array.isArray(e)) return null;
  if (typeof e.name !== 'string' || !/^[a-z][a-z0-9-]*$/.test(e.name)) return null;
  if (!VOCAB.valueTypes.includes(e.type)) return null;
  return e;
}
export function exposedRoles(chain) {
  const s = {};
  for (const n of chain) { const e = exposeOf(n); if (e) s[e.role] = undefined; }
  return s;
}
