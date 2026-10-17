// 轮 58 站点 accent 重算（S3c）：accent 取站点的**品牌 chrome**色，不是正文链接色的最高频者。
// 为什么改（轮 57 的缺陷）：取 `a` 前景色最高频者时，很多站的最高频链接色是通用工具蓝
// （sspai #0097ff、airbnb 量不出回退 default #0b62d0），页面因此仍一眼是模板。
// 证据序列（强 → 弱，全部来自该站抓取，逐条带路径）：
//   ① logo 元素/图片的像素主色 —— 品牌 mark 本身；只在顶栏条带内取（corpus/<site>/<page>/viewport.png
//      里该元素 bbox 的像素）。**不取 hero 图片像素**：hero 是内容不是品牌 chrome（sspai 首页 hero 是
//      橙色毛衣照片，取像素会把 sspai 判成橙红），所以只认顶栏条带里的 logo 元素。
//   ② 顶栏/导航的实心背景色（nodes.json 的 styles.backgroundColor，顶栏条带内、面积 ≥4000px）
//   ③ <meta name="theme-color"> 的饱和声明值（作者声明的 UI chrome 色）
//   ④ 内联 CSS 自定义属性里以 brand/primary/main/accent/theme 开头的字面色（不含 var() 引用）
//   ⑤ 顶栏条带内元素自身的文字/背景上色（≥3 例，单例徽章不算量得）
//   ⑥ 保底：轮 57 的 a 前景色最高频者（正文链接色）
// 同相保护：chrome 证据与已量得的非回退值**同相**（ΔH < 20°）时保留已量得值——色相才是品牌身份，
// 明度/彩度在渲染期按对比度归一（render.mjs 的 accentOf），换同相色值只是抖动。
// 语料未覆盖的站点（本次 corpus/ 下无该站抓取）保留上次量得值，不删不猜。
// 用法: node m1/eval/brand-accent.mjs        # 重算并写 m1/brand-tokens.json（确定性）
//       node m1/eval/brand-accent.mjs --print # 只打印表格，不写文件
import fs from 'node:fs';
import path from 'node:path';
import { decodePng } from '../../tools/capture/lib/png.mjs';

const CORPUS = 'corpus';
const OUT = new URL('../brand-tokens.json', import.meta.url);
const DEFAULT_ACCENT = '#0b62d0';
// 判量门槛：一个非中性色至少要在这 3 个 chrome 锚点上出现，才够格当 accent（1 例孤证不算量得）
const MIN_COUNT = 3;
// 顶栏条带（css px，scroll 0 下与 viewport.png 同坐标）：logo 可以落在较高的 header 里，上色元素只在导航条带
const LOGO_BAND_BOTTOM = 130;
const NAV_STRIP_BOTTOM = 90;
// logo 惯例在左上；居中 logo（github/xiaomi-account 这类单卡页）另认
const LEFT_BLOCK_RATIO = 0.45;
const CENTER_TOLERANCE = 140;
// accent 的饱和度下限与明度区间：太灰不是品牌色相；太暗（近墨黑）与太亮（近白/粉彩）都不是 accent，
// 且渲染期还要按对比度压暗（render.mjs 的 accentOf），粉彩会被压成脏色调
const MIN_SATURATION = 0.35;
const MIN_LIGHTNESS = 0.22;
const MAX_LIGHTNESS = 0.78;
// logo 像素主色：代表色桶 ≥40px 且 ≥该元素 2% 的像素，同色相族合计 ≥8%
// （字标/花瓣这类细笔画的单桶像素本来就少，用族覆盖率判「这是 mark 的主色」，用单桶占比挡噪声）
const LOGO_BUCKET_SATURATION = 0.45;
const LOGO_MIN_COVERAGE = 0.08;
const LOGO_MIN_PIXELS = 40;
const LOGO_MIN_SHARE = 0.02;
// 同相保护（度）
const SAME_HUE_TOLERANCE = 20;

const rgbToHex = (r, g, b) => '#' + [r, g, b].map((x) => Number(x).toString(16).padStart(2, '0')).join('');

// rgb 三元组 → {hex, s(HSL 饱和度), l(明度), h(色相)}；中性色（黑/白/灰）由 s/l 排除
function measure(r, g, b) {
  const [rr, gg, bb] = [r, g, b].map((x) => x / 255);
  const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max !== min) {
    const d = max - min;
    if (max === rr) h = 60 * (((gg - bb) / d + 6) % 6);
    else if (max === gg) h = 60 * ((bb - rr) / d + 2);
    else h = 60 * ((rr - gg) / d + 4);
  }
  return { hex: rgbToHex(r, g, b), r, g, b, s, l, h };
}

// `rgb(r, g, b)` / `rgba(r, g, b, a)` → 色；半透明（a<0.5）与无解析值返回 null
function parseRgb(color) {
  const m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)$/i.exec(String(color).trim());
  if (!m) return null;
  const alpha = m[4] === undefined ? 1 : Number(m[4]);
  if (alpha < 0.5) return null;
  return measure(Number(m[1]), Number(m[2]), Number(m[3]));
}

// `#rgb` / `#rrggbb` → 色
function parseHex(value) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(value).trim());
  if (!m) return null;
  const digits = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  return measure(...digits.match(/../g).map((c) => parseInt(c, 16)));
}

const isAccent = (c) => c && c.s >= MIN_SATURATION && c.l >= MIN_LIGHTNESS && c.l <= MAX_LIGHTNESS;
const hueGap = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
// 同一品牌色在不同页面上会有 ±几 个通道的抖动：按 16 级桶聚合，再在桶内取均值
const bucketOf = (r, g, b) => `${r >> 4},${g >> 4},${b >> 4}`;
// 两个色相（度）是否属于同一色相族（±30°）
const nearHue = (a, b) => Math.min(Math.abs(a - b) % 360, 360 - (Math.abs(a - b) % 360)) <= 30;

function addCandidate(map, c, { page, path: evidencePath, where, weight = 1 }) {
  const key = bucketOf(c.r, c.g, c.b);
  const e = map.get(key) ?? { r: 0, g: 0, b: 0, weight: 0, pages: new Set(), where: null, path: null };
  e.r += c.r * weight; e.g += c.g * weight; e.b += c.b * weight; e.weight += weight;
  e.pages.add(page);
  if (!e.where) e.where = where;
  if (!e.path) e.path = evidencePath;
  map.set(key, e);
}

// 一个信号内的胜者：页数覆盖优先（跨页一致才算该站的 chrome），同页数看像素/计数权重
function bestOf(map, { fit = isAccent } = {}) {
  const ranked = [...map.values()]
    .map((e) => ({ ...e, ...measure(Math.round(e.r / e.weight), Math.round(e.g / e.weight), Math.round(e.b / e.weight)) }))
    .filter(fit)
    .sort((a, b) => b.pages.size - a.pages.size || b.weight - a.weight);
  return ranked[0] ?? null;
}

const pageDirOf = (site, page) => `corpus/${site}/${page}`;

// logo 元素：顶栏条带内、尺寸像 mark/字标、位置在左上块或居中的 img/svg
function logoSample(png, nodes) {
  const W = png.width;
  const candidates = nodes.filter((n) => n.visible && (n.tag === 'img' || n.tag === 'svg')
    && n.bbox.w >= 16 && n.bbox.w <= 360 && n.bbox.h >= 14 && n.bbox.h <= 120
    && n.bbox.y >= -2 && n.bbox.y + n.bbox.h <= LOGO_BAND_BOTTOM
    && (n.bbox.x < W * LEFT_BLOCK_RATIO || Math.abs(n.bbox.x + n.bbox.w / 2 - W / 2) <= CENTER_TOLERANCE));
  for (const n of candidates) {
    const x0 = Math.max(0, Math.round(n.bbox.x)), x1 = Math.min(png.width, Math.round(n.bbox.x + n.bbox.w));
    const y0 = Math.max(0, Math.round(n.bbox.y)), y1 = Math.min(png.height, Math.round(n.bbox.y + n.bbox.h));
    if (x1 <= x0 || y1 <= y0) continue;
    // 代表色 = 出现最多的那个颜色桶（桶均色保留品牌色纯度）；覆盖率 = 同色相族的全部像素
    // （渐变 mark 如 huawei 花瓣会分成多档同族色，逐桶都不够 15%，合起来才是 mark 的主色）
    const buckets = new Map();
    const hueCount = new Map();
    let sampled = 0;
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const p = png.pixel(x, y);
        if (!p || p[3] < 200) continue;
        sampled += 1;
        const c = measure(p[0], p[1], p[2]);
        if (c.s < LOGO_BUCKET_SATURATION || c.l < MIN_LIGHTNESS || c.l > 0.82) continue;
        const key = bucketOf(p[0], p[1], p[2]);
        const e = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0, h: c.h };
        e.r += p[0]; e.g += p[1]; e.b += p[2]; e.n += 1;
        buckets.set(key, e);
        const hueBin = Math.floor(c.h / 30) % 12;
        hueCount.set(hueBin, (hueCount.get(hueBin) ?? 0) + 1);
      }
    }
    const modal = [...buckets.values()].sort((a, b) => b.n - a.n)[0];
    if (!modal || modal.n < LOGO_MIN_PIXELS || modal.n / sampled < LOGO_MIN_SHARE) continue;
    const familyPixels = [...hueCount.entries()]
      .filter(([bin]) => nearHue(bin * 30 + 15, modal.h))
      .reduce((sum, [, n]) => sum + n, 0);
    if (familyPixels / sampled < LOGO_MIN_COVERAGE) continue;
    const colour = measure(Math.round(modal.r / modal.n), Math.round(modal.g / modal.n), Math.round(modal.b / modal.n));
    const bbox = `${n.bbox.x},${n.bbox.y} ${n.bbox.w}×${n.bbox.h}`;
    return { colour, coverage: familyPixels / sampled, bbox };
  }
  return null;
}

const metaThemeColor = (html) => {
  const m = /<meta[^>]+name=["']theme-color["'][^>]*content=["']([^"']+)["']/i.exec(html)
    ?? /<meta[^>]+content=["']([^"']+)["'][^>]*name=["']theme-color["']/i.exec(html);
  return m ? m[1].trim() : null;
};

// 站点「上一次量得」的 accent（保留同相值/未采语料站点的依据）
const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { sites: {} };

const sites = {};
for (const site of fs.readdirSync(CORPUS).sort()) {
  const dir = path.join(CORPUS, site);
  if (!fs.statSync(dir).isDirectory()) continue;
  const logo = new Map(), chromeBg = new Map(), theme = new Map(), customProp = new Map(), navInk = new Map(), links = new Map();
  let pages = 0, anchors = 0;

  for (const page of fs.readdirSync(dir).sort()) {
    const pageDir = path.join(dir, page);
    const nodesFile = path.join(pageDir, 'nodes.json');
    if (!fs.existsSync(nodesFile)) continue;
    let nodes;
    try { nodes = JSON.parse(fs.readFileSync(nodesFile, 'utf8')); } catch { continue; }
    if (!Array.isArray(nodes)) continue;
    pages += 1;

    // ③ theme-color
    const htmlFile = path.join(pageDir, 'dom.html');
    const html = fs.existsSync(htmlFile) ? fs.readFileSync(htmlFile, 'utf8') : '';
    const declared = metaThemeColor(html);
    const declaredColour = declared ? (parseHex(declared) ?? parseRgb(declared)) : null;
    if (isAccent(declaredColour)) addCandidate(theme, declaredColour, { page, path: `${pageDirOf(site, page)}/dom.html`, where: `theme-color ${declared}` });

    // ④ 内联 CSS 自定义属性（只认以品牌词开头的字面色，var() 引用不算）
    for (const m of html.matchAll(/--(brand|primary|main|accent|theme)[a-z0-9_-]*\s*:\s*(#[0-9a-f]{3,6})\b/gi)) {
      const c = parseHex(m[2]);
      if (isAccent(c)) addCandidate(customProp, c, { page, path: `${pageDirOf(site, page)}/dom.html`, where: `--${m[1]}…: ${m[2]}` });
    }

    // ① logo 像素主色
    const pngFile = path.join(pageDir, 'viewport.png');
    const pageWidth = viewportWidth(pngFile);
    if (pageWidth) {
      const png = decodePng(fs.readFileSync(pngFile));
      const sample = logoSample(png, nodes);
      if (sample) {
        addCandidate(logo, sample.colour, {
          page,
          path: `${pageDirOf(site, page)}/viewport.png`,
          where: `顶栏 logo 元素 (${sample.bbox}) 的像素主色 ${sample.colour.hex}（占该元素 ${Math.round(sample.coverage * 100)}%）`,
          weight: Math.round(sample.coverage * 1000),
        });
      }
    }

    for (const n of nodes) {
      if (!n.visible || !(n.bbox.h > 0)) continue;
      const inNavStrip = n.bbox.y >= -2 && n.bbox.y + n.bbox.h <= NAV_STRIP_BOTTOM;
      const inLogoBand = n.bbox.y >= -2 && n.bbox.y + n.bbox.h <= LOGO_BAND_BOTTOM;

      // ② 顶栏/导航的实心背景色：header/nav 本身，或顶栏条带内的一条满幅色带
      if (inLogoBand) {
        const bg = parseRgb(n.styles?.backgroundColor);
        const wideBar = n.bbox.w >= pageWidth * 0.5 && n.bbox.h <= 140;
        if (isAccent(bg) && (n.tag === 'header' || n.tag === 'nav' || wideBar) && n.bbox.w * n.bbox.h >= 4000) {
          addCandidate(chromeBg, bg, { page, path: `${pageDirOf(site, page)}/nodes.json`, where: `${n.tag} 背景色 ${bg.hex} @${n.bbox.x},${n.bbox.y} ${n.bbox.w}×${n.bbox.h}` });
        }
      }

      // ⑤ 导航条带内元素自身的上色（文字色或背景色），单例徽章不算量得
      if (inNavStrip) {
        for (const key of ['color', 'backgroundColor']) {
          const c = parseRgb(n.styles?.[key]);
          if (isAccent(c)) addCandidate(navInk, c, { page, path: `${pageDirOf(site, page)}/nodes.json`, where: `${n.tag} 的 ${key}` });
        }
      }

      // ⑥ 保底：正文链接色（轮 57 的口径）
      if (n.tag === 'a') {
        anchors += 1;
        const c = parseRgb(n.styles?.color);
        if (isAccent(c)) addCandidate(links, c, { page, path: `${pageDirOf(site, page)}/nodes.json`, where: `a 前景色 ${c.hex}` });
      }
    }
  }

  const measured = bestOf(links);
  const measuredValue = measured && measured.pages.size >= 1 && measured.weight >= MIN_COUNT ? measured : null;
  const chrome = [
    ['logo', bestOf(logo)],
    ['navBg', bestOf(chromeBg)],
    ['theme-color', bestOf(theme)],
    ['customProp', bestOf(customProp)],
    ['navInk', bestOf(navInk, { fit: (c) => isAccent(c) && c.weight >= MIN_COUNT })],
  ].filter(([, c]) => c);

  const [chromeSignal, chromeBest] = chrome[0] ?? [];
  if (process.argv.includes('--explain')) {
    const dump = [['logo', logo], ['navBg', chromeBg], ['theme-color', theme], ['customProp', customProp], ['navInk', navInk], ['links', links]]
      .map(([k, m]) => `${k}[${m.size}]`).join(' ');
    console.log(`  · ${site.padEnd(18)} ${dump}`);
  }
  // 链接色两级口径：勉强够作 accent 的（彩度/明度入列）与旧口径的「非中性」（深色主题站的墨色链接）
  const linkGrade = bestOf(links, { fit: (c) => isAccent(c) && c.weight >= MIN_COUNT });
  const linkLoose = bestOf(links, { fit: (c) => c.s >= 0.14 && c.l >= 0.16 && c.l <= 0.92 && c.weight >= MIN_COUNT });

  if (chromeBest) {
    // 品牌 chrome 与链接色**同相**时保留链接量得的色值：色相才是品牌身份，明度/彩度在渲染期
    // 按对比度归一（render.mjs 的 accentOf），换同相色值只是抖动
    const sameHue = linkGrade && hueGap(chromeBest.h, linkGrade.h) < SAME_HUE_TOLERANCE;
    const value = sameHue ? linkGrade.hex : chromeBest.hex;
    const against = linkGrade
      ? `链接色 ${linkGrade.hex} ${sameHue ? '同相' : '不同相'}（ΔH ${Math.round(hueGap(chromeBest.h, linkGrade.h))}°）`
      : '无合格链接色可佐证';
    sites[site] = {
      accent: {
        value,
        fallback: false,
        evidence: `品牌 chrome 的「${signalName(chromeSignal)}」：${chromeBest.where}，证据 ${chromeBest.pages.size} 页 ${chromeBest.path}；${against}⇒ ${sameHue ? '保留链接量得值' : '按品牌 chrome 取值'}`,
      },
    };
  } else if (linkGrade) {
    sites[site] = {
      accent: {
        value: linkGrade.hex,
        fallback: false,
        evidence: `无品牌 chrome 信号（logo 像素、顶栏背景、theme-color、内联 CSS 变量、顶栏上色 均无合格饱和值），退回链接色统计：${linkGrade.hex} × ${linkGrade.weight}/${anchors} 个锚点；主证 ${linkGrade.path}`,
      },
    };
  } else if (linkLoose) {
    sites[site] = {
      accent: {
        value: linkLoose.hex,
        fallback: false,
        evidence: `无品牌 chrome 信号，链接色 ${linkLoose.hex} × ${linkLoose.weight}/${anchors} 个锚点（饱和度 ${linkLoose.s.toFixed(2)} 低于 accent 阈值 ${MIN_SATURATION}，是深色/低彩站点的墨色链接），主证 ${linkLoose.path}`,
      },
    };
  } else if (!anchors) {
    // 这次抓取里一个可量的锚点都没有（页面只剩 iframe/空壳）：不拿 default 顶掉上次量得的色值，
    // 保留并写明「本次量不出」——缺席是状态，不是补一个通用蓝的理由
    const prev = previous.sites?.[site]?.accent;
    const base = String(prev?.evidence ?? '').replace(/｜本次语料量不出[^｜]*$/, '');
    sites[site] = {
      accent: prev && !prev.fallback
        ? { ...prev, evidence: `${base}｜本次语料量不出（${pages} 页 / 0 个锚点），沿用上次量得值` }
        : {
          value: DEFAULT_ACCENT,
          fallback: true,
          evidence: `回退 default：本次语料量不出（${pages} 页 / 0 个锚点）；语料 ${pageDirOf(site, '')}*`,
        },
    };
  } else {
    sites[site] = {
      accent: {
        value: DEFAULT_ACCENT,
        fallback: true,
        evidence: `回退 default：无品牌 chrome 信号，且 ${anchors} 个锚点里没有 ≥${MIN_COUNT} 例的非中性色（${pages} 页）；语料 ${pageDirOf(site, '')}*`,
      },
    };
  }
}

// 语料未覆盖的站点：保留上次量得值（不删、不猜）
for (const [site, token] of Object.entries(previous.sites ?? {})) {
  if (sites[site]) continue;
  if (site.startsWith('$')) continue;
  sites[site] = token;
}

const tokens = {
  $comment: '站点 accent token：由 m1/eval/brand-accent.mjs 从语料量出的**品牌 chrome** 色（logos 像素主色 > 顶栏背景色 > theme-color > 内联 CSS 变量 > 顶栏上色 > 正文链接色），每条带证据路径与信号名。fallback:true = 无任何饱和信号，用 default。渲染器只读这份配置注入 --accent，不写死站名/色值。corpus/ 下未采语料的站点保留上次量得值。',
  default: { accent: DEFAULT_ACCENT },
  sites: Object.fromEntries(Object.entries(sites).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))),
};
if (!process.argv.includes('--print')) fs.writeFileSync(OUT, JSON.stringify(tokens, null, 1) + '\n');
const measuredCount = Object.values(sites).filter((s) => !s.accent.fallback).length;
console.log(`[brand-accent] 站点 ${Object.keys(sites).length} | 有值 ${measuredCount} | 回退 ${Object.keys(sites).length - measuredCount}`);
for (const [k, v] of Object.entries(tokens.sites)) {
  const before = previous.sites?.[k]?.accent?.value ?? '—';
  const mark = v.accent.fallback ? '↩' : before === v.accent.value ? '=' : '✓';
  console.log(`  ${mark} ${k.padEnd(20)} ${before} → ${v.accent.value}${v.accent.fallback ? ' (default)' : ''}  ${v.accent.evidence.slice(0, 90)}`);
}

// 抓取视口宽（viewport.png 的 IHDR 宽）；没有截图时按语料默认 1440 计
function viewportWidth(pngFile) {
  if (!fs.existsSync(pngFile)) return 1440;
  return fs.readFileSync(pngFile).readUInt32BE(16) || 1440;
}

function signalName(key) {
  return { logo: 'logo 像素主色', navBg: '顶栏背景色', 'theme-color': 'theme-color', customProp: '内联 CSS 变量', navInk: '顶栏元素上色' }[key] ?? key;
}
