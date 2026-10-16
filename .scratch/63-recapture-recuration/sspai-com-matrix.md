# 63 · Re-curation report — sspai-com/matrix (heavy drift, 73 unmatched)

Date: 2026-10-16. Worker: matrix re-curation against the fresh capture
(`corpus/sspai-com/matrix/`, captured 2026-10-16T08:07Z). Protocol: ticket.md +
`m1/curated/curation-log-recapture.md` (recapture batch rules) + F-023/24/25/28/29.
Scope: `m1/curated/sspai-com/matrix.json` only; nothing committed; no shared files touched.

## Drift classification (before → after)

Probe baseline: `capture-integrity` on the committed model vs the fresh capture = **73 unmatched
facts** (heavy drift). Classification of the 73:

| region | unmatched (before) | verdict |
|---|---|---|
| `feed._items[0..19]` | 61 (titles/authors/times/authorLinks) | **wholesale rotation**: all 20 posts replaced between captures (old feed ids 114443–114699 → new 112554–116267); a few old author names/times "matched" only as substrings of unrelated new items (e.g. 蓬岸 still authors a new post) |
| `yipai.vote._name` | 1 | rotated vote question (+ new bullet thread id) |
| `worth-following._items[0..4]` | 9 | **full rotation**: all 5 recommended authors replaced |
| `columns._items[2]` | 2 | slot 3 rotated (Bear熊掌记/1014 → 六蠹集/822); slots 1–2 unchanged |

Skeleton intact in the capture: create CTA, feed-view tabs (精选/热门/随便看看), feed +
加载更多, yipai card, 值得关注, 专栏推荐 + 查看全部, navigation (共创/PRIME/Matrix/栏目),
footer 7 entries + record line — every skeleton target re-verified verbatim in `dom.html`
(67/67 `_action.to` targets checked programmatically, `//`-relative → `https:`, `&amp;` unescaped).

## Decisions

1. **Feed: full 20/20 replacement** (recapture rule 5: rotations are wholesale replacements, not
   diffs). Per item: `_key mp-<postid>`, `_title` from the `post-title` node, `_author` from the
   nickname span, `_subtitle` = the capture's relative time verbatim (today's posts show bare
   `09:50`/`09:39` — kept bare, no date invented), `_action open → /post/N` absolutized,
   `authorLink` → `/u/<id>`. Like/comment counts stay unmodeled (skeleton never carried them).
2. **Feed covers: 19/19 painted covers attached as verbatim CDN URLs** (640x400 `cdnfile.sspai.com`
   srcs from `dom.html`, attribution provable — the `img.post-cover` sits inside the item's own
   `li`, after the item's title). `alt: ""` (no alt attribute in capture — absence kept absent).
   This replaces the round-62 recovered crops, whose files (`../assets/62-recovered-*`) were lost
   in the re-clone and whose posts are gone anyway. Item 13 (Apple 官网排版细节鉴赏) paints no
   cover in capture/full.png → no `_image`. Pattern = this round's sspai-home re-curation.
3. **yipai: vote question + thread URL rotated** (`这次长假出门，你带了哪些「全程没掏出来」的数码装备？`;
   `/bullet/1791445045` on vote + join — the URL is verbatim from the `我来说一说` href; the
   summary itself is unlinked in this capture, skeleton action kept per reviewed model).
   ADD `yipai._image`: the card's cover photo (536x340 CDN src, verbatim, painted prominent in
   `full.png`) — rotated content per recapture rule 7 (aliyun leading-image precedent); the old
   model predates it being painted.
4. **值得关注: 5/5 replaced** (二一的笔记 / KingTsui / 阿帅的健康笔记 / JIgsaw / mivansaka),
   `_name`/`_detail` verbatim from nodes.json inner spans, `_action open → /u/<id>` verbatim.
5. **专栏推荐 slot 3 → 六蠹集** `/column/310`, `_count {num:822, unit:'人关注'}`; slots 1–2
   (生命黑客 59, 果铺知道 Tabletops 224) byte-identical, untouched.
6. **Author-badge note**: feed item 1's nickname paints as `约斯特普通` — the site merges the
   user-level badge 普通 into the nickname text node (nodes.json name and dom.html agree). Taken
   verbatim in `_author`/`authorLink._name`; splitting "约斯特"+"普通" would be interpretation,
   not capture. Flagged for parent review; one-string fix if the parent disagrees.
7. Unchanged/dropped regions keep their previous reviewed state: nav promo popup
   (无需申请…了解更多 → manual.sspai.com, site chrome), avatars, Pi Store strip — all outside
   the skeleton, drops stand.

## Gates (final revision, all re-run after the last edit)

- `node m1/validate.mjs m1/curated/sspai-com/matrix.json` → **ok (0 errors)**
- render via `/tmp/matrix-render.mjs` (imports `m1/render.mjs`) → `/tmp/matrix.html`;
  `node m1/eval/metrics.mjs … corpus/sspai-com/matrix` → **factFidelity 1.00** (115/115,
  missing 0); storyline tau null — pre-existing for this archetype (null in the before-run too,
  no heading order to match), not a regression.
- `node m1/eval/capture-integrity.mjs --model …` → **0 unmatched** (was 73), scanned 101/115,
  0 allowlisted, 0 captureGaps, 0 iconEvidence, 0 provenanceErrors.
- Scoped `git diff --check` clean; diff = 220+/208− (rotated content only after re-serializing
  at the repo's 2-space indent).
- Visual sanity: `full.png` read (EMPHASIS: feed covers, yipai photo card, sidebar) + one render
  screenshot — content/order match; remote CDN images don't paint in the offline render browser
  (same as sspai-home this round), tags verified present in the HTML instead.
- Budget: 2/4 screenshot reads; ~25 min.

## Proposed capture-integrity-allow entries

**None.** 0 unmatched without any allow entry.

## Proposed asset additions

**None.** All images ride verbatim capture URLs; no crops needed.

## Residuals / for parent attention

- `约斯特普通` badge merge (decision 6) — the only judgement call a reviewer may want to flip.
- Unmodeled painted chrome, unchanged from the reviewed model: feed like/comment counts, author
  avatars, yipai 讨论 tag, Pi Store promo strip, nav promo popup. `加载更多` IS modeled (feed.more).
- Storyline tau null is pre-existing metric behavior for this page shape (see recapture log §bilibili).
