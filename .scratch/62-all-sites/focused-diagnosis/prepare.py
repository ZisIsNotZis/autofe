import hashlib,json,pathlib,subprocess,datetime,os
R=pathlib.Path('/home/z/vibe/autofe'); O=R/'.scratch/62-all-sites/focused-diagnosis'; C=R/'.scratch/62-all-sites/integration/remainder'; X=json.loads((C/'checkpoint-hashes.json').read_text())
def cmd(*args,cwd=R): return subprocess.check_output(args,cwd=cwd,text=True,timeout=180).strip()
def h(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def clock(): return cmd('date','-Iseconds')
def log(s):
 with (R/'.scratch/62-all-sites/ticket.md').open('a') as f:f.write('\n- '+clock()+' — focused-diagnosis preparation worker: '+s+'\n')
head=cmd('git','rev-parse','HEAD'); index=cmd('git','diff','--cached','--name-only'); status=cmd('git','status','--porcelain=v1','--untracked-files=all')
assert head=='aaf3a4509321b4720935852068b1f99b801dd9f9' and not index
assert cmd('git','rev-parse',X['ref'])==X['commit']
assert cmd('git','rev-parse',X['commit']+'^{tree}')==X['tree']
bad=[p for p,v in X['files'].items() if not (R/p).is_file() or h(R/p)!=v]; assert not bad,bad
assert h(C/'checkpoint.patch')==X['patchSha256']
assert h(pathlib.Path(X['captureManifest']))==X['captureHash']
logs={str(p.relative_to(R)):h(p) for p in [C/'pipeline-checkpoint.log',C/'continuation.md',C/'checkpoint.md',C/'checkpoint-hashes.json']}
(O/'root-status-before.txt').write_text(status+'\n')
V={'rootHead':head,'checkpointRef':X['ref'],'checkpointCommit':X['commit'],'tree':X['tree'],'ownedFilesVerified':len(X['files']),'mismatches':bad,'noStagedFiles':True,'captureHash':X['captureHash'],'patchSha256':X['patchSha256'],'logs':logs,'clock':clock(),'stoppedRun':'495acab0-464b-4da0-85d4-2851418cccc3 STOPPED/process-terminal OBSERVED per supplied authority; checkpoint records no writer/job in flight'}
(O/'verification.json').write_text(json.dumps(V,indent=2)+'\n')
log('Safe record/isolation takeover only; old integrator495acab0-464b-4da0-85d4-2851418cccc3 STOPPED/process-terminal OBSERVED per parent. Root HEAD/ref/tree/index, '+str(len(X['files']))+' owned hashes, full patch and current capture manifest verified; unrelated dirt retained in root-status-before.txt. Source remains frozen. Contract: three isolated read-only diagnostic angles, complete known gate-family partition, no repairs/re-audit/threshold changes; <=3 concurrency, foreground commands <=180s, 30-minute lane slices with checkpoint at25min, two no-progress attempts. No source-writing takeover granted.')
scopes=[('semantic-actions','Shared semantic/action/scope foundation, GOV.UK paginator target assertion, 26 link-target/association gaps across Huawei consumer phones, Microsoft VM sizes, SSPAI102392; action association correctness including Microsoft adjacent table/row actions.'),('source-fidelity','Capture/source facts: Bilibili 分享, SSPAI profile 创作字数; emphasis stale allow entry SSPAI102392; fidelity/metric and source-delta/selftest inconsistencies; SRC-1/source-resource provenance and source pixel/crop limits.'),('structural-presentation','Footer-last-region failures on three 36kr pages, SSPAI114699 duplicate title and form fragmentation; targeted native/source whole-height proof only for locating these known failures and shared structural repairs needing recheck.')]
lanes=[]
for key,scope in scopes:
 w=pathlib.Path('/home/z/vibe/autofe-worktrees/62-all-sites/focused-diagnosis')/key
 assert not w.exists(),w
 cmd('git','worktree','add','--detach',str(w),X['commit'])
 assert cmd('git','rev-parse','HEAD',cwd=w)==X['commit']
 errors=[p for p,v in X['files'].items() if not (w/p).is_file() or h(w/p)!=v];assert not errors,errors
 for name,target in [('corpus',R/'corpus')]:
  assert not (w/name).exists();(w/name).symlink_to(target,target_is_directory=True)
 local=w/'.scratch/62-all-sites/focused-diagnosis'/key;local.mkdir(parents=True)
 for name,target in [('proof',R/'.scratch/62-all-sites/integration/proof'),('current-proof',R/'.scratch/62-all-sites/integration/views'),('recovery',C)]: (local/name).symlink_to(target,target_is_directory=True)
 (local/'contract.md').write_text('# '+key+' diagnostic contract\n\nRead central packet: '+str(O/'packet.md')+'\n\nExclusive scope: '+scope+'\n\nExact source checkpoint '+X['commit']+'; all '+str(len(X['files']))+' owned files verified. Source, generated renders, tests, thresholds, docs, corpus and linked proof read-only by contract. Only write here: '+str(local)+'/. No agents, repairs, commits or shared proof writes. Report findings.md, commands.log, hashes.json and continuation.md here. 30-minute slice; checkpoint each cohesive result and by minute25; command deadlines<=180s; one browser/page per lane maximum; two no-progress attempts then checkpoint and route. Use native current source proof, no historical67dec2f proof reuse. Unknown remains INCOMPLETE, no visualPASS from static gates.\n')
 (local/'ticket.md').write_text(clock()+' — preparation worker: source/proof/corpus isolation ready; diagnostic worker pending. Objective and acceptance: locate owned known failure families with exact file/model/selector/source evidence, distinguish stale tests from real defects without changing them; reproduce bounded checks locally, preserve complete raw logs and revision hashes, provide minimal repair recommendation and unresolved criteria. Leaf: one diagnostic angle, not source writer or acceptance review.\n')
 lanes.append({'key':key,'cwd':str(w),'scope':scope})
 log('Cohesive isolation checkpoint '+key+': detached exact-checkpoint worktree, all owned hashes verified; exclusive local record directory and read-only corpus/proof/recovery references ready. No workers launched.')
D={'packet':str(O/'packet.md'),'checkpointRef':X['ref'],'concurrency':3,'lanes':lanes}
(O/'dispatch.json').write_text(json.dumps(D,indent=2)+'\n')
V['lanesVerified']=len(lanes);V['rootOwnedHashesAfter']=all(h(R/p)==v for p,v in X['files'].items());V['rootHeadAfter']=cmd('git','rev-parse','HEAD');V['noStagedFiles']=not cmd('git','diff','--cached','--name-only');assert V['rootOwnedHashesAfter'] and V['rootHeadAfter']==head and V['noStagedFiles']
(O/'verification.json').write_text(json.dumps(V,indent=2)+'\n')
print(json.dumps({'ownedFiles':len(X['files']),'lanes':len(lanes),'rootSourceUnchanged':True,'noStagedFiles':True}))
