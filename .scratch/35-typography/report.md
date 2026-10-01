# 轮 35 · 终审 hard major 修复（唯一写入者，40 分钟硬限）

只碰 `m1/render.mjs`、`m1/axis.mjs`、`m1/curated/**`、`docs/m1/layout-axes.md`、`m1/failures.md`、`.scratch/**`。未改 `corpus/`。未新增保留键/语法。
本探针：`.scratch/35-typography/box.mjs`（selector 包围盒 + 计算字号/字重）。

## 1. 36kr-com/home + information-technology

### 1a. 元数据层级塌 —— **fixed**
量测（`node .scratch/35-typography/box.mjs m1/curated/renders/36kr-com-home.html '.cards .item .fact'`）：
摘要 `从第一天就写好的商业化故事。` 与元数据 `来自主题：关于消费的一切|贺哲馨 · 31分钟前` **同为 16px / 400** ⇒ 两条同级、`|` 硬串成一句。

修：模型侧把每个 feed 条目的 `_detail`（一条拼串）拆成角色事实 `_source`（主题，保留源站前缀）/ `_author` / `_datetime`；
引擎侧把 `_datetime` 并入 `META_KEYS`（`m1/axis.mjs`），于是它们走既有的 `.meta` 分组（`font-size:.9em;color:#5b6a78`，分隔用 `<span class="sep">·</span>`）。
- 改动量：home 36 条、IT 30 条 feed 条目。
- 现状（greps）：`<div class="meta">来自主题：关于消费的一切<span class="sep">·</span>贺哲馨<span class="sep">·</span>31分钟前</div>` —— 更小更浅、中点分隔、与正文摘要不同级。
- 顺带：`36kr search-ai/search-viz` 的 `_datetime`（20+20 条）也进 `.meta`（此前与摘要同级）。

### 1b. `推荐直播` 区几乎空 —— **documented（源站就只有 1 条）**
核实命令与输出：
```
$ python3 -c "import json;ns=json.load(open('corpus/36kr-com/home/nodes.json'));[print(n.get('role'),repr(str(n.get('text') or n.get('name'))[:80])) for n in ns if '推荐直播' in str(n.get('text') or n.get('name') or '')]"
generic '推荐直播 正在直播 AWE2027全域升维战略发布会'
generic '推荐直播'
```
源站 `推荐直播` 区**只有 1 条**（`正在直播 AWE2027全域升维战略发布会`，`live/detail/3933303354408320`，dom 中出现 2 次 = 标题+链接）。
模型 1 条、渲染 1 条 ⇒ **不是渲染丢条目、不是模型缺条目**。测量该区仅 134px 高（`.g-live`，box.mjs）。
故**保留**（隐藏会丢掉真实的 `_name` 事实，破坏保真）。"一行裸文本 `正在直播`"是源站自己的状态文案，模型以条目副标题收录，保留。
（源站该区本身无封面/多条目 ⇒ 「几乎空」是源站形态，非本渲染缺陷。）

### 1c. `24小时热榜` 无序号、两条无时间 —— **fixed**
- 序号：给 `home.hot` 加既有的 `_rel.order`（取 `"sequence"`，axioms §4：`sequence` ⇒ **编号**；`time` ⇒ 时间轴导轨，见 linear-app changelog，不该编号）。
  引擎侧：`renderDeflist(items, chain, ctx, order)` 在 `order==="sequence"` 时输出 `.deflist.ranked` + 每行 `<span class="rank">N</span>`（`renderForm` 把 `order` 透传）。
  现状：`<div class="deflist ranked"><div class="defrow"><span class="rank">1</span>…`（1..8）。
- 两条无时间：核实源站。
```
$ python3 -c "import json;ns=json.load(open('corpus/36kr-com/home/nodes.json'));[print(n.get('role'),repr(str(n.get('text'))[:90])) for n in ns if '8点1氪丨宇树' in str(n.get('text') or '') or 'Gemini 4 Pro偷跑' in str(n.get('text') or '')][:8]"
generic '8点1氪丨宇树科技市值重回2000亿；…'      # 无「…分钟前/小时前」
link    '8点1氪丨宇树科技市值重回2000亿；…'
paragraph '8点1氪丨…'
generic '刚刚，Gemini 4 Pro偷跑上线，碾压Astra和Fable'
…
```
对照其余条目：`奥特曼自曝… 13小时前`（文本里带时间）。**前两条源站无时间** ⇒ 不补（如实）。

## 2. aws-amazon/ec2-on-demand —— **分组标题 fixed / h2 复读 fixed / H1 documented**

### 2a. 分组标题渲染成"右格为空"的数据行 —— **fixed**
源站表格段首两行（`数据自互联网传入 Amazon EC2`、`数据自 Amazon EC2 传出至互联网`）第二格为空（模型 `_intent` 记为「源站自己的分组行」）。
`renderRun` 新增：**一行的唯一取值是首个（身份）列** ⇒ 它是源站的**行内分组标题**，渲染为 `<tr class="row-group"><th colspan="N">…</th></tr>`（跨列小节标题），不再画成带空价格格的数据行。
现状：`<tr class="row-group"><th colspan="2">数据自互联网传入 Amazon EC2</th></tr>`。

### 2b. 第二张表 h2 与表头复读同一句 —— **fixed**
核实：源站该表**没有 h2**，只有列头 `数据自 Amazon EC2 传出至`。
```
$ python3 -c "import json;ns=json.load(open('corpus/aws-amazon/ec2-on-demand/nodes.json'));[print(i,n.get('role'),repr(str(n.get('text') or n.get('name'))[:60])) for i,n in enumerate(ns) if n.get('role') in ('heading','columnheader')][:8]"
1225 heading 'Amazon EC2 按需定价'
1236 heading '按需定价'
1257 heading '数据传输'
1292 columnheader ''
1293 columnheader '定价'
1332 columnheader '数据自 Amazon EC2 传出至'
```
⇒ `region-egress._title` 是策展把**列头**抄成了小节标题（重复）。删除该 `_title`（源站无此标题）；列头（源站有）保留。
现状：`<section class="group g-region-egress"><article …><table …><thead><tr><th>数据自 Amazon EC2 传出至</th>…`（无重复 h2）。

### 2c. H1「按需定价」全页只有流量费 —— **documented（源站 H1 确为「Amazon EC2 按需定价」）**
```
$ grep -o '<h1[^>]*>[^<]*' corpus/aws-amazon/ec2-on-demand/dom.html | head
<h1 …>Amazon EC2 按需定价
```
H1 取自源站 `<h1>`（节点头 1225「Amazon EC2 按需定价」、1236「按需定价」）。**保留**。
捕获只含流量费小节（数据传输 / 区域内传输），是同页其它定价小节（EBS / 弹性 IP…）未入捕获的**覆盖缺口**，与本轮 H1 文本无关。

## 3. gov-uk/ni-rates-letters —— **partial**
- **正文行宽过宽 —— fixed**：连续正文（`.fact`、`.prose`）加最大测度 **≤74ch**（`m1/render.mjs` CSS：`.fact{margin:3px 0;max-width:74ch}`；`.hero .fact`/`.cards .fact`/`.cmp-table .fact`/`.defval .fact` 重置 `none`，不裁 hero 图与卡片）。
  证据：截图中 `Employers pay Class 1A…` 一行原本铺满 ~1060px，现在收在 74ch。（看图 1 张，预算 ≤6。）
- **正文链接 vs 动作控件 —— documented（规则落盘，正文链接未见违规）**：把区分写进 `docs/m1/layout-axes.md` §9：
  正文链接（句子的一部分）必须**行内**（同基线、颜色/下划线区分），只有真正的动作控件（提交/购买/翻页/跳转）才用 `.ctl`/`.action`。
  本页唯一按钮化的链接是**分页跳转控件**（`Next` / `Category letters`，源站 `<nav aria-label="Pagination">`，真目标地址），属「动作控件」；正文里的行内引用（如 `category letter`）在源站是链接，但模型把正文建模为纯文本（未保留行内链接），属**抽取缺口**（改 `extract/` 或 `corpus/`，均不在本轮允许文件内）⇒ 如实记 partial。

## 4. taobao-com/home —— **fixed（渲染侧）**
首屏「大目录」= 一长串短标签**链接菜单**（推荐词/类目）被渲染成一排排 `.ctl` 胶囊（62 个）。
修（渲染侧）：
- `axis.selectForm`：全是纯标签的集合中，**≥8 条且每条都带 `_action`** 的**链接菜单**走 `list`（而不是 `controls` 控件条）。
- `render.renderList`：短标签（≤12 字）按条数分栏 `cols2/cols3/cols4`（≥24 条 4 栏、≥12 条 3 栏、>4 条 2 栏）。
现状：`class="ctl"` 62 → **6**；出现 3 处 `linklist cols*`（紧凑分栏）。
源站结构：本模型 `_lines` 顺序按捕获顺序（搜索 → 推荐词 → 促销入口区块），促销/入口块保留胶囊；类目/推荐词改为紧凑分栏 ⇒ 不再是首屏铺满的 sitemap。
（看图未做，用 greps + 保真 1.00 判定。）

## 5. 收尾：`node m1/eval/pipeline.mjs --shots`
```
[pipeline] 渲染 42/42 | 错误 0
[pipeline] 保真 1.00: 42/42
[pipeline] Markdown 目标: 渲染 42/42 | 保真 1.00: 42/42
[pipeline] 模型校验: 48 个全通过
[pipeline] 校验器自测 / 地基自测(D1/D2/D3) / 度量自测(F-052) / 文本目标自测 / 轴一致性自测 / Markdown 目标自测 / 证据门禁自测 —— 全通过
视觉自查: 42/42 干净
[pipeline] 截图 42 张 … 证据一致性（PNG ⇄ HTML）: 通过（42 页与截图同源, 画廊 v=mup200ag）
```

### 逐条结论
- `kr_meta=fixed`（`.meta` 14.4px/更浅，中点分隔；摘要仍 16px）
- `kr_live=documented`（源站 1 条，无丢失；保留真实内容）
- `kr_hotlist=fixed`（序号 1..8；两条无时间：源站确实无）
- `aws_groups=fixed`（`row-group` 跨列小节标题；删重复 h2；H1 源站即「Amazon EC2 按需定价」保留）
- `govuk=partial`（行宽 1060→677px=74ch ✓；正文链接/动作控件规则入 `layout-axes.md` §9；行内链接未建模属抽取缺口）
- `taobao=fixed`（`.ctl` 62→6；长链接菜单分栏 cols2/3）

