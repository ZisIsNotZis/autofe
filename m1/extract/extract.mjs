// M3 extraction pipeline: capture dir (corpus/<site>/<page>/) -> draft model JSON.
// v0 heuristics per .scratch/03-m3-extraction/spec.md, in priority order:
//   root _intent from <title> + first h1 [draft]; heading role -> storyline
//   boundaries; columnheader+cell sequences -> _items with _fields (only fields
//   declared in the SHARED m1/vocab-fields.json may be emitted; the full
//   inferred dictionary goes to m1/extract/fields-draft.json as a proposal);
//   radio/checkbox clusters -> _expose choice sets; price/percent -> _price /
//   _measure; dates -> _datetime; sibling-similar lists -> _items; link/button
//   -> _action (navigate|open); images with alt -> _image.
// Anything the closed grammar cannot express is recorded in the extraction
// stats (report) — NEVER invented keys. Every draft must pass m1/validate.mjs
// with zero errors; this module self-checks each draft it writes.
//
// Usage:
//   node m1/extract/extract.mjs <site>/<page>...        # batch from corpus/
//   node m1/extract/extract.mjs <path/to/capture> -o out.json
//   node m1/extract/extract.mjs --eval <site>/<page>... # validate+render+coverage, auto vs hand
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from '../validate.mjs';
import { FIELDS } from '../model-lib.mjs';
import { render } from '../render.mjs';
import { sourceWarnings } from '../eval/source-coverage.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const M1 = path.resolve(HERE, '..');
const CORPUS = path.resolve(M1, '..', 'corpus');
const DRAFTS = path.join(HERE, 'drafts');
const STATS = path.join(HERE, 'stats');
const FIELDS_DRAFT = path.join(HERE, 'fields-draft.json');

// ---- bounds (keep runs bounded; overflow is reported, never silent) --------
const CAP = {
  itemsPerCollection: 40,
  blocksPerStoryline: 150,
  topStorylines: 120,
  textLen: 2000,
};

// ---- capture loading -------------------------------------------------------
function loadCapture(dir) {
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const nodes = JSON.parse(fs.readFileSync(path.join(dir, 'nodes.json'), 'utf8'));
  const urlByDomIndex = new Map(); // link hrefs live only in the a11y tree
  try {
    const a = JSON.parse(fs.readFileSync(path.join(dir, 'a11y.json'), 'utf8'));
    for (const n of a.nodes ?? []) {
      const u = (n.properties ?? []).find((p) => p.name === 'url')?.value;
      if (n.role === 'link' && typeof u === 'string') urlByDomIndex.set(n.domIndex, u);
    }
  } catch { /* a11y.json optional for extraction; hrefs then absent */ }
  return { meta, nodes, urlByDomIndex };
}

// Reconstruct the element tree from cleanedPath ("html/body[1]/div[0]/...").
function buildTree(nodes) {
  const root = { seg: '(root)', capture: null, children: [], parent: null, byKey: new Map() };
  for (const n of nodes) {
    const segs = String(n.cleanedPath || '').split('/').filter(Boolean);
    if (!segs.length) continue;
    let cur = root;
    for (const seg of segs) {
      let next = cur.byKey.get(seg);
      if (!next) {
        next = { seg, capture: null, children: [], parent: cur, byKey: new Map() };
        cur.byKey.set(seg, next);
        cur.children.push(next);
      }
      cur = next;
    }
    cur.capture = n;
  }
  return root;
}

// ---- small text utilities ---------------------------------------------------
const norm = (s) => String(s).toLowerCase().replace(/[\s\p{P}]+/gu, '');
const CJK = /[\u4e00-\u9fff\u3040-\u30ff]/;

const CHROME_NAME = /cookie|consent/i; // cookie/consent overlays are never storylines

function asciiSlug(s, max = 40) {
  if (s === null || s === undefined) return '';
  const slug = String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max).replace(/-+$/g, '');
  return slug;
}
// _expose identifiers must match ^[a-z][a-z0-9-]*$ (axioms §6.1).
function slugIdent(s, fallbackBase, used) {
  const words = String(s || '').toLowerCase().match(/[a-z][a-z0-9]*/g) ?? [];
  let base = asciiSlug(words.slice(0, 2).join('-'), 24) || fallbackBase;
  let name = base; let i = 2;
  while (used.has(name)) name = `${base}-${i++}`;
  used.add(name);
  return name;
}

// ---- typed-value patterns (§2 closed set) ----------------------------------
const CUR_PREFIX = [
  ['CA$', 'CAD'], ['US$', 'USD'], ['HK$', 'HKD'], ['NT$', 'TWD'], ['S$', 'SGD'],
  ['NZ$', 'NZD'], ['R$', 'BRL'], ['A$', 'AUD'], ['C$', 'CAD'],
];
const CUR_SYM = { $: 'USD', '￥': 'CNY', '¥': 'CNY', '€': 'EUR', '£': 'GBP', '₩': 'KRW', '₹': 'INR' };
const CUR_CJK = { '元': 'CNY', '美元': 'USD', '港元': 'HKD', '港币': 'HKD', '人民币': 'CNY', '日元': 'JPY' };
const NUM = String.raw`[\d,]+(?:\.\d+)?`;
const PERIOD_TAIL = /(?:\s*\/\s*\S+|\s+per\s+\w+|\s*每月|\s*每年|\s*\/月|\s*\/年)$/u;

function toNum(s) { return Number(String(s).replace(/,/g, '')); }

export function parseMoney(raw) {
  const s = String(raw).trim();
  if (PERIOD_TAIL.test(s)) return null; // periodic price loses its period as money; keep as text
  let m = new RegExp(`^(CA\\$|US\\$|HK\\$|NT\\$|S\\$|NZ\\$|R\\$|A\\$|C\\$|\\$|￥|¥|€|£|₩|₹)\\s*(${NUM})\\s*(?:USD|CNY|EUR|GBP|HKD|JPY|元)?$`, 'u').exec(s);
  if (m) {
    const cur = (CUR_PREFIX.find(([t]) => t === m[1]) ?? [null, CUR_SYM[m[1]]])[1];
    return { money: toNum(m[2]), currency: cur };
  }
  m = new RegExp(`^(${NUM})\\s*(元|美元|港元|港币|人民币|日元)$`, 'u').exec(s);
  if (m) return { money: toNum(m[1]), currency: CUR_CJK[m[2]] };
  return null;
}
export function parseMeasure(raw) {
  const s = String(raw).trim().replace(/^[~≈+]\s*/, '');
  let m = new RegExp(`^(${NUM})\\s*%$`).exec(s);
  if (m) return { num: toNum(m[1]), unit: '%' };
  m = new RegExp(`^(${NUM})\\s*([A-Za-zμ][A-Za-zμ/°.]{0,7}|万亿个 人天月年次倍核层张条款名)$`.replace(' ', ''), 'u').exec(s);
  if (m) return { num: toNum(m[1]), unit: m[2] };
  m = new RegExp(`^(${NUM})$`).exec(s);
  if (m && s.replace(/\D/g, '').length >= 2) return { num: toNum(m[1]) }; // bare 2+ digit number
  return null;
}
export function parseDate(raw) {
  const s = String(raw).trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s)
    ?? /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(s)
    ?? /^(\d{4})年(\d{1,2})月(\d{1,2})[日号]?$/.exec(s);
  if (!m) return null;
  const p = (x) => String(Number(x)).padStart(2, '0');
  return { date: `${m[1]}-${p(m[2])}-${p(m[3])}` };
}

// ---- role/atom classification ----------------------------------------------
const CHROME = new Set(['navigation', 'banner', 'contentinfo', 'menu', 'menubar', 'menuitem',
  'menuitemcheckbox', 'menuitemradio', 'complementary', 'search', 'tooltip', 'scrollbar',
  'progressbar', 'timer', 'marquee', 'presentation', 'none', 'dialog', 'alertdialog',
  'LayoutTable', 'LayoutTableRow', 'LayoutTableCell', 'feed', 'menubar']);
const TEXT_ROLES = new Set(['paragraph', 'strong', 'emphasis', 'blockquote', 'text', 'term',
  'definition', 'status', 'Legend', 'LabelText', 'time', 'sectionheader', 'subsectionheader']);
const CELL_ROLES = new Set(['columnheader', 'cell', 'rowheader', 'gridcell']);
const CAPPED = Symbol('capped');

class Extractor {
  constructor(capture) {
    this.meta = capture.meta;
    this.nodes = capture.nodes;
    this.urls = capture.urlByDomIndex;
    this.tree = buildTree(capture.nodes);
    this.consumed = new Set();
    this.seenText = new Set(); // per-page dedupe of rendered text atoms
    this.usedExpose = new Set(); // _expose identifiers must be unique-ish per page
    this.root = this.freshStoryline(null, 0);
    this.stack = [this.root]; // open storylines (top + sub)
    this.topLines = [];
    this.unmapped = new Map(); // kind -> {kind, role, examples:[], count}
    this.chrome = new Map(); // role -> count
    this.counts = { storylines: 0, items: 0, actions: 0, exposes: 0, images: 0, facts: 0, tables: 0, lists: 0, choiceSets: 0, inputs: 0, dupeText: 0, capHits: [] };
    this.fieldsDraft = new Map(); // slug -> {type,label,unit?,currency?,examples}
    this.firstH1 = null;
    this.choiceSeq = 0;
    // bottom-up subtree radio/checkbox counts for cluster placement
    const rec = (t) => {
      let r = 0; let c = 0;
      if (t.capture && t.capture.role === 'radio') r += 1;
      if (t.capture && t.capture.role === 'checkbox') c += 1;
      t._hasText = !!(t.capture && String(t.capture.text ?? '').trim()) || t.children.some((ch) => ch._hasText);
      for (const ch of t.children) { rec(ch); r += ch._r; c += ch._c; }
      t._r = r; t._c = c;
    };
    rec(this.tree);
  }

  // ---- reporting helpers ----
  note(kind, role, example) {
    const e = String(example ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const cur = this.unmapped.get(kind) ?? { kind, role: role ?? '', count: 0, examples: [] };
    cur.count++;
    if (e && cur.examples.length < 5 && !cur.examples.some((x) => norm(x) === norm(e))) cur.examples.push(e);
    this.unmapped.set(kind, cur);
  }
  chromeNote(role) { this.chrome.set(role, (this.chrome.get(role) ?? 0) + 1); }
  cap(kind) { if (!this.counts.capHits.includes(kind)) this.counts.capHits.push(kind); }

  // ---- storyline bookkeeping ----
  freshStoryline(title, level) {
    return {
      title: (title ?? '').trim(), level, facts: {}, summary: null,
      blocks: [], seenActions: new Set(), seenLocalText: new Set(),
      price: [], amount: [], measure: [], datetime: [], image: [],
    };
  }
  current() { return this.stack[this.stack.length - 1]; }
  openStoryline(title, level) {
    while (this.stack.length > 1 && this.current().level >= level) this.stack.pop();
    const s = this.freshStoryline(title, level);
    if (this.stack.length === 1) {
      if (this.topLines.length >= CAP.topStorylines) { this.cap('topStorylines'); return; }
      this.topLines.push(s);
    } else {
      this.current().blocks.push({ type: 'subline', node: s });
    }
    this.stack.push(s);
    this.counts.storylines++;
    this.markSeen(title);
  }
  markSeen(text) { const k = norm(text); if (k) this.seenText.add(k); }
  isSeen(text) { const k = norm(text); return !k || this.seenText.has(k); }

  // ---- fact attachment ----
  addFact(role, value) { this.current().facts[role] = value; this.counts.facts++; }
  // render.mjs fmt(): literal a typed value renders as — used to detect when
  // the typed fact loses the source string (e.g. ￥99.00 -> "99 CNY")
  renderedLiteral(v) {
    if ('money' in v) return `${v.money}${v.currency ? ` ${v.currency}` : ''}`;
    if ('num' in v) return `${v.num}${v.unit ? ` ${v.unit}` : ''}`;
    if ('date' in v) return v.date;
    return null;
  }
  keepRawIfLost(rawText, typed, cur) {
    const lit = this.renderedLiteral(typed);
    if (lit === null) return;
    if (norm(lit).includes(norm(rawText))) return; // typed rendering preserves the literal
    if (cur.blocks.length >= CAP.blocksPerStoryline) { this.cap('blocksPerStoryline'); return; }
    // intentional duplicate: the typed fact renders normalized ("99 CNY"), the
    // raw line preserves the verbatim source string ("￥99.00")
    cur.blocks.push({ type: 'text', text: rawText });
  }
  addTextAtom(rawText) {
    const text = String(rawText ?? '').replace(/\s+/g, ' ').trim().slice(0, CAP.textLen);
    if (text.length < 2) return;
    const cur = this.current();
    if (this.isSeen(text) || cur.seenLocalText.has(norm(text))) { this.counts.dupeText++; return; }
    if (cur.blocks.length >= CAP.blocksPerStoryline) { this.cap('blocksPerStoryline'); return; }
    this.seenText.add(norm(text)); cur.seenLocalText.add(norm(text));
    const money = parseMoney(text);
    if (money) { cur.price.push(money); this.counts.facts++; this.keepRawIfLost(text, money, cur); return; }
    const measure = parseMeasure(text);
    if (measure) { cur.measure.push(measure); this.counts.facts++; this.keepRawIfLost(text, measure, cur); return; }
    const date = parseDate(text);
    if (date) { cur.datetime.push(date); this.counts.facts++; this.keepRawIfLost(text, date, cur); return; }
    if (!cur.summary && text.length <= 160) { cur.summary = { text }; this.counts.facts++; return; }
    cur.blocks.push({ type: 'text', text });
  }
  addAction(labelRaw, url) {
    const label = String(labelRaw ?? '').replace(/\s+/g, ' ').trim();
    if (label.length < 1 || label.length > 120) return;
    const cur = this.current();
    const key = norm(label) + '|' + norm(url ?? '');
    if (cur.seenActions.has(key)) { this.counts.dupeText++; return; }
    if (cur.blocks.length >= CAP.blocksPerStoryline) { this.cap('blocksPerStoryline'); return; }
    cur.seenActions.add(key);
    this.seenText.add(norm(label));
    const action = { verb: 'navigate' };
    if (url) action.to = url;
    action.label = label;
    cur.blocks.push({ type: 'action', action, label });
    this.counts.actions++;
  }
  addImage(alt) {
    const a = String(alt ?? '').replace(/\s+/g, ' ').trim();
    if (!a) { this.note('image-without-alt', 'image', ''); return; }
    this.current().image.push({ image: '', alt: a.slice(0, 200) }); // capture carries no src URL (nodes.json)
    this.counts.images++;
    this.counts.facts++;
  }

  // ---- structure builders ----------------------------------------------------
  collectOptions(t, role) {
    const opts = [];
    const rec = (x) => {
      if (x.capture && x.capture.role === role) {
        const label = String(x.capture.name ?? '').replace(/\s+/g, ' ').trim();
        if (label) opts.push(label);
      }
      for (const ch of x.children) rec(ch);
    };
    rec(t);
    return opts;
  }

  consume(t) {
    this.consumed.add(t);
    for (const ch of t.children) this.consume(ch);
  }

  // table -> collection entry with planned columns
  buildTable(t) {
    const rows = [];
    (function rec(x) {
      if (x.capture && x.capture.role === 'row') rows.push(x);
      for (const ch of x.children) rec(ch);
    })(t);
    const cellsOf = (r) => r.children.filter((c) => c.capture && CELL_ROLES.has(c.capture.role));
    let headerRow = -1;
    for (let i = 0; i < rows.length; i++) {
      const cs = cellsOf(rows[i]);
      if (cs.length && cs.some((c) => c.capture.role === 'columnheader') && !cs.some((c) => c.capture.role === 'cell')) { headerRow = i; break; }
    }
    if (headerRow < 0) {
      this.note('table-without-headers', 'table', rows[0]?.children.map((c) => c.capture?.name).filter(Boolean).join(' | '));
      return null;
    }
    const headers = cellsOf(rows[headerRow]).map((c) => (c.capture.name ?? '').replace(/\s+/g, ' ').trim());
    const colCount = Math.max(...rows.map((r) => cellsOf(r).length), headers.length);
    const colVals = Array.from({ length: colCount }, () => []);
    const colCells = Array.from({ length: colCount }, () => []);
    for (let i = headerRow + 1; i < rows.length; i++) {
      const cs = cellsOf(rows[i]);
      if (cs.some((c) => c.capture.role === 'columnheader')) { this.note('table-extra-header-rows', 'columnheader', cs.map((c) => c.capture.name).join('|')); continue; }
      cs.forEach((c, j) => {
        const txt = (c.capture.name ?? '').replace(/\s+/g, ' ').trim();
        colVals[j].push(txt); colCells[j].push(c);
        // subtree interactive parts handled at planning time via children roles
      });
    }
    // ---- plan columns ----
    const plan = Array.from({ length: colCount }, () => 'unmapped');
    const headerSlugs = headers.map((h, j) => asciiSlug(h) || `col-${j + 1}`);
    const info = [];
    for (let j = 0; j < colCount; j++) {
      const vals = colVals[j].filter((v) => v.length);
      const moneys = vals.map(parseMoney);
      const allMoney = vals.length > 0 && moneys.every(Boolean);
      const nums = vals.map((v) => parseMeasure(v));
      const allNum = vals.length > 0 && nums.every(Boolean);
      const hasInteractive = colCells[j].some((cell) => subtreeHasRole(cell, new Set(['link', 'button'])));
      info.push({ slug: headerSlugs[j], label: headers[j] ?? `col-${j + 1}`, allMoney, allNum, moneys, nums, hasInteractive, vals });
    }
    let nameTaken = false, priceTaken = false, amountTaken = false, measureTaken = false;
    for (let j = 0; j < colCount; j++) {
      const c = info[j];
      if (c.hasInteractive && /^(action|actions|operation|operations|row-actions|操作)/.test(c.slug)) { plan[j] = 'actions'; continue; }
      if (c.slug && FIELDS[c.slug]) { plan[j] = 'field'; continue; }
      if (/^(tags?|标签)$/.test(c.slug) && !c.allMoney) { plan[j] = 'taglist'; continue; }
      if (!nameTaken && j === 0 && !c.allMoney && !c.allNum) { plan[j] = 'name'; nameTaken = true; continue; }
      if (c.allMoney && !priceTaken) { plan[j] = 'price'; priceTaken = true; continue; }
      if (c.allMoney && !amountTaken) { plan[j] = 'amount'; amountTaken = true; continue; }
      if (c.allNum && !measureTaken) { plan[j] = 'measure'; measureTaken = true; continue; }
      if (c.hasInteractive) { plan[j] = 'actions'; continue; }
      plan[j] = 'unmapped';
    }
    // ---- draft dictionary records every column (proposal artifact) ----
    for (let j = 0; j < colCount; j++) {
      const c = info[j];
      const type = c.allMoney ? 'money' : c.allNum ? 'num' : 'text';
      const entry = { type, label: c.label || c.slug };
      if (c.allMoney) entry.currency = [...new Set(c.moneys.map((m) => m.currency))].join(',') || 'USD';
      const ex = c.vals.find((v) => v.length);
      if (ex) entry.example = ex.slice(0, 60);
      this.fieldsDraft.set(c.slug, entry);
    }
    // ---- items ----
    const bodyCount = rows.length - headerRow - 1;
    const items = [];
    for (let i = headerRow + 1; i < rows.length; i++) {
      const cs = cellsOf(rows[i]);
      if (cs.some((c) => c.capture.role === 'columnheader')) continue;
      if (items.length >= CAP.itemsPerCollection) { this.cap('itemsPerCollection'); break; }
      const item = {};
      let actions = [];
      cs.forEach((cellNode, j) => {
        const c = info[j] ?? { slug: `col-${j + 1}` };
        const raw = (cellNode.capture.name ?? '').replace(/\s+/g, ' ').trim();
        switch (plan[j]) {
          case 'field': {
            const declared = FIELDS[c.slug];
            const want = declared?.type ?? 'text';
            item._fields = item._fields ?? {};
            if (want === 'num') {
              const n = Number(raw.replace(/,/g, ''));
              item._fields[c.slug] = Number.isFinite(n) && raw !== '' ? { num: n } : { text: raw };
            } else item._fields[c.slug] = { text: raw };
            break;
          }
          case 'name': if (raw) item._name = { text: raw.slice(0, 160) }; break;
          case 'price': if (raw) { const m = parseMoney(raw); if (m) item._price = m; } break;
          case 'amount': if (raw) { const m = parseMoney(raw); if (m) item._amount = m; } break;
          case 'measure': if (raw) { const mm = parseMeasure(raw); if (mm) item._measure = mm; } break;
          case 'taglist': if (raw) item._tag = { list: raw.split(/\s{2,}|\s+/).filter((x) => x.length > 1).slice(0, 6).map((x) => ({ text: x })) }; break;
          case 'actions': actions = actions.concat(collectActions(cellNode, this.urls)); break;
          default:
            if (raw) this.note('table-column-unmapped', 'cell', `${c.label || c.slug}: ${raw}`);
        }
      });
      if (actions.length === 1) item._action = actions[0];
      else if (actions.length > 1) item.actions = {
        _intent: 'row actions [draft]',
        _lines: actions.slice(0, 6).map((a) => ({ _action: a })),
      };
      if (actions.length) this.counts.actions += actions.length;
      items.push(item);
    }
    this.counts.items += items.length;
    this.counts.tables++;
    const label = headers.filter(Boolean).slice(0, 3).join(' / ');
    return {
      entry: {
        _intent: `table (${bodyCount} rows): ${label || 'columns'} [draft]`,
        _rel: { order: 'none' },
        _items: items,
      },
    };
  }

  // list -> collection entry if sibling-similar, else text lines
  buildList(t) {
    const items = t.children.filter((c) => c.capture && c.capture.role === 'listitem');
    if (items.length < 2) return false; // not a collection; caller recurses
    const sig = (x) => (x.children.filter((c) => c.capture && c.capture.visible !== false)
      .map((c) => c.capture.role).sort().join(',') || 'leaf');
    const sigs = items.map(sig);
    const freq = new Map();
    for (const s of sigs) freq.set(s, (freq.get(s) ?? 0) + 1);
    const dominant = Math.max(...freq.values());
    if (dominant < Math.ceil(items.length * 0.6)) return false; // heterogeneous
    const out = [];
    for (const li of items) {
      if (out.length >= CAP.itemsPerCollection) { this.cap('itemsPerCollection'); break; }
      const label = (li.capture.name ?? '').replace(/\s+/g, ' ').trim();
      const item = {};
      if (label) item._name = { text: label.slice(0, 160) };
      const links = collectActions(li, this.urls);
      if (links.length === 1) {
        item._action = links[0];
        this.counts.actions++;
      } else if (links.length > 1) {
        // keep the first as the item action, extra links become text (reported)
        item._action = links[0];
        this.counts.actions++;
        this.note('list-item-multi-action', 'listitem', label || links.map((l) => l.label).join(' | '));
      }
      if (!label) this.note('list-item-unlabeled', 'listitem', '');
      out.push(item);
      this.counts.items++;
      this.consume(li);
    }
    this.consume(t);
    this.counts.lists++;
    return {
      entry: {
        _intent: `list (${out.length} items) [draft]`,
        _items: out,
      },
    };
  }

  // ---- main walk ----
  walk(t) {
    if (this.consumed.has(t)) return;
    const cap = t.capture;
    if (!cap) { for (const ch of t.children) this.walk(ch); return; }
    const role = cap.role;
    const visible = cap.visible !== false;

    if (CHROME.has(role) || (CHROME_NAME.test(cap.name ?? '') && ['region', 'generic', 'group', 'form', 'dialog'].includes(role))) {
      this.chromeNote(role);
      this.consume(t);
      return;
    }

    switch (role) {
      case 'heading': {
        if (!visible) return; // hidden headings (nav menus) are not storylines
        const name = String(cap.name ?? '').replace(/\s+/g, ' ').trim();
        if (!name) return;
        const level = /^(h1|h2)$/i.test(cap.tag ?? '') ? 1 : 2;
        if (level === 1 && !this.firstH1) this.firstH1 = name;
        this.consume(t);
        this.openStoryline(name, level);
        return;
      }
      case 'table': {
        this.consume(t);
        const built = this.buildTable(t);
        if (built) this.pushBlock(built.entry);
        return;
      }
      case 'list': {
        // radio/checkbox clusters win over generic lists (spec: groups -> _expose choice sets)
        if ((t._r ?? 0) < 2 && (t._c ?? 0) < 2) {
          const built = this.buildList(t);
          if (built) { this.pushBlock(built.entry); return; }
        }
        break; // fall through: cluster detection or recursion
      }
      case 'grid': { this.consume(t); this.note('grid-widget', 'grid', cap.name); return; }
      case 'tablist': case 'tab': case 'tabpanel': {
        if (role === 'tab') { this.note('tabs', 'tab', cap.name); this.consume(t); return; }
        this.note('tabs', role, cap.name);
        this.consume(t);
        return;
      }
      case 'combobox': case 'listbox': case 'option': case 'select': {
        this.note('combobox-select', role, cap.name);
        this.consume(t);
        return;
      }
      case 'code': {
        this.note('code-block', 'code', cap.text ?? cap.name);
        this.consume(t);
        return;
      }
      case 'canvas': case 'graphics-document': case 'Canvas': {
        this.note('chart-or-svg', role, cap.name || cap.text);
        this.consume(t);
        return;
      }
      case 'iframe': case 'Iframe': case 'video': case 'embeddedobject': case 'audio': {
        this.note('embedded-media', role, cap.name);
        this.consume(t);
        return;
      }
      case 'image': case 'img': {
        if (visible && (cap.name ?? '').trim()) { this.addImage(cap.name); this.consume(t); return; }
        if (role === 'img') { this.consume(t); return; } // presentational svg/img
        break;
      }
      case 'link': case 'button': {
        if (visible) {
          const url = this.urls.get(cap.cleanedIndex);
          this.addAction(cap.name, role === 'link' ? url : undefined);
          this.consume(t);
          return;
        }
        this.consume(t);
        return;
      }
      case 'textbox': case 'searchbox': case 'spinbutton': {
        if (visible) {
          const name = slugIdent(cap.name ?? '', 'input', this.usedExpose);
          this.pushBlock({ _intent: `input [draft]`, _expose: { name, type: 'text' } });
          this.counts.exposes++; this.counts.inputs++;
          this.consume(t);
          return;
        }
        this.consume(t);
        return;
      }
      case 'checkbox': case 'switch': {
        // single checkbox/switch -> boolean input (clusters are caught below)
        if (visible) {
          const name = slugIdent(cap.name ?? '', 'toggle', this.usedExpose);
          this.pushBlock({ _intent: `toggle [draft]`, _expose: { name, type: 'bool' } });
          this.counts.exposes++; this.counts.inputs++;
        }
        this.consume(t);
        return;
      }
      case 'superscript': case 'subscript': {
        if ((cap.text ?? '').trim().length <= 3) { this.chromeNote('footnote-marker'); this.consume(t); return; }
        break;
      }
      default: break;
    }

    // demoted <a>/<button> (AX join lost the role): still an action, no URL
    if (isActionish(cap) && cap.role === 'generic') {
      if (visible && String(cap.name ?? '').trim()) this.addAction(cap.name, undefined);
      this.consume(t);
      return;
    }

    if (TEXT_ROLES.has(role)) {
      if (visible && (cap.text ?? '').trim()) { this.addTextAtom(cap.text); this.consume(t); return; }
      if (visible && (cap.name ?? '').trim() && !(cap.text ?? '').trim()) { this.addTextAtom(cap.name); this.consume(t); return; }
      this.consume(t);
      return;
    }

    // containers: radio/checkbox cluster detection before generic recursion.
    // Fires at the deepest node holding >=2 controls; label falls back to the
    // nearest named ancestor (fieldset/group), which is then left to the walk
    // (its text dupes are dropped by the seen-set).
    const clusterLabel = (t2) => {
      const own = String(t2.capture?.name ?? '').replace(/\s+/g, ' ').trim();
      if (own) return own;
      let a = t2.parent;
      for (let i = 0; i < 4 && a; i++, a = a.parent) {
        const nm = String(a.capture?.name ?? '').replace(/\s+/g, ' ').trim();
        if (nm) return nm;
      }
      return '';
    };
    if ((t._r ?? 0) >= 2 && !t.children.some((ch) => (ch._r ?? 0) >= 2)) {
      const options = this.collectOptions(t, 'radio');
      if (options.length >= 2) {
        const label = clusterLabel(t);
        const name = slugIdent(label, `choice-${++this.choiceSeq}`, this.usedExpose);
        this.pushBlock({
          _intent: `${label || 'choice set'} [draft]`,
          _rel: { compare: true },
          _items: options.slice(0, CAP.itemsPerCollection).map((o) => ({ _name: { text: o } })),
          _expose: { name, type: 'text' },
        });
        this.markSeen(label);
        this.counts.items += Math.min(options.length, CAP.itemsPerCollection);
        this.counts.exposes++; this.counts.choiceSets++;
        this.consume(t);
        return;
      }
    }
    if ((t._c ?? 0) >= 2 && !t.children.some((ch) => (ch._c ?? 0) >= 2)) {
      const options = this.collectOptions(t, 'checkbox');
      if (options.length >= 2) {
        const label = clusterLabel(t);
        const name = slugIdent(label, `choice-${++this.choiceSeq}`, this.usedExpose);
        // v0 grammar: _expose over _items is single-select; multi-select is a known gap (report)
        this.note('checkbox-multi-select-as-choice-set', 'checkbox', label || options.join(' | '));
        this.pushBlock({
          _intent: `${label || 'choice set'} [draft]`,
          _rel: { compare: true },
          _items: options.slice(0, CAP.itemsPerCollection).map((o) => ({ _name: { text: o } })),
          _expose: { name, type: 'text' },
        });
        this.markSeen(label);
        this.counts.items += Math.min(options.length, CAP.itemsPerCollection);
        this.counts.exposes++; this.counts.choiceSets++;
        this.consume(t);
        return;
      }
    }

    // bare leaf text holders (generic spans/divs with their own text and no
    // element children carrying text): real content in most captures
    if (visible && String(cap.text ?? '').trim() && !t.children.some((ch) => ch._hasText)) {
      this.addTextAtom(cap.text);
      this.consume(t);
      return;
    }

    // container whose ENTIRE aggregated text is one typed value (price strings
    // are often split across child spans): extract it whole, fragments covered
    if (visible) {
      const agg = String(cap.text ?? '').trim();
      if (agg && agg.length <= 48 && t.children.some((ch) => ch._hasText)
        && (parseMoney(agg) || parseMeasure(agg) || parseDate(agg))) {
        this.addTextAtom(agg);
        this.consume(t);
        return;
      }
    }

    for (const ch of t.children) this.walk(ch);
  }

  pushBlock(node) {
    const cur = this.current();
    if (cur.blocks.length >= CAP.blocksPerStoryline) { this.cap('blocksPerStoryline'); return; }
    cur.blocks.push({ type: 'node', node });
  }

  // ---- serialize --------------------------------------------------------------
  serializeStoryline(s, { withTitle = true } = {}) {
    const node = {};
    const generic = CJK.test(this.meta.title ?? '') ? '内容块' : 'content';
    node._intent = `${s.title || generic} [draft]`;
    if (withTitle && s.title) node._title = { text: s.title };
    if (s.price.length === 1) node._price = s.price[0];
    else if (s.price.length > 1) node._price = { list: s.price };
    if (s.amount.length === 1) node._amount = s.amount[0];
    else if (s.amount.length > 1) node._amount = { list: s.amount };
    if (s.measure.length === 1) node._measure = s.measure[0];
    else if (s.measure.length > 1) node._measure = { list: s.measure };
    if (s.datetime.length === 1) node._datetime = s.datetime[0];
    else if (s.datetime.length > 1) node._datetime = { list: s.datetime };
    if (s.image.length === 1) node._image = s.image[0];
    else if (s.image.length > 1) node._image = { list: s.image };
    if (s.summary) node._summary = s.summary;
    const lines = [];
    for (const b of s.blocks) {
      if (b.type === 'text') lines.push({ _text: { text: b.text } });
      else if (b.type === 'action') lines.push({ _action: b.action });
      else if (b.type === 'subline') lines.push(this.serializeStoryline(b.node));
      else lines.push(b.node);
    }
    if (lines.length) node._lines = lines;
    return node;
  }

  model() {
    const title = String(this.meta.title ?? '').trim();
    const hero = this.root; // pre-heading content
    const rootIntent = `${title}${this.firstH1 ? ` — ${this.firstH1}` : ''} [draft]`;
    const model = { _intent: rootIntent };
    if (title) model._title = { text: title };
    const lines = [];
    const heroNode = this.serializeStoryline(hero, { withTitle: false });
    const { _intent: _drop, _title: _dropTitle, _lines: heroLines, ...heroFacts } = heroNode;
    void _drop; void _dropTitle;
    Object.assign(model, heroFacts);
    if (heroLines) lines.push(...heroLines);
    for (const s of this.topLines) lines.push(this.serializeStoryline(s));
    if (lines.length) model._lines = lines;
    return model;
  }

  stats() {
    return {
      site: this.meta.site, page: this.meta.page, url: this.meta.url,
      title: this.meta.title,
      sourceNodes: this.nodes.length,
      counts: this.counts,
      storylines: this.counts.storylines,
      chrome: [...this.chrome.entries()].map(([role, count]) => ({ role, count })).sort((a, b) => b.count - a.count),
      unmapped: [...this.unmapped.values()].sort((a, b) => b.count - a.count),
      fieldsDrafted: [...this.fieldsDraft.entries()].map(([name, f]) => ({ name, ...f })),
    };
  }
}

// link/button, or a bare <a>/<button> the AX join demoted to generic (common
// in antd-style demos); URLs are only recoverable for true AX links.
const isActionish = (cap) => cap != null && (cap.role === 'link' || cap.role === 'button'
  || ((cap.tag === 'a' || cap.tag === 'button') && cap.role === 'generic'));

function subtreeHasRole(t, roles) {
  if (t.capture && (roles.has(t.capture.role) || isActionish(t.capture))) return true;
  return t.children.some((c) => subtreeHasRole(c, roles));
}
function collectActions(t, urls) {
  const out = [];
  const rec = (x) => {
    const cap = x.capture;
    if (isActionish(cap)) {
      const label = String(cap.name ?? '').replace(/\s+/g, ' ').trim();
      if (label) {
        const action = { verb: cap.role === 'button' ? 'open' : 'navigate' };
        const url = urls.get(cap.cleanedIndex);
        if (url) action.to = url;
        action.label = label.slice(0, 120);
        out.push(action);
      }
    }
    for (const ch of x.children) rec(ch);
  };
  rec(t);
  return out;
}

// ---- extraction entry point -------------------------------------------------
export function extractPage(dir) {
  const capture = loadCapture(dir);
  const ex = new Extractor(capture);
  ex.walk(ex.tree);
  const model = ex.model();
  const check = validate(model);
  return { model, stats: ex.stats(), validation: check };
}

// ---- CLI ---------------------------------------------------------------------
function ensureDirs() {
  fs.mkdirSync(DRAFTS, { recursive: true });
  fs.mkdirSync(STATS, { recursive: true });
}

function rebuildFieldsDraft() {
  const fields = {};
  for (const dir of fs.readdirSync(STATS)) {
    const sp = path.join(STATS, dir);
    for (const f of fs.readdirSync(sp)) {
      const st = JSON.parse(fs.readFileSync(path.join(sp, f), 'utf8'));
      for (const fd of st.fieldsDrafted ?? []) {
        const cur = fields[fd.name] ?? { type: fd.type, label: fd.label, pages: [] };
        if (cur.type !== fd.type) cur.type = 'text'; // conflicting inference across tables -> conservative
        if (fd.unit) cur.unit = fd.unit;
        if (fd.currency) cur.currency = fd.currency;
        if (!cur.pages.includes(st.page)) cur.pages.push(`${st.site}/${st.page}`);
        fields[fd.name] = cur;
      }
    }
  }
  const out = {
    $comment: 'GENERATED DRAFT field dictionary (m3 extraction). Separate from the shared m1/vocab-fields.json: proposals only. Models emit _fields keys that exist in the shared dictionary; everything else here is a proposed vocabulary addition recorded in the extraction report.',
    version: '0-draft',
    fields,
  };
  fs.writeFileSync(FIELDS_DRAFT, JSON.stringify(out, null, 2) + '\n');
}

function cmdBatch(specs) {
  ensureDirs();
  let bad = 0;
  for (const spec of specs) {
    const [site, page] = spec.split('/');
    const dir = path.join(CORPUS, site, page);
    const t0 = Date.now();
    const { model, stats, validation } = extractPage(dir);
    const draftDir = path.join(DRAFTS, site);
    fs.mkdirSync(draftDir, { recursive: true });
    const statDir = path.join(STATS, site);
    fs.mkdirSync(statDir, { recursive: true });
    fs.writeFileSync(path.join(draftDir, `${page}.json`), JSON.stringify(model, null, 2) + '\n');
    fs.writeFileSync(path.join(statDir, `${page}.stats.json`), JSON.stringify(stats, null, 2) + '\n');
    rebuildFieldsDraft();
    const ok = validation.ok;
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${site}/${page}  nodes=${stats.sourceNodes} storylines=${stats.storylines} items=${stats.counts.items} unmappedKinds=${stats.unmapped.length} (${Date.now() - t0}ms)`);
    if (!ok) for (const e of validation.errors.slice(0, 10)) console.error(`   ${e.path}: ${e.message}`);
  }
  if (bad) process.exit(1);
}

function cmdEval(specs) {
  const tmp = path.join(HERE, 'tmp');
  fs.mkdirSync(tmp, { recursive: true });
  const results = [];
  for (const spec of specs) {
    const [site, page] = spec.split('/');
    const captureDir = path.join(CORPUS, site, page);
    const row = { site, page };
    const draftPath = path.join(DRAFTS, site, `${page}.json`);
    if (fs.existsSync(draftPath)) {
      const model = JSON.parse(fs.readFileSync(draftPath, 'utf8'));
      const v = validate(model);
      const htmlPath = path.join(tmp, `${site}--${page}.auto.html`);
      fs.writeFileSync(htmlPath, render(model));
      const cov = sourceWarnings(htmlPath, captureDir, model);
      row.auto = { validateOk: v.ok, ...pick(cov) };
    } else row.auto = { validateOk: false, error: 'no draft' };
    const handPath = path.join(M1, 'models', site, `${page}.json`);
    if (fs.existsSync(handPath)) {
      const model = JSON.parse(fs.readFileSync(handPath, 'utf8'));
      const htmlPath = path.join(tmp, `${site}--${page}.hand.html`);
      fs.writeFileSync(htmlPath, render(model));
      const cov = sourceWarnings(htmlPath, captureDir, model);
      row.hand = pick(cov);
    }
    results.push(row);
    console.log(JSON.stringify(row));
  }
  fs.writeFileSync(path.join(HERE, 'eval-results.json'), JSON.stringify(results, null, 2) + '\n');
}
const pick = (cov) => ({ high: cov.high, medium: cov.medium, info: cov.info, checked: cov.checked, topWarnings: cov.warnings.slice(0, 14).map((w) => `${w.severity[0].toUpperCase()}/${w.role}: ${w.text}`) });

function main() {
  const argv = process.argv.slice(2);
  if (argv[0] === '--eval') { cmdEval(argv.slice(1)); return; }
  if (argv[0] === '--fields') { ensureDirs(); rebuildFieldsDraft(); console.log('fields-draft.json rebuilt from stats/'); return; }
  const outIdx = argv.indexOf('-o');
  if (outIdx >= 0) {
    const dir = argv[0];
    const { model, stats, validation } = extractPage(dir);
    if (!validation.ok) {
      console.error('draft FAILED validation:');
      for (const e of validation.errors) console.error(`  ${e.path}: ${e.message}`);
      process.exit(1);
    }
    fs.writeFileSync(argv[outIdx + 1], JSON.stringify(model, null, 2) + '\n');
    console.error(JSON.stringify(stats, null, 2));
    return;
  }
  if (!argv.length) {
    console.error('usage: node m1/extract/extract.mjs <site>/<page>... | <captureDir> -o out.json | --eval <site>/<page>... | --fields');
    process.exit(2);
  }
  cmdBatch(argv);
}
if (import.meta.url === `file://${process.argv[1]}`) main();
