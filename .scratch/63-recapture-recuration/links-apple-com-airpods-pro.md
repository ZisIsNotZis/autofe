# links · apple-com/airpods-pro · round 63

Finder: 1 finding，`wrong-target` / `render-owner-unverified`（渲染侧，无 path）。

## 决定：模型不改（0 处伪造/过期 URL）；提出 allow 条目 ×1

**"Learn more in our Product Environmental Report (PDF)" → `https://www.apple.com/environment/pdf/products/airpods/Apple_AirPods_Pro_3_PER_Sept2025.pdf`**

DOM：逐字存在于 `corpus/apple-com/airpods-pro/dom.html` `main[6]/section[6]/div[0]/header[0]/div[1]/ul[0]/li[0]/a[0]`（本页唯一携带该 PDF 的锚），锚可见文本与模型动作标签逐字一致；a11y 事实源 `nodes.json` name `"AirPods Pro 3 and the environment. Learn more in our Product Environmental Report (PDF) (opens in new window)…"`（模型标签取其句子、舍 (opens in new window) 后缀）。所有权 oracle 未判 owned-exact-action → 关联证实失败，非 F-025 伪造。

## 提议 allow 条目

```json
{"page":"apple-com/airpods-pro","kind":"wrong-target","text":"Learn more in our Product Environmental Report (PDF)","round":63,"reason":"目标 /environment/pdf/products/airpods/Apple_AirPods_Pro_3_PER_Sept2025.pdf 逐字存在于捕获 main[6]/section[6]/div[0]/header[0]/div[1]/ul[0]/li[0]/a[0]，锚可见文本与模型动作标签逐字一致（a11y name 同，另含 (opens in new window) 后缀）；所有权 oracle 未判 owned-exact-action，属关联证实失败，非 URL 伪造。"}
```

## 验证
- `node m1/validate.mjs m1/curated/apple-com/airpods-pro.json` → ok（模型未改动）
- `capture-integrity --only`（7 页合跑）→ 未命中 0
- allow 提案生效验证：本页 findings 1→0、declared 1
