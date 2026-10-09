# 轮 58 · 页面栅格 + 区域钉扎 + 图片策略 + 列数 — 实施报告

> SSOT：`.scratch/54-user-review/findings.md` 轮 58 段（U-18…U-27 + L-1…L-6，状态已回填）。
> 验收口径：**用户亲眼认可那 7 页**（mi15、sspai-114716、airbnb-room、apple-home、taobao-home、ipad-air、bilibili-home）。
> 证据：`before/*.png` + `after/*.png`（整页 full-page，从 git HEAD 恢复 before、重拍 after）+ `*.sheet.png`（100% 高度分段拼图）。

## 0. 纪律与限额
- **只改**：`m1/render.mjs`、`m1/render-text.mjs`、`m1/render-md.mjs`、`m1/axis.mjs`、`m1/eval/{pipeline.mjs, layout-selftest.mjs(新), affordance-selftest.mjs(两条正则放宽)}`、`m1/curated/renders/**`（重生成）、`.scratch/**`。**模型零改动**（区域/列数/宽度/图带模式全部是 nodePlan/轴层声明，未新增保留键，未 git 提交）。
- 看图 15 张（7 before 拼图 + 7 after 拼图 + 1 诊断用途抵扣为像素测量）；每页覆盖 100% 高度。
- **超时声明**：两处返工（h1 居中失效、`.block>.node` 层叠压制）导致超出 90 分钟约 15 分钟；所有返工都已闭环验证。

## 1. Before 整页目检（逐页，含用户未点名缺陷）
| 页 | 发现（除 U-18…27 外的补充） |
|---|---|
| mi15 | spec 事实列窄列贴左（U-18 根因）；header 横栏在 h1 之下（U-19）；长图带满幅贴左（U-20/21）；底部"用户评价"在 footer 之后（U-22，根因：action-only 命名子件被根 actionRow 吞掉后渲染在 article 最末） |
| sspai | h1 左对齐；hero 满幅 vs 正文 74ch 左锚（U-23）；电影条目图与正文左缘对齐、右半空 |
| airbnb | 马赛克瓷砖高度参差（行高不齐 → 白缝，U-24）；表单窄小贴左；右半页全空 |
| apple-home | PRO/Watch 满幅黑带（合法声明 banner）；**iPhone Duo 图上方空白=抓取图自身上半幅留白**（像素实测：图带顶部 ~248px 均匀灰底 (245,245,247, spread 0)——in-image，不可裁切编造，已声明）；媒体 Feed（Zane Lowe 段）是 deflist（label+图+链接行），此前窄列贴左（U-25） |
| taobao | 类目 sitemap/营销行窄列贴左；猜你喜欢**单列**大图竖排（U-26）；页高 12535px |
| ipad-air | hero 图左缘贴视口（.strip 100vw + 图 974px 左对齐，U-27）；正文左锚 1/3 右空 |
| bilibili | banner 小图贴左 + 标题居中 → 图文分离（U-27）；feed 卡**题在图上**（视频站惯例相反）；整页左锚 |

## 2. 系统实现（L-1…L-6 → 规则，无逐页特例）
1. **L-1 页面栅格**（axis.mjs `nodePlan().widthTier` + render.mjs CSS）：唯一容器 `main`（居中、1280px、对称 padding 24px）；depth-1 页面 section（含根 `_lines` 成员，如 airbnb 房源段/taobao 营销行/apple banner 单元）声明四层：`prose`(74ch 居中) / `narrow`(880px 居中) / `wide`(容器全宽) / `bleed`(**仅** nodePlan.banner 声明的横幅)；声明 cols 的 section 强制 wide（网格需要容器）。根直属标题/事实/搜索栏居中（h1 列宽 640px——`ch` 随 2em 放大，74ch 会撑满容器导致居中失效，故用 px）。分层规则置于样式表**末尾**以胜过 `.block>.node{max-width:none}`（F-031）的层叠。
2. **L-2 区域钉扎**（axis.mjs `orderedNamedChildren`/`regionOf`）：命名子区域按 `header(0) < body(1) < footer(2)` 稳定排序（文档序在同层保留），三目标同判；渲染器只选槽位：HTML header 组在 h1 之上、footer 组在一切之后（元素级动作行在 footer 之前）；text/md header 块在标题行之前、footer 块在动作行之后。
3. **L-3 图片策略**（render.mjs `imageFigures(v, mode)` + CSS）：`img{max-width:100%;margin-inline:auto}`（压容器、居中、不放大 F-082 保持）；`mode='bleed'` 仅限轴层 facts.hero 的两条来路（深度 0 主图 / banner 成员）→ `<figure class="strip">` 满幅带，带内图居中；`mode='band'`（image-strip 内容图带）→ `.band` 包裹：不满幅、居中、压容器宽；`mode='tile'`（照片墙）→ mosaic 网格内 `aspect-ratio:1` 正方形瓷砖 + contain 居中（对齐不裁切）。airbnb 马赛克因此对齐（U-24）。
4. **L-4 列数决策**（axis.mjs `g.cols`）：宽层卡片/Feed 集合（form ∈ stack/cards/product-cards、≥3 成员、**≥75% 成员自带图**、成员文本 ≤160）声明 `cols='auto'` → 渲染为 `.stack.cols-auto`/`.cards.cols-auto` auto-fill 网格（minmax(240px,1fr)，桌面 2–4 列）；阅读型集合（长文、无图）保持单列。taobao 猜你喜欢 4 列（18/19 成员带图，组行成员全宽格）；bilibili/apple 同规则。淘宝整页 12535px→4626px。
5. **L-5 footer 反色**：`.group.g-footer{background:#16202b;color:#c7d3e0}` 深底浅字 + 负 margin 铺满容器内宽；声明式（只认模型 footer 区域类），无 footer 的页自然无此带。
6. **L-6 条目内聚**（axis.mjs `mediaFirstOf`，组级决策）：卡片/Feed 组全体成员为图卡（≥75% 带图、文本 ≤96）→ `.media-first` → flex order 把图排到题上方（不拆 DOM，图文同 article 永不分家）；sspai 长文条目保持题在前。bilibili《第五人格》类视频卡图在题上 ✓。
7. **文本/MD 目标**：钉扎（header 先于标题、footer 最后）同步落地；列数/宽度为呈现层声明，线性目标按行输出（同判不同画）。

## 3. U-18…U-27 after 逐条核对
| U | after 证据 | 结论 |
|---|---|---|
| U-18 | mi15 after 拼图：事实列/标题居中，右侧不再大片空白 | 消失 |
| U-19 | mi15 after：导航横栏在页面标题之上（HTML：g-header@14916 < h1@16093） | 消失 |
| U-20 | mi15 after：长图带全部居中、约束于容器 | 消失 |
| U-21 | mi15 after：划线价图与其余图带同宽（.band 压宽） | 消失 |
| U-22 | mi15 after：「用户评价」pill 在深色 footer 上方；footer 反色 | 消失 |
| U-23 | sspai after：标题居中、正文列居中对称、各 section 同列宽；质心探针 x=607（中线 640） | 消失 |
| U-24 | airbnb after：马赛克瓷砖对齐无白缝；内容列居中（质心 614） | 消失（"地面空"部分=源站该区内容本就少，已由居中与对齐缓解） |
| U-25 | apple-home：容器 1280 居中、banner/Feed/内容分层不跳；**Duo 图上方空白确认为抓取图自身留白（in-image）**——像素实测 y584–832 均匀灰底，属源图内容，不裁切不编造 | 大部分消失；图内留白如实声明 |
| U-26 | taobao after：猜你喜欢 4 列、产品卡图在题上、类目/营销行居中；页高 4626px | 消失 |
| U-27 | ipad-air after：hero 居中不贴边（"Get the highlights"等窄列左缘 x=204=居中列）；bilibili after：banner 图文同卡、feed 卡图在题上（质心 607） | 消失 |

## 4. 门禁证据（第 17 道 `m1/eval/layout-selftest.mjs`，可失败）
- 断言（fixtures + **72 页范例全量**）：a) 容器 main 1280/margin auto/对称 padding + 四层类规则存在；b) g-header 在 h1 之前、g-footer 是最后一个区域组、商品级动作（用户评价）在 footer 之前；c) img 规则 max-width:100% + margin-inline:auto；裸 `.strip` 只允许出现在声明 hero（depth-0）/.banner/`.band`/`.tile` 约束形态内；d) `.stack.cols-auto` auto-fill 网格规则 + taobao cols-auto + bilibili media-first + 阅读集合无 cols-auto。
- **先制造失败再撤销**：N1 header 挪到 h1 后 ⇒ 探测器失败 ✓；N2 删 cols-auto ⇒ 失败 ✓；N3 解除 .band 包裹 ⇒ 裸 strip 探测失败 ✓；N4 容器去居中 ⇒ 失败 ✓（负例注入全部生效后，撤销恢复全绿）。
- 接线：`pipeline.mjs` 第 17 道自测（gatesFailed 纳入 gLO）。
- 附带修正：`affordance-selftest.mjs` 两条断言正则放宽为 `class="node depth-1[^"]*header-bar` / `[^"]*banner`（轮 58 起 article 另可携带宽度层类；断言强度不变——类必须存在）。
- 全量管线（`node m1/eval/pipeline.mjs --shots`，最新 v=mv0zmsk6）：**渲染 42/42 | 保真 1.00: 42/42 | Markdown 42/42 保真 1.00 | 48 模型校验通过 | 17 道自测全过 | 链接覆盖未声明差额 0 | 可见英文标签泄漏 0 | 强调保真 0 差额 | 视觉自查 42/42 干净 | 证据一致性（PNG⇄HTML 哈希）通过 | EXIT 0**。布局改动未触碰任何事实文本，保真保持 1.00。

## 5. 风险与遗留
1. **iPhone Duo 图上方空白**：源图自身留白（证据 §3），无法在不裁切/不编造的前提下去除；若用户要求，需 capture 侧换裁剪变体（跨轮决策）。
2. apple-home 内容质心 x=534（左偏 106px）：主因是源站式左对齐标题 + 左侧重内容（黑 banner 对称）；各 section 容器已居中。用户若仍觉偏左，可后续给 wide 层 section 加标题居中规则（呈现偏好，留用户裁定）。
3. `textLenOf` 阈值（160/96）与 75% 图片占比是**量得的分组判据**：若未来页面出现 60% 带图的"半图卡"集合，会保持单列（保守侧）；调阈值需新一轮测量。
4. before 整页 PNG 从 git HEAD（a53d8e2）恢复；未提交任何变更（含 renders/，等待父代理复查与用户认可后再走提交流程）。
5. 超时 ~15 分钟（两次返工均已闭环），如实申报。
