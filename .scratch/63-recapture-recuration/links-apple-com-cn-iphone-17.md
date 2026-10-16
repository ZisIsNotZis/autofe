# links · apple-com-cn/iphone-17 · round 63

Finder: 4 findings。模型 0 处伪造/过期 URL → **模型不改**；allow 条目 ×2 + 2 条 witness 失效需 parent 重建 `link-owner-witnesses.json`。

## 逐条决定

1. **"进一步了解个人设置辅导" → `https://www.apple.com.cn/cn/shop/goto/personal_setup`**（render-owner-unverified）
   DOM：`/cn/shop/goto/personal_setup` 逐字存在 ×7（全局导航 `div[1]/nav[0]/div[0]/ul[0]/li[1]…` ×5 响应式克隆 + `main[3]/section[13]/div[0]/div[0]/nav[1]/div[1]/ul[1]/li[4]/a[0]`），锚文本均为短形 `个人设置辅导`。权益卡 `_lines[10]._items[3]`（`benefits-setup`）所在 section[9] 新捕获无锚点；渲染 run 文本=动作标签全形 → oracle 无法证实 → 非伪造。→ **allow 提案**。

2. **"进一步了解 Apple Store App" → `https://apps.apple.com/cn/app/apple-store/id375380948`**（render-owner-unverified）
   DOM：逐字存在于 `footer[4]/div[0]/nav[3]/div[2]/div[0]/ul[1]/li[5]/a[0]`（文本 `Apple Store App`）。同上属关联证实失败 → 非伪造。→ **allow 提案**。

3. **"购买" `._action` → `https://www.apple.com.cn/cn/shop/goto/buy_iphone/iphone_17`**（invalid captured source/owner witness）
   witness `apple-com-cn/iphone-17::/html[0]/body[1]/main[3]/section[1]/div[2]/div[0]/div[0]/div[0]/a[1]`： recorded dom hash `d07c0b8d…` ≠ 现捕获 `77e07743…`；旧地址 `…div[0]/a[1]` 现为 `…div[0]/a[0]`（子索引漂移），文本 `购买`、href、模型根 `_action.to` 三者与现捕获完全一致（另 `nav[2]` ×2 同目标）。模型无错；`checkSourceWitnesses` 的 finding **不经 allow 文件**（直接 push），只能重建 witness → **parent 集成项：重算 hash、地址 a[1]→a[0]**。

4. **"用 iPhone 13 或后续机型来换购 iPhone 17，预计可享 RMB 900 至 RMB 5100 的 折抵优惠 * 。" `_lines[0]._action` → `#benefits-tradein`**（invalid generated-reference source/entity/owner binding）
   witness `apple-com-cn/iphone-17:6`：hash 失配同上。两端点均在现捕获原地址存活：banner `main[3]/div[0]/div[0]/div[0]/div[0]/div[0]/p[0]`（现可见文本 `用符合条件的设备换购新 iPhone，可享 折抵优惠 * 。`＝模型 `_summary`；旧长句只剩 `data-product-template` 属性）＋目标标题 `main[3]/section[9]/div[1]/div[0]/div[0]/ul[0]/li[0]/div[0]/div[0]/div[0]/h3[0]` = `Apple Trade In 换购计划`（=`_lines[10]._items[0]._key:benefits-tradein`，模型 `_ref` 未变）。绑定语义成立，仅 witness 陈旧 → **parent 集成项：重算 hash、sourceText 更新为新可见文本**。

## 提议 allow 条目（仅第 1、2 条可由 allow 声明）

```json
{"page":"apple-com-cn/iphone-17","kind":"wrong-target","text":"进一步了解个人设置辅导","round":63,"reason":"目标 /cn/shop/goto/personal_setup 逐字存在于捕获 7 处（全局导航 div[1]/nav[0] ×5 响应式克隆 + main[3]/section[13] 站点地图），锚文本为短形'个人设置辅导'；权益卡 benefits-setup 所在 section[9] 新捕获无锚点，渲染 run 文本=动作标签全形，所有权无法证实，非 URL 伪造。"}
{"page":"apple-com-cn/iphone-17","kind":"wrong-target","text":"进一步了解 Apple Store App","round":63,"reason":"目标 https://apps.apple.com/cn/app/apple-store/id375380948 逐字存在于捕获 footer[4]/div[0]/nav[3]/div[2]/div[0]/ul[1]/li[5]/a[0]（文本 Apple Store App）；权益卡 benefits-app 所在 section[9] 无锚点，渲染 run 文本=动作标签，所有权无法证实，非 URL 伪造。"}
```

## witness 重建证据（parent 用）
- dom sha256：现 `77e07743158b8b853462f36513658ab871378583db84eab25126829d9c65b694`，witness 记录 `d07c0b8dd9959cfd2494cfe1e70d44f9b288f7f3cbb861cbd53a749ed0f677c8`。
- 条目 3：sourceAddress → `…/main[3]/section[1]/div[2]/div[0]/div[0]/div[0]/a[0]`（原 a[1]），sourceText/ownerText `购买`、sourceHref `/cn/shop/goto/buy_iphone/iphone_17`、target 不变。
- 条目 4：sourceAddress 不变；sourceText → `用符合条件的设备换购新 iPhone，可享 折抵优惠 * 。`；sourceTargetAddress 不变，sourceTargetText `Apple Trade In 换购计划` 不变；modelOwner `_lines[0]`、targetModelOwner `_lines[10]._items[0]`、referenceKey `benefits-tradein` 不变。

## 验证
- `node m1/validate.mjs m1/curated/apple-com-cn/iphone-17.json` → ok（模型未改动）
- `capture-integrity --only`（7 页合跑）→ 未命中 0
- allow 提案生效验证：本页 findings 4→2（余 2 条均 witness-hash 陈旧，待 witness 重建）
