import os,json,hashlib,pathlib,subprocess,shutil,datetime
root=pathlib.Path('/home/z/vibe/autofe'); out=root/'.scratch/62-all-sites/experience-repair'
def git(*a,cwd=root):return subprocess.check_output(['git',*a],cwd=cwd,text=True).strip()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
p=json.loads((root/'.scratch/62-all-sites/owner-trace/proof-final.json').read_text())
assert git('diff','--cached','--name-only')==''
head=git('rev-parse','HEAD'); refs=git('show-ref'); dirt=git('status','--porcelain=v1','-uall')
(out/'root-before.txt').write_text(dirt+'\n'); (out/'refs-before.txt').write_text(refs+'\n')
allhash={**p['fileHashes'],**p['captureHashes']}
bad=[k for k,v in allhash.items() if not (root/k).is_file() or sha(root/k)!=v]; assert not bad,bad
cwd=pathlib.Path('/home/z/vibe/autofe-worktrees/62-all-sites/experience-repair-oracle-013283d3')
assert not cwd.exists(), 'Do not overwrite an existing worktree'
subprocess.run(['git','worktree','add','--detach',str(cwd),'ccea4ace4bbba9ac989ca2ade80d5b0f050826e9'],cwd=root,check=True,timeout=120)
for k in p['fileHashes']:
 target=cwd/k; target.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(root/k,target)
assert not (cwd/'corpus').exists(); (cwd/'corpus').symlink_to(root/'corpus',target_is_directory=True)
# Copy only relevant secret-free work-record inputs; original evidence remains authoritative and untouched.
for k in ['owner-trace','experience-repair']:
 shutil.copytree(root/'.scratch/62-all-sites'/k,cwd/'.scratch/62-all-sites'/k,dirs_exist_ok=True)
for k in ['packet.md','lane-board.md','roster.json']:
 shutil.copy2(root/'.scratch/62-all-sites'/k,cwd/'.scratch/62-all-sites'/k)
mis=[k for k,v in allhash.items() if sha(cwd/k)!=v];assert not mis,mis
assert git('rev-parse','HEAD')==head and git('show-ref')==refs and git('diff','--cached','--name-only')==''
proof={'status':'PREPARED_NOT_DELIVERY_PASS','rootHead':head,'rootBranch':git('branch','--show-current'),'ownerRevision':p['revision'],'oracleCwd':str(cwd),'oracleHead':git('rev-parse','HEAD',cwd=cwd),'oracleFreeze':'exact working-tree bytes; detached recovery base plus current owner delta; no new commit/ref/index write','fileHashes':p['fileHashes'],'captureHashes':p['captureHashes'],'verifiedOwnedFiles':len(p['fileHashes']),'verifiedCaptureFiles':len(p['captureHashes']),'rootHashMismatches':bad,'oracleHashMismatches':mis,'rootRefsUnchanged':True,'rootIndexEmpty':True,'oracleIndexEmpty':git('diff','--cached','--name-only',cwd=cwd)=='','originalDirtPreserved':'original source and proof hashes unchanged; only new experience-repair records','corpus':'shared read-only by contract, not OS enforcement'}
(out/'freeze.json').write_text(json.dumps(proof,indent=2)+'\n')
(out/'root-after-isolation.txt').write_text(git('status','--porcelain=v1','-uall')+'\n')
with (out/'ticket.md').open('a') as f:f.write('\n- '+datetime.datetime.now().astimezone().isoformat(timespec='seconds')+' — actor prepare-experience-repair: isolated detached oracle worktree; verified '+str(len(allhash))+' root and oracle file/capture hashes, unchanged root HEAD/refs and empty root/oracle indices. Exact proof freeze.json; no source edits or new commits.\n')
print(json.dumps({k:v for k,v in proof.items() if k not in ['fileHashes','captureHashes']}))
