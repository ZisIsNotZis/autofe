# FIX46 — 语义/语法小修 + 接线

状态：DONE（`node m1/eval/pipeline.mjs --shots` exit=0）

## 任务清单
1. [x] `secret` 闭式类型新增 → 密码字段渲染 `<input type="password">`，值不入条件/日志/aria/文本回显
   - [x] vocab.json valueTypes + model-lib VALUE_SHAPE + validate VALUE_KEYS
   - [x] axis.choicePlan 对 secret 强制 value=null（取值不进正文事实）
   - [x] render.mjs 映到 type=password，不写 value/sr-only，CSS 与 text 同款
   - [x] render-text/md 只出占位 `(密码)`，不回显值
   - [x] failures.md F-084 理由 + axis-selftest O0–O3 + validate-selftest ACCEPT
   - [x] 3 个登录模型 password `text→secret`（源站均为 `<input type="password">`）
2. [x] H1 回退取首段（`|`/`｜`/`_`/` - `），provenance 写进 `_intent`（§5.3）
   - `mi-com/home`→Xiaomi官方网站；`36kr-com/{home,search-ai,search-viz}` 同步取首段
3. [x] gov-uk 正文链接行内样式（§9 补可计算判据 `axis.inlineBodyLinkKey`）+ axis-selftest P0–P2
4. [x] huawei-cn/search-laptop 排序控件（判层=模型漏建 ⇒ 补模型，不造 label，只建抓取到的「相关性」）+ axis-selftest Q0
5. [x] bilibili 弹幕：新增声明式 `_rel.order="stream"` → 行内紧凑流（§10.5）+ axis-selftest R0–R1
6. [x] no-upscale-selftest 接入 pipeline 第 10 道自测

## 证据 / 结果（`--shots` 收尾，exit=0）
- 保真 1.00: **42/42（HTML）**；Markdown 目标 **42/42**；模型校验 **48 个全通过**
- 自测十道全过（含第 10 道「图片不放大自测 F-082」）；视觉自查 **42/42 干净**
- 证据一致性（PNG ⇄ HTML）：**通过**（42 页与截图同源, 画廊 v=mupappj4）
- 采集↔模型一致性（F-078）：**通过**（未命中 0）

## 关键改动
- `m1/vocab.json`, `m1/model-lib.mjs`, `m1/validate.mjs`, `m1/axis.mjs`, `m1/render.mjs`, `m1/render-text.mjs`, `m1/render-md.mjs`, `m1/eval/metrics.mjs`（indexNorm 把 `<>` 占位视为透明）
- `m1/eval/pipeline.mjs`（第 10 道门禁）、`m1/eval/axis-selftest.mjs`、`m1/eval/validate-selftest.mjs`
- 模型：`mi-com/home`、`36kr-com/{home,search-ai,search-viz}`、`bilibili-com/video-bv1gj411x7h7`、`huawei-cn/search-laptop`、`{github-com,stripe-dashboard,xiaomi-account}/login`
- `docs/m1/layout-axes.md`（§5.3/§6/§9/§10.5）、`m1/failures.md`（F-084…F-088）

## 残余 / 未完成
- `huawei-cn/search-phone` 源站同款排序控件本轮未同步补（不在点名范围，F-087 已登记待办）。
- 未 git 提交（遵守纪律）；`m1/curated/renders/**` 为重生成产物。
