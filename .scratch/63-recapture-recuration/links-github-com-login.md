# links · github-com/login · round 63

Finder: 1 finding，`login.signup._action` → `https://github.com/signup?source=login`，reason `invalid captured source/owner witness`。

## 决定：模型不改；非 allow 可声明 —— 需 parent 重建 witness 条目

witness `github-com/login:login.signup:/html[0]/body[1]/div[0]/div[2]/main[0]/div[0]/div[2]/div[0]/p[0]/a[0]`：
- 现捕获 sha256 `9e4372094a2f5780446aa5abb9f5242119162d03ffb486037bfff83d9934af64` ≠ 记录 `8996c3395ecb5f6d500b103599d377ca2f24519338d74d5e570db4d50c928795`（唯一失败项）。
- 其余全对： recorded 地址在现捕获原样存在，`<a href="/signup?source=login">Create an account</a>`，text/href/target 与模型 `login.signup._action.to` 逐字一致（本页 7 锚中唯一该文本锚）。
- `checkSourceWitnesses` 直接 push finding、不经 allow 文件 → allow 无法声明。

→ **parent 集成项**：重算 sourceHash（地址、文本、href、target 全部不变）。

## 验证
- `node m1/validate.mjs m1/curated/github-com/login.json` → ok（模型未改动）
- `capture-integrity --only`（7 页合跑）→ 未命中 0
- allow 提案验证：无（本页 finding 不经 allow；witness 重建后归零）
