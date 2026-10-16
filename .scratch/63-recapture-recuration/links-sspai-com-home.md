# links · sspai-com/home · round 63 link-coverage closure

Baseline: `node m1/eval/link-coverage.mjs --only sspai-com/home` → 8 wrong-target findings (matches /tmp/links-now.json). `node m1/validate.mjs m1/curated/sspai-com/home.json` → ok. `node m1/eval/capture-integrity.mjs --only sspai-com/home` → 0 unmatched.

## Finding 1 · feed._items[5]._author 一派投票 — association mis-pair on a repeated same-label anchor

- The capture links the text `一派投票` six times, always to `/u/` (raw href `/u/`); no `一派投票` anchor carries the bullet URL. The item's card action `https://sspai.com/bullet/1791445045` IS carried — by the title/card anchors (`div[2]/a[1]` text `这次长假出门…去看看`, and the feed article's own anchors), and the model's item-level action is verified by the oracle (39/40 facts linked; the only unlinked one is this finding).
- The checker's fact loop tests each `_`-fact of a node against the NODE's action: it paired the card action (bullet) with the meta fact `一派投票`, while the capture pairs that text with the repeated `/u/` channel link. The render draws `_author` as plain meta text (`<div class="meta">一派投票</div>`), so adding a link to a meta fact is not expressible in the current render grammar — changing the model cannot close this finding.
- Decision: association oracle mis-paired a repeated same-label anchor; model target real → allow proposal only, model untouched.

## Findings 2–8 · banner / editors / campaigns promo links — text-less source anchors

All seven render links have their exact href carried verbatim by the fresh capture on image-only anchors (no visible text, name only in the img `alt`, which is where the model `_name` facts come from). The text-keyed owner oracle cannot bind anchors with empty text, so ownership stays unverified:

| model node | render link | capture anchor (verbatim href) | img alt |
|---|---|---|---|
| `banner._items[1]` | `/a/Kd8QBK` | `…/div[0]/div[0]/div[1]/div[0]/div[0]/div[0]/div[0]/div[0]/div[0]/div[0]/div[1]/a[0]` | 学得会的快捷指令 |
| `editors._items[1]` | `/a/KjNYBK` | `…/div[1]/div[1]/div[0]/div[0]/div[0]/a[0]` | Apple 怎么看 iPhone Duo？专访 Apple 零售副总裁 Deirdre |
| `campaigns._items[0]` | `/create/retro-handheld-guide` | `…/div[2]/div[2]/div[0]/div[0]/div[0]/a[0]` | 中古掌机收藏选购指南 |
| `campaigns._items[1]` | `/create/linx` | `…div[1]/a[0]` | 灵犀Linx 68 带屏键盘 |
| `campaigns._items[2]` | `/create/yoooclaw` | `…div[2]/a[0]` | YoooClaw C·ONE |
| `campaigns._items[3]` | `/create/rand0` | `…div[3]/a[0]` | 口袋先知墨水屏 |
| `campaigns._items[4]` | `/create/baimiao` | `…div[4]/a[0]` | 白描 PDF 鸿蒙版 |

(All under `/html[0]/body[1]/div[0]/div[0]/div[1]/…`; the banner sibling `/a/KE6eAz` with visible text is owner-verified and unflagged — the discriminator is exactly the empty anchor text.)

- Decision: capture carries the model's target for all seven → allow proposals only, model untouched. No URL constructed anywhere.

## Proposed link-coverage-allow entries (parent-integrated)
```json
{"page":"sspai-com/home","kind":"wrong-target","text":"一派投票","reason":"源站把“一派投票”作为频道标签重复链接到 /u/（6 处锚点）；模型把它建模为投票卡的 meta 事实，卡片动作 bullet/1791445045 由标题锚点承载且已通过 owned-exact 验证。检查器把节点动作套到该 meta 事实上造成误配；渲染语法把 meta 画为纯文本，无法为此建链。","round":63}
{"page":"sspai-com/home","kind":"wrong-target","text":"学得会的快捷指令","reason":"源站 banner 卡为纯图片锚点（可见文本为空，名称在 img alt）：/a/Kd8QBK 逐字携带于 …div[1]/a[0]，模型 _action 与之一致；文本键 owner-oracle 无法绑定空文本锚点。","round":63}
{"page":"sspai-com/home","kind":"wrong-target","text":"Apple 怎么看 iPhone Duo？专访 Apple 零售副总裁 Deirdre","reason":"同上：/a/KjNYBK 逐字携带于 editors 区图片锚点，alt 与模型 _name 一致。","round":63}
{"page":"sspai-com/home","kind":"wrong-target","text":"中古掌机收藏选购指南","reason":"同上：/create/retro-handheld-guide 逐字携带于 campaigns 区图片锚点。","round":63}
{"page":"sspai-com/home","kind":"wrong-target","text":"灵犀Linx 68 带屏键盘","reason":"同上：/create/linx 逐字携带于 campaigns 区图片锚点。","round":63}
{"page":"sspai-com/home","kind":"wrong-target","text":"YoooClaw C·ONE","reason":"同上：/create/yoooclaw 逐字携带于 campaigns 区图片锚点。","round":63}
{"page":"sspai-com/home","kind":"wrong-target","text":"口袋先知墨水屏","reason":"同上：/create/rand0 逐字携带于 campaigns 区图片锚点。","round":63}
{"page":"sspai-com/home","kind":"wrong-target","text":"白描 PDF 鸿蒙版","reason":"同上：/create/baimiao 逐字携带于 campaigns 区图片锚点。","round":63}
```

## Verification (2026-10-16 round 63)
No model edit → no re-validation needed beyond the recorded `validate` ok + capture-integrity 0 unmatched. Live finder unchanged (8 findings, allow class only). Sibling-banner control (`/a/KE6eAz`, text-bearing anchor) is linked 39/40 — supports the empty-text diagnosis.
