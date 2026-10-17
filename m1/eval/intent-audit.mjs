// 意图门禁：声明 → 兑现（docs/m1/composition.md §5 的可执行形态，工作包 S1a）。
//
// 本文件只读引擎产物，不改引擎：它把「引擎对每页原型的声明」与「渲染/计算样式实际兑现的东西」
// 逐页对账，四类检查按后果分两档（严重度口径见 docs/m1/composition.md §5）：
//   错误（阻断，决定退出码）
//   a) 未定构图   —— 页面原型解析不出或回落 `default`（= 引擎错误，不是「普通页」）；
//                    以及原型解析出、但渲染 HTML 没有带上对应的 `<kind>-page` 类。
//   c) 死声明     —— 同一元素上永远不可能生效的重复声明：低者那句在整个语料上永远赢不了
//                    （高者覆盖同一主体、同一属性、同一媒体上下文，且约束不比它宽）。基础 + 特化
//                    （高者多一个祖先或类）是合法的上下文覆盖，不报。
//   d) 运行时覆盖 —— 真浏览器里 `.gallery-mosaic .strip` 的计算宽高比偏离 1 超过 0.12
//                    （`aspect-ratio:1/1` 被 align-items:stretch 撑掉了），1280 与 700 两个视口各跑一遍。
//   警告（打印，不阻断）
//   b) 死选择器   —— 引擎 CSS 里的结构类名在冻结语料上一次都没打出来。语料不必行使每个引擎能力
//                    （促销条、手风琴、问答、分期、排行…），把「未被语料行使」当阻断会逼人删掉合法
//                    能力；死代码只作可见警告。`--strict-dead` 可把它提升为阻断（将来的清理用）。
// 计数口径：同一页上的同一缺陷只在最有力的一类里计一次（c 与 d 的 aspect-ratio 同源），
// 所以汇总总数是「去重后的不同发现」之和，不是各节行数的简单相加。
// 依赖：Playwright（AUTOFE_CHROME_PATH / AUTOFE_PLAYWRIGHT_CORE，回退同 audit-visual.mjs）。
// 用法: node m1/eval/intent-audit.mjs [--strict-dead]
//   退出码 0 = 无阻断错误（只有警告也算 0），1 = 有阻断错误，2 = 环境缺失
//   --strict-dead: 死选择器由警告提升为阻断（默认关闭；开着时警告也判 1）。
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { pageLayoutOf, isImageOnlyItem } from '../axis.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const RENDER_SRC = path.join(ROOT, 'm1/render.mjs');
const REGISTRY = path.join(ROOT, 'm1/eval/m3-final.json');
const RENDER_DIR = path.join(ROOT, 'm1/curated/renders');
const renderPathOf = (k) => path.join(RENDER_DIR, k.replace(/\//g, '-') + '.html');
const modelPathOf = (k) => path.join(ROOT, 'm1/curated', k + '.json');

// ---------------------------------------------------------------- CSS 解析
// 引擎 CSS 是 render.mjs 里的 `<style>` 模板串。单点截取，避免把 JS 代码里的类名当选择器。
// 无参 = 直接读引擎本体（门禁与自测都由此出发）；带参用于合成夹具。
export function engineCss(src = fs.readFileSync(RENDER_SRC, 'utf8')) {
  const m = /<style>([\s\S]*?)<\/style>/.exec(src);
  if (!m) throw new Error('m1/render.mjs 里找不到 <style> 块');
  // 注释只是说明，不是声明；`${...}` 是构建期插值，比较前必须保留标记（值不可静态判定）。
  return m[1].replace(/\/\*[\s\S]*?\*\//g, '');
}

function splitTop(text, separator) {
  const out = [];
  let depth = 0, buf = '';
  for (const ch of text) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    if (ch === separator && depth === 0) { out.push(buf); buf = ''; continue; }
    buf += ch;
  }
  out.push(buf);
  return out;
}

function parseDecls(body) {
  const out = [];
  for (const raw of splitTop(body, ';')) {
    const at = raw.indexOf(':');
    if (at < 0) continue;
    const prop = raw.slice(0, at).trim();
    let value = raw.slice(at + 1).trim();
    if (!prop || !value) continue;
    const important = /!important\s*$/i.test(value);
    if (important) value = value.replace(/!important\s*$/i, '').trim();
    out.push({ prop, value, important, dynamic: value.includes('${') });
  }
  return out;
}

// 花括号配平扫描：顶层块是规则，`@media/@supports` 递归进内部并把 at-rule 作为媒体键。
// （「按 `}` 切」只在规则全平铺时成立；本文件 CSS 有 @media 块，必须递归。）
export function parseCss(css) {
  const rules = [];
  (function walk(text, media) {
    let depth = 0, prelude = '', bodyStart = -1, preludeStart = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '{') {
        if (depth === 0) { prelude = text.slice(preludeStart, i).trim(); bodyStart = i + 1; }
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth !== 0) continue;
        const body = text.slice(bodyStart, i);
        if (prelude.startsWith('@')) {
          if (/^@(media|supports)\b/i.test(prelude)) walk(body, prelude);
        } else if (prelude) {
          for (const selector of splitTop(prelude, ',')) {
            const sel = selector.trim();
            if (!sel) continue;
            rules.push({ selector: sel, media, decls: parseDecls(body), order: rules.length });
          }
        }
        preludeStart = i + 1;
      }
    }
  })(css, null);
  return rules;
}

// 选择器链：从主体元素（最右）向根方向展开，每节带「与右侧元素的关系」。
function parseComplex(selector) {
  const parts = [];
  let buf = '', comb = null, depth = 0;
  const flush = () => {
    if (!buf.trim()) return;
    parts.push({ comb: parts.length ? (comb ?? ' ') : null, compound: parseCompound(buf.trim()) });
    buf = '';
    comb = null;
  };
  for (const ch of selector) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    if (depth === 0 && (ch === '>' || ch === '+' || ch === '~' || /\s/.test(ch))) {
      flush();
      if (ch !== ' ') comb = ch;
      else if (comb === null) comb = ' ';
      continue;
    }
    buf += ch;
  }
  flush();
  // parts 是左→右（根→主体）；反转后 chain[0] 是主体，每节 comb 描述它与其祖先（右邻）的关系。
  return parts.reverse();
}

function parseCompound(text) {
  const compound = { type: null, classes: new Set(), ids: new Set(), pseudos: [], attrs: [], raw: text };
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '.' || ch === '#') {
      const re = /[-\w\\]+/y;
      re.lastIndex = i + 1;
      const m = re.exec(text);
      if (!m) { i++; continue; }
      if (ch === '.') compound.classes.add(m[0]); else compound.ids.add(m[0]);
      i = re.lastIndex;
    } else if (ch === '[') {
      const close = text.indexOf(']', i);
      const end = close < 0 ? text.length : close;
      compound.attrs.push(text.slice(i, end + 1));
      i = end + 1;
    } else if (ch === ':') {
      const re = /[-\w]+/y;
      re.lastIndex = i + (text[i + 1] === ':' ? 2 : 1);
      const m = re.exec(text);
      if (!m) { i++; continue; }
      let end = re.lastIndex;
      if (text[end] === '(') {
        let depth = 0;
        for (; end < text.length; end++) {
          if (text[end] === '(') depth++;
          else if (text[end] === ')' && --depth === 0) { end++; break; }
        }
      }
      compound.pseudos.push(text.slice(i, end));
      i = end;
    } else if (ch === '*') {
      compound.type = '*';
      i++;
    } else if (/[-\w]/.test(ch)) {
      const re = /[-\w]+/y;
      re.lastIndex = i;
      const m = re.exec(text);
      compound.type = m[0];
      i = re.lastIndex;
    } else i++;
  }
  return compound;
}

const specificityOf = (chain) => chain.reduce((s, part) => {
  const c = part.compound;
  s.a += c.ids.size;
  s.b += c.classes.size + c.attrs.length + c.pseudos.filter((p) => !p.startsWith('::')).length;
  s.c += (c.type && c.type !== '*' ? 1 : 0) + c.pseudos.filter((p) => p.startsWith('::')).length;
  return s;
}, { a: 0, b: 0, c: 0 });

// ---------------------------------------------------------------- 死声明判定
// 选择器里出现的类名（用于与「语料真的打出过的类名」求交）。
function classTokensOf(selector) {
  const out = [];
  for (const m of selector.matchAll(/\.((?:[-\w]|\\.)+)/g)) out.push(m[1].replace(/\\/g, ''));
  return out;
}
// 一条规则能不能命中语料里的任何元素：它引用的每个类名都必须被某页打过。
const matchableIn = (selector, emitted) => classTokensOf(selector).every((c) => emitted.has(c));

// winner 的一节是否只要求 loser 同一位置那一节已经要求的东西（关系符相同）。
function sectionCovers(loserSection, winnerSection) {
  if (winnerSection.comb !== loserSection.comb) return false;
  const l = loserSection.compound, w = winnerSection.compound;
  if (w.type && w.type !== '*' && w.type !== l.type) return false;
  for (const c of w.classes) if (!l.classes.has(c)) return false;
  for (const id of w.ids) if (!l.ids.has(id)) return false;
  for (const a of w.attrs) if (!l.attrs.includes(a)) return false;
  for (const p of w.pseudos) if (!l.pseudos.includes(p)) return false;
  return true;
}

// 死声明的充分条件：命中 loser 的每个元素都也命中 winner（winner 的约束是 loser 的超集）。
// 从主体向根逐节对齐：winner 不得有更多节（多一节祖先 = 命中的元素更少 = 特化，loser 在别处
// 仍然生效），且每一节的要求都被 loser 同一位置的节包含（类/ID/属性/伪类集合包含、关系符相同）。
// 例：`.linklist{margin:8px 0}` vs `.group.g-footer .linklist{margin:0}` → winner 多一节祖先，
// 不是死声明（不在页脚里的 .linklist 仍然是 8px）；`.fx-twin{4px}` vs `.fx-twin{8px}` → 死声明。
// 限度：祖先只能在「同一位置」对齐，因此跨层跳过的覆盖（`.a .c` 压掉 `.a .b .c`）会漏报而不会误报。
export function subsumes(loser, winner) {
  if (winner.length > loser.length) return false;
  for (let i = 0; i < winner.length; i++) if (!sectionCovers(loser[i], winner[i])) return false;
  return true;
}

// 主体键 = 决定「命中的是哪个元素」的那一节：类型 + 类集合 + 伪类/伪元素。
// 伪类和伪元素进键，状态规则（`:hover`/`:first-child`）因此不会与基础声明互相判为覆盖。
const subjectKeyOf = (compound) => [
  compound.type ?? '',
  [...compound.classes].sort().join('.'),
  [...compound.ids].sort().join('#'),
  [...compound.attrs].sort().join(''),
  compound.pseudos.join(''),
].join('|');

const canonValue = (value) => value.replace(/\s+/g, ' ').trim().toLowerCase();
const priority = (e) => [e.important ? 1 : 0, e.spec.a, e.spec.b, e.spec.c, e.order];

function cmpPriority(x, y) {
  const a = priority(x), b = priority(y);
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

// 静态级联：只报死声明，不报「同属性不同值」本身（后者绝大多数是合法的上下文覆盖）。
// 三条同时成立才报：(i) 同一媒体上下文 + 同一属性（分组键）；(ii) subsumes(低者, 高者)，
// 且高者优先级更高（同权重看后置序，或 !important）；(iii) 两条规则引用的类名都在
// emitted 语料里真的出现过 —— 命不中的规则压不掉任何东西。
// emitted: Set<string>，冻结语料里实际打出的类名（不传会立刻失败，不静默放开）。
export function cascadeConflicts(rules, emitted) {
  const groups = new Map();
  for (const rule of rules) {
    if (!matchableIn(rule.selector, emitted)) continue; // (iii) 命不中的规则不参与
    const chain = parseComplex(rule.selector);
    if (!chain.length) continue;
    const spec = specificityOf(chain);
    const subject = subjectKeyOf(chain[0].compound);
    for (const decl of rule.decls) {
      if (decl.dynamic) continue; // 构建期插值的值不可静态比较，不参与判定（不猜）
      const key = `${rule.media ?? ''}|${subject}|${decl.prop}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({
        value: decl.value, canon: canonValue(decl.value), important: decl.important,
        spec, order: rule.order, selector: rule.selector, chain, media: rule.media, subject,
        property: decl.prop, subjectRaw: chain[0].compound.raw,
      });
    }
  }
  const out = [];
  for (const entries of groups.values()) {
    if (new Set(entries.map((e) => e.canon)).size < 2) continue;
    const ascending = [...entries].sort(cmpPriority);
    const seen = new Set();
    for (const dead of ascending) {
      const over = entries
        .filter((w) => w.canon !== dead.canon && cmpPriority(w, dead) > 0 && subsumes(dead.chain, w.chain))
        .sort(cmpPriority);
      if (!over.length) continue;
      const win = over[over.length - 1];
      const pair = `${dead.canon}->${win.canon}`;
      if (seen.has(pair)) continue;
      seen.add(pair);
      out.push({
        property: dead.property,
        subject: dead.subjectRaw,
        media: dead.media,
        struckClasses: classTokensOf(dead.selector),
        struckValue: dead.value, struckSelector: dead.selector,
        winningValue: win.value, winningSelector: win.selector,
      });
    }
  }
  return out;
}

// 引擎 CSS 里定义过的页种类选择器（`<something>-page`）。自测用它证明选择器发现真的跑通了
// （正则一坏就返回空表，整节“无违规”就不再是证据）；门禁输出用它标注页种类行。
export function pageKindClasses(rules) {
  const found = new Set();
  for (const rule of rules) {
    for (const m of rule.selector.matchAll(/\.([a-z][a-z0-9-]*-page)\b/g)) found.add(m[1]);
  }
  return [...found].sort();
}

// 渲染里实际打出的类名（样式/脚本体不算 —— CSS 文本本身也写着这些类名）。
export function emittedClasses(html) {
  const body = String(html).replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  const classes = new Set();
  for (const m of body.matchAll(/\bclass="([^"]*)"/g)) {
    for (const c of m[1].split(/\s+/)) if (c) classes.add(c);
  }
  return classes;
}

// ------------------------------------------------------- a) 未定构图 / 类兑现
// pages: [{ k, kind, emitted:Set<string> }]
export function compositionViolations(pages) {
  const out = [];
  for (const p of pages) {
    if (p.kind === 'default') {
      out.push({ k: p.k, class: 'undetermined', kind: p.kind, detail: '页面原型未解析（回落 default）' });
      continue;
    }
    const expected = p.kind === 'reading' ? 'reading-page' : `${p.kind}-page`;
    if (!p.emitted.has(expected)) {
      out.push({ k: p.k, class: 'class-missing', kind: p.kind, detail: `原型 ${p.kind} 未在渲染上打 ${expected} 类` });
    }
  }
  return out;
}

// ------------------------------------------------------------- b) 死选择器
// 引擎 CSS 引用了、但整个冻结语料一次都没打出的结构类名（页种类与普通类一视同仁）：
// 写了不生效的 CSS 是缺陷，不是无害冗余（composition.md §5-2）。每条规则报它自己的选择器。
// emitCount: 类名 → 打出它的页数。同一条选择器在多个媒体上下文里重复声明仍算一条
// （它处处 0 命中，“不生效”不因媒体分支而变）。
export function deadSelectors(rules, emitCount) {
  const out = [], seen = new Set();
  for (const rule of rules) {
    if (seen.has(rule.selector)) continue;
    const dead = [...new Set(classTokensOf(rule.selector))].filter((c) => !(emitCount[c] > 0));
    if (!dead.length) continue;
    seen.add(rule.selector);
    out.push({ selector: rule.selector, classes: dead, emissions: 0 });
  }
  return out;
}

// --------------------------------------------------------- d) 运行时覆盖
// 容差 0.12：声明为正方形的瓷砖（aspect-ratio:1/1）实测 |w/h-1| = 0（1280/700 两视口，DOM 取整误差
// 在 1e-3 量级），而 §6 的真实缺陷（grid-auto-rows 钉住行高 + aspect-ratio:auto）实测
// 0.69（airbnb @1280，305×180）与 4.14（@700，668×130）。0.12 落在一个数量级的空档里：
// 比取整噪声高两个数量级，又比缺陷幅度小一个数量级。
const MOSAIC_ASPECT_TOLERANCE = 0.12;
// 两个视口：1280 走基础声明，700 会触发引擎 `@media(max-width:900/700px)` 的覆写分支
// （同一个 aspect-ratio 缺陷在两个视口下的幅度不同，实测 0.69 vs 4.14，只跑一个会漏掉或低估）。
export const RUNTIME_VIEWPORTS = [{ width: 1280, height: 900 }, { width: 700, height: 900 }];

// entries: [{ k, url, gallery }]（真实渲染走 file://）或 [{ k, content, gallery }]（自测夹具走 setContent）。
// gallery=true 表示该页模型声明了 3–5 张图的照片墙：那时 0 块瓷砖是「主体缺失」，不是
// 「这页没有马赛克」，不能静默通过；gallery=false 的页不跑这项判定，而是在 skipped 里说明。
// 返回 { findings, skipped }：findings 带 defect（distorted / subject-missing）与测量视口。
export async function runtimeOverrides(page, entries, viewport = RUNTIME_VIEWPORTS[0]) {
  const findings = [], skipped = [];
  await page.setViewportSize(viewport);
  for (const entry of entries) {
    if (entry.content != null) await page.setContent(entry.content);
    else await page.goto('file://' + path.resolve(entry.url));
    const tiles = await page.evaluate(() => [...document.querySelectorAll('.gallery-mosaic .strip')].map((el) => {
      const box = el.getBoundingClientRect();
      return { width: box.width, height: box.height, aspect: getComputedStyle(el).aspectRatio };
    }));
    if (!tiles.length) {
      if (entry.gallery) {
        findings.push({
          k: entry.k, defect: 'subject-missing', viewport: viewport.width, property: 'aspect-ratio',
          detail: '模型声明了照片墙（3–5 张纯图），渲染里没有 .gallery-mosaic .strip 瓷砖',
        });
      } else skipped.push({ k: entry.k, why: '模型未声明照片墙（3–5 张纯图），无马赛克主体可测' });
      continue;
    }
    const bad = tiles
      .filter((t) => t.height > 0)
      .map((t) => ({ ...t, deviation: Math.abs(t.width / t.height - 1) }))
      .filter((t) => t.deviation > MOSAIC_ASPECT_TOLERANCE);
    if (!bad.length) continue;
    const worst = bad.reduce((a, b) => (b.deviation > a.deviation ? b : a));
    findings.push({
      k: entry.k, defect: 'distorted', property: 'aspect-ratio', viewport: viewport.width,
      tiles: tiles.length, offending: bad.length,
      declared: worst.aspect, width: Math.round(worst.width), height: Math.round(worst.height),
      deviation: worst.deviation,
    });
  }
  return { findings, skipped };
}

// ------------------------------------------------- c) 与 d) 的同源去重
// 运行时检查量的就是 `.gallery-mosaic .strip` 的 aspect-ratio。如果某页在静态层已经有一条
// 该属性的死声明（且该页真的打出了那两个类），两项是同一缺陷的两种观测，汇总时只计一次。
// 返回：已被 c) 覆盖的页键集合（这些页的运行时 aspect-ratio 发现不再单独计数）。
export function cascadeCoveredRuntimePages(conflicts, pages) {
  const covered = new Set();
  for (const c of conflicts) {
    if (c.property !== 'aspect-ratio') continue;
    if (!c.struckClasses.includes('gallery-mosaic') || !c.struckClasses.includes('strip')) continue;
    for (const p of pages) if (c.struckClasses.every((cls) => p.emitted.has(cls))) covered.add(p.k);
  }
  return covered;
}

// ------------------------------------------------------- 严重度分流与退出码
// 汇总口径的唯一家：main 用它出结论，自测用它证明「只有警告 → 0」「--strict-dead → 1」。
// 阻断项是线上正确性（构图未定、意图未兑现、声明自相矛盾），死代码只作警告（§5）。
export function gateOutcome({ composition, deadDeclaration, runtime, deadSelectors }, { strictDead = false } = {}) {
  const errors = {
    composition, deadDeclaration, runtime,
    total: composition + deadDeclaration + runtime,
  };
  const warnings = { deadSelectors, total: deadSelectors };
  const blocked = errors.total > 0 || (strictDead && warnings.total > 0);
  return { errors, warnings, strictDead, blocked, exitCode: blocked ? 1 : 0 };
}

// ------------------------------------------------------------------- main
// 模型是否声明了照片墙：3–5 个纯图像成员（render.mjs 的 renderImageStrip 把它们排成 .gallery-mosaic）。
// 复用引擎自己的成员谓词，不在这里重写一份形态规则。
function hasImageGallery(node) {
  if (!node || typeof node !== 'object') return false;
  if (Array.isArray(node)) {
    return node.length >= 3 && node.length <= 5
      && node.every((it) => it && typeof it === 'object' && !Array.isArray(it) && isImageOnlyItem(it));
  }
  return Object.values(node).some(hasImageGallery);
}

export function loadPages() {
  const rows = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
  return rows.map((r) => {
    const html = fs.readFileSync(renderPathOf(r.k), 'utf8');
    const model = JSON.parse(fs.readFileSync(modelPathOf(r.k), 'utf8'));
    return { k: r.k, kind: pageLayoutOf(model).kind, emitted: emittedClasses(html), gallery: hasImageGallery(model), html };
  });
}

async function main() {
  const strictDead = process.argv.includes('--strict-dead');
  const require = createRequire(import.meta.url);
  const PW = process.env.AUTOFE_PLAYWRIGHT_CORE || (process.env.HOME + '/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core');
  const CHROME = process.env.AUTOFE_CHROME_PATH || (process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell');

  const rules = parseCss(engineCss());
  const pages = loadPages();

  const comp = compositionViolations(pages);
  const emitCount = {};
  for (const p of pages) for (const c of p.emitted) emitCount[c] = (emitCount[c] ?? 0) + 1;
  const emitted = new Set(Object.keys(emitCount));
  const kindClasses = new Set(pageKindClasses(rules));
  const dead = deadSelectors(rules, emitCount);
  const conflicts = cascadeConflicts(rules, emitted);

  let budget;
  try {
    const { chromium } = require(PW);
    budget = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  } catch (e) {
    console.error(`意图门禁: 无法启动浏览器（${String(e.message).split('\n')[0]}）—— 运行时检查未执行，不能判通过`);
    return 2;
  }
  // 两个视口、同一批页：同一页同一缺陷只在最差的那个视口上报一次（否则 @media 会把同一缺陷数两遍）。
  const runtime = new Map();
  const runtimeSkipped = [];
  const pageRuntime = await budget.newPage({ viewport: RUNTIME_VIEWPORTS[0] });
  try {
    for (const viewport of RUNTIME_VIEWPORTS) {
      const run = await runtimeOverrides(pageRuntime, pages.map((p) => ({ k: p.k, url: renderPathOf(p.k), gallery: p.gallery })), viewport);
      for (const f of run.findings) {
        const key = `${f.k}|${f.defect}`;
        const prev = runtime.get(key);
        if (!prev) runtime.set(key, { ...f, viewports: [viewport.width] });
        else {
          prev.viewports.push(viewport.width);
          if (f.defect === 'distorted' && f.deviation > prev.deviation) {
            Object.assign(prev, { deviation: f.deviation, viewport: f.viewport, width: f.width, height: f.height, declared: f.declared, offending: f.offending });
          }
        }
      }
      for (const s of run.skipped) if (!runtimeSkipped.some((x) => x.k === s.k)) runtimeSkipped.push(s);
    }
  } finally {
    await budget.close();
  }
  const runtimeRows = [...runtime.values()].sort((a, b) => (a.k < b.k ? -1 : 1));

  // 同页同缺陷只计一次（见 cascadeCoveredRuntimePages）。
  const coveredByCascade = cascadeCoveredRuntimePages(conflicts, pages);
  const deduped = runtimeRows.filter((f) => f.defect === 'distorted' && coveredByCascade.has(f.k));
  const runtimeDistinct = runtimeRows.length - deduped.length;

  // ---- 逐页违规表（只列有违规的页）
  const byPage = new Map();
  for (const v of comp) {
    if (!byPage.has(v.k)) byPage.set(v.k, []);
    byPage.get(v.k).push(v.class === 'class-missing' ? `缺类:${v.kind}->${v.kind}-page` : '未定构图:default');
  }
  for (const v of runtimeRows) {
    if (!byPage.has(v.k)) byPage.set(v.k, []);
    const at = v.viewports.length > 1 ? `@${v.viewport}px（${v.viewports.join('/')} 均越界）` : `@${v.viewport}px`;
    byPage.get(v.k).push(v.defect === 'subject-missing'
      ? `主体缺失${at}:${v.detail}`
      : `运行时覆盖:aspect-ratio ${v.declared} ${v.width}×${v.height} 偏差 ${v.deviation.toFixed(2)}${at}${deduped.includes(v) ? '（与死声明同源，只计一次）' : ''}`);
  }
  const wide = Math.max(...[...byPage.keys()].map((k) => k.length), 8);
  console.log(`\n页面级错误（${byPage.size}/${pages.length} 页有错误）:`);
  if (!byPage.size) console.log('  （无）');
  for (const k of [...byPage.keys()].sort()) console.log(`  ${k.padEnd(wide)}  ${byPage.get(k).join(' | ')}`);
  if (runtimeSkipped.length) {
    console.log(`\n运行时覆盖未测：${runtimeSkipped.length} 页模型没有照片墙（3–5 张纯图），无马赛克主体可测`);
    console.log(`  ${runtimeSkipped.map((s) => s.k).join(' ')}`);
  }

  console.log(`\n死选择器（警告，不阻断：引擎 CSS 引用的结构类名在 ${pages.length} 页渲染上 0 次打出）:`);
  if (!dead.length) console.log('  （无）');
  for (const d of dead) {
    const kind = classTokensOf(d.selector).some((c) => kindClasses.has(c)) ? '（页种）' : '';
    console.log(`  ${d.selector.padEnd(34)} 命中 0 页  死类名 ${d.classes.join(' ')}${kind}`);
  }

  console.log(`\n死声明（级联冲突：同一主体、同一属性，左者在整个语料上永远输给右者）:`);
  if (!conflicts.length) console.log('  （无）');
  for (const c of conflicts) {
    const media = c.media ? `${c.media} ` : '';
    console.log(`  ${c.subject} { ${c.property} }  ${media}${c.struckValue} (${c.struckSelector}) → ${c.winningValue} (${c.winningSelector})`);
  }

  const missing = comp.filter((v) => v.class === 'class-missing').length;
  const undetermined = comp.length - missing;
  const verdict = gateOutcome({
    composition: comp.length,
    deadDeclaration: conflicts.length,
    runtime: runtimeDistinct,
    deadSelectors: dead.length,
  }, { strictDead });
  const { errors, warnings } = verdict;
  console.log(`\n意图门禁: 错误 ${errors.total} (未定构图 ${errors.composition} / 死声明 ${errors.deadDeclaration} / 运行时覆盖 ${errors.runtime}) ｜ 警告 ${warnings.total} (死选择器 ${warnings.deadSelectors})`);
  if (missing) console.log(`  其中 类缺失 ${missing} 页、未定构图（default）${undetermined} 页`);
  if (deduped.length) console.log(`  其中 运行时覆盖 ${deduped.length} 项与死声明同源（同页同缺陷只计一次）`);
  if (strictDead) console.log(`  --strict-dead：死选择器 ${warnings.total} 项计入阻断`);
  return verdict.exitCode;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
