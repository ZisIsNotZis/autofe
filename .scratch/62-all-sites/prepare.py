#!/usr/bin/env python3
"""Build this task's inventory and isolated private snapshot; never stage master."""
import datetime, hashlib, json, os, pathlib, re, subprocess
ROOT = pathlib.Path('/home/z/vibe/autofe')
WORK = ROOT / '.scratch/62-all-sites'
EXTERNAL = pathlib.Path('/home/z/vibe/autofe-worktrees/62-all-sites')
REF = 'refs/autofe-private/62-all-sites-baseline'
def run(*args, **kwargs):
    return subprocess.check_output(args, cwd=ROOT, timeout=kwargs.pop('timeout', 60), **kwargs).decode().strip()
def save(name, obj):
    (WORK / name).write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n')
def now(): return datetime.datetime.now().astimezone().isoformat(timespec='seconds')
def event(text):
    with (WORK / 'ticket.md').open('a') as f: f.write(f'\n- {now()} — bootstrap worker: {text}\n')
known = ['sspai-com/post-114716', 'taobao-com/home', 'mi-com/product-detail-mi15', 'apple-com/home', 'apple-com/ipad-air', 'airbnb-com/room-28871', 'bilibili-com/home']
cohorts = {
    '36kr-news-search': ['36kr-com/home', '36kr-com/information-technology', '36kr-com/search-ai', '36kr-com/search-viz'],
    'sspai-editorial': ['sspai-com/home', 'sspai-com/matrix', 'sspai-com/post-102392', 'sspai-com/post-114699', 'sspai-com/u-jtc092al'],
    'mi-commerce': ['mi-com/home', 'mi-com/search-earbuds', 'mi-com/search-phone', 'mi-com/shop-category-list'],
    'huawei-commerce': ['huawei-cn/home', 'huawei-cn/consumer-phones', 'huawei-cn/search-laptop', 'huawei-cn/search-phone'],
    'apple-linear-products': ['apple-com-cn/iphone-17', 'apple-com/iphone-16', 'apple-com/macbook-air', 'linear-app/home'],
    'cloud-business': ['aliyun-com/home', 'aliyun-com/product-ecs', 'aws-amazon/ec2-on-demand', 'stripe-com/pricing', 'grafana-play/play-home'],
    'public-technical-docs': ['gov-uk/ni-rates-letters', 'gov-uk/register-birth-abroad', 'learn-microsoft/vm-sizes', 'stripe-docs/payments'],
    'media-auth-utility': ['bilibili-com/read-home', 'bilibili-com/video-bv1gj411x7h7', 'github-com/login', 'stripe-dashboard/login', 'xiaomi-account/login'],
}
scale = json.loads((ROOT / 'm1/eval/m3-scale.json').read_text())
gallery = re.findall(r'<span class="k">([^<]+)</span>', (ROOT / 'm1/curated/renders/index.html').read_text())
exemplar = [row['k'] for row in scale if row['tier'] == 'exemplar']
models = sorted(str(p.relative_to(ROOT / 'm1/curated'))[:-5] for p in (ROOT / 'm1/curated').glob('*/*.json') if p.parent.name != 'renders')
manifest = json.loads((ROOT / 'm1/curated/renders/manifest.json').read_text())
manifest_keys = [v['key'] for v in manifest['pages'].values()]
assert len(gallery) == len(set(gallery)) == 42
assert set(gallery) == set(exemplar) == set(models) == set(manifest_keys)
flat = [p for pages in cohorts.values() for p in pages]
assert len(flat) == len(set(flat)) == 35
assert set(flat) == set(gallery) - set(known)
assert set(known).issubset(gallery)
for key in gallery:
    for rel in [f'm1/curated/{key}.json', f'm1/curated/renders/{key.replace("/", "-")}.html', f'm1/curated/renders/{key.replace("/", "-")}.png', f'corpus/{key}/nodes.json', f'corpus/{key}/dom.html', f'corpus/{key}/full.png']:
        assert (ROOT / rel).is_file(), rel
roster = {'curatedTotal':42, 'remainingTotal':35, 'acceptedReferences':known, 'identityFixes':['apple-com/home','taobao-com/home'], 'gallery':gallery, 'cohorts':cohorts, 'auxiliaryScaleRowsExcluded':[r['k'] for r in scale if r['tier'] != 'exemplar'], 'sourcesAgree':['gallery index','exemplar pipeline rows','curated model files','shots manifest']}
save('roster.json', roster)
event('Roster reconciled: gallery, exemplar pipeline, model files and manifest agree on 42 pages; seven accepted references, 35 remaining in eight exclusive 4–5-page cohorts. All model/render/source capture files present. 68 support rows excluded from user deliverables.')
# Explicit allowlist: no .pi, corpus copies, caches, credentials, or unrelated work records.
files = []
for prefix in ['m1', 'docs', 'tools', '.scratch/60-seven-polish', '.scratch/61-wide-screen']:
    for p in sorted((ROOT / prefix).rglob('*')):
        if p.is_file():
            assert not p.is_symlink(), f'unexpected symlink: {p}'
            assert not any(x in {'node_modules', '.pi', '.git', '__pycache__'} for x in p.relative_to(ROOT).parts), str(p)
            assert not p.name.startswith('.env'), str(p)
            files.append(str(p.relative_to(ROOT)))
files += ['README.md', 'LICENSE.md', '.gitignore']
files = sorted(set(files))
secret_patterns = [rb'-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----', rb'\bAKIA[0-9A-Z]{16}\b', rb'\b(?:ghp_|github_pat_)[A-Za-z0-9_]{30,}', rb'\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}', rb'(?i)(?:api[_-]?key|access[_-]?token|client[_-]?secret)\s*[=:]\s*[\"\x27][A-Za-z0-9_+/=-]{24,}[\"\x27]']
findings = []
hashes = {}
for rel in files:
    data = (ROOT / rel).read_bytes()
    hashes[rel] = {'sha256':hashlib.sha256(data).hexdigest(), 'bytes':len(data)}
    if b'\x00' not in data[:8192]:
        for i, pattern in enumerate(secret_patterns):
            if re.search(pattern, data): findings.append({'path':rel, 'pattern':i})
save('secret-scan.json', {'allowlistFiles':len(files),'patterns':len(secret_patterns),'findings':findings,'excluded':['.pi/','corpus/','.tmp/','unrelated .scratch records','credentials/cache/dependency dirs'],'limits':'Local signature scan plus explicit path allowlist; not a universal secret detector. No finding values printed.'})
assert not findings, 'Secret signature found: checkpoint before creating baseline'
save('baseline-files.json', hashes)
save('git-before-baseline.json', {'capturedAt':now(),'branch':run('git','branch','--show-current'),'head':run('git','rev-parse','HEAD'),'status':run('git','status','--porcelain=v1','--untracked-files=all').splitlines(),'staged':run('git','diff','--cached','--name-only').splitlines()})
assert not run('git','diff','--cached','--name-only'), 'Preexisting staged changes: do not touch'
EXTERNAL.mkdir(parents=True, exist_ok=True)
index = EXTERNAL / 'private-snapshot.index'
assert not index.exists(), str(index)
env = dict(os.environ, GIT_INDEX_FILE=str(index))
run('git','read-tree','--empty',env=env)
entries = []
for rel in files:
    p = ROOT / rel
    blob = run('git','hash-object','-w','--no-filters',str(p))
    mode = '100755' if p.stat().st_mode & 0o111 else '100644'
    entries.append(f'{mode} {blob}\t{rel}\0'.encode())
subprocess.run(['git','update-index','-z','--index-info'], input=b''.join(entries), env=env, cwd=ROOT, timeout=60, check=True)
tree = run('git','write-tree',env=env)
# Parentless recovery snapshot: no unrelated legacy tree/history included.
commit = run('git','-c','user.name=AutoFE private bootstrap','-c','user.email=autofe-bootstrap@localhost','commit-tree',tree,'-m','Private all-sites exact working-tree baseline; local recovery only')
run('git','update-ref',REF,commit,'')
save('baseline.json', {'ref':REF,'commit':commit,'tree':tree,'integrationHead':run('git','rev-parse','HEAD'),'selectedFiles':len(files),'bytes':sum(x['bytes'] for x in hashes.values()),'parentless':True,'immutableByContract':True,'allowlist':'baseline-files.json','originalCorpus':str(ROOT/'corpus'),'createdAt':now()})
event(f'Secret scan clean for {len(files)} allowlisted files. Created parentless PRIVATE immutable-by-contract ref `{REF}` at `{commit}` with exact raw bytes and modes; separate external index only, no master commit/reset/staging. Includes required untracked m1/media-surfaces.json and original seven/wide-screen reference evidence.')
lanes = [('engine', None), ('content', None)] + [('audit-'+key, pages) for key,pages in cohorts.items()]
dispatch = {'baselineRef':REF,'packet':str(WORK/'packet.md'),'concurrency':8,'engineCwd':str(EXTERNAL/'engine'),'contentCwd':str(EXTERNAL/'content'),'audits':[]}
for lane, pages in lanes:
    cwd = EXTERNAL / lane
    assert not cwd.exists(), str(cwd)
    run('git','worktree','add','--detach',str(cwd),commit,timeout=60)
    os.symlink(str(ROOT / 'corpus'), cwd / 'corpus', target_is_directory=True)
    records = cwd / '.scratch/62-all-sites' / lane
    records.mkdir(parents=True)
    common = f'# {lane}\n\n## Contract\n- Owner: {lane} lane worker, assigned by Main; no children.\n- Baseline: `{REF}` / `{commit}`.\n- Parent full contract/current decisions/proof: `{WORK / "packet.md"}`. Read that compact packet before acting; no session/transcript inheritance.\n- Read-only original capture symlink: `corpus` -> `{ROOT / "corpus"}` (contract restriction, not OS write enforcement). Never modify shared corpus/reference evidence.\n- All new findings/screenshots/logs/hashes go under `{records}`. Record actual `date -Iseconds` event times here; checkpoint each page/decision, not only at end.\n- Never publish, commit master, add dependencies, spend, use external compute, reset/delete existing work, or change CLI/provider on infrastructure failure. Exact failure -> ticket + supervisor.\n- Completion path: local `findings.md`/`proof.md`/hash manifest plus concise artifact pointer to Main; no routine user updates. No detached unobserved jobs.\n'
    if pages is not None:
        common += '- Scope: findings/evidence/ticket only; project source/models/assets/tests/docs and generated gallery are read-only. This is diagnostic audit, NOT fresh acceptance review of later fixes.\n- Budget: 40 minutes wall-clock; command timeout <=180s, one browser instance with one active page; checkpoint by minute 35. At exhaustion preserve per-page coverage and next uninspected page/width, report incomplete.\n- Owned pages:\n' + ''.join(f'  - `{p}`\n' for p in pages)
        packet = common + '\n## Required output\nFor each owned page inspect whole-height actual rendering at 2560/1920/1440/390; compare relevant existing source captures/images, facts/actions and content grouping. Report severity, exact selector/model path, width, source evidence, actual screenshot/crop paths and hashes, likely engine vs factual-model seam, and concrete falsifiable fix criterion. Whole-height inspection must include all sections (overlapping readable strips as needed), not only thumbnail/top. Separate defects from allowed source full-bleed and accepted brand variation; no speculative redesign. Geometry/gates alone cannot PASS. If no defects, give positive exercised coverage and limits. Batch image opens <=4 then persist before next batch.\n'
        (records/'packet.md').write_text(packet)
        dispatch['audits'].append({'key':lane.removeprefix('audit-'),'cwd':str(cwd),'pages':pages,'ticket':str(records/'ticket.md')})
    elif lane == 'engine':
        common += '- Exclusive shared seam: engine/rendering/axis/decision, tests/gates, owning docs and focused gallery-generation integration. Title rendering and Apple/Taobao title models are engine-owned; factual model changes to them require explicit interface agreement. No other curated model/assets writes.\n- Integration owner: engine lane. Collect reviewed content patch and audit findings, apply only owned shared fixes, integrate content with path allowlist, preserve original dirty master, verify all 42 pages plus seven-reference regression. Main routes final independent technical/experience review before delivery.\n- Budget: 60 minutes per bounded implementation slice; commands <=600s; checkpoint by minute 50. Further slice requires Main routing with saved revision/remaining AC. Local evidence only.\n'
    else:
        common += '- Exclusive independent seam: curated factual JSON models and curated image assets ONLY, excluding `m1/curated/apple-com/home.json` and `m1/curated/taobao-com/home.json`; root-title rendering is engine-owned. No renderer/axis/tests/shared docs changes or presentation keys/site CSS. Follow source evidence for any correction, preserve facts/actions and closed grammar.\n- Interface: path-limited patch + per-change source provenance + validation/hashes; engine integration owner reviews/applies it. If title-model edits are necessary, request explicit interface assignment before touching them. No factual changes needed means a documented no-op, not invented work.\n- Budget: 45 minutes per bounded slice; commands <=300s, checkpoint by minute 35. Main routes continuation on saved unresolved criteria.\n'
    common += f'\n## Events\n- {now()} — bootstrap worker initialized isolated lane at common baseline; no lane worker launched.\n\n## Status\nReady for Main dispatch; substantive work not started.\n'
    (records/'ticket.md').write_text(common)
    (cwd/'.scratch/active-work.md').write_text(f'# Active local work\n\n- `{lane}`: `{records / "ticket.md"}`; parent packet `{WORK / "packet.md"}`. Local isolation/evidence only.\n')
save('dispatch.json',dispatch)
event('Created ten detached isolated external worktrees from the same private commit: eight audit-only cohorts, engine shared writer/integrator, and factual-content writer. Local tickets/active links present; original corpus read-only by lane contract; no agents launched. Dispatch written; final setup verification pending.')
print(json.dumps({'baseline':commit,'files':len(files),'worktrees':len(lanes),'audits':len(cohorts),'pages':len(flat),'dispatch':str(WORK/'dispatch.json')},indent=2))
