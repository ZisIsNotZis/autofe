import json,hashlib,subprocess
from pathlib import Path
r=Path.cwd();o=r/'.scratch/62-all-sites';d=json.load(open(o/'final-dispatch.json'));s=json.load(open(o/'integration/final-source-hashes.json'));roster=json.load(open(o/'roster.json'));errors=[]
for p,h in s['files'].items():
 if hashlib.sha256((r/p).read_bytes()).hexdigest()!=h:errors.append('root drift '+p)
for review in d['reviews']:
 cwd=Path(review['cwd'])
 if subprocess.check_output(['git','-C',str(cwd),'rev-parse','HEAD'],text=True).strip()!=s['commit']:errors.append('snapshot revision '+review['key'])
 for p,h in s['files'].items():
  if hashlib.sha256((cwd/p).read_bytes()).hexdigest()!=h:errors.append('snapshot drift '+review['key']+' '+p)
visual=[p for x in d['reviews'] if x['kind']=='visual' for p in x['pages']]
assert sorted(visual)==sorted(roster['gallery']);assert len(set(visual))==42;assert len(d['reviews'])==9
assert not subprocess.check_output(['git','diff','--cached','--name-only'],text=True).strip()
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()=='aaf3a4509321b4720935852068b1f99b801dd9f9'
assert len((o/'final-dispatch.json').read_bytes())<10000
baseline=json.load(open(o/'baseline-files.json'));preserved=[]
for p,b in baseline.items():
 if p.startswith(('.scratch/60-seven-polish/','.scratch/61-wide-screen/')):
  assert hashlib.sha256((r/p).read_bytes()).hexdigest()==b['sha256'];preserved.append(p)
assert not errors,errors
changed=subprocess.check_output(['git','diff','--name-only',s['baseline'],s['commit'],'--','m1','docs'],text=True).splitlines()
json.dump({'status':'PASS_TRANSPORT_SNAPSHOT_PRESERVATION_ONLY','rootHeadPreserved':True,'noStagedFiles':True,'sourceHashCount':len(s['files']),'snapshotCount':9,'verifiedSnapshotFiles':9*len(s['files']),'visualCoverage':{'uniquePages':42,'remaining':35,'references':7,'scenarios':168},'preservedPriorEvidenceFiles':len(preserved),'changedFiles':changed,'experienceVerdict':'INCOMPLETE','pipelineVerdict':'FAIL','errors':errors},open(o/'integration/final-validation.json','w'),indent=2)
print('PASS snapshot9/source hashes'+str(len(s['files']))+'/42 unique pages168 scenarios/root HEAD unstaged/preserved prior evidence'+str(len(preserved))+'; PIPELINE FAIL; EXPERIENCE INCOMPLETE')
