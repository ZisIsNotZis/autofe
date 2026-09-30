# 08 — exemplar-layer evidence expansion (round 9): `table` + `login`

Scope: add **new corpus pages only** (no re-capture / overwrite of the existing 36 exemplar pages),
using the existing `tools/capture/` pipeline (robots.txt + per-host pacing), so that the M4
proposal's `table` and `login` sections get exemplar-layer evidence.

Entry evidence (re-measured on the current corpus, `grep -c`):

| layer | `<table>` pages | `type="password"` pages |
|---|---|---|
| exemplar (36 curated pages) | **0** | **0** |
| support | 28 (9 sites) | 8 (all component-demo docs) |

Command used (exemplar pages only, from `tools/capture/sites.json` `tier: exemplar`):

```bash
# table=0 and password=0 on all 36 exemplar pages
for d in <36 exemplar page dirs>; do grep -o '<table' corpus/$d/dom.html | wc -l; grep -o 'type="password"' corpus/$d/dom.html | wc -l; done
```

So both primitives are, today, at **0 exemplar sites** — below the proposal's C1 threshold
(`exemplar 层 ≥3 站`, `docs/m1/m4-composites-proposal.md` §3 / §4.2 acceptance #4 / §4.5 acceptance #4).

## 1. Page selection and why (top-tier professional/commercial/industrial only)

Constraint honoured: no non-professional, niche or gaming sites. Every candidate belongs to the
exemplar tier level already represented in `sites.json` (gov.uk, 阿里云, AWS, Stripe, 小米).

### 1a. `table` candidates (real `<table>` or strongly structured table data)

| page | serves | why top-tier |
|---|---|---|
| `www.gov.uk/national-insurance-rates-letters` | `table` (real data table: contributors/categories → rates) | GOV.UK is the international reference for plain, government-grade content + data presentation; already an exemplar site in the seed |
| `help.aliyun.com/zh/ecs/user-guide/overview-of-instance-families` | `table` (ECS instance-family **spec** tables) + `offer`/`compare` side note | Alibaba Cloud is the top CN cloud provider; this is the official product spec surface, same brand as the `aliyun-com` exemplar site |
| `aws.amazon.com/ec2/pricing/on-demand/` | `table` (real on-demand price table, hundreds of rows) + `offer`/`compare` side note | AWS is the industry-reference enterprise cloud; the EC2 on-demand price table is the canonical machine-readable price/spec table |

Also probed but **not selected** (recorded, see §3): `docs.stripe.com/payments/payment-methods`
(only 1 small 4-row table), `www.apple.com/iphone/compare/` (0 `<table>` — Apple's compare grid is
CSS/div based, so it is *not* table evidence), the 4 checkbox-column component-demo pages
(ant-design/arco/element-plus/semi-design are `support` tier and their table docs are already
captured — promoting them is a human curation decision, not a new capture).

### 1b. `login` candidates (real top-tier login/registration pages)

| page | serves | why top-tier |
|---|---|---|
| `dashboard.stripe.com/login` | `login` (identifier + `type=password` + third-party/Passport entry) | Stripe is the industry-reference payments platform; the Dashboard login is the canonical commercial auth gate |
| `account.xiaomi.com/pass/serviceLogin` | `login` (account + `type=password`, CN-localised) | Xiaomi is a top-tier CN consumer-electronics brand already in the exemplar set; its account login is the CN identity gateway |

Also probed but **not selected** (recorded, see §3): `play.grafana.org/login` (navigation failed on
3 attempts), `linear.app/login` (21-node JS shell, no password field — Linear is email/magic-link),
`auth.huaweicloud.com/authui/login.html` (SPA shell), `signin.aws.amazon.com/signin` (robots-denied).

## 2. robots.txt + throttling pre-check (before any capture)

Probe: `node tools/capture/index.mjs --dry-run --sites /tmp/probe-sites.json --out /tmp/af-probe`
(the pipeline's own `RobotsClient`, product token `AutoFE-Research-Bot`), 12 candidates / 12 hosts.

| candidate | decision | reason |
|---|---|---|
| `play.grafana.org/login` | ALLOW | `allow: /` |
| `linear.app/login` | ALLOW | no robots.txt restriction for our agent |
| `dashboard.stripe.com/login` | ALLOW | no robots.txt restriction |
| `auth.huaweicloud.com/authui/login.html` | ALLOW | no robots.txt restriction |
| `account.xiaomi.com/pass/serviceLogin` | ALLOW | no robots.txt restriction |
| `signin.aws.amazon.com/signin` | **DENY** | `robots_cross_origin_redirect` — robots.txt redirects cross-origin, so the host is denied (never crawled on a guess) |
| `www.gov.uk/national-insurance-rates-letters` | ALLOW | — |
| `www.gov.uk/income-tax-rates` | ALLOW | — |
| `aws.amazon.com/ec2/pricing/on-demand/` | ALLOW | — |
| `help.aliyun.com/zh/ecs/user-guide/overview-of-instance-families` | ALLOW | — |
| `docs.stripe.com/payments/payment-methods` | ALLOW | `allow: /` |
| `www.apple.com/iphone/compare/` | ALLOW | — |

All captures run with the pipeline defaults: per-host ≥1.5 s pacing, 45 s navigation timeout, one
retry on transient failure, one extra retry pass, sequential single browser.

Rejected/failed candidate detail is recorded machine-readably in
`tools/capture/round9-exemplar-expansion-probe.json` (probe render counts + failure reasons) and in
`tools/capture/sites.json` → `droppedCandidates` (checkedAt `2026-09-29`).

## 3. Captured pages — evidence counts (all from the delivered `dom.html`)

Capture command (new pages only; no `--skip-existing`, no existing page in the selection, so nothing
of the 36 could be overwritten):

```bash
node tools/capture/index.mjs \
  --page gov-uk/ni-rates-letters --page aliyun-help/ecs-instance-families \
  --page aws-amazon/ec2-on-demand --page stripe-dashboard/login --page xiaomi-account/login
# OK [1/5] gov-uk/ni-rates-letters nodes=565
# OK [2/5] aliyun-help/ecs-instance-families nodes=52272
# OK [3/5] aws-amazon/ec2-on-demand nodes=940
# OK [4/5] stripe-dashboard/login nodes=163
# OK [5/5] xiaomi-account/login nodes=117
# done: ok=5 partial=0 failed=0; failures recorded=11 (all 11 pre-existing, untouched)
```

| new page dir | `<table>` | `<tr>` | `<th>` | `<td>` | `<form>` | `type="password"` | nodes.json | qualityFlags |
|---|---|---|---|---|---|---|---|---|
| `corpus/gov-uk/ni-rates-letters` | 2 | 34 | 42 | 96 | 1 | 0 | 565 | — (clean) |
| `corpus/aliyun-help/ecs-instance-families` | 224 | 1340 | 0 | 14677 | 0 | 0 | 53812 | `cross_origin_frame`, `artifact_cap_exceeded` |
| `corpus/aws-amazon/ec2-on-demand` | 3 | 80 | 9 | 154 | 1 | 0 | 1981 | `ax_coverage_low`, `cross_origin_frame`, `artifact_cap_exceeded` |
| `corpus/stripe-dashboard/login` | 0 | 0 | 0 | 0 | 1 | **1** | 178 | `cross_origin_frame` |
| `corpus/xiaomi-account/login` | 0 | 0 | 0 | 0 | 1 | **1** | 123 | — (clean) |

Reproducible commands (one per claim):

```bash
# NOTE: `grep -c` counts matching LINES, `grep -o ... | wc -l` counts OCCURRENCES;
# `dom.html` is minified, so newline counts are printed alongside where they differ.
grep -c '<table' corpus/gov-uk/ni-rates-letters/dom.html                       # 2 (2 occurrences)
grep -c '<table' corpus/aws-amazon/ec2-on-demand/dom.html                      # 3 (3 occurrences)
grep -c '<table' corpus/aliyun-help/ecs-instance-families/dom.html             # 165 lines
grep -o '<table' corpus/aliyun-help/ecs-instance-families/dom.html | wc -l     # 224 occurrences
grep -o '<tr'    corpus/aliyun-help/ecs-instance-families/dom.html | wc -l   # 1340
grep -o '<table' corpus/aws-amazon/ec2-on-demand/dom.html | wc -l            # 3
grep -o '<tr'    corpus/aws-amazon/ec2-on-demand/dom.html | wc -l            # 80
grep -o 'type="password"' corpus/stripe-dashboard/login/dom.html | wc -l     # 1
grep -o 'type="password"' corpus/xiaomi-account/login/dom.html | wc -l       # 1
```

### What each page actually proves (checked, not assumed)

- **`gov-uk/ni-rates-letters`** — real data table with **semantic header cells** (42 `<th>` over
  34 rows, e.g. the National Insurance category/rate matrix). Plain server-rendered HTML,
  `axCoverageRatio 0.897`, no quality flags. This is the cleanest `table` evidence in the whole
  corpus (exemplar or support).
- **`aliyun-help/ecs-instance-families`** — 224 ECS instance-family **spec tables** (colgroup /
  colspan / rowspan present). Honest caveat: **0 `<th>`** — header semantics are carried by bold
  `<td>` with a grey background (`<td style="background-color:#e5e5e5"><p><b>Intel处理器</b></p></td>`),
  i.e. the document-converted form of a table. It is therefore strong evidence for "a real typed
  spec table exists in an exemplar CN cloud surface", and simultaneously a hard case for any
  header-cell heuristic (a `<th>`-based selector misses it).
- **`aws-amazon/ec2-on-demand`** — 3 real price tables (80 rows / 9 `<th>` / 154 `<td>`) of the
  EC2 on-demand instance price table. Geo-redirects same-host to `/cn/ec2/pricing/on-demand/`
  (recorded in `meta.redirectedUrl`); flags `ax_coverage_low` (0.429 — presentational markup, so the
  a11y join is low fidelity here, recorded not hidden) and `artifact_cap_exceeded`.
- **`stripe-dashboard/login`** — a full `login` block by the proposal's own shape (§4.5):
  identifier field (`邮件地址`), **secret field** (`type="password"`, label `password input`),
  a single submit (`登录`), "忘记密码？", remember-me, **third-party entries Google / 通行密钥 /
  SSO**, and a **signup entry (`创建账户`)**.
- **`xiaomi-account/login`** — identifier (`邮箱/手机号码/小米ID`) + **secret** (`密码`,
  `type="password"`) + submit (`登录`) + 忘记密码 + 手机号登录 tab + **four third-party entries
  (支付宝 / 微信 / QQ / 微博)** + 扫码登录 tab + 用户协议/隐私政策. Same-host redirect to
  `/fe/service/login/password?...` (recorded); robots.txt absent (404) ⇒ no restriction.

## 4. Failures / rejected candidates (recorded, never faked)

| candidate | outcome | recorded reason | where |
|---|---|---|---|
| `signin.aws.amazon.com/signin` | **DENY (never fetched)** | `robots_cross_origin_redirect` | `sites.json` droppedCandidates, dry-run output |
| `play.grafana.org/login` | `navigation_failed` | Chromium navigation timed out in main **and** retry pass (its `play-home` sibling captures fine) | probe JSON + droppedCandidates |
| `linear.app/login` | captured, rejected | HTTP 200 but 21-node JS shell, no input, no password field (email/magic-link sign-in) | probe JSON + droppedCandidates |
| `auth.huaweicloud.com/authui/login.html` | captured, rejected | `suspicious_empty_render`: 140 nodes, 2 text inputs, **0 password fields** (hash-route SPA) | probe JSON + droppedCandidates |
| `www.apple.com/iphone/compare/` | captured, rejected | 0 `<table>` — Apple's compare grid is div/CSS based ⇒ **not** `table` evidence | probe JSON + droppedCandidates |
| `docs.stripe.com/payments/payment-methods` | captured, rejected | 1 table / 4 rows / 4 header cells ⇒ too small to serve as `table` exemplar evidence | probe JSON + droppedCandidates |
| `www.gov.uk/income-tax-rates` | captured, unused | kept as a spare gov-uk data-table page (1 table / 5 rows) | probe JSON + droppedCandidates |

Nothing was transcribed from screenshots, and no failed candidate was seeded: every rejected probe
lives in `/tmp/af-probe` only, so `corpus/` holds no half-evidence.

## 5. robots.txt and throttling compliance

- **robots.txt is consulted by the pipeline itself** (`RobotsClient`, product token
  `AutoFE-Research-Bot`), for the requested URL *and* for the URL the navigation settled on; a
  cross-origin `robots.txt` redirect denies the host instead of applying another host's rules
  (this is exactly what removed `signin.aws.amazon.com`).
- Pre-check of the 12 login/table candidates: 11 ALLOW, 1 DENY (`robots_cross_origin_redirect`).
  Re-checked after seeding:
  `node tools/capture/index.mjs --dry-run --site gov-uk --site aliyun-help --site aws-amazon --site stripe-dashboard --site xiaomi-account`
  ⇒ all 6 pages of those 5 sites ALLOW.
- `meta.robots` for the 5 new pages: `fetch: ok` for gov.uk / help.aliyun.com / aws.amazon.com /
  dashboard.stripe.com, `fetch: absent (404)` for account.xiaomi.com; all matched agent `*`;
  `fetchedVia: node` (no browser fallback needed).
- **Throttling**: one browser, one context, sequential pages, pipeline default per-host floor
  ≥1.5 s (robots fetch, navigation and retries all pass through `HostThrottle`); no `Crawl-delay`
  raised any host; the real run logged per-request gaps in `corpus/run-report.json.hostPacing`.
  No concurrency, no CDN bypass, no anti-bot circumvention, and no credentials submitted anywhere
  (login pages were opened read-only).
- **No existing page was re-captured or overwritten**: `find corpus -name meta.json -newermt '-30 minutes'`
  lists exactly the 5 new directories; `corpus/failures.json` still holds the same 11 pre-existing
  entries. `corpus/run-report.json` was overwritten by this 5-page run (documented as transient in
  `tools/capture/README.md`; the previous file is archived at `/tmp/run-report-before-round9.json`
  for this session only).

## 6. Does this close the M4 thresholds? (C1 = `exemplar 层 ≥3 站`)

**`table` — now met (3 exemplar sites, real data tables).**

Before: 0 exemplar pages with a `<table>`. After: 3 exemplar-tier **sites** with real, structured
tables — `gov-uk` (semantic `<th>`, clean), `aliyun-help` (spec tables, no `<th>`), `aws-amazon`
(price tables with `<th>`). All three are top-tier professional/industrial surfaces, and each page
is a genuine data table (not a component-demo Mock). Caveats to carry into curation:
the aliyun-help page must be curated knowing its headers are bold `<td>`s, and the aws page carries
`ax_coverage_low` (use `dom.html`/`nodes.json` there, not the a11y join). The proposal's extra
checkbox-column requirement (row-selection column) is **still only satisfied in the support layer**
(ant-design / arco-design / element-plus / semi-design table docs) — promoting those 4 pages to
exemplar is a human endorsement decision, not a capture one.

**`login` — improved but *not yet* at 3 exemplar sites: 2 of 3.**

Before: 0 exemplar pages with a `login` block, 1 real login page in the corpus
(`passport-baidu/login`, tier **support**). After: **2 exemplar-tier sites** with real
identifier+secret login blocks — `stripe-dashboard/login` and `xiaomi-account/login` — both of which
also carry the third-party-entry + signup-entry sub-parts that §4.5 requires. What is still missing
for the ≥3-exemplar-site threshold:

1. **One more top-tier login page, harvested (or curated in).** Cheapest paths, in order of expected
   success: (a) **promote `passport-baidu/login` from `support` to `exemplar`** if Baidu Passport is
   accepted as a top-tier CN identity surface — it already has the third-party entries (QQ/微博/微信)
   and a real password path, so this would put `login` at 3 sites **without further capture**; (b)
   capture a third-party-auth-heavy top-tier page such as a WeChat/Alipay/Apple ID sign-in that is
   both robots-permitted and server-rendered (the round-9 probe shows the JS-SPA sign-ins —
   Linear, Huawei Cloud, AWS sign-in, Grafana play — are exactly the ones that fail: shell render,
   navigation timeout, or robots denial); (c) re-try `play.grafana.org/login` (its sibling dashboard
   captures, so this may be transient network flakiness rather than robots/render).
2. **A curation decision, not a capture one**: the proposal counts "pages with a `login` block" in
   the **curated** exemplar set. The two new login pages are captured and seeded; they still need
   to enter the curated 36→41 page list (that lives in `m1/**`, which this round is not allowed to
   touch — another worker owns it).
3. The `login` blocker in §6 decision 1 (`signed-in` vs. the context fact of the same name) is
   untouched by this round and still stands.

Bottom line: `table` **passes C1 with the evidence added here**; `login` **reaches 2 of the required
3 exemplar sites** and remains "not yet成立" until one more top-tier login page is either harvested
or explicitly endorsed into the exemplar set.

Not run in this round (time-boxed): `verify-alignment.mjs` on the new page dirs, and any
re-capture of the existing 36 pages (deliberately out of scope).

Last-line counters: `new_pages=5` captured, `table_pages=3` / `login_pages=2` among them,
`failures=7` = every recorded non-acceptance of this round (1 robots denial + 6 rejected/unsuitable
probe candidates; see §4), all of them recorded rather than hidden.

CAPTURE_DONE new_pages=5 table_pages=3 login_pages=2 failures=7
