# 63 · stripe-com/pricing — recapture re-curation

Worker: wave-1 curation worker. Oracles: `corpus/stripe-com/pricing/nodes.json` (FACTS) + `dom.html` (URL targets, F-025) + `full.png` (EMPHASIS, not re-read — no emphasis judgement needed). Drift class: light-to-moderate (8 unmatched facts measured; probe said 7).

## Unmatched facts (before) → dispositions

| model path | old value | new-capture evidence | action |
|---|---|---|---|
| `catalog._lines[0]._items[0].pricing._lines[0]._detail` | 接受广泛使用的信用卡、借记卡、预付卡进行在线支付。 | nodes[1189] `接受广泛使用的信用卡和借记卡、预付卡进行在线支付。`（新增「和」） | updated verbatim |
| `catalog._lines[2]._items[1].pricing._items[1]._lines[0]._text` | 定制价格 | 新 capture 的 Metronome 定制化定价行（nodes[1946–1967]）以「数据导出仅在自定义方案中可用：」直接开头，无「定制价格」文案 | removed (not in capture) |
| `catalog._lines[2]._items[5]._detail`（Data Pipeline） | 将 Stripe 数据和报表直接同步至您的数据仓库或云存储平台。包含 Stripe Sigma 访问权限。 | nodes[2223] `将 Stripe 数据实时流式传输至 Postgres，或将 Stripe 数据同步至您的数据仓库或云存储。` | updated verbatim |
| `catalog._lines[2]._items[5]._items[0]._name` | 无需写代码，几分钟内即可设置好数据管道… | nodes[2232] `数分钟内即可设置好数据管道，实现自动化的数据传输。` | updated verbatim |
| `catalog._lines[2]._items[5]._items[1]._name` | 加快财务关账速度… | nodes[2238] `在 Postgres 中使用实时 Stripe 数据构建应用程序，无需管理 API 或 Webhook` | updated verbatim |
| `catalog._lines[2]._items[5]._items[2]._name` | 借助 Stripe Sigma 获取更快速的数据洞察… | nodes[2244] `更快完成结账，获得关于收入和流失的更丰富洞察` | updated verbatim |
| `catalog._lines[2]._items[5].pricing._items[0]._lines[0]._price` | 508 HKD | 全 nodes.json 检索 `508`/`391` = 0 命中；DP 卡片现在只有 选择方案 badge（非链接 div）+ 查看定价详情 链接，无内嵌费率行 | pricing 行删除；`pricing` 组保留为定价详情入口（`_action` 查看定价详情 → `https://stripe.com/cn/data-pipeline/pricing`，label 从「方案对比」改为 capture 里的「查看定价详情」） |
| `catalog._lines[2]._items[5].pricing._items[1]._lines[0]._price` | 391 HKD | 同上 | removed |

## Structural notes
- Stripe Sigma（_items[4]）在模型中已是 117/78，与新 capture 一致——上一轮 capture 中 Sigma 与 DP 都有内嵌费率；新 capture 把内嵌费率从 DP 卡撤下（Sigma 保留）。联动修改：`pricing._intent` 更新为「定价详情入口（新 capture 中该卡无内嵌费率行…）」。
- 立即开始 target 复核：`https://dashboard.stripe.com/data-management` 在新 dom 中 verbatim 命中，未动。

## Allow entries proposed
None — 0 unmatched after repair, all facts verbatim.

## Asset additions proposed
None.

## Evidence (2026-10-16, env AUTOFE_CHROME_PATH/AUTOFE_PLAYWRIGHT_CORE as in ticket)
- `node m1/validate.mjs m1/curated/stripe-com/pricing.json` → ok
- `node m1/eval/capture-integrity.mjs --model …` → factsTotal 414, scanned 382, **unmatched 0**
- render via /tmp/render-one.mjs (imports m1/render.mjs) → `/tmp/stripe-com-pricing.html`
- `node m1/eval/metrics.mjs … /tmp/stripe-com-pricing.html corpus/stripe-com/pricing` → **factFidelity 1** (414/414)
- F-025 target sweep (all `_action.to` vs dom.html, relative-form aware) → 66 checked, **0 stale**
- Unchanged-facts byte-identity: all other model text untouched (single-block edits only).
