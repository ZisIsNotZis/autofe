# 轮 17：刷新过期的 auto 快照，让"全库 grep 无空 src"成立

> 状态：已跑完。刷新 134 个 auto 快照（104 tmp + 30 curated-renders），空 src 764 → **0**；auto 层缺陷分布已记；口径说明已落 `m1/eval/m3-report.md`；收尾 `pipeline.mjs` **EXIT=0 / 42/42 保真 / 视觉自查 42/42 / 三套自测通过**。最后一行 `AUTO_REFRESH_DONE ...` 即完成标记。
> 写过的仓库文件：本报告、`m1/eval/m3-report.md`（口径说明）、104 个 `m1/extract/tmp/*.auto.html`、30 个 `m1/curated/renders/auto-*.html`。**未改 `m1/curated/<site>/<page>.json`（42 页策展模型）、未改 42 页策展渲染 `m1/curated/renders/<dash>.html`、未改 `corpus/`、未改抽取器/渲染器/门禁脚本、未新增语法或保留键、未 git 提交。0 张看图。**

## 0. 目标与边界

- **目标**：`m1/extract/tmp/*.auto.html` 与 `m1/curated/renders/auto-*.html` 是 9/28 **旧渲染器 + 旧 `--eval`** 的遗留草稿快照，含 `<img src="">`。用**当前引擎**（draft → `m1/render.mjs`）重生成覆盖，使"全库 grep 无空 src"字面成立，并如实记录**草稿层**（非策展层）剩余缺陷。
- **边界**：auto 快照 = **草稿层**，不是策展层。它们**不进**覆盖率/保真宣称；缺陷率只用于观察抽取器表现（口径说明见 §3）。42 页策展模型与其渲染**不动**。
- **背景数字更正**：任务书写"9/28 份"含空 src，实测 before 为 **43/104**（tmp auto）与 **15/30**（renders auto）；`src="undefined"` 两集均 **0**。以实测为准。

## 1. 刷新（draft → 当前渲染器）

**机制**：对每个已存在的 auto 快照，按文件名定位其抽取草稿 `m1/extract/drafts/<site>/<page>.json`，用当前引擎 `render(model)`（`m1/render.mjs`，与 `extract.mjs --eval` 的 `cmdEval` 同一条路径：`fs.writeFileSync(htmlPath, render(model))`）覆盖写回。**只覆盖已存在的文件，不新增、不删除**（未把后加的 6 个草稿补成 auto 快照，超出"刷新"范围）。

临时生成脚本（一次性，`/tmp/refresh.mjs`）：对 `m1/extract/tmp/*.auto.html` 按 `<site>--<page>` 拆名取 draft；对 `m1/curated/renders/auto-<dash>.html` 用"draft 的 `<site>-<page>` 全名"反查（30/30 命中）。

**刷新前后 auto 文件数与空 src 计数**（空 src = `<img … src="">`；undefined = `<img … src="undefined">`）：

| 集 | 文件数 | 空 src 命中文件（前） | 空 src `<img>` 数（前） | undefined（前） | 空 src（后） | undefined（后） |
|---|---|---|---|---|---|---|
| `m1/extract/tmp/*.auto.html` | 104 | **43** | **673** | 0 | **0** | **0** |
| `m1/curated/renders/auto-*.html` | 30 | **15** | **91** | 0 | **0** | **0** |
| **合计（刷新的 134 文件）** | **134** | 58（去重底层页 = 43） | **764** | 0 | **0** | **0** |

- 关系核验：30 个 `renders/auto-*` 的底层草稿页 **全部 ⊂ 104 个 tmp auto 页**，且刷新后二者**逐字节相同**（30/30 identical）——同一 draft、同一引擎。
- 原始 grep 复核（`grep -l 'src=""' / 'src="undefined"'`）四路全 **0** 命中。
- 刷新后 auto 页 **`<img>` 标签数 = 0**：草稿里 674 个图片事实**全部无源**，当前渲染器按 F-055 规则把它们降级为**可见 alt 文本** `<span class="img-alt">…</span>`（tmp 674 个、renders 92 个 span）。这**不是**"图丢了"——是"D 无源图不产破图，把已抓到的 alt 变成正文"。
- 唯一 1 处非 1:1：`aliyun-com--home`（旧引擎 0 个 `<img>`、新引擎 1 个 `.img-alt`）——旧渲染器对**列表值 `_image`** 取 `.image`（undefined）而**静默丢弃**，新引擎保留其 alt（轮 16 §1 的回归修复）。

## 2. auto 层缺陷分布（`audit-visual.mjs`）

### 2.1 任务指定命令（renders/auto-*.html，30 文件）

```
$ node m1/eval/audit-visual.mjs m1/curated/renders/auto-*.html
⚠ auto-apple-com-cn-iphone-17.html              dup-title:1
    dup-title: iPhone 17
⚠ auto-huawei-cn-search-phone.html              dup-title:1
    dup-title: 华为磁吸手机支架 - 华为官网
⚠ auto-mi-com-product-detail-mi15.html          dup-title:1
    dup-title: 米家宠物空气净化器

视觉自查: 27/30 干净 | 待修 3
```

### 2.2 全草稿层（额外跑 tmp/*.auto.html，104 文件；含 2.1 的 30 页内容）

```
$ node m1/eval/audit-visual.mjs m1/extract/tmp/*.auto.html
⚠ ant-design--components-date-picker.auto.html  dup-title:3
⚠ ant-design--components-form.auto.html         dup-title:3 dup-content:2
⚠ ant-design--components-input.auto.html        dup-title:3
⚠ ant-design--components-table.auto.html        dup-title:3 dup-content:1
⚠ apple-com-cn--iphone-17.auto.html             dup-title:1
⚠ arco-design--components-form.auto.html        dup-title:2 dup-content:1
⚠ element-plus--date-picker.auto.html           dup-content:1 dup-options:1
⚠ element-plus--form.auto.html                  dup-content:2 dup-options:2
⚠ element-plus--select.auto.html                dup-content:1
⚠ element-plus--table.auto.html                 dup-title:1
⚠ huawei-cn--search-phone.auto.html             dup-title:1
⚠ mi-com--product-detail-mi15.auto.html         dup-title:1

视觉自查: 92/104 干净 | 待修 12
```

**草稿层硬缺陷类别分布**（104 个 distinct auto 页，12 页有硬标记）：

| 类别 | 命中页数 | 页 |
|---|---|---|
| `dup-title` | **9** | antd date-picker/form/input/table、arco form、element-plus table、apple iphone-17、huawei search-phone、mi15 |
| `dup-content` | **6** | antd form/table、arco form、element-plus date-picker/form/select |
| `dup-options` | **2** | element-plus date-picker、element-plus form |
| `broken-img` | **0** | — |
| `empty-text` / `form-fragmentation` / `img-variance` / `unit-stack` / `fabricated-buttons` / `empty-anchors` / `checkmarks` / `css-columns` | **0** | — |

**口径 caveat（诚实）**：`audit-visual.mjs` 用 `m3-final.json`（42 策展页的 `<dash>.html` → `corpus/<k>`）把重复内容分"源站本就重复（info）"与"渲染器引入（硬）"。auto 页文件名是 `auto-<dash>.html`（tmp 是 `<site>--<page>.auto.html`），**不在该映射里** ⇒ `cap` 为空 ⇒ **所有 dup 一律记为硬**（本可判 info 的源站重复也被算硬）。故上表 `dup-title/dup-content/dup-options` 是**上界**（antd/element-plus 文档页的术语跨块重复多为源站固有）。**本轮只统计不修**（任务纪律；且 12 < 几十页）。

## 3. 口径说明落在哪

**文件**：`m1/eval/m3-report.md`，顶部「口径提示」块下新增一段（轮 17 补记），原文：

> **auto 快照口径（轮 17 补记）**：`m1/extract/tmp/*.auto.html` 与 `m1/curated/renders/auto-*.html` 是**抽取器草稿层**的渲染快照（draft → 当前渲染器 `m1/render.mjs`，2026-10-01 全量刷新），只用于观察抽取器在未见页面上的表现；它们**不进覆盖率/保真宣称**，其缺陷率不得与 42 页策展层（`m1/curated/renders/*.html`）的口径混淆。缺陷类别/页数见 `.scratch/17-auto-refresh/report.md`。

（`rubric.md` 未改；口径说明只放一处，避免两处漂移。）

## 4. 门禁不放水（策展层不受影响）

```
$ node m1/eval/pipeline.mjs            # EXIT=0
[pipeline] 渲染 42/42 | 错误 0
[pipeline] 保真 1.00: 42/42
[pipeline] 模型校验: 48 个全通过
[pipeline] 校验器自测: 通过
[pipeline] 地基自测(D1/D2/D3): 通过
[pipeline] 度量自测(F-052): 通过
视觉自查: 42/42 干净
```

- pipeline 只重渲染 `m1/curated/renders/<dash>.html`，`audit-visual.mjs --all` 仍 `!startsWith('auto-')` 排除 auto 快照 ⇒ 与 auto 层完全隔离。
- `git status`：仅 134 个 auto 文件（+ 本报告 + `m3-report.md`）改动；**暂存区 0**、`corpus/` 0 改动、42 页策展模型 0 改动、非 auto 的策展渲染 0 改动。

## 5. 纪律与留痕

- 25 分钟硬限内完成（实际约 8 分钟）。分片落盘本文件。
- 未新增语法/保留键；未 git 提交；0 张看图。
- 中间物：`/tmp/refresh.mjs`（生成器）、`/tmp/inv.mjs`（清点）、`/tmp/auto-audit*.txt`（门禁原文）。仓库外，不留残渣。

（`auto_defect_pages=3` 取**任务指定命令** `audit-visual.mjs m1/curated/renders/auto-*.html` 的结果；同口径扩展到**全 104 页草稿层**则为 **12**，见 §2.2。两者不可互换：3 = 30 个策展层 auto 草稿，12 = 104 个全量抽取草稿。）

AUTO_REFRESH_DONE files=134 empty_src_before=764 empty_src_after=0 auto_defect_pages=3 fidelity=42/42
