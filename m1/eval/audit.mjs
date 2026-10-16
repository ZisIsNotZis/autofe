// M2.5 visual self-audit (no vision model needed): programmatic checks that
// approximate what a human eye catches on first glance. Run per curated page.
// Usage: node m1/eval/audit.mjs <model.json> <render.html> [out.json]
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { childrenOf, factsOf } from '../model-lib.mjs';
const require = createRequire(import.meta.url);

export function modelAudit(model) {
  const findings = [];
  (function walk(n, p) {
    if (Array.isArray(n._items)) {
      const noLabel = n._items.filter((it) => !(it._name ?? it._title));
      if (n._items.length >= 2 && noLabel.length > n._items.length * 0.4)
        findings.push({ check: 'items-missing-label', at: p || '/', detail: `${noLabel.length}/${n._items.length} items carry no _name/_title (render as blank or placeholder rows)` });
    }
    if (n._action && !n._action.label && !['navigate', 'open'].includes(n._action.verb) === false && !n._action.to && n._action.label === undefined) {
      // verb-only action with no target and no label: nothing actionable renders
    }
    for (const [k, v] of Object.entries(n)) if (!k.startsWith('_') && v && typeof v === 'object') walk(v, p ? `${p}.${k}` : '');
  })(model, '');
  return findings;
}

export async function renderAudit(htmlPath) {
  const { chromium } = require(process.env.AUTOFE_PLAYWRIGHT_CORE || '/home/z/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core');
  const b = await chromium.launch({ executablePath: process.env.AUTOFE_CHROME_PATH || (process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell'), args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('file://' + (htmlPath.startsWith('/') ? htmlPath : process.cwd() + '/' + htmlPath));
  const audit = await p.evaluate(() => {
    const textOf = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();
    const r = {
      renderedChars: textOf(document.body).length,
      emptyListItems: 0, emptyLinks: 0, emptyButtons: 0,
      emptyCards: 0, textlessCards: 0,
      gridBoxes: [], grids: [],
    };
    for (const li of document.querySelectorAll('li')) if (textOf(li).length === 0) r.emptyListItems++;
    for (const a of document.querySelectorAll('a')) if (textOf(a).length === 0 && !a.querySelector('img')) r.emptyLinks++;
    for (const btn of document.querySelectorAll('button')) if (textOf(btn).length === 0) r.emptyButtons++;
    for (const card of document.querySelectorAll('.item, .card, .compare > .node')) {
      const t = textOf(card);
      if (t.length === 0) r.emptyCards++;
      else if (t.length < 8) r.textlessCards++;
    }
    // grid alignment: for each .cards/.compare/.items container, record child box geometry
    for (const grid of document.querySelectorAll('.cards, .compare, .items:not(.ol)')) {
      const boxes = [...grid.children].map((ch) => {
        const b = ch.getBoundingClientRect();
        return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
      });
      if (boxes.length >= 2) {
        const xs = [...new Set(boxes.map((b) => b.x))].sort((a, b2) => a - b2);
        const ys = [...new Set(boxes.map((b) => b.y))].sort((a, b2) => a - b2);
        const g = { container: grid.className, items: boxes.length, columns: xs.length, rows: ys.length, boxes };
        r.grids.push(g);
        // misalignment heuristic: uneven row heights > 40px, or items not filling columns evenly
        const rowOf = (b) => ys.indexOf(b.y);
        const perRow = {};
        boxes.forEach((b) => { const rr = rowOf(b); (perRow[rr] = perRow[rr] || []).push(b); });
        const counts = Object.values(perRow).map((a) => a.length);
        g.perRow = counts;
        g.ragged = counts.length > 1 && counts[counts.length - 1] !== counts[0];
        const widths = boxes.map((b) => b.w);
        g.unevenWidth = Math.max(...widths) - Math.min(...widths) > 40;
      }
    }
    return r;
  });
  await b.close();
  return audit;
}

export function auditPage(modelPath, renderPath, sourceDir) {
  const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
  const modelFindings = modelAudit(model);
  return renderAudit(renderPath).then((ra) => ({ model: modelFindings, render: ra }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [model, render, out] = process.argv.slice(2);
  auditPage(model, render).then((r) => {
    if (out) fs.writeFileSync(out, JSON.stringify(r, null, 1)); else console.log(JSON.stringify(r, null, 1));
  }).catch((e) => { console.error(e.message); process.exit(1); });
}
