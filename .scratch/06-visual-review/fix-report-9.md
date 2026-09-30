# 修复报告 · 轮 10（退化对比表规则 + 验收遗留 3 条 minor）

写入者：轮 10 实现者（唯一写入者）。范围：`m1/**` + `.scratch/**`（未动 `corpus/`、未动 `tools/capture/`、未 git 提交）。
输入：`verification-3.md`（第 6 轮独立验收，PASS + 3 minor）、`rounds.md` 共同纪律。
硬限：40 分钟；每片先落盘。

---

## 片 0 · 侦察量测（先于改动）

写了探针 `/tmp/probe.mjs` 复算**全库**对比集的表指标（口径 = `compareRowKeys` + 单元格是否有值）。库内 4 张对比表（airbnb/aliyun/stripe/iphone）实测：

| 集合 | n 列 | 行键 | 填充率 | 共享行（≥2 实体有值） | 位置行 `_items[i]` |
|---|---|---|---|---|---|
| airbnb `reviews.aspects` | 6 | `_rating` | 1.00 | 1 | 0 |
| aliyun `instances` | 4 | `cpu`,`memory` | 1.00 | 2 | 0 |
| **stripe `plans`** | 2 | `_detail`,`_text`,`_items[0..3]` | 0.50 | **0** | 4 |
| **iphone-17 `which-iphone`** | 2 | display…ai,`buy`,`_items[0..4]` | 0.91 | 9 | 5 |

关键分辨：
- **stripe**：`_detail`/`_text` 只有实休①有值，`_items[0..3]` 只有实体②有值 ⇒ **没有任何一条被两个实体共享的属性行** ⇒ 空壳。
- **iphone-17**：真实属性行（显示屏/芯片/摄像头/电池/Apple 智能）两列都有值，表本身成立；缺陷在**颜色行按 `_items[i]` 下标配对**（薰衣草紫 ↔ 蓝）。
- **airbnb 只有 1 条共享行但填充率 1.00**，是被验收接受的合法最小对比表 ⇒ 论证见片 1。

→ 结论：退化判据须分两种信号（空壳 / 低填充），且 `_items[i]` 位置行不是"可比属性"。

## 片 1 · 引擎退化规则（`m1/render.mjs`）

### 判据（论证）
任务建议「填充率 < 0.4 **或** 有效行数 < 2」。按片 0 量测：
- **填充率阈值取 0.4**：库内合表格的填充率分别为 1.00 / 1.00 / 0.91，退化表 0.50；0.4 落在两者之间且留有余量（半填充即不再算表）。用构造集验证 0.38 触发、1.00 不触发。
- **「有效行数 < 2」不能直接采用**：`airbnb reviews.aspects` 是**只有 1 条有效行**（`_rating`）但**填充率 1.00**、被第 6 轮验收明确接受的合法最小对比表。若按 `< 2` 一刀切会误伤它。故把「有效行」定义为**被 ≥2 个实体同时声明值的属性行**，退化为**空壳**的判据是 `sharedRows === 0`（一条共享行都没有，哪怕每格都填了字，如 stripe 的两列各说各话）。这与任务「有效行数 < 2」的**意图**（剔除空壳表）一致，且不误伤单行满填充表。
- **`_items[i]`/`_lines[i]` 位置行不是可比属性**：按下标对齐两个无关列表是「配对」不是「对照」（iphone 颜色 薰衣草紫↔蓝）。此类键不再进 `compareRowKeys`；实体的嵌套集合渲染在**该实体自己的列内**（`<th class="cmp-col">` 的新 `.cmp-nested` 容器），不再丢事实。

### 实现
`compareRowKeys` 跳过 `isPositionalKey`；新增 `compareHasCell`/`compareStats`（填充率 + 共享行）；`compareSetVerdict` 依次判：
`fewer-than-2-entities` → `member-is-a-control` → `member-has-no-name` → `no-comparable-attribute` → **`degenerate-no-shared-attribute`** → **`degenerate-fill-rate:<rate>`**。
后两者即 pipeline「显式降级清单」与 D2 并列的新理由。`renderCompareTable` 头部为每个实体追加其嵌套集合（`selectForm` 选形，颜色 ⇒ chips）。

### 构造断言（`m1/eval/foundation-selftest.mjs`，新增 D2b 四条）
```
ok   D2b a sparse set (no shared attribute row) does not become a table
ok   D2b a dense set (shared attributes) becomes a comparison table
ok   D2b a thin table (fill < 0.4) degrades with its fill rate
ok   D2b nested collections are not index-paired rows (colors stay in their column)
ok   D2 every curated compare marker is a table or an explicit degradation
显式降级清单（compare 标记但成不了对比表）:
  · stripe-com/pricing · n=2 · degenerate-no-shared-attribute
地基自测: 全部通过
```
（同时修了 D2 清单核对器对**无 `_key` 集合**的匹配：原先 `d.key === c._key` 对无键集合恒假，过去因这些集合都成了表而侥幸通过。）

## 片 2 · 三条 minor

### minor(a) 36kr `information-technology` H1 来源说明 — **已补**
先核实抓取：`corpus/36kr-com/information-technology/dom.html` **无 `<h1>`**（`<h1` 计数 0），「科技频道」只出现在 `<title>`（`科技频道_前沿科技_人工智能_黑科技_智能社会_智慧城市_36氪`）与 meta description，`nodes.json` **0 命中**。按 home/search-ai/search-viz 同一写法补进 `_intent`：
> 页面 H1 来源：抓取中无可见标题（dom.html 无 <h1>，「科技频道」只出现在 <title> 与 meta description，nodes.json 0 命中），故 `_title` 取文档 `<title>` 的首段「科技频道」（父代理裁定·轮 6）。

（模型中 `_title` 本就是人读的「科技频道」，非 SEO 串接串；本条只补溯源，不改可见文本。）

### minor(c) aliyun `g9i` 列缺价格 — **去 corpus 核实：源站确无价格 ⇒ 保留空缺 + 说明**
`corpus/aliyun-com/product-ecs/dom.html` / `nodes.json` 中 g9i 卡文本为
`g9i实例 (中大型企业首选) 实例 : 2核8G 购买时长 : 1年 数量 : 1 立即购买` —— **止于「立即购买」，无 ￥/¥ 金额**；同一 block 里 e/u2a/c9i 卡都有金额（￥99 / ￥1438.68 / ￥3459.90）。故**不补价格**（诚实优先）：
- 给 `_items[3]`（g9i）加 `_intent` 说明「源站该卡未给出价格…`_price` 空缺——不编造价格」；
- 集合 `instances._intent` 补一句「g9i 列的价格空缺非漏采：源站该卡无金额」。

### 顺手 mi15 `assurances` chip 连排 — **已改（引擎侧，最小半径）**
见片 3。

`node m1/validate.mjs` 两模型：`ok`。

## 片 3 · 顺手 mi15 `assurances` chip 连排 — **已改（引擎侧，最小半径）**

先量化爆炸半径：写 `/tmp/chipscan.mjs` 复算全库「chip 形态」集合。改前 `renderChips` 的换行判据只看 `[，。；、]`，而 mi15 的超长项用**全角括号**旁注「7天无理由退货（到店自取拆封后不支持）」，故不触发。
全库扫描「chip 集合中含全角括号标签」= **仅 mi15 一处**（airbnb 星级分布、bilibili 弹幕样本本就含 `，` 已走 `chips-rows`）。故把判据扩为 `[，。；、（）：]`（含句读/旁注的标签不是 chip 尺寸），爆炸半径 1 页。

`node m1/render.mjs m1/curated/mi-com/product-detail-mi15.json` → `.chips.chips-rows`，6 条各占一行。`--shots` 后裁图确认（见片 4 抽图）：6 条保障/政策各自一行，连排消失。其余 35 页未受影响（几何 `--shots` 后仍 36/36 干净、保真 36/36）。

## 片 4 · 抽图所见（`--shots` 后，read 实图）

- **stripe-com/pricing**（`/tmp/fix9/stripe-plans-top.png`）：退化后 plans 段由"空壳两列表"变为**两个各自成立的区块**——`标准定价`（概述 / `3.4% + HK$2.35` / 「每笔成功的国内银行卡交易」 / 香港说明 / 「立即开始」）、`定制化定价`（概述 / 四个定价方式短标签 / 「联系销售」）。信息完整、可读，**明显优于**原先行标题与值列同字、两列各说各话的空壳表。
- **apple-com-cn/iphone-17**（`/tmp/fix9/iphone-which.png`）：表仍成立（行=显示屏/芯片/摄像头/电池/Apple 智能/购买，列=iPhone 17（当前浏览）/iPhone Air），**机身颜色移到各自列头**（左：薰衣草紫/鼠尾草绿/青雾蓝/白/黑；右：蓝/金/白/黑），**不再按下标配对**。行标签实测 = 显示屏/芯片/摄像头/电池/Apple 智能/购买（无颜色）。
- **aliyun-com/product-ecs**（`/tmp/fix9/aliyun-instances.png`）：对比表成立（行=CPU/内存，列=四实例）；g9i 列**仅缺价格行**（其余三列有 ¥99/¥1238/¥1385），与源站一致——诚实空缺，非渲染缺陷。
- **mi-com/product-detail-mi15**（`/tmp/fix9/mi15-assurances2.png`）：`用户评价` 入口下 6 条保障/政策**逐行**排列，连排消失。

## 片 5 · 门禁原文（`node m1/eval/pipeline.mjs --shots`，自跑）

```
[pipeline] 渲染 36/36 | 错误 0
[pipeline] 保真 1.00: 36/36
[pipeline] 模型校验: 42 个全通过
[pipeline] 校验器自测: 通过
[pipeline] 地基自测(D1/D2/D3): 通过
[pipeline] 显式降级清单（compare 标记但成不了对比表）:
[pipeline] · stripe-com/pricing · n=2 · degenerate-no-shared-attribute
[pipeline] 地基自测: 全部通过
dup-title: 华为磁吸手机支架 - 华为官网
· sspai-com-home.html                           dup-source-true(info):2

视觉自查: 36/36 干净
[pipeline] 截图 36 张, 画廊 v=muodz0hp
```

**降级清单前后对比**
- 改前（verification-3 第 6 轮）：`显式降级清单（compare 标记但成不了对比表）: （无）`
- 改后：`· stripe-com/pricing · n=2 · degenerate-no-shared-attribute`（与 D2 的 `no-comparable-attribute` 并列；理由带 `n` 与判据名）

`node m1/eval/validate-selftest.mjs` → **12/12 通过**；`foundation-selftest.mjs` → 全部通过（含新增 D2b 四条）。纪律核对：渲染产物 `_intent` 命中 0 文件、`<script` 0 文件、`>buy</operate/navigate/open<` 0、`href="key:` 0。

## 片 6 · 未修与理由 / 协调注意

- **未修**：无（3 条 minor 全部处置；退化规则已落地并带看图确认）。
- **口径偏离（已在设计中论证，非擅自改产品）**：任务建议「有效行数 < 2 ⇒ 退化」；实测 `airbnb reviews.aspects` 是**只有 1 条共享行、填充率 1.00、被第 6 轮验收接受**的合法最小对比表，按 `< 2` 会误伤。最终判据取「**共享行 == 0 ⇒ 空壳**」或「**填充率 < 0.4**」，并把 `_items[i]` 位置键从行键中剔除（颜色移到列内）。论据与阈值均写入 `docs/m1/layout-axes.md §3.1/§3.2`，并有 D2b 构造断言钉死。
- **协调注意（非我提交）**：会话期间有并发编排提交把本轮的 `m1/render.mjs` 退化规则与两个模型 `_intent` 一并纳入历史（`git log -1 -- m1/render.mjs` = `162ef7e`）。因此当前 `git diff HEAD` 只剩我**后加**的 chips 括号判据（`m1/render.mjs` 2 行）+ 重生成产物。我本人**未**执行 `git commit`；`git diff --cached` 为空。不属于我的改动：并发 worker 的 `corpus/**`（只增页面）、`.scratch/09-new-exemplar-curation/**`。
- **未触碰**：`corpus/`（0 改动）、`tools/capture/`。

FIX9_DONE degenerate_rule=done minors=3/3 fidelity=36/36 audit=clean
