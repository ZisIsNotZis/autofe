# 独立验收（第 6 轮）· 轮 6/7/8 三批改动

验收者：fresh reviewer（第 6 轮，未参与本轮修复）。把 `fix-report-6/7/8.md` 的自述当**待验证主张**：自跑门禁、独立 `read` 渲染产物、回 `corpus/`/模型核实抓取背书、`git` 只读断代、构造坏样例验证校验器、把旧模型重渲染与当前渲染逐字节对比。只写本文件；未改代码/模型/文档、未 git 提交、未触碰 `corpus/`。

> 采集 worker 说明：`git status` 显示 `tools/capture/sites.json` 被修改（采集侧，非本轮改动）。我断代时（`git diff --name-only fa47043 HEAD -- corpus/` 为空、`git status -- corpus/` 为空）`corpus/` 对本轮三批改动零差异；验收末尾采集 worker 又更新了 `corpus/failures.json` 的 `generatedAt` 时间戳（仅 1 行时间戳，非本轮 diff）。本报告统计一律以 `m1/eval/m3-scale.json` 的 36 个 exemplar 为准，未被新页干扰。

---

## 门禁原文（`node m1/eval/pipeline.mjs`，我自跑，exit=0）

```
[pipeline] 渲染 36/36 | 错误 0
[pipeline] 保真 1.00: 36/36
[pipeline] 模型校验: 42 个全通过
[pipeline] 校验器自测: 通过
[pipeline] 地基自测(D1/D2/D3): 通过
[pipeline] 显式降级清单（compare 标记但成不了对比表）:
[pipeline] 地基自测: 全部通过
dup-title: 华为磁吸手机支架 - 华为官网
· sspai-com-home.html                           dup-source-true(info):2

视觉自查: 36/36 干净
EXIT=0
```

独立补跑：`node m1/validate.mjs $(find m1/curated -maxdepth 2 -name '*.json') m1/models/*/*.json` → **42/42 ok，exit 0**；`validate-selftest.mjs` → **12/12 通过**；`foundation-selftest.mjs` → **全部通过**（含 4 条 F-042、D2「显式降级清单（无）」）。

---

## 逐条结论

### 1. 轮 6 compare 清理 — **accept（附口径更正）**

**现存标记（我自写脚本遍历全库 JSON 统计，非 grep 计数）**：`_rel.compare: true` 共 **5 处标记 / 4 文件**，**不是任务书写的 3 个**：
- `airbnb-com/room-28871 · reviews.aspects`
- `aliyun-com/product-ecs · instances` ← **轮 7 裁定 3 新增**（父代理已批准）
- `stripe-com/pricing · plans`
- `apple-com-cn/iphone-17 · _lines[11]._items[0]` 与 `[1]`（2 处标记 = 1 张表）

任务书的「3」是轮 6 结束时的状态；轮 7 按裁定 3 把 aliyun 实例规格做成真表，故现在是 4 文件。**各自都真的渲染出一张对比表**（我数了每页 `<table class="cmp-table">` 出现次数）：airbnb=1、aliyun=1、stripe=1、iphone-17=1。表内容我亲眼核过：
- airbnb：列=干净卫生/如实描述/入住便捷/沟通顺畅/地段优越(+高性价比)，行=各项评分 4.8–4.9。
- aliyun：列= e实例/u2a实例/c9i实例/g9i实例，行=CPU 2/2/4/2 核、内存 2/4/8/8 GB。
- stripe：列=标准定价(3.4% + HK$2.35)/定制化定价。
- iphone-17：列=iPhone 17(当前浏览)/iPhone Air，行=显示屏/芯片/摄像头/电池/Apple 智能。

**显式降级清单**：pipeline 与 foundation-selftest 均为 **（无）** → 承诺的「6→0」成立。

**被删 16 处抽查（>3 条，回 corpus 核实）**：
| 抽查项 | 源站证据（corpus） | 裁定 |
|---|---|---|
| apple-com/home `tiles` | 模型 6 张磁贴=名/述/动作 + 各自 `buy` 子节点（不同形）；无共享属性行 | 非对照实体组 ✓（现在渲染为卡片栅格，我读图确认） |
| apple-com/ipad-air `_lines[9] cameras` | `12MP Center Stage 前摄 / 12MP 广角后摄 / 双麦+立体声` 三条规格 | 规格列表，非实体组 ✓ |
| apple-com-cn/iphone-17 `_lines[8] upgrade-compare` | 六项优点卡（4800万像素/前置/显示屏/超瓷晶/电池…），对照对象是**选择器里的旧机型** | 优点卡不是「列=实体」✓ |
| apple-com/ipad-air `_lines[5] sizes` | 源站两个 `button`（11”/13” model）+ 三条显示特性 | 实体/属性混排，删标记 + 分层正确 ✓ |
| apple-com/macbook-air `_lines[1].gallery` | 三条图注、两条同名「MacBook Air 13”」 | 非对照 ✓ |

### 2. 轮 6 `_primary` 清理 — **accept**

- 现存 `_primary` **11 处（curated）**，全部解析到角色事实：`_price`×4、`_summary`×5、`_title`×1、`_price`(gov-uk 子节点)×1。模型校验 42/42 全通过。
- **没有页面丢失本该有的 hero**：我逐页 grep 渲染产物 `fact-hero` —— iphone-17=2、ipad-air=2、iphone-16=2、macbook-air=2、bilibili-video=1、gov-uk=2、linear=2、mi-home=2，全部存在。
- **删掉的 30 处确实非法**（`git diff fa47043 4cb14b2` 逐条归类）：目标全是命名子节点（`featured/feed/results/overview/hero/values/articles/panels/flagship/product/plans/phones/news/body`）或 `_items[0]`，无一指向角色键。抽查 3 条：
  - `aliyun-com/home · _primary:"hero"` → `hero` 是命名子节点（我读模型 `Object.keys` 确认）。
  - `huawei-cn/search-phone · _primary:"results"` + `_items[0]` → `results` 是命名子节点、`_items[0]` 是集合元素。
  - `stripe-com/pricing · _primary:"plans"` → `plans` 是命名子节点（且是 compare 节点）。
  - **删除零渲染影响**（渲染器 `render.mjs:507` 只在 `isRoleKey(r.lastKey)` 时才用 hero）：`huawei-cn-search-phone.html` 在 `fa47043` 与当前 **sha256 完全相同**（`195b78cf…`）；轮 6 diff 中 HTML 变动的 5 个页面全部对应 compare 删除，`_primary`-only 页面无 HTML 变动。

### 3. 轮 7 裁定 2（`_primary` 必须是角色事实）— **accept**

我自造坏样例 → `node m1/validate.mjs`：
- `_primary:"featured"`（指向命名子节点）→ **FAIL** `_primary must resolve to a role fact … not a node or inline object`，exit 1。
- `_primary:"_items[0]"`（指向集合元素）→ **FAIL**，exit 1。
- `_primary:"inline"`（指向内联对象）→ **FAIL**，exit 1。
- 合法 `_primary:"_price"` → **ok**，exit 0。

`validate-selftest.mjs` 含两条 must-reject（命名子节点 / `_items[0]`）断言，**12/12 通过**。规则 + 自测均在位。

### 4. 轮 7 裁定 1（36kr 三页 H1 来源）— **accept**

三页 `_intent` 均**如实注明来源**：「页面 H1 来源：抓取中无可见标题…故 `_title` 采用文档 `<title>`（父代理裁定·轮 6）」。回 corpus 核实该说法成立：
- `36kr-com/home`：`dom.html` **无 `<h1>`**，`nodes.json` 无 h1 节点。
- `36kr-com/search-ai` / `search-viz`：唯一 `<h1>` 是侧栏 `kr-card` 里的「36氪APP」下载卡（非页面标题）；结果计数行 `<div class="total-count" style="visibility: hidden;">` **确为隐藏**（grep 证实）——`_intent` 的说法逐字成立。

### 5. 轮 7 裁定 3（vocab-fields 新增字段 + aliyun 真表）— **accept**

- `m1/vocab-fields.json` 新增 `cpu`（label `CPU`, unit `核`）、`memory`（label `内存`, unit `GB`）。
- 抓取背书：`corpus/aliyun-com/product-ecs/dom.html` 与 `nodes.json` 含 `实例 : 2核2G / 2核4G / 4核8G / 2核8G`，与模型四卡 `_fields`（e=2核2G / u2a=2核4G / c9i=4核8G / g9i=2核8G）**逐值一致**；节点 `_intent` 明确写出该抓取来源与「域字段见 vocab-fields.json」。
- **真表**：渲染出列=四实例、行=CPU/内存的 `cmp-table`（我读图 `/tmp/v3/img/aliyun-ecs.png` 确认）。
- caveat（minor）：`CPU`/`内存` 两个**列标签**是从紧凑写法 `N核NG` 推出的，源站没有字面标签；`_intent` 已说明推导，属合理策展。

### 6. 轮 8 模型卫生 — **accept**

**（a）`_items`→`_lines` 渲染逐字节未变（我独立验证，不采信自述）**：把旧版模型 `git show <rev>:<path>` 导出到 `/tmp`，用**当前同一个 `render.mjs`** 分别渲染旧/新，逐字节 `diff`：
```
== ROUND 8 (old=e451edd) ==
SAME  ipad-air        10d86b786f30c57d
SAME  iphone-16       b824410ea70d1aec
SAME  stripe-pricing  e02f06ab064ba856
== ROUND 7 (old=4cb14b2) ==
SAME  bilibili-read-home / huawei-search-phone / sspai-u-jtc092al / taobao-home / macbook-air
SAME  36kr home/search-ai/search-viz / apple-com-cn-iphone-17 / apple-com-ipad-air
DIFF  aliyun-com/product-ecs   （唯一差异 = 裁定 3 新增的实例对比表，设计使然）
```
三个 SHA 与 `fix-report-8.md` 声称的 `10d86b78… / b824410e… / e02f06ab…` **完全吻合** → 「byte-identical」属实，且**轮 7 的 10 处回改也全部逐字节不变**（36kr 三页仅改 `_intent`）。

**（b）6 条「保留 `_items`」判据独立复核**：我复制 `render.mjs` 源码为探针模块，导出 `selectForm/shapeKeys/childrenOf/textLenOf`，独立复算全库 census：
```
非 expose、无 compare、n>=2 且 selectForm==='stack' 的 _items 集合 = 8
stripe-com/pricing  included              n=8 avgSim=1.000 ratio=0.38 childCounts=[4,4,4,3,4,3,3,3]
stripe-com/pricing  catalog[0]._items     n=5 avgSim=1.000 ratio=1.23 childCounts=[5,4,4,4,5]
stripe-com/pricing  catalog[2]._items     n=7 avgSim=1.000 ratio=1.65 childCounts=[4,4,4,5,4,4,4]
stripe-com/pricing  ...Metronome.pricing  n=2 avgSim=1.000 ratio=1.15 childCounts=[2,4]
stripe-com/pricing  catalog[3]._items     n=3 avgSim=1.000 ratio=0.75 childCounts=[5,4,5]
stripe-docs/payments _lines[6]._items     n=5 avgSim=1.000 ratio=0.20 childCounts=[4,3,4,4,4]
（+mi-com/search-earbuds conditions = 成员级 _expose 豁免；+iphone-17 _lines[11] 的成员自带 compare ⇒ 位置无关地成表，非「异质」）
```
判据成立：6 条的 **avgSim 全部 =1.000 且粒度门槛（maxLen≤400、ratio≤4）全部通过，只有 childCounts>2（紧凑度）失败** → 它们确是「同形可互换实例，引擎因表现太富而降级 stack」，保留 `_items` 是说真话。census 8 − 1（成员自带 compare）+ 6 保留 + 1 豁免 = 与报告的「7」口径一致。

### 7. 回归与纪律 — **accept**

- 门禁全绿（见上，exit 0），含模型校验、校验器自测、地基自测。
- `corpus/` 对本轮**零改动**：`git diff --name-only fa47043 HEAD -- corpus/` 空（轮 6/7/8 未碰 corpus）。验收末尾并发采集 worker 改写了 `corpus/failures.json` 的 `generatedAt` 时间戳（仅时间戳、非本轮），已排除在统计外。
- 无 HTML/CSS 逃生口：轮 6 `render.mjs` diff 仅新增作用域透传 + `actionVisible`，全部经 `esc()`；**渲染产物 `<script` = 0 文件**；curated 模型无任何原始标签。
- `_intent` 未泄漏：`grep -rl '_intent' m1/curated/renders/*.html` = **0 文件**。
- 无内部动词/键名上屏：`>buy< / >operate< / >navigate< / >open<` = 0；`href="key:` = 0。
- 无暂存文件：`git diff --cached` 空。（工作树唯一改动是采集侧 `tools/capture/sites.json`，非本轮。）

### 8. 独立看图 ≥8 页 — **accept**

我用 `convert -crop` 从当前提交的整页 PNG 裁切后亲自 `read`（截图由 fix-8 `--shots` 生成，我核过当前 HTML 与提交一致，模型未再变）：
1. **airbnb-com/room-28871**（reviews 段）：`4.86 分 · 815 条评价`、5 星…1 星逐行分布、aspects 对比表（干净卫生…4.8/4.9）。删 compare 后形态**未变差**，评价区结构清晰。
2. **apple-com-cn/iphone-17**（看看哪款 iPhone）：两机型对比表成立、行齐（显示屏/芯片/摄像头/电池/Apple 智能）；尾部按钮组正常。
3. **stripe-com/pricing**（顶部 + 能力清单）：plans 对比表 + 「开箱即用的功能」多个命名分组逐块 deflist，层次清楚。
4. **apple-com/ipad-air**（Two sizes）：11” model(2360x1640) / 13” model 分层，随后 True Tone / P3 / Full lamination 独立成行 —— **错误的 5 列混排表已消失**。
5. **apple-com/home**（tiles + entertainment）：六张产品磁贴+片单卡为卡片栅格，**不是对照表**。
6. **36kr-com/information-technology**（顶部）：H1「科技频道」+ 频道 chip + 资讯卡片流，正常。
7. **aliyun-com/product-ecs**：values 段为 deflist（高稳定性/极致性能/安全可靠/高性价比），instances 为真对比表，产品动态 1..4 有序。
8. **linear-app/home**：H1→摘要→编号 ol→Purpose-built→Changelog 时间轴→Contact sales→customers→Get started，结构成立。
（另核 airbnb 图墙区无假按钮残留、aliyun ECS 无连排。）

**结论**：删除 compare/`_primary` 之后形态**没有变差**；保留的对比表都是真表。

---

## 新发现缺陷

### ① [minor · 一致性] 36kr `information-technology` 的 H1 未注明来源（第四条 36kr 页，不在三条裁定内）
- 现 `_title:"科技频道"`。回 corpus：`dom.html` 中「科技频道」**只出现在 `<title>` 与 meta description**（2 处，均在 head），`nodes.json` **0 处**，正文无可见该文本 → 该页与三页同属「无可见 H1」情形，但 `_intent` **没有**轮 7 那句来源说明，与裁定 1 的口径不一致。
- 另：该页区块标题「资讯频道」在 corpus dom/nodes 中均 0 命中，属模型自撰标签。
- 影响：仅溯源一致性，不影响交付正确性。建议 parent 在下一轮把该页 `_intent` 补齐来源说明（或按「频道名可见性」重新裁定）。

### ② [minor · 既有渲染] 对比表存在退化行（pre-existing，非本轮引入）
- `stripe/pricing` plans 表：`_detail`/`_text`（「每笔成功的国内银行卡交易」「此处显示…中国香港…」）被提升为**行标题**、两个值列皆空；`定制化定价` 的 4 个子项名既作行标题又作值列 → 视觉上一行同字重复。
- `apple-com-cn/iphone-17` 表：颜色行把两机型颜色**按下标配对**（薰衣草紫色 ↔ 蓝色）——语义牵强。
- 断代：轮 6–8 期间 `stripe-com-pricing.html` / `apple-com-cn-iphone-17.html` 无字节变化，属既有引擎行为，非本轮回归。

### ③ [minor · 采集/策展] aliyun 对比表 g9i 列无价格
- 表中 `g9i实例` 只有「中大型企业首选」+ 立即购买，无价格（其它三列有 ¥99/¥1238/¥1385）。属采集/模型缺口，非本轮引入，记录待补。

### ④ 任务书口径更正（非缺陷）
- 必查清单 1 写「现在只有 3 个 `_rel.compare` 标记」，实际是 **4 文件 / 5 实例**（轮 7 裁定 3 新增 aliyun）。已按批准裁定接受。

### 仍存在的既有 minor（沿用 `verification-2.md`，本轮范围外，未变化）
- 36kr 三页 H1 仍是文档标题串（本轮已按裁定注明来源，文本未改，属有据）；
- airbnb「地段 616 / 待客之道 582…」无单位（corpus 无单位词，禁止发明）；
- airbnb 缩略图 2–5 原生低分；airbnb 第 5 图源站 UI 已在上轮修复（本轮无回归）。

---

## 总体判定：**PASS**

轮 6/7/8 的每一条门禁主张均被独立复现：compare 现行标记各自成真表、显式降级清单为空、删除的 16 处回 corpus 实证非对照实体组；`_primary` 现存 11 处全为角色事实、删除 30 处全非法且渲染零变化、无页面丢 hero；`_primary` 硬规则真会拒绝坏样例且自测覆盖；36kr 三页 H1 来源注明与 corpus 事实一致；vocab-fields 新字段有抓取/`_intent` 背书且 aliyun 是真表；轮 8 的 `_items`→`_lines` 经我用同版引擎重渲染确证**逐字节相同**（SHA 与自述吻合），6 条保留判据独立复算成立；门禁全绿、`corpus/` 零改动、无逃生口、`_intent` 未泄漏、无内部动词上屏、无暂存文件；8 页独立看图判断合理、形态未因删 compare/`_primary` 变差。**无 blocker、无 major，新发现 3 条 minor（+1 条口径更正）。**

VERIFY3_DONE verdict=PASS blockers=0 majors=0 minors=3
