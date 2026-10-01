// Capture-integrity self-test (F-078, round 43): the 9th gate must be able to FAIL and
// must decide MODEL → CAPTURE, not MODEL → RENDER. Pins, against the real
// `capture-integrity.mjs` code path (throwaway page tree, no logic re-implemented):
//   1. F-078 regression: the historical `aliyun-com/product-ecs` card price — a model
//      `{money: 1238}` while the capture says `￥1438.68` — MUST be reported. The old
//      fidelity oracle scored this 1.00 because the render matched the model.
//   2. a value the capture DOES carry (through normalization: thousands separator,
//      currency sign, full-width, CJK date form) MUST pass.
//   3. sub-threshold values (`1`, `a`) MUST be skipped, not reported — otherwise the
//      gate drowns in false positives and stops being trusted.
//   4. a declared conversion is allowed and prints its reason; a declared capture-gap
//      is allowed and prints its evidence; every entry must carry a reason (a reason-less
//      entry is a hard load error).
// Usage: node m1/eval/capture-integrity-selftest.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkPage, loadAllow, participates, matches, loadHaystack } from './capture-integrity.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'autofe-capture-'));
let bad = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`ok   ${name}`);
  else { bad++; console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`); }
};

// A minimal page tree: the capture says `￥1,438.68 / 1年` and a CJK date; the second
// card has no price at all (gip: capture gap, not fabrication).
const page = 'demo-com/product';
const dir = path.join(root, 'corpus', page);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'dom.html'), '<html><body><p>u2a实例 2核4G</p><p>￥1,438.68 / 1年</p>'
  + '<p>2026年09月18日</p><p>立即购买</p><span title="A very specific title here"></span></body></html>');
fs.writeFileSync(path.join(dir, 'nodes.json'), JSON.stringify([
  { role: 'heading', name: 'u2a实例', text: 'u2a实例 2核4G ￥1,438.68 / 1年 2026年09月18日 立即购买' },
]));

const allowPath = path.join(root, 'allow.json');
fs.writeFileSync(allowPath, JSON.stringify({
  entries: [
    { page, value: '共 4 项', kind: 'conversion', reason: '聚合：条目数由模型统计，源站无此串', round: 43 },
    { page, value: '重点客户 Vercel', kind: 'capture-gap', reason: '该 logo 未渲染为文本', evidence: 'grep: 0 hits in dom.html/nodes.json', round: 43 },
  ],
}));
const allow = loadAllow(allowPath);

// ---- 1. F-078 regression: a wrong price MUST be reported --------------------
const wrongPrice = { _intent: 'i', _title: { text: 'u2a实例' }, plans: { _intent: 'p', _items: [
  { _name: { text: 'u2a实例' }, _price: { money: 1238, currency: 'CNY' } },
] } };
const w = checkPage(page, wrongPrice, dir, allow);
check('F-078: model price 1238 absent from capture ⇒ reported (the old oracle scored it 1.00)',
  w.unmatched.some((u) => u.value === '1238'), JSON.stringify(w));
check('the wrong price is reported with its path', w.unmatched.some((u) => u.path.includes('_price')), JSON.stringify(w.unmatched));

// ---- 2. the captured value passes through normalization --------------------
const rightPrice = { _intent: 'i', _title: { text: 'u2a实例' }, plans: { _intent: 'p', _items: [
  { _name: { text: 'u2a实例' }, _price: { money: 1438.68, currency: 'CNY' } },
] } };
const ok = checkPage(page, rightPrice, dir, allow);
check('`1438.68` matches capture `￥1,438.68` (R5 thousands + currency sign) ⇒ passes', ok.unmatched.length === 0, JSON.stringify(ok.unmatched));
check('the money fact participates (|1438.68| >= 10)', ok.scanned === 3, `scanned=${ok.scanned}`);

// 2b. width / entity / date normalization
const hay = loadHaystack(dir);
const fw = path.join(root, 'corpus', 'demo-com/fw');
fs.mkdirSync(fw, { recursive: true });
fs.writeFileSync(path.join(fw, 'dom.html'), '<html><body><p>&#65299;&#65300;&#65301;&#65298;&#65294;&#65302;&#65304;</p></body></html>');
fs.writeFileSync(path.join(fw, 'nodes.json'), JSON.stringify([{ role: 'generic', name: '', text: '４０１２.６４' }]));
const fwHay = loadHaystack(fw);
check('R1+R2: entity/full-width `４０１２.６４` matches `4012.64`', matches({ type: 'money', text: '4012.64' }, fwHay), JSON.stringify([...fwHay.nums]));
check('R6: model date `2026-09-18` matches capture `2026年09月18日`', matches({ type: 'date', text: '2026-09-18' }, hay));
check('attribute text is captured (`title`): a value only in an attribute passes',
  matches({ type: 'text', text: 'A very specific title here' }, hay));

// ---- 3. sub-threshold values never participate -----------------------------
check('T1: `{money: 1}` does not participate (< 10)', !participates({ type: 'money', text: '1' }));
check('T2: a one-letter text does not participate', !participates({ type: 'text', text: 'a' }));
check('T2: a 2-char latin text does not participate', !participates({ type: 'text', text: 'AI' }));
check('T2: a 2-char CJK text DOES participate', participates({ type: 'text', text: '计算' }));
check('T2: a pure-digit text does not participate', !participates({ type: 'text', text: '357' }));
const shortOnly = { _intent: 'i', _title: { text: 'a' }, pager: { _intent: 'p', _items: [
  { _name: { text: '1' } }, { _name: { text: '2' } },
] } };
const s = checkPage(page, shortOnly, dir, allow);
check('short values are skipped, not reported (no false positives)', s.unmatched.length === 0 && s.scanned === 0, JSON.stringify(s));

// ---- 4. allowlist: conversion + capture-gap + reason enforcement -----------
const agg = { _intent: 'i', _title: { text: 'u2a实例' }, summary: { _intent: 's', _detail: { text: '共 4 项' } },
  logos: { _intent: 'l', _items: [{ _name: { text: '重点客户 Vercel' } }] } };
const a = checkPage(page, agg, dir, allow);
check('a declared conversion is allowed', a.allowlisted.some((x) => x.value === '共 4 项' && x.reason.includes('聚合')), JSON.stringify(a.allowlisted));
check('a declared capture-gap is allowed and carries evidence', a.captureGaps.some((x) => x.value === '重点客户 Vercel' && x.evidence), JSON.stringify(a.captureGaps));
check('declared values do not fail the page', a.unmatched.length === 0, JSON.stringify(a.unmatched));

let threw = '';
const badPath = path.join(root, 'bad-allow.json');
fs.writeFileSync(badPath, JSON.stringify({ entries: [{ page, value: 'x', round: 43 }] }));
try { loadAllow(badPath); } catch (e) { threw = e.message; }
check('a reason-less allow entry is a hard load error', /reason/.test(threw), threw);

fs.rmSync(root, { recursive: true, force: true });
const total = 17;
console.log(`\n采集↔模型一致性自测(F-078): ${total - bad}/${total} 通过${bad ? ` | 待修 ${bad}` : ''}`);
process.exit(bad ? 1 : 0);
