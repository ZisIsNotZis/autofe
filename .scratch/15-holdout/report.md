# 轮 15：留出集泛化检验（holdout generalization audit）

> 状态：已跑完（抽取→校验→渲染→视觉自查）。最后一行 `HOLDOUT_DONE ...` 即完成标记。
> 唯一写过的仓库文件：本文件。中间物全部在 `/tmp/holdout/`。未改 `m1/`、未改 `corpus/`、未新增语法、未 git 提交。

## 0. 边界声明（原样保留，不可删改）

- **留出集 = `corpus/**` 里已被抓取、但不在 `m1/eval/m3-scale.json` 的 42 个 exemplar 里的页面**（主要是 support 层 68 页 + 未分级的 1 页：`aliyun-help/ecs-instance-families`）。
- 这些页面**没有人工策展**，所以本轮的自动产物是**抽取器草稿**，不是策展模型。**结论只能用于说明"抽取器与引擎在未见页面上的行为"，绝不能用来宣称覆盖率**（覆盖率宣称只适用于 exemplar 42 页）。

> 补充一句防止误读：下文的"干净率 / 缺陷数"都是在**未策展页面**上、由**自动抽取器草稿**渲染出来的表面质量，**不是**策展模型的质量，也**不是**覆盖率。它回答的问句只有一个："引擎在没见过的页面上会不会跑出硬伤。"

## 1. 规模

- corpus 被抓取页：**111**
- exemplar（已策展，`m3-scale.json` tier=exemplar）：**42**
- **留出集：69**（support 68 + 未分级 1 = `aliyun-help/ecs-instance-families`）

## 2. 漏斗（逐级）

| 阶段 | 数字 | 占比 | 说明 |
|---|---|---|---|
| 抓取页 | 69 | 100% | = 68 support + 1 未分级 |
| 抽取成功（`extractPage` 返回模型） | **69** | 100% | 无抛错 |
| 校验通过（`node m1/validate.mjs`） | **69** | 100% | 0 failure |
| 渲染成功（`render(model)` 出 HTML） | **69** | 100% | 无抛错，无空壳 HTML |
| 视觉自查干净（`audit-visual.mjs` 无硬缺陷） | **38** | 55.1% | 31 页至少 1 个硬缺陷 |

**校验阶段为什么 0 failure（重要，别当成"引擎很完美"）**：抽取器是"自我审查"型——它**只输出**闭语法允许的键；凡是无法表达的（未知列、代码块、多动作列表项……）一律**丢进 `stats.unmapped` 记录，绝不发明键**。因此对**自动草稿**而言，校验通过几乎是构造性成立的，它**不是**判别器。本轮真正的判别发生在**渲染之后**：内容有没有被渲染成硬伤（视觉自查）。这也意味着：**"校验 100% 通过"不能用来证明引擎在野外没有内容损失**——内容损失被记在 `stats.unmapped` 里（见第 4 节），而不是报在校验里。

## 3. 失败与缺陷分类表（含计数）

### 3.1 校验失败分类（按错误类型）

| 错误类型 | 计数 | 备注 |
|---|---|---|
| 未知保留键 / 未声明领域字段 | 0 | 抽取器不产出未声明键 |
| `_primary` 无法解析 / 指向非法目标 | 0 | 同上 |
| `_when`/condition 未解析 | 0 | 同上 |
| 非法值类型（非闭类型值） | 0 | 同上 |
| **合计** | **0 / 69** | 见上节：这是构造性结果，不是质量证据 |

### 3.2 视觉自查硬缺陷分类（`audit-visual.mjs`，按页/按次）

| 缺陷类别 | 命中页数 | 出现次数 | 归属判断 |
|---|---|---|---|
| **broken-img**（`<img>` 无可用 src） | **25** | 520 个 `<img>` | 抽取器/capture 格式（主）+ 渲染器键不一致（次） |
| ├ `src=""`（空 src） | 20 | 515 | capture `nodes.json` 的 image 节点**只有 alt、没有 src**；URL 只在 `dom.html` 里，抽取器不解析 |
| └ `src="undefined"`（字面量 "undefined"） | 5 | 5 | 渲染器 bug：`_image.list` 走图带路径时读 `.src`，而模型存的是 `.image` → 拼出 `undefined` |
| **dup-title**（同页重复标题） | 11 | 27 | 引擎/渲染形态：API 表格**每行首格被提升为 `<h5 class="title">`**；prop 名（size/type/format/value…）在 attributes/events/slots 多表里天然重复 |
| **dup-content**（跨块重复正文） | 2 | 3 | **audit 误报**：文本在源抓取里确实重复（见 §4.4），因 holdout 无 capture oracle 被归为"渲染器引入" |
| fabricated-buttons / empty-anchors / empty-text / unit-stack / form-fragmentation / img-variance / checkmarks / broken(空壳) | 0 | 0 | 未出现 |

> **audit 工具的一个盲区（必须写进结论）**：`m1/eval/audit-visual.mjs` 的 capture-oracle 只从 `m1/eval/m3-final.json`（42 exemplar）构建。留出页不在其中 → `cap` 为 undefined → 所有"重复内容/重复标题"都被归为 **renderer-introduced**。所以 holdout 上的 `dup-content` / `dup-title` 计数**偏向高估**；第 4 节对代表例做了人工回查源抓取来纠正。

**类别分布一句话**：硬缺陷几乎**单一集中在"图片没有源"**（25/69 页 = 36% 的页面会出现一个浏览器裂图标）；结构类缺陷（重复标题）次之（11 页）；其余类别全部为 0。

## 4. 代表实例（页名 + 现象 + 归属）

### 4.1 `gitee/mirrors-org` — 空 src 图片（归属：抽取器/capture 格式）
- **现象**：渲染页出现 `<img src="" alt="12 mirrors 1578989292">`，浏览器显示"裂图标 + alt 文本"（见 `/tmp/holdout/shot-gitee-empty.png`）。
- **根因（已核实）**：capture `nodes.json` 里该节点是 `{role:"image", name:"12 mirrors 1578989292", tag:"img"}`，**没有 src/url 字段**；真实 `src="https://gitee.com/uploads/avatars/...png"` 只存在于 `dom.html`（`extract.mjs` 的 `loadCapture` 仅为 `role==='link'` 从 a11y 取 url）。抽取器拿不到图片 URL → 渲染器输出空 src。
- **是否值得修**：**值得**。这是唯一系统性、跨站、高可见度的缺陷（25/69 页）。最省的做法在**渲染器**：src 为空时不要输出 `<img>`，退化为 alt 文本或省略，避免裂图标。彻底修则要抽取器按 `cleanedIndex` 回读 `dom.html` 解析 src（改动更大，建议后续轮做）。

### 4.2 `juejin-cn/home` — 字面量 `src="undefined"`（归属：引擎/渲染器 key 不一致 bug）
- **现象**：`<figure class="strip"><img src="undefined" alt=""></figure>`（见 §3.2）。
- **根因（已核实）**：草稿里是 `_image: {list:[{image:"", alt:"🚀 2026 年 8 月 …"}, …]}`；但渲染器图带路径读的是 `.src`，取到 `undefined` 后直接拼进属性，输出字符串 `"undefined"`。
- **是否值得修**：**值得且极易修**。这是纯渲染器键名不一致（应为 `.image`，并在空值时省略 img），1 行级修复；`undefined` 字符串写进 HTML 属于明确 bug。

### 4.3 `element-plus/button`（支持例）— API 表格行被提升为标题（归属：引擎/渲染形态）
- **现象**：每个 API 表格行首格渲染成 `<h5 class="title">size</h5>`/`type`/`format`…；跨 attributes/events/slots 多表后，同页出现 27 个重复标题、单页最多 3 个（`element-plus/button`、`ant-design/components-date-picker` 等 11 页）。
- **根因**：源抓取里 "type" 是 `role:"cell"`/`code`（td/code），**不是**标题；是引擎"表格行 → 带题 item"的形态决策把行标签提升成了 heading。文本本身**源真**，但"标题"这一形态是渲染引入的。
- **是否值得修**：**中度值得**。视觉上尚可读（像定义卡片），但语义上把 27 个 prop 名当标题会污染大纲、并触发重复标题自查。若后续统一"API 表用真表格渲染"，可一并解决；本轮不修。

### 4.4 `aliyun-help/ecs-instance-families`（未分级页）— 被标记重复但属**源真**（归属：audit 误报）
- **现象**：audit 标 `dup-title:1 dup-content:2`（如"弹性裸金属服务器规格族群""入门级 x86 计算规格族群"）。
- **根因（已回查）**：这些文本在源抓取 `nodes.json` 里重复出现（"弹性裸金属服务器规格族群" 9 次、"入门级 x86 计算规格族群" 2 次）——站点自身在索引/分组/小节里重复用这些标签。因 holdout 无 capture oracle，audit 一律算作"渲染器引入"。
- **是否值得修**：**不值得**。不是引擎缺陷，是自查工具缺 oracle 的误报；该页整体渲染正常（h1 + 芯片导航）。

### 4.5 引擎在野的内容损失（非硬缺陷，但记录）
抽取器把闭语法无法表达的内容记进 `stats.unmapped`（**记录而非发明**），69 页合计 12 类：

| 丢弃类别 | 次数 | 命中页 | 例 |
|---|---|---|---|
| table-column-unmapped | 2888 | 25 | 未在共享 `vocab-fields.json` 声明的表列（如 Default: true） |
| code-block | 444 | 19 | 代码示例被整块丢弃 |
| list-item-multi-action | 291 | 6 | 一个列表项带多个动作 |
| table-without-headers | 263 | 6 | 无表头表格 |
| list-item-unlabeled | 168 | 6 | — |
| combobox-select | 116 | 10 | — |
| chart-or-svg | 106 | 12 | — |
| checkbox-multi-select-as-choice-set | 29 | 8 | — |
| grid-widget / table-extra-header-rows / embedded-media / tabs | 27 / 15 / 12 / 7 | 2–6 | — |

这是"引擎在野外"的**真实内容损失面**（远大于硬缺陷面），但按本轮纪律**不做修复**、也**不折算成覆盖率**。

## 5. 值得修 vs 不值得修

- **值得（高）**：`broken-img`（25 页 / 520 img）。先做**渲染器守卫**（src 空/undefined 时不输出 `<img>` → 退化为 alt 文本）；彻底修留给抽取器回读 `dom.html`。收益最大、风险最低。
- **值得（低-中）**：`dup-title`（11 页）——决定"API 表格是否应渲染为真表格"，属形态决策，视觉危害小，可延后。
- **不值得**：`dup-content`（2 页）与 aliyun-help 的重复标题 —— 均为 audit 缺 oracle 导致的**误报**，源为真；修它们等于改错对象。
- **本轮纪律**：任何类别 >50 页时只归类+代表例+建议，不逐页修。最大类别 25 页，且本轮定位为**检验轮**——**不做修复**。

## 6. 一句话结论

在 69 个从未人工策展的抓取页上，抽取器+引擎端到端 100% 跑通（抽取/校验/渲染均 69/69），但只有 38/69（55%）渲染后无硬缺陷；**唯一系统性"在野外"的硬缺陷是图片找不到源**（25/69 页 = 36%，520 个 `<img>`），它主要源自 capture 的 `nodes.json` 不带 image src，属**抽取器/capture 格式**问题而非语法问题——即"引擎在未见页面上不崩、不发明语法，但会渲染出无源图片"。

HOLDOUT_DONE captured=69 extracted=69 validated=69 rendered=69 audit_clean=38 top_defect=broken-img
