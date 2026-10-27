[English](README.md) | **简体中文**

<img src="assets/logo.svg" alt="AutoFE" width="200" height="40">

# AutoFE

### 写业务意图，出前端形态。

**AutoFE 是一套意图驱动前端：作者只声明页面「是什么、为什么在这儿、能做什么、彼此什么关系」，由唯一一层决策代码把同一份模型渲染成 HTML、纯文本与 Markdown 三种形态——表现可以换，业务含义不用跟着改。**

![引擎渲染的 `linear-app/home`](m1/curated/assets/62-linear-demo-0.png)

<sub>一份策展模型（`m1/curated/linear-app/home.json`）经 `m1/render.mjs` 渲染，1320×720。没有站点级 CSS，也没有站点级模板——整页只由模型生成。</sub>

## 快速开始

```sh
git clone https://github.com/ZisIsNotZis/autofe.git
cd autofe
```

**零安装路线**——语法层、校验器与三个渲染器都没有依赖：

```sh
node m1/render.mjs m1/curated/gov-uk/ni-rates-letters.json /tmp/ni-rates.html
node m1/render-md.mjs m1/curated/sspai-com/post-114716.json /tmp/post.md
node m1/validate.mjs m1/curated/*/*.json
```

**全门禁路线**——流水线里的浏览器门禁（视觉自查、几何自测、意图门禁）需要 `playwright-core` 与一份无头 Chromium。两者装一次即可，此外不下载任何东西：

```sh
npm --prefix tools/capture install
node tools/capture/node_modules/playwright-core/cli.js install chromium-headless-shell
node m1/eval/pipeline.mjs          # 渲染全部策展模型并跑门禁（约 1 分钟）
```

不需要任何环境变量：所有工具都从 `tools/capture/node_modules` 解析 `playwright-core`，浏览器则由 Playwright 找它自己装好的那份。若要复用机器上已有的浏览器，改设 `AUTOFE_CHROME_PATH`（`playwright-core` 在别处再设 `AUTOFE_PLAYWRIGHT_CORE`），不必安装。`--shots` 与视觉类工具需要浏览器；上面的零安装路线不需要。

## 现在能做什么

- **一套表达页面含义的闭式语法。** 模型只允许保留键（`_intent`、`_scope`、`_subject`、`_rel`、`_when`、`_expose`、`_fields`、`_primary`、`_empty`、`_items`、`_lines`、`_action`）。未知键是硬错误而不是警告——语法没有给「顺手写样式」留逃生口。
- **一份模型，三个渲染目标。** HTML（`m1/render.mjs`）、纯文本（`m1/render-text.mjs`）与 GFM Markdown（`m1/render-md.mjs`）。三者都只 import `m1/axis.mjs` 与 `m1/model-lib.mjs`，**互不 import**；渲染器代码里模型语义 token 出现 0 次。
- **页面构图是推出来的，不是手填的。** `_scope`/`_subject` 决定页面原型（营销、目录、搜索、阅读、个人、表格、详情、认证、仪表盘）以及双区 feed+rail、瀑布流或面板区骨架；`default` 已不再是合法结果。
- **仪表盘可以声明，不必假装成图表。** 页内至少两个「名称 + 带单位读数」的统计墙 ⇒ `dashboard` 页框：两列面板区、三列统计墙（1160/852/390 下分别为 3/2/2 列），名称作为标签，数值与单位连成一个读数。Grafana Stats 页带着采集到的 33 个读数；图表/序列原语仍未声称。
- **受 schema 约束的复合元语。** `m1/composites.json` 把 `search`、`table`、`login`、`paginator`、`form` 声明为带类型槽位的闭式类型，模型声称自己是某个复合件却缺槽位时，校验会带路径报错。
- **确定性输出。** 同一模型 + 同一上下文 ⇒ 逐字节相同的 HTML。渲染器是纯函数：不用 AI、不联网、不读时钟。
- **26 道门禁，每道都有反例自测。** 事实保真（HTML 与 Markdown）、源覆盖、采集↔模型一致性、图片不放大、链接覆盖与归属、标签语言、引文、可供性、构图、页框、品味几何，以及一份「截图 ⇄ HTML」哈希清单：PNG 与它声称展示的页面不再同源时，门禁拒绝放行。
- **基于真实站点的采集管线。** `tools/capture/` 用本机 `chrome-headless-shell` 加 `playwright-core`，采集 DOM、无障碍树、JSON-LD、截图与逐元素几何；遵守 robots 判定、主机节流与产物上限，并把每一次失败如实写进 `corpus/failures.json`。
- **可看的证据。** 19 个站点、40 个策展页面及其渲染产物，以及「原站 | 渲染」并排画廊（`node m1/eval/side-by-side.mjs`）。仪表盘样例是 `grafana-play/play-home`，带 33 个采集到的「名称 / 数值 / 单位」读数。

## 工作原理

```
model.json ──► m1/model-lib.mjs ──► m1/axis.mjs ──┬─► m1/render.mjs      → HTML
 （业务         （模型语义：角色、      （唯一决策    ├─► m1/render-text.mjs → 纯文本
   意图）        路径、表达式解析）      层）        └─► m1/render-md.mjs   → Markdown
```

所有共享决策都归 `m1/axis.mjs`：形态选择、可比性、表头与行标签解析、节点渲染计划、控件可见性。渲染器只负责把同一批决策画成自己的记号（`<table>` · 对齐文本 · `| 表格 |`）。这个设计是可检验的：新增 Markdown 目标时只需写画法，仍未上移的重复推导被登记而不是藏起来（见 `docs/three-targets.md`）。

## 仓库结构

```
m1/                引擎
  axis.mjs         共享决策层（三个渲染器都 import 它）
  model-lib.mjs    模型语义：角色、路径、表达式解析
  render.mjs       HTML 目标
  render-text.mjs  纯文本目标
  render-md.mjs    Markdown 目标
  validate.mjs     闭式语法校验器（未知键 = 错误）
  composites.json  具名复合元语及其类型化槽位
  curated/         策展模型、渲染产物、素材、策展日志
  eval/            流水线、度量、26 道门禁与自测、画廊
  extract/         从采集页面派生的模型草稿
tools/capture/      无头采集管线（语料生产者）
corpus/             采集页面与持久证据（页面采集可随时再生）
docs/               产品承诺、设计基线、语法/构图/布局规格
.scratch/           每轮的推进记录与复核报告
```

## 开发

```sh
node m1/eval/pipeline.mjs                      # 渲染 + 保真 + 校验 + 全部门禁（约 1 分钟）
node m1/eval/pipeline.mjs --shots              # 追加重拍 PNG 并重建画廊（约 3 分钟）
node m1/eval/pipeline.mjs --check-shots        # 只断言 PNG 与当前 HTML 同源，不重渲染
node m1/validate.mjs m1/curated/*/*.json       # 仅校验模型
node m1/eval/side-by-side.mjs [site/page ...]  # 「原站 | 渲染」并排对照图
node m1/eval/three-target-preview.mjs          # 用真实产物重生成 docs/three-targets.md
```

需要浏览器的部分（`--shots`、`side-by-side`、视觉自查）由[快速开始](#快速开始)里的全门禁安装提供，无需环境变量。若要复用机器上别处的浏览器与 `playwright-core`，可以显式指定；所有浏览器工具都走 `m1/eval/browser.mjs` 这一个解析器：

```sh
AUTOFE_CHROME_PATH=/path/to/chrome-headless-shell \
AUTOFE_PLAYWRIGHT_CORE=/path/to/playwright-core node m1/eval/pipeline.mjs --shots
```

不会失败的门禁不算门禁：`m1/eval/` 里每一项检查都带一个喂坏样本的自测，而这些自测本身在流水线里执行。

## 贡献

见 [CONTRIBUTING.md](CONTRIBUTING.md)。本项目目前是闭式的单作者研究代码库——语法有版本、变更先登记后编码。

## 路线图

**已实现**

- 闭式语法、校验器，以及共享同一决策层的三个同构渲染目标。
- 构图推导（页面原型：营销、目录、搜索、阅读、个人、表格、详情、认证、仪表盘；feed+rail、居中阅读列、瀑布流、统计墙），以及「声明了却运行时没兑现」即失败的门禁。
- 复合元语：`search`、`table`、`login`、`paginator`、`form`，槽位受 schema 约束。
- 语料采集管线（robots、节流、失败记账）；19 个站点、40 个策展页面。
- 设计语言：中文感知字阶、band 节奏、从采集到的品牌 chrome 量出的 accent token、媒体角色尺寸、绝不放大。
- 证据门禁、画廊与并排交付物。

**计划中**

- 闭式的图表/序列原语——仪表盘的统计面板现在可以声明，但 sparkline 或序列还没有带类型数据的形态。不得用转义的 SVG 冒充。
- `_region` 作为语义声明，替代目前由结构推导的双区布局。
- 采集保真：面板正文/格式选项、节点记录图片 `src`/`alt`、折叠面板逐元素采集、节点文本 1000 字符上限。
- 数值显示精度（F-101：`85.0` 因 `num` 没有词法形态而渲染成 `85`）作为闭式的呈现字段，若用户需要。
- M5 品牌层：货币字形、字阶与圆角 token。

方向是让后端永远不必描述像素：随着原语词表变厚，真实页面里越来越多东西可以声明为意图，而引擎始终保留「同一份含义换设备、换品牌、换语言再渲染一次」的自由。

> 状态如实说明：当前 HEAD 是 40 页策展画廊（含仪表盘样例）；`node m1/eval/pipeline.mjs` 渲染 40/40，HTML 与 Markdown 保真 1.00，全部门禁通过。早前修订版的数字与报告都是快照——请重跑流水线，不要相信文档里引用的数字。已知缺口见 `docs/9_IMPLEMENTATION.md` §4、`docs/m1/composition.md` §8 与 `m1/failures.md`（F-101 尾零精度、F-102 未采集的面板选项）。

## 许可证

[GNU Affero 通用公共许可证 v3.0](LICENSE.md) © ZisIsNotZis。
