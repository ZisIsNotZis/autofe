// M3 structure-quality metrics (F-023 gate): without these, auto-vs-hand
// source-coverage comparison is coverage-gaming (a text dump "wins").
// Usage: node m1/eval/structure.mjs <model.json> [sourceDir]
import fs from 'node:fs';
import { walk, factsOf, childrenOf } from '../model-lib.mjs';

const CHROME = /(copy|copy link|copy id|copy url|open menu|close|menu|search\b|展开|收起|复制|打开|关闭|菜单|更多|quick links|view all|see all|read more|learn more)/i;

export function structure(model, sourceDir) {
  let groups = 0, withIntent = 0, actions = 0, looseActions = 0, chromeActions = 0;
  let textFacts = 0, truncated = 0;
  let storylines = 0, items = 0, fields = 0, roleFacts = 0;

  let srcNames = null;
  if (sourceDir && fs.existsSync(`${sourceDir}/nodes.json`)) {
    const nodes = JSON.parse(fs.readFileSync(`${sourceDir}/nodes.json`, 'utf8'));
    srcNames = nodes.flatMap((x) => [x.name, x.text].filter((s) => typeof s === 'string' && s.length > 24));
  }

  walk(model, (n) => {
    const kids = childrenOf(n);
    if (kids.length) { groups++; if (typeof n._intent === 'string' && n._intent.trim()) withIntent++; }
    if (Array.isArray(n._lines)) storylines += n._lines.length;
    if (Array.isArray(n._items)) items += n._items.length;
    if (n._fields) fields += Object.keys(n._fields).length;
    roleFacts += factsOf(n).length;
    if (n._action) {
      actions++;
      const a = n._action;
      if (!a.to && !a.label) looseActions++;
      const text = `${a.label ?? ''} ${a.verb}`;
      if (CHROME.test(text) && !a.label) chromeActions++;
    }
    for (const f of factsOf(n)) {
      for (const tv of Object.values(f.value)) {
        if (typeof tv !== 'string' || tv.length < 20) continue;
        textFacts++;
        if (srcNames && srcNames.some((s) => s.startsWith(tv) && s.length > tv.length + 8)) truncated++;
      }
    }
    if (n._fields) for (const v of Object.values(n._fields)) {
      for (const tv of Object.values(v)) {
        if (typeof tv !== 'string' || tv.length < 20) continue;
        textFacts++;
        if (srcNames && srcNames.some((s) => s.startsWith(tv) && s.length > tv.length + 8)) truncated++;
      }
    }
  });

  const pct = (a, b) => (b ? +(a / b).toFixed(3) : null);
  return {
    intentCoverage: pct(withIntent, groups),
    groups, storylines, items, domainFields: fields, roleFacts,
    actions,
    looseActionRatio: pct(looseActions, actions),
    chromeActionRatio: pct(chromeActions, actions),
    truncationRate: pct(truncated, textFacts),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [model, sourceDir] = process.argv.slice(2);
  console.log(JSON.stringify(structure(JSON.parse(fs.readFileSync(model, 'utf8')), sourceDir), null, 2));
}
