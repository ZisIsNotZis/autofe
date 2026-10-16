# visual-warnings · round 63 visual-audit flags ((a)(b)(c)) · 2026-10-16

Scope: the 3 flags assigned to this worker — (a) huawei-cn/search-laptop + search-phone
`fabricated-buttons:1 empty-text:BUTTON.action`, (b) apple-com/airpods-pro
`img-variance:h=131.4/56`, (c) huawei-cn/home `img-variance:h=313.6/172/172.2/407.8`.
Baseline audit: `node m1/eval/audit-visual.mjs --all` on committed renders (version mvavo5qt).
Not in scope, observed in the same run: `broken-img` on mi-com ×2 / sspai ×2 / stripe-docs ×1 —
already covered by the assets/broken-img workers (`assets-regen.md`, `map-broken-imgs.mjs`).

## (a) huawei-cn/search-{laptop,phone} — fabricated-buttons:1 empty-text:BUTTON.action → documented-inherent

Ruling: the render is truthful; the flag is an audit heuristic false-positive against the
engine's own markup. No model change (any model change would fabricate or erase source truth).

Evidence chain:
- Flagged node: `query.submit` (`_action:{verb:"submit"}`, no label, no target) in both models.
  `m1/axis.mjs:958` deliberately picks exactly this child (`verb==='submit' && !label && !hasTarget`)
  and `m1/render.mjs:620` renders it as an icon-only magnifier
  `<button class="action search-submit" aria-label="请输入关键字"><svg…></button>`.
- Fresh capture (corpus/huawei-cn/search-{laptop,phone}/): the control is genuinely labelless —
  dom.html: `<a href="javascript:;" class="btn-b-search" uem_label="…search-btn"><span class="iconfont icon-search"></span></a>`;
  nodes.json has ZERO button nodes (only the searchbox `请输入关键字` and footer textbox);
  a11y.json has no button role; full.png crop (search area, x300-1240/y220-390) shows input
  `笔记本` + clear ⊗ icon + divider + magnifier icon, no text. Screenshot crop kept at
  evidence time only; nothing was written to corpus.
- Label not lost in re-curation: `git show HEAD:m1/curated/huawei-cn/search-laptop.json` query
  block is byte-identical to the current model (labelless submit predates round 63).
- Other pages' search submits render labeled because their SOURCE controls are labeled:
  36kr-com/search-ai + mi-com/search-* dom.html contain visible `站内搜索`; their models carry
  `_action.label:"站内搜索"` and render as `<a class="action verb-submit">站内搜索</a>` —
  a different control truth, not a pattern huawei can copy.
- Rejected silencing paths: adding a label invents visible copy (protocol: label = visible copy);
  removing `submit` erases a control the source has; adding a target violates F-025 and the
  model's own intent field `不编造 endpoint`。
- Audit mechanics: `audit-visual.mjs` counts every `button.action` as fabricated
  (`document.querySelectorAll('button.action')`, T-101 heuristic) and its empty-text probe does
  not treat an svg child as content. Both flags reduce to one root cause.

Parent decision needed (engine, out of worker scope — not touched): either audit-visual.mjs
exempts the renderer's own `.search-submit` (e.g. `button.action:not(.search-submit)` and
count svg as content), or render.mjs emits the icon submit in a non-button form. Until then the
2 flags persist post-integration by design and are documented-inherent here.

## (b) apple-com/airpods-pro — img-variance:h=131.4/56 → FIXED (wrong node picked, repointed)

Cause: `_lines[7]._items[0]` ("New Siri AI.") carried the section showcase
`magical_experience_live_translation__gjk070yu926a_large.jpg` (natural 1260×610) as a card
image, rendering h=131.4 next to two 56px icon callout cards in one `.cards` grid.

Capture truth (corpus/apple-com/airpods-pro/nodes.json): the showcase is full-width
1260×610 at y≈17977 (product-viewer region), while the two callouts are 360×64 icon banners at
y≈19006 with h5 headings BELOW them (y≈19078) — i.e. showcase above, callout row below, never
one side-by-side card row. full.png crop confirms: dark Siri frame → pill tabs → centered
"New Siri AI." caption → 2-up small-icon callouts.

Fix (model only, m1/curated/apple-com/airpods-pro.json `_lines[7]`): repointed the image from
`_items[0]._image` to the line-level `_image` — the established hero-band pattern this very
model uses on `_lines[4]/[5]/[8]` (renders as full-width band, render.mjs hero path). Item[0]
keeps `_key/_name/_detail` verbatim (text-only caption card); items[1..2] untouched; `_intent`
extended with the one-line placement note. No text, URL, alt or order changed.

Verified:
- `python3 -m json.tool` ok; `node m1/validate.mjs m1/curated/apple-com/airpods-pro.json` → ok.
- `node m1/render.mjs … /tmp/renders-check/apple-com-airpods-pro.html`; `node m1/eval/metrics.mjs
  <model> /tmp/renders-check/apple-com-airpods-pro.html corpus/apple-com/airpods-pro` →
  factFidelity 1 (138/138).
- `node m1/eval/audit-visual.mjs /tmp/renders-check/apple-com-airpods-pro.html` → 1/1 干净
  (img-variance gone; grid now holds 2 uniform h=56 icons; showcase is a band outside the grid).
- `node m1/eval/capture-integrity.mjs --only …` (with huawei pages, below) → 0 unmatched for
  this page; its 22 sup-digit omissions are already integrated in the allow file (理由(63)).
  Pre-edit baseline comparison (/tmp/airpods-pre-edit.json): identical 22 unmatched paths —
  the edit introduces zero new unmatched.
- Visual check of /tmp render `#experience` section: showcase band above, caption + icon callout
  row below — matches source order.

Committed `m1/curated/renders/apple-com-airpods-pro.html` still carries the stale render; it
clears when the parent regenerates renders at integration (per ticket, renders/ is
integration-owned; workers render to /tmp only).

## (c) huawei-cn/home — img-variance:h=313.6/172/172.2/407.8 → documented-inherent

Ruling: correct nodes picked; the variance mirrors the source's own mosaic design. No model
change; the renderer has no mosaic form (engine out of scope).

Evidence:
- Capture bboxes (corpus/huawei-cn/home/nodes.json, featured band all at y=1382..2062):
  ICT大赛 473×680 (x=72, tall) | 乾崑 418×330 (x=565, top) + 全闪 418×330 (x=565, y=1732,
  stacked) | Mate 90 RS 363×680 (x=1004, tall). full.png crop confirms the 3-column mosaic:
  tall-left | two stacked middle | tall-right.
- Model `featured._items[0..3]` references exactly those 4 images in that order with each
  tile's own title/detail/action — no wrong crop, no wrong node.
- The rendered heights 313.6/172/172.2/407.8 are the natural aspects flattened into one uniform
  cards grid. Even a perfect mosaic reproduction would vary (330/680 = 0.48 < 0.7 in the source
  itself), so the audit's uniform-height assumption cannot hold for this design; expressing the
  mosaic faithfully needs an engine-level layout form (parent decision, not attempted).

## Verification matrix (2026-10-16, env AUTOFE_CHROME_PATH=chromium_headless_shell-1248, AUTOFE_PLAYWRIGHT_CORE=tools/capture/node_modules/playwright-core)

- `node m1/eval/audit-visual.mjs --all` → baseline: 4 target flags present (plus out-of-scope broken-img flags).
- `node m1/eval/audit-visual.mjs /tmp/renders-check/apple-com-airpods-pro.html` → 1/1 干净.
- `node m1/validate.mjs m1/curated/apple-com/airpods-pro.json` → ok.
- `node m1/eval/metrics.mjs m1/curated/apple-com/airpods-pro.json /tmp/renders-check/apple-com-airpods-pro.html corpus/apple-com/airpods-pro` → fidelity 1.00 (138/138).
- `node m1/eval/capture-integrity.mjs --only apple-com/airpods-pro,huawei-cn/home,huawei-cn/search-laptop,huawei-cn/search-phone` → 页面 4 | 事实 396 | 参与判定 376 | 未命中 0 | 白名单(转换) 22 | 采集缺口 0 → **0 unmatched**.
- Pre-edit baseline capture-integrity (/tmp/airpods-pre-edit.json): 22 unmatched, same paths as post-edit → no regression introduced.

## Proposed allow entries
None — 0 new unmatched; the airpods sup-digit entries were already integrated by the parent
(this worker adds no allow-file edits, per D-63b).

## Files changed by this worker
- m1/curated/apple-com/airpods-pro.json (one `_image` repoint inside `_lines[7]`; see (b)).
- No shared file touched (no engine, no allow json, no renders/, no manifest).
