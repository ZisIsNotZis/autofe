# Cloud/business baseline audit

**Diagnosis completed; experience acceptance INCOMPLETE.** No source/model/gallery changes. Baseline `403cd5be096db89b428e130ad57cca730b425fdc`.

Machine handoff: `.scratch/62-all-sites/audit-handoff.json` in this isolated worktree. Evidence root: `/home/z/vibe/autofe-worktrees/62-all-sites/audit-cloud-business/.scratch/62-all-sites/audit-cloud-business`.

## Inspected coverage

| Page | 2560 / 1440 whole height | Source whole-height capture | 1920 / 390 |
|---|---|---|---|
| `aliyun-com/home` | Sheets inspected | Inspected; selective DOM/node detail |1920 geometry only;390 geometry only |
| `aliyun-com/product-ecs` | Sheets inspected | Inspected; selective DOM/node detail |1920 geometry only;390 lower comparison crop + geometry |
| `aws-amazon/ec2-on-demand` | Sheets inspected | Inspected; selective DOM/node detail |1920 geometry only;390 geometry only |
| `stripe-com/pricing` | Sheets inspected | Inspected; selective DOM/node detail |1920 geometry only;390 geometry only |
| `grafana-play/play-home` | Sheets inspected | Inspected; selective DOM/node detail |1920 geometry only;390 whole-height visual + geometry |

20 full-height screenshots,18 image reads,2 sequential browser jobs. Screenshot/model/HTML/source hashes and detailed section/table/image boxes are retained; no image-upscaling, broken images or viewport overflow detected at any measured width. These facts are not visual acceptance.

## Findings

| ID / seam | Severity | Finding |
|---|---|---|
| CB-E1 / engine | medium | Aliyun sections reset their left edge with shape. ECS features/news step inward from site/table frame. Most clearly, Grafana banners sit 176px left of its toolbar and panel grid despite belonging to one compact dashboard region. |
| CB-E2 / engine | high | ECS technical architecture diagram becomes the first enormous full-viewport image, displacing product summary and purchase far below the title. Aliyun home globe image dominates its closing region; stats and CTA then hug viewport left while the following service region abruptly returns to a narrow inner frame. |
| CB-E3 / engine | high | Seven model navigation destinations disappear completely. Render emits only radio label/value controls; it contains neither href nor any copy of those seven destination URLs. Facts-only fidelity reports 1.00 despite this loss. |
| CB-E4 / engine | high | Pale captured dark-theme link color survives on a white rendered surface; both banners are visibly barely legible. |
| CB-E5 / engine | medium | Renderer shows separate “Enter edit mode” and “Edit” pill controls for one source Edit button. Mobile wraps them as two controls, increasing utility height. |
| CB-E6 / engine | medium | Section labels such as 信用卡和借记卡, 银行和其他支付方式, 争议, 争议受理费, Tax Basic details shrink to 10.72px despite governing16px body text and pricing. Long catalog needs a clear hierarchy, not smaller-and-smaller headings. |
| CB-E7 / engine | medium | Contact sales appears as a bold definition heading followed by an empty .defval. Primary “立即开始” lives below the whole customer/document deflist. The contact target exists, but its control affordance is misleading and the CTA group is separated by unrelated fact rows. |
| CB-C1 / content | high | Root buy and four instance buy links render to www.aliyun.com/product/ecs/buy and invented-looking spec=e/u2a/c9i/g9i routes absent from both source DOM and nodes. |
| CB-C2 / content | high | Offers display bare ¥99,¥1438.68,¥3459.9 with no annual duration; source purchase period and ￥99.00/1年起 qualifier are intentionally not modeled, according to current _intent. Amount fidelity1.00 does not prove offer fidelity. |

Every finding in the machine handoff includes criterion, exact selector/model path, render/source/geometry evidence, artifact paths and a falsifiable improvement criterion. Key evidence:

- Grafana link contrast: **1.59:1**, foreground `rgb(204,204,220)` on white at all four widths (`targeted-probes.json`). Source is dark; pair foreground/surface rather than transplanting one.
- Aliyun home: **seven model tab destinations disappear** into radio-only markup; text fidelity still reports1.00 (`action-target-checks.json`).
- ECS source purchase href is `https://ecs-buy.aliyun.com/buyRedirect.htm?period=1&periodType=Yearly`; root and four modeled `/product/ecs/buy?spec=…` routes are unsupported by capture.
- ECS media is a later technical infographic in source, but renders as a2560×1351 first-screen image separating title/summary/actions. Natural image4640×2448: not intrinsic-pixel upscaling; defect is hierarchy/cohesion, not bleed itself.

## Source-true design / positive coverage

- AWS tables share one desktop frame with compact readable rows; centered whitespace is legitimate. No modeled-subset engine defect found. Source compute/filter content is absent by stated curated subset intent: owner must reconcile completeness; this audit does not silently authorize expansion.
- Stripe is genuinely a long catalog. All66 modeled actions have normalized capture targets and rendered anchors; inspected link contrast is readable. Do not replace its distinct products with an arbitrary compact site template.
- ECS mobile comparison horizontal scroll is intentional and reaches538px; do not fold entities into a second comparison row. No invented g9i price requested.
- Grafana source capture has loading/empty panels, not real stats data. Missing numeric values/charts cannot be alleged or invented.
- Original full bleed, independent inner reading columns and brand variation are not automatically defects. Seven accepted references were not inspected or modified in this lane.

## Checks

- `node …/capture.mjs`:20 captures across five pages×four widths; overflow0, broken0, intrinsic upscaling0.
- `node …/probe.mjs`: contrast/markup/control probes and ECS mobile horizontal scrolling.
- `node m1/eval/pipeline.mjs --check-shots --only …`:PASS5-page existing HTML/PNG hash consistency.
- `node m1/validate.mjs <five models>`:PASS5/5.
- `node m1/eval/capture-integrity.mjs --only …`:PASS814 facts,697 adjudicated,0 misses,5 declared conversions. Action URLs/billing omissions remain outside this facts-only proof.
- `node m1/eval/metrics.mjs …` per page: fact fidelity1.00 (177/177,38/38,156/156,425/425,18/18). These gates demonstrably do not certify action/visual acceptance.

## Residual limits

- Initial immutable-baseline diagnosis only: no fixes or acceptance of later revisions. Fresh combined technical/experience review remains required.
- 18 image reads and2 browser jobs used; no recursive jobs/dependencies/source/model/docs/gallery edits. No independent reviewer verdict in this lane.
- 1920 visual inspection missing for all5 pages.390 whole-height visual inspection only Grafana; ECS lower crop only; Aliyun home/AWS/Stripe390 screenshots captured but not visually read. Geometry is not visual PASS.
- Some whole-height sheets are reduced by image tool (maximum display dimension2000). Fine source text and some long-page detail remain unverified at native readable scale. Stripe2560 sheets crop central912px to make catalog readable; brand/root side areas are not completely inspected at2560. ECS/AWS2560 sheets crop centered1280px; full lateral ECS image is shown at1440.
- Aliyun home source capture has popup occlusion in upper hero. Grafana full.png is900px high and shows loading/empty plugin panels; no stats values or graphs can be inferred or fabricated; panel content beyond capture viewport is incomplete.
- AWS intentionally modeled data-transfer subset (_intent); source has compute/filter table, notes and footer absent from curated model. Within modeled subset no engine visual defect found. Full-source page completeness cannot be certified without owner reconciliation of the intended curated scope; do not silently expand the model.
- Original source navigation/footer absent from several curated models are coverage gaps, not alleged renderer deletion. This audit does not treat original site look-and-feel reproduction or all-source expansion as implicitly authorized.
- Remote Aliyun home image bytes were not archived during browser job1; HTML URLs, model/source/PNG hashes and loaded-image geometry are bound, but remote-image bytes are not separately revision-bound. ECS local asset hash is covered.
- No outbound links clicked or production purchases/forms submitted. Source/render targets checked statically and mobile ECS horizontal scroll exercised; complete interaction/runtime behavior remains unverified.
- No regression test source edits authorized. Diagnostic scripts/checks are local evidence only. Known facts/capture/validator/hash gates PASS while visual/action defects persist.

## Next step

Route CB-E1…E7 to engine and CB-C1…C2 to content; preserve exact capture provenance and closed shared decisions. Reconcile AWS curated/source coverage before claiming full-page source completeness. Complete missing native-readable and1920/390 visual coverage at the final combined revision through fresh independent review. Do not deliver these baseline diagnostics as PASS.

## Structured diagnostic acceptance report

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "Assigned five-page diagnosis only:7 engine/2 content findings; no source/model/gallery changes or scope expansion."
    },
    {
      "id": "criterion-2",
      "status": "satisfied",
      "evidence": "Revision-bound screenshot/measurement/source evidence, reproducible diagnostic checks and exact missing modalities retained in audit-handoff.json and evidence manifest."
    }
  ],
  "changedFiles": [
    ".scratch/62-all-sites/audit-cloud-business/ticket.md",
    ".scratch/62-all-sites/audit-handoff.json",
    ".scratch/62-all-sites/audit-cloud-business/changed-files.json",
    "/home/z/.pi/agent/sessions/--home-z-vibe-autofe--/subagent-artifacts/outputs/cb0e12c1-b85a-4cb1-a055-55bf9c1b0c52/audit-cloud-business.md"
  ],
  "testsAddedOrUpdated": [],
  "commandsRun": [
    {
      "command": "node .scratch/62-all-sites/audit-cloud-business/capture.mjs",
      "result": "passed",
      "summary": "20 full-height captures/measurements; one sequential browser/page; zero overflow/broken/intrinsically enlarged images"
    },
    {
      "command": "python .scratch/62-all-sites/audit-cloud-business/sheets.py",
      "result": "passed",
      "summary": "17 whole-height/readable sheets; supplemental detail image separately generated;18 total image reads"
    },
    {
      "command": "node .scratch/62-all-sites/audit-cloud-business/probe.mjs",
      "result": "passed",
      "summary": "Second sequential browser job; reproduces Grafana contrast/duplication and exercises ECS mobile scroll"
    },
    {
      "command": "node m1/eval/pipeline.mjs --check-shots --only aliyun-com/home,aliyun-com/product-ecs,aws-amazon/ec2-on-demand,stripe-com/pricing,grafana-play/play-home",
      "result": "passed",
      "summary": "5/5 existing HTML/PNG hashes match manifest"
    },
    {
      "command": "node m1/validate.mjs m1/curated/aliyun-com/home.json m1/curated/aliyun-com/product-ecs.json m1/curated/aws-amazon/ec2-on-demand.json m1/curated/stripe-com/pricing.json m1/curated/grafana-play/play-home.json",
      "result": "passed",
      "summary": "5/5 models valid"
    },
    {
      "command": "node m1/eval/capture-integrity.mjs --only aliyun-com/home,aliyun-com/product-ecs,aws-amazon/ec2-on-demand,stripe-com/pricing,grafana-play/play-home",
      "result": "passed",
      "summary": "814 facts;697 adjudicated;0 misses;5 declared conversions"
    },
    {
      "command": "for key in aliyun-com/home aliyun-com/product-ecs aws-amazon/ec2-on-demand stripe-com/pricing grafana-play/play-home; do node m1/eval/metrics.mjs \"m1/curated/$key.json\" \"m1/curated/renders/${key//\\//-}.html\" \"corpus/$key\"; done",
      "result": "passed",
      "summary": "Fidelity1.00 all five; distinct output JSONs retained"
    },
    {
      "command": "python .scratch/62-all-sites/audit-cloud-business/verify-evidence.py",
      "result": "passed",
      "summary": "Input/screenshot hashes unchanged;7 target losses and5 unsupported URLs reproduced;66 Stripe targets verified;no staged files"
    },
    {
      "command": "python .scratch/62-all-sites/audit-cloud-business/build-report.py",
      "result": "passed",
      "summary": "9 actionable findings with criterion/location/source/render/geometry/fix proof;explicit incomplete coverage"
    },
    {
      "command": "git diff --check; git diff --cached --name-only; git status --short",
      "result": "passed",
      "summary": "No tracked source changes, whitespace defects or staged files;preexisting untracked packet/active link/corpus preserved"
    }
  ],
  "validationOutput": [
    "20 width/page captures;18 image reads;2 browser jobs",
    "All tracked source inputs unchanged;no staged files",
    "Hash/validator/facts gates PASS, but9 diagnostic findings remain;experience acceptance INCOMPLETE"
  ],
  "residualRisks": [
    "Full1920 visual and most390 visual not inspected;some native-readable source details unavailable within18-image budget",
    "AWS source-scope/capture-loading gaps and remote-image byte binding disclosed",
    "Fresh independent final technical/experience review pending"
  ],
  "noStagedFiles": true,
  "diffSummary": "Local ticket/report/machine findings and owned diagnostic evidence only. Full file inventory in changed-files.json; no product changes.",
  "reviewFindings": [
    "7 engine and2 content baseline defects reported;no visual acceptance PASS"
  ],
  "manualNotes": "This satisfies the assigned diagnostic/evidence role, not the all42 final delivery milestone. Missing coverage is explicitly INCOMPLETE."
}
```
