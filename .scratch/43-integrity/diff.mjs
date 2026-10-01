import fs from 'node:fs';
import { loadHaystack } from '../../m1/eval/capture-integrity.mjs';
const [page, value, probe] = process.argv.slice(2);
const hay = loadHaystack(`corpus/${page}`);
const compactOf = (s) => [...String(s).toLowerCase().replace(/&(#x?[0-9a-f]+|[a-z]+);/gi,(m,g)=>{if(g[0]==='#'){const cp=g[1].toLowerCase()==='x'?parseInt(g.slice(2),16):Number(g.slice(1));return String.fromCodePoint(cp);}return {amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '}[g.toLowerCase()]??m;})].map(c=>c.replace(/[\uFF01-\uFF5E]/g,x=>String.fromCharCode(x.charCodeAt(0)-0xFEE0))).filter(c=>!/[\s\p{P}\p{S}\p{Cf}\ufe00-\ufe0f]/u.test(c)).join('');
const needle = compactOf(value);
// find longest prefix present
let best = 0;
for (let L = needle.length; L >= 4; L--) { const i = hay.text.indexOf(needle.slice(0, L)); if (i >= 0) { best = L; const ctx = hay.text.slice(i, i + Math.min(needle.length + 20, 200)); console.log('L=', L, '\n hay:', ctx, '\n nee:', needle); break; } }
if (!best) console.log('no prefix>=4 found; needle=', needle.slice(0,60));
