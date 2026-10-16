# 63 · stripe-docs/payments — recapture re-curation

Worker: wave-1 curation worker. Drift class: light (2 unmatched facts, both from one removed item).

## Unmatched facts (before) → disposition

`_lines[4]._items[1]` = 集成加密货币（`_detail` 让您的用户以加密货币支付、以加密货币提现，或嵌入法币兑加密货币入金系统。+ `_action` → docs.stripe.com/crypto）

- nodes.json：`加密货币` 0 命中（全树）。
- dom.html：`docs.stripe.com/crypto` 0 命中。
- 新 capture 的「支付之外」区（heading nodes[488]）只含两项卡片：成立公司（Atlas）+ Financial Connections（nodes[498–517]）。
- 动作：**整条 item 删除**（条目本身已从页面撤下；保留会让 2 个事实 + 1 个目标全部无法溯源）。`_lines[4]._items` 从 3 项变 2 项。

## Allow entries proposed
None. Asset additions: none.

## Evidence (2026-10-16, ticket env)
- `node m1/validate.mjs m1/curated/stripe-docs/payments.json` → ok
- capture-integrity → factsTotal 60, **unmatched 0**
- render → `/tmp/stripe-docs-payments.html`; metrics → **factFidelity 1** (60/60)
- F-025 target sweep → 32 checked, **0 stale**
