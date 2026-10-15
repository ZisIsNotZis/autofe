# All existing curated gallery pages — execution packet

## Objective / user authority
One delivery milestone: optimize and verify all 35 remaining pages in the existing 42-page user-facing curated gallery, plus compact, content-edge-aligned Apple/Taobao root site identities. Deliver a focused human-viewable gallery. Main routes work/reviews only; no children, intermediate user gates, or routine user progress. Setup does not implement or conduct a page audit.

User confirmations (owning current facts: `docs/m1/layout-axes.md`): the known seven otherwise look good; preserve their current accepted experience. Apple original full-bleed black panels reaching viewport edge are allowed, not intrinsically defective. Neither restoring full-bleed nor reverting accepted design is required. Site identity is not an arbitrary giant page heading. Do not add sites or auxiliary auto snapshots to user delivery.

## Full acceptance / proof obligations
- Meaningful, coherent end-to-end pages; consistent page-level alignment across forms; compact utility navigation/footer; paired background/foreground contrast; coherent image/title/action grouping; readable density; no arbitrary huge brand headings. Preserve brand-appropriate variation: neither indiscriminate centering nor forced redesign.
- Inspect actual rendered whole height at **2560 / 1920 / 1440 / 390px**, including each region/footer; use overlapping readable image strips/crops when a long-page thumbnail cannot show detail. Bind screenshots and measurements to exact HTML/source/model hashes. Mark each page/width/source modality checked or incomplete; never infer experience PASS from geometry.
- Full source/image comparison where relevant, from existing `corpus/<site>/<page>/{dom.html,nodes.json,full.png}` and actual associated assets. No enlarged images, invented source facts, lost actions/facts, site-specific CSS, model presentation escape hatches, or closed-grammar bypasses.
- Existing gates are necessary, not sufficient: pipeline fidelity (HTML + Markdown), validators/self-tests, capture integrity, screenshot/HTML hashes, visual self-audit and targeted defect-detecting tests. Exercise preservation of all actions and image attribution, not only text fidelity. Scoped `git diff --check` and final working-tree hashes required.
- Fresh independent technical **and experience** review at final combined revision, covering all 42 pages: 35 optimized pages plus seven accepted-reference regressions and the two identity fixes. Initial audits are diagnostics, not acceptance reviews of future fixes. Any repair invalidates affected review/proof; Main routes fresh review/delta coverage. No independent review available means infrastructure-blocked/unverified, not self-review PASS.
- Final human-viewable gallery must link live/full page and actual whole-page evidence, preserve the established curated roster, and disclose material residual/unexercised limitations. Delivery remains incomplete until full agreed acceptance, not merely a package finish.

## Scope reconciliation / exact roster
Authoritative implementation seams: `m1/eval/pipeline.mjs` selects `tier === 'exemplar'` rows from `m1/eval/m3-scale.json`; `m1/curated/renders/index.html` is actual curated gallery. Reconcile against curated `*/*.json` and `renders/manifest.json`. Expected and verified setup cardinality is 42 = 35 remaining + 7 accepted references; exact machine roster/proof is `roster.json`. 68 scale support rows/auxiliary generated snapshots are non-deliverables. Source captures exist for all curated pages. No new collection or site expansion.

| Page | Coverage owner |
|---|---|
| `36kr-com/home` | audit-36kr-news-search |
| `36kr-com/information-technology` | audit-36kr-news-search |
| `36kr-com/search-ai` | audit-36kr-news-search |
| `36kr-com/search-viz` | audit-36kr-news-search |
| `airbnb-com/room-28871` | accepted reference; engine regression + final independent review |
| `aliyun-com/home` | audit-cloud-business |
| `aliyun-com/product-ecs` | audit-cloud-business |
| `apple-com-cn/iphone-17` | audit-apple-linear-products |
| `apple-com/home` | accepted reference + engine identity fix; final independent review |
| `apple-com/ipad-air` | accepted reference; engine regression + final independent review |
| `apple-com/iphone-16` | audit-apple-linear-products |
| `apple-com/macbook-air` | audit-apple-linear-products |
| `aws-amazon/ec2-on-demand` | audit-cloud-business |
| `bilibili-com/home` | accepted reference; engine regression + final independent review |
| `bilibili-com/read-home` | audit-media-auth-utility |
| `bilibili-com/video-bv1gj411x7h7` | audit-media-auth-utility |
| `github-com/login` | audit-media-auth-utility |
| `gov-uk/ni-rates-letters` | audit-public-technical-docs |
| `gov-uk/register-birth-abroad` | audit-public-technical-docs |
| `grafana-play/play-home` | audit-cloud-business |
| `huawei-cn/consumer-phones` | audit-huawei-commerce |
| `huawei-cn/home` | audit-huawei-commerce |
| `huawei-cn/search-laptop` | audit-huawei-commerce |
| `huawei-cn/search-phone` | audit-huawei-commerce |
| `learn-microsoft/vm-sizes` | audit-public-technical-docs |
| `linear-app/home` | audit-apple-linear-products |
| `mi-com/home` | audit-mi-commerce |
| `mi-com/product-detail-mi15` | accepted reference; engine regression + final independent review |
| `mi-com/search-earbuds` | audit-mi-commerce |
| `mi-com/search-phone` | audit-mi-commerce |
| `mi-com/shop-category-list` | audit-mi-commerce |
| `sspai-com/home` | audit-sspai-editorial |
| `sspai-com/matrix` | audit-sspai-editorial |
| `sspai-com/post-102392` | audit-sspai-editorial |
| `sspai-com/post-114699` | audit-sspai-editorial |
| `sspai-com/post-114716` | accepted reference; engine regression + final independent review |
| `sspai-com/u-jtc092al` | audit-sspai-editorial |
| `stripe-com/pricing` | audit-cloud-business |
| `stripe-dashboard/login` | audit-media-auth-utility |
| `stripe-docs/payments` | audit-public-technical-docs |
| `taobao-com/home` | accepted reference + engine identity fix; final independent review |
| `xiaomi-account/login` | audit-media-auth-utility |

## Seams / lanes / interfaces (classified before writers)
See `lane-board.md` for exclusive ownership, coverage, dependency DAG and integration responsibility. **Engine/rendering/decision/test/docs is one tightly coupled shared seam**, one engine writer/integrator. **Curated factual models/assets is an independent seam**, one content writer. Audit workers own ONLY their lane findings/evidence/tickets; baseline source and generated gallery are read-only. Main is routing owner, not an implementation/integration fallback.

- Engine owns site-identity rendering, shared structure/axis/layout/surface rules, tests/gates, owning docs, generated final outputs/focused gallery and combined integration. `apple-com/home.json` / `taobao-com/home.json` title models are reserved to engine; any necessary factual change to them requires explicit cross-lane interface, not unilateral content edits. Content changes no other shared artifacts.
- Content owns only other curated factual JSON and curated assets, with capture provenance; no presentation metadata, renderer/tests/docs, or two reserved models. Deliver a path-allowlisted patch, per-change provenance, validator/capture checks and revision hashes. No genuine factual correction needed => documented no-op.
- Audits report page/width, severity, selector/model path, source/image evidence, actual local screenshots/measurements and hashes, likely seam and falsifiable improvement criterion. Shared-engine findings need no model rewrite; model findings need source support. Initial audits may run concurrently with engine/content work only in separate worktrees; diagnostics stay bound to immutable baseline.
- Integration path: audit findings -> respective seam writer -> engine combines bounded content patch -> full 42-page proof -> Main routes fresh independent technical/experience review -> in-scope repair/fresh re-review -> focused gallery single delivery. Later workers never overwrite old reference evidence or treat stale baseline audit images as final-fix proof.

## Baseline / preservation
Integration tree is dirty `master` at `aaf3a4509321b4720935852068b1f99b801dd9f9`. All existing dirt/untracked reference evidence stays in place. Setup changes only owning docs and this work's records/active link. Private parentless baseline `refs/autofe-private/62-all-sites-baseline` captures exact raw bytes/modes of allowlisted current source/docs/tools/generated references, including untracked `m1/media-surfaces.json` and `.scratch/60-seven-polish` / `.scratch/61-wide-screen`. Exact commit/tree/hashes: `baseline.json` / `baseline-files.json`. Baseline excludes all `.pi` session data, unrelated work records/caches/secrets and corpus duplication; local signature scan is documented, not a universal guarantee. Never move/rewrite/publish this private ref. No master commit/staging/reset.

All ten worktrees originate at the same baseline commit in `/home/z/vibe/autofe-worktrees/62-all-sites/`. Original `corpus` is symlinked for **read-only use by contract** (no OS-enforced write protection is claimed; never chmod shared originals). New screenshots/logs belong ONLY to each lane's own `.scratch/62-all-sites/<lane>/`; no shared evidence writes. Setup `dispatch.json` and board are Main's durable routing inputs. Any scoped local recovery commit must first check secrets; no publication or integration-branch commit authority.

## Resources / finite continuation
Setup measurement: 12 available CPUs; 125GiB RAM total / about 86GiB available; 253GiB free on project disk; host load approximately 9.24/8.46/10.91. Choose **8 useful concurrently active lanes**, bounded to one browser/one active page each (max 8 browsers); no hidden browser fanout. Memory/disk accommodate ten ~207MiB snapshots comfortably. Parent may remeasure pressure and reduce active browser count for observed contention; no arbitrary tiny conservation default. Audits can occupy all eight slots initially; starting both writers leaves six audit slots. After baseline creation independent lane work can overlap; source/output writes never share a worktree.

- Audits: 40-minute bounded lane slice; command deadlines <=180s; page-level checkpoints; checkpoint by minute 35. Each cohort 4–5 pages; inspect image batches <=4 then persist.
- Engine: 60-minute bounded slice, commands <=600s; checkpoint by minute 50. Content: 45-minute bounded slice, commands <=300s; checkpoint by minute 35.
- Combined integration proof: 45-minute slice; independent final review cohort: 45-minute slice each, commands <=600s; checkpoint ten minutes before slice end. These are execution budgets, never relaxed acceptance thresholds. Main routes finite continuation/replacement using exact unresolved page/width/criterion and saved hashes; initial package budget exhaustion is incomplete, not objective failure.
- Observable continuation/completion: foreground commands only or explicitly verified bounded continuation; local ticket + findings/proof path + concise control signal to Main. No child launches, unattended detached jobs, or unbounded retry loops. After two no-progress attempts on the same infrastructure/approach, checkpoint exact failure and route an alternative in-scope approach/continuation to Main; never silently use another CLI/provider. User-only/safety/authority blocker => pause dependent work and escalate specifically.

## Local toolchain / relevant prior evidence
Existing Node v24.18.1 and installed playwright-core at `/home/z/.local/share/fnm/node-versions/v24.18.1/installation/lib/node_modules/@playwright/mcp/node_modules/playwright-core`; Chromium headless shell `/home/z/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell`. No install/download/dependency/provider change required or authorized.

Relevant prior evidence: `.scratch/60-seven-polish/proof.md`, `.scratch/61-wide-screen/proof.md`, their scripts/measurements and original screenshots (preserved). Their limited prior Eager checks do NOT satisfy this task's final independent review/whole-height coverage; do not rewrite historical proof. Current owning rules: `docs/m1/layout-axes.md`, `docs/m1/axioms-v0.md`, existing closed registries and validator. Example local commands (run in your own CWD with evidence paths): `node m1/eval/pipeline.mjs --check-shots` (read-only baseline hash gate); `node m1/eval/pipeline.mjs --shots` (engine/integrator output owner only); `node m1/validate.mjs <owned-model.json>`; reuse read-only reference verify script patterns but put all new output under your lane record. Audits must not run pipeline rendering that mutates source/generated gallery: inspect baseline HTML or copy it to owned evidence for supplemental viewport captures.
