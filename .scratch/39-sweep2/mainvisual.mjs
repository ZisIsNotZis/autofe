// Round 39 criterion for a card/list entry's MAIN VISUAL image
// (docs/m1/layout-axes.md §9.5; m1/failures.md F-080).
//
// An entry's main visual is the LARGEST image inside that entry, and it must clear a floor
// of 100x60. The floor alone cannot separate a thumbnail from an avatar: on
// `bilibili-com/read-home` the real content thumbnails are 117x88 and the avatars are 24x24,
// so any absolute floor that keeps the thumbnail (117x88) also keeps nothing else — but a
// slightly smaller card (100x60) would still be a main visual while an avatar never is.
// "Largest in its entry" is the part that actually excludes avatars/icons.
export const MAIN_VISUAL_MIN_W = 100;
export const MAIN_VISUAL_MIN_H = 60;

/** @param {{w:number,h:number}} box @param {Array<{w:number,h:number}>} siblingBoxes all images inside the same entry */
export function isMainVisual(box, siblingBoxes) {
  const w = Number(box?.w ?? 0), h = Number(box?.h ?? 0);
  if (!(w >= MAIN_VISUAL_MIN_W && h >= MAIN_VISUAL_MIN_H)) return false;
  const area = w * h;
  return (siblingBoxes ?? []).every((b) => Number(b?.w ?? 0) * Number(b?.h ?? 0) <= area);
}

if (process.argv.includes('--selftest')) {
  let bad = 0;
  const check = (name, got, want) => {
    const ok = got === want;
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`, ok ? '' : `got=${got} want=${want}`);
  };
  const avatar = { w: 24, h: 24 };
  const floor = { w: 100, h: 60 };
  const thumb = { w: 117, h: 88 };
  check('S0 an entry\'s largest image at exactly the floor (100x60) is a main visual', isMainVisual(floor, [avatar, floor]), true);
  check('S1 a 24x24 avatar is not a main visual (below the floor)', isMainVisual(avatar, [avatar, floor]), false);
  check('S2 the real 117x88 thumbnail is a main visual next to its 24x24 avatar', isMainVisual(thumb, [avatar, thumb]), true);
  check('S3 in the same entry the avatar is not the main visual (it is not the largest)', isMainVisual(avatar, [avatar, thumb]), false);
  check('S4 a small image that is the largest in its entry is still below the floor', isMainVisual({ w: 90, h: 60 }, [{ w: 90, h: 60 }]), false);
  check('S5 the largest of two content-sized images wins (tie keeps both)', isMainVisual({ w: 216, h: 144 }, [{ w: 216, h: 144 }, { w: 145, h: 145 }]), true);
  console.log(bad ? `主视觉判据自测: ${bad} 条失败` : '主视觉判据自测: 全部通过 (6 条断言)');
  process.exit(bad ? 1 : 0);
}
