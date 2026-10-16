# links · apple-com/home · round 63

Finder: `m1/eval/link-coverage.mjs` — 8 findings, all `wrong-target` / `render-owner-unverified`, all text `Stream now`（8 条渲染链接，无 path，来自渲染侧循环）。

## 决定：模型不改（0 处伪造/过期 URL）；提出 allow 条目 ×1（覆盖 8 条）

DOM 证据（`corpus/apple-com/home/dom.html`，363 锚，base `https://www.apple.com/`）：8 个模型目标全部逐字存在：

| 模型节点 `_lines[4].tv._items[*]` | href（dom.html 逐字） | dom 位置 |
|---|---|---|
| Tenzing | `https://tv.apple.com/us/movie/tenzing/umc.cmc.6lic0hhuxkrbem0n29vzjopii?l=en-US?itscg=10000&itsct=atv-apl_hp-stream_now--220622` | `main[3]/section[2]/div[0]/div[2]/ul[0]/li[0]/a[0]` |
| Matchbox The Movie | `…/movie/matchbox-the-movie/umc.cmc.31qa8j1tn2cnpyk3fx43w928d?l=en-US?itscg=10000&itsct=…` | `…/li[1]/a[0]` |
| Formula 1 | `https://tv.apple.com/us/room/formula-1/uts.room.formula-1?itscg=10000&itsct=…`（无 `l` 参数） | grep ×1 |
| Brothers | `…/show/brothers/umc.cmc.17g1y5mzqp92sc0ge1c0hdorg?l=en-US?itscg=…` | `…/li[3]/a[0]` |
| MLS | `https://tv.apple.com/us/channel/mls/tvs.sbd.7000?itscg=10000&itsct=…` | grep ×2 |
| Ted Lasso | `…/show/ted-lasso/umc.cmc.vtoh0mn0xn7t3c643xqonfzy?l=en-US?itscg=…` | `…/li[5]/a[0]` |
| Slow Horses | `…/show/slow-horses/umc.cmc.2szz3fdt71tl1ulnbp8utgq5o?l=en-US?itscg=…` | `…/li[6]/a[0]` |
| Mayday | `…/movie/mayday/umc.cmc.shin43vzfoz3h4ggx41z8rf?l=en-US?itscg=…` | `…/li[7]/a[0]` |
| Widow's Bay | `…/show/widows-bay/umc.cmc.1zzly0vah46bnvnwf0qkrjhh2?l=en-US?itscg=…` | `…/li[8]/a[0]` |

要点：源站自身就带双问号 `?l=en-US?itscg=…`，模型逐字保留（finding JSON 里的 `&amp;` 是渲染 HTML 属性原文，renderRuns 不解码、normalizeHref 解码后相等，非模型缺陷）。finding 皆因所有权 oracle 未对 tv 卡片产出可与渲染锚地址对上的 `owned-exact-action`（仅 `_items[5]` 有 ownership 记录，renderWitnesses 地址不匹配渲染锚），属关联证实失败，非 F-025 伪造。

## 提议 allow 条目（link-coverage-allow.json，parent 集成；勿在此手改）

```json
{"page":"apple-com/home","kind":"wrong-target","text":"Stream now","round":63,"reason":"全部8个 tv.apple.com 目标均逐字存在于新捕获 dom.html（tenzing/matchbox/brothers/ted-lasso/slow-horses/mayday/widows-bay 带 ?l=en-US?itscg=…（源站本身双问号），formula-1/mls 无 l 参数）；模型 _lines[4].tv._items[*]._action 与捕获一致。渲染链路 render-owner-unverified：所有权 oracle 对 tv 卡片未产出可与渲染锚地址对上的 owned-exact-action，非 URL 伪造。"}
```

## 验证
- `node m1/validate.mjs m1/curated/apple-com/home.json` → ok（模型未改动）
- `node m1/eval/capture-integrity.mjs --only …`（7 页合跑）→ 未命中 0，通过
- allow 提案生效验证（引擎 `loadAllow('/tmp/allow-proposal.json')` 覆盖跑）：本页 findings 8→0、declared 8
