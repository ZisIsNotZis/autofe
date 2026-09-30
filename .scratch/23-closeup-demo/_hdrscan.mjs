import fs from 'node:fs';
const scale = JSON.parse(fs.readFileSync('m1/eval/m3-scale.json', 'utf8')).filter((x) => x.tier === 'exemplar');
const KEYS = ['_name','_title','_tag','_price','_subtitle','_summary'];
for (const r of scale) {
  const mp = `m1/curated/${r.k}.json`;
  if (!fs.existsSync(mp)) continue;
  const model = JSON.parse(fs.readFileSync(mp, 'utf8'));
  const found = [];
  (function walk(n, k) {
    if (Array.isArray(n)) { n.forEach((x, i) => walk(x, k + '[' + i + ']')); return; }
    if (!n || typeof n !== 'object') return;
    if (n._rel?.compare === true && Array.isArray(n._items)) {
      for (const it of n._items) {
        const set = KEYS.filter((key) => it[key] != null);
        found.push(set.join(','));
      }
    }
    for (const [key, v] of Object.entries(n)) walk(v, k + '.' + key);
  })(model, '');
  if (found.length) console.log(r.k, JSON.stringify(found));
}
