# links · bilibili-com/home · round 63

Finder: 5 findings。模型 0 处伪造/过期 URL → **模型不改**；allow 条目 ×3 + 2 条 witness 失效需 parent 重建 `link-owner-witnesses.json`。

## 逐条决定

1. **"【直播】2026IVL秋季赛W3D1" `feed._items[10]._name` → `https://live.bilibili.com/6650029?live_from=81003`**（expect 长 session_id `…trackid=…666&live_from=81002`）
   DOM 同名双锚：`div[0]/main[2]/div[0]/div[0]/div[0]/div[11]/div[0]/div[0]/div[1]/a[2]` 文本逐字=【直播】2026IVL秋季赛W3D1 → `…?live_from=81003`（模型采此，逐字一致）；`…/div[12]/div[0]/div[1]/div[1]/div[0]/h3[0]/a[0]` 文本 `直播中 【直播】2026IVL秋季赛W3D1` → 长 URL（live_from=81002）。oracle 以包含式 compact 匹配把模型事实配到 div[12] 锚 → 重复相近文本错配，两目标均真实 → **allow 提案**（同一键同时覆盖第 3 条渲染侧与潜在的 `_action` 关联声明）。

2. **"中国制造就是好，用了不烧心！" → `https://www.bilibili.com/bangumi/play/ss323486?spm_id_from=333.337.0.0`**（render-owner-unverified）
   DOM：该 href 逐字存在于轮播卡封面图链 `…/div[0]/div[0]/div[1]/div[0]/div[0]/div[0]/div[3]/div[0]/div[0]/a[1]`——可见文本为空，标题仅存于 `img alt="中国制造就是好，用了不烧心！"`。引擎对空文本锚不入 realKey；模型把卡片标题事实与封面链目标关联后渲染为链接 → 无法获所有权证实，目标真实 → **allow 提案**。

3. **"【直播】2026IVL秋季赛W3D1"（渲染侧，href 81003）** — 与第 1 条同源（见上），同键覆盖。

4. **"这什么物价？！二周年彩蛋终于破解！" `feed._items[9]._action`**（invalid captured source/owner witness，expect `BV1Q6eE64EeE`）
   注意 finding 文本来自 **陈旧 witness 的 sourceText**，非模型。模型现为 `feed._items[9] = { _name: 动态速写, _action.to: BV1oVp66NEaq }`，与现捕获逐字配对（`…/div[10]…/h3[0]/a[0]` 文本 `动态速写` → `BV1oVp66NEaq`；封面 `a[0]` 文本 `76.8万 315 00:29` 同目标）；`BV1Q6eE64EeE` 在现捕获 0 命中。dom sha256 现 `de21ddcbba6195559770f21567936b76e9f3c776bcd196759ddc031813be79c9` ≠ witness `eb6fba7a…`。→ **parent 重建该 witness 条目**（hash、sourceText `动态速写`、sourceHref/target `…BV1oVp66NEaq`、title 锚地址 `…/div[10]/div[0]/div[0]/div[0]/div[1]/div[0]/h3[0]/a[0]`）。

5. **"中国模特勇闯欧洲时装周|面试实录第一集" `feed._items[8]._action`**（同上，expect `BV1SAYd6sEtv`）
   模型现为 `{ _name: 【神人短剧】神人TV最新力作🔥全网最"烧心"版本🔥棍母快餐vs费八分钱，管饱【AI全民制作人】, _action.to: BV1DLpR6cEiW }`，现捕获逐字配对（`…/div[9]…/h3[0]/a[0]` + 封面 a[0] `36.3万 1014 10:15`）；`BV1SAYd6sEtv` 现捕获 0 命中。→ **parent 重建该 witness 条目**（同结构，div[9]）。

## 提议 allow 条目（第 1–3 条）

```json
{"page":"bilibili-com/home","kind":"wrong-target","text":"【直播】2026IVL秋季赛W3D1","round":63,"reason":"同名双锚：捕获 div[11]…/div[1]/a[2] 文本逐字=【直播】2026IVL秋季赛W3D1 → live.bilibili.com/6650029?live_from=81003（模型 feed._items[10] 采用，逐字一致）；div[12]…/h3[0]/a[0] 文本'直播中 【直播】…' → 长 session_id URL（live_from=81002）。oracle 以包含式文本匹配把模型事实配到 div[12] 锚；两目标均真实存在，属重复相近文本错配，非伪造。"}
{"page":"bilibili-com/home","kind":"wrong-target","text":"中国制造就是好，用了不烧心！","round":63,"reason":"目标 https://www.bilibili.com/bangumi/play/ss323486?spm_id_from=333.337.0.0 逐字存在于捕获轮播卡封面链 div[0]…/div[3]/div[0]/div[0]/a[1]，该锚可见文本为空、标题仅存于 img alt；引擎对空文本锚不入 realKey，模型把卡片标题事实与封面链目标关联后渲染，无法获所有权证实；目标真实，非伪造。"}
```

## 验证
- `node m1/validate.mjs m1/curated/bilibili-com/home.json` → ok（仅既有 W_COMPOSITE_NAME_ONLY_WATERMARK 警告，非本次引入；模型未改动）
- `capture-integrity --only`（7 页合跑）→ 未命中 0
- allow 提案生效验证：本页 findings 5→2（余 2 条均 witness-hash 陈旧，待 witness 重建）
