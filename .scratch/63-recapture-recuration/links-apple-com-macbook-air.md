# links · apple-com/macbook-air · round 63

Finder: 2 findings，`wrong-target` / `render-owner-unverified`，均渲染侧（无 path）。

## 决定：模型不改（0 处伪造/过期 URL）；提出 allow 条目 ×2

1. **"Help me choose the best Mac for me" → `https://www.apple.com/mac/best-mac/#usage/`**
   DOM：`corpus/apple-com/macbook-air/dom.html` `main[6]/section[14]/div[0]/div[0]/div[0]/div[0]/div[0]/div[1]/a[1]` —— `<a href="/mac/best-mac/#usage/" aria-label="Help me choose the best Mac for me" class="…compare-cta…">`：href（含 `#usage/`）与 aria-label 均与模型逐字一致，锚即事实本体。`/mac/best-mac/`（无 fragment）另在全局导航 `div[1]/nav[0]/…/ul[1]/li[1]/a[0]`。所有权 oracle 未判 owned-exact-action → 关联证实失败，非伪造。

2. **"Get 3% Daily Cash back with Apple Card." → `https://www.apple.com/apple-card`**
   DOM：该句为纯文本脚注（不包锚）；URL 由页脚 `footer[7]/div[0]/nav[4]/div[0]/div[1]/ul[1]/li[1]/a[0]`（文本 `Apple Card`，href `/apple-card/`）携带，与模型目标归一化相等（尾斜杠剥离）。a11y 事实源：`nodes.json` name `"Apple Card Get 3% Daily Cash back with Apple Card. And pay over time…"`。模型从源站同卡片把句子与 Apple Card 链接目标关联，oracle 无法在渲染锚上证实 → 非伪造。

## 提议 allow 条目

```json
{"page":"apple-com/macbook-air","kind":"wrong-target","text":"Help me choose the best Mac for me","round":63,"reason":"目标 /mac/best-mac/#usage/ 逐字存在于捕获 main[6]/section[14]/div[0]/div[0]/div[0]/div[0]/div[0]/div[1]/a[1]（aria-label 与 href 同锚逐字一致）；所有权 oracle 未判 owned-exact-action，非 URL 伪造。"}
{"page":"apple-com/macbook-air","kind":"wrong-target","text":"Get 3% Daily Cash back with Apple Card.","round":63,"reason":"目标 /apple-card（捕获 /apple-card/，归一化相等）由页脚 footer[7]/div[0]/nav[4]/div[0]/div[1]/ul[1]/li[1]/a[0]（文本 Apple Card）携带；模型事实文本来自 a11y 节点（nodes.json name 'Apple Card Get 3% Daily Cash back with Apple Card. …'），源站该句为纯文本脚注不包锚，渲染锚无 owned-exact-action，非 URL 伪造。"}
```

## 验证
- `node m1/validate.mjs m1/curated/apple-com/macbook-air.json` → ok（模型未改动）
- `capture-integrity --only`（7 页合跑）→ 未命中 0
- allow 提案生效验证：本页 findings 2→0、declared 2
