import json,hashlib,subprocess,os,re,html
from pathlib import Path
from datetime import datetime
from PIL import Image
root=Path.cwd();out=root/'.scratch/62-all-sites';integr=out/'integration';roster=json.load(open(out/'roster.json'));views=json.load(open(integr/'views/measurements.json'))
# Human-viewable proof: actual renders, all-width whole-height images and overlapping native readable strips.
gallery=out/'gallery';gallery.mkdir(exist_ok=True);rows=[];strip_manifest={}
for key in roster['gallery']:
 dash=key.replace('/','-');im=Image.open(integr/'views'/f'{dash}-1440.png');thumb=im.copy();thumb.thumbnail((300,520));thumb.save(gallery/f'{dash}-thumb.png');links=[];strip_manifest[key]={}
 for width,v in views['pages'][key]['widths'].items():
  links.append(f'<a href="../integration/views/{dash}-{width}.png">{width}px 全高</a>');im=Image.open(v['screenshot']);dest=gallery/'strips'/dash/width;dest.mkdir(parents=True,exist_ok=True);ss=[]
  for y in range(0,im.height,1000):
   p=dest/f'{y:06d}.png';im.crop((0,y,im.width,min(y+1200,im.height))).save(p);ss.append({'path':str(p.relative_to(root)),'y':y,'height':min(1200,im.height-y),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
  strip_manifest[key][width]=ss
  index=dest/'index.html';index.write_text('<meta charset="utf-8"><title>'+key+' '+width+'</title><style>img{display:block;max-width:100%;margin-bottom:20px}body{margin:0}</style>'+''.join('<a href="'+Path(s['path']).name+'"><img src="'+Path(s['path']).name+'"></a>' for s in ss));links.append(f'<a href="strips/{dash}/{width}/index.html">{width}px 可读分段</a>')
 role='保留参考 / 回归' if key in roster['acceptedReferences'] else '35 页优化范围'
 rows.append(f'<article><a href="../../../m1/curated/renders/{dash}.html"><img src="{dash}-thumb.png"></a><h2>{html.escape(key)}</h2><p>{role}</p><a href="../../../m1/curated/renders/{dash}.html">实际页面</a> · <a href="../../../corpus/{key}/full.png">原始采集</a><p>'+ ' · '.join(links)+'</p></article>')
(gallery/'index.html').write_text('<!doctype html><meta charset="utf-8"><title>42 页当前整合候选</title><style>body{font:16px system-ui;max-width:1500px;margin:30px auto;padding:20px;color:#17212b}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}article{border:1px solid #ddd;padding:16px}img{max-width:100%;max-height:520px}h2{font-size:18px}a{color:#174f8f}</style><h1>42 页当前整合候选 · 未验收</h1><p>35 页事实/共享布局更新，7 页保留参考回归，Apple/淘宝紧凑边缘对齐站点身份；原有 Apple 满幅允许。实际 HTML、当前 PNG、四宽全高和原始采集均可直接查看。</p><p><strong>INCOMPLETE：</strong>组合 pipeline 存在事实/链接/地基/强调/布局及视觉自查失败；独立技术与完整体验验收未完成。Bilibili 外链图像加载失败；截图恢复素材保留采集裁切/遮挡，不能称完整原图；认证、播放、Cookie、分页与后端未验证。Microsoft 127 表格邻接动作组的最终易用性仍需审查。</p><main>'+''.join(rows)+'</main>')
json.dump(strip_manifest,open(integr/'strip-manifest.json','w'),indent=2)
# Scope exact current source/output/docs against initial task snapshot, without root staging.
base='403cd5be096db89b428e130ad57cca730b425fdc';idx=integr/'snapshot-index';env=os.environ|{'GIT_INDEX_FILE':str(idx)}
def git(*args):return subprocess.check_output(['git',*args],env=env,text=True).strip()
git('read-tree',base);hashes={};paths=sorted([p for parent in ['m1','docs'] for p in (root/parent).rglob('*') if p.is_file()])
patterns=[re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),re.compile(rb'(?:sk-proj-|ghp_)[A-Za-z0-9]{24,}')];hits=[]
for p in paths:
 rel=str(p.relative_to(root));data=p.read_bytes();hashes[rel]=hashlib.sha256(data).hexdigest()
 if any(x.search(data) for x in patterns):hits.append(rel)
 if hits:continue
 blob=git('hash-object','-w','--',rel);git('update-index','--add','--cacheinfo',('100755' if p.stat().st_mode&0o111 else '100644')+','+blob+','+rel)
if hits:raise RuntimeError('Secret-signature hits: '+str(hits))
tree=git('write-tree');commit=subprocess.check_output(['git','commit-tree',tree,'-p',base],input='Private scoped exact-final integration review snapshot\n',env=env,text=True).strip();ref='refs/autofe-private/62-all-sites-integrated-'+commit[:12];git('update-ref',ref,commit)
patch=subprocess.check_output(['git','diff','--binary',base,commit,'--','m1','docs']);(integr/'initial-to-final.patch').write_bytes(patch)
json.dump({'baseline':base,'commit':commit,'ref':ref,'tree':tree,'patchSha256':hashlib.sha256(patch).hexdigest(),'files':hashes,'secretScan':{'paths':len(paths),'boundedSignatures':2,'hits':hits},'rootStaged':subprocess.check_output(['git','diff','--cached','--name-only'],text=True).strip()},open(integr/'final-source-hashes.json','w'),indent=2)
# Nine separate readonly source worktrees, each owns only reviewer-local evidence.
cohorts=roster['cohorts'];extra={'36kr-news-search':['bilibili-com/home'],'sspai-editorial':['sspai-com/post-114716'],'mi-commerce':['mi-com/product-detail-mi15'],'huawei-commerce':['taobao-com/home'],'apple-linear-products':['apple-com/home','apple-com/ipad-air'],'cloud-business':['airbnb-com/room-28871']};reviews=[]
for key,pages in cohorts.items():reviews.append({'key':'visual-'+key,'pages':pages+extra.get(key,[]),'kind':'visual'})
reviews.append({'key':'technical','pages':roster['gallery'],'kind':'technical'})
for r in reviews:
 cwd=Path('/home/z/vibe/autofe-worktrees/62-all-sites/final-reviews')/r['key'];subprocess.run(['git','worktree','add','--detach',str(cwd),commit],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE);r['cwd']=str(cwd);(cwd/'corpus').symlink_to(root/'corpus',target_is_directory=True);local=cwd/'.scratch/62-all-sites';local.mkdir(exist_ok=True);(local/'final-proof').symlink_to(integr,target_is_directory=True);(local/'final-gallery').symlink_to(gallery,target_is_directory=True);(local/'review-local').mkdir();(local/'review-contract.json').write_text(json.dumps(r|{'sourceCommit':commit,'root':str(root),'packet':str(out/'review-packet.md')},indent=2))
json.dump({'sourceCommit':commit,'sourceTree':tree,'sourceRef':ref,'hashManifest':str(integr/'final-source-hashes.json'),'gallerySha256':hashlib.sha256((gallery/'index.html').read_bytes()).hexdigest(),'captureManifestSha256':hashlib.sha256((integr/'views/measurements.json').read_bytes()).hexdigest(),'stripManifestSha256':hashlib.sha256((integr/'strip-manifest.json').read_bytes()).hexdigest()},open(integr/'final-hashes.json','w'),indent=2)
packet=out/'review-packet.md';packet.write_text(f'''# Cold-start exact-final independent review contract

## Objective and authority
Review one full-scope delivery:35 remaining curated pages plus compact content-edge Apple/Taobao identities, preserving seven accepted references. Read `packet.md` and `roster.json` at `{out}` for complete AC/source roster. Initial audits diagnose baseline only; do not re-audit/bootstrap. No children, source edits, rendering pipeline writes, publication, installs, root staging/commits or original-corpus mutation. Your only writable directory is your snapshot `.scratch/62-all-sites/review-local/`. Source is read-only by contract, not OS enforcement.

## Exact version/change set
Initial preserved task baseline `{base}` → exact combined source/output/docs commit `{commit}` (private recovery ref `{ref}`, not root-branch commit). Full lossless binary delta: `{integr}/initial-to-final.patch`; all source/output/docs SHA256: `{integr}/final-source-hashes.json`; gallery/capture/strip bindings: `{integr}/final-hashes.json`. Snapshot CWD and pages are in `review-contract.json` and `final-dispatch.json`. Root owning paths were byte-identical to baseline before apply; scoped engine13/content104 file patches applied once, SRC-1 two paragraphs/three actions repaired. No root index staging. Preserve existing root dirt.

## Acceptance / blocking metrics
Page-level alignment across mixed forms, sensible density/utility/footer, paired surface/foreground contrast (normal text4.5:1 / large text3:1), cohesive media/title/actions, faithful exact source facts/targets/labels/association/order, closed grammar/shared axes, no site templates/presentation escape hatches/invention/upscaling. Apple full-bleed is allowed, not intrinsically defective. All42×2560/1920/1440/390=168 actual scenarios; actual whole height/source-aware page checks, including readable native strips and seven regressions. Static gates cannot prove visual PASS. Missing/unknown acceptance is INCOMPLETE, material violation FAIL. Preserve distinct justified brand layouts; do not force centering.

## Proof and provenance entry points
- Combined pipeline `{integr}/pipeline-final.log` **exit1**: model schema fixed; remaining foundation/capture facts/link coverage/emphasis/footer ordering/visual fragmentation failures are blockers requiring independent diagnosis, not waived stale expectations.
- Captures `{integr}/views/measurements.json`, geometry summary:42 pages168 views, no document overflow/no loaded image upscaling; Bilibili failed images retained. Actual gallery HTML used, model/HTML/capture/source hashes bound. These captures are UNINSPECTED except targeted integrator overview reads, never whole-objective visual PASS.
- Focused human gallery `{gallery}/index.html`:all35+7 actual render/source links, matching thumbnails/whole-height images/native overlapping readable strips. Do not open for user before acceptance. Gallery is candidate, clearly INCOMPLETE.
- Original source `{root}/corpus/<site>/<slug>/{{dom.html,nodes.json,full.png}}`, read-only. All authoritative audit origins/corrected routing/extractions and complete lane evidence retained in `{integr}/proof/audits/` and copied engine/content handoffs in `{integr}/proof/`. Raw effort-bearing originals retained in original worktrees.
- Independent content SOURCE candidate review `{integr}/proof/content/content-review-verdict.json`:FAIL SRC-1. Reuse only unchanged exact covered file/source hashes; most pages INCOMPLETE, not blanket source PASS. Source crop provenance/capture hashes/DOMbbox in copied content asset-provenance.json and content-review/provenance-checks.json. SRC-1 modified page must get fresh source review; `{integr}/src1-selftest.log` proves source-exact two paragraphs/links serialized but not independent acceptance.
- Engine recovery selftests/dispositions/accepted deltas in `{integr}/proof/engine/engine/recovery/`; accepted setup evidence at `{out}/validation.json` and independent saved setup review (parent retains). Engine known open H-E4,MI-E2,MI-E4,MAU-E4,MAU-E6 retained, do not call closed without actual proof.

## Cohort responsibilities
Visual: your exact pages plus attached accepted-reference/identity regressions, all four widths whole height. Use gallery readable strips, actual browser if needed, compare source image/media/facts/actions. Microsoft127 source-table links are existing element `_action` groups adjacent to owning table/row:verify exact association/labels/order and actual usable navigation at every width; no new link-valued grammar. Explicitly judge source-derived Linear/SSPAI media, preserved source clipping/calendar overlay, footer/nav density and default states. Inspect enough native detail; downsample overview alone is insufficient. Return per-page/width/modalities evidence and material defects with reproduction/selector/model path/hash.
Technical:all engine/content/recovery/setup/currentDocs/audits/provenance/integration/gallery, exact initial→final delta and all42 coverage. Independently run read-only selftests/validator/hash checks; pipeline --shots mutates source and is prohibited. Analyze every combined gate failure and falsify model/action/capture/crop/image/default/contrast consistency. Verify cohort union35+7, setup preservation/root unstaged, source-review reuse hash limits, source/media provenance, currentDocs/closed grammar consistency, final gallery currentness/link targets and source/output hashes. Prior saved tests may be reused only unchanged exact versions plus integrated delta checks; no acceptance from worker claims.

## Limits / budget / result
45-minute slice each; command deadlines<=600s; checkpoint10 minutes before end; max one browser active per cohort and total8 concurrent. No endless retries/provider fallback. Auth/playback/backend/cookies/pagination behavior not exercised; static demos not interactive originals; remote403/unpainted/lazy/occluded crops not complete originals; iconfont glyph readability remains unproved. Disclose these, never fabricate. Every finding bound to exact source commit/hash. Local timestamp `date -Iseconds`, actor, commands/results in review-local/ticket.md. Persist lossless full proof and per-page verdicts in review-local/verdict.json; return only compact verdict/report/blocker count and full artifact pointers(<11000 chars). No repair authority; route writer fallback. Fresh independent review must follow any repair.
''')
dispatch={'status':'INCOMPLETE_READY_FOR_INDEPENDENT_REVIEW','packet':str(packet),'gallery':str(gallery/'index.html'),'finalHashes':str(integr/'final-hashes.json'),'sourceCommit':commit,'remainingPageCount':35,'reviews':reviews,'blockers':[{'key':'combined-gates','proof':str(integr/'pipeline-final.log')},{'key':'whole-experience-unverified','proof':str(integr/'views/measurements.json')}],'report':str(integr/'checkpoint.md')};assert len(json.dumps(dispatch))<10000;json.dump(dispatch,open(out/'final-dispatch.json','w'),indent=2)
with open(out/'ticket.md','a')as f:f.write('\n- '+datetime.now().astimezone().isoformat()+f' — sole integrator: current gallery42+all168 captures/native overlapping strips generated before review. Private scoped secret-signature-scanned exact-final recovery commit{commit}; nine detached independent review snapshots prepared; no root commit/index operation. Full delta/hashes/proof retained; combined gates/whole-experience still INCOMPLETE.\n')
print(json.dumps({'status':dispatch['status'],'packet':str(packet),'gallery':dispatch['gallery'],'reviews':len(reviews),'sourceCommit':commit}))
