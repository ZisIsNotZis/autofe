# links · linear-app/home · round 63 link-coverage closure

Baseline: `node m1/eval/link-coverage.mjs --only linear-app/home` → 4 wrong-target findings (matches /tmp/links-now.json). `node m1/validate.mjs m1/curated/linear-app/home.json` → ok. `node m1/eval/capture-integrity.mjs --only linear-app/home` → 0 unmatched.

## Finding 1 · changelog._items[3] — stale witness, model already re-curated correctly

- Witness `linear-app/home:changelog._items[3]` records old content `Coding sessions … Aug 19, 2026` → `/changelog/2026-08-20-coding-environments`; the fresh capture's changelog list rotated: the anchor at the SAME address `/html[0]/body[1]/div[0]/div[1]/main[1]/div[0]/div[24]/div[2]/div[4]/a[1]` now carries `Priority inbox An active workspace … Sep 3, 2026` → `/changelog/2026-09-03-priority-inbox`. The full fresh list: Stacked pull requests (`…2026-10-08-stacked-pull-requests`, div[1]), New controls for Linear coding agent (`…2026-09-24-…`, div[2]), Loops for product management (`…2026-09-14-loops-for-product-management`, div[3]), Priority inbox (div[4]).
- Model `changelog._items[3]` = `Priority inbox / _summary An active workspace… / _datetime 2026-09-03 / _action → https://linear.app/changelog/2026-09-03-priority-inbox` — already matches the fresh capture verbatim. `Coding sessions` exists nowhere in the fresh dom.
- Decision: stale witness CONTENT (not a model defect) → do NOT change the model. Operative lever (allow is inert for witness findings): replace the entry's binding fields in `m1/eval/link-owner-witnesses.json` (shared, parent-integrated), keeping `id`, `page`, `modelOwner`, `renderOwner`, `sourceAddress`, `sourceOwner`:
  - `sourceHash = defc03e6c40e5ea45913f650ef7df70cc1d855d8378441e2b7b6ea6698f2ce1a`
  - `sourceText` = `ownerText` = `Priority inbox An active workspace can create a significant amount of notifications each day, and until now your inbox treated them all the same. The new Priority tab separates what needs your attention from what can wait, so something like a review blocking a release never gets buried. Sep 3, 2026`
  - `sourceHref = /changelog/2026-09-03-priority-inbox`, `target = https://linear.app/changelog/2026-09-03-priority-inbox`
- Allow entry (instructed shape; inert for this finding class):
```json
{"page":"linear-app/home","kind":"wrong-target","text":"Coding sessions Linear Agent can now set up, run, and test your code before returning its work. That means fewer handoffs and changes that are further along when they come back to you. Aug 19, 2026","reason":"55 轮 witness 记录的旧 changelog 条目已滚出列表；同地址 div[24]/div[2]/div[4]/a[1] 现为 Priority inbox → /changelog/2026-09-03-priority-inbox，模型 items[3] 已按新捕获重写且一致。应改 witness 绑定（allow 对 witness finding 无效）。","round":63}
```

## Finding 2 · sales — stale witness hash (binding still true)

- `sales` witness fails only `sourceHash` (`5b1019c3…` vs current `defc03e6…`); anchor still at `/html[0]/body[1]/div[0]/div[1]/main[1]/div[0]/section[27]/div[1]/a[1]`, text `Contact sales`, href `/contact/sales`, model `_action.to = https://linear.app/contact/sales` — identical.
- Lever: hash-only rebind to `defc03e6c40e5ea45913f650ef7df70cc1d855d8378441e2b7b6ea6698f2ce1a`.
```json
{"page":"linear-app/home","kind":"wrong-target","text":"Contact sales","reason":"witness sourceHash 被回捕作废；锚点仍在 section[27]/div[1]/a[1]，text/href/模型目标逐字一致。","round":63}
```

## Findings 3–4 · render-owner-unverified — targets carried by the capture

- `Changelog → https://linear.app/changelog`: render anchor `main[0]/article[0]/section[4]/article[0]/h2[0]/a[0]` (section title drawn from `changelog._action navigate`); capture carries the same pair at footer `/html[0]/body[1]/div[0]/div[1]/footer[2]/div[0]/div[0]/div[2]/ul[1]/li[7]/a[0]` (text `Changelog`, href `/changelog`).
- `Get started → https://linear.app/signup`: render anchor `main[0]/article[0]/div[7]/a[0]` (template CTA, no model-owner ancestor); capture carries it at `/html[0]/body[1]/div[0]/div[1]/main[1]/div[0]/section[27]/div[1]/a[0]` (text `Get started`, href `/signup`).
- Decision: capture carries the model's target in both cases; the text-keyed owner oracle cannot bind section-action/template anchors → allow proposals only, model untouched.

## Proposed link-coverage-allow entries (parent-integrated)
```json
{"page":"linear-app/home","kind":"wrong-target","text":"Changelog","reason":"渲染把 changelog 节的 _action（navigate → /changelog）画在节标题上；源站该目标由页脚 Changelog 锚点（footer[2]/…/ul[1]/li[7]/a[0]）真实携带，target 非构造。owner-oracle 无法把节级动作绑到具体渲染锚点。","round":63}
{"page":"linear-app/home","kind":"wrong-target","text":"Get started","reason":"渲染的模板 CTA（div[7]/a[0]，无 data-model-owner 祖先）；源站同 text+href 锚点在 main[1]/…/section[27]/div[1]/a[0]，target /signup 真实携带。","round":63}
```

## Proof of closure (harness, 2026-10-16)
checkPage with the /tmp patched witnesses (hash refresh + changelog._items[3] replacement above) → exactly the 2 render-owner findings remain (allow class); both witness findings gone, no new ones, linked 2/2.
