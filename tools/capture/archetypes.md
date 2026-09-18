# Page archetypes (M0 corpus taxonomy)

Status: v1 seed. The taxonomy is the sampling stratum for the corpus; it is a data
contract for `tools/capture/sites.json` (each page entry names exactly one archetype
from this file). Names are stable identifiers — the CLI validates `sites.json`
archetype values against the `### \`name\`` headings below.

Why archetypes at all: the corpus must cover *structurally different* pages, not just
*different sites*. Extraction (M1+) and coverage claims (M3) are only meaningful if the
sample spans page shapes whose business-intent vocabulary differs.

| Archetype | Target pages | What it is expected to exercise |
|---|---|---|
| `landing/home` | 12 | Hero, primary CTA, navigation, marketing sections, trust signals |
| `product-detail` | 12 | One business entity, price/attributes, buy action, spec groups, reviews |
| `category/list` | 12 | Homogeneous item collection, filters, sorting, pagination/virtual scroll |
| `search-results` | 10 | Query echo, result ranking, facets, zero/partial states |
| `article/editorial` | 12 | Long-form content, byline/metadata, in-content actions, comments |
| `docs/design-system` | 15 | Deep navigation tree, code samples, tables of contents, versioning |
| `dashboard/data-viz` | 10 | Numeric KPI cards, charts, legends, time-range controls |
| `form/checkout/settings` | 12 | Label/control pairs, validation, multi-step flow, destructive actions |
| `profile/account` | 10 | Identity, tabs, activity lists, privacy/visibility affordances |
| `table-heavy/admin` | 12 | Dense tabular data, row actions, bulk selection, inline status |

Total target: ≥100 pages across ≥25 domains. Per-archetype counts are approximate and
are re-checked (and reported) before the full run — the pilot only needs ≥5 archetypes.

## Common shapes worth splitting later (out of scope for M0)

Recorded so they are not silently lost; each would need ≥N sites before it becomes a
stratum (per design-basis §3.6 reuse threshold):

- `pricing` (plan comparison matrices) — largely covered by `product-detail` + `table-heavy/admin`.
- `listing-detail` hybrid (category page with an inline detail panel) — seen on CN e-commerce.
- `video/player` — captured under `article/editorial` today (bilibili video pages); a player
  timeline has no equivalent vocabulary elsewhere.
- `auth/login` — captured under `form/checkout/settings` (passport/account pages).
- `error/404`, `state/empty` — required by design-basis §3.1 (empty/loading/error/partial);
  M0 captures reachable pages only, so these are currently unsampled. Add during M1 by
  faking network states, not by seeking 404s.

## Fields recorded per page (in `sites.json`)

- `slug` — stable page id, used as the output directory name.
- `url` — absolute URL to capture.
- `archetype` — exactly one name from the table above.
- `note` — free-text, why this page is in the sample (e.g. "CN-specific density").

Per site: `slug`, `domain`, `origin`, `region` (`CN` / `global`), `language`,
`industry`, `styleTag`. `region` + `industry` + `styleTag` are the secondary strata so
that the sample can be re-balanced once extraction starts (§7 requires the oracle to be
independent of layout, so the sample must not be layout-homogeneous either).
