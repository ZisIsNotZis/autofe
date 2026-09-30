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
