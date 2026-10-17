// Migrate the two closed page-semantics keys (docs/m1/composition.md §1.1) onto the curated
// models in the register: `_scope` (the page's role in its site) and `_subject` (what the page
// is about). The label comes ONLY from the capture archetype table in composition.md §1.1 —
// no site names, no per-page exceptions.
//
// The edit is line-surgical: the new keys are inserted immediately after the root `_key` line
// (fallback: after the root `_intent` line, else after the opening `{`), so the file's existing
// formatting survives byte for byte. Every write is guarded by a round-trip check — the result
// must re-parse to exactly the original model plus the added keys, with no other line changed —
// so a model is never left half-written.
//
// Usage: node m1/migrate-archetype-semantics.mjs [--dry-run]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');

// capture archetype -> { scope, subject? } — the table in docs/m1/composition.md §1.1, verbatim.
// A dash in the `_subject` column means the archetype declares no subject.
const ARCHETYPE_SEMANTICS = {
  'landing/home': { scope: 'entry' },
  'category/list': { scope: 'category' },
  'search-results': { scope: 'query' },
  'product-detail': { scope: 'entity', subject: 'offer' },
  'article/editorial': { scope: 'document', subject: 'document' },
  'docs/design-system': { scope: 'document', subject: 'document' },
  'profile/account': { scope: 'account', subject: 'account' },
  'table-heavy/admin': { scope: 'entity', subject: 'dataset' },
  'dashboard/data-viz': { scope: 'entity', subject: 'dataset' },
  'form/checkout/settings': { scope: 'form' },
};

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

function deepEqual(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
}

// Insert the two keys as lines, preserving every other byte. Returns the new text plus the
// inserted line indices so the caller can prove nothing else moved.
function insertSemantics(text, { scope, subject }) {
  const lines = text.split('\n');
  const openBrace = lines.findIndex((l) => l.trim() === '{');
  if (openBrace === -1) return { ok: false, why: 'root object does not open on its own line' };
  const firstMember = lines.findIndex((l, i) => i > openBrace && l.trim() !== '');
  if (firstMember === -1) return { ok: false, why: 'root object is empty' };
  const indent = lines[firstMember].match(/^[ \t]*/)[0];
  const atRoot = (name) => lines.findIndex((l) => l.startsWith(`${indent}"${name}":`));
  let anchor = atRoot('_key');
  if (anchor === -1) anchor = atRoot('_intent');
  if (anchor === -1) anchor = openBrace;

  const base = lines.slice();
  // A member line without a trailing comma (the anchor is the object's last member) needs one
  // before anything can follow it; that patch is part of the reported diff.
  let commaPatched = false;
  const trimmed = base[anchor].trimEnd();
  if (!trimmed.endsWith(',') && !trimmed.endsWith('{')) { base[anchor] = `${trimmed},`; commaPatched = true; }

  const entries = [`"_scope": ${JSON.stringify(scope)}`];
  if (subject !== undefined) entries.push(`"_subject": ${JSON.stringify(subject)}`);
  const inserted = entries.map((e) => `${indent}${e},`);
  const out = [...base.slice(0, anchor + 1), ...inserted, ...base.slice(anchor + 1)];
  return { ok: true, text: out.join('\n'), base, at: anchor + 1, count: inserted.length, commaPatched };
}

function migrate(key, semantics) {
  const file = path.join(here, 'curated', `${key}.json`);
  const before = fs.readFileSync(file, 'utf8');
  const original = JSON.parse(before);
  if (original._scope !== undefined || original._subject !== undefined) {
    const same = original._scope === semantics.scope
      && (semantics.subject === undefined ? original._subject === undefined : original._subject === semantics.subject);
    return same
      ? { status: 'unchanged' }
      : { status: 'conflict', why: `already declares _scope=${JSON.stringify(original._scope)} _subject=${JSON.stringify(original._subject)}; the archetype table says _scope=${JSON.stringify(semantics.scope)} _subject=${JSON.stringify(semantics.subject)}` };
  }
  const ins = insertSemantics(before, semantics);
  if (!ins.ok) return { status: 'integrity-failed', why: ins.why };

  // Round-trip integrity: the model must be the original plus exactly the added keys...
  const after = JSON.parse(ins.text);
  if (after._scope !== semantics.scope) return { status: 'integrity-failed', why: `_scope came back as ${JSON.stringify(after._scope)}` };
  if (semantics.subject === undefined ? after._subject !== undefined : after._subject !== semantics.subject) {
    return { status: 'integrity-failed', why: `_subject came back as ${JSON.stringify(after._subject)}` };
  }
  const stripped = { ...after };
  delete stripped._scope;
  delete stripped._subject;
  if (!deepEqual(stripped, original)) return { status: 'integrity-failed', why: 'model is not deep-equal to the original apart from _scope/_subject' };
  // ...and, textually, no other line may have changed (so nothing was reformatted).
  const outLines = ins.text.split('\n');
  const others = [...outLines.slice(0, ins.at), ...outLines.slice(ins.at + ins.count)];
  if (others.join('\n') !== ins.base.join('\n')) return { status: 'integrity-failed', why: 'lines other than the inserted ones changed' };
  fs.writeFileSync(file, ins.text);
  return { status: 'updated', commaPatched: ins.commaPatched };
}

const dryRun = process.argv.includes('--dry-run');
const register = readJson(path.join(here, 'eval', 'm3-final.json')).map((r) => r.k);
const sites = readJson(path.join(root, 'tools', 'capture', 'sites.json')).sites;
const archetypeOf = new Map();
for (const site of sites) for (const page of site.pages) archetypeOf.set(`${site.slug}/${page.slug}`, page.archetype);

const ledger = { updated: [], unchanged: [], 'no-label': [], conflict: [], 'integrity-failed': [] };
for (const key of register) {
  const archetype = archetypeOf.get(key);
  const semantics = archetype === undefined ? undefined : ARCHETYPE_SEMANTICS[archetype];
  if (!semantics) {
    ledger['no-label'].push(`${key} (${archetype === undefined ? 'page not in tools/capture/sites.json' : `archetype "${archetype}" is not in composition.md §1.1`})`);
    continue;
  }
  const r = dryRun ? { status: 'updated' } : migrate(key, semantics);
  const note = r.why ? ` (${r.why})` : (r.commaPatched ? ' (anchor line needed a trailing comma)' : '');
  ledger[r.status].push(`${key} -> _scope=${semantics.scope}${semantics.subject === undefined ? '' : ` _subject=${semantics.subject}`}${note}`);
}

const total = Object.values(ledger).reduce((n, v) => n + v.length, 0);
console.log(`${dryRun ? 'dry-run ' : ''}ledger over ${total} registered models`);
for (const [status, rows] of Object.entries(ledger)) {
  console.log(`${status}: ${rows.length}`);
  for (const row of rows) console.log(`  ${row}`);
}
const failures = [...ledger['no-label'], ...ledger.conflict, ...ledger['integrity-failed']];
if (failures.length) { console.error(`${failures.length} model(s) could not be labelled`); process.exit(1); }
