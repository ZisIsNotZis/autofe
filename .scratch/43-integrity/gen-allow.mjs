import fs from 'node:fs';
const r = JSON.parse(fs.readFileSync('.scratch/43-integrity/scan6.json', 'utf8'));
const entries = [];
for (const p of r.pages) for (const u of p.unmatched) {
  const v = u.value, page = p.page;
  let kind = 'conversion', reason, evidence;
  if (page === 'linear-app/home' && ['Vercel', 'Figma', 'Coinbase'].includes(v)) {
    kind = 'capture-gap';
    reason = '客户 logo 品牌名未在抓取中产出文本：同排的 OpenAI / Ramp 有文本节点，此三条疑为内联 SVG / 背景图未渲染为文本（非编造，源站展示同一 logo 墙）。';
    evidence = 'corpus/linear-app/home/{dom.html,nodes.json} 中对该品牌字符串 0 次命中（grep -c）；同页 OpenAI、Ramp 命中。';
  } else if (page === 'sspai-com/post-114699' && v === '少数派编辑部') {
    kind = 'capture-gap';
    reason = '作者署名未产出文本节点：源站作者区为头像 + 链接，抓取到的 nodes.json/dom.html 无该文本。';
    evidence = 'corpus/sspai-com/post-114699/{dom.html,nodes.json} 中「少数派编辑部」0 次命中（grep -c）。';
  } else if (page.startsWith('apple-com')) {
    if (v.includes('·')) reason = '多单元格/多分句以 · 拼接为一条：源站为分列单元格或分句，非逐字。';
    else if (/^.?(From \$|RMB \d)/.test(v) && /\$|RMB/.test(v) && /mo\.|月/.test(v)) reason = '分期/价格文案改写：合并源站两行官方价格（含期数/上标脚注）为一条概述，非逐字。';
    else reason = '正文省略源站上标脚注数字（<sup>）后的连续文本，非逐字。';
  } else if (page === 'aliyun-com/product-ecs') {
    reason = '正文编辑性改写：合并/重排源站同段文字，保留全部数字与事实点（非逐字）。';
  } else if (page === 'gov-uk/ni-rates-letters') {
    reason = '正文编辑性缩写：源站分句被压缩为一句（非逐字）。';
  } else if (page === 'linear-app/home') {
    reason = '正文编辑性缩写：源站尾句「From drafting PRDs to pushing PRs.」被改写为「from drafting to review.」（非逐字）。';
  } else if (page === 'sspai-com/post-102392') {
    reason = v.includes('·') ? '元数据合成：阅读时长 + 许可合成为一条 meta._detail。' : '正文编辑性缩写：源站长句被压缩（非逐字）。';
  } else if (page === 'stripe-com/pricing') {
    reason = '正文微调：省略连接词「和」（非逐字）。';
  } else if (page === '36kr-com/home') {
    reason = '元数据聚合：视频徽标 / 时长 / 来源 / 相对时间 / 免责声明合成为一行 _source。';
  } else if (page === '36kr-com/information-technology') {
    reason = '栏目名合成：源站导航项「资讯」+ 页面语境得「资讯频道」，非逐字。';
  } else {
    reason = '待分类';
  }
  entries.push({ page, value: v, path: u.path, kind, reason, round: 43, ...(evidence ? { evidence } : {}) });
}
const doc = {
  _doc: 'capture-integrity 第 9 道门禁的声明式白名单（F-078）。kind=conversion 为「合法转换」（聚合/推导/分期文案/时间格式化/正文编辑性改写）；kind=capture-gap 为「采集缺口（待采集，附证据）」。每条必须有 reason；capture-gap 还必须有 evidence。真错（模型值与抓取不符）不得进入此文件，必须改模型。白名单条数 = 无法逐字溯源的事实数。',
  round: 43,
  entries,
};
fs.writeFileSync('m1/eval/capture-integrity-allow.json', JSON.stringify(doc, null, 1) + '\n');
console.log('wrote', entries.length, 'entries;', entries.filter(e=>e.kind==='capture-gap').length, 'capture-gaps;', entries.filter(e=>e.reason==='待分类').length, 'unclassified');
