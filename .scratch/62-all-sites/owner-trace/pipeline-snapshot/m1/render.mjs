// Minimal deterministic renderer for AutoFE M1 axioms v0 (§9 contract).
// Pure function: same model + context => byte-identical HTML. No AI, no network, no clock.
//
// Form selection (F-030): the model says what item sets ARE; the renderer picks
// the form — table (typed field sets), chips (label-only lists/menus/credits),
// product cards (priced items), deflist (name + one detail), accordion (Q&A).
// No ✓ markers: a checkmark means "included/done" and item sets are not that.
// Hierarchy: root title H1; depth-1 storyline headings H2; deeper H3+.
// _intent is internal planning copy and is NEVER rendered (F-029/F1).
// Usage: node m1/render.mjs <model.json> [out.html]
import fs from 'node:fs';
import {
  factsOf, childrenOf,
} from './model-lib.mjs';
// 轮 57 站点 accent（M5 第一个呈现层 token）：由 m1/eval/brand-accent.mjs 从语料量出，
// 渲染器只读这份配置注入 --accent，不写死任何站名/色值。非法/缺失值回退 default。
const BRAND_TOKENS = JSON.parse(fs.readFileSync(new URL('./brand-tokens.json', import.meta.url), 'utf8'));
const MEDIA_SURFACES = JSON.parse(fs.readFileSync(new URL('./media-surfaces.json', import.meta.url), 'utf8'));
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const accentOf = (site) => {
  const v = site ? BRAND_TOKENS.sites?.[site]?.accent?.value : null;
  const color = HEX_COLOR.test(v ?? '') ? v : BRAND_TOKENS.default.accent;
  // Captured link colors belong to their source surface. Retain the hue, but pair
  // informative text with this renderer's light surface rather than copying pale ink.
  let rgb = color.slice(1).match(/../g).map((c) => parseInt(c, 16));
  const luminance = (xs) => xs.map((x) => { const s = x / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; })
    .reduce((sum, x, i) => sum + x * [.2126, .7152, .0722][i], 0);
  while (1.05 / (luminance(rgb) + .05) < 4.5) rgb = rgb.map((x) => Math.floor(x * .96));
  return '#' + rgb.map((x) => x.toString(16).padStart(2, '0')).join('');
};
// The axis-decision layer is shared, not re-derived per target (round 19; the node render
// plan round 22). This renderer consumes `nodePlan` and the plan helpers and only DRAWS
// the decisions as HTML — it holds no model semantics of its own.
import {
  CURRENCY_GLYPH, LIST_QUALIFIER, ROLE_UNIT, hasOwnUnit,
  qualifierPlacement, quantityLabel,
  labelOf, labelTextOf, compareRowKeys, compareHeaderEntries, nestedCollections, namedChildEntries,
  nodePlan, itemActionPlan, controlItemPlan, runPlan, compareCellOf, resolveRowLabel, columnLabel, buildRefLabels,
  rankedSequence, hasValue, tableRowLabel, tableCellLinks, mediaFirstOf, readingPageOf, pageLayoutOf,
} from './axis.mjs';

const decodeEntities = (s) => String(s).replace(/&(nbsp|amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (m, e) => {
  const map = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  const k = e.toLowerCase();
  if (k in map) return map[k];
  const code = k.startsWith('#x') ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
  return Number.isFinite(code) ? String.fromCodePoint(code) : m;
});
const esc = (s) => decodeEntities(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// An `<img>` with no usable src is a broken icon in every browser (round-15 holdout
// finding: 25/69 uncrafted pages). The capture's alt text is a captured fact, so an
// image without a URL degrades to its alt text — never to `<img src="">`, and never
// to a made-up URL (F-055).
function imgHtml(src, alt) {
  const s = typeof src === 'string' ? src.trim() : '';
  const a = alt == null ? '' : String(alt);
  if (!s) return a ? `<span class="img-alt">${esc(a)}</span>` : '';
  return `<img src="${esc(s)}" alt="${esc(a)}">`;
}

// An `_image` fact value is either an image value or a `list` of them (the extractor
// collapses several images of one storyline into a list value). Both shapes are images.
// 轮 58（L-3）三种图带模式，由轴层声明选择：
//   'bleed' — 仅限声明的 hero/banner（facts.hero 的两条来路：深度 0 主图、banner 成员），满幅；
//   'band'  — 内容图带（image-strip 形态），包在 .band 里：绝不满幅、居中、不超容器宽
//             （U-20/U-21/U-27）。
//   'bare'  — 照片墙（gallery-mosaic）内部用，瓷砖尺寸由 mosaic 网格约束。
function imageEntries(v) {
  if (!v || typeof v !== 'object') return [];
  if (Array.isArray(v.list)) return v.list.filter((e) => e && typeof e === 'object' && 'image' in e);
  return 'image' in v ? [v] : [];
}
const imageFigures = (v, mode = 'band') => imageEntries(v)
  .map((e) => imgHtml(e.image, e.alt)).filter(Boolean)
  .map((img) => `<figure class="strip${mode === 'tile' ? ' tile' : ''}">${img}</figure>`)
  .map((fig) => (mode === 'band' ? `<div class="band">${fig}</div>` : fig)).join('');

function fmt(v) {
  if (v === null || v === undefined) return '';
  if ('list' in v) return v.list.map((e) => `<span class="chip">${fmt(e)}</span>`).join(' ');
  if ('text' in v) return esc(v.text);
  if ('num' in v) return esc(v.num) + (v.unit ? ` ${esc(v.unit)}` : '');
  if ('money' in v) {
    const sym = CURRENCY_GLYPH[v.currency] ?? (v.currency ? esc(v.currency) + ' ' : '');
    // `list` 是内部语义标记，不是显示前缀（`from`/`起`/`订金` 等才是）
    const q = v.qualifier && v.qualifier !== LIST_QUALIFIER ? esc(v.qualifier) : '';
    // 限定词的位置是词本身的语法（axis.qualifierPlacement）：`起/含税/每…` 后置，`从/From/订金/起始价：` 前置。
    if (!q) return sym + esc(v.money);
    return qualifierPlacement(v.qualifier) === 'post' ? `${sym}${esc(v.money)} ${q}` : `${q} ${sym}${esc(v.money)}`;
  }
  if ('date' in v) return esc(v.date);
  if ('bool' in v) return v.bool ? 'yes' : 'no';
  if ('icon' in v) return esc(v.icon);
  if ('video' in v) return `<a href="${esc(v.video)}">video</a>`;
  if ('image' in v) return imgHtml(v.image, v.alt);
  if ('ref' in v) {
    const raw = String(v.ref);
    const id = raw.replace(/^key:/, '').replace(/[^A-Za-z0-9_-]/g, '-');
    if (raw.startsWith('key:')) {
      const label = refLabels.get(raw.slice(4));
      return label ? `<a class="ref" href="#${esc(id)}">${esc(label)}</a>` : '';  // never print the raw key
    }
    return `<a class="ref" href="#${esc(id)}">${esc(raw)}</a>`;
  }
  return esc(JSON.stringify(v));
}
const inlineChildrenHtml = (v, links) => {
  const text = v.text;
  const positions = links.map((a) => ({...a, at:text.indexOf(a.label)})).sort((a,b)=>a.at-b.at);
  let at = 0, out = '';
  for (const a of positions) { out += esc(text.slice(at,a.at)) + `<a class="body-link" href="${esc(a.href)}">${esc(a.label)}</a>`; at=a.at+a.label.length; }
  return out + esc(text.slice(at));
};
const factHtml = (v, extra = '') => `<div class="fact"><span class="val">${fmt(v)}${extra}</span></div>`;
// §9 正文链接（轮 46）：句子里的链接保持**行内**——句中的动作 label 换成一个行内 `<a>`，
// 而不是句后的实心按钮。发生在句内的链接由 axis.inlineBodyLinkKey 判定。
function inlineLinkFactHtml(v, action, extra = '') {
  const t = v && typeof v === 'object' && typeof v.text === 'string' ? v.text : null;
  if (!t || !action || !action.href || !action.label || !t.includes(action.label)) return factHtml(v, extra);
  const at = t.indexOf(action.label);
  const before = t.slice(0, at), after = t.slice(at + action.label.length);
  return `<div class="fact"><span class="val">${esc(before)}<a class="body-link" href="${esc(action.href)}">${esc(action.label)}</a>${esc(after)}${extra}</span></div>`;
}

// 集合条目的动作（F-031-§4 / F-020）：条目名是内容；带 label 的动作是源站自己的控件文字，
// 必须作为控件出现。二者同字时只渲染一遍（此时条目名降级为链接目标，不新增文案）。
// 可见性/作用域/「是否源站控件」在 axis.mjs（itemActionPlan）；这里只管 HTML 呈现。
function itemExtra(it, chain, ctx) {
  const a = itemActionPlan(it, chain, ctx.values);
  if (!a) return { linkTo: null, ctl: '' };
  if (a.inlineLabel) {
    const name = labelTextOf(it), at = name.indexOf(a.label);
    return { linkTo: null, ctl: '', labelHtml: `${esc(name.slice(0, at))}<a class="body-link" href="${esc(a.href)}">${esc(a.label)}</a>${esc(name.slice(at + a.label.length))}` };
  }
  const ctl = a.hasTarget ? `<a class="ctl" href="${esc(a.href)}">${esc(a.label)}</a>` : `<span class="ctl">${esc(a.label)}</span>`;
  return a.isControl ? { linkTo: null, ctl } : { linkTo: a.hasTarget ? a.href : null, ctl: '' };
}
function renderList(items, chain, ctx, cols = 0) {
  const lis = items.map((it) => {
    const v = labelOf(it);
    const label = v ? fmt(v) : '';
    if (!label) return '';
    const ex = itemExtra(it, chain, ctx);
    const inner = ex.labelHtml || (ex.linkTo ? `<a href="${esc(ex.linkTo)}">${label}</a>` : label);
    // 标记即声明（轮 57）：条目名自身是目的地链接（带 _action.to）⇒ 标记换成 accent `›`
    // （CSS ::marker，见样式表层1）；纯事实条目保持 `•`。类名只由 ex.linkTo 决定。
    return `<li${ex.linkTo ? ' class="go"' : ''}${ownerAttr(it,ctx)}>${inner}${ex.ctl}</li>`;
  }).join('');
  // Column count is declared by the shared axis plan; long ordinary destination
  // labels wrap within a directory instead of privately collapsing the whole group.
  return lis ? `<ul class="linklist${cols ? ` cols${cols}` : ''}">${lis}</ul>` : '';
}
// 有序集合（_rel.order = sequence|time）：每一项自成一行，顺序即语义（F-031-§1）
function renderSeq(items, chain, ctx) {
  // 长串纯标签 ⇒ 清单格（名字仍是源站文案，顺序仍是 DOM 顺序，只是不再编号）
  if (items.length >= 6 && items.every(isBareLabel)) {
    const cells = items.map((it) => `<span class="manifest-item">${fmt(labelOf(it))}</span>`).join('');
    return `<div class="manifest">${cells}</div>`;
  }
  const lis = items.map((it) => {
    const v = labelOf(it);
    const label = v ? fmt(v) : '';
    if (!label) return '';
    const ex = itemExtra(it, chain, ctx);
    const inner = ex.labelHtml || (ex.linkTo ? `<a href="${esc(ex.linkTo)}">${label}</a>` : label);
    return `<li${ownerAttr(it,ctx)}>${inner}${ex.ctl}</li>`;
  }).join('');
  return lis ? `<ol class="seq">${lis}</ol>` : '';
}
function renderImageStrip(items) {
  // 小图集（3–5 张）是照片墙：按源站构图排成「1 大 + N 小」网格（轮 56，airbnb U-07）。
  // 6 张以上的长图带（mi 长图详情 / 首页满幅 band）是内容图带（.band）：不满幅、居中、压到容器宽。
  if (items.length >= 3 && items.length <= 5) {
    const tiles = items.map((it) => imageFigures(it._image, 'tile')).join('');
    return `<div class="gallery-mosaic">${tiles}</div>`;
  }
  return items.map((it) => imageFigures(it._image, 'band')).join('');
}
function factHtmlInline(v) {
  const h = factHtml(v);
  return h.replace(/^<div class="fact">|<\/div>$/g, '').replace(/^<span class="val">|<\/span>$/g, '');
}
function renderProse(items) {
  return `<div class="prose">${items.map((it) => {
    const t = labelOf(it);
    return t ? `<p>${fmt(t)}</p>` : '';
  }).join('')}</div>`;
}

// `key:` 标签索引：构建规则在 axis.mjs（buildRefLabels）；这里只保存结果供 fmt() 使用。
let refLabels = new Map();
function renderChips(items, chain, ctx) {
  const chips = items.map((it) => {
    const v = labelOf(it);
    const label = v ? fmt(v) : '';
    if (!label) return '';            // no label, no chip (never an empty control)
    const ex = itemExtra(it, chain, ctx);
    const inner = ex.labelHtml || (ex.linkTo ? `<a href="${esc(ex.linkTo)}">${label}</a>` : label);
    return `<span class="chip-item"${ownerAttr(it,ctx)}>${inner}${ex.ctl}</span>`;
  }).join('');
  // 成员是句子或带旁注（含句读/括号）时不排成一行 chip 流：每条自成一行（F-031-§1）
  const rows = items.some((it) => /[，。；、（）：]/.test(labelTextOf(it)));
  return chips ? `<div class="chips${rows ? ' chips-rows' : ''}">${chips}</div>` : '';
}
// 长串纯标签（≥6 项、每项只有名字）是**清单**（一组面板/条目名），不是编号目录：一项一行加序号会被读成"目录页"
// （轮 34：grafana 11 个面板名渲染成 1–11 的裸串，整页像技术文档的目录）。轴不变，只换形状：网格条目格。
const isBareLabel = (it) => factsOf(it).every((f) => ['_name', '_title', '_text'].includes(f.key));
// 角色单位兜底（ROLE_UNIT / hasOwnUnit 见 axis.mjs）：事实自带 unit 时绝不追加，否则两个单位连排（「870 人好评 条评价」，F-037）
const roleFact = (f) => `${fmt(f.value)}${ROLE_UNIT[f.key] && !hasOwnUnit(f.value) ? ` ${ROLE_UNIT[f.key]}` : ''}`;
// 词表眼里数值角色事实的标签（axis.quantityLabel）：只给**语义无歧义**的数值角色加前缀
// （`_rating`→评分 / `_rating-count`→评价数 / `_stock`→库存）。`_count`/`_measure` 这类通用计数
// 站点语义因页面而异（播放/弹幕/点赞…），默认不加标签（不发明、更不误导，轮 32）。
const roleLabeled = (f, html) => { const l = quantityLabel(f.key, f.value); return l ? `<span class="role-label">${esc(l)}</span> ${html}` : html; };
// 一个值的可见纯文本（供去重比较；无标签、无实体转义）。
function plainValue(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return '';
  if ('text' in v) return String(v.text);
  if ('num' in v) return String(v.num) + (v.unit ? ` ${v.unit}` : '');
  if ('money' in v) {
    const sym = CURRENCY_GLYPH[v.currency] ?? (v.currency ? v.currency + ' ' : '');
    const q = v.qualifier && v.qualifier !== LIST_QUALIFIER ? String(v.qualifier) : '';
    if (!q) return `${sym}${v.money}`;
    return qualifierPlacement(v.qualifier) === 'post' ? `${sym}${v.money} ${q}` : `${q} ${sym}${v.money}`;
  }
  return '';
}
function renderDeflist(items, chain, ctx, order) {
  // An ordered list of name+detail rows is a leaderboard ONLY when it is a 榜单
  // (axis.mjs `rankedSequence`): a textual, rankable set. A hero/feature carousel whose
  // members carry their own images is a display sequence, not a rank — numbering it reads
  // as a table of contents (round 37: `huawei-cn/home` hero rendered `1. / 2.`).
  const ranked = rankedSequence(items, order);
  const rows = items.map((it, i) => {
    const label = it._name ?? it._title;
    const rest = factsOf(it).filter((x) => !['_name', '_title'].includes(x.key));
    const l0 = label ? fmt(label) : '';
    const ex = itemExtra(it, chain, ctx);
    const l = l0 && ex.linkTo ? `<a href="${esc(ex.linkTo)}">${l0}</a>` : l0;
    const v = (rest.map((x) => {
      const value = roleFact(x);
      return x.key === '_image' && ex.linkTo ? value.replace(/<img\b[^>]*>/g,
        (img) => `<a class="media-link" href="${esc(ex.linkTo)}">${img}</a>`) : value;
    }).join(' ') + (ex.ctl ? ` ${ex.ctl}` : '')).trim();
    if (!l && !v) return '';
    const rank = ranked ? `<span class="rank">${i + 1}</span>` : '';
    // no empty label cell: an unlabeled row keeps its full width (F-031-§5)
    return `<div class="defrow${it._image ? ' media-row' : ''}${labelTextOf(it).length > 24 ? ' long-label' : ''}"${ownerAttr(it,ctx)}>${rank}${l ? `<div class="deflabel">${l}</div>` : ''}<div class="defval">${v}</div></div>`;
  }).join('');
  return rows ? `<div class="deflist${ranked ? ' ranked' : ''}${!ranked && items.every((it) => it._image) ? ' media-captions' : ''}">${rows}</div>` : '';
}
function renderAccordion(items, chain, hide, ctx) {
  const det = items.map((it) => {
    const q = labelOf(it);
    const a = factsOf(it).filter((x) => ['_detail', '_summary', '_text'].includes(x.key) && x.value !== q);
    const answer = a.map((x) => fmt(x.value)).join(' ');
    if (!q && !answer) return '';
    if (!q) return `<div class="qa-a">${answer}</div>`;
    return `<details class="qa"><summary>${fmt(q)}</summary><div class="qa-a">${answer}</div></details>`;
  }).join('');
  return `<div class="accordion">${det}</div>`;
}
function renderRun(items, chain, hide, ctx, node) {
  // F-051 table/card threshold is a shared decision (`runPlan` in axis.mjs); this is only
  // the HTML shape of it: a `<table class="data">` with an optional row-ops column.
  const rp = runPlan(items);
  const bindings = tableCellLinks(node, chain);
  const cellHtml = (v, links) => {
    if (v?.list) return v.list.map((x) => cellHtml(x, links)).join('<br>');
    const link = links?.get(v?.text);
    return link ? `<a class="table-link"${ownerAttr(link.node,ctx)} href="${esc(link.href)}">${fmt(v)}</a>` : fmt(v);
  };
  if (rp.isTable) {
    const anyOps = items.some((it) => namedChildEntries(it).length > 0);
    const showHead = rp.cols.some((c) => columnLabel(c)) || anyOps;
    const head = showHead ? `<tr>${rp.cols.map((c) => `<th>${esc(columnLabel(c))}</th>`).join('')}${anyOps ? '<th></th>' : ''}</tr>` : '';
    // A row whose ONLY value is the identity column is the source's own group row (the
    // second cell is empty). Shared decision (`tableRowLabel` in axis.mjs, round 47): an
    // explicitly-empty cell (`{text:""}`) is not a value, so S0.1's filled blank does not
    // turn the group heading into a pric-less data row (round 35).
    const span = rp.cols.length + (anyOps ? 1 : 0);
    const trs = items.map((it) => {
      const grp = tableRowLabel(rp, it);
      if (grp) return `<tr class="row-group"><th colspan="${span}">${fmt(grp)}</th></tr>`;
      const tds = rp.cols.map((col) => { const v = rp.cellValue(it, col); return `<td>${hasValue(v) ? cellHtml(v, bindings.get(it)) : ''}</td>`; }).join('');
      const ops = namedChildEntries(it).map((ch) => renderNode(ch.node, [...chain, it], false, hide, { ...ctx, grid: true }, 4)).join('');
      return `<tr>${tds}${anyOps ? `<td class="row-ops">${ops}</td>` : ''}</tr>`;
    }).join('');
    return `<div class="data-scroll"><table class="data"><thead>${head}</thead><tbody>${trs}</tbody></table></div>`;
  }
  return `<div class="cards">${items.map((it) => `<div class="item">${renderNode(it, [...chain, it], false, hide, { ...ctx, grid: true }, 4)}</div>`).join('')}</div>`;
}

// The choice-set decision (`kind`, `rich`, options, columns) is shared in axis.mjs; this is
// the HTML drawing of it: a select table for rich options, a chipbar fieldset otherwise.
function renderSelectTable(ch, node, chain, hide, ctx) {
  const t = ch.table;
  const legend = ch.legend ? fmt(ch.legend) : esc(ch.name);
  // an all-blank header row is visual noise: emit the header only when a column is labeled (T-107)
  const head = t.showHead ? `<tr><th class="sel"></th>${t.cols.map((c) => `<th>${esc(t.labelKey(c))}</th>`).join('')}${t.anyOps ? '<th></th>' : ''}</tr>` : '';
  const rows = ch.options.map((o) => {
    const tds = t.cols.map((col, i) => { const v = t.cellValue(o.node, col); const text = v ? fmt(v) : ''; return `<td>${i === 0 && o.action?.hasTarget ? `<a class="option-link" href="${esc(o.action.href)}">${text}</a>` : text}</td>`; }).join('');
    const ops = o.ops.map((n) => renderNode(n, [...chain, o.node], false, hide, { ...ctx, grid: true }, 4)).join('');
    const val = o.key ? `key:${o.key}` : String(o.index);
    return `<tr><td class="sel"><input type="${ch.multi ? 'checkbox' : 'radio'}" name="${esc(ch.name)}" value="${esc(val)}"${o.selected ? ' checked' : ''}></td>${tds}${t.anyOps ? `<td class="row-ops">${ops}</td>` : ''}</tr>`;
  }).join('');
  return `<fieldset class="expose expose-${esc(ch.name)}"><legend>${legend}</legend><table class="data"><thead>${head}</thead><tbody>${rows}</tbody></table></fieldset>`;
}
function renderChoice(ch, node, chain, hide, ctx) {
  if (ch.kind === 'plain-fact') {
    const lbl = ch.legend ? fmt(ch.legend) : '';
    const v = ch.itemName;
    const text = v ? fmt(v) : '';
    const name = ch.itemAction?.hasTarget ? `<a class="option-link" href="${esc(ch.itemAction.href)}">${text}</a>` : text;
    return `<div class="defrow">${lbl ? `<div class="deflabel">${lbl}</div>` : ''}<div class="defval">${name} ${ch.itemExtra.map((x) => fmt(x.value)).join(' ')}</div></div>`;
  }
  if (ch.kind === 'choice') {
    if (ch.rich) return renderSelectTable(ch, node, chain, hide, ctx);
    const opts = ch.options.map((o) => {
      const v = o.name ?? o.fieldsName;
      const extra = o.extra.map((x) => fmt(x.value)).join(' ');
      const label = (v && (v.text !== undefined || v.num !== undefined) ? fmt(v) : `option ${o.index + 1}`) + (extra ? ` <span class="choice-extra">${extra}</span>` : '');
      const val = o.key ? `key:${o.key}` : (v ? v.text : String(o.index));
      const destination = o.action?.hasTarget ? `<a class="option-link" href="${esc(o.action.href)}">${label}</a>` : label;
      return `<label class="choice"><input type="${ch.multi ? 'checkbox' : 'radio'}" name="${esc(ch.name)}" value="${esc(val)}"${o.selected ? ' checked' : ''}> ${destination}</label>`;
    }).join('');
    const legend = ch.legend ? fmt(ch.legend) : '';
    const hint = ch.hint ? `<span class="hint">${fmt(ch.hint)}</span>` : '';
    return `<fieldset class="expose chipbar expose-${esc(ch.name)}">${legend ? `<legend>${legend}</legend>` : ''}${hint}${opts}</fieldset>`;
  }
  if (ch.kind === 'bool') {
    // a boolean switch is a checkbox with its name on the control (F-031-§6), not an empty text box
    const name = (ch.legend ? fmt(ch.legend) : '') || (ch.nodeName ? fmt(ch.nodeName) : '');
    return `<label class="choice expose-${esc(ch.name)}"><input type="checkbox" name="${esc(ch.name)}" value="true"> ${name}</label>`;
  }
  const lbl = ch.legend ? fmt(ch.legend) : '';   // never print a raw identifier as a label
  const hint = ch.hint ? `<span class="hint">${fmt(ch.hint)}</span>` : '';
  // `secret` is the semantic "secret input": it must render as a password field so the value is
  // never shown in clear (round 46, F-046 closed-type addition). It is NOT text.
  const itype = ch.type === 'secret' ? 'password' : (ch.type === 'date' ? 'date' : (ch.type === 'time' ? 'datetime-local' : (ch.type === 'num' ? 'number' : 'text')));
  // D-3: a text field's captured label is the in-box watermark (placeholder); a date/number
  // field keeps an external label where a watermark can't carry the name. Shared decision:
  // `ch.labelAsPlaceholder` (axis.mjs choicePlan).
  // The label is never lost: as a watermark it moves into the field, and a screen-reader
  // label keeps the name in the document (a placeholder alone is not a label — F-064).
  const outside = lbl ? `<span class="deflabel${ch.labelAsPlaceholder ? ' sr-only' : ''}">${lbl}</span>` : '';
  const watermark = lbl && ch.labelAsPlaceholder ? ` placeholder="${esc(lbl)}"` : '';
  // D-3 默认值：抓取到的输入框当前值作为可见的 value（不丢事实）
  const defVal = ch.type === 'secret' ? '' : (ch.value && typeof ch.value === 'object' && typeof ch.value.text === 'string' ? ch.value.text : '');
  const value = defVal ? ` value="${esc(defVal)}"` : '';
  // 默认值属于控件内部，用可见的 value 呈现；同时在文档里留一份文本（sr-only），
  // 使“抓取到的默认值”在可见文本口径下也不丢失（F-064 同例）。
  const docVal = defVal ? `<span class="sr-only">${esc(defVal)}</span>` : '';
  // aria-label 只放源站文案；无文案时绝不把内部标识符（expose name）写进属性
  return `<span class="expose expose-input expose-${esc(ch.name)}">${outside}${hint}${docVal}<input type="${itype}" name="${esc(ch.name)}" data-type="${esc(ch.type)}"${value}${lbl ? ` aria-label="${esc(lbl)}"` : ''}${watermark}></span>`;
}

// 时间流文本（弹幕/滚动评论，`_rel.order = "stream"`，轮 46）：短文本按**行内流**紧凑排列，
// 绝不铺成几十行竖排墙；每条限一行（CSS 单行省略），事实一条不丢。
function renderStream(items) {
  const cells = items.map((it) => {
    const v = labelOf(it);
    const label = v ? fmt(v) : '';
    return label ? `<span class="stream-item">${label}</span>` : '';
  }).join('');
  return cells ? `<div class="stream">${cells}</div>` : '';
}

function renderForm(form, items, chain, hide, ctx, depth, node, order, cols = 0, compactMedia = false) {
  // 集合成员是卡片语境（轮 58 · L-4/L-6：列数与“图在题上”是轴层声明，这里只落类名/传参）
  const mctx = { ...ctx, member: true };
  if (order === 'stream' && items.every(isBareLabel)) return renderStream(items);
  if (form === 'compare-table') return renderCompareTable(items, chain, hide, ctx);
  if (form === 'chips') return renderChips(items, chain, ctx);
  if (form === 'list') return renderList(items, chain, ctx, cols);
  if (form === 'seq') return renderSeq(items, chain, ctx);
  if (form === 'controls') return renderControls(items, chain, ctx);
  if (form === 'stack') return renderStack(items, chain, hide, mctx, depth, cols, mediaFirstOf(items, form), compactMedia);
  if (form === 'image-strip') return renderImageStrip(items);
  if (form === 'prose') return renderProse(items);
  if (form === 'deflist') return renderDeflist(items, chain, ctx, order);
  if (form === 'accordion') return renderAccordion(items, chain, hide, ctx);
  if (form === 'table') return renderRun(items, chain, hide, ctx, node);
  const cls = form === 'product-cards' ? 'cards product-cards' : 'cards';
  const mf = mediaFirstOf(items, form);
  const cards = items.map((it) => {
    const inner = renderNode(it, [...chain, node], false, hide, { ...mctx, grid: true }, depth + 1);
    return inner ? `<div class="item">${inner}</div>` : '';
  }).join('');
  // cols（轴层声明）落在网格容器上：.cards 本身就是 auto-fill 网格，标记使声明可见、可断言。
  return cards ? `<div class="${cls}${cols ? ' cols-auto' : ''}${compactMedia ? ' compact-media' : ''}${mf ? ' media-first' : ''}">${cards}</div>` : '';
}

// 序列：不可比的区块各自成立，各带标题；无标题块用区域分隔（F-031-§1/§5）。
// 轮 58（L-4）：轴层声明了列数（cols='auto'，成员皆带图的卡片/Feed 集合）时，堆叠包成
// auto-fill 网格（桌面 2–4 列）；阅读型堆叠保持单列。包裹层不改变任何事实文本。
function renderStack(items, chain, hide, ctx, depth, cols = 0, mediaFirst = false, compactMedia = false) {
  let out = '';
  let prevHadTitle = false;
  for (const it of items) {
    const inner = renderNode(it, [...chain], false, hide, { ...ctx, grid: Boolean(cols) || Boolean(ctx.grid) }, depth + 1);
    if (!inner) continue;
    const hasTitle = Boolean(it._title || it._name || it._text);
    if (!hasTitle && prevHadTitle) out += '<hr class="region">';
    out += `<section class="block">${inner}</section>`;
    prevHadTitle = hasTitle;
  }
  return out ? `<div class="stack${cols ? ' cols-auto' : ''}${compactMedia ? ' compact-media' : ''}${mediaFirst ? ' media-first' : ''}">${out}</div>` : '';
}
// 控件条：_action-only 成员是控件，不是内容（F-031-§4）；动作 label 是源站自己的控件文字（F-022），
// 与条目名不是同一事实时另出一枚控件；同一事实的两种写法（一个包含另一个）只渲染信息更全的一处。
function renderControls(items, chain, ctx) {
  const btns = items.map((it) => {
    const c = controlItemPlan(it, chain, ctx.values);
    if (!c.label) return '';
    const alias = c.accessibleLabel ? ` aria-label="${esc(c.accessibleLabel)}"` : '';
    const copy = esc(c.label) + (c.accessibleLabel ? `<span class="sr-only">${esc(c.accessibleLabel)}</span>` : '');
    return c.href ? `<a class="ctl" href="${esc(c.href)}"${alias}>${copy}</a>`
      : `<span class="ctl"${alias}${c.verb ? ` data-verb="${esc(c.verb)}"` : ''}>${copy}</span>`;
  }).join('');
  return btns ? `<div class="controls">${btns}</div>` : '';
}
// 横向对比表（F-031-§3）：行键/单元格/行标题/退化判定/**实体表头属性集**均在 axis.mjs；
// 这里只管 HTML 呈现。表头集合是共享决策 `compareHeaderEntries`，本函数只把每个入口画成
// 自己的记号（名称→链接，标签/价格/副标题/摘要→各自块）——绝不再自己决定哪些键属于表头。
function renderCompareTable(items, chain, hide, ctx) {
  const rowKeys = compareRowKeys(items);
  const head = `<tr><th class="cmp-row"></th>${items.map((it) => {
    const ex = itemExtra(it, chain, ctx);
    const entityPlan = nodePlan(it, { chain, values: ctx.values, depth: 5, grid: true });
    let nm = '';
    let rest = '';
    for (const e of compareHeaderEntries(it)) {
      if (e.key === '_name' || e.key === '_title') {
        const label = fmt(e.value);
        nm = label && ex.linkTo ? `<a href="${esc(ex.linkTo)}">${label}</a>` : label;
      } else if (e.key === '_tag') rest += `<span class="cmp-tag">${fmt(e.value)}</span>`;
      else if (e.key === '_price') rest += `<div class="cmp-price">${fmt(e.value)}</div>`;
      else rest += `<div class="cmp-sub">${fmt(e.value)}</div>`;   // _subtitle / _summary
    }
    // 实体自己的嵌套集合（如机身颜色）属于该实体，渲染在它的列内——绝不与另一实体的列表按下标配对
    let nested = '';
    for (const col of nestedCollections(it)) nested += renderForm(col.form, col.items, [...chain, it], hide, { ...ctx, grid: true }, 5, it);
    const nestedHtml = nested ? `<div class="cmp-nested">${nested}</div>` : '';
    const row = renderActionRow(entityPlan.actionRow);
    const ctl = row ? `<div class="cmp-ctl">${row}</div>` : '';
    return `<th class="cmp-col"${ownerAttr(it,ctx)}>${nm}${rest}${nestedHtml}${ctl}</th>`;
  }).join('')}</tr>`;
  const body = rowKeys.map((key) => {
    // never print an internal key as a row label (F-022/F-029): the SAME shared chain every
    // target applies — child title → role vocabulary → domain field dictionary → empty
    const label = resolveRowLabel(items, key);
    const cells = items.map((it) => {
      const c = compareCellOf(it, key);
      if (c.kind === 'empty') return '<td class="cmp-cell"></td>';
      if (c.kind === 'node') return `<td class="cmp-cell">${renderNode(c.node, [...chain, it], false, hide, { ...ctx, grid: true }, 4)}</td>`;
      return `<td class="cmp-cell">${fmt(c.value)}</td>`;
    }).join('');
    return `<tr><th class="cmp-row">${esc(label)}</th>${cells}</tr>`;
  }).join('');
  return `<div class="cmp-scroll"><table class="cmp-table"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}

const renderAction = (a) => {
  // `verb` is internal semantics, never visible copy (F-022/F-029): no label ⇒ no text
  if (!a.label) return '';
  // no capture-backed target: keep the source's own words, shaped like a control (T-101/F-031-§4)
  return a.hasTarget
    ? `<a class="action verb-${esc(a.verb)}" href="${esc(a.href)}">${esc(a.label)}</a>`
    : `<span class="action-plain">${esc(a.label)}</span>`;
};

// One row for every control of this element (round 27). The row/primary decision is the
// shared `plan.actionRow` (axis.mjs); this draws it: the primary CTA is the solid
// `.action`, the rest are the light `.ctl` pills. Fixes the two stacked, inverted actions
// on apple-com/home (source: `Buy` filled + `Learn more` light).
function renderActionRow(row) {
  if (!row.length) return '';
  const btns = row.map((c) => (c.primary
    ? renderAction({ label: c.label, verb: c.verb, hasTarget: Boolean(c.href), href: c.href })
    : (c.href ? `<a class="ctl" href="${esc(c.href)}">${esc(c.label)}</a>` : `<span class="ctl"${c.verb ? ` data-verb="${esc(c.verb)}"` : ''}>${esc(c.label)}</span>`))).join('');
  // a lone control keeps its own shape (byte-identical to a single-action element before
  // round 27); only a real row is wrapped, so the change stays where the defect was.
  return row.length > 1 ? `<div class="controls">${btns}</div>` : btns;
}

function renderNode(node, chain, isHero, hide, ctx, depth, region = null) {
  // The whole node decision is the shared plan (axis.mjs); this function draws it.
  // `grid` is the caller's layout context (inside a card/table column no banner full-bleed),
  // `region` is the model's named-child key (轮 57: the `header` region is the site top bar).
  const plan = nodePlan(node, { chain, values: ctx.values, hidden: hide.get(node), depth, degradations: ctx.degradations, grid: Boolean(ctx.grid), region });
  if (!plan.visible) return '';

  // explicit labeled actions; label-less navigate/open lowers to the element's own link (F-020)
  let linkTo = null;
  const titleIsControl = plan.titleIsControl;
  if (plan.action) {
    if (plan.action.isTitleControl || plan.action.isLabellessLink) linkTo = plan.action.linkTo;
  }
  // every control of this element is ONE row (round 27): own `_action` + inner controls
  const action = renderActionRow(plan.actionRow);

  // _primary FACT gets the enlarged hero slot (axis.mjs primarySlot); subtree primaries
  // stay in place (no reordering). Hiding the shown fact is per-target storage.
  // round 30: the same AMOUNT must not render twice in one node. When a body fact already
  // states the hero's amount verbatim (the `_summary` is the same price fact with more —
  // `RMB 6799 起或 RMB 284/月 起`), the hero adds nothing: its fact is still on the page
  // (the summary carries it), only the duplicate hero line is dropped. The body fact is a
  // model fact that must render byte-for-byte, so the RICHER form wins the one slot.
  const heroText = plan.primary ? plainValue(plan.primary.value).replace(/\s+/g, '') : '';
  const heroDup = Boolean(plan.primary) && plan.primary.holder === node && heroText.length >= 4
    && Boolean(plan.primary.value) && typeof plan.primary.value === 'object' && 'money' in plan.primary.value
    && plan.facts.list.some((f) => {
      const t = f.value && typeof f.value === 'object' && 'text' in f.value ? String(f.value.text).replace(/\s+/g, '') : '';
      return t.length > heroText.length && t.includes(heroText);
    });
  let heroHtml = '';
  if (plan.primary && !heroDup) {
    // A sentence-long `_primary` is the page's lead paragraph, not a headline: keep it as a
    // readable lead (H1-sized prose collapses the level hierarchy). Short/numeric primaries
    // keep the enlarged hero slot.
    const pv = plan.primary.value;
    const leadProse = Boolean(pv && typeof pv === 'object' && typeof pv.text === 'string' && (plan.primary.key === '_summary' || pv.text.length > 48));
    heroHtml = `<div class="hero fact-hero${leadProse ? ' hero-prose' : ''}">${factHtml(pv)}</div>`;
  }
  if (plan.primary && !heroDup) {
    if (!hide.has(plan.primary.holder)) hide.set(plan.primary.holder, new Set());
    hide.get(plan.primary.holder).add(plan.primary.key);
  }

  let titleText = plan.headingValue ? fmt(plan.headingValue) : null;
  // Only an empty repeated ancestor label can be redundant. Populated sibling
  // groups retain their local heading, even when the same text appeared elsewhere.
  const headingTextValue = plan.headingValue ? plan.headingValue.text : null;
  const nodeHasFacts = plan.facts.list.length > 0 || plan.facts.fields.length > 0 || Boolean(plan.facts.hero);
  let headingAdded = false;
  if (titleText && headingTextValue && ctx.headings) {
    const ancestorDup = ctx.headings.has(headingTextValue);
    if (ancestorDup && !nodeHasFacts) titleText = null;
    else { ctx.headings.add(headingTextValue); headingAdded = true; }
  }
  const done = (out) => { if (headingAdded) ctx.headings.delete(headingTextValue); return out; };
  const cls = ['node', `depth-${Math.min(depth, 4)}`];
  if (isHero) cls.push('hero-branch');
  // 轮 58（L-1）：区块宽度分层是轴层声明（plan.widthTier），这里只落类名：prose 74ch 居中 /
  // narrow 默认内容居中 / wide 卡片与 Feed 区（容器全宽）/ bleed 仅限声明的 banner。同页各
  // section 宽度从此各归其层，不再无规则跳变（U-23/U-25/U-27）。
  if (plan.widthTier) cls.push(`w-${plan.widthTier}`);
  // 轮 57 站点头区横栏：决策在 nodePlan（headerBar），这里只落类名，形状在 CSS（.header-bar）。
  if (plan.headerBar) cls.push('header-bar');
  if (plan.banner) cls.push('banner');
  if (plan.singletonCard) cls.push('singleton-card');
  if (plan.orderedMediaRows) cls.push('ordered-media-rows');
  if (plan.booleanUtilities) cls.push('boolean-utilities');
  if (plan.utilityGroup) cls.push('utility-group');
  if (plan.utilityFacts) cls.push('utility-facts');
  if (plan.taskForm) cls.push('task-form');
  const demoted = plan.demoted;

  const itemsConsumed = new Set(plan.rowConsumed);
  // Facts declared before the collection are the lead-in; facts declared after it are the
  // node's footnote (plan.facts.trailing, axis.mjs) and must render BELOW the collection —
  // otherwise a trailing description splits the collection's lead-in from its own list.
  const trailingFacts = new Set(plan.facts.trailing);
  let bodyLead = '';
  let bodyFoot = '';
  let heroImage = '';
  const metaParts = [];
  // 分期时长并入承载行（U-28，轴层 installmentCarrierOf 已归属）：依附本事实的时长作为
  // 行内尾注画进同一个 .fact，不再单独成块；独立的 installment 条目被跳过。
  const attachedOf = (f) => plan.facts.list.filter((d) => d.category === 'installment' && d.attachTo === f);
  const inlineTail = (f) => attachedOf(f)
    .map((d) => `<span class="installment"><span class="sep">·</span> ${factHtmlInline(d.value)}</span>`).join('');
  for (const f of plan.facts.list) {
    if (plan.choice && plan.choice.kind === 'input' && f.key === '_text') continue;  // the field's default value (drawn on the input below)
    if (f.category === 'installment') continue;                                     // 并入承载行（U-28）
    if (f.category === 'meta') {
      const links = plan.inlineChildren.filter(c => c.key === f.key);
      metaParts.push(roleLabeled(f, links.length ? inlineChildrenHtml(f.value, links) : factHtmlInline(f.value))); continue;
    }
    let html;
    if (f.category === 'unit') html = roleLabeled(f, roleFact(f));               // 评分/评分数：带角色与单位，不留裸数字
    // 显式原价事实 ⇒ 弱化（删除线）；`list` 标记不进文案（fmt 已忽略）
    else if (f.category === 'was') html = `<div class="fact was"><span class="val">${fmt(f.value)}${inlineTail(f)}</span></div>`;
    else if (plan.inlineChildren.some((c) => c.key === f.key)) {
      const value = inlineChildrenHtml(f.value, plan.inlineChildren.filter((c) => c.key === f.key));
      html = f.category === 'quote' ? `<blockquote class="quote"><span class="val">${value}</span></blockquote>`
        : `<div class="fact"><span class="val">${value}${inlineTail(f)}</span></div>`;
    }
    else if (f.category === 'quote') html = `<blockquote class="quote"><span class="val">${fmt(f.value)}</span></blockquote>`;
    else if (plan.action && plan.action.inlineInto === f.key) html = inlineLinkFactHtml(f.value, plan.action, inlineTail(f));
    else if (f.key === '_image' && !ctx.grid) html = imageFigures(f.value, 'band');
    else html = factHtml(f.value, inlineTail(f));
    if (trailingFacts.has(f)) bodyFoot += html; else bodyLead += html;
  }
  if (ctx.member && plan.action?.linkTo) {
    // The member's visual and title share its declared navigation destination.
    // No target is inferred from the image URL, and unlabeled backend actions stay inert.
    const linked = (s) => s.replace(/<img\b[^>]*>/g, (img) => `<a class="media-link" href="${esc(plan.action.linkTo)}">${img}</a>`);
    bodyLead = linked(bodyLead); bodyFoot = linked(bodyFoot);
  }
  if (metaParts.length) bodyLead += `<div class="meta">${metaParts.join('<span class="sep">·</span>')}</div>`;
  for (const f of plan.facts.fields) bodyLead += factHtml(f.value);
  if (plan.facts.hero) heroImage = imageFigures(plan.facts.hero, ctx.reading || (depth === 0 && plan.leadAction && node._summary && !node._price) ? 'band' : 'bleed');   // declared hero/banner only: edge-to-edge (F-031-§7); everything else stays in-container (round 58, L-3)

  let body = '';
  let bodyField = '';   // 字段+提交的成组区（plan.fieldSubmit）
  if (plan.choice) {
    const choiceHtml = renderChoice(plan.choice, node, chain, hide, ctx);
    if (plan.fieldSubmit) bodyField += choiceHtml; else body += choiceHtml;
  }
  if (plan.titleConsumed) titleText = null;   // the heading IS the switch label: show it once, on the control

  // every sibling block item renders in ONE form; nothing renders twice (T-103)
  // 轴分组（compare 实体/连续正文段/普通集合）在 axis.mjs seqGroupsOf；D2/P3 同理。
  const { groups, order } = plan.items;
  for (const g of groups) body += renderForm(g.form, g.items, chain, hide, ctx, depth, node, order, g.cols, g.compactMedia);
  for (const g of groups) g.items.forEach((it) => itemsConsumed.add(it));
  // order:time shows a time axis only over a vertical sequence — never a stray rail across a grid (F-031-§1)
  if (order === 'time' && groups.length && groups.every((g) => g.form === 'deflist' || g.form === 'seq')) cls.push('timeline');
  // an empty collection still renders its empty-state storyline (F-013): every declared fact must render
  if (plan.emptyState) body += renderNode(plan.emptyState, [...chain, node], false, hide, ctx, depth + 1);

  // toolbar controls are the SAME row as the element's own action (round 27): the grouping
  // and the primary CTA come from the shared `plan.actionRow` (axis.mjs) for every target.

  let prevGroupHadTitle = false;
  // 轮 58（L-2）区域钉扎：header 组永远最顶（页面标题之上），footer 组永远最后；商品级动作
  // （如 mi15「用户评价」，根节点 actionRow）留在内容区、footer 之前。区域名是模型自己的
  // 声明，钉扎排序决策在 axis.mjs（orderedNamedChildren → entry.region），这里只选槽位。
  let headerHtml = '';
  let footHtml = '';
  let detailMain = '', detailSide = '', detailTail = '';
  const detailLayout = depth === 0 && ctx.pageLayout.kind === 'detail' ? ctx.pageLayout : null;
  for (const c of plan.namedChildren) {
    if (itemsConsumed.has(c.node)) continue;
    const h = renderNode(c.node, [...chain, node], false, hide, ctx, depth + 1, c.key);
    if (!h) continue;
    const sect = `<section class="group g-${esc(c.key)}">${h}</section>`;
    if (c.region === 'header') headerHtml += sect;
    else if (c.region === 'footer') footHtml += sect;
    else if (detailLayout && c.key === detailLayout.taskKey) detailSide += sect;
    else if (detailLayout && detailLayout.mainKeys.includes(c.key)) detailMain += sect;
    else if (detailLayout && detailLayout.tailKeys.includes(c.key)) detailTail += sect;
    else body += sect;
    prevGroupHadTitle = Boolean(c.node._title || c.node._name || c.node._text);
  }

  if (detailLayout) body += `<div class="detail-layout"><div class="detail-main">${detailMain}</div><aside class="detail-task">${detailSide}</aside></div><div class="detail-tail">${detailTail}</div>`;

  // a control whose only content is its own title renders as a control bar, not a promo card (F-031-§4)
  if (depth > 0 && titleText && (titleIsControl || linkTo) && !bodyLead && !heroHtml && !heroImage && !body && !action) {
    const inner = linkTo ? `<a class="ctl" href="${esc(linkTo)}">${titleText}</a>` : `<span class="ctl">${titleText}</span>`;
    return done(`<div class="controls"${ownerAttr(node,ctx)}>${inner}</div>`);
  }
  // a bare-title block is a promo card ONLY when the source has an image (T-106): the
  // measured set was 8/8 image-less collection members, which are ordinary text and must
  // never become an empty grey box (round 27).
  const bareTitle = depth > 0 && titleText && !bodyLead && !heroHtml && !heroImage && !body && !action && !plan.hasAction;
  if (bareTitle && node._image) {
    const img = imageEntries(node._image).map((e) => imgHtml(e.image, e.alt)).join('');
    return done(`<div class="promo${img ? ' promo-image' : ''}">${img}</div>`);
  }

  const headingLevel = Math.min(depth + 1, 6);
  const headingTag = depth === 0 ? 'h1' : `h${headingLevel}`;
  let head = '';
  if (titleText) {
    const t = titleIsControl
      ? (linkTo ? `<a class="ctl" href="${esc(linkTo)}">${titleText}</a>` : `<span class="ctl">${titleText}</span>`)
      : (linkTo ? `<a class="self-link${plan.action?.isLabellessLink ? ' nav' : ''}" href="${esc(linkTo)}">${titleText}</a>` : titleText);
    const identity = depth === 0 && ctx.pageLayout.headingRole === 'identity';
    head = `<${headingTag} class="title${titleIsControl ? ' title-control' : ''}${identity ? ' site-identity' : ''}">${t}</${headingTag}>`;
  }

  const anchorId = node._key ? ` id="${esc(String(node._key).replace(/[^A-Za-z0-9_-]/g, '-'))}"` : '';
  // 字段及其提交相邻成组（U-02）：提交紧跟字段，包成同一个 fieldbar；元素其余内容在组后。
  if (plan.fieldSubmit && plan.action) bodyField = `<div class="fieldbar">${bodyField}${renderAction(plan.action)}</div>`;
  // nothing to say: emit nothing at all (never an empty block)
  if (!head && !bodyLead && !heroHtml && !heroImage && !bodyField && !body && !action && !headerHtml && !footHtml) return done('');
  // 轮 58（L-6）条目内聚：图与标题永不分家（同一 article 内）；媒体优先成员（视频/卡片条目，
  // 轴层 mediaFirst ⇒ .media-first）由呈现层把图排到题上方（flex order，不拆 DOM）。footer 组
  // 总是渲染在一切之后（L-2 钉扎）。
  if (depth === 0 && ctx.reading) cls.push('reading-page');
  if (depth === 0 && !['default', 'reading'].includes(ctx.pageLayout.kind)) cls.push(`${ctx.pageLayout.kind}-page`);
  const surface = plan.banner ? MEDIA_SURFACES[plan.facts.hero?.image] : null;
  let surfaceStyle = '';
  if (surface) {
    cls.push('banner-integrated');
    if (surface.contentBounds[1] < 180) cls.push('media-centered');
    surfaceStyle = ` style="--banner-bg:${esc(surface.background)};--banner-fg:${esc(surface.foreground)};--media-width:${surface.width}px;--media-height:${surface.height}px;--media-ratio:${surface.width / (surface.contentBounds[2] - surface.contentBounds[0] + 48)}"`;
  }
  if (ctx.member && plan.action?.linkTo && heroImage) heroImage = heroImage.replace(/<img\b[^>]*>/g,
    (img) => `<a class="media-link" href="${esc(plan.action.linkTo)}">${img}</a>`);
  const intro = `${bodyLead}${heroHtml}${bodyField}${plan.leadAction ? action : ''}`;
  const opening = plan.introBeforeMedia ? intro + heroImage : heroImage + intro;
  const article = `<article${anchorId} class="${cls.join(' ')}"${ownerAttr(node,ctx)}${surfaceStyle}>${headerHtml}${head}${opening}${body}${bodyFoot}${plan.leadAction ? '' : action}${footHtml}</article>`;
  return done(demoted ? `<aside class="zone">${article}</aside>` : article);
}

// expose groups skip their label/summary facts in bodyLead (they become legend/hint)
// `report` (optional): an array the renderer appends compare degradations to (D2 audit)
const ownerAttr = (node,ctx) => ctx.paths?.has(node) ? ` data-model-owner="${esc(ctx.paths.get(node))}"` : '';
export function render(model, context = {}, report = null) {
  refLabels = buildRefLabels(model);
  const hide = new Map();
  const paths=new WeakMap();
  const index=(n,p='')=>{if(!n||typeof n!=='object')return;paths.set(n,p);for(const c of childrenOf(n))index(c.node,p?`${p}.${c.key}`:c.key);};index(model);
  const ctx = { values: context.values ?? {}, degradations: report ?? [], headings: new Set(), paths };
  ctx.reading = readingPageOf(model);
  ctx.pageLayout = pageLayoutOf(model);
  const html = renderNode(model, [], false, hide, ctx, 0);
  const title = esc(model._title ? fmt(model._title) : (model._intent ?? 'surface'));
  const brand = model._brand ? fmt(model._brand) : '';
  const accent = accentOf(context.site);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${title}</title>
<style>
:root{color-scheme:light;--accent:${accent};--surface:#fff;--ink:#17212b;--muted:#536171;--soft:#eef2f7;--soft-ink:#33475b;--line:#dbe3ec}
*{box-sizing:border-box}
body{margin:0;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;color:var(--ink);background:var(--surface)}
/* 轮 57 三层链接可供性（用户裁定：不一定是蓝色也不一定是下划线，但要一看可知可点）。
   accent 由 m1/brand-tokens.json 按站点注入（上面的 --accent），本文件不写死站名/色值。
   层1 目的地列表：.linklist 条目名自身带 _action.to ⇒ 标记 • 换 accent ›（::marker），
       文字 accent 无下划线；纯事实条目保持 •（标记即声明，.go 由 renderList 落）。
   层2 正文内链接：accent + 常显细下划线（1px，offset 2px）。
   层3 标题/卡片链接：accent、无下划线，hover 下划线；导航型标题（无 label 的 navigate/open
       链接，nodePlan.isLabellessLink）尾部 ›。控件/按钮形态不动（.ctl/.action 照旧）。 */
a{color:inherit;text-decoration:none;cursor:pointer}
a:hover{text-decoration:underline;text-decoration-color:currentColor}
a.ref,.val a.body-link,.prose a,.chips a,.data a.table-link{color:var(--accent);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:2px}
.linklist li.go::marker{content:"›";color:var(--accent);font-weight:700}
.linklist li.go>a{color:var(--accent);text-decoration:none}
.linklist li.go>a:hover{text-decoration:underline}
a.self-link{color:var(--accent);text-decoration:none}
a.self-link:hover{text-decoration:underline}
.media-link{display:contents}
.media-link:focus-visible img{outline:2px solid var(--accent);outline-offset:2px}
a.self-link.nav::after{content:" ›";font-weight:650}
th.cmp-col>a{color:var(--accent);text-decoration:none}
/* 轮 57 站点头区横栏（nodePlan.headerBar，规则见 axis.mjs region==='header'）：header 区域
   是一条水平顶栏 —— 导航项横排（accent、无标记、顶栏本身即可供性），无目标的账号入口 pill
   靠右。所有页的 header 同一规则；文本/MD 目标保持逐行。 */
.header-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px 26px;margin:0}
.header-bar>.block{display:contents}
.header-bar .node{margin:0}
.header-bar>.block:last-of-type>.node{margin-left:auto}
.header-bar .linklist{display:flex;flex-wrap:wrap;gap:2px 20px;margin:0;padding-left:0}
.header-bar .linklist li{margin:0;list-style:none}
.header-bar .linklist a{color:var(--accent);font-size:.95em}
.header-bar .chips{display:flex;flex-wrap:wrap;gap:8px;margin:0}
/* 轮 57 hero/banner：满幅图带。nodePlan.banner 判定后 _image 走 hero 槽（.strip 已满幅），
   不再锁 74ch；标题/副题/按钮在满幅带内居中，该突出的突出。 */
.banner>.title{text-align:center}
.banner>.fact{max-width:none;text-align:center}
.banner>.controls{justify-content:center}
.role-label{color:var(--muted);font-size:.9em;margin-right:2px}
/* 轮 58 · L-1 页面栅格：唯一页面容器 = main（居中、≈1280px、左右对称 padding）。
   section 宽度分层且由 nodePlan 按 section 种类声明（plan.widthTier，规则在 axis.mjs）：
   prose=阅读文本 74ch 居中 / narrow=默认内容 880px 居中 / wide=卡片与 Feed 网格（容器全宽）/
   bleed=仅限声明的 banner（满幅带，内文仍守 padding）。同页各 section 宽度各归其层，
   不再无规则跳变（U-23/U-25/U-26/U-27）。 */
main{max-width:1280px;margin:0 auto;padding:32px 24px 0}
/* Root identity, lead and controls inherit the owning content edge, not a separate
   centered title column. The outer page frame may be centered; its text need not be. */
.depth-0>.title{max-width:none;margin-inline:0}
.depth-0>.fact,.depth-0>.hero{margin-inline:0}
.depth-0>.fieldbar{justify-content:flex-start}
.depth-0>.site-identity{font-size:18px;line-height:1.4;text-align:left;margin:0 0 16px;font-weight:650}
h4.title,h5.title,h6.title{font-size:1em;line-height:1.5;margin:.7em 0 .35em;font-weight:650}
header.site{display:flex;align-items:center;gap:10px;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #17212b}
header.site .brand{font-weight:700;font-size:1.15em;letter-spacing:.02em}
h1.title{font-size:2em;line-height:1.25;margin:.1em 0 .35em;font-weight:750}
h2.title{font-size:1.45em;margin:1.1em 0 .45em;font-weight:700}
h3.title{font-size:1.12em;margin:.8em 0 .35em;font-weight:650}
.hero{margin:4px 0 24px}
.hero.fact-hero .fact .val{font-size:2em;font-weight:700}
/* a lead sentence is not a headline: H1-sized prose collapses the page's heading levels */
.hero.fact-hero.hero-prose .fact .val{font-size:1.15em;font-weight:600;line-height:1.7;color:var(--soft-ink)}
article{margin:12px 0}
.timeline{border-left:2px solid #d6dde6;margin-left:8px;padding-left:18px}
.timeline .item{position:relative;padding:6px 0}
.timeline .item::before{content:"";position:absolute;left:-24px;top:14px;width:9px;height:9px;border-radius:50%;background:#17212b}
.cards{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;align-items:start}
.cards.cols-auto{grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}
.cards .item{border:1px solid #e6eaf0;border-radius:10px;padding:12px;margin:0}
.fact{margin:3px 0;max-width:74ch}
.hero .fact,.cards .fact,.cmp-table .fact,.defval .fact{max-width:none}
.fact.was .val{text-decoration:line-through;color:#8493a3;font-weight:400}
.val{overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}
/* label chips need a visible chip body, or the row reads as one bare string of text (round 27) */
.chips .chip-item{display:inline-block;background:var(--soft);border:1px solid var(--line);border-radius:999px;padding:4px 12px;font-size:.9em;line-height:1.5}
/* a sentence member is prose, not a tag: keep it on its own plain line */
.chips-rows{display:block}
.chips-rows .chip-item{display:block;background:none;border:0;border-radius:0;padding:3px 0;font-size:.95em}
.cards .item img,.run .item img,.cards img{width:auto;max-width:100%;height:auto;display:block;border-radius:8px}
/* Compact product media: an upper bound only, never crop or upscale source thumbnails. */
.product-cards img{max-height:160px}
.action-plain{display:inline-block;padding:7px 16px;border:1px solid #c9d3de;border-radius:999px;color:#0b62d0;font-size:.95em;font-weight:600}
.promo{border:1px solid #e3e8ee;background:#f8fafc;border-radius:10px;padding:10px 14px;color:var(--soft-ink);font-weight:600;margin:10px 0}
.promo-image{padding:0;overflow:hidden}
.promo-image img{width:auto;max-width:100%;height:auto;display:block;border-radius:9px}
.meta{display:flex;flex-wrap:wrap;gap:0 6px;color:var(--muted);font-size:.9em;margin-top:2px}
.meta .sep{color:#c2ccd6}
/* 并入价格行的分期时长（U-28）：与承载句同行、弱化如 meta，不再是容器外孤块 */
.fact .installment{color:var(--muted);font-size:.9em}
.fact .installment .sep{color:#c2ccd6}
.prose{max-width:74ch;margin-inline:0}
.prose p{margin:.5em 0;line-height:1.75;max-width:74ch}
/* F-031-§7 图像主导页：满幅图带——仅限声明的 hero/banner（.strip 无修饰类，轴层 facts.hero）。
   轮 58（L-3）：带内图像居中（margin-inline:auto）——窄于视口的 hero 图不再贴左（U-27）。
   内容图带（.band 内的 .strip，image-strip 形态）绝不满幅：居中、压到容器宽（U-20/U-21）。 */
.strip{margin:0;padding:0;width:100vw;margin-left:calc(50% - 50vw);margin-right:calc(50% - 50vw)}
.strip img{width:auto;max-width:100%;height:auto;display:block;margin-inline:auto;border-radius:0}
.band{margin:14px 0}
.band .strip{width:auto;max-width:100%;margin:0 auto}
.band .strip img{border-radius:10px}
.cards .strip,.run .strip,.promo .strip,.cmp-table .strip,.defval .strip,td .strip,.band .strip{width:auto;margin-left:auto;margin-right:auto}
.cards .strip img{border-radius:8px}
/* F-055 无源图片：退化为已抓取的 alt 文本（绝不输出空 src 的 img 标签） */
.img-alt{display:block;color:var(--muted);font-size:.9em;padding:8px 12px;background:#f4f7fa;border-radius:8px}
.promo-image .img-alt{padding:10px 14px;border-radius:0}
main>.node>.strip:first-child,article>.strip{margin-top:0;margin-bottom:0}
/* F-031: 序列区块（不可比内容各自成立） */
.block{margin:18px 0;padding:0 0 6px}
.block>.node{max-width:none}
hr.region{border:0;border-top:1px solid #e3e8ee;margin:22px 0}
/* F-031-§4 控件条 */
.controls{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0;align-items:center}
.controls .action{margin:0}
/* 行内的主 CTA 必须可辨：无抓取目标的动作（.action-plain）在行内也按实心强调
   （无目标不得造真实按钮标签；强调是样式，不是新控件，T-101/F-031-§4） */
.controls .action-plain{margin:0;background:#17212b;color:#fff;border-color:#17212b}
.ctl{display:inline-block;padding:7px 16px;border:1px solid #c9d3de;border-radius:999px;color:#0b62d0;font-size:.95em;text-decoration:none;background:#fff}
/* 时间流文本（弹幕）：行内紧凑流，每条单行省略——不铺成竖排文本墙（§10.5） */
.stream{display:flex;flex-wrap:wrap;gap:6px 10px;margin:8px 0}
.stream-item{max-width:16em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:var(--soft);border-radius:999px;padding:2px 10px;font-size:.85em}
a.ctl{font-weight:600}
a.ctl:hover{background:#f2f7ff}
/* F-031-§3 横向对比表：列=实体 行=属性，不换行可横滚 */
.cmp-scroll{overflow-x:auto;margin:14px 0;border:1px solid #e6eaf0;border-radius:10px}
.cmp-table{border-collapse:collapse;width:100%;font-size:.95em}
.cmp-table th,.cmp-table td{border-bottom:1px solid #eef2f6;padding:10px 12px;vertical-align:top;text-align:left}
.cmp-table th.cmp-row{white-space:nowrap;color:var(--muted);font-weight:600;background:#fafcfe;width:1%;position:sticky;left:0}
.cmp-table th.cmp-col{min-width:210px;font-size:1.02em;color:#13202c}
.cmp-tag{display:inline-block;margin-left:6px;font-size:.78em;color:#0b62d0;background:#eaf3ff;border-radius:999px;padding:1px 8px}
.cmp-price{font-weight:700;margin-top:4px}
.cmp-sub{color:var(--muted);font-size:.92em;margin-top:2px}
.cmp-ctl{margin-top:6px}
/* 纯标签清单：一组等格条目名，读作"一组面板/条目"，不是 1..N 的目录（轮 34 grafana） */
.manifest{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;margin:10px 0}
.manifest-item{border:1px solid #e6eaf0;border-radius:10px;padding:10px 12px;background:#fafcfe;font-weight:600;color:var(--soft-ink);overflow-wrap:anywhere}
.linklist{margin:8px 0;padding-left:1.1em}
.linklist.cols2{columns:2;column-gap:28px}
.linklist.cols3{columns:3;column-gap:24px}
.linklist.cols4{columns:4;column-gap:20px}
.linklist li{margin:5px 0;line-height:1.5}
.seq{margin:8px 0;padding-left:1.5em}
.seq li{margin:4px 0;line-height:1.55}
.chip-item{break-inside:avoid}
.deflist{margin:8px 0}
.deflist.ranked .rank{min-width:1.5em;color:var(--muted);font-weight:700;font-variant-numeric:tabular-nums}
.deflist.ranked .deflabel{font-weight:500}
.defrow{display:flex;gap:14px;padding:7px 0;border-bottom:1px dashed #eef1f5;align-items:flex-start}
.defrow.media-row{display:block}
.defrow.media-row .deflabel{flex:none;min-width:0;margin-bottom:8px}
.defrow.media-row .defval{min-width:0;max-width:100%}
.deflist.media-captions{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,max(280px,calc((100% - 32px)/3))),1fr));gap:16px}
.deflist.media-captions .defrow{display:flex;flex-direction:column;flex-wrap:nowrap;border:0}
.deflist.media-captions img{max-height:360px;width:auto;height:auto}
.deflabel{min-width:130px;font-weight:600}
.deflabel a{color:inherit}
.timeline .defrow{position:relative}
.timeline .defrow::before{content:"";position:absolute;left:-24px;top:14px;width:9px;height:9px;border-radius:50%;background:#17212b}
.defval{color:var(--muted);font-size:.95em;overflow-wrap:anywhere;min-width:100px}
@media(max-width:700px){.defrow.long-label{display:block}.defrow.long-label .deflabel{min-width:0;margin-bottom:4px}.defval{min-width:0}.defval .val{word-break:normal}}
.accordion{margin:8px 0}
details.qa{border-bottom:1px solid #eef1f5;padding:6px 0}
details.qa summary{cursor:pointer;font-weight:600;padding:4px 0}
details.qa .qa-a{padding:6px 0;color:var(--muted);font-size:.95em}
.expose{display:block;margin:8px 0}
.choice{display:inline-flex;gap:6px;align-items:center;margin:0 14px 6px 0;padding:6px 12px;border:1px solid #d6dde6;border-radius:8px}
fieldset.expose{border:1px solid #e6eaf0;border-radius:10px;padding:10px 12px}
/* a few short options must not sit inside a full-width frame with a dead right half:
   the fieldset hugs its content and only wraps when the content itself is wider (round 27) */
fieldset.expose.chipbar{display:inline-block;max-width:100%}
/* 一组标签里有可点条目时，可点的那个必须看得出来（F-031-§4；轮 34，mi15「售后服务政策」
   实测同色无下划线）：轮 57 起并入层2 —— accent + 常显细下划线（上面的 .chips a 规则）。 */
/* D-3: a text input is an inline field so its submit control sits on the same bar */
span.expose.expose-input{display:inline-block;vertical-align:middle;margin:8px 8px 8px 0}
.authentication-page{max-width:440px;margin-inline:auto}
.task-form .expose-input{display:flex;flex-direction:column;align-items:stretch;gap:6px;max-width:360px;width:100%;margin:8px 0}
.task-form .expose-input>.deflabel{min-width:0}
.task-form .expose-input>input{box-sizing:border-box;width:100%;min-width:0}
.task-form .fieldbar{flex-wrap:wrap;justify-content:flex-start}
/* a watermark is not a label: the name stays in the document, read but not shown (F-064) */
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
legend{font-size:.8em;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.expose .hint{display:block;color:var(--muted);font-size:.85em;margin:2px 0 8px}
.choice-extra{color:var(--muted);font-size:.9em;margin-left:4px}
input[type=text],input[type=password]{padding:7px 10px;border:1px solid #d6dde6;border-radius:8px;font:inherit}
.action{display:inline-block;margin:10px 0 0;padding:9px 18px;border-radius:9px;background:#17212b;color:#fff;text-decoration:none;border:0;font:inherit;cursor:pointer}
/* §9: 正文链接是句子的一部分——行内、同字号、仅颜色+下划线（绝不画成按钮）；
   层2 规则在上面的统一块里（accent + 1px 常显下划线）。 */
/* 不放大（round 45 · F-082）：图片按自身自然尺寸显示，容器更窄时才收缩——width:auto
   + max-width:100% 合起来保证 displayed = min(naturalWidth, container)，绝不把 234×176 的
   源缩略图拉到容器宽（旧规则 width:100% 会把封面放大 2~3 倍、发虚并把页面撑到 1.4 万像素）。
   同时保留原比例（不 object-fit:cover），不裁内容；自然宽 ≥ 容器的满幅图仍铺满。 */
img{max-width:100%;width:auto;border-radius:10px;display:block}
/* 同一条「不放大」规则覆盖卡片/条目/正文图：自然宽 ≥ 容器则铺满，否则按自然尺寸居中显示 */
.fact img,.cards img,.cards .item img,.run .item img{width:auto;max-width:100%;height:auto}
.data-scroll{max-width:100%;overflow-x:auto}
.data-scroll table.data{min-width:640px}
.expose table.data{min-width:640px}
fieldset.expose:has(>table.data){min-inline-size:0;min-width:0;width:100%;max-width:100%;overflow-x:auto}
a.option-link{color:var(--accent);text-decoration:underline;text-underline-offset:2px}
table.data{border-collapse:collapse;width:100%;font-size:.92em;margin:10px 0}
table.data th,table.data td{border-bottom:1px solid #e6eaf0;padding:8px 10px;text-align:left;vertical-align:top}
table.data th{color:var(--muted);font-weight:600;background:#f7f9fb}
table.data tr.row-group th{text-align:left;color:var(--soft-ink);font-weight:700;background:var(--soft)}
table.data td.sel,table.data th.sel{width:34px;text-align:center}
.chip{display:inline-block;background:var(--soft);border-radius:999px;padding:2px 10px;margin:1px 4px 1px 0;font-size:.85em}
.row-ops{display:flex;flex-direction:column;gap:4px}
.row-ops .action{margin:2px 0;padding:4px 10px;font-size:.85em}
/* 引用/被强调整段（_quote，轮 56 · U-13）：醒目形态=大字+加粗+左侧竖线。视觉上与正文分得开。 */
blockquote.quote{margin:12px 0;padding:4px 0 4px 16px;border-left:4px solid #17212b;max-width:74ch}
blockquote.quote .val{font-size:1.25em;font-weight:700;line-height:1.5;color:#13202c}
/* 字段+提交成组（U-02）：输入与它的提交按钮同一条栏，其余内容在栏后。 */
.fieldbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}
.fieldbar input[type=text],.fieldbar input[type=password]{min-width:220px}
/* 小图集照片墙（轮 56 · U-07）：1 大（跨 2×2）+ N 小，像源站构图。
   轮 58（U-24）：做马赛克就要对齐——每块瓷砖固定正方形（aspect-ratio），图在瓷砖内等比
   contain 居中（绝不放大、不裁内容），大图缩到瓷砖、瓷砖间不再有参差缝隙。 */
.gallery-mosaic{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:auto;gap:6px;margin:14px 0;align-items:stretch}
.gallery-mosaic .strip{width:auto;margin:0;aspect-ratio:1/1;overflow:hidden;display:flex;align-items:center;justify-content:center}
.gallery-mosaic .strip img{width:auto;height:auto;max-width:100%;max-height:100%;margin:auto;border-radius:8px}
.gallery-mosaic .strip:first-child{grid-column:span 2;grid-row:span 2}
/* Local forms inherit their page frame; only declared banner bleed can escape it.
   Reading/product/detail composition sets the parent measure, not each local form. */
.node.w-prose,.node.w-narrow,.node.w-wide{max-width:none;margin-inline:0;width:100%}
.node.w-bleed{max-width:none;width:100vw;margin-left:calc(50% - 50vw);margin-right:calc(50% - 50vw);padding:0 24px}
/* 轮 58（L-6）媒体优先卡片：图与标题永不分家（同一 article）；条目图在题上方（视频/卡片站
   惯例）。轴层 mediaFirstOf 声明，这里用 flex order 画 —— 不拆 DOM，长文条目不受影响。 */
.media-first .node{display:flex;flex-direction:column}
.media-first .node>.fact:has(.val img),.media-first .node>.band{order:-1}
/* 轮 58（L-4）宽层卡片/Feed 集合：轴层声明 cols='auto' ⇒ auto-fill 网格（桌面 2–4 列）。
   阅读型堆叠（长文成员）保持单列。 */
.stack.cols-auto{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;align-items:start;margin:14px 0}
.stack.cols-auto .block{margin:0}
.cards.compact-media,.stack.compact-media{grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr))}
.stack.cols-auto hr.region{display:none}
/* 轮 58（L-5）footer 反色（惯例）：模型声明的 footer 区域（.g-footer）深底浅字，
   负 margin 铺满容器内宽、底边贴住容器。无 footer 区域的页自然没有这条带。 */
/* Surfaces own foreground AND background tokens. A footer is secondary site information,
   not automatically a dark hero. Match the captured light, compact utility region. */
.group.g-footer{--surface:#f5f5f7;--ink:#30343b;--muted:#536171;--soft:#e8eaee;--soft-ink:#30343b;--line:#d5d8df;background:var(--surface);color:var(--ink);margin:32px -24px 0;padding:24px}
.group.g-footer .node,.group.g-footer .block{margin:0;padding:0}
.group.g-footer .stack{display:flex;flex-wrap:wrap;gap:14px 24px}
.group.g-footer .stack>.block{flex:1 1 250px}
.group.g-footer .stack>.block:first-child{flex-basis:100%}
.group.g-footer .linklist{columns:auto;display:flex;flex-wrap:wrap;gap:6px 18px;padding:0;margin:0}
.group.g-footer .linklist li{list-style:none;margin:0;font-size:13px;line-height:1.65}
.group.g-footer .seq{display:flex;flex-wrap:wrap;gap:4px 16px;margin:0;padding:0}
.group.g-footer .seq li{list-style:none;margin:0;font-size:12px;line-height:1.6}
.group.g-footer .stack>.block:has(.seq),.group.g-footer .stack>.block:has(.chips-rows){flex-basis:100%;padding-top:12px;border-top:1px solid var(--line)}
.group.g-footer .linklist li.go::marker{content:""}
.group.g-footer .chips{display:flex;flex-wrap:wrap;gap:6px 14px;margin:0}
.group.g-footer .chip-item{padding:0;border:0;background:transparent;border-radius:0;font-size:13px;color:var(--ink)}
.group.g-footer .title,.group.g-footer a,.group.g-footer .linklist li.go>a,.group.g-footer .chips a{color:var(--ink)}
.group.g-footer .defval,.group.g-footer .fact,.group.g-footer .meta{color:var(--muted)}
.group.g-footer .ctl{border-color:var(--line);color:var(--ink);background:var(--surface);padding:4px 10px}
.group.g-footer a.ctl:hover{background:var(--soft)}
.group.g-footer .defrow{border-bottom-color:var(--line)}
/* Reading pages inherit ONE column. Local forms never reset its width or left edge. */
.reading-page{--reading-width:800px;max-width:var(--reading-width);margin-inline:auto}
.reading-page>.title,.reading-page>.band,.reading-page>.meta,.reading-page>.controls,.reading-page>.stack{max-width:var(--reading-width);margin-inline:auto}
.reading-page .node.w-prose,.reading-page .node.w-narrow,.reading-page .node.w-wide{max-width:none;width:100%;margin-inline:0}
.reading-page .fact,.reading-page .prose,.reading-page .prose p,.reading-page .quote{max-width:none}
.reading-page .fact img{margin-inline:auto}
.reading-page .defrow{display:block;padding:16px 0}
.reading-page .deflabel{margin-bottom:6px}
.reading-page .defval{font-size:1em;line-height:1.75}
.reading-page .cards:not(:has(img)){display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center}
.reading-page .cards:not(:has(img))>.item{border:0;padding:0}
.reading-page .cards:not(:has(img)) .node{margin:0}
.reading-page .cards:not(:has(img)) .action{margin:0;border-radius:999px;padding:5px 14px;background:var(--soft);color:var(--soft-ink)}
/* Label-only destination groups are navigation, not a vertical sitemap. */
.utility-group>.chips-rows{display:flex;flex-wrap:wrap}
.utility-group>.chips-rows .chip-item{display:inline-block;padding:3px 8px}
.stack>.block:has(>.utility-group){margin-block:8px;padding:0}
.utility-group{margin-block:4px}
.node.w-narrow:has(>.linklist),.node.w-narrow:has(>.chips){max-width:none}
.linklist.cols2,.linklist.cols3,.linklist.cols4{columns:auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:3px 18px}
.header-bar .linklist.cols2,.header-bar .linklist.cols3,.header-bar .linklist.cols4{display:flex;grid-template-columns:none}
.node:has(>.chips)>.chips{gap:6px 12px}
/* Related sections inherit the page frame; long fact lines keep their reading measure. */
.depth-0>.meta{margin-inline:0}
.utility-facts>.stack>.block{margin:4px 0;padding:0}
.utility-facts>.stack>.block>.node{margin:0}
.utility-facts .title{font-size:1em;margin:4px 0}
.utility-group>.stack{display:flex;flex-wrap:wrap;gap:8px 24px}
.utility-group>.stack>.block{margin:0;padding:0}
.utility-group>.stack>.block>.node{margin:0}
.utility-group>.deflist{display:flex;flex-wrap:wrap;gap:8px 24px}
.utility-group>.deflist>.defrow{border:0;padding:0}
/* Shared structural compact forms: singleton catalog entries, ordered editorial media, boolean utilities. */
.singleton-card>.stack{max-width:320px}
.singleton-card>.stack>.block>.node.banner{display:flex;flex-direction:column;align-items:flex-start;padding:0}
.singleton-card .banner>.title{font-size:1.12em;text-align:left;order:1;margin:8px 0}
.singleton-card .banner>.band{order:0;margin:0;max-width:320px}
.singleton-card .banner>.band .strip{margin:0}
.singleton-card .banner>.controls,.singleton-card .banner>.action{order:2;margin:8px 0}
.singleton-card .banner img{max-width:100%;max-height:320px;width:auto;height:auto}
.boolean-utilities>.stack{display:flex;flex-wrap:wrap;gap:8px 16px}
.boolean-utilities>.stack>.block,.boolean-utilities>.stack>.block>.node{margin:0;padding:0}
.boolean-utilities>.group:has(>.node>label.choice>input[type=checkbox]){display:inline-block;margin:4px 16px 4px 0}
.boolean-utilities>.group:has(>.node>label.choice>input[type=checkbox])>.node{margin:0;padding:0}
.ordered-media-rows>.stack>.block{margin:12px 0;padding:12px 0;border-bottom:1px solid var(--line)}
.ordered-media-rows>.stack>.block>.node{display:grid;grid-template-columns:minmax(0,1fr) 120px;gap:4px 20px;margin:0;padding:0}
.ordered-media-rows>.stack>.block>.node>*{grid-column:1;margin:0}
.ordered-media-rows>.stack>.block>.node>.band{grid-column:2;grid-row:1 / span 5;margin:0;align-self:start}
.ordered-media-rows .band .strip{margin:0;width:auto}
.ordered-media-rows .band img{max-width:120px;max-height:120px;width:auto;height:auto}
@media(max-width:600px){.ordered-media-rows>.stack>.block>.node{grid-template-columns:minmax(0,1fr) 96px;gap:4px 12px}.ordered-media-rows .band img{max-width:96px;max-height:96px}}
/* Whole-page alignment: local lists, facts and cards inherit the same page frame. */
.catalog-page .node.w-prose,.catalog-page .node.w-narrow,.catalog-page .node.w-wide{max-width:none;margin-inline:0;width:100%}
.catalog-page>.stack>.block{margin:14px 0}
.catalog-page .depth-1>.fact{max-width:none}
.catalog-page>.stack>.block:has(>.node>.deflist) .deflist{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}
.catalog-page>.stack>.block:has(>.node>.deflist) .defrow{display:block;padding:16px;background:#f6f7f9;border:1px solid var(--line);border-radius:12px}
.catalog-page .deflabel{margin-bottom:8px}
.catalog-page .depth-1:not(:has(>.fieldbar))>.stack:not(.cols-auto){display:grid;grid-template-columns:repeat(auto-fit,minmax(min(250px,100%),1fr));gap:14px}
.catalog-page .depth-1:not(:has(>.fieldbar))>.stack:not(.cols-auto)>.block{margin:0;padding:0}
.catalog-page .depth-1:not(:has(>.fieldbar))>.stack:not(.cols-auto)>.block>.node{margin:0;padding:16px;border:1px solid var(--line);border-radius:12px;background:#fafbfc}
.catalog-page .depth-1:not(:has(>.fieldbar))>.stack:not(.cols-auto)>hr{display:none}
.product-page{max-width:960px;margin-inline:auto}
.product-page .node.w-prose,.product-page .node.w-narrow,.product-page .node.w-wide{max-width:none;width:100%;margin-inline:0}
.product-page .fact,.product-page .prose,.product-page .prose p{max-width:none}
.product-page .fact img{margin-inline:auto}
.product-page>.meta{margin-inline:0}
.product-page>.stack>.block{margin-block:32px}
.product-page .defrow{gap:24px}
.product-page .deflabel{flex:0 0 190px;min-width:0}
.product-page .media-captions .deflabel{flex:0 0 auto}
.detail-page>.title{max-width:none;margin-inline:0}
.detail-page>.fact{max-width:none}
.detail-page .node.w-prose,.detail-page .node.w-narrow,.detail-page .node.w-wide{max-width:none;margin-inline:0;width:100%}
.detail-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:56px;align-items:start;margin-top:24px}
.detail-main,.detail-task{min-width:0}
.detail-main>.group{padding-bottom:20px;margin-bottom:20px;border-bottom:1px solid var(--line)}
.detail-main .fact,.detail-main .prose{max-width:none}
.detail-task{padding:20px 24px;border:1px solid var(--line);border-radius:16px;box-shadow:0 6px 24px #17212b10}
.detail-task .group{margin:12px 0}
.detail-task input{max-width:100%}
.detail-tail{margin-top:28px;padding-top:20px;border-top:1px solid var(--line)}
.detail-tail .g-distribution .chips-rows{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}
.detail-tail .g-distribution .chip-item{padding:8px 12px;border-radius:8px;background:var(--soft)}
.detail-tail .g-aspects .deflist{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:4px 24px}
.detail-tail .g-reviews>.node{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 32px}
.detail-tail .g-reviews>.node>*{min-width:0}
.detail-tail .g-reviews>.node>.title,.detail-tail .g-reviews>.node>.controls,.detail-tail .g-reviews>.node>.g-distribution,.detail-tail .g-reviews>.node>.g-aspects{grid-column:1/-1}
.detail-tail .g-aspects .cmp-table th.cmp-col{min-width:120px}
.detail-tail .g-reviews>.node>.g-mentions{grid-column:1/-1}
.detail-tail .g-mentions .deflist{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:4px 24px}
.detail-tail .g-mentions .defrow{justify-content:space-between}
.detail-page .gallery-mosaic{grid-auto-rows:180px;grid-template-columns:2fr 1fr 1fr}
.detail-page .gallery-mosaic .strip{aspect-ratio:auto}
.detail-page .gallery-mosaic .strip:first-child{grid-column:span 1;grid-row:span 2}
main:has(.marketing-page){max-width:1728px}
.marketing-page>.title{max-width:none}
.marketing-page .node.w-bleed{width:100%;margin-inline:0}
.marketing-page .node.w-narrow,.marketing-page .node.w-wide{max-width:none;width:100%;margin-inline:0}
.marketing-page .cards.cols-auto{grid-template-columns:repeat(2,minmax(0,1fr))}
.marketing-page .cards.cols-auto .item{padding:20px;border-radius:12px;background:#f5f5f7}
.marketing-page .cards.cols-auto .title{text-align:center;font-size:26px}
.marketing-page .cards.cols-auto .fact{max-width:none;text-align:center}
.marketing-page .cards.cols-auto .fact img{margin:auto}
.marketing-page .cards.cols-auto .controls{justify-content:center}
.marketing-page .g-tv .cards.cols-auto{grid-template-columns:repeat(3,minmax(0,1fr))}
.marketing-page .g-services .deflist{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}
.marketing-page .g-services .defrow{display:flex;flex-direction:column;gap:8px;padding:16px;border:1px solid var(--line);border-radius:12px}
.marketing-page .g-services .defval img{max-height:180px;margin:auto}
@media(min-width:1920px){body:has(.marketing-page){background:#f5f5f7}main:has(.marketing-page){max-width:1728px;padding-inline:24px}.marketing-page>.stack>.block{margin-block:16px}}
@media(max-width:900px){.detail-layout{grid-template-columns:minmax(0,1fr);gap:20px}.detail-tail .g-reviews>.node{grid-template-columns:minmax(0,1fr)}.marketing-page .g-tv .cards.cols-auto{grid-template-columns:1fr}.detail-page .gallery-mosaic{grid-auto-rows:130px;grid-template-columns:repeat(2,minmax(0,1fr))}.detail-page .gallery-mosaic .strip:first-child{grid-column:span 2;grid-row:auto}.marketing-page .cards.cols-auto{grid-template-columns:1fr}.product-page .defrow{flex-wrap:wrap}.product-page .deflabel{flex-basis:100%}}
/* Media surface metadata keeps marketing image and text in the same panel. The
   original image is centered at natural height; only uniform lateral gutters clip. */
.banner-integrated{position:relative;isolation:isolate;overflow:hidden;min-height:580px;padding:32px 24px!important;background:var(--banner-bg);color:var(--banner-fg);display:flex;flex-direction:column;align-items:center;margin-block:12px}
.banner-integrated>.strip{position:absolute;inset:0;width:100%;height:580px;margin:0;z-index:-1;display:flex;justify-content:center}
.banner-integrated>.strip img{flex:none;max-width:none;width:auto;height:auto;align-self:flex-start;margin:0;border-radius:0}
.banner-integrated>.title{font-size:48px;line-height:1.1;margin:8px 0}
.banner-integrated>.fact{font-size:22px;max-width:640px;line-height:1.35;margin:4px 0}
.banner-integrated>.controls{margin:16px 0}
.banner-integrated .ctl{background:transparent;color:#2997ff;border-color:#2997ff;border-radius:999px}
.banner-integrated .action{background:#0071e3;color:#fff;border-radius:999px}
.banner-integrated.media-centered>.fact:first-of-type{margin-top:auto}
.banner-integrated.media-centered>.controls{margin-bottom:0}
@media(max-width:700px){main{padding:20px 16px 0}.group.g-footer{margin-inline:-16px;padding:20px 16px}.banner-integrated{min-height:540px}.banner-integrated>.title{font-size:34px}.banner-integrated>.strip{height:540px}.banner-integrated>.strip img{width:auto;max-width:min(calc(var(--media-width)*.7),calc((100vw - 48px) * var(--media-ratio)));height:auto;object-fit:contain;align-self:flex-start;margin-top:160px}.banner-integrated>.fact{font-size:18px}.banner-integrated.media-centered>.strip img{margin-top:45px}.gallery-mosaic{grid-template-columns:repeat(2,1fr)}.gallery-mosaic .strip:first-child{grid-column:span 2;grid-row:auto}.stack.cols-auto,.cards{grid-template-columns:repeat(auto-fill,minmax(min(240px,100%),1fr))}}
</style></head>
<body><main>${brand ? `<header class="site"><span class="brand">${brand}</span></header>` : ''}${html}</main></body></html>
`;
}

// Same render, plus the explicit compare-degradation list (D2). The HTML of
// render(model, ctx) is unchanged: the audit only observes what the renderer did.
export function renderWithAudit(model, context = {}) {
  const degradations = [];
  const html = render(model, context, degradations);
  return { html, degradations };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [inp, out] = process.argv.slice(2);
  if (!inp) { console.error('usage: node m1/render.mjs <model.json> [out.html]'); process.exit(2); }
  // 站点 accent 按模型路径解析（m1/curated/<site>/<page>.json ⇒ <site>），查 m1/brand-tokens.json。
  const site = inp.split('/').filter(Boolean).at(-2);
  const html = render(JSON.parse(fs.readFileSync(inp, 'utf8')), { site });
  // An idempotent write keeps the file's mtime honest: the evidence-consistency gate
  // (`pipeline --check-shots`) reads mtime as "was the HTML rewritten after its PNG?",
  // so a byte-identical rerender must not bump it (otherwise every default pipeline run
  // would look like a stale screenshot).
  if (out) writeIfChanged(out, html); else process.stdout.write(html);
}

function writeIfChanged(file, content) {
  try { if (fs.readFileSync(file, 'utf8') === content) return false; } catch { /* not there yet */ }
  fs.writeFileSync(file, content);
  return true;
}