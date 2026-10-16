# links · xiaomi-account/login · round 63

Finder: 2 findings，均 `invalid captured source/owner witness`。

## 决定：模型不改；非 allow 可声明 —— 需 parent 重建 witness 条目 ×2

witness 页级 hash：现捕获 sha256 `9ed6b5f44b7793e5cc6c77c310f3871f9844f0ec28b1a1d2a4a03835c19a28d0` ≠ 记录 `0f4ba0754bb72cebec397ce0e82762ae74d8bc53b8e51000f090370e1b2e68ee`（唯一失败项）。

1. **`login.forgot` "忘记密码？"** — witness 地址 `/html[0]/body[1]/div[0]/div[0]/div[0]/div[1]/div[0]/div[0]/div[1]/div[0]/div[1]/div[0]/div[1]/div[0]/div[0]/form[0]/div[0]/div[4]/div[0]/a[0]` 在现捕获原样存在：`<a href="/pass/forgetPassword?sid=passport&_bannerBiz=">忘记密码？</a>`，与模型 `login.forgot._action.to`（绝对化后 `https://account.xiaomi.com/pass/forgetPassword?sid=passport&_bannerBiz=`）逐字一致。
2. **`login.phone-login` "手机号登录"** — 同表单 `…/div[4]/div[1]/a[0]` 原样存在：href `/fe/service/login/phone?sid=passport&qs=%253Fsid%253Dpassport&…&_locale=zh_CN`（长查询逐字），与模型目标绝对化后一致（base=现捕获 meta 登录页 URL）。

两条 finding 的 `checkSourceWitnesses` push 不经 allow 文件 → allow 无法声明。capture 实际携带模型目标，属 witness 陈旧。

→ **parent 集成项**：两条目仅重算 sourceHash；地址、sourceText、sourceHref、target、modelOwner/renderOwner 均不变。

## 验证
- `node m1/validate.mjs m1/curated/xiaomi-account/login.json` → ok（模型未改动）
- `capture-integrity --only`（7 页合跑）→ 未命中 0
- allow 提案验证：无（本页 finding 不经 allow；witness 重建后归零）
