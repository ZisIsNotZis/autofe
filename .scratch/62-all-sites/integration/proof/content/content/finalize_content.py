from pathlib import Path
from datetime import datetime
import hashlib,json,re,subprocess
ROOT=Path('.scratch/62-all-sites/content');BASE='refs/autofe-private/62-all-sites-baseline'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def git(*args):return subprocess.check_output(['git',*args],text=True).strip()
roster=json.loads(Path('/home/z/vibe/autofe/.scratch/62-all-sites/roster.json').read_text());remaining=[p for p in roster['gallery'] if p not in roster['acceptedReferences']]
# Final formatting follows each baseline's original indentation; no wholesale style conversion.
changed=git('diff','--name-only',BASE,'--','m1/curated').splitlines()
for f in changed:
 if not f.endswith('.json'):continue
 original=git('show',BASE+':'+f);indent=len(re.search(r'\n( +)"',original).group(1));Path(f).write_text(json.dumps(json.loads(Path(f).read_text()),ensure_ascii=False,indent=indent)+'\n')
files=sorted(set(git('diff','--name-only',BASE,'--','m1/curated').splitlines()+[str(p) for p in Path('m1/curated/assets').glob('62-*')]))
allowed={'m1/curated/'+p+'.json' for p in remaining}
assert all(f in allowed or f.startswith('m1/curated/assets/62-') for f in files)
patterns=[r'-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY',r'\b(?:sk_live_|rk_live_|AKIA|ASIA)[A-Za-z0-9]{12,}',r'\bgh[pousr]_[A-Za-z0-9]{20,}',r'\bxox[baprs]-[A-Za-z0-9-]{12,}',r'(?i)(?:authorization|password|client_secret|access_token|api_key|sessionid)\s*[=:]\s*[\"\x27][^\"\x27\s]{8,}']
findings=[]
for f in files:
 raw=Path(f).read_bytes()
 for p in patterns if f.endswith('.json') else patterns[:4]:
  if re.search(p.encode(),raw):findings.append({'path':f,'pattern':p})
scan={'scope':files,'findings':findings,'status':'PASS' if not findings else 'BLOCKED','limits':'Exact candidate model/asset signature scan, not a universal guarantee; no raw capture auth payload copied.'};(ROOT/'final-secret-scan.json').write_text(json.dumps(scan,indent=2)+'\n');assert not findings
commands=[]
def command(args,log):
 result=subprocess.run(args,capture_output=True,text=True,timeout=90);(ROOT/log).write_text(result.stdout+result.stderr);commands.append({'command':' '.join(args),'result':'passed' if result.returncode==0 else 'failed','output':str(ROOT/log)});assert result.returncode==0,log
command(['node','m1/validate.mjs']+['m1/curated/'+p+'.json' for p in remaining],'final35-validation.log')
command(['node',str(ROOT/'content-selftest.mjs')],'revision-content-selftest.log')
command(['python',str(ROOT/'source_fidelity_test.py')],'revision-source-fidelity.log')
command(['git','diff','--check',BASE,'--','m1/curated'],'revision-diff-check.log')
assert not git('diff','--cached','--name-only')
subprocess.run(['git','add','--']+files,check=True,timeout=30)
result=subprocess.run(['git','-c','commit.gpgsign=false','commit','-m','private: finish capture-backed content lane corrections'],capture_output=True,text=True,timeout=30);(ROOT/'final-private-commit.log').write_text(result.stdout+result.stderr);assert result.returncode==0
head=git('rev-parse','HEAD');ref='refs/autofe-private/62-all-sites-content-'+head[:12];subprocess.run(['git','update-ref',ref,head],check=True,timeout=10)
patch=ROOT/'content-baseline-relative.patch'
with patch.open('wb') as stream:subprocess.run(['git','diff','--binary','--full-index',BASE,head,'--']+files,stdout=stream,check=True,timeout=30)
assert git('rev-parse',BASE)=='403cd5be096db89b428e130ad57cca730b425fdc';assert not git('diff','--cached','--name-only');assert not git('diff','--name-only','--','m1/curated')
models=[f for f in files if f.endswith('.json')];assets=[f for f in files if '/assets/' in f];hashes={f:sha(f) for f in files}
sources={}
for p in remaining:
 sources[p]={f'corpus/{p}/{n}':sha(f'corpus/{p}/{n}') for n in ['dom.html','nodes.json','full.png','meta.json']}
manifest={'baseline':git('rev-parse',BASE),'head':head,'privateRef':ref,'files':hashes,'sourceCaptures':sources,'patch':{'path':str(patch),'sha256':sha(patch)},'unchangedProtected':{p:sha('m1/curated/'+p+'.json') for p in roster['acceptedReferences']},'noStagedFiles':True}
(ROOT/'final-hashes.json').write_text(json.dumps(manifest,indent=2)+'\n');(ROOT/'commands-run.json').write_text(json.dumps(commands,indent=2)+'\n')
checks=json.loads((ROOT/'content-selftest.json').read_text());sourceproof=json.loads((ROOT/'source-fidelity-test.json').read_text())
status='INCOMPLETE_AWAITING_ENGINE_AND_INDEPENDENT_REVIEW'
page_findings={p:[] for p in remaining}
input_files=[ROOT/'audit-content-inputs.json',ROOT/'late-content-inputs.json',ROOT/'audit-mi-commerce-extracted-handoff.json',ROOT/'audit-media-auth-utility-extracted-handoff.json']
for inp in input_files:
 j=json.loads(inp.read_text());cohorts=j if isinstance(j,list) else [j]
 for cohort in cohorts:
  for f in cohort.get('findings',[]):
   if f.get('owner') not in [None,'content']:continue
   for p in f.get('pages',[]):
    full=p if '/' in p else 'mi-com/'+p
    if full in page_findings:page_findings[full].append(f['id'])
dispositions=[]
for p in remaining:
 dispositions.append({'page':p,'modelChanged':'m1/curated/'+p+'.json' in models,'findings':sorted(set(page_findings[p])),'disposition':'source-backed factual candidate implemented; final combined UX/source review pending' if 'm1/curated/'+p+'.json' in models else 'no factual correction identified in assigned baseline audit; not final source/experience acceptance'})
unmet=[{'criterion':'All-width whole-height final experience/source comparison','scope':'All35 remaining pages and seven accepted-reference regressions','reason':'Outside content writer rendering/review seam; final engine combined artifacts and fresh independent review required.'},{'criterion':'All declared actions serialized into HTML + Markdown','scope':str(ROOT/'content-selftest.json'),'reason':f"Frozen baseline renderer loses {len(checks['htmlMdGaps'])} per-node target serialization instances; exact evidence retained; engine-owned dependency."},{'criterion':'Linked Microsoft cell/row usability','scope':'learn-microsoft/vm-sizes','reason':'127 exact captured targets restored adjacent by source row; frozen typed cell grammar has no links; independent usability review required, not automatically accepted.'},{'criterion':'Captured current choice/default states and compact controls','scope':'36kr searches/technology; Huawei searches; Mi phone pagination','reason':'Facts encoded in existing _default; baseline renderer does not fully consume selection defaults. Glyph-only Mi previous/next remain exact source iconfont bytes without invented directional labels; final readable shared rendering incomplete.'},{'criterion':'Complete original/lazy image fidelity','scope':'source screenshot-recovered SSPAI media; Mi10 lazy recommendation images; Huawei Mate70 source-lazy image; Linear5 static demos','reason':'Source hashes/DOM boxes/crop pixels or attributed retrieved bytes proven;403 originals unavailable, source lazy pixels unpainted, and static demos are not interactive backend recreations. Full original/experience coverage not claimed.'},{'criterion':'Source chrome/consent behavior','scope':'restored factual nav/footer/cookie utilities','reason':'Original targets/labels/facts retained, but no authentication/cookie/pagination/backend or icon-only unlabeled utility behavior invented; Stripe source footer is outside900px image.'}]
proof={'closedSchema':str(ROOT/'final35-validation.log'),'modelAndTargetTests':str(ROOT/'content-selftest.json'),'sourceAndIntegrityTests':str(ROOT/'source-fidelity-test.json'),'assetProvenance':str(ROOT/'asset-provenance.json'),'secretScan':str(ROOT/'final-secret-scan.json'),'hashes':str(ROOT/'final-hashes.json'),'commands':str(ROOT/'commands-run.json'),'ticket':str(ROOT/'ticket.md'),'staticChecksPassed':len(checks['checks']),'sourceChecksPassed':len(sourceproof['checks']),'newExactSourceTargets':sourceproof['newSourceTargets'],'assets':len(assets),'wholePageVisualAcceptance':'INCOMPLETE_NOT_PERFORMED_BY_CONTENT_WRITER'}
handoff={'refs':{'baseline':BASE,'baselineCommit':manifest['baseline'],'privateRef':ref,'commit':head,'earlierRecoveryCommit':'c26a054a37aa26fb4ef530f01374697cb65b4d84'},'patch':{'path':str(patch.resolve()),'sha256':sha(patch),'relativeTo':BASE},'files':files,'hashes':hashes,'dispositions':dispositions,'proof':proof,'unmetAC':unmet,'status':status,'noOp':False,'noStagedFiles':True,'changedModelCount':len(models),'assetCount':len(assets)}
Path('.scratch/62-all-sites/content-handoff.json').write_text(json.dumps(handoff,ensure_ascii=False,indent=2)+'\n')
now=datetime.now().astimezone().isoformat(timespec='seconds');p=ROOT/'ticket.md';p.write_text(p.read_text()+f'\n- {now} — content worker finalized revision-bound factual candidate: private source-only commit `{head}` / `{ref}`, baseline-relative binary patch `{patch}` SHA256 `{sha(patch)}`. {len(models)} remaining models +{len(assets)} attributable assets; private baseline ref unchanged; no staged files/tracked source dirt. All35 validators passed;{len(checks["checks"])} content assertions and{len(sourceproof["checks"])} source/integrity assertions passed. Exact new source targets{sourceproof["newSourceTargets"]}. Status{status}; all unresolved final rendering/source modalities stated in content-handoff.json, no full experience PASS. No setup rerun, shared engine/docs/final render writes or seven-reference redesign.\n')
print(json.dumps({'status':status,'handoff':str(Path('.scratch/62-all-sites/content-handoff.json').resolve()),'commit':head,'models':len(models),'assets':len(assets),'checks':len(checks['checks']),'sourceChecks':len(sourceproof['checks']),'newTargets':sourceproof['newSourceTargets'],'noStagedFiles':True}))
