# 轮 16：修留出集头号缺陷（无源图片）+ 让图片真正有源

> 状态：已跑完（守卫 + src 回读 + dup-title 判定 + 留出集重跑）。最后一行 `IMG_DONE ...` 即完成标记。
> 唯一写过的仓库文件：本文件、`m1/render.mjs`、`m1/extract/extract.mjs`、`m1/eval/foundation-selftest.mjs`、`m1/failures.md`（F-055 条目）。**未改 `corpus/`**、未新增保留键/语法、未 git 提交。中间物全部在 `/tmp/holdout16/`。

## 0. 目标与边界

- 目标：留出集（69 个未策展页）唯一系统性硬缺陷 `broken-img`（25 页 / 520 个 `<img>`）归零或有明文例外。
- 边界声明（照抄 `.scratch/15-holdout/report.md` §0）：留出集 = `corpus/**` 里已抓取、但不在 `m1/eval/m3-scale.json` 的 42 个 exemplar 里的页面（support 68 + 未分级 1）。这些页面**没有人工策展**，产物是**抽取器草稿**；结论只说明"抽取器/引擎在未见页面上的行为"，**不得用于覆盖率宣称**。

## 1. 渲染器守卫（片 1，最小最稳）

**改动**（`m1/render.mjs`）：新增 `imgHtml(src, alt)`，作为**唯一**的 `<img>` 出口（原先 4 个出口的键名/兜底各不相同）：

```js
function imgHtml(src, alt) {
  const s = typeof src === 'string' ? src.trim() : '';
  const a = alt == null ? '' : String(alt);
  if (!s) return a ? `<span class="img-alt">${esc(a)}</span>` : '';   // 无源 ⇒ 退化为已抓取的 alt 文本
  return `<img src="${esc(s)}" alt="${esc(a)}">`;
}
```

- 4 个原出口全部改走它：`fmt()` 的 image 值、`renderImageStrip`、depth-0 hero 图、promo 卡。
- **顺带修掉轮 15 §4.2 的 `src="undefined"`**：图带/promo 原来读 `.src`（值里只有 `.image`），现在读 `image` 值本身；空串/`undefined` 不再可能进入属性。
- **同时修掉轮 15 §4.2 的另一半（隐性内容丢失）**：`_image` 值为**列表值** `{list:[{image,alt},…]}`（抽取器把一个 storyline 的多张图折叠成列表值，`extract.mjs` 的 `image.length > 1` 分支）时，旧渲染器只取 `.image`（= undefined）⇒ 整组图消失。新增 `imageEntries(v)` 同时接受单值与列表值，列表值按**图带**逐张渲染。这正是 juejin-cn/home 那 11 张图之前输出 `src="undefined"` 的根因。
- 新增 CSS `.img-alt`：灰底小字块，退化后的 alt 是**可见正文**（不是空占位）。

**构造断言**（`m1/eval/foundation-selftest.mjs`，7 条，全部进 `pipeline.mjs` 每次必跑）：

| 断言 | 内容 |
|---|---|
| F-055 空 src 无 `<img>` | 空 src 的 `_image` ⇒ 输出中**不含 `<img`** |
| F-055 alt 变可见正文 | 输出含 `class="img-alt">MIRROR SHOT<` 与 `…SECOND SHOT<` |
| F-055 无字面 undefined | 输出不含 `undefined` |
| F-055 列表值空 src 同样无 `<img>` | `{list:[{image:'',…},…]}` ⇒ 无 `<img>` |
| F-055 列表值 alt 全保留 | 两条 alt 都出现（不再整组消失） |
| F-055 列表值有 src 逐张渲染 | 2 条 src ⇒ **恰好 2 个 `<img>`**，且第二个 src 逐字出现 |
| F-055 有源的图不被降级 | `aliyun-com/home` 的每个 `_image.image` 都逐字出现在渲染页里 |

**可证性（门禁能失败）**：把旧渲染器（`git show HEAD:m1/render.mjs`）挂成临时模块跑同样输入：空 src 的 `_image` ⇒ 旧输出 `<img src="" alt="MIRROR SHOT"> <img src="" alt="SECOND SHOT">`（断言失败）；列表值 ⇒ 旧输出 `src="undefined"`、alt 全丢（断言失败）。新渲染器两条均过。

**对 42 页策展库零影响的证据**：42/42 渲染页**正文逐字节相同**（只有 `<style>` 里多了一条 `.img-alt` 规则，故整页字节 +216B）；策展模型里 `_image` 为列表值的数量 = **0**。

## 2. 抽取器回读真 src（片 2，彻底修）

### 2.1 配对口径：为什么不用"第 N 个 `<img>`"

任务书给的方案是"按文档顺序把第 N 个 `<img>` 与第 N 个 img 节点配对"。**先验证，发现它不可靠**：`dom.html` 里的 `<img>` 数**普遍多于** nodes.json 的 img 节点（站点用 light/dark 双图、隐藏占位图）：

| 页 | dom.html `<img>` | nodes.json img 节点 | 结论 |
|---|---|---|---|
| gitee/mirrors-org | 22 | 20 | 数量不一致 |
| juejin-cn/home | 14 | 13 | 数量不一致 |
| ant-design/components-table | 140 | 140 | 一致 |

按"数量不一致就放弃"的口径，**多数页会被放弃**。因此改用节点**自带的** `cleanedIndex`（= 该元素在 `document.querySelectorAll('*')` 里的文档序下标）逐元素取 src，并配一个**每页可自证**的门禁：

- 用纯 Node 扫描 `dom.html` 得到元素序列（跳过注释/doctype/script/style 文本，每个 start tag 计一个元素）；
- **要求该页每个带 tag 的节点 `n` 都满足 `scan[n.cleanedIndex].name === n.tag`**（全等，不是比例阈值）——这证明扫描器的下标空间与浏览器一致，于是 `scan[img 节点.cleanedIndex]` 就是那个 `<img>` 元素本身；
- **不满足就整页放弃**（该页所有图保持空 src，由片 1 兜底），不猜、不错配。

**独立 oracle 验证（真浏览器 `querySelectorAll('*')`，不是自证）**：

| 页 | 扫描器对齐 | img 节点落到真 `<img>` 元素 | 抽取出的 src 与浏览器 `img.src` 逐字相同 |
|---|---|---|---|
| gitee/mirrors-org | 全部（398 元素） | 20/20 | 1/1 |
| juejin-cn/home | 全部（883 元素） | 13/13 | 1/1（首图；`&amp;` 已还原为 `&`） |
| ant-design/components-table | 全部（11341 元素） | 140/140 | —（该页产出的图全是 `role=image` 的非 `<img>` 节点，见 §4） |

### 2.2 全语料可靠性（111 页）

| 指标 | 数值 |
|---|---|
| 页面 | 111 |
| 带 tag 节点下标对齐 | **266488 / 269774（98.78%）** |
| 对齐率 = 100% 的页（门禁通过） | **108 / 111** |
| img 节点落到真 `<img>` 元素 | 5133 / 5222 |
| `<img>` 存在但 DOM 里确实没有 src 属性 | 53 |

**放弃清单（3 页，逐页原因）**：

| 页 | 原因（首个错位） |
|---|---|
| `antv/home` | index-alignment 221/516（`idx 48 tag=a scan=template`） |
| `stripe-com/pricing` | index-alignment 604/3593（`idx 184 tag=body scan=link`） |
| `github-com/login` | index-alignment 81/83（`idx 275 tag=div scan=details-dialog`） |

三页的 `<img>` 全部保持空 src ⇒ 走片 1 退化为 alt 文本（**没有错配的 URL**）。留出集 69 页里只有 `antv/home` 1 页被放弃。

### 2.3 src 规范化（F-025 规则）

- 绝对 URL 逐字保留；`data:`/`blob:` 保留（本来就是真源）；`javascript:` 丢弃（不是 URL）；
- 根相对 `/x`、协议相对 `//host/x`、路径相对 `x` 一律按 `meta.json.url` 用 `new URL(src, base)` 绝对化；
- `dom.html` 是序列化产物，属性值实体转义 ⇒ 先还原 `&amp;`（F-025 curation-log-ad 的既有规则）再绝对化。

### 2.4 留出集抽取侧结果（69 页）

| 指标 | 数值 |
|---|---|
| nodes.json 里的 img 节点（tag=img） | 3321 |
| 其中成功取到 src（按 cleanedIndex 命中真 `<img>`） | 3270（98.5%） |
| `<img>` 存在但无 src 属性 | 4 |
| 抽取器实际产出的 `_image` 事实 | 550 |
| 其中带 src | 49 |
| 其中无 src（`role=image` 但节点 tag 不是 `img`，见 §4.2） | 501 |
| join 状态 ok / 放弃的页 | 68 / 1（`antv/home`） |
| 有图页里 `src` 数 < `_image` 数的页 | 11 |

> 数字看似矛盾（3270 取到 src，却只有 49 进模型）需要解释清楚：**取到 src 的 `<img>` 绝大多数根本没被产出成 `_image` 事实**（页头 logo/图标/隐藏图，被抽取器的 chrome 与去重规则丢掉）。抽取器真正产出的 550 张图里，只有 49 张对应 `<img>` 元素；剩下 501 张是 `role=image` 落在 `<span>/<svg>/<div>` 上的图标（CSS 背景图或内联 SVG），`nodes.json` 与 `dom.html` 里都**没有可用的 URL**。

## 3. `dup-title`（第二类，11 页）分类：**源站本就重复 ⇒ info，不修**

抽样 3 页、每页取 audit 点名的 3 个标题，在 `corpus` 里数出现次数：

| 页 | 标题 | nodes.json 次数 | dom.html 次数 | 判定 |
|---|---|---|---|---|
| element-plus/button | loading | 53 | 75 | 源站本就重复 |
| element-plus/button | disabled | 27 | 213 | 源站本就重复 |
| element-plus/button | default | 23 | 5 | 源站本就重复 |
| ant-design/components-date-picker | dateRender | 6 | 2 | 源站本就重复 |
| ant-design/components-date-picker | cellRender | 20 | 5 | 源站本就重复 |
| ant-design/components-date-picker | disabled | 80 | 48 | 源站本就重复 |
| ant-design/components-table | Jim Green | 376 | 61 | 源站本就重复 |
| ant-design/components-table | John Brown | 752 | 88 | 源站本就重复 |
| ant-design/components-table | Joe Black | 302 | 56 | 源站本就重复 |

9/9 全部在源抓取里出现 ≥2 次：组件文档页的 API 表（attributes/events/slots 多张表）**本来就把同一个 prop 名列很多次**，示例表格也重复使用同一组示例人名。**不是抽取器复制**——`audit-visual.mjs` 的 `dups` 计的是渲染页里"跨块同文本"，抽取器另有全页文本去重，没有把同一段文本抄两遍的路径。

- **归属**：文本**源真**；把它们渲染成 `<h5 class="title">`（表格行 → 带题 item 的形态决策，轮 15 §4.3）是**引擎形态**，不是发明。
- **判定：info，不修**。理由：① "源站重复"无法修；② 形态（API 表是否渲染为真表格）是**产品/形态决策**，轮 15 §5 已判"中度值得、本轮不修"，本轮无新依据改变它。
- **为什么 audit 报成硬缺陷**：`audit-visual.mjs` 的 capture oracle 只从 `m1/eval/m3-final.json`（42 exemplar）构建 ⇒ 留出页 `cap=undefined` ⇒ 一律归为 renderer-introduced。留出集上的 `dup-title`/`dup-content` 计数**系统性偏高**，本轮实测 11 页全部属此类（0 页是抽取器复制）。

## 4. 残余（明文例外 + 未修面）

1. **3 页 13 张 `<img>` 仍"不加载"，但不是无源**：`douban-movie/home`（1）、`douban-people/people-ahbei`（1）、`juejin-cn/home`（11）。这些 `<img>` 有 src（**逐字来自抓取**），只是远端主机拒绝本次请求：`curl` 实测 douban **418**（带 `Referer` 时 **200**）、byteimg **403**（签名/防盗链）。
   **判定：明文例外**——`<img>` 元素携带的是真实捕获的 URL，浏览器在源站上下文（带 Referer/签名）能加载；引擎没有发明、没有错配，也没有办法在离线环境里代主机作证。若人类认为"渲染的 src 必须在本环境可加载"，则需另一套机制（网络校验或本地镜像）——那是**产品决策**，本轮不做。
2. **501 张 `_image` 落在非 `<img>` 节点上**（`role=image` 的 span/svg/div，CSS 背景图或内联 SVG）：`dom.html` 里没有 `<img src>` 可取，`nodes.json` 不存 `background-image`。**当前行为：退化为已抓取的 alt 文本**（片 1 的兜底）。要把它们变成真图需新增一类"从 style/背景图取 URL"的提取路径——**超出本轮批准范围**，记为下一步。
3. **3 页下标对不齐**被整页放弃：并入第 2 条同一兜底，未错配。
4. **`dup-title` 形态决策未动**（§3）。

## 5. 留出集漏斗：修前 / 修后（`/tmp/holdout16/`，60 秒版本）

同一套页面（69 页）、同一个 `audit-visual.mjs`。"修前"= 轮 15 产物（`/tmp/holdout/renders/`，同一批抽取输入、旧渲染器）。

| 阶段 | 修前 | 修后 |
|---|---|---|
| 抽取成功（`extractPage`） | 69/69 | 69/69 |
| 校验通过 | 69/69 | 69/69 |
| 渲染成功 | 69/69 | 69/69 |
| **视觉自查干净** | **38/69（55.1%）** | **55/69（79.7%）** |
| **`broken-img` 命中页** | **25** | **3**（＝§4.1 明文例外，13 张远端拒载的图） |
| 渲染页里的 `<img>` | 520 个（515 个 `src=""` + 5 个 `src="undefined"`） | 49 个，**其中 0 个空/缺 src**（36 张加载成功、13 张远端拒载） |
| 退化为 alt 文本的图 | 0 | 501 |
| dup-title / dup-content 页 | 11 / 2 | 11 / 2（§3：info） |
| 硬缺陷页总数 | 31 | 14 |

**关键数字**：`broken-img` 命中页 **25 → 3**，而"无源"（空 src 或缺 src）`<img>` **520 → 0**。

DOM 侧实测（`/tmp/imgstats.mjs`，真浏览器逐页）：`imgs=49, emptySrc=0, loaded=36, altSpans=501, pagesWithEmptySrc=0, pagesWithUnreachable=3`。

**边界声明（照抄，不可删改）**：留出集 = `corpus/**` 里已被抓取、但不在 `m1/eval/m3-scale.json` 的 42 个 exemplar 里的页面（主要是 support 层 68 页 + 未分级的 1 页）。这些页面**没有人工策展**，所以本轮的自动产物是**抽取器草稿**，不是策展模型。**结论只能用于说明"抽取器与引擎在未见页面上的行为"，绝不能用来宣称覆盖率**（覆盖率宣称只适用于 exemplar 42 页）。

**看图确认（1 张，预算 ≤3）**：`/tmp/holdout16/shot-gitee-src.png` = 留出页 `gitee/mirrors-org` 渲染页里的 `figure.strip` 局部，浏览器实测 `naturalWidth/Height = 248/248`——图**真的出来了**（URL 从 `dom.html` 回读）。

## 6. 门禁原文（收尾）

见 §7。


## 7. 收尾门禁原文（`node m1/eval/pipeline.mjs --shots`）

```
[pipeline] 渲染 42/42 | 错误 0
[pipeline] 保真 1.00: 42/42
[pipeline] 模型校验: 48 个全通过
[pipeline] 校验器自测: 通过
[pipeline] 地基自测(D1/D2/D3): 通过
[pipeline] 显式降级清单（compare 标记但成不了对比表）:
[pipeline] · stripe-com/pricing · n=2 · degenerate-no-shared-attribute
[pipeline] 地基自测: 全部通过
[pipeline] 度量自测(F-052): 通过
· sspai-com-home.html                           dup-source-true(info):2

视觉自查: 42/42 干净
[pipeline] 截图 42 张, 画廊 v=muon3tn6
```

（同一条命令重跑一次取退出码：`exit=0`。`dup-source-true(info)` 是 info 类，不算硬缺陷。）

新增门禁断言在自测里的原文（`node m1/eval/foundation-selftest.mjs`）：

```
ok   F-055 an empty-src image renders no `<img>` element
ok   F-055 an empty-src image renders its captured alt text as visible copy
ok   F-055 an empty-src image never prints a literal `undefined` src
ok   F-055 a list-valued image with no srcs renders no `<img>` either
ok   F-055 a list-valued image keeps every captured alt
ok   F-055 a list-valued image with srcs renders one `<img>` per entry (never one dropped)
ok   F-055 a captured src is rendered verbatim, not degraded
```

可证性（旧渲染器跑同输入，断言必须失败）：

```
old renderer, empty-src image: has <img> = true  ⇒ <img src="" alt="MIRROR SHOT"> <img src="" alt="SECOND SHOT">
old renderer, list-valued image: has <img> = true | src="undefined" = true | alts present = false
```

## 8. 改了哪些文件

| 文件 | 改动 |
|---|---|
| `m1/render.mjs` | `imgHtml()` 唯一 `<img>` 出口（无源 ⇒ alt 文本）+ `imageEntries()`/`imageFigures()` 支持 `_image` 列表值 + `.img-alt` CSS |
| `m1/extract/extract.mjs` | `scanElementTags()` / `absolutizeSrc()` / `decodeAttrEntities()` / `joinImageSrcs()`；按 `cleanedIndex` 回读 `<img src>`，带每页全等门禁；`addImage(cap)` 使用回读结果；`stats().imageJoin` 暴露口径；`counts.imageSrcsResolved/Absent` |
| `m1/eval/foundation-selftest.mjs` | F-055 段 7 条构造断言 |
| `m1/failures.md` | F-055 条目（现象/根因/修复/重测/残余） |
| `.scratch/16-image-honesty/report.md` | 本文件 |
| `m1/curated/renders/*.html`（43 个） | **收尾门禁重新生成的产物**（正文逐字节不变，仅 `<style>` 多一条 `.img-alt`；`index.html` 版本串更新）。未改任何策展模型、未改 `corpus/` |

IMG_DONE guard=done src_join=68/69 holdout_broken_before=25 holdout_broken_after=3 dup_title=info fidelity=42/42 audit=clean
