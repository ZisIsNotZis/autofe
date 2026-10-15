import json,hashlib,subprocess, pathlib, shutil,datetime,collections,os
R=pathlib.Path('/home/z/vibe/autofe'); O=R/'.scratch/62-all-sites/owner-trace'; O.mkdir(exist_ok=True)
def run(*args): return subprocess.check_output(args,cwd=R,text=True,timeout=180)
def h(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,x): p.write_text(json.dumps(x,indent=2)+'\n')
x=json.loads((R/'.scratch/62-all-sites/link-closure/fresh-final-hashes.json').read_text()); roster=json.loads((R/'.scratch/62-all-sites/roster.json').read_text()); pending=json.loads((R/'.scratch/62-all-sites/link-closure/strict-owner-pending.json').read_text())
before=run('git','status','--porcelain=v1'); index=run('git','diff','--cached','--name-only'); assert not index
assert run('git','rev-parse','HEAD').strip()==x['rootHEAD']
allhash={**x['files'],**x['markdown'],**x['sources']}; bad=[p for p,v in allhash.items() if not (R/p).exists() or h(R/p)!=v]; assert not bad,bad
(O/'root-dirt-before.txt').write_text(before); (O/'process-before.txt').write_text(run('ps','-eo','pid,etime,args'))
(O/'ticket.md').write_text('# Freeze candidate experience / owner-trace planning\n\n'+datetime.datetime.now().astimezone().isoformat()+' actor=delegate: planning/isolation only. Contract: verify frozen exact current hashes/index/dirt; create eight isolated candidate experience lanes with complete exclusive42 coverage; retain131 unknown mappings in shared-consumption inventory, no implementation/audit replay. Measure: zero hash mismatches,42 unique pages,8 lanes, empty root index, preserved original dirt. Commands bounded180s; no recursive agents or source changes. Private detached snapshots reuse existing historical commit and exact-current overlay; HEAD is not candidate revision.\n')
cohorts=roster['cohorts']; cohorts['sspai-editorial'].append('sspai-com/post-114716'); cohorts['mi-commerce'].append('mi-com/product-detail-mi15'); cohorts['apple-linear-products']+=['apple-com/home','apple-com/ipad-air']; cohorts['media-auth-utility']+=['bilibili-com/home','airbnb-com/room-28871']; cohorts['36kr-news-search'].append('taobao-com/home')
flat=[p for v in cohorts.values() for p in v]; assert len(flat)==len(set(flat))==42 and set(flat)==set(roster['gallery'])
lanes=[]; validations=[]
for key,pages in cohorts.items():
 cwd=pathlib.Path('/home/z/vibe/autofe-worktrees/62-all-sites')/('candidate-experience-'+key+'-d08ef5b1'); assert not cwd.exists()
 run('git','worktree','add','--detach',str(cwd),x['baseline'])
 for p in {**x['files'],**x['markdown']}:
  dst=cwd/p;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(R/p,dst)
 cp=cwd/'corpus'
 if not cp.exists(): cp.symlink_to(R/'corpus',target_is_directory=True)
 assert cp.is_symlink(),str(cp)
 local=cwd/'.scratch/62-all-sites/candidate-experience'; local.mkdir(parents=True,exist_ok=True)
 save(local/'frozen-hashes.json',x)
 refs=[]
 for page in pages:
  slug=page.replace('/','-'); refs.append({'page':page,'acceptedReference':page in roster['acceptedReferences'],'titleChange':page in roster['identityFixes'],'model':'m1/curated/'+page+'.json','html':'m1/curated/renders/'+slug+'.html','png':'m1/curated/renders/'+slug+'.png','source':'corpus/'+page,'sha256':{p:v for p,v in allhash.items() if p.startswith('corpus/'+page+'/') or p in ['m1/curated/'+page+'.json','m1/curated/renders/'+slug+'.html','m1/curated/renders/'+slug+'.png']}})
 save(local/'pages.json',refs)
 (local/'packet.md').write_text('# CANDIDATE EXPERIENCE — '+key+'\n\nRead owning `docs/m1/layout-axes.md` and root task packet `/home/z/vibe/autofe/.scratch/62-all-sites/packet.md`. Immutable candidate revision: '+x['revision']+'. Detached HEAD is only historical origin; `frozen-hashes.json` binds exact bytes. `pages.json` supplies current HTML/PNG/models/captured dom,nodes,full image references and hashes. Verify before use. Root proof `/home/z/vibe/autofe/.scratch/62-all-sites/link-closure/` is read-only.\n\nInspect every listed page at2560/1920/1440/390px through actual whole height with readable overlapping strips, source/image comparison, actions, density, coherent frames/contrast/media and compact identities. Official PNG is ordinary1280px only: matching hash permits reuse at that modality, never four-width PASS. New captures/logs go ONLY under this local directory; never mutate HTML/models/assets/shared corpus/root proof or run output-writing pipeline. No stale view reuse. Preserve captured facts/exact actions/order/ownership; closed grammar/shared axis, no invented content/site UI escape/upscale. Apple fullbleed allowed. Protect seven accepted references; title fixes Apple/Taobao need compact content-edge identity.\n\nThis is independent CANDIDATE EXPERIENCE review before final code acceptance, not milestone PASS. Record each page/width/modality checked or unavailable, source/HTML/image hashes, concrete defect/location/evidence/expected outcome/seam; unknown AC is INCOMPLETE. No repairs. Root sole writer may change trace proof in parallel without changing this immutable snapshot. Next integrator owns combined experience fixes/final delta and fresh review. Report local `report.md` and `coverage.json`.45min slice, checkpoint at35min/per-family, commands<=180s; one active browser/page, max8 lanes. Two no-progress attempts=>checkpoint. No agents, installs, external compute/spending/publication/staging/root commits.\n')
 mismatches=[p for p,v in allhash.items() if h(cwd/p)!=v]; assert not mismatches
 validations.append({'key':key,'verifiedFiles':len(allhash),'mismatches':0}); lanes.append({'key':key,'cwd':str(cwd),'pages':pages})
 (O/'ticket.md').open('a').write(datetime.datetime.now().astimezone().isoformat()+' actor=delegate: cohort '+key+' frozen; '+str(len(pages))+' pages; zero mismatches.\n')
# Consumption-oriented partition from actual rendered addresses; retain diagnostic classification separately.
groups=collections.defaultdict(list)
for case in pending['cases']:
 ctx=case.get('contexts',[]); addrs=[c.get('renderAddress','') for c in ctx]
 if any('/td[' in a or '/th[' in a for a in addrs): phenotype='table-cell-consumption'
 elif any('/p[' in a or '/li[' in a for a in addrs): phenotype='inline-paragraph-list-consumption'
 else: phenotype='scope-card-direct-action-consumption'
 groups[phenotype].append(case)
assert sum(map(len,groups.values()))==131
save(O/'inventory.json',{'count':131,'pageCount':len(set(c['page'] for c in pending['cases'])),'revision':x['revision'],'grouping':'render-address consumption shape; source scope/owner evidence stays in each complete case; hypotheses not wrong-URL verdicts','groups':groups,'sourceHashes':x['sources']})
protected=[p for p in x['files'] if p not in ['m1/eval/link-owners.mjs','m1/eval/link-coverage.mjs','m1/eval/link-source-witnesses.mjs','m1/eval/link-owner-selftest.mjs','m1/eval/link-witness-selftest.mjs','m1/eval/link-owner-witnesses.json']]
save(O/'protected-files.json',{'protectedHashes':{p:x['files'][p] for p in protected},'sourceHashes':x['sources'],'rule':'No UI/model/target/assets/output/docs redesign. Renderer consumption instrumentation only on concrete proof, explicitly record necessary path and preserve visual bytes/behavior; root sole writer owns approved mapping delta.'})
packet='''# Sole-writer ownership-trace continuation + frozen candidate experience

Objective remains polished35+7/title delivery, NOT checker perfection. Planning only completed; no source repairs or visual PASS.

## Frozen boundary / evidence
Current revision: REVISION. `validation.json` independently checks every supplied source/output/Markdown/capture hash and eight copies. `root-dirt-before.txt`, `process-before.txt`, `ticket.md` preserve actual-clock baseline. All old proof/private refs remain unchanged. Root index empty. Full prior authoritative packet: ../link-closure/final-oracle-review-packet.md; latest handoff ../link-closure/handoff.json; task ../packet.md; owning facts docs/m1/layout-axes.md. Historical snapshot HEAD is not candidate revision.

## Exact131 continuation
`inventory.json` retains all131 cases, actual rendered addresses, model owners/actions/entities, candidate scopes and source hashes, grouped by rendered table-cell, inline-paragraph/list, or scope/card/direct consumption shape, not an all-new target audit. Current diagnostics87 scope capability/23 entity/21 caption associations remain hypotheses.131 unknown owner associations on18 pages are NOT131 proven wrong URLs. Preserve36 mandatory source bindings/21 corrected original cases and all author/attribution/action order.

Current failure commands: `node m1/eval/link-coverage.mjs --json` (131 render-owner-unverified); `node m1/eval/pipeline.mjs` (link-only failure). Existing exact outputs ../link-closure/links-strict-render-owner.json and pipeline-strict-final.log. Do not replay audits/setup/source repairs or weaker global URL/caption fallback. Old negative probes: ../link-closure/final-oracle-review-packet.md records rejected accessible-image/aria expansion and broad unlabeled-caption containment; retained original dispositions/current21 proof remain linked there. CurrentAPI: link-owners.mjs parseLinkTree/descendants/sourceScopes/ownerOracle.contexts/action/fact; link-coverage.mjs strict render association; link-source-witnesses.mjs checkSourceWitnesses; render.mjs data-model-owner instrumentation. Associate captured source ownership with actual rendered consumption, not URL coincidence or target-led source search. Add falsification for inline/table/scope phenotypes and existing peer URL swaps/moved owners/whole capability deletion.

## Exclusive seam ownership
One assigned ROOT sole writer: proof/consumption mapping only, initial allowlist m1/eval/link-owners.mjs, link-coverage.mjs, link-source-witnesses.mjs, link-owner-selftest.mjs, link-witness-selftest.mjs, link-owner-witnesses.json; own new tests/proof records only. `protected-files.json` enumerates exact protected source/output hashes incl all models/assets/renderers/axes/Docs; any necessary renderer-only consumption instrumentation requires concrete failing proof and recorded scoped exception, never UI redesign or model target edits absent concrete captured evidence. Source freeze ends only when Main assigns that sole writer. Original dirt/corpus/proof/private refs preserved; no staging/root commit/publication/dependency changes.

Eight independent read-only experience reviewers own only local records/captures in dispatched immutable worktrees, complete42 exclusive coverage including seven/titlechanges. Packets local .scratch/62-all-sites/candidate-experience/packet.md. They evaluate actual candidate pages while separate trace implementation proceeds, never claim final code or milestone acceptance. Next assigned integrator alone owns combined experience repairs, generated output, final delta/proof and routing fresh technical/experience review. Main routing only.

## Bounded continuation
Root writer60min slice/checkpoint50min, commands<=600s, per-family checkpoint, two no-progress attempts=>new evidence-backed hypothesis or routed continuation. Reviews45min/checkpoint35min/commands<=180s; max8 browsers, one active page each. No children. Final combined42x4 source-aware whole-height experience and independent technical acceptance remain INCOMPLETE. Static gates alone cannot PASS.
'''.replace('REVISION',x['revision'])
(O/'packet.md').write_text(packet)
save(O/'validation.json',{'revision':x['revision'],'rootVerifiedFiles':len(allhash),'rootMismatches':0,'lanes':validations,'uniquePages':42,'laneCount':8,'pendingMappings':131,'pendingPages':18,'phenotypeCounts':{k:len(v) for k,v in groups.items()},'rootIndexEmpty':not run('git','diff','--cached','--name-only'),'originalDirtPreserved':all(line in run('git','status','--porcelain=v1').splitlines() for line in before.splitlines())})
(O/'report.md').write_text('# Planning/isolation result\n\nREADY FOR ROUTING candidate experience and sole-writer trace continuation, NOT delivery PASS. Eight exact-current isolated review worktrees cover42 pages once; all1021 supplied hashes match root and every worktree.131 unknown mappings/18 pages retained losslessly. No source changes, staging or old audit replay. See validation.json and dispatch.json. Snapshots immutable by contract; shared corpus read-only by contract, not OS enforcement. New reviewer captures required for four widths; existing1280px PNGs do not establish whole-height four-width acceptance.\n')
save(O/'dispatch.json',{'status':'CANDIDATE_REVIEW_READY_DELIVERY_INCOMPLETE','packet':str(O/'packet.md'),'lanes':lanes,'report':str(O/'report.md'),'reviews':'CANDIDATE EXPERIENCE only; immutable current bytes','remainingPageCount':18,'blockers':[{'kind':'unverified-render-owner','count':131,'inventory':str(O/'inventory.json')}]})
assert (O/'dispatch.json').stat().st_size<10000
(O/'ticket.md').open('a').write(datetime.datetime.now().astimezone().isoformat()+' actor=delegate: planning validation passed; source unchanged/index empty/original dirt retained. Delivery acceptance remains incomplete.\n')
print(json.dumps(json.loads((O/'validation.json').read_text())))
