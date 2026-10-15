// 轮 57 站点 accent 测量（M5 第一个 token）：accent 不是拍脑袋的蓝，是从抓取量出来的。
// 对 corpus/<site>/<page>/nodes.json 里每个 `a` 元素的计算样式 `styles.color`（前景色）计数，
// 排除黑/白/灰（无品牌色相）后取最高频者为该站 accent；量不出（无样式/全灰/样本过少）
// 回退 default 并写明。每条 token 必须带 evidence 路径。
// 用法: node m1/eval/brand-accent.mjs        # 重算并写 m1/brand-tokens.json（确定性）
//       node m1/eval/brand-accent.mjs --print # 只打印表格，不写文件
import fs from 'node:fs';
import path from 'node:path';

const CORPUS = 'corpus';
const OUT = new URL('../brand-tokens.json', import.meta.url);
const DEFAULT_ACCENT = '#0b62d0';
// 判量门槛：一个非中性色至少要在这 3 个锚点上出现，才够格当 accent（1 例孤证不算量得）
const MIN_COUNT = 3;

const rgbToHex = (r, g, b) => '#' + [r, g, b].map((x) => Number(x).toString(16).padStart(2, '0')).join('');
// hue/sat/light：饱和度与明度用来排除中性色（黑/白/灰都不该被当成品牌色）
function classify(color) {
  const m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)$/i.exec(String(color).trim());
  if (!m) return null;
  const alpha = m[4] === undefined ? 1 : Number(m[4]);
  if (alpha < 0.5) return null;
  const [r, g, b] = [m[1], m[2], m[3]].map((x) => Number(x) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  const neutral = s < 0.14 || l < 0.16 || l > 0.92;   // 非黑非白（且非灰）
  return { hex: rgbToHex(m[1], m[2], m[3]), neutral };
}

const sites = {};
for (const site of fs.readdirSync(CORPUS).sort()) {
  const dir = path.join(CORPUS, site);
  if (!fs.statSync(dir).isDirectory()) continue;
  const perColor = new Map();   // hex -> { count, pages: Map(page -> count) }
  let anchors = 0;
  for (const page of fs.readdirSync(dir).sort()) {
    const nodesFile = path.join(dir, page, 'nodes.json');
    if (!fs.existsSync(nodesFile)) continue;
    let nodes;
    try { nodes = JSON.parse(fs.readFileSync(nodesFile, 'utf8')); } catch { continue; }
    if (!Array.isArray(nodes)) continue;
    for (const n of nodes) {
      if (n?.tag !== 'a' || n.visible === false) continue;
      anchors++;
      const c = classify(n.styles?.color);
      if (!c || c.neutral) continue;
      const e = perColor.get(c.hex) ?? { count: 0, pages: new Map() };
      e.count++;
      e.pages.set(page, (e.pages.get(page) ?? 0) + 1);
      perColor.set(c.hex, e);
    }
  }
  const ranked = [...perColor.entries()].sort((a, b) => b[1].count - a[1].count);
  const [hex, win] = ranked[0] ?? [];
  if (hex && win.count >= MIN_COUNT) {
    const topPages = [...win.pages.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2)
      .map(([p, n]) => `corpus/${site}/${p}/nodes.json (${n}/${win.count})`).join(' + ');
    sites[site] = { accent: { value: hex, fallback: false, evidence: `a 前景色统计：${hex} × ${win.count}/${anchors} 个锚点；主证 ${topPages}` } };
  } else {
    const near = hex ? `最接近的非中性色 ${hex} 仅 ${win?.count ?? 0} 例（<${MIN_COUNT}），不足为证` : `无任何非黑非白锚点色（${anchors} 个锚点全为中性色/无样式）`;
    sites[site] = { accent: { value: DEFAULT_ACCENT, fallback: true, evidence: `回退 default：${near}；语料 corpus/${site}/*/nodes.json` } };
  }
}

const tokens = {
  $comment: '轮 57 站点 accent token（M5 第一个 token）：从语料量出来（a 元素前景色最高频非黑非白者），由 m1/eval/brand-accent.mjs 生成。fallback:true = 量不出（无样式/全灰/样本不足），用 default。渲染器只读这份配置注入 --accent，不写死站名/色值。',
  default: { accent: DEFAULT_ACCENT },
  sites,
};
if (!process.argv.includes('--print')) fs.writeFileSync(OUT, JSON.stringify(tokens, null, 1) + '\n');
const measured = Object.values(sites).filter((s) => !s.accent.fallback).length;
console.log(`[brand-accent] 站点 ${Object.keys(sites).length} | 量得 ${measured} | 回退 ${Object.keys(sites).length - measured}`);
for (const [k, v] of Object.entries(sites)) console.log(`  ${v.accent.fallback ? '↩' : '✓'} ${k.padEnd(20)} ${v.accent.value}${v.accent.fallback ? ' (default)' : ''}`);
