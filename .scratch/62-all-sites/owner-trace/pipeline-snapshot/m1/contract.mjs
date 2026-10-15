// Extracts the interaction contract of a model: the standard struct the page
// sends to the backend (selection events and final submit), i.e. every _expose
// plus action params. This is the story's *input interface* — it falls out of
// the grammar; nothing new is being modelled here.
import fs from 'node:fs';
import { walk, exposeOf, ROLES, isRoleKey } from './model-lib.mjs';

export function contract(model) {
  const inputs = {};   // name -> {type, from}
  walk(model, (node, p) => {
    const e = exposeOf(node);
    if (e) inputs[e.name] = { type: e.type, from: p || '/', intent: node._intent ?? null };
    if (node._action?.params) for (const [k, t] of Object.entries(node._action.params)) {
      inputs[k] = { type: t, from: p || '/', intent: `param of ${node._action.verb}` };
    }
  });
  return { version: '0.1', inputs };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const model = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  console.log(JSON.stringify(contract(model), null, 2));
}
