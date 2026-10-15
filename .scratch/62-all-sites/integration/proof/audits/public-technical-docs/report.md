# Public / technical documents — baseline page audit

**Verdict: INCOMPLETE for page acceptance.** Diagnosis/evidence is recorded for all four assigned pages; none is clean or accepted. There are **4 engine findings and 6 content findings**. No repairs or source edits were made. Final combined technical/experience review is still required.

Baseline: `403cd5be096db89b428e130ad57cca730b425fdc` (private immutable snapshot).
Evidence home: `/home/z/vibe/autofe-worktrees/62-all-sites/audit-public-technical-docs/.scratch/62-all-sites/audit-public-technical-docs`.
Machine handoff: `/home/z/vibe/autofe-worktrees/62-all-sites/audit-public-technical-docs/.scratch/62-all-sites/audit-handoff.json`.

## Coverage and exercised checks

| Page | 2560 / 1440 visual | 1920 | 390 visual | Source comparison |
|---|---|---|---|---|
| `gov-uk/ni-rates-letters` | Full-height content sheets read | Full capture + geometry; image not read | Full-height overlapping strips read | Whole-image overview + relevant DOM/table/action comparison |
| `gov-uk/register-birth-abroad` | Full-height content sheets read | Full capture + geometry; image not read | Full-height overlapping strips read | Whole-image overview + relevant DOM/table/action comparison |
| `learn-microsoft/vm-sizes` | Full-height content sheets read | Full capture + geometry; image not read | Full-height overlapping strips read | Whole-image overview + relevant DOM/table/action comparison; readable naming/general-purpose crops |
| `stripe-docs/payments` | Full-height content sheets read | Full capture + geometry; image not read | Full-height overlapping strips read | 900px captured viewport only; lower source groups DOM-only (INCOMPLETE visually) |

- Render sheets retain **100% page height** and the entire 1280px main frame; wider viewport side margins remain in the original screenshots and geometry evidence. These are not top-only captures. Mobile sheets use 1300px strips / 70px overlap, covering the complete document including its final utility region.
- Exactly **18 image reads**: 4 wide render sheets, 4 source overviews, 4 mobile sheets, 4 1440 render sheets, 2 readable Microsoft source crops. **3 browser jobs**, each one browser / one active page, all foreground and closed. No new screenshots touch source corpus or generated gallery.
- All sixteen capture geometries have document scrollWidth equal to viewport width and zero elements escaping the viewport. That does **not** establish readable internal table density or visual acceptance; Microsoft GPU table has bounded internal overflow.
- Four scoped validators passed. Microsoft retains two single-row-table warnings (`storage-optimized`, `fpga-accelerated`); warnings are not evidence of a new failure.
- Two NI tables and all eight Microsoft tables have source-equivalent textual cell grids after whitespace normalization. Crucially, Microsoft loses **127 table anchors** despite preserving all table text.
- Source-to-model / model-to-HTML actions were compared without opening destinations. Birth help has a reproducible source-backed mailto loss; Stripe also drops a local repeated group heading.
- Static foreground/background text probes at 2560 and390: GOV minimum5.72:1; Microsoft6.00:1; Stripe4.83:1. No sampled text pair below4.5:1. Native controls, borders, states and focus are not an exhaustive contrast assessment.
- Desktop centered outer whitespace is legitimate and **not** itself a defect. Wider semantic tables may be legitimate; findings concern title/body axes and inconsistent left edges between consecutive regions, not a demand for blanket centering, copying source pixels, or site-specific CSS. No Apple/full-bleed or accepted-reference pages were inspected or altered.

### Geometry / links / regions

| Page | Height2560 / 1920 / 1440 / 390 | Tables | Rendered anchors | Footer region |
|---|---:|---:|---:|---|
| `gov-uk/ni-rates-letters` | 2426 / 2426 / 2426 / 3025 | 2 | 3 | None in model/render |
| `gov-uk/register-birth-abroad` | 1525 / 1525 / 1525 / 2280 | 0 | 9 | None in model/render |
| `learn-microsoft/vm-sizes` | 2860 / 2860 / 2860 / 6333 | 8 | 0 | None in model/render |
| `stripe-docs/payments` | 1845 / 1845 / 1845 / 2832 | 0 | 32 | None in model/render |

The absence of footer/global chrome is recorded, not presented as a reviewed compact footer. Existing models contain no footer region; capture overviews contain original site chrome. This audit does not establish global-chrome completeness or authorize rebuilding cookie/header/footer systems.

## Findings / ownership

### E1 — engine / high
**Pages:** `gov-uk/ni-rates-letters`, `gov-uk/register-birth-abroad`, `learn-microsoft/vm-sizes`, `stripe-docs/payments`
**Criterion:** coherent whole-page alignment / hierarchy.
**Location:** `m1/render.mjs:715-720, 873-876, 925; m1/axis.mjs:805-816; .depth-0>.title and mixed .w-narrow/.w-wide sections`.

Desktop document titles and consecutive content sections use unrelated left edges. GOV and Stripe switch edges when the local representation changes; Microsoft keeps its table body axis but not its title axis. Birth lead is centered over the full frame although the source is a left-aligned document lead. This is not an objection to centered outer whitespace or to justified wider tables.

- **Rendered evidence:** All four *-2560-whole-content.png and *-1440-whole-content.png; birth 390-sheet also shows centered lead against left-aligned body.
- **Source evidence:** GOV source whole images have continuous main-column heading/body edges; Stripe source top starts at x328 for title/lead/options; Microsoft source naming-detail and general-purpose-detail preserve section/table association.
- **Geometry / reproduction:** measurements.json headings: at2560 title x960/w640; GOV wide x664/w1232 vs narrow x840/w880; Stripe sections alternate x840 and x664. At1920 corresponding x640,344,520; at1440 x400,104,280. Microsoft title x960 vs body x840. At390 section edges largely collapse to x16, but birth lead remains text-align:center.
- **Falsifiable improvement criterion:** Use one document-owned heading/lead/content axis inherited across local list/form/table/card renderings. Wider tables may widen only with explicit coherent heading/table alignment; retain legitimate centered page frame and brand differences. Recheck all four widths and seven accepted references, not a site-name template.

### E2 — engine / high
**Pages:** `gov-uk/register-birth-abroad`
**Criterion:** faithful actions / targets.
**Location:** `$.help._action; m1/axis.mjs:77, 400-401, 741-743, 757; .g-help .fact`.

The captured email action is in the model but renders as plain text, with no mailto anchor. hasTarget excludes mailto; inlineInto consumes the action despite href:null.

- **Rendered evidence:** gov-uk-register-birth-abroad-{2560-whole-content,1440-whole-content,390-sheet}.png; focused-probe.json has zero mailto links.
- **Source evidence:** corpus/gov-uk/register-birth-abroad/dom.html:262 has `<a href="mailto:Overseas.RegistrationUnit@fcdo.gov.uk">`; source whole image shows linked email.
- **Geometry / reproduction:** source-evidence.json: ten model actions, nine rendered anchors; mailto-repro.json: hasTarget:false, href:null, inlineInto:_summary, actionRow:[]. All captured widths lack target.
- **Falsifiable improvement criterion:** Preserve this source-backed email target as a uniquely discoverable inline anchor through the shared safe-target decision; add defect-detecting HTML/Markdown target proof without admitting unsafe protocols.

### E3 — engine / high
**Pages:** `stripe-docs/payments`
**Criterion:** closed shared-axis / heading-region association.
**Location:** `$._lines[6]._items[2]._name; m1/render.mjs:499-517; main > article > div > section:nth-of-type(7) > article > div > section:nth-of-type(3) > article`.

The local 更多指南/支付方式 heading is suppressed because a same-text heading appeared earlier. Its four bank/wallet links consequently read as continuation of 管理支付. Distinct fact-bearing subgroups are not redundant headings merely because their labels repeat.

- **Rendered evidence:** stripe-docs-payments-2560-whole-content.png bottom; 1440 whole-content; 390-sheet columns2-3.
- **Source evidence:** source-evidence.json source nodes: article[1]/div[2]/div[10]/div[2]/span[0], text 支付方式, x763.56/y1704.03; original DOM keeps five distinct 更多指南 groups. This is DOM evidence: the source PNG does not reach this scroll region.
- **Geometry / reproduction:** focused-probe.json: 更多指南 at y1362.5; 管理支付 at y1509.3; next article y1602.25 has heading:null and contains 银行卡/银行借记/银行重定向/钱包; API follows y1656.9. Model has distinct group name/action.
- **Falsifiable improvement criterion:** Keep a local group title or an equally explicit source-faithful boundary for these four links. Repeated labels in distinct populated regions must not erase their semantic parent; preserve all targets and HTML/Markdown/text grouping.

### E4 — engine / medium
**Pages:** `gov-uk/ni-rates-letters`, `learn-microsoft/vm-sizes`
**Criterion:** readable table density / responsive axes.
**Location:** `table.data th and td; m1/render.mjs:849-856`.

At390 long financial/technical headers and list values are squeezed into narrow columns rather than a readable table viewport. GOV last header becomes many isolated words; Microsoft long series and workload cells grow into tall one-to-two-word columns. No page overflow is not sufficient visual acceptance.

- **Rendered evidence:** gov-uk-ni-rates-letters-390-sheet.png first/second columns; learn-microsoft-vm-sizes-390-sheet.png all columns.
- **Source evidence:** Source NI and Microsoft screenshots/DOM are real multi-column tables with intact headers and lists; source mobile rendering is not available, so no claim of pixel-matched mobile design.
- **Geometry / reproduction:** measurements.json: GOV header height158px at390 vs40px desktop, last header width~83px; Microsoft general-purpose columns68/123/167px. focused-probe.json D-family row h779.52px mobile, page height6333 vs2860 desktop. GPU table already has small internal overflow (373px inside358px parent), unlike other compressed tables.
- **Falsifiable improvement criterion:** Retain all declared columns, associations and values while preventing header/technical-value compression into predominantly isolated-word lines. Provide coherent bounded table scrolling where required; no wrapping entities into another comparison row or silently discarding fields. Re-review mobile after link/content restoration.

### C1 — content / high
**Pages:** `gov-uk/ni-rates-letters`
**Criterion:** faithful source hierarchy / contextual facts.
**Location:** `$.example insertion order after $.class-1a-1b`.

Employee contribution Example appears after employer table and Class1A/1B rates, where its8%/2% calculation is detached from the employee table and can be mistaken for an example of15% employer/Class1A rates.

- **Rendered evidence:** gov-uk-ni-rates-letters-2560-whole-content.png bottom and390-sheet column3.
- **Source evidence:** corpus/gov-uk/ni-rates-letters/dom.html:372 Example precedes Employer heading:386. Source whole image shows employee table -> Example -> employer table -> Class1A.
- **Geometry / reproduction:** focused-probe.json: Employee y368.4; Employer y1191.9; Class1A y2015.5; Example y2165.4. Model key order matches wrong render order. Amounts themselves remain source-true.
- **Falsifiable improvement criterion:** Restore the source story sequence or containment associating this exact Example with employee contribution rates before employer content; keep exact£58.66/8%/2% facts, not invented explanatory copy.

### C2 — content / high
**Pages:** `gov-uk/ni-rates-letters`
**Criterion:** faithful facts / targets.
**Location:** `$.contribution-rates, $.employee-rates, $.employer-rates, $.class-1a-1b and bottom guide utilities`.

Several main-guide actions and one meaningful Class1A obligation are missing from the factual model: category-letter inline reference, past employee rates, HMRC historical tax-year rates, calculators/tables, expenses-and-benefits target, additional lump-sum/redundancy-payment obligation, and printable whole-guide utility. Existing Class1A detailed-guidance target is correctly retained, including its source2022-2023 slug; do not “correct” it by guessing a newer URL.

- **Rendered evidence:** gov-uk-ni-rates-letters all inspected widths: only3 anchors (Class1A detail plus two labels for one Next target); source table text itself matches.
- **Source evidence:** corpus/gov-uk/ni-rates-letters/dom.html:250,260,498-516,528; source-evidence.json matched main-guide anchors. Source states “They must also pay Class1A on some other lump sum payments, for example redundancy payments.”
- **Geometry / reproduction:** source-evidence.json has two model actions vs three rendered anchors, with absent source actions not encoded; table-fidelity.json confirms both17-row table text grids have zero differences.
- **Falsifiable improvement criterion:** Restore captured main-guide facts/actions in closed grammar with source URLs and associations; maintain compact guide utilities. Preserve exact captured2026-2027 rates and existing detailed-guidance target. Do not expand into cookie/global-site chrome reconstruction.

### C3 — content / high
**Pages:** `learn-microsoft/vm-sizes`
**Criterion:** faithful actions / targets.
**Location:** `$.vm-size-and-series-naming.name-structure-breakdown._items[*]._fields.links; $.families-by-type.*._items[*]._fields.family and series-list`.

All127 source table anchors have become inert field/list text. The displayed Links column promises navigation, and Enter the Series/Size tab here still instructs a non-existent action. The model contains zero _action entries and the rendering zero anchors: this is factual-target loss, not merely link styling.

- **Rendered evidence:** learn-microsoft-vm-sizes-2560/1440-whole-content and390-sheet; source-naming-detail and source-general-purpose-detail show blue anchors.
- **Source evidence:** corpus/learn-microsoft/vm-sizes/dom.html:345/350 ->#name-structure-breakdown;417 A-family ->general-purpose/a-family;419 Av2-series ->general-purpose/a-family#av2-series and End-of-Life target;429 Dsv7/Ddsv7 ->general-purpose/d-family#dsv7-series-and-ddsv7-series. Resolve relative URLs against captured redirected overview URL, not a guessed site base.
- **Geometry / reproduction:** table-fidelity.json source/render link counts for eight tables:8/0,34/0,11/0,30/0,9/0,24/0,2/0,9/0; table text rows/cells themselves all match after whitespace normalization.
- **Falsifiable improvement criterion:** Preserve each captured table destination and meaningful same-page target using existing closed values/actions and shared axes. If this cannot be represented without an escape hatch, route the precise grammar gap to engine rather than inventing presentation keys or dropping targets.

### C4 — content / high
**Pages:** `learn-microsoft/vm-sizes`
**Criterion:** faithful facts / meaningful media / hierarchy.
**Location:** `$.vm-size-and-series-naming.name-structure-breakdown and omitted article regions`.

Name structure breakdown incorrectly labels the Type/Series/Size classification table; source places that table before a separate named Series/Size explanation with a DCads_v5 diagram and five footnotes. Those source naming facts, caveat/naming-conventions link and diagram are absent. Intro/workload descriptions and later region-size lookup, REST API, benchmark, other-size-information and next-step body regions are also absent from the model. Do not treat the short table-only output as complete article preservation.

- **Rendered evidence:** learn-microsoft-vm-sizes-2560-whole-content.png (ends at High performance compute); learn-microsoft-source-naming-detail.png readable full diagram/explanation; source-whole.png overview shows lower article regions.
- **Source evidence:** corpus/learn-microsoft/vm-sizes/dom.html:325-382 naming structure,368 image media/size-series-breakdown.png and footnotes;738-770 lower article headings/body links. source-evidence.json contains exact headings/image attributes.
- **Geometry / reproduction:** Source img bbox x392/y2007.33/w655.97/h214.67; no rendered img. Source article10850px vs table-only render2860px is context, not a metric by itself. Model roots are only vm-size-and-series-naming/families-by-type.
- **Falsifiable improvement criterion:** Correct the classification-table/actual naming-section association and restore captured meaningful article facts/actions/media within closed grammar. Use existing source-attributable asset bytes and do not enlarge; local original media availability is unverified, so checkpoint missing assets instead of inventing/recapturing silently. Source video poster is also absent; its interaction/asset coverage needs explicit resolution.

### C5 — content / medium
**Pages:** `stripe-docs/payments`
**Criterion:** source-visible title hierarchy.
**Location:** `$._title.text`.

The model/visibleH1 uses the SEO document title “付款 | Stripe 文档” although the capture has a visible page title “付款”. This adds site-name SEO text to a content heading contrary to the visible-title rule. It is not the Apple/Taobao identity fix and does not justify a new site-name template.

- **Rendered evidence:** stripe-docs-payments-2560/1440-whole-content and390-sheet top.
- **Source evidence:** Source900px whole image shows visible付款 and separate使用Stripe开始接受支付。; source-evidence.json h1 text付款; corpus/dom.html:14.
- **Geometry / reproduction:** measurements.json H1 text付款|Stripe文档, font32px, x960/w640 at2560; root model text identical.
- **Falsifiable improvement criterion:** Use captured visible付款 as the page-title fact, retaining original document-title provenance in intent if needed; engine supplies any compact identity through approved shared semantics, not enlarged brand heading.

### C6 — content / medium
**Pages:** `stripe-docs/payments`
**Criterion:** cohesive source image/title/action / attribution.
**Location:** `$._lines[0] missing captured payments-hero image`.

The captured introductory payment hero illustration is completely absent from the model/render. Source puts the image beside the introduction and its source action; current intro is text-only. This is an image-preservation/cohesion gap, not evidence to make the image larger.

- **Rendered evidence:** stripe-docs-payments source-whole.png upper hero vs2560/1440-whole-content top; no rendered images at any width.
- **Source evidence:** corpus/stripe-docs/payments/dom.html:14 image https://b.stripecdn.com/docs-statics-srv/assets/payments-hero.84c749136bfe3d7c2b8495ef295c6d89.png; nodes bbox x877/y331.53/w500/h240.5. Source alt empty; do not invent factual alt description.
- **Geometry / reproduction:** measurements.json images:[] all widths; model no _image. Original asset byte availability/natural dimensions not established by this audit.
- **Falsifiable improvement criterion:** Use existing attributable asset bytes if available, associated with the captured intro/action and bounded by natural size (no enlargement). If original bytes unavailable, retain explicit incomplete-image coverage; do not guess a replacement or claim whole-image fidelity.

## Evidence / validation inventory

All finding screenshot names resolve under the evidence home above; source paths resolve in the audit worktree. `hashes.json` and machine handoff `coveredHashes` bind HTML, models, original DOM/nodes/full.png/meta, screenshots/derivatives, renderer/axis/validator/schema and the relevant owning decision documents.

| Artifact / command | Result / interpretation |
|---|---|
| `node .../capture.mjs` → `capture.log`, `measurements.json`,16PNG captures, `browser-errors.json` | Passed capture; zero page errors; not a visual PASS |
| `python .../source-evidence.py` → `source-evidence.json`, `source-summary.log` | Initial helper run failed on a trailing token; corrected owned helper and rerun passed. Public anchor/image evidence only, no iframe session parameters retained |
| Four `node m1/validate.mjs <model>` → `validators.log` | All passed; two existing Microsoft warnings |
| `node --input-type=module` shared-axis mailto reproduction → `mailto-repro.json` | Reproduced defect: hasTarget=false, href=null, inlineInto=_summary, empty actionRow |
| `node .../probe.mjs` → `focused-probe.json`, `probe.log` | Passed focused geometry/text contrast; corrected helper root selector and final run confirmed every recorded selector uniquely resolves |
| `table-fidelity.json` | NI2tables / Microsoft8tables textual grids equal; Microsoft table-link loss127 |
| `desktop-pixel-equivalence.json` | All comparisons false; differences limited to small raster regions, but no equality or1920 visual-PASS claim |
| `git diff --check`, index inspection, baseline hash recheck | Results recorded in local ticket / final-state evidence; no source edits or staging |

The diagnostic scripts live only in the evidence lane. No product tests were added/updated. No pipeline rendering, setup/bootstrap rerun, install/download, remote execution, source/media mutation, commit, publication or history rewrite was performed.

## Exact limits / next coverage

- 18/18 image reads used; three bounded sequential browser jobs used, all closed. No1920 direct visual reads; retained all four whole-height captures per page for continuation.
- Source Stripe full.png is1440×900 in a scroll container, not whole article; lower source rendered regions have DOM evidence but no image comparison.
- Long GOV/Microsoft source images were overview reads; readable Microsoft naming/general-purpose crops inspected. Remaining source fine-print/footer detail not independently readable at overview scale.
- All four models omit global header/footer regions. Captured site chrome seen in source overviews, but global chrome completeness is not established; no footer surface claim.
- No action destinations navigated or email client activated; only source/HTML/model target fidelity checked. No native-control interaction, hover/focus or screen-reader review.
- No source asset bytes/natural-size/attribution completeness verified for absent Microsoft/Stripe media. No rendered images exist on these four baseline pages.
- Static text foreground/background contrast probe only; border/focus/native-input and all state contrasts not assessed.
- No source/model/assets/owning Docs edits, tests added, integration, commits, setup reruns or final independent acceptance review performed. Findings apply only to baseline403cd5be096db89b428e130ad57cca730b425fdc.

**Recommended routing:** engine owns E1–E4; content owns C1–C6. C3 may require an explicitly recorded closed-grammar representation gap if existing types cannot preserve table destinations. Before user delivery, integrate scoped fixes, recapture affected widths, complete direct1920 visual coverage and missing source/media/footer modalities, then obtain fresh independent technical and experience review of the final combined revision. These baseline diagnostics do not accept future changes.
