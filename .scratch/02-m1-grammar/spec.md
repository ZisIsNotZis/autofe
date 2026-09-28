# 02 — M1: first-cut grammar + minimal renderer + failure log

Status: done (2026-09-18) — axioms v0.1 + validator + renderer + 6 exemplar models + failure log F-001..F-019; eval harness (M2) not yet built
Need-review: yes (user reviews the drafted axioms)

## Decisions recorded (2026-09-18, user)

1. Coverage population = 业内公认顶流, professional/commercial/industrial scenarios; per-scenario archetypes, Pareto frontier within archetype. Non-professional (niche personal homepages, game design) out of scope.
2. **Unified storyline model** — no separate narrative/task surface. A table/form/dashboard is also a storyline; its story is "what does the user want to learn, why this operation". (Hypothesis to validate: a storyline-sorted task surface beats info-flat.)
3. Top-tier judgement is 人工/业内公认; AI never judges aesthetics, AI learns priors from recognized exemplars.
4. Corpus = two tiers: exemplar (coverage claims) + support (structural coverage incl. real pages).
5. M1 mode: agent drafts, user reviews.

## M1 hand-encode set (draft, pending user eyes)

Exemplar pages chosen to force the axioms wide:

| # | Page | Why |
|---|---|---|
| 1 | apple-com/iphone-16 (have) | canonical product narrative |
| 2 | linear.app home (to capture) | SaaS landing narrative |
| 3 | stripe.com checkout/pricing (to capture) | commercial form/checkout |
| 4 | mi-com/product-detail-mi15 (have) | CN product page |
| 5 | ant-design/components-table (have) | task surface: table |
| 6 | element-plus/form (have) | task surface: form |
| 7 | sspai-com/post-102392 (have) | article/editorial |
| 8 | taobao home or airbnb listing | marketplace (taobao kept pending homepage judgement) |
| 9 | tailwindcss or ant-design docs page | support material |
| 10 | aliyun-com/product-ecs (have) | industrial/cloud commercial |

## Plan

1. Draft exemplar seed list (this ticket's table + the curation table presented to the user), each entry with a one-line justification.
2. Draft first-cut axioms (§3 model) from those pages.
3. Build a minimal renderer (single device, deterministic, one brand).
4. Hand-encode the set against the axioms; record an expression-failure log (every place the grammar cannot say something).
5. Recurring gaps -> axiom candidates; one-offs -> inline composition. Hold-out pages untouched.
6. Deliver: axioms v0 + renderer + failure log, for user review.

## Acceptance

- Each page encodable without an escape hatch, or the failure logged with a reason.
- Renderer output deterministic and reproducible for the same model+context.
- Failure log is explicit and ranked; no silent gaps.
