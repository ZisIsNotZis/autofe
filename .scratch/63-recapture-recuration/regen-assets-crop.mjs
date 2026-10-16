// Round-63 asset regeneration: crop matched fresh-capture regions to the
// exact referenced asset paths. Evidence per crop: integer box (round x/y,
// floor w/h — never exceeds the painted box, F-082), sha256, flatness flag.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const matches = JSON.parse(fs.readFileSync('/tmp/asset-matches.json', 'utf8'));
const results = [];

function ffprobeDims(p) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', p], { encoding: 'utf8' });
  const [w, h] = out.trim().split(',').map(Number);
  return { w, h };
}

// pure-python variance over a raw RGB dump (called via python3) — flags
// lazy-loading placeholders (flat gray) and all-flat crops
function flatness(cropPng) {
  const raw = execFileSync('python3', ['-c', `
import subprocess, sys
p = sys.argv[1]
info = subprocess.run(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','csv=p=0',p],capture_output=True,text=True).stdout.strip()
w,h = map(int, info.split(','))
raw = subprocess.run(['ffmpeg','-v','error','-i',p,'-f','rawvideo','-pix_fmt','rgb24','-'],capture_output=True).stdout
n = 0
sums=[0,0,0]; sq=[0,0,0]
for i in range(0, len(raw), 21):
    n += 1
    for c in range(3):
        v=raw[i+c]; sums[c]+=v; sq[c]+=v*v
var=[sq[c]/n-(sums[c]/n)**2 for c in range(3)]
std=[v**0.5 for v in var]
print(f"{w}x{h} std={std[0]:.1f},{std[1]:.1f},{std[2]:.1f}")
`, cropPng], { encoding: 'utf8' });
  return raw.trim();
}

for (const m of matches) {
  const rec = { asset: m.asset, page: m.page, match: m.match };
  if (m.match !== 'url' && m.match !== 'region-dim') {
    rec.status = 'NOT_FOUND';
    rec.evidence = m.evidence;
    results.push(rec);
    continue;
  }
  const b = m.node.bbox;
  const dir = `corpus/${m.page}`;
  const src = `${dir}/full.png`;
  const cap = ffprobeDims(src);
  let x = Math.round(b.x), y = Math.round(b.y);
  let w = Math.floor(b.w), h = Math.floor(b.h);
  const clipped = [];
  if (x < 0) { clipped.push(`x${x}->0`); w += x; x = 0; }
  if (y < 0) { clipped.push(`y${y}->0`); h += y; y = 0; }
  if (x + w > cap.w) { clipped.push(`w${w}->${cap.w - x}`); w = cap.w - x; }
  if (y + h > cap.h) { clipped.push(`h${h}->${cap.h - y}`); h = cap.h - y; }
  if (w <= 0 || h <= 0) {
    rec.status = 'NOT_CROPPABLE';
    rec.evidence = `bbox ${JSON.stringify(b)} outside captured full.png ${cap.w}x${cap.h} (offscreen carousel item; pixels not captured)`;
    results.push(rec);
    continue;
  }
  const out = `m1/curated/assets/${m.asset}`;
  const args = ['-y', '-i', src, '-vf', `crop=${w}:${h}:${x}:${y}`];
  if (out.endsWith('.webp')) args.push('-c:v', 'libwebp', '-lossless', '1');
  args.push(out);
  execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'ignore'] });
  const dims = ffprobeDims(out);
  rec.status = 'ok';
  rec.bbox = b;
  rec.cropBox = { x, y, w, h };
  rec.clipped = clipped;
  rec.outDims = dims;
  rec.noUpscale = dims.w <= Math.ceil(b.w) && dims.h <= Math.ceil(b.h);
  rec.sha256 = execFileSync('sha256sum', [out], { encoding: 'utf8' }).split(' ')[0];
  rec.flatness = flatness(out);
  rec.ffmpeg = `ffmpeg -i ${src} -vf crop=${w}:${h}:${x}:${y}${out.endsWith('.webp') ? ' -c:v libwebp -lossless 1' : ''} ${out}`;
  results.push(rec);
}
fs.writeFileSync('/tmp/asset-crops.json', JSON.stringify(results, null, 1));
for (const r of results) {
  console.log(r.status, r.asset, r.status === 'ok' ? `${r.cropBox.w}x${r.cropBox.h}+${r.cropBox.x}+${r.cropBox.y} upscale=${!r.noUpscale} ${r.flatness}` : r.evidence);
}
