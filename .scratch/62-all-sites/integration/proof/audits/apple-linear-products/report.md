# Apple / Linear product cohort — baseline diagnostic audit

**Verdict: INCOMPLETE for visual acceptance.** Scoped diagnosis is complete; seven engine and four content findings remain open. This is not review of future fixes and not a delivery milestone.

## Scope and binding

- Baseline: `403cd5be096db89b428e130ad57cca730b425fdc`; worktree `/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products`.
- Machine handoff: `/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-handoff.json`.
- Hash manifest: `/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/audit-covered-hashes.json`.
- Source/models/assets/owning Docs/generated gallery were read-only; only lane evidence/ticket, local routing handoff and this report changed.
- Exercised budget: **18 image reads,3 sequential browser jobs**; commands bounded to180 seconds. No setup rerun, dependencies, publication, commit or staging.

## Coverage

| Page | Actual full-height render images read | Geometry and captures | Source comparison | Acceptance |
|---|---|---|---|---|
|`apple-com-cn/iphone-17`|2560 /1440 /390|2560 /1920 /1440 /390 (390:14453px, 1440:13800px, 1920:14197px, 2560:14197px)|Whole-height overview + DOM/nodes; dense Apple footnotes/terms incomplete|INCOMPLETE|
|`apple-com/iphone-16`|2560 /1440 /390|2560 /1920 /1440 /390 (390:13018px, 1440:8944px, 1920:9214px, 2560:9574px)|Whole-height overview + DOM/nodes; dense Apple footnotes/terms incomplete|INCOMPLETE|
|`apple-com/macbook-air`|2560 /1440 /390|2560 /1920 /1440 /390 (390:20006px, 1440:14851px, 1920:14851px, 2560:14851px)|Whole-height overview + DOM/nodes; dense Apple footnotes/terms incomplete|INCOMPLETE|
|`linear-app/home`|2560 /1440 /390|2560 /1920 /1440 /390 (390:1359px, 1440:1006px, 1920:1006px, 2560:1006px)|Whole-height overview + DOM/nodes; real Changelog readable crop|INCOMPLETE|

1920 screenshots exist but were not visually read. Geometry is not experience PASS. Apple source captures include blank/lazy regions: not diagnosed as introduced engine defects. First offline remote-image captures are retained but not used as Apple normal-load visual proof.

### Human-viewable evidence

**apple-com-cn/iphone-17**
- [Actual2560 whole page](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/online/apple-com-cn-iphone-17-2560.png) · [1440](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/online/apple-com-cn-iphone-17-1440.png) · [1920 (unread)](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/online/apple-com-cn-iphone-17-1920.png) · [390](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/online/apple-com-cn-iphone-17-390.png).
- [2560 strip sheet](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/apple-com-cn-iphone-17-2560-compact.png) · [1440 sheet](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/apple-com-cn-iphone-17-1440-compact.png) · [390 sheet](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/apple-com-cn-iphone-17-390-compact.png) · [source sheet](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/apple-com-cn-iphone-17-source-compact.png).

**apple-com/iphone-16**
- [Actual2560 whole page](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/apple-com-iphone-16-2560.png) · [1440](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/apple-com-iphone-16-1440.png) · [1920 (unread)](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/apple-com-iphone-16-1920.png) · [390](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/apple-com-iphone-16-390.png).
- [2560 strip sheet](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/apple-com-iphone-16-2560-compact.png) · [1440 sheet](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/apple-com-iphone-16-1440-compact.png) · [390 sheet](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/apple-com-iphone-16-390-compact.png) · [source sheet](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/apple-com-iphone-16-source-compact.png).

**apple-com/macbook-air**
- [Actual2560 whole page](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/online/apple-com-macbook-air-2560.png) · [1440](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/online/apple-com-macbook-air-1440.png) · [1920 (unread)](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/online/apple-com-macbook-air-1920.png) · [390](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/online/apple-com-macbook-air-390.png).
- [2560 strip sheet](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/apple-com-macbook-air-2560-compact.png) · [1440 sheet](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/apple-com-macbook-air-1440-compact.png) · [390 sheet](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/apple-com-macbook-air-390-compact.png) · [source sheet](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/apple-com-macbook-air-source-compact.png).

**linear-app/home**
- [Actual2560 whole page](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/linear-app-home-2560.png) · [1440](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/linear-app-home-1440.png) · [1920 (unread)](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/linear-app-home-1920.png) · [390](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/linear-app-home-390.png).
- [2560 strip sheet](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/linear-app-home-2560-compact.png) · [1440 sheet](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/linear-app-home-1440-compact.png) · [390 sheet](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/linear-app-home-390-compact.png) · [source sheet](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/linear-app-home-source-compact.png).

Additional [readable defect/source crops](/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/readable-defect-crops.png) combine mobile AppleCare, desktop Mac highlight, real Linear Changelog and iPhone17 source hero. Original source remains at `corpus/<page>/{dom.html,nodes.json,full.png}`. Source originals and all referenced inputs are hash-bound.

## Material findings

### E1 — MEDIUM — engine owner
**Pages:** apple-com-cn/iphone-17, apple-com/iphone-16, apple-com/macbook-air, linear-app/home. **Criterion:** coherent whole-page shared alignment / no blanket centering.
- **Location:** `.depth-0>.title; .depth-0>.fact/.hero/.controls; .depth-1; m1/render.mjs root width rules`.
- **Actual render:** All four 2560/1440 whole-height sheets: root title starts inside the section edge; Linear additionally has wide centered lead and left-edge tail actions.
- **Source:** Original Apple and Linear source sheets have intentional distinct compositions, not this generic 640/960 or 640/880/1232 axis split. This finding does not condemn legitimate centered whitespace or native full-bleed.
- **Geometry / reproducible evidence:** At 2560 Apple h1 x=960,w=640 vs section/fact x=800,w=960 (160px offset). Linear h1 x=960,w=640, inner depth-1 x=840,w=880, root hero/actions x=664,w=1232. 1920/1440 retain corresponding offsets. At 390 root/sections converge to x=16.
- **Falsifiable improvement criterion:** Use one explained page content axis for related root title, lead, controls and body forms; retain source-supported intentional centered/bleed exceptions. Re-review whole height at all widths; do not simply center every section.

### E2 — HIGH — engine owner
**Pages:** apple-com-cn/iphone-17, apple-com/macbook-air. **Criterion:** cohesive product image/title/price/actions.
- **Location:** `.depth-0 > a.action.verb-buy after .stack`.
- **Actual render:** Whole-height Apple sheets show purchase CTA only after environment/values, detached from opening product/price. detail-probes.json rootChildren fixes exact DOM order.
- **Source:** iPhone17 source hero title/price/Buy crop at y=600..880 and source DOM purchase href; Mac source title/price/Buy hero y≈765..1090 and local-nav Buy nodes[811]. Native full-bleed itself is allowed.
- **Geometry / reproducible evidence:** iPhone17 root price y=1820.78, root Buy y=14141.16 at 2560 (12320px separation); y=14397.19 at 390. Mac root price y=595.78, root Buy y=14795.70 (14200px separation); y=19950.5 at 390. Both HTML/model root actions exist; they are misplaced, not missing.
- **Falsifiable improvement criterion:** Keep the source-backed root purchase decision with the corresponding opening product/price/image group using the shared decision seam. A repeated tail CTA may remain only if justified. Do not include Linear: its source legitimately has a closing CTA.

### E3 — HIGH — engine owner
**Pages:** apple-com/iphone-16. **Criterion:** readable forms / density / responsive utilities.
- **Location:** `.expose-care-plan table.data td`.
- **Actual render:** 390 whole-height sheet and readable-defect-crops.png show one-to-three-word text lines forming tall coverage columns; validators and zero document overflow miss it.
- **Source:** Source nodes[1145] and 1440 full source show coverage choices with their own readable explanatory blocks; model steps._lines[5] preserves the source coverage facts.
- **Geometry / reproducible evidence:** 390 table 342.34px; name cell 99.69, purpose 91.25, detail 110.41px incl padding (~94.4px usable). First two rows ~581.6/582.1px each; fieldset h=1313.36px. Desktop detail cell 560.14px and rows ~111px.
- **Falsifiable improvement criterion:** Long coverage explanation must be readable at 390 without reducing type or deleting terms; preserve each option/label/detail association through shared responsive choice layout. Recheck actual image and control geometry.

### E4 — MEDIUM — engine owner
**Pages:** apple-com/macbook-air. **Criterion:** image/title cohesion and readable density.
- **Location:** `#highlights .defrow/.deflabel/.defval (baseline alignment)`.
- **Actual render:** Mac 2560/1440 whole-height sheets plus readable crop show long captions at lower-left of each image, with most row area empty; 390 stack is materially more coherent.
- **Source:** Source highlights y≈1290..1900 have integrated top captions on photographic cards. Model _lines[0]._items[*]._name contains full source captions, not short definition labels.
- **Geometry / reproducible evidence:** First desktop image x=1014,y=707.94,w=696,h=452; caption x=800,y=1141.94,w=190,h=153.56, i.e. 434px below image top. First row h=602.56. Six serial rows cause highlights h≈3616px. All images <= intrinsic size.
- **Falsifiable improvement criterion:** Image-associated long captions must read as captions/story items rather than narrow bottom-baseline definition labels. Preserve six captions/assets and sequence; no image enlargement or site-specific CSS.

### E5 — MEDIUM — engine owner
**Pages:** apple-com/iphone-16. **Criterion:** compact coherent image grouping / density.
- **Location:** `.g-inbox .deflist; inbox._items`.
- **Actual render:** 2560/1440/390 sheets show separate full-native-height phone then cable rows; labels attach at lower-left on desktop. The source presents a single paired in-box group.
- **Source:** Source full.png y≈3164..3700 and nodes[1276] show compact shared What’s in the Box region; both factual item names/assets are already in model.
- **Geometry / reproducible evidence:** Each local image h=784px (phone 346x784,cable 200x784), stacked into inbox h=1660.75 desktop and 1744.75 at390. Images are NOT enlarged; issue is presentation scale/grouping.
- **Falsifiable improvement criterion:** Render the two in-box objects as one understandable compact group with associated names, using existing truthful assets; scale down if appropriate, never enlarge or silently drop an item.

### E6 — MEDIUM — engine owner
**Pages:** linear-app/home. **Criterion:** compact utilities / readable sparse density.
- **Location:** `.g-customers .depth-1; customers._items[*]._brand`.
- **Actual render:** Linear 2560/1440 and390 sheets show five small names each occupying its own broad divider-separated row.
- **Source:** Source full.png y≈1400..1620 shows brand/customer proof as a compact horizontal group; model contains five customer identities.
- **Geometry / reproducible evidence:** Inner customer region w=880,h=244.125 at2560; each short brand occupies a full-width fact row. 390 h=281.25. Current five names remain readable but unnecessarily scattered.
- **Falsifiable improvement criterion:** Use a compact, source-appropriate wrapping identity/proof group while preserving every model customer name and contrast. No global centering rule or invented logos.

### E7 — HIGH — engine owner
**Pages:** apple-com-cn/iphone-17. **Criterion:** faithful preservation of all actions / shared actionRow.
- **Location:** `.which-iphone comparison; _lines[11]._items[1].buy._action; m1/render.mjs:402-421`.
- **Actual render:** iPhone Air comparison column retains Learn more but has no Buy anchor. fidelity-probe.py fails with exactly one missing action target; every other captured model target passes.
- **Source:** Source nodes[1800] name=购买 iPhone Air, y=17040.19; dom.html contains /cn/shop/goto/buy_iphone/iphone_air beside /iphone-air/. Model buy child contains same absolute target.
- **Geometry / reproducible evidence:** The target is absent from baseline HTML and every width anchor list; 390 horizontal scrolling cannot recover an anchor that does not exist. renderCompareTable uses itemExtra().ctl rather than consuming the complete nodePlan actionRow.
- **Falsifiable improvement criterion:** Preserve both source-backed Learn more and Buy in the entity column through shared actionRow for HTML/Markdown/text. Add a comparison-entity own-action + title-only child Buy regression and rerun full target preservation.

### C1 — HIGH — content owner
**Pages:** linear-app/home. **Criterion:** faithful facts / source semantics / no invented updates.
- **Location:** `changelog._items[0..1], changelog._rel.order=time`.
- **Actual render:** Linear output labels Faster app launch and Reset dimmed ride rows as Changelog items, with vehicle_state/ride-row issue instructions beneath.
- **Source:** Those source texts occur inside the hero product demo: source nodes[158]/[350] y≈550/980. Real source Changelog at y≈7844 has New controls for Linear coding agent, Loops for product management, Priority inbox, Coding sessions, with dated specific source URLs. readable-defect-crops.png independently shows all four.
- **Geometry / reproducible evidence:** Output timeline y=543.75..672.5 at2560 uses false category; source actual update nodes[2828],[2837],[2846] and DOM anchors are retained in source-probes.json/source DOM. No dates in current model.
- **Falsifiable improvement criterion:** Represent captured actual changelog entries with their visible dates/descriptions and specific source targets. Keep demo issue text only in its truthful demo context if retained; do not invent dates or infer them from URL strings.

### C2 — HIGH — content owner
**Pages:** linear-app/home. **Criterion:** coherent feature stories / faithful facts and targets.
- **Location:** `beats._lines[0..3]`.
- **Actual render:** Four feature stories become an unexplained numbered title-only list; no feature description/action survives because model never includes them.
- **Source:** Source nodes[699..705] Intake and integrations includes full visible paragraph and Learn more to /intake; other source chapters link /plan,/ai,/build. Whole source sheet shows each feature explanation and action.
- **Geometry / reproducible evidence:** Model beats occupies111.19px (all widths) and has only four title objects. Source DOM has four chapter anchors; baseline model/action preservation check cannot detect omitted source actions.
- **Falsifiable improvement criterion:** Restore each source-supported feature description and respective absolute source target using current closed grammar, with clear section ownership; do not synthesize explanations from screenshot pixels.

### C3 — MEDIUM — content owner
**Pages:** apple-com/iphone-16. **Criterion:** preserve semantic comparison / closed shared-axis decision.
- **Location:** `compare._lines; missing _rel.compare`.
- **Actual render:** Which iPhone is right for you becomes three cards plus two on another row at2560/1440, then a4925px serial product run at390.
- **Source:** Original source full.png y≈5087..8750 presents five entities as columns and common property rows. Current model _intent explicitly calls it 选型对照 but classifies it as sequence because members differ slightly; they share battery/chip/camera/front properties.
- **Geometry / reproducible evidence:** Current compare h=2089.56 at2560, 4925.09 at390; no comparison table in geometry. F-031 shared compare rules are not invoked because factual relationship is undeclared. This is not a renderer bypass of a declared compare relation.
- **Falsifiable improvement criterion:** Correct the source-backed comparison relationship in the factual model, retaining entity names, properties, images and source truth. Engine then consumes declared comparison with fixed entity columns/horizontal scrolling; no positional row pairing, presentation keys, or font compression.

### C4 — HIGH — content owner
**Pages:** linear-app/home. **Criterion:** preserve brand differences / meaningful visual product story.
- **Location:** `root / beats missing source image/demo representations (engine surface support secondary)`.
- **Actual render:** Source black, image-led product workflow narrative collapses to1006px white text outline with0 model/render images; genuine product demonstrations are absent, not merely rearranged. Foreground/background contrast itself passes sampled pairs.
- **Source:** Whole source sheet contains the hero issue/workspace demo and illustrated feature workflow panels throughout; source full.png y≈400..7200. Source SVG/DOM-heavy demos may need provenance-backed screenshot assets rather than fabricated remote images.
- **Geometry / reproducible evidence:** Source full height9960, output1006 at desktop; all four current models/HTML hashes are bound. Linear has0 declared images; therefore renderer cannot restore missing visuals alone.
- **Falsifiable improvement criterion:** Restore meaningful capture-backed visual product context without screenshot-to-text invention or image enlargement. Coordinate source-backed brand surface/foreground handling with engine through existing shared seams; this finding does not mandate a site-name template or blanket full-page black redesign.

## Positive checks and exclusions

- Four models validate; all scoped baseline HTML/PNG hashes match capture manifest.
- Every model image reference remains in HTML. Loaded images measured at2560 and390 are no larger than intrinsic dimensions.
- No document-wide horizontal overflow at any measured width. iPhone17 mobile comparison has520px content in358px overflow-x:auto: prescribed containment, not a page overflow defect.
- No sampled text/nearest-opaque-background pair is below4.5:1. This limited probe does not prove composited/image/state contrast.
- iPhone16 heterogeneous configuration steps are correctly stacked; no-target controls are not given invented destinations.
- Apple native full-bleed, source large deliberate white/gray storytelling regions and legitimate centered whitespace are not intrinsically defects. No blanket centering/redesign requested.
- Linear closing Get started/Contact sales grouping is source-true; its CTA placement is not generalized into the Apple root Buy defect.
- Seven accepted references and Apple/Taobao reserved root identity models were outside this cohort and untouched.

## Commands / evidence

- **passed** — `node .scratch/62-all-sites/audit-apple-linear-products/capture.mjs`: 16 offline width captures; remote-image Apple views excluded from normal-load visual findings.
- **passed** — `node .scratch/62-all-sites/audit-apple-linear-products/capture-online.mjs`: Eight loaded Apple captures at four widths; associated remote images loaded.
- **passed** — `node .scratch/62-all-sites/audit-apple-linear-products/detail-probes.mjs`: Four pages at2560/390; detail geometry and30 remote asset payload hashes saved.
- **passed** — `node m1/validate.mjs <each of four assigned models>`: All four models validate.
- **failed** — `python3 .scratch/62-all-sites/audit-apple-linear-products/fidelity-probe.py`: Exactly one missing action target: iPhone Air Buy; no model images missing.
- **passed** — `Python SHA256 check against renders/manifest.json`: All eight scoped baseline HTML/PNG artifacts match manifest hashes.
- **passed** — `git diff --check; git diff --exit-code HEAD -- m1 docs; git diff --cached --name-only`: Whitespace clean; tracked source/docs unchanged; empty staged index.
- **failed** — `First inline Python report generator`: Unescaped corpus filename braces in f-string raised NameError before report creation; retained ticket event, repaired local report generator.
- **passed** — `node .scratch/62-all-sites/audit-apple-linear-products/report.mjs`: Authoritative report and inspectable evidence inventory written.

Numeric/layout: `/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/measurements.json`, `/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/online/measurements.json`, `/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/detail-probes.json`.
Source/target: `/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/source-probes.json`, `/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/model-render-fidelity.json`, `/home/z/vibe/autofe-worktrees/62-all-sites/audit-apple-linear-products/.scratch/62-all-sites/audit-apple-linear-products/remote-asset-hashes.json`.
Replay `fidelity-probe.py` from this worktree; it is project-read-only and writes lane evidence. Its failure is a detected baseline defect, not infrastructure failure.

## Exact remaining coverage / risks

- 1920 full-height screenshots and geometry captured, but images not visually read (all four pages); no1920 experience PASS.
- 18 image reads consumed; three browser jobs consumed. Initial offline remote-image render retained but not used for Apple visual conclusions.
- Downscaled source sheets do not prove small-print/footnote/footer/legal-term completeness or contrast on Apple sources. Source captures themselves have unloaded/lazy blank areas.
- 390 iPhone17 comparison right-hand horizontal-scroll state not visually exercised; containment measured, document remains390px.
- No external action navigation/submission exercised; model target preservation checked against local HTML only.
- Computed contrast probe does not cover image backgrounds, blend/transparency compositing, focus/hover or input-state styling.
- Initial diagnostic baseline only; no source changes or fresh independent final-fix review. Unknown coverage remains INCOMPLETE.
- Remote asset bytes saved/hashes obtained during third detail job; original first online screenshot payload bytes were not intercepted. Screenshots, URLs and intrinsic dimensions are bound; temporal remote-content equality is not assumed.

## Routing

Route E1–E7 to engine/shared-axis renderer; C1–C4 to content. C4 needs a bounded content→engine interface for capture-backed imagery and source-supported paired surfaces. Preserve factual source/actions, closed grammar and brand variation; no presentation escape hatches or site-name templates. After repair regenerate proof at combined hashes and obtain fresh independent technical/experience review. Baseline audit evidence cannot accept future outputs.

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "Read-only diagnosis of exactly four assigned pages, with18 image reads and3 browser jobs; source/models/assets/docs unchanged. Baseline visual acceptance remains explicitly INCOMPLETE."
    },
    {
      "id": "criterion-2",
      "status": "satisfied",
      "evidence": "Inspectable screenshots, exact HTML/model/source hashes, source/geometry probes, replayable fidelity check, validator logs and exact unverified modalities saved."
    }
  ],
  "changedFiles": [
    "/home/z/.pi/agent/sessions/--home-z-vibe-autofe--/subagent-artifacts/outputs/cb0e12c1-b85a-4cb1-a055-55bf9c1b0c52/audit-apple-linear-products.md",
    ".scratch/62-all-sites/audit-handoff.json",
    ".scratch/62-all-sites/audit-apple-linear-products/ticket.md",
    ".scratch/62-all-sites/audit-apple-linear-products/changed-files.json"
  ],
  "testsAddedOrUpdated": [
    ".scratch/62-all-sites/audit-apple-linear-products/fidelity-probe.py (diagnostic only; project tests unchanged)"
  ],
  "commandsRun": [
    {
      "command": "node .scratch/62-all-sites/audit-apple-linear-products/capture.mjs",
      "result": "passed",
      "summary": "16 offline width captures; remote-image Apple views excluded from normal-load visual findings."
    },
    {
      "command": "node .scratch/62-all-sites/audit-apple-linear-products/capture-online.mjs",
      "result": "passed",
      "summary": "Eight loaded Apple captures at four widths; associated remote images loaded."
    },
    {
      "command": "node .scratch/62-all-sites/audit-apple-linear-products/detail-probes.mjs",
      "result": "passed",
      "summary": "Four pages at2560/390; detail geometry and30 remote asset payload hashes saved."
    },
    {
      "command": "node m1/validate.mjs <each of four assigned models>",
      "result": "passed",
      "summary": "All four models validate."
    },
    {
      "command": "python3 .scratch/62-all-sites/audit-apple-linear-products/fidelity-probe.py",
      "result": "failed",
      "summary": "Exactly one missing action target: iPhone Air Buy; no model images missing."
    },
    {
      "command": "Python SHA256 check against renders/manifest.json",
      "result": "passed",
      "summary": "All eight scoped baseline HTML/PNG artifacts match manifest hashes."
    },
    {
      "command": "git diff --check; git diff --exit-code HEAD -- m1 docs; git diff --cached --name-only",
      "result": "passed",
      "summary": "Whitespace clean; tracked source/docs unchanged; empty staged index."
    },
    {
      "command": "First inline Python report generator",
      "result": "failed",
      "summary": "Unescaped corpus filename braces in f-string raised NameError before report creation; retained ticket event, repaired local report generator."
    },
    {
      "command": "node .scratch/62-all-sites/audit-apple-linear-products/report.mjs",
      "result": "passed",
      "summary": "Authoritative report and inspectable evidence inventory written."
    }
  ],
  "validationOutput": [
    "11 open baseline findings:7 engine,4 content.",
    "Whole-height images inspected at2560/1440/390; geometry probed at2560/1920/1440/390.",
    "No measured document overflow or intrinsic image upscaling; contained iPhone17 comparison scrolling is allowed."
  ],
  "residualRisks": [
    "1920 full-height screenshots and geometry captured, but images not visually read (all four pages); no1920 experience PASS.",
    "18 image reads consumed; three browser jobs consumed. Initial offline remote-image render retained but not used for Apple visual conclusions.",
    "Downscaled source sheets do not prove small-print/footnote/footer/legal-term completeness or contrast on Apple sources. Source captures themselves have unloaded/lazy blank areas.",
    "390 iPhone17 comparison right-hand horizontal-scroll state not visually exercised; containment measured, document remains390px.",
    "No external action navigation/submission exercised; model target preservation checked against local HTML only.",
    "Computed contrast probe does not cover image backgrounds, blend/transparency compositing, focus/hover or input-state styling.",
    "Initial diagnostic baseline only; no source changes or fresh independent final-fix review. Unknown coverage remains INCOMPLETE.",
    "Remote asset bytes saved/hashes obtained during third detail job; original first online screenshot payload bytes were not intercepted. Screenshots, URLs and intrinsic dimensions are bound; temporal remote-content equality is not assumed."
  ],
  "noStagedFiles": true,
  "diffSummary": "Only scoped diagnostic report, ticket, evidence/scripts and routing handoff. No implementation changes.",
  "reviewFindings": [
    "E1–E7 and C1–C4 remain open in baseline; no acceptance of future repairs."
  ],
  "manualNotes": "Route repairs to exclusive engine/content owners, then fresh independent final-revision technical/experience review. This lane has no source repair authority."
}
```
