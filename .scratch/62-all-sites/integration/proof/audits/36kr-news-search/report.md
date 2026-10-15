# 36kr news/search — baseline diagnostic audit

## Result
**INCOMPLETE — not visual acceptance PASS.** Four scoped pages inspected; five engine findings and three content/fidelity findings require owner triage. This is diagnosis of immutable baseline `403cd5be096db89b428e130ad57cca730b425fdc`, not review of future fixes. No source/models/assets/owning Docs changed.

Highest priorities: restore option-local captured destinations (E1), close mixed-form page edges (E2), repair home illustrated definition-row grouping (E3), and pair normal-text link colors with their surfaces (E4).

## Inspectable evidence
- Worktree: `/home/z/vibe/autofe-worktrees/62-all-sites/audit-36kr-news-search`.
- Machine handoff: `.scratch/62-all-sites/audit-handoff.json`.
- Ticket: `.scratch/62-all-sites/audit-36kr-news-search/ticket.md`.
- Exact hashes: `covered-hashes.json`; measurements: `geometry.json`, `detail-probe.json`; source/action proof: `source-evidence.json`; contrast: `contrast.json`.
- All local relative evidence paths below are under `.scratch/62-all-sites/audit-36kr-news-search/` unless source paths are named. Full screenshots remain on disk; overview/strip composition never deletes proof.
- Exact modified/new evidence inventory: `changed-files.json`; command outcomes: `commands-run.json`. No staging or commits.

## Coverage (explicit modalities)

| Page | 2560 | 1440 | 1920 | 390 | Source |
|---|---|---|---|---|---|
| `36kr-com/home` | Whole-height full-width overview | Whole-height overlapping main-frame strips; relevant details | Full capture + geometry only; image unopened | Full capture + geometry; top/middle/end samples only | Whole-height source sheet, targeted DOM/nodes and all model target/image URL checks |
| `36kr-com/information-technology` | Whole-height full-width overview | Whole-height overlapping main-frame strips; relevant details | Full capture + geometry only; image unopened | Full capture + geometry; top/middle/end samples only | Whole-height source sheet, targeted DOM/nodes and all model target/image URL checks |
| `36kr-com/search-ai` | Whole-height full-width overview | Whole-height overlapping main-frame strips; relevant details | Full capture + geometry only; image unopened | Full capture + geometry; top/middle/end samples only | Whole-height source sheet, targeted DOM/nodes and all model target/image URL checks |
| `36kr-com/search-viz` | Whole-height full-width overview | Whole-height overlapping main-frame strips; relevant details | Full capture + geometry only; image unopened | Full capture + geometry; top/middle/end samples only | Whole-height source sheet, targeted DOM/nodes and all model target/image URL checks |

All 16 probes report zero horizontal overflow, zero broken images and zero enlargement beyond natural image width. Desktop page heights (2560/1920/1440): home 7077; technology 3080; AI search 2288; visualization search 2086. Mobile heights: 12818 / 8650 / 6666 / 6478. These checks do **not** imply visual PASS.

Read sequence: four 2560 overviews; four full-height source sheets; four 1440 sheets; four mobile sample sheets; two native readable home/source crops. **18/18 image reads**, batches <=4. **Two sequential local browser jobs**, both closed.

Mobile inspected intervals (y, inclusive start/exclusive end):
- `36kr-com/home`: 0–1200, 5809–7009, 11618–12818. All other mobile intervals are visually uninspected.
- `36kr-com/information-technology`: 0–1200, 3725–4925, 7450–8650. All other mobile intervals are visually uninspected.
- `36kr-com/search-ai`: 0–1200, 2733–3933, 5466–6666. All other mobile intervals are visually uninspected.
- `36kr-com/search-viz`: 0–1200, 2639–3839, 5278–6478. All other mobile intervals are visually uninspected.

There are no clean-page acceptance claims: all four share E2/E4 and at least one additional finding.

## Findings

### E1 — engine / high
- **Criterion:** Faithful action targets; closed shared-axis decisions
- **Pages/widths:** 36kr-com/information-technology, 36kr-com/search-ai, 36kr-com/search-viz; 2560, 1920, 1440, 390px.
- **Location:** `m1/render.mjs:284-301 renderChoice; .g-channels fieldset / .g-search-type fieldset; channels._items[*]._action.to / search-type._items[0,5,6]._action.to`.
- **Observed:** Choice rendering consumes action-bearing options but produces only labels/radio inputs, not their declared destination actions. Technology has 17 options, 15 action-bearing; all 15 actions disappear at the option, and 14 destinations are absent globally (latest survives elsewhere). Each search loses all 3 declared type targets. Radio selection is not navigation to those captured destinations.
- **Render proof:** detail-probe.json: choices[].links=[] at 2560/390; source-evidence.json: choiceActionsNotRenderedAtOption and modelTargetsMissingFromRender; information-technology-1440-sheet.png; search-ai-1440-sheet.png; search-viz-1440-sheet.png.
- **Source comparison:** Every model target exists in source DOM (source-evidence.json). Source channel anchors include 科技 -> /information/technology/; search 文章/作者/项目 retain corresponding links.
- **Geometry:** geometry.json anchors count: technology 34 vs 49 model target actions; both searches 20 vs 23. No href/option action rendered at any width.
- **Falsifiable improvement:** Every action-bearing option exposes its captured target at that option, without inventing destinations for targetless options; detect this by option-local action assertions, not global href-set membership alone. All three targets must share the approved axis/action decision.

### E2 — engine / high
- **Criterion:** Coherent page-level alignment across mixed forms; compact content-edge identity
- **Pages/widths:** 36kr-com/home, 36kr-com/information-technology, 36kr-com/search-ai, 36kr-com/search-viz; 2560, 1920, 1440px.
- **Location:** `m1/render.mjs:718-721 root title rules; m1/axis.mjs widthTier; .depth-0>.title, .depth-1.w-narrow / .w-wide`.
- **Observed:** Each desktop page has three independent centered left edges: title, utilities/default sections, card/feed sections. Home additionally alternates 880/1232px frames down its whole height. This is an introduced mixed-form alignment defect, not a complaint about centered outer whitespace.
- **Render proof:** home-2560-overview.png; information-technology-2560-overview.png; search-ai-2560-overview.png; search-viz-2560-overview.png; all four *-1440-sheet.png.
- **Source comparison:** All source sheets show a stable editorial axis from query/channels/feature through results/feed; the source outer whitespace is legitimate and need not be removed.
- **Geometry:** At 2560 title x=960,w=640; narrow x=840,w=880; wide x=664,w=1232. At 1920 x=640/520/344. At 1440 x=400/280/104. At 390 all inspected frames x=16,w=358.
- **Falsifiable improvement:** Root identity/title, query/channels and primary result/feed frame have an intentional shared content edge, with no unexplained 120/176px hops at transitions; retain appropriate outer whitespace and brand variation, no blanket centering/site-specific CSS.

### E3 — engine / high
- **Criterion:** Cohesive image/title/action grouping; readable density; no enlarged images
- **Pages/widths:** 36kr-com/home; 2560, 1920, 1440, 390px.
- **Location:** `m1/render.mjs:211-231 renderDeflist and :813 .defrow align-items:baseline; .g-featured .defrow; .g-hot .defrow:first-child`.
- **Observed:** Home image-bearing feature items are drawn as baseline-aligned definition rows. A 290px picture sits above/right of its headline at the bottom; headline widths and image left edges vary per item. The five features occupy 1560.7px before latest articles at y=1682.3. Featured images have no enclosing action anchor although the label target is preserved. The first hot entry repeats the detached title/image shape.
- **Render proof:** home-featured-readable.png; home-1440-sheet.png; home-390-samples.png; detail-probe.json: defrows.
- **Source comparison:** home-source-featured-topics-readable.png: compact lead story and four companion pictures have visibly attached overlay titles; source feature image/title share the article target. No exact source carousel recreation is prescribed.
- **Geometry:** 2560 first row label x=840,y=347.2,w=236.8 while image x=1090.8,y=103,w=629.2,h=262.2; second label y=685.4, image y=413.4,h=290. At 390 first label y=162.2 vs image y=91; next label y=355.2 vs image y=253.9. Image action ancestor absent.
- **Falsifiable improvement:** Each feature/illustrated ranked item is a clear image-headline-action unit; reading starts near its media, not at the media baseline after a large blank zone. Preserve all five exact targets/facts, make captured image action attribution inspectable, and never upscale assets.

### E4 — engine / high
- **Criterion:** Paired foreground/surface contrast; readable density
- **Pages/widths:** 36kr-com/home, 36kr-com/information-technology, 36kr-com/search-ai, 36kr-com/search-viz; 2560, 1920, 1440, 390px.
- **Location:** `m1/brand-tokens.json 36kr accent; .self-link title text on white; .deflist.ranked .rank`.
- **Observed:** #1890ff article headlines on white are visibly light at ordinary 17.92px/650 size; measured contrast is 3.245:1. Rank numerals #8493a3 on white are 3.142:1 at ordinary body size. General ink/muted text and solid CTA pairs are satisfactory in exercised samples.
- **Render proof:** all four *-1440-sheet.png; all four *-390-samples.png; detail-probe.json: linkStyles; contrast.json.
- **Source comparison:** Source uses dark body-sized editorial article names (with selectively blue query highlights), not wholesale bright-blue small result titles. Preservation of a blue brand accent does not require using it unchanged for small text on white.
- **Geometry:** Result headings 17.92px, weight 650; #1890ff/white 3.245, #17212b/white 16.293, #536171/white 6.333, white/#17212b 16.293.
- **Falsifiable improvement:** Use a coherent paired foreground/surface treatment that retains brand distinction and reaches >=4.5:1 for normal-sized informative/link/rank text; verify computed colors plus rendered experience, not accent token alone.

### E5 — engine / medium
- **Criterion:** Readable editorial density; coherent image/title grouping
- **Pages/widths:** 36kr-com/home, 36kr-com/information-technology, 36kr-com/search-ai, 36kr-com/search-viz; 2560, 1920, 1440px.
- **Location:** `.g-feed .cards.cols-auto; .g-results .cards.cols-auto; shared auto-grid form decision`.
- **Observed:** Image-bearing and text-only records share four-column rows, so later image-free items leave conspicuous empty scan lanes beneath short cards. Source-truth lazy image absence must not be fixed by inventing/reloading pictures; the shared form should accommodate the unequal record heights.
- **Render proof:** all four *-1440-sheet.png; detail-probe.json: cards.
- **Source comparison:** Source results/feed remain cohesive image+text rows; later image placeholders are present in source capture and their missing image URL facts are source-true. This is layout density, not a request to add images.
- **Geometry:** Technology row starting item 8 at y=1190.4 has heights 405.8/485.7/193.2/167.6 (318.1px difference); search-viz row item 8 has 405.8/167.6/138.9/193.2 (266.9px difference).
- **Falsifiable improvement:** Unequal editorial records remain readable in order without hundreds of pixels of dead row space; preserve source image absence and all text/actions and use shared form/axis decisions, not site-specific presentation keys.

### C1 — content / high
- **Criterion:** Faithful actions and whole-page continuation
- **Pages/widths:** 36kr-com/information-technology, 36kr-com/search-ai, 36kr-com/search-viz; 2560, 1920, 1440, 390px.
- **Location:** `information-technology feed; search-ai/results; search-viz/results (missing continuation node)`.
- **Observed:** The visible source 查看更多 continuation after the feed/search results is absent from each factual model and therefore the render. Technology offers 查看更多企业 but that is a different action, not article continuation.
- **Render proof:** information-technology-1440-sheet.png end; search-ai-1440-sheet.png end; search-viz-1440-sheet.png end; source-evidence.json: sourceDomSamples/sourceNodeSamples.
- **Source comparison:** Visible source div.kr-loading-more-button.show at technology nodes cleanedIndex=774,bbox x=546,y=5488,w=148,h=36; search-ai index=665 and search-viz=590, both x=546,y=3826,w=148,h=36. Source provides no href for this control.
- **Geometry:** Search ends at y=2288/2086 desktop and 6666/6478 mobile without continuation; technology feed ends before companies.
- **Falsifiable improvement:** Retain the source continuation action/label in the approved grammar without inventing an href or an actual backend. Engine draws the captured targetless control using existing approved action affordance rules.

### C2 — content / medium
- **Criterion:** Faithful state facts; coherent choice semantics; closed grammar
- **Pages/widths:** 36kr-com/information-technology, 36kr-com/search-ai, 36kr-com/search-viz; 2560, 1920, 1440, 390px.
- **Location:** `channels; search-type; sort (captured current state not represented)`.
- **Observed:** Source 当前科技 channel, 文章 search type and 相关性 sorting are visibly active, while all rendered radios are unchecked. The models describe the choices but do not retain those current states as facts. Engine renders no selection state for these choice groups.
- **Render proof:** information-technology-390-samples.png; search-ai-390-samples.png; search-viz-390-samples.png; detail-probe.json: choices[].options[].checked=false.
- **Source comparison:** Technology DOM anchor class=active at /information/technology/; search DOM article li and relative span classes are active. Search source nodes index=261 article uses white text on blue, index=279 sort is blue/500.
- **Geometry:** Choice groups fit without overflow; desktop technology fieldset h=158.8, mobile h=295.6. Shape fits but current-page/type/sort identity is lost.
- **Falsifiable improvement:** Captured active state remains inspectable/readable through permitted factual grammar and shared engine decisions. Content owner and engine arbitrate representation; do not introduce selected/presentation escape keys or infer state only from site name.

### C3 — content / medium
- **Criterion:** Compact utilities/footer; faithful facts/targets
- **Pages/widths:** 36kr-com/home, 36kr-com/information-technology, 36kr-com/search-ai, 36kr-com/search-viz; 2560, 1920, 1440, 390px.
- **Location:** `root model: no header/footer/global navigation content`.
- **Observed:** All four renders lack source global navigation and the complete source footer, including ordinary About/navigation targets. Thus this cohort cannot demonstrate compact utility/footer acceptance against the source. Examples: visible 首页 -> / and 关于我们 -> /pages/about are not represented by any model. This is a factual omission, not an engine frame styling issue.
- **Render proof:** all four *-source-sheet.png header/footer vs *-1440-sheet.png; source-evidence.json: sourceDomSamples; modelHasAboutTarget=false.
- **Source comparison:** About footer source visible at home cleanedIndex=1321,y=7897; technology 826,y=5670; search-ai 702,y=4012; search-viz 627,y=4012. Exact captured href=/pages/about.
- **Geometry:** No footer group exists in any of four factual models; geometry page end agrees with last body group, not the source footer.
- **Falsifiable improvement:** Content owner explicitly reconciles source utility/footer fact/action coverage with the curated-page contract; preserve required captured targets with compact shared utility forms, without recreating every unrelated menu or making up facts. This audit does not authorize expanded site crawling or network execution.

## Source-true / non-defect distinctions
- Centered outer editorial whitespace is legitimate; E2 is about inconsistent internal edges, not mandatory full-bleed or blanket centering.
- Late source lazy image placeholders are real capture facts. Rendered image absence there is not a broken asset defect; do not invent images to close E5.
- Root page-title fallback facts are documented in existing model intents. The audit does not invent new visible headings or rename source facts.
- Home third topic “36氪空天探索计划” is an advertisement, identifiable by `kr-ad-home-flow-specialtopic-main` and ad click URL. Its omission is **not** treated as a required restoration defect; content authority must reconcile advertising scope before any change.
- Source input values 人工智能 / 数据可视化 are preserved in actual rendered inputs. Existing validator default warnings alone are not proof of a missing visible value.
- Ordinary ink/muted-text and solid CTA contrast pairs are satisfactory in exercised samples. All loaded model image URLs and action targets have source DOM support; zero invented-target/URL defects found in that bounded check.

## Limits / next owner action
- 18/18 image reads used in batches <=4; 2/3 browser jobs, sequential single page/browser, both closed.
- 1920 full-height PNGs captured but not image-read. Geometry evidence is not visual acceptance.
- 390 full-height PNGs captured, only listed 1200px top/middle/end intervals image-read; remaining intervals uninspected.
- 2560 whole-height inspected in overview; detailed reading uses the actual 1440 main frame with matching desktop content dimensions. No claim every 2560 source text glyph inspected.
- Source targeted DOM/nodes/action/image coverage, not exhaustive zero-loss audit of every source fact/text/action.
- Remote browser image fetches succeeded; exact downloaded response bytes not archived. Captured screenshot/source/model/HTML hashes freeze observed artifacts.
- Third home topic 36氪空天探索计划 is visibly source advertising (kr-ad-home-flow-specialtopic-main with ad click redirect). Reported as a source distinction, not a demand to restore ads or invent direct targets.
- No backend/navigation submission behavior exercised; source no-href 查看更多 remains targetless.
- No final fix, 42-page regression, pipeline-wide gates, independent final review or delivery milestone acceptance claimed.

Recommended next step: engine triages E1–E5 and shared representation for C2; content reconciles C1–C3 within the curated contract, without source advertising restoration or new grammar escape keys. After fixes, capture affected full pages and route fresh independent final-revision technical/experience review, including missing 1920/390 visual coverage. No milestone delivery acceptance is established by this audit.

## Structured acceptance of diagnostic scope
```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "Completed assigned four-page diagnosis/evidence only; no implementation, model/asset/Docs edits, source changes, staging, commits or setup recreation."
    },
    {
      "id": "criterion-2",
      "status": "satisfied",
      "evidence": "Exact hash-bound artifacts, 16 viewport captures/probes, 18 documented image reads, source/target comparisons, quantified defects, owner split and missing modalities preserved for independent review."
    }
  ],
  "changedFiles": [
    ".scratch/62-all-sites/audit-36kr-news-search/capture.log",
    ".scratch/62-all-sites/audit-36kr-news-search/capture.mjs",
    ".scratch/62-all-sites/audit-36kr-news-search/changed-files.json",
    ".scratch/62-all-sites/audit-36kr-news-search/commands-run.json",
    ".scratch/62-all-sites/audit-36kr-news-search/contrast.json",
    ".scratch/62-all-sites/audit-36kr-news-search/covered-hashes.json",
    ".scratch/62-all-sites/audit-36kr-news-search/detail-probe.json",
    ".scratch/62-all-sites/audit-36kr-news-search/detail-probe.log",
    ".scratch/62-all-sites/audit-36kr-news-search/detail-probe.mjs",
    ".scratch/62-all-sites/audit-36kr-news-search/final-validation.json",
    ".scratch/62-all-sites/audit-36kr-news-search/finalize.py",
    ".scratch/62-all-sites/audit-36kr-news-search/geometry.json",
    ".scratch/62-all-sites/audit-36kr-news-search/home-1440-overview.png",
    ".scratch/62-all-sites/audit-36kr-news-search/home-1440-sheet.png",
    ".scratch/62-all-sites/audit-36kr-news-search/home-1440.png",
    ".scratch/62-all-sites/audit-36kr-news-search/home-1920.png",
    ".scratch/62-all-sites/audit-36kr-news-search/home-2560-overview.png",
    ".scratch/62-all-sites/audit-36kr-news-search/home-2560.png",
    ".scratch/62-all-sites/audit-36kr-news-search/home-390-samples.png",
    ".scratch/62-all-sites/audit-36kr-news-search/home-390.png",
    ".scratch/62-all-sites/audit-36kr-news-search/home-featured-readable.png",
    ".scratch/62-all-sites/audit-36kr-news-search/home-source-featured-topics-readable.png",
    ".scratch/62-all-sites/audit-36kr-news-search/home-source-sheet.png",
    ".scratch/62-all-sites/audit-36kr-news-search/information-technology-1440-overview.png",
    ".scratch/62-all-sites/audit-36kr-news-search/information-technology-1440-sheet.png",
    ".scratch/62-all-sites/audit-36kr-news-search/information-technology-1440.png",
    ".scratch/62-all-sites/audit-36kr-news-search/information-technology-1920.png",
    ".scratch/62-all-sites/audit-36kr-news-search/information-technology-2560-overview.png",
    ".scratch/62-all-sites/audit-36kr-news-search/information-technology-2560.png",
    ".scratch/62-all-sites/audit-36kr-news-search/information-technology-390-samples.png",
    ".scratch/62-all-sites/audit-36kr-news-search/information-technology-390.png",
    ".scratch/62-all-sites/audit-36kr-news-search/information-technology-source-sheet.png",
    ".scratch/62-all-sites/audit-36kr-news-search/search-ai-1440-overview.png",
    ".scratch/62-all-sites/audit-36kr-news-search/search-ai-1440-sheet.png",
    ".scratch/62-all-sites/audit-36kr-news-search/search-ai-1440.png",
    ".scratch/62-all-sites/audit-36kr-news-search/search-ai-1920.png",
    ".scratch/62-all-sites/audit-36kr-news-search/search-ai-2560-overview.png",
    ".scratch/62-all-sites/audit-36kr-news-search/search-ai-2560.png",
    ".scratch/62-all-sites/audit-36kr-news-search/search-ai-390-samples.png",
    ".scratch/62-all-sites/audit-36kr-news-search/search-ai-390.png",
    ".scratch/62-all-sites/audit-36kr-news-search/search-ai-source-sheet.png",
    ".scratch/62-all-sites/audit-36kr-news-search/search-viz-1440-overview.png",
    ".scratch/62-all-sites/audit-36kr-news-search/search-viz-1440-sheet.png",
    ".scratch/62-all-sites/audit-36kr-news-search/search-viz-1440.png",
    ".scratch/62-all-sites/audit-36kr-news-search/search-viz-1920.png",
    ".scratch/62-all-sites/audit-36kr-news-search/search-viz-2560-overview.png",
    ".scratch/62-all-sites/audit-36kr-news-search/search-viz-2560.png",
    ".scratch/62-all-sites/audit-36kr-news-search/search-viz-390-samples.png",
    ".scratch/62-all-sites/audit-36kr-news-search/search-viz-390.png",
    ".scratch/62-all-sites/audit-36kr-news-search/search-viz-source-sheet.png",
    ".scratch/62-all-sites/audit-36kr-news-search/sheets.py",
    ".scratch/62-all-sites/audit-36kr-news-search/source-evidence.json",
    ".scratch/62-all-sites/audit-36kr-news-search/source-evidence.log",
    ".scratch/62-all-sites/audit-36kr-news-search/source-evidence.py",
    ".scratch/62-all-sites/audit-36kr-news-search/ticket.md",
    ".scratch/62-all-sites/audit-handoff.json",
    "/home/z/.pi/agent/sessions/--home-z-vibe-autofe--/subagent-artifacts/outputs/cb0e12c1-b85a-4cb1-a055-55bf9c1b0c52/audit-36kr-news-search.md"
  ],
  "testsAddedOrUpdated": [],
  "commandsRun": [
    {
      "command": "timeout 175s node .scratch/62-all-sites/audit-36kr-news-search/capture.mjs",
      "result": "passed",
      "summary": "One sequential browser, four pages × four widths; full-height screenshots, geometry, HTML/model/source hashes."
    },
    {
      "command": "python .scratch/62-all-sites/audit-36kr-news-search/sheets.py",
      "result": "passed",
      "summary": "Full-height overviews and overlapping 1440/source sheets generated; supplemental crops persisted."
    },
    {
      "command": "timeout 100s node .scratch/62-all-sites/audit-36kr-news-search/detail-probe.mjs",
      "result": "passed",
      "summary": "Second sequential browser; 2560/390 option-local actions, colors, defrow/image geometry."
    },
    {
      "command": "python .scratch/62-all-sites/audit-36kr-news-search/source-evidence.py",
      "result": "passed",
      "summary": "All declared model targets/image URLs found in source; dropped choice actions reproduced; contrast measured."
    },
    {
      "command": "node m1/validate.mjs m1/curated/36kr-com/{home,information-technology,search-ai,search-viz}.json (four separate invocations)",
      "result": "passed",
      "summary": "4/4 ok; existing search-composite missing-default warnings disclosed."
    },
    {
      "command": "git diff --check; git diff --cached --exit-code --quiet; git status --short",
      "result": "passed",
      "summary": "No tracked source changes, no staged files, pre-existing active-work/corpus artifacts preserved."
    },
    {
      "command": "Python covered-hash, handoff cardinality/status, and untracked evidence whitespace checks",
      "result": "passed",
      "summary": "Every covered hash matches; four pages/eight findings/explicit INCOMPLETE status; scripts/Ticket whitespace clean."
    },
    {
      "command": "Optional Python BeautifulSoup inspection",
      "result": "failed",
      "summary": "bs4 unavailable; no dependency installed; replaced with working stdlib HTMLParser."
    },
    {
      "command": "Long-line source grep inspection (30s timeout)",
      "result": "failed",
      "summary": "Timed out; replaced with bounded Python substring/JSON inspection."
    }
  ],
  "validationOutput": [
    "16/16 viewport probes: no horizontal overflow, broken images or enlarged natural-size images; no page JS errors.",
    "15 action-bearing channel options and three search-type options per search lose their option-local captured destinations.",
    "All declared model targets/image URLs exist in source; bright blue small headline contrast 3.245:1.",
    "4/4 model validators ok; baseline search default warnings retained.",
    "No staged files; covered bytes unchanged; no tracked source diff."
  ],
  "residualRisks": [
    "18/18 image reads used in batches <=4; 2/3 browser jobs, sequential single page/browser, both closed.",
    "1920 full-height PNGs captured but not image-read. Geometry evidence is not visual acceptance.",
    "390 full-height PNGs captured, only listed 1200px top/middle/end intervals image-read; remaining intervals uninspected.",
    "2560 whole-height inspected in overview; detailed reading uses the actual 1440 main frame with matching desktop content dimensions. No claim every 2560 source text glyph inspected.",
    "Source targeted DOM/nodes/action/image coverage, not exhaustive zero-loss audit of every source fact/text/action.",
    "Remote browser image fetches succeeded; exact downloaded response bytes not archived. Captured screenshot/source/model/HTML hashes freeze observed artifacts.",
    "Third home topic 36氪空天探索计划 is visibly source advertising (kr-ad-home-flow-specialtopic-main with ad click redirect). Reported as a source distinction, not a demand to restore ads or invent direct targets.",
    "No backend/navigation submission behavior exercised; source no-href 查看更多 remains targetless.",
    "No final fix, 42-page regression, pipeline-wide gates, independent final review or delivery milestone acceptance claimed."
  ],
  "noStagedFiles": true,
  "diffSummary": "Diagnostic artifacts only: four-page baseline visual/source/geometry audit, five engine findings, three content findings, Ticket and exact coverage/hashes.",
  "reviewFindings": [
    "Baseline defects E1-E5 and source fact/action gaps C1-C3; no visual acceptance PASS.",
    "Independent final-revision review remains required and is not performed by this diagnostic audit."
  ],
  "manualNotes": "Audit handoff status INCOMPLETE intentionally distinguishes completed diagnostic work from unaccepted pages/future changes. No source edits were authorized or made."
}
```
