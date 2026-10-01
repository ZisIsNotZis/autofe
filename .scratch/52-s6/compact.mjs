// Round 52: re-serialize m1/composites.json into the pre-S5 compact, readable layout.
// Rule (matches the round-50 file style, verified against 5663da6):
//   - objects at depth 0/1/2 expand (document, "composites", each type)
//   - inside a type, only "fields" expands; field objects are single-line
//   - arrays and the type's forbid/render/requireOneOf are single-line
// Pure formatting: the parsed value is byte-identical before/after.
import fs from 'node:fs';

const inline = (v) => {
  if (Array.isArray(v)) return '[' + v.map(inline).join(', ') + ']';
  if (v && typeof v === 'object')
    return '{ ' + Object.keys(v).map((k) => JSON.stringify(k) + ': ' + inline(v[k])).join(', ') + ' }';
  return JSON.stringify(v);
};

function expanded(obj, depth) {
  const pad = ' '.repeat(depth);
  const inner = ' '.repeat(depth + 1);
  const lines = Object.keys(obj).map((k) => {
    const v = obj[k];
    let vs;
    if (v && typeof v === 'object' && !Array.isArray(v) && depth + 1 <= 2) vs = expanded(v, depth + 1);
    else if (k === 'fields' && depth === 2) vs = expanded(v, depth + 1);
    else vs = inline(v);
    return inner + JSON.stringify(k) + ': ' + vs;
  });
  return '{\n' + lines.join(',\n') + '\n' + pad + '}';
}

const src = process.argv[2] ?? 'm1/composites.json';
const out = process.argv[3] ?? src;
const data = JSON.parse(fs.readFileSync(src, 'utf8'));
const text = expanded(data, 0) + '\n';
fs.writeFileSync(out, text);
console.log(`wrote ${out} (${text.split('\n').length} lines)`);
