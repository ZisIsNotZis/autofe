# 修复报告（第 4 轮）

输入：独立验收 `.scratch/06-visual-review/verification.md`（FAIL，0 blocker / 5 major / 7 minor）。
本轮唯一写入者；不改 `corpus/`；不转写截图文字；不引入 HTML/CSS 逃生口；不 git 提交。

## 计划（分片，先写报告再改代码）

1. **major① 单位叠加**（我们引入的回归）：`m1/render.mjs` `ROLE_UNIT`/`roleFact` 对已带 `unit` 的事实不再追加角色单位。
2. **major② airbnb 图墙第 5 张烘进源站按钮**：重裁 `assets/airbnb-room-photo-5.png` 避开按钮像素，并 read 确认。
3. **major③ linear 同名 H2 两次**：先判定是模型重复（`proof._title` 与 `customers._title` 同字），模型侧改为源站该图区的标签。
4. **major④ airbnb `_count` 无单位**：回查 corpus，无单位文案 ⇒ 保留数字 + 采集待办（禁止推定）。
5. **major⑤ bilibili 搜索框无标签 + aria 内部键**：抓取里有源站占位文案（`placeholder="磊哥游戏"`）⇒ 模型补 `_label`（同时消掉 aria 里的内部键）。
6. **新增两条自查**：①单位叠加/连续单位；②同页同名标题重复（硬告警）。
7. 收尾门禁：`node m1/eval/pipeline.mjs` → 保真 36/36 + 视觉自查 36/36 干净；模型改动过 `m1/validate.mjs`。

## 分片记录

（每片完成后追加）

### 分片 1 — major① 单位叠加（渲染器回归）
- `m1/render.mjs`：`ROLE_UNIT` 只是兜底。新增 `hasOwnUnit(v)`（`num` 事实自带 `unit`）；`roleFact` 只在**事实没有自带 unit** 时追加角色单位。规则：**自带 unit 绝不追加；任何情况下不得两个单位连排**。
- 顺带（同族）：text `_expose` 无 `_label` 时**不再**把内部键写进 `aria-label`（原为 `esc(lbl || exp.name)`）。
- 验证：`grep -oh '[0-9][0-9.]* [^<]*好评...' renders/*.html` 现全部为单单位（`870 人好评`、`10.2 万人好评`…）；`grep '人好评 条评价'` 0 命中。

### 分片 2 — major② airbnb 图墙第 5 张
- **我 read 了** `assets/airbnb-room-photo-5.png`：确认里面烘进了源站「显示所有照片」白色胶囊按钮（栅格图标 + 文案）。
- 定位：按钮像素在 `full.png` 的 y≈500–528（源：`nodes.json` button bbox 124×32）；该缩略图实际内容止于 y≈553。
- 重裁 `+1000+317 272x178`（按钮以上净区）→ **再 read 成品**：对比图清晰、只有浴室实景（镜/卫生纸架/兰花画），**无任何内置 UI 元素**；宽度 272 与其余缩略图同级。
- **另 4 张我也 read 过**：photo-1 卧室（净）、photo-2 街景（净）、photo-3（净）、photo-4 街景（净）——均无源站覆盖层。/tmp/p5_full.png（含按钮）与 /tmp/p5new.png（净）为对照证据。
- 仅换像素，无模型改动（文件名不变）。

### 分片 3 — major③ linear 同名 H2
- 判定：**模型重复**，非渲染重复。`corpus/linear-app/home/dom.html` 里「Powering the companies building the future」只出现 1 次（在 logo 墙前的一段 `<p>`）；模型把它同时用作 `proof._title` 与 `customers._title`。
- 修法（模型侧，最小）：`proof._title` 改为源站该图区自身标签 **`Purpose-built`**（源 `<span>Purpose-built</span>` + 引语，正是 `proof._summary` 的出处）；`customers` 保留源站文案。
- 验证：`grep '<h2 class="title">' renders/linear-app-home.html` → `Purpose-built` / `Changelog` / `Powering the companies building the future`，无重复。

### 分片 4 — major⑤ bilibili 搜索框
- 回查 `corpus/bilibili-com/home/dom.html`：`<input class="nav-search-input" ... placeholder="磊哥游戏" title="磊哥游戏">`。抓取里**有**源站占位文案（模型 `_intent` 已说明它是轮播热搜提示），全站无「搜索」固定文案。
- 按父代理指令：模型 `search._label = {text:"磊哥游戏"}`（与 36kr「请输入关键词」/huawei「请输入关键字」同型：源站占位文案 → `_label`）；渲染后 `aria-label="磊哥游戏"`，**内部键 `query` 不再上 aria**。
- 残留：`磊哥游戏` 是抓取时刻的轮播热搜词，被固化为静态标签，语义上不等同源站的动态提示（见"需要人类决策"）。

### 分片 5 — 新增两条自查（`m1/eval/audit-visual.mjs`）
- ① `unit-stack`：数字后紧跟**两个相邻单位 token**（单位词表含 `条评价/人好评/分/万/项/…`）→ 硬告警；命中文本一并打印。
- ② `dup-title`：同页 H1–H5 同名（≥6 字）；抓取里不重复即硬告警，重复则记 `dup-title-source-true(info)`。
- 灵敏度自测：临时页 `/tmp/t-dupe.html`（同名 H2 ×2 + `870 人好评 条评价`）→ `⚠ unit-stack:1 dup-title:1`（0/1 干净）。
- 全库复跑：36/36 干净；`dup-title` 只出 info（apple/huawei 源站确有的重复标题），linear 已无命中。

### 收尾门禁（原文）
（见下）
```
### node m1/validate.mjs m1/curated/linear-app/home.json m1/curated/bilibili-com/home.json
ok   m1/curated/linear-app/home.json
ok   m1/curated/bilibili-com/home.json

### node m1/eval/pipeline.mjs   (exit=0)
[pipeline] 渲染 36/36 | 错误 0
[pipeline] 保真 1.00: 36/36
· huawei-cn-consumer-phones.html                dup-source-true(info):1
· sspai-com-home.html                           dup-source-true(info):2

视觉自查: 36/36 干净

### node m1/eval/audit-visual.mjs --all  (新增检查已在库上生效)
（仅 info 级：apple-com-cn-iphone-17 / apple-com-ipad-air / huawei-cn-consumer-phones / huawei-cn-search-phone 的 dup-title-source-true(info):1）
视觉自查: 36/36 干净
```

## 已修（本轮）
1. major① 单位叠加 — `m1/render.mjs`（`hasOwnUnit` + `roleFact`）；全库无「两个单位连排」。
2. major② airbnb 第 5 张图 — 重裁 `assets/airbnb-room-photo-5.png`（272×178），read 确认无内置 UI。
3. major③ linear 同名 H2 — 模型 `proof._title` → 源站标签 `Purpose-built`。
4. major⑤ bilibili 搜索框 — 模型补 `_label`（源站占位文案），aria 不再放内部键；同轮修掉渲染器把 expose name 写进 aria 的通用缺陷。
5. 新增两条自查（`unit-stack` / `dup-title`），含灵敏度自测；全库 36/36 干净。
6. `m1/failures.md` 新增 F-037（单位叠加）、F-038（同页同名标题）、F-039（资产烘进源站 UI）。

## 未修与原因
- **major④ airbnb `_count` 无单位（地段 616…）**：回查 `corpus/airbnb-com/room-28871/nodes.json|dom.html`，源站该区就是 `客人评价提到 地段 616 待客之道 582 …`，**抓取里没有任何单位文案**（无「条评价」）。按"禁止推定"，**保留数字**，记入采集待办。该区在源站是 `role=group aria-label="客人评价提到"` 的计数按钮组，数字语义（提及次数）需要源站或采集给单位。
- **minor（本轮未办，预算）**：36kr `search-ai/search-viz/home` 的 SEO 串 H1；mi15 底部 assurance chip 连排。见 verification.md minors 列表，均未新增/未恶化。
- 其余 verification.md minors（bilibili 卡标题链接样式、横幅非满幅、taobao 猜你喜欢单列、iphone-17 表内重复行标签、`_count` 角色标签）为 pre-existing / capture 侧，未在本轮范围内。

## 采集待办
- airbnb `room-28871`「客人评价提到」计数缺单位：截图/抓取时该区应有「…条（评价/提及）」类文案，或需从源站文本节点取。
- airbnb 图墙：第 5 张缩略图被源站「显示所有照片」按钮**压盖**在像素里（本轮只能裁按钮以上净区）；缩略图原生仅 273px，满幅约 4× 上采样，清晰度受采集分辨率限制（capture 侧）。
- bilibili home 搜索框：源站只有轮播热搜提示（无固定标签）；本轮把抓取时刻的提示文案固化为 `_label`（见"需要人类决策"）。
- bilibili/tokyo 等懒加载图片仍未入库（沿用既有 T-109 记录）。

## 需要人类决策
1. **搜索框"动态占位"的表达**：bilibili home 搜索框源站无固定标签、只有轮播热搜提示（`placeholder="磊哥游戏"`）。本轮按父代理指令把抓取文案用作 `_label`（可见标签 + aria），但这把"动态提示"固化成"静态标签"，语义不完全等价。是否引入一个受控的 `placeholder`/`_hint` 字段（**词汇/契约变更**）来表达"框内灰字"？未擅自新增。
2. **动态/随机内容的采集语义**（沿用既有）：本轮只处理了搜索框一处；如要通用解决需定义"采集时刻值 vs 场值"的表达约定。

## 需要复核/残留
- 本轮 ARIA 通用修正会改变所有**无 `_label`** 的 text `_expose` 输入（如 taobao `query`、36kr `channels`、aliyun `product-tab`）：不再输出 `aria-label`。taobao/其余页面渲染因此有改动（`autoHigh` 之间无影响，保真 36/36）。若期望"无标签也要可访问名"，需要一个受控来源而不是内部键。
- 工作区现状：`git status` 另含**非本轮改动** `docs/m1/m4-composites-proposal.md`（并行的 M4 提案写入者，本会话开始时该文件干净）。我未触碰它，也未 git 提交。
- 新自查对"源站确有的重复标题"只记 info（apple/huawei），不会误伤；对"源站没有的重复"是硬告警（已用 `/tmp/t-dupe.html` 验证灵敏度）。

FIX4_DONE fixed=5 audit_new_checks=2 deferred=3 fidelity=36/36 audit=clean
