# Exclusive lane board

## Ownership / all-page coverage
| Lane | Exclusive write ownership | Coverage / interface | Budget |
|---|---|---|---|
| bootstrap (this package) | setup records, integration active link and confirmed owning-doc feedback only | reconciles 42; snapshots all relevant existing dirt; creates isolation; no implementation/audit | one bounded setup pass, commands <=180s; checkpoint on setup failure |
| engine writer / **integration owner** | `m1/axis.mjs`, renderers/shared contracts/registries, tests/eval gates, owning docs, generated final outputs/focused gallery; reserved `m1/curated/apple-com/home.json`, `m1/curated/taobao-com/home.json` | shared engine/rendering/decision/test/docs seam; both identity fixes; seven-reference preservation; combines content patch and final 42-page acceptance proof | 60min slice, checkpoint at 50; commands <=600s |
| content writer | other `m1/curated/<site>/*.json`, curated assets only | independent factual seam; source-grounded factual changes, no presentation escape hatches; excludes two reserved title models and all shared source/docs/tests | 45min slice, checkpoint at 35; commands <=300s |
| audit-36kr-news-search | own local `.scratch/62-all-sites/audit-36kr-news-search/` only | 36kr home/channel/two searches — 4 remaining pages | 40min, checkpoint at 35; commands <=180s |
| audit-sspai-editorial | own local audit records only | sspai home/matrix/two posts/user — 5 remaining pages | same |
| audit-mi-commerce | own local audit records only | mi home/two searches/category — 4 remaining pages | same |
| audit-huawei-commerce | own local audit records only | huawei home/catalog/two searches — 4 remaining pages | same |
| audit-apple-linear-products | own local audit records only | three remaining Apple product pages + Linear home — 4 remaining pages | same |
| audit-cloud-business | own local audit records only | Aliyun home/ECS, AWS pricing, Stripe pricing, Grafana — 5 remaining pages | same |
| audit-public-technical-docs | own local audit records only | two GOV.UK pages, Microsoft VM sizes, Stripe payments docs — 4 remaining pages | same |
| audit-media-auth-utility | own local audit records only | Bilibili read/video + GitHub/Stripe/Xiaomi logins — 5 remaining pages, media/utility subgroups within one bounded cohort | same |
| fresh final independent reviewers (Main routes later) | each isolated reviewer-local evidence only; no repair unless assigned writer role | final combined 42-page technical/experience coverage; not initial baseline diagnostics | 45min cohort slices, checkpoint 10min before end |

Exact pages and absolute lane paths: `packet.md`, `roster.json`, `dispatch.json`. Eight audit cohorts are exclusive and complete for 35 remaining pages. Seven accepted references are excluded from redesign audits but included in engine regression and final independent review; Apple/Taobao also receive engine identity fixes. No page falls between owners.

## Dependencies / arbitration
- Bootstrap baseline/isolation -> concurrent baseline diagnostics + seam writers in separate worktrees. Starting code work depends on assigned lane contract and covering ticket, not every audit finishing.
- Each audit page finding -> engine **or** content owner according to defect seam; shared title rendering is always engine-owned. Content must request explicit title-model interface before touching either reserved model.
- Content delivers path-limited provenance patch; **engine** owns combination, final shared docs/gates/generated artifacts and all-page regression. Do not forward full baseline snapshot as a patch or overwrite accepted dirty integration source.
- Combined final proof -> Main routes fresh independent technical/experience reviewers -> repairs by respective writer -> affected fresh review/delta checks -> focused gallery delivery at single user milestone.
- Main routes/watches status only. Bootstrap launches no agents. Initial audit source models/rendered outputs/docs/corpus are read-only. Shared corpus symlink is read-only by contract; no new screenshot/log write reaches it. Baseline ref is private and immutable by contract.

## Scheduler / stop conditions
Maximum eight active lane jobs, one active browser/page per lane; concurrent writers always use different worktrees. Audits initially can use all eight slots; two writers consume two slots, leaving six audits. Recheck actual CPU/RAM/disk under load rather than inventing resource scarcity. Every command has a timeout; no unobserved detached jobs. Each worker persists page-level coverage, revision hashes, exact unresolved criterion/next action before slice expiry; Main routes finite continuation on that artifact. Resource exhaustion, unavailable runner, or missing independent review is **incomplete/unverified**, never PASS or objective impossibility. Infrastructure/authority failure: exact checkpoint + specific escalation; no CLI/provider switching.

## Status
Setup and all eight baseline audits are completed; corrected auditRouting and lossless original evidence are retained in `integration/proof/`. Engine recovery and content source candidate are integrated once against verified preserved owned-path baseline; sole root integrator owns subsequent scoped repairs. The source-review SRC-1 trailing article paragraphs/actions have a renewed source/serialization self-test, not independent acceptance. Current combined source/output/docs snapshot and nine isolated final reviewers are described by `final-dispatch.json` and `review-packet.md`. Combined pipeline FAIL and full whole-height source-aware experience INCOMPLETE remain explicit; final independent technical/visual reviews and any repair/review waves are the parent routing continuation. No user artifact opening or final milestone PASS is authorized yet.
