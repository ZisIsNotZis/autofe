#!/usr/bin/env python3
"""Read-only acceptance checks for the all-sites setup artifacts and snapshots."""
import copy, hashlib, json, pathlib, re, subprocess
ROOT = pathlib.Path('/home/z/vibe/autofe')
WORK = ROOT / '.scratch/62-all-sites'
def git(*args, cwd=ROOT):
    return subprocess.check_output(['git', *args], cwd=cwd, timeout=60).decode().strip()
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def read(name): return json.loads((WORK / name).read_text())
def check_coverage(d, r):
    assert set(d) == {'baselineRef','packet','concurrency','engineCwd','contentCwd','audits'}
    assert 2 <= d['concurrency'] <= 8
    assert 6 <= len(d['audits']) <= 8
    assert len({a['key'] for a in d['audits']}) == len(d['audits'])
    all_cwds = [d['engineCwd'], d['contentCwd']] + [a['cwd'] for a in d['audits']]
    assert len(all_cwds) == len(set(all_cwds))
    assert all(pathlib.Path(p).is_absolute() for p in all_cwds + [d['packet']] + [a['ticket'] for a in d['audits']])
    pages = [p for a in d['audits'] for p in a['pages']]
    assert len(pages) == len(set(pages)) == r['remainingTotal'] == 35
    assert set(pages) == set(r['gallery']) - set(r['acceptedReferences'])
    assert len(r['gallery']) == len(set(r['gallery'])) == r['curatedTotal'] == 42
    for a in d['audits']:
        assert set(a) == {'key','cwd','pages','ticket'}
        assert 4 <= len(a['pages']) <= 6
        assert a['pages'] == r['cohorts'][a['key']]
        assert pathlib.Path(a['ticket']).is_relative_to(pathlib.Path(a['cwd']))
    return all_cwds

def main():
    d, r, b, files = read('dispatch.json'), read('roster.json'), read('baseline.json'), read('baseline-files.json')
    all_cwds = check_coverage(d, r)
    rejected = []
    for name in ['overlap','omission','duplicate-cwd']:
        bad = copy.deepcopy(d)
        if name == 'overlap': bad['audits'][1]['pages'][0] = bad['audits'][0]['pages'][0]
        elif name == 'omission': bad['audits'][0]['pages'].pop()
        else: bad['contentCwd'] = bad['engineCwd']
        try: check_coverage(bad, r)
        except AssertionError: rejected.append(name)
        else: raise AssertionError(f'validator blind to {name}')
    assert git('rev-parse', d['baselineRef']) == b['commit']
    assert git('rev-parse', b['commit']+'^{tree}') == b['tree']
    assert len(git('rev-list','--parents','-n','1',b['commit']).split()) == 1, 'baseline has ancestry'
    assert git('rev-parse','HEAD') == b['integrationHead'] == 'aaf3a4509321b4720935852068b1f99b801dd9f9'
    assert git('branch','--show-current') == 'master'
    assert not git('diff','--cached','--name-only'), 'master staged files'
    tree = git('ls-tree','-r','--name-only',b['commit']).splitlines()
    assert set(tree) == set(files), 'snapshot contains missing/unallowlisted files'
    assert 'm1/media-surfaces.json' in tree
    assert not any(p.startswith(('.pi/','corpus/','.tmp/')) for p in tree)
    assert not read('secret-scan.json')['findings']
    for rel, info in files.items():
        assert sha(ROOT / rel) == info['sha256'], f'integration source changed: {rel}'
    # Byte-hash the actual baseline objects via one bounded cat-file stream.
    proc = subprocess.Popen(['git','cat-file','--batch'], cwd=ROOT, stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    try:
        for rel, info in files.items():
            proc.stdin.write(f'{b["commit"]}:{rel}\n'.encode()); proc.stdin.flush()
            header = proc.stdout.readline().decode().split()
            assert len(header) == 3 and header[1] == 'blob', rel
            data = proc.stdout.read(int(header[2])); assert proc.stdout.read(1) == b'\n'
            assert hashlib.sha256(data).hexdigest() == info['sha256'], f'baseline blob mismatch: {rel}'
        proc.stdin.close(); assert proc.wait(timeout=10) == 0
    finally:
        if proc.poll() is None: proc.kill(); proc.wait(timeout=10)
    local_checks = []
    for raw in all_cwds:
        cwd = pathlib.Path(raw)
        assert cwd.is_dir()
        assert git('rev-parse','HEAD',cwd=cwd) == b['commit']
        assert not git('branch','--show-current',cwd=cwd), 'lane is not detached'
        assert not git('diff','--name-only',cwd=cwd), 'lane tracked baseline dirty'
        assert not git('diff','--cached','--name-only',cwd=cwd), 'lane staged files'
        assert (cwd/'corpus').is_symlink() and (cwd/'corpus').resolve() == ROOT/'corpus'
        assert (cwd/'.scratch/active-work.md').is_file()
        assert (cwd/f'.scratch/62-all-sites/{cwd.name}/ticket.md').is_file()
        for rel, info in files.items():
            assert sha(cwd/rel) == info['sha256'], f'worktree hash mismatch: {cwd}/{rel}'
        local_checks.append({'cwd':raw,'filesVerified':len(files),'detached':True,'trackedChanges':0,'stagedFiles':0})
    packet = pathlib.Path(d['packet']).read_text()
    for page in r['gallery']: assert f'`{page}`' in packet, f'packet roster omission {page}'
    ledger = (ROOT/'.scratch/active-work.md').read_text()
    original_ledger = subprocess.check_output(['git','show',b['integrationHead']+':.scratch/active-work.md'],cwd=ROOT,timeout=10).decode()
    assert ledger.startswith(original_ledger), 'preexisting active ledger modified'
    assert '.scratch/62-all-sites/ticket.md' in ledger
    report = {'status':'passed','baselineCommit':b['commit'],'sourceFilesVerified':len(files),'snapshotBytes':sum(v['bytes'] for v in files.values()),'worktrees':local_checks,'curatedPages':42,'remainingPages':35,'acceptedReferences':7,'cohorts':8,'coverageCounterexamplesRejected':rejected,'integrationHeadUnchanged':True,'preexistingLedgerPreserved':True,'noStagedFiles':True,'scope':'Setup self-proof only; no substantive image audit or independent acceptance review.'}
    (WORK/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
    print(f'PASS: 42 curated = 35 remaining + 7 accepted; 8 disjoint cohorts; 10 detached worktrees; {len(files)} exact baseline/main files and {len(files)*10} lane files checked; overlap/omission/duplicate-CWD counterexamples rejected; master HEAD/ledger preserved; zero staged files.')
if __name__ == '__main__': main()
