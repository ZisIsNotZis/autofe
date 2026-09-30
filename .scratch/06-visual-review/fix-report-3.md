# 修复报告 3（模型/采集侧 + 剩余 major）

范围：`rounds.md` 轮 3 优先序 + 父代理裁定（fix-2 三条待决项）。唯一写入者：本 worker。
基线：`41ebd1c`（fix-2 已接受）。硬限 40 分钟；每片先落盘本报告再继续。

## 分片进展（每片一行）

- **分片 0（侦察，只读）**：R3 根因确认——`corpus/bilibili-com/home/nodes.json` 中真正的轮播横幅 img 为 `{x:60, y:265, w:516, h:290.25}`（导航条 img 在 y=0..158）；`m1/curated/assets/bilibili-banner.png` 现为 1440x158（导航条带，错）。且 checkpoint `77cf57a` 已把 `banner._image` 从模型移除（`git show 77cf57a -- m1/curated/bilibili-com/home.json`：-4 行），故当前 render 的 `g-banner` 是 `<div class="promo"><span class="promo-label">第五人格亲密之月</span></div>`（无图）。
- **分片 1（R3）**：重裁 + 恢复引用。`convert corpus/bilibili-com/home/full.png -crop 516x290+60+265 +repage m1/curated/assets/bilibili-banner.png`（旧资产 1440x158 导航条 → 新 516x290 活动主视觉）；`m1/curated/bilibili-com/home.json` 的 `banner` 节点恢复 `_image{image:"../assets/bilibili-banner.png", alt:""}`（checkpoint 77cf57a 曾移除）。`node m1/validate.mjs` → ok。→ 门禁绿。
- **分片 2（airbnb 图墙，走"裁图墙"方案 a）**：`corpus/airbnb-com/room-28871/nodes.json` 的 gallery img bbox：大图 `(152,174,560,476)` + 四缩略图 `(720,174,272,238)/(1000,174,272,238)/(720,420,272,230)/(1000,420,272,230)`；按此从 `full.png` 裁出 `m1/curated/assets/airbnb-room-photo-1..5.png`，模型 `gallery._items` 由 5 条 `_name`（alt 串）改为 5 条 image-only 项（`_image{image,alt:""}`）→ 渲染器 `selectForm` 判为 `image-strip` → 5 张等宽满幅图（`width:100%`），alt 空；不再输出夹生英文行，「显示所有照片」控件保留且只出现 1 次（`grep -c`=1）。`node m1/validate.mjs` → ok；`--only airbnb-com/room-28871 --shots` → 保真 1/1 + 自查干净。**已知限制**：四张缩略图原生仅 273px，满幅渲染约 3.8x 上采样，清晰度受采集分辨率限制（非本方案可解，属 capture 侧）。
- **分片 3（R7f 区域分隔 + `key:` 锚点）**：
  - R7f：`m1/render.mjs` 的 `for (const c of kids)` 兄弟区块分支新增：当前兄弟无 `_title/_name/_text` 且前一个兄弟有标题 ⇒ 先输出 `<hr class="region">`。**只作用于命名子块**（`_items[` 分支原样）。影响面经全库 diff 核实 = 11 页共 13 处新增 hr（aliyun-home 3、iphone-16 2、macbook-air +1、ipad-air/iphone-16 等各 1…）；未涉及页面 0 变化（`git diff --name-only` 只列出下方 12 个文件）。
  - `key:` 动作地址降为 `#锚点`（父代理裁定 5）：新增 `hrefOf()`，替换 `itemExtra`/`renderControls`/`actionHtml`/toolbar/`linkTo` 五处 `esc(a.to)`。核实：`huawei-cn-consumer-phones` 5 处、`airbnb room-28871` 1 处 `href="key:…"` → `href="#…"`；全库 `grep -rl 'href="key:'` = 0。
  - 门禁：`node m1/eval/pipeline.mjs` → 保真 36/36 + 视觉自查 36/36 干净。
- **分片 4（R6 淘宝会场）**：**先查后判**。`corpus/taobao-com/home/nodes.json` 四会场的**标题文案在抓取里**（`百亿补贴 · 买贵必赔` / `领券中心` / `国家补贴` / `淘宝秒杀`，bbox 明确）且当前 render 已把它们渲染成 h3 链接；但**每个会场内的商品成员只有价格文本**（`a{bbox 744,277,104,100} text="¥14999"`），其商品图 `img` 是 0 字符 alt/name，商品名在像素里。⇒ 无可用的商品名文案，**不发明文案**，保留现状并记 F-036 + 采集待办。
- **分片 5（36kr 资讯页 H1）**：查 `corpus/36kr-com/information-technology/nodes.json` 得该页**没有任何 h1/h2/h3 节点**（home 亦然）⇒ 模型的 `_title` 实为文档 `<title>` 的 SEO 串（`科技频道_前沿科技_…_36氪`）。模型侧改为该页自身的频道名 `科技频道`（源站自己的词，非新造）。`node m1/validate.mjs` → ok；`--only` → 保真 1/1 + 自查干净。（home/search-ai/search-viz 三页同族，但 findings 仅点名"资讯页"，本轮未动，列入观察。）
- **分片 6（ipad-air 行内混排）**：**试改后回退**。按"实体与属性分层"把 `_lines[5]._items` 拆成「11″/13″ 两个实体」+「无标题的显示特性组（True Tone/P3 wide color/Full lamination）」，模型校验通过，但渲染暴露次生问题：只有标题没有事实的成员（`13” model`、`P3 wide color`）落进 `bareTitle → <div class="promo">`，变成一排浅灰 promo 横幅，比原来的 chips 行更差。要干净落地需要一条渲染器规则（"无标题组内的纯标题成员如何呈现"），属设计裁定 ⇒ 回退，列入"需要人类决策"。
- **分片 7（收尾门禁 + 截图）**：见下。

## 已修（逐条：findings 来源 → 改动 → 验证）

### R3 B 站首页横幅裁错【findings-1 blocker】— 已修
- 取证：`corpus/bilibili-com/home/nodes.json` 的 img bbox 有两组——导航条在 `y=0..158`（`{0,0,1440,155}` 与一串 `{−124.75,−1.69,1689.5,158.39}`），轮播横幅在 `{x:60,y:265,w:516,h:290.25}`（name=`第五人格亲密之月`），另 4 个同尺寸轮播帧在 x=576/1092/… 说明归属。
- 改动：`convert corpus/bilibili-com/home/full.png -crop 516x290+60+265` 覆盖 `m1/curated/assets/bilibili-banner.png`（旧资产 1440×158 = 导航条）；`home.json` 的 `banner` 恢复 `_image{image:"../assets/bilibili-banner.png", alt:""}`（checkpoint 77cf57a 移除过）。
- 验证：**本人 read 新资产与重出截图** → 画面是粉色活动主视觉「第五人格亲密之月」，**不是**导航条（`/tmp/r3/render-banner.png`：h2「第五人格亲密之月」下方是活动图，非「首页/番剧/直播…搜索/登录」）。渲染形态由 `promo` 变为「h2 标题 + 满幅活动图」。

### R6 淘宝会场空卡片【findings-4 blocker】— 判定为采集缺口，未改代码
- 见"分片 4"：标题有（已渲染），商品名/图无（`img` 空 alt、名字在像素里）。不发明文案。记 `m1/failures.md` F-036 + 采集待办。

### airbnb 图墙 alt 串【findings-1 major】— 已修（方案 a：裁图墙）
- 见"分片 2"。alt 串行消失；5 张等宽满幅图（`width:100%`，alt 空）替代；「显示所有照片」控件保留 1 次。

### R7f 兄弟区块的区域分隔【findings-1 major】— 已修
- 见"分片 3"。11 页 13 处新增 `hr.region`；未涉及页面经全库 diff 确认 0 变化（用 `git diff --name-only m1/curated/renders/` 只列出受影响 12 个 html+png）。

### `key:` 动作地址降为页内锚点【父代理裁定 5】— 已修
- 见"分片 3"。`href="key:…"` 全库 0 处（huawei-consumer-phones 5 处、airbnb 1 处 → `#锚点`）。

### 36kr 资讯页 H1 SEO 串【findings-2 minor】— 已修
- 见"分片 5"。

## 未修与原因（含层级与证据）

1. **ipad-air 行内实体+属性混排【findings-2 major】— 回退/未修**。实体与属性分层后的渲染次生问题（纯标题成员→promo 横幅）需要新的呈现规则；这不是模型单边可解。证据：试改版渲染 `/tmp/r3/ipad.html`（`13” model` 与 `P3 wide color` 均成 `<div class="promo">`）。已 `git checkout` 回退模型。
2. **R7e 日期本地化 / `_count` 单位**：沿用 fix-2 的"需要人类决策"（页面语言信号 / 单位表），本轮未动。
3. **对比表格子里的带 label 动作、`renderControls` 双胶囊观感**：fix-2 已裁定维持现状，本轮未动。
4. **grafana 面板体**：采集缺口（F-035），非本轮范围。

## 采集待办（capture，附证据）

- **taobao-com/home 四会场商品名/图缺失**（F-036）：`百亿补贴/领券中心/国家补贴/淘宝秒杀` 的成员仅有 `¥` 价格文本，`img` 为空 alt、商品名在图内 → 需要补商品名（或可读 alt），否则价格卡语义不完整。
- **airbnb-com/room-28871 缩略图分辨率**：4 张缩略图仅 273px 原生长边，满幅渲染需约 3.8x 上采样（本轮按任务裁图墙方案的已知限制）。
- grafana-play/play-home 面板体为源站加载态（F-035，沿用）。
- mi-com/home 懒加载空白图带、mi/apple/bilibili/sspai 零图（T-109，沿用）。

## 需要人类决策

1. **无标题组内"纯标题成员"的呈现**（ipad-air 根因）：一个没有事实、没有动作、只有名字的成员，在它所属组**无标题**（不与组标题同形）时，应渲染为内容行还是 promo？现规则（`bareTitle → promo`）把它变成浅灰横幅。修它需要一条新呈现规则（属产物观感/契约），本轮不静默决定。
2. **36kr 其余页面的 H1 策略**：home（`36氪_让一部分人先看到未来`）与 search-ai/search-viz（`人工智能相关文章_36氪` 等）同样以文档 `<title>` 作根 `_title`。findings 只点名资讯页（已修）；其余是否统一去 SEO 化、以及人读标题的取词规则，建议一次裁定。
3. **`_count`/单位表**（沿用 fix-2 第 2 条）：是否把"角色 → 单位"移入 `m1/vocab-units.json` 并由校验器硬校验（父代理裁定 1，本轮预算内未做）。

## 门禁结果（pipeline 最后输出原文）

命令：`node m1/eval/pipeline.mjs --shots`（exit=0）
```
[pipeline] 渲染 36/36 | 错误 0
[pipeline] 保真 1.00: 36/36
· huawei-cn-consumer-phones.html                dup-source-true(info):1
· sspai-com-home.html                           dup-source-true(info):2

视觉自查: 36/36 干净
[pipeline] 截图 36 张, 画廊 v=muob0utc
```
模型校验：`node m1/validate.mjs m1/curated/bilibili-com/home.json`、`.../airbnb-com/room-28871.json`、`.../36kr-com/information-technology.json` 均 `ok`。`ipad-air.json` 回退后 `ok`。

## 改动文件

- `m1/render.mjs`：兄弟区块 `hr.region`（R7f）；`hrefOf()` + 5 处 `href` 接入（`key:` → `#锚点`）。
- `m1/curated/bilibili-com/home.json`：恢复 `banner._image`。
- `m1/curated/airbnb-com/room-28871.json`：`gallery._items` 5 条 alt → 5 条 image-only。
- `m1/curated/36kr-com/information-technology.json`：`_title` SEO 串 → `科技频道`。
- `m1/curated/assets/bilibili-banner.png`（重裁，516×290）、`m1/curated/assets/airbnb-room-photo-1..5.png`（新增）。
- `m1/failures.md`：F-036。
- 产物：`m1/curated/renders/*.html|*.png`、`m1/eval/m3-final.json`、画廊 `index.html`（由 pipeline 生成）。未 git 提交（按纪律，父代理统一提交）。

FIX3_DONE fixed=4 deferred=3 capture_todos=4 decisions=3 fidelity=36/36 audit=clean
