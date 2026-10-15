// Source-bound semantic icon labels: unlike text allowances, every binding must prove
// the specific captured icon, local numeric value, order and model ownership.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { scanDom, attrOf } from './imgattr.mjs';
// Closed semantic vocabulary, independent of site/page names. A provenance record
// cannot turn an arbitrary icon into an arbitrary UI label by changing its declaration.
const ICON_ROLES = { 'character-count': { suffix: '__character--fill', label: '创作字数' } };
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
export const atPath = (value, path) => path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean).reduce((n,k) => n?.[k], value);
export function verifyIconBinding(model, dom, evidence) {
  const fail = (reason) => ({ ok: false, reason });
  const role = ICON_ROLES[evidence.role];
  if (!role || evidence.label !== role.label || !evidence.iconClass.endsWith(role.suffix)) return fail('unsupported semantic icon role/label');
  if (sha(dom) !== evidence.domSha256) return fail('captured DOM hash differs');
  const scan = scanDom(dom);
  if (scan.dangling || scan.unmatchedClose) return fail('unbalanced capture DOM');
  const matches = scan.tags.map((t,i) => attrOf(t.attrs,'id') === evidence.elementId ? i : -1).filter((i) => i >= 0);
  if (matches.length !== 1) return fail('icon count owner must be unique');
  const index = matches[0], parent = scan.parents[index];
  const icons = scan.tags.filter((t,i) => t.start > scan.tags[index].start && t.end < scan.closeEnd[index]
    && attrOf(t.attrs,'class').split(/\s+/).includes(evidence.iconClass));
  if (icons.length !== 1) return fail('specific semantic icon missing or ambiguous');
  const siblings = scan.tags.map((t,i) => ({t,i})).filter(({i}) => scan.parents[i] === parent)
    .map(({t}) => attrOf(t.attrs,'id')).filter(Boolean);
  if (JSON.stringify(siblings) !== JSON.stringify(evidence.siblingIds)) return fail('source card order differs');
  const text = dom.slice(scan.tags[index].end, scan.closeEnd[index]).replace(/<[^>]*>/g,' ').trim();
  if (text !== String(evidence.value)) return fail('local count differs');
  const node = atPath(model,evidence.modelNodePath);
  if (node?._name?.text !== evidence.label || node?._measure?.num !== evidence.value || node._action) return fail('model icon role/value/target ownership differs');
  const collection = atPath(model,evidence.modelCollectionPath);
  if (collection?.[evidence.modelIndex] !== node || collection?.[evidence.modelIndex + 1]?._measure?.num !== evidence.nextValue) return fail('model card order differs');
  return { ok: true, path: evidence.modelNodePath + '._name', label: evidence.label,
    selector: '#' + evidence.elementId, iconClass: evidence.iconClass, value: evidence.value, domSha256: evidence.domSha256 };
}
export function iconProofs(page, model, corpusDir, recordsPath = 'm1/eval/icon-provenance.json') {
  const records = fs.existsSync(recordsPath) ? JSON.parse(fs.readFileSync(recordsPath,'utf8')).bindings : [];
  const selected = records.filter((r) => r.page === page);
  if (!selected.length) return { matched: [], errors: [] };
  const dom = fs.readFileSync(corpusDir + '/dom.html','utf8');
  const results = selected.map((e) => verifyIconBinding(model,dom,e));
  return { matched: results.filter((r) => r.ok), errors: results.filter((r) => !r.ok) };
}
