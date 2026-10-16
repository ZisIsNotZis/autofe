# 63 · linear-app/home — recapture re-curation

Worker: wave-1 curation worker. Drift class: light content rotation (4 unmatched facts; probe said 1 — probe undercounted the customers logo wall).

## 1. changelog._items[3]「Coding sessions」→ replaced by new top entry

- 新 capture Changelog（nodes[2933–2972]）四条，时间倒序：
  1. **Stacked pull requests** — OCT 8, 2026 — `/changelog/2026-10-08-stacked-pull-requests`（新）
  2. New controls for Linear coding agent — SEP 24, 2026（原样保留）
  3. Loops for product management — SEP 10, 2026（原样保留；站点自身 URL 用 2026-09-14，capture verbatim 未动）
  4. Priority inbox — SEP 3, 2026（原样保留）
- 「Coding sessions」（2026-08-20-coding-environments）已从首页 changelog 消失 → item 删除。
- 新增 item 的 `_summary` 在 nodes.json 被 200 字符截断（…in Reviews, alongs），按 **DOM-verbatim 截断修复** 规则从 dom.html 补全：`…alongside their issue and project context.`（同 capture 的 dom，非世界知识）。
- `_datetime` = 2026-10-08（OCT 8, 2026）；`_action` = `https://linear.app/changelog/2026-10-08-stacked-pull-requests`（dom verbatim）。

## 2. customers._items — 5 个 `_brand` 全部删除（F-025 纪律）

- 新 capture 的 logo 墙 = 7 个**无名称** SVG 字标（nodes[447/450/454/458/466/470/473] name 全为空；dom.html 中是纯 `<path>` SVG，无 alt/aria-label/文本）。
- 品牌名 Vercel / Figma / Coinbase 在全树 0 命中；OpenAI / Ramp 仅出现在**证言署名**（Gabriel Peal, Staff Software Engineer, OpenAI；Nik Koblov, Head of Engineering, Ramp）——作 logo 事实是**误归属**，即使 integrity 能匹配也必须删。
- 区块以 `_title`（Powering the companies building the future，nodes[476] 有）+ `_intent` 说明保留；`_items` 清空。区块在 capture 中仍存在（可视条带），只是无法逐字归名。
- **判定依据**：capture 是唯一事实 oracle（F-025/历史先例「归属不可证明 → 不挂载」）。若后续想要品牌名，需要能读到 logo 无障碍名的采集修复（capture-gap 性质，见 allow 提案）。

## Allow entries proposed（kind/reason/round 63，parent 集成时裁定）
```json
{
  "page": "linear-app/home",
  "value": "Vercel / Figma / Coinbase（及 logo 墙其余字标）",
  "path": "customers._items[*]._brand",
  "kind": "capture-gap",
  "reason": "客户 logo 墙在 2026-10-16 capture 中是无名称 SVG 字标（nodes/a11y name 为空、DOM 无文本无 alt），品牌名无法从本 capture 逐字举证，模型按 F-025 纪律删除；若采集侧能为 SVG 字标补名可恢复。",
  "evidence": "corpus/linear-app/home/nodes.json 节点 447/450/454/458/466/470/473 name=\"\"；dom.html 该区段仅 <path> 无 alt/aria-label",
  "round": 63
}
```

## Asset additions proposed
None.

## Evidence (2026-10-16, ticket env)
- validate → ok；capture-integrity → factsTotal 31, **unmatched 0**
- render → `/tmp/linear-app-home.html`; metrics → **factFidelity 1** (31/31)
- F-025 target sweep → 11 checked, **0 stale**
