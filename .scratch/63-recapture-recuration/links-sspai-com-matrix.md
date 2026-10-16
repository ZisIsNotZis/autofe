# links · sspai-com/matrix · round 63 link-coverage closure

Baseline: `node m1/eval/link-coverage.mjs --only sspai-com/matrix` → 2 wrong-target findings (matches /tmp/links-now.json). `node m1/validate.mjs m1/curated/sspai-com/matrix.json` → ok. `node m1/eval/capture-integrity.mjs --only sspai-com/matrix` → 0 unmatched.

## Finding 1 · columns._items[2] — stale witness content, model already re-curated correctly

- Witness `sspai-com/matrix:columns._items[2]` records `Bear熊掌记 1014 人关注` → `/column/254`; the fresh capture rotated the 专栏推荐 sidebar: the anchor at the SAME address `/html[0]/body[1]/div[0]/div[0]/div[1]/div[1]/div[0]/aside[1]/div[2]/ul[1]/li[2]/a[0]` now carries `六蠹集 822 人关注` → `/column/310`. `Bear熊掌记` exists nowhere in the fresh dom.
- Model `columns._items[2]` = `_name 六蠹集 / _count 822 人关注 / _action → https://sspai.com/column/310` — already matches the fresh capture verbatim (sidebar list: 生命黑客 → column/360, 果铺知道 Tabletops → column/358, 六蠹集 → column/310).
- Decision: stale witness CONTENT → do NOT change the model. Operative lever (allow is inert for witness findings): replace the entry's binding fields in `m1/eval/link-owner-witnesses.json` (shared, parent-integrated), keeping `id`/`page`/`modelOwner`/`renderOwner`/`sourceAddress`/`sourceOwner`:
  - `sourceHash = c9c5fe9c030a18cbef63bb9a484d30dbb31946871a924e9c3f3f8fc83b364cbc`
  - `sourceText` = `ownerText` = `六蠹集 822 人关注`; `sourceHref = /column/310`; `target = https://sspai.com/column/310`
- Allow entry (instructed shape; inert for this finding class):
```json
{"page":"sspai-com/matrix","kind":"wrong-target","text":"Bear熊掌记 1014 人关注","reason":"55 轮 witness 记录的旧侧栏专栏已滚出列表；同地址 aside[1]/div[2]/ul[1]/li[2]/a[0] 现为 六蠹集 822 人关注 → /column/310，模型 columns._items[2] 已按新捕获重写且一致。应改 witness 绑定（allow 对 witness finding 无效）。","round":63}
```

## Finding 2 · render-owner-unverified — vote-card question, target carried by the same widget

- Render anchor `main[0]/article[0]/section[3]/article[0]/section[1]/div[0]/a[0]` (owner `yipai.vote`) draws the question text `这次长假出门，你带了哪些「全程没掏出来」的数码装备？` → `https://sspai.com/bullet/1791445045`.
- Capture: the vote widget at `aside[1]/div[0]` reads `讨论 这次长假出门…数码装备？ 我来说一说 更多一派讨论` — the question is PLAIN text; the widget's action anchor is `我来说一说 → /bullet/1791445045` (`aside[1]/div[0]/div[3]/a[0]`).
- Decision: the model's `yipai.vote._action.to` (bullet/1791445045) IS carried by the capture — on the sibling `我来说一说` anchor of the same widget; the render draws the node action over the card per the render grammar. Owner oracle cannot pair a fact-run whose source text is plain → allow proposal only, model untouched.

## Proposed link-coverage-allow entry (parent-integrated)
```json
{"page":"sspai-com/matrix","kind":"wrong-target","text":"这次长假出门，你带了哪些「全程没掏出来」的数码装备？","reason":"源站投票卡里问题文本为纯文本，动作链接由同节点“我来说一说”锚点（aside[1]/div[0]/div[3]/a[0] → /bullet/1791445045）承载；渲染按节点动作画整卡链接，target 为源站真实携带，非构造 URL。","round":63}
```

## Proof of closure (harness, 2026-10-16)
checkPage with the /tmp patched witnesses (columns._items[2] replacement above) → exactly the 1 render-owner finding remains (allow class); witness finding gone, no new ones, linked 65/65.
