import json,hashlib
from pathlib import Path
root=Path.cwd();out=root/'.scratch/62-all-sites/audit-sspai-editorial'
report=Path('/home/z/.pi/agent/sessions/--home-z-vibe-autofe--/subagent-artifacts/outputs/cb0e12c1-b85a-4cb1-a055-55bf9c1b0c52/audit-sspai-editorial.md')
pages=['sspai-com/'+p for p in ['home','matrix','post-102392','post-114699','u-jtc092al']]
h=json.loads((out/'covered-hashes.json').read_text());measure=json.loads((out/'measurements.json').read_text());inv=json.loads((out/'source-inventory.json').read_text())
for f in ['m1/render.mjs']:
 h[f]=hashlib.sha256((root/f).read_bytes()).hexdigest()
(out/'covered-hashes.json').write_text(json.dumps(h,indent=2))
findings=[]
def add(id,owner,severity,ps,criterion,location,render,source,geometry,fix,evidence):
 findings.append(dict(id=id,owner=owner,severity=severity,pages=ps,criterion=criterion,location=location,renderEvidence=render,sourceEvidence=source,geometryEvidence=geometry,improvementCriterion=fix,evidence=[str(out/f) for f in evidence]))
add('E1','engine','high',pages,'Coherent whole-page/shared-axis alignment and image/title/actions grouping','main > article > h1.title; .depth-1.w-wide/.w-narrow; .meta; figure.strip',
 'Root title takes a separate narrower axis on every page. Home/Matrix/news alternate wide collections with inset utility/readable sections. Article102392 separates title, cover, byline and body; user title sits120px right of profile/content edge.',
 'Source portal deliberately has multiple columns; those are legitimate. Source article102392 title, cover and body all share x380/w680. The defect is introduced uncoordinated sibling-frame shifts, not centered whitespace or full-bleed itself.',
 'At2560 root h1 x960/w640 on all five. Home banner/editors/feed x664/w1232 vs promo/campaigns/tabs/friends depth-1 x840/w880. Matrix feed x664/w1232 vs filters/yipai/sidebar-derived sections x840/w880. News title x960, author x664, meta x840, news x664. Article102392 img x593/w1374, title x960/w640, byline x664/w1232, body x840/w880. User title x960 vs profile x840/w880. Same desktop shifts at1920/1440;390 collapses main sections to x16/w358.',
 'Shared decisions must establish an intentional page frame with heading/byline/controls on the corresponding content edge, and intentional consistent reading/cover grouping for articles. Preserve justified source columns and brand variation; do not fix by blanket centering or site-name CSS.',
 ['measurements.json','focus.json','home-2560-main-full.png','matrix-2560-main-full.png','post-102392-2560.png','post-114699-2560-main-full.png','u-jtc092al-2560-main-full.png','home-axis-utilities.png'])
add('E2','engine','high',['sspai-com/post-114699'],'Readable density; shared semantic axes/closed grammar','news._items; .g-news .cards > .item; briefs._items',
 'Seven article-body news sections become four-column cards with long paragraphs wrapping into narrow strips. They read as a dashboard rather than sequential editorial sections. Source paragraphs are also missing (separate C2).',
 'Source news h2/body x380/w680, stacked in article order; readable first-two-section and Panasonic/Bose crops show this is long-form editorial prose, not compact comparable values.',
 '2560/1920/1440 news title/prose lane inside each card is271.5px, grid1232px. First-row card heights roughly390–454px; section883px.390 stacks at332px internal width (body visual middle not fully inspected).',
 'Use existing semantic comparability/compactness rules to keep long editorial sections in reading order at a coherent reading width, not cramped four-way comparison; preserve all titles/actions/images. No model presentation escape hatch or site-specific rule.',
 ['post-114699-source-flow.png','post-114699-source-product-images.png','measurements.json','focus.json'])
add('E3','engine','medium',['sspai-com/u-jtc092al'],'Readable density and compact utilities','_lines[2]._lines; .depth-1 statistics section',
 'Five tiny statistical facts consume564px of vertical page height, pushing activity down to y979 on desktop. Large independent section gaps make a short profile panel look unfinished.',
 'Original profile statistics occupy a compact120px-high panel (nodes bbox x406/y306/w628/h120); source ordered heterogeneous facts are not authority to relabel _lines as a comparable grid.',
 'Stats depth-1 h564 desktop and390; title/body insets are E1. Source panel120px. Value/title pairs are commonly separated into ~94px blocks in baseline.',
 'Keep ordered non-comparable facts sequential under the existing grammar, but give short title/value utility facts compact spacing and coherent grouping; avoid promoting them to large content chapters.',
 ['u-jtc092al-source-profile.png','u-jtc092al-2560-main-full.png','measurements.json','focus.json'])
add('E4','engine','medium',['sspai-com/home'],'Compact utility density and image/title/action cohesion','banner._items; editors._items; .g-banner/.g-editors',
 'Two five-item utility/image collections each use four cards plus an isolated second-row card. These two groups alone take1495px before narrower utilities; content feed begins y2033 on desktop. The extra trailing-row whitespace materially overgrows the portal utilities, beyond merely legitimate outer centered whitespace.',
 'Source presents the banner as a horizontal carousel (all five source img boxes continue x481,959,1437,1915,2393) with one active478px square and adjacent editorial/promotional lanes. It does not display two full stacked 4+1 utility grids above the feed.',
 'At all desktop probes banner827.8px and editors667.5px tall; feed y2032.6.390 has full stacked collections, banner2337px and editors1739px; middle mobile rendering is not visually accepted.',
 'Reduce overgrown short utility/image grouping height while keeping every source item/action recoverable and image at or below natural dimensions. Balance compactness using general shared decisions; do not arbitrarily enlarge pictures or force a universal carousel/centering design.',
 ['home-2560-main-full.png','home-1440-source-full.png','home-axis-utilities.png','measurements.json'])
add('E5','engine','high',['sspai-com/home','sspai-com/matrix','sspai-com/post-102392','sspai-com/post-114699'],'Paired surface/foreground contrast','a.self-link.nav and .linklist links on white',
 'Small link/title text is bright pale blue on white. Computed normal/small-text contrast is3.056:1, below4.5:1 accessibility benchmark and visibly faint in actual cards.',
 'Source mostly uses dark editorial titles and distinct compact controls. Preserve brand variation; this finding is about the paired foreground/background, not imposing a universal hue.',
 'rgb(0,151,255) / rgb(255,255,255); card font17.92px weight700 (below18.67px large-bold threshold); missed-story links16px. Examples on home, Matrix, related102392 and past-issues114699. User dynamic23.2px bold is large text and is NOT included in this small-text failure.',
 'Normal/small rendered link text must be legible on its actual surface (at least4.5:1 where applying AA benchmark), with large-text/controls checked using their appropriate contrast thresholds; fix shared paired tokens without washing out surfaces.',
 ['focus.json','home-2560-main-full.png','matrix-source-images.png','post-102392-source-examples.png','post-114699-2560-main-full.png'])
add('E6','engine','high',['sspai-com/home','sspai-com/u-jtc092al'],'Responsive readable density; no one/two-character columns','.defrow .deflabel/.defval; friends._items and user _lines[3]._items',
 'At390 long article labels squeeze the adjacent category/date values into narrow columns. User dates break even numeric tokens into four lines (01/20 -> 01/2 +0); home category values wrap into one/two-character rows. No document overflow still reports success.',
 'Source desktop rows have readable date/category tags; original390 source was not captured, so no claim of pixel parity on mobile. Defect is directly observed in actual baseline390 top/bottom crop.',
 'User 01/20 10:35: label305.58px/value38.42px/value97.25px high at390 vs83.17px/24.31px desktop. Home 深度好文 value41.95px high48.63px at390 vs60px/high24.31px desktop.',
 'At390 preserve whole date tokens and readable category words by allocating sufficient value width or stacking label/value. Keep every target/value and prevent page overflow; geometry must detect squeezed internal columns, not only document width.',
 ['mobile-top-bottom-only.png','deflist-probe.json'])
add('E7','engine','high',['sspai-com/matrix'],'Preserve all source/model actions and exact targets','feed-view._items[0..2]._action; fieldset.expose-matrix-feed-view',
 'Three correct model navigation actions are swallowed by exposure rendering. Output contains radio inputs with key values and labels only: no anchor href, handler or script. Choosing Hot/Random does not supply a navigation destination.',
 'Source anchors target /matrix, /matrix/hot, /matrix/random. Model has exact corresponding absolute URLs. Therefore no factual-model correction is needed to recover these known targets.',
 'Same baseline HTML used at four widths; .expose-matrix-feed-view is355px wide desktop and fits358px mobile. Geometry/validators pass despite lost navigation.',
 'Render all three declared navigation targets as accessible actionable destinations while preserving existing exposure/selection grammar and shared axis decisions. Verify model-to-HTML AND Markdown action fidelity, not only form geometry.',
 ['source-inventory.json','measurements.json','matrix-2560-main-full.png'])
wrong=[]
for row in inv:
 for a in row['targetNotExactInSource']:
  if row['page']=='home':needle='how-to-obtain-data-for-agent-analysis'
  elif a['path']=='$.briefs._items[1].source._action':needle='bleepingcomputer'
  else:needle='douyin.com'
  expected=next(b['attrs']['href'] for b in row['anchors'] if needle in b['attrs'].get('href',''))
  if expected.startswith('/'):expected='https://sspai.com'+expected
  wrong.append({'page':'sspai-com/'+row['page'],'path':a['path']+'.to','actual':a['to'],'source':expected})
add('C1','content','high',['sspai-com/home','sspai-com/post-114699'],'Faithful exact action targets','home feed._items[3]._action.to; news briefs._items[1..2].source._action.to',
 'Three targets are truncated/wrong. Agent ends agent-a instead of agent-analysis; BleepingComputer ends some-use instead of some-users%2F; Douyin ends %3Ffro instead of the complete from_tab_name/modal_id/vid query.',
 'Exact local dom.html anchors are recorded as wrongTargets in handoff. Existing output faithfully repeats these wrong model strings; no remote click/status test performed.',
 'Content defect independent of viewport. All other declared model URLs were found exactly in source (absolute/relative sspai normalization), not proof every source action is modeled.',
 'Replace these three target bytes with stored source targets, preserve text/action semantics, validate and rerender. No invented destination or live external execution needed.',
 ['source-inventory.json','source-inventory-summary.txt','measurements.json'])
add('C2','content','high',['sspai-com/post-102392','sspai-com/post-114699'],'Faithful facts/actions/images; meaningful whole-page articles','102392 lead/body/closing/related; 114699 news._items',
 '102392 is reduced to a few summary sentences: missing four syntax/example images, captions, body facts and Part.I/II manual actions; only one of four source related stories remains.114699 loses cover and Panasonic/Bose images, EU proposal second paragraph/status, Kimi later capabilities and Bose second-model facts while leaving the left/right caption without its image.',
 'Source102392 body image URLs contain dd3dfc65...,0f1dfabe...,84aa0dee...,ebb1fcda...; source114699 product images a5eb9d7b... and18e25fb5...; source cover045d7312.... Readable crops show darksrc=invert / darksrc=xxx.jpg syntax, full prose and manual links. All exact anchors/images inventoried in local source-inventory.json.',
 'Source102392 article x380/w680; syntax/example images y1729.55,1922.39,2324.39,2559. Source114699 cover x336/y56/w768/h330, Panasonic image x413/y3199.97/w614/h244, Bose x380/y3970.13/w680/h355.33. Baseline102392 has only cover+one related image;114699 has only five past-issue images.',
 'Recover substantive captured paragraphs, instructional images/captions/attribution and linked learning entrances with exact source targets under existing closed grammar. Recover news cover/product images and associated full facts. Preserve attribution and natural-size bounds; no fabricated paraphrase treated as source quote.',
 ['post-102392-source-examples.png','post-114699-source-flow.png','post-114699-source-product-images.png','source-inventory.json','measurements.json'])
add('C3','content','high',['sspai-com/u-jtc092al'],'No invented facts; source-faithful profile','_lines[2]._lines[3] and missing source writeCount16557',
 'Profile adds 获得充电4 with no support in stored source capture; source profile instead shows article25, writeCount16557, viewCount23535, badge0, since2025 and529days. Character-count datum16557 is omitted. This is an unsupported fact, not proof that actual charging count is zero.',
 'Source dom.html id=writeCount carries16557 with ssCommunityIcon__character--fill; id=viewCount carries23535. No source text label 获得充电 appears. Source screenshot panel corroborates captured values.',
 'Unsupported model fact is visible at desktop and mobile; compactness of resulting section is separately E3.',
 'Remove unsupported charging datum or provide genuine captured provenance; preserve the observed16557 datum with source-supported semantic label (do not guess charging). Preserve25/23535/0/529/SINCE2025 correctly.',
 ['u-jtc092al-source-profile.png','source-inventory-summary.txt','source-inventory.json'])
add('C4','content','medium',['sspai-com/matrix','sspai-com/u-jtc092al'],'Cohesive source image/title/action attribution','matrix feed._items._image; profile identity/activity images',
 'Matrix and user models contain no image values at all. Original Matrix visible articles have identity-bearing160x100 covers; user has a MaxChow avatar and first-three activity covers. Output becomes text-only and loses those source associations.',
 'Matrix source first cover at x718/y321/w160/h100; subsequent tennis/design/storage/CRM covers shown in readable crop. User source full-height sheet visibly shows avatar and first three VLOOK cover thumbnails (later lazy placeholder images are not claimed loaded).',
 'Browser confirms zero images for Matrix and user at all four widths; capture source inventory retains exact CDN URLs/alt/data-src. No broken-image gate can detect an entirely omitted modeled image.',
 'Restore genuine captured image/alt/attribution associations for loaded source covers/avatar using factual model/assets only. Do not synthesize missing/lazy pixels or enlarge pictures; preserve title/action grouping.',
 ['matrix-source-images.png','u-jtc092al-1440-source-full.png','source-inventory.json','measurements.json'])
add('C5','content','medium',pages,'Complete compact source utilities/footer and known actions','missing shared source navigation/footer facts in five curated models',
 'Models omit the source navigation destinations 共创 /create, PRIME /prime, Matrix /matrix, 栏目 /series (some destinations incidentally appear elsewhere). Home/Matrix/both posts omit captured about/agreement/business utility links; Matrix/posts also omit download/contact. Rendering has only a generic page title, not a compact source utility identity/navigation/footer group.',
 'Exact source anchors are in source-inventory.json. Source footer appears in full source sheets for Matrix/posts; home has side-rail utility links. User capture has no visible footer, so no user-footer loss claim.',
 'No .g-nav or .g-footer nodes in the five output pages; omitted source utility actions cannot be detected by model-to-HTML gates. All widths inherit the same missing modeled facts.',
 'Preserve captured identity/navigation/footer facts and targets in compact semantically grouped utilities using existing grammar; engine may style shared utility groups. Do not invent a mandatory generic giant site heading or force source side-rails into universal centering.',
 ['source-inventory.json','home-1440-source-full.png','matrix-1440-source-full.png','post-102392-1440-source-full.png','post-114699-1440-source-full.png'])
coverage={}
for page in pages:
 p=page.split('/')[1];coverage[page]={
 '2560':{'geometry':'checked','visual':'whole-height inspected','evidence':str(out/f'{p}-2560.png'),'inspectionImage':str(out/(f'{p}-2560.png' if p=='post-102392' else f'{p}-2560-main-full.png'))},
 '1920':{'geometry':'checked','visual':'not inspected','evidence':str(out/f'{p}-1920.png')},
 '1440':{'geometry':'checked','visual':'whole-height rendered/source comparison sheet inspected','evidence':str(out/f'{p}-1440-source-full.png')},
 '390':{'geometry':'checked','visual':'top and bottom only; middle incomplete','evidence':str(out/f'{p}-390.png'),'inspectionImage':str(out/'mobile-top-bottom-only.png')},
 'source':{'dom':'anchors/images and targeted factual contexts checked','nodes':'targeted layout/factual geometry checked','image':'whole-height overview and relevant readable crops checked; not exhaustive fine-text pixel inspection'},
 'pageStatus':'DEFECTS_FOUND; final visual acceptance INCOMPLETE','findings':[f['id'] for f in findings if page in f['pages']]}
covered={}
for page in pages:
 p=page.split('/')[1];covered[page]={f:h[f] for f in [f'm1/curated/sspai-com/{p}.json',f'm1/curated/renders/sspai-com-{p}.html',f'corpus/sspai-com/{p}/dom.html',f'corpus/sspai-com/{p}/nodes.json',f'corpus/sspai-com/{p}/full.png']}
limits=['Initial immutable-baseline diagnosis only; not independent acceptance of future repaired/integrated output.',
 '1920 full-height screenshots captured and geometry checked, but visual inspection not performed.',
 '390 geometry and top/bottom visual crops checked; middle whole-height visual inspection remains incomplete.',
 'Long1440/source comparison sheets were overview scans; readable crops/DOM cover identified defects, not every fine-text source pixel or every source fact/action.',
 'No remote destination navigation, authenticated interaction, backend/form submission or assistive-technology exercise; three wrong URLs proven against stored capture only.',
 '18/18 image reads and3/3 sequential browser jobs consumed; no setup rerun, source writes or dependencies installed.',
 'Five-page validators pass, but contrast/action/source omissions and mobile squeezed columns prove static gates cannot establish visual/factual acceptance.',
 'No protected seven-reference page was changed or accepted by this lane; other pages excluded.']
handoff={'pages':pages,'coveredHashes':{'baselineCommit':'403cd5be096db89b428e130ad57cca730b425fdc','manifest':str(out/'covered-hashes.json'),'pageInputs':covered},'coverage':coverage,'findings':findings,'engineFindings':[f['id'] for f in findings if f['owner']=='engine'],'contentFindings':[f['id'] for f in findings if f['owner']=='content'],'wrongTargets':wrong,'status':'INCOMPLETE','diagnosticStatus':'five-page baseline audit complete with confirmed defects; no clean-page or PASS verdict','report':str(report),'limits':limits}
# Local machine handoff is evidence; runtime Markdown path is the authoritative report.
(root/'.scratch/62-all-sites/audit-handoff.json').write_text(json.dumps(handoff,ensure_ascii=False,indent=2))
lines=['# 少数派 editorial baseline audit','', '**Verdict: INCOMPLETE for visual delivery acceptance; confirmed defects on all five pages.** This is scoped baseline diagnosis, not acceptance of later fixes. Source/model/assets/owning Docs and generated gallery were read-only. No clean-page/PASS claim.','',
 '## Evidence and coverage','',f'- Baseline: `403cd5be096db89b428e130ad57cca730b425fdc`.',f'- Machine handoff: `{root}/.scratch/62-all-sites/audit-handoff.json`.',f'- Ticket, screenshots, exact SHA-256 manifest, measurements and source inventories: `{out}`.',
 '- Existing local Playwright/headless-shell: three sequential one-browser/one-page jobs; eighteen image reads. No installation/setup rerun.',
 '- All20 page-width geometries: no document overflow, broken images or image width greater than intrinsic width. These narrow successes do not establish whole-page acceptance.',
 '- Validators: five curated models return `ok`; exposure navigation loss, source omissions and contrast failures survive this gate.','',
 '| Page |2560 whole height|1440 rendered/source|1920|390|', '|---|---|---|---|---|']
for page in pages:lines.append(f'|`{page}`|Inspected|Whole-height comparison + targeted readable evidence|Geometry only; visual incomplete|Geometry + top/bottom; middle incomplete|')
lines+=['','All2560 content regions were inspected; post102392 full viewport was additionally read because its cover extends beyond the main crop. All1440/source sheets preserve100% of image height. Long source pages require downscaled overviews plus readable targeted crops; exhaustive source fine-text review is not claimed.','',
 '## Engine findings','']
for owner in ['engine','content']:
 if owner=='content':lines+=['## Content findings','']
 for f in findings:
  if f['owner']!=owner:continue
  lines += [f"### {f['id']} — {f['severity']}: {f['criterion']}",f"- **Pages / location:** {', '.join('`'+p+'`' for p in f['pages'])}; `{f['location']}`.",f"- **Rendered defect:** {f['renderEvidence']}",f"- **Source / geometry:** {f['sourceEvidence']} {f['geometryEvidence']}",f"- **Falsifiable repair criterion:** {f['improvementCriterion']}",'- **Evidence:** '+', '.join('`'+str(Path(x).name)+'`' for x in f['evidence'])+'.','']
lines+=['### C1 exact wrong targets','']
for w in wrong:lines += [f"- `{w['page']}` `{w['path']}`",f"  - Model: `{w['actual']}`",f"  - Captured source: `{w['source']}`"]
lines+=['','## Preservation / non-defects','',
 '- Source home banner alt explicitly says **iPhone18 配件一站式配齐**. The image lettering alone looked less specific; DOM corroborates the modeled label. It is **not** an invented-fact finding. Keep it.',
 '- Centered reading lanes and deliberate source portal/sidebar variation are allowed. The absence of pixels at the outer viewport is not a defect. E1 addresses uncoordinated shared edges.',
 '- No image exceeds natural width in these captures. Article102392 cover is1374px wide (its natural width); the problem is inconsistent editorial grouping/frame, not a proven native-image enlargement.',
 '- User dynamic title is23.2px bold; its3.056:1 contrast meets the large-text3:1 benchmark. E5 does not incorrectly count it as a small-text failure.',
 '- Existing user heterogeneous `_lines` statistics must not be relabeled as comparable just to make a grid. E3 asks for compactness while preserving semantic order.',
 '- All model URLs except Matrix exposure navigation survive into HTML. This proves E7 engine ownership, not completeness against source; C1 is factual-model ownership.',
 '','## Limits and next step','']
lines += ['- '+l for l in limits]
lines+=['', 'Route E1–E7 to engine and C1–C5 to content, then render and run fresh independent whole-height experience/factual/action review at the final combined revision. Remaining1920 visual and390 middle coverage must be supplied before delivery acceptance. No page implementation or independent final review was performed by this lane.','']
report.parent.mkdir(parents=True,exist_ok=True);report.write_text('\n'.join(lines))
print(json.dumps({'report':str(report),'handoff':str(root/'.scratch/62-all-sites/audit-handoff.json'),'status':'INCOMPLETE','pages':len(pages),'engineFindings':7,'contentFindings':5,'wrongTargets':len(wrong)},ensure_ascii=False))
