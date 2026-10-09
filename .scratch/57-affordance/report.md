# 轮 57：链接可供性系统 + 两处布局（报告）

状态：完成（18:32–19:06，约 34 分钟；硬限 60 分钟内）

## 一、设计落地

### 1. 三层可供性（HTML；文本/MD 各自等价表达）
- **目的地列表**：`m1/render.mjs renderList` 按条目自身的 `itemActionPlan().linkTo`（= 模型 `_action.to` 且名字即链接）落 `<li class="go">`；CSS `.linklist li.go::marker{content:"›";color:var(--accent)}`，文字 accent 无下划线、hover 下划线。**无目标条目不落类，保持 `•`** —— 标记即声明，一条规则。
- **正文内链接（层2）**：`a.ref, .val a.body-link, .prose a, .chips a` ⇒ `color:var(--accent);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:2px`（常显细下划线）。
- **标题/卡片链接（层3）**：`a.self-link` accent 无下划线 + hover 下划线；导航型标题（`nodePlan.isLabellessLink`：无 label 的 navigate/open 且有目标）由渲染器加 `.nav`，尾部 `›` 用 `::after`（不进正文文本）。对比表实体头 `th.cmp-col>a` 同 accent。
- **按钮**：`.ctl/.action/.action-plain` 未动。
- **文本目标**：`m1/render-text.mjs` 目的地条目用行首 **`→ `** 替换 `- `（理由：一眼可知可点、不把源站域名掺进正文文本；`→` 是符号，不破坏保真度量的分词口径，实测 42/42 保真不变）。**MD 修正**：设计前提「MD 已是 `[文本](url)`」与代码不符——名字即链接的条目此前是死文本（仅控件渲染为链接）；按设计意图在 `render-md.mjs renderListItem` 补齐 `[文本](href)`（控件仍走 `itemControl`，不重复）。

### 2. accent 色 = 从抓取量出来（M5 第一个 token）
- `m1/eval/brand-accent.mjs`：扫 `corpus/<site>/<page>/nodes.json` 每个 `a` 元素计算样式 `styles.color`，解析 rgb/rgba（alpha≥0.5），去中性色（S<0.14 或 L<0.16 或 L>0.92）后取**最高频**者为 accent；**<3 例视为量不出 ⇒ 回退 default 并写明**。确定性脚本，`--print` 只打印。
- `m1/brand-tokens.json`：`default.accent=#0b62d0` + 48 站逐条 `{value, fallback, evidence}`；每条 evidence 指向语料路径与样本数（例：`a 前景色统计：#ff6700 × 36/712 个锚点；主证 corpus/mi-com/product-detail-mi15/nodes.json (28/36)`）。
- **量得 38 / 回退 10**（全语料）；**42 范例页覆盖 20 站：量得 16，回退 4**（airbnb-com、github-com、linear-app、xiaomi-account——量得色样本不足或全灰）。
- 渲染器注入：`render(model, {site})` ⇒ `:root{--accent:<site accent>}`；CLI 按模型路径解析站点（`m1/curated/<site>/<page>.json`）。**渲染器零硬编码站名/色值**（自测断言 `!/#cc6600/.test(render.mjs)`）；非法/缺失值回退 default。
- 未新增保留键、未改模型语法 —— tokens 是呈现层配置。

### 3. 两处布局（该突出的突出）
- **小米页眉横栏（规则化）**：`axis.mjs nodePlan` 新决策 `headerBar`——模型以**命名子区域 `header`** 声明的页眉区 ⇒ 顶栏（只认区域名，不认站名，所有页同规则）。HTML 落 `.header-bar`：`.linklist` 横排（无列表缩进），导航项 accent `›`；无目标账号入口（登录/注册/消息通知）pill **靠右**（`margin-left:auto`）。文本/MD 目标保持逐行（同决策、目标各自形态）。
- **苹果 hero 全宽（规则化）**：`nodePlan` 新决策 `banner`——集合成员满足 ①`_image` ②标题 ③动作（自身 `_action` 或控件行）④除标题外只带展示性事实（`_subtitle/_summary/_detail`，无 `_price/_author` 等记录性事实）且**不在卡片/表格网格内**（`ctx.grid`，深度>0）⇒ `_image` 走 hero 槽（F-031-§7 `.strip` 满幅机制），标题/副题/按钮居中，不再锁 74ch。价格类商品卡被夹具证实不误伤。

## 二、验收

### 截图结论（6/6 张，全部来自 convert 裁剪的实拍，非 CSS 想象）
1. **taobao 热门词列表**：`›`（accent 橙 #cc6600）+ accent 文字，与下方墨色 deflist 行（淘宝秒杀/中秋好礼…）一眼可辨；「百亿补贴·买贵必赔 ›」导航标题尾部 `›` 生效。本页所有 linklist 条目均带目标（全 `›`）——`•` 对比由混合列表承载（自测夹具实渲染断言：go 与纯 `•` 同列），淘宝页无纯事实列表条目属页面事实。
2. **mi15 页眉横栏**：12 项导航横排一行，登录/注册/消息通知 pill 靠右 ✓。导航项保留 accent `›`（与"标记即声明"全局规则一致；未做源站式纯文字顶栏——如实记录此取舍）。
3. **apple hero**：三个 hero 图带满幅 edge-to-edge，标题/副题/按钮居中；卡片格（Watch Ultra 4/AirPods 5…）保持容器宽不误伤；H1「Apple ›」导航标题 ✓。
4. **sspai**：来源/发表首评 pill accent 化（量得 #0097ff），正文保持墨色可读；行内 `.body-link` 的渲染与 1px 下划线规则由自测断言（实渲染夹具）。
5. **airbnb**：了解Edwin/显示所有18项/查看可订状态/举报此房源 accent pill（该站回退 default #0b62d0——量得色仅 1 例不足为证，按规则回退并已在 tokens 写明）。
6. **整体观感（apple 全页缩略）**：满幅 hero 带 → 卡片格 → 影视卡格层次分明，清晰大方，无断裂布局。

### 管道（`node m1/eval/pipeline.mjs --shots`，退出码 0）
- 渲染 42/42；**保真 1.00：42/42（HTML）与 42/42（Markdown）**（m3-final.json 复核 0 非满分）；48 模型校验通过；**16 道自测全过**（第 16 道为本轮新增可供性自测）；链接覆盖**未声明差额 0**；采集↔模型一致、图片不放大、证据一致性（PNG⇄HTML 同源，manifest v=mv0uxqli）全过；**视觉自查 42/42 干净**（仅 sspai 1 条 info 级 dup-title 提示）。
- **度量口径确认**：`›`（::marker/::after 的 CSS content）与 `→`（符号）都不进 `pageText` 比对文本；MD `[文本](href)` 的 href 在属性、标签文本照常命中 ⇒ **保真度量口径无需修改**（实测 1.00 不变）。

### 失败注入（诚实）
- **有门禁**：把 `renderList` 的 `li.go` 类逻辑改坏（所有列表 `•`）⇒ 第 16 道自测**失败并点名**「目的地条目（带目标）li.go」；还原后全过（已实测，命令记录于 failures.md F-098）。
- **无门禁、由人眼/截图验收的部分（不假装有）**：`›` 的视觉间距/hover 形态/marker 与文字的实际间距、header 横栏的观感、hero 居中的美观度——这些是纯视觉质量，自测只能断言类名/CSS 规则/决策标记存在。

## 三、改动文件
`m1/axis.mjs`（banner/headerBar 决策+region/grid 语境）、`m1/render.mjs`（li.go、self-link.nav、header-bar/banner 类、三层 CSS、--accent 注入、CLI site 解析）、`m1/render-text.mjs`（→ 前缀）、`m1/render-md.mjs`（[文本](href)）、`m1/eval/brand-accent.mjs`（新）、`m1/eval/affordance-selftest.mjs`（新，第 16 道）、`m1/eval/pipeline.mjs`（接线第 16 道）、`m1/brand-tokens.json`（新，脚本生成）、`m1/curated/renders/**`（42 页 HTML/PNG/画廊/manifest 重生成）、`m1/failures.md`（F-098）、`.scratch/54-user-review/findings.md`（回填）、本报告。**未改模型、未新增保留键、未 git 提交。**

## 四、残留风险
1. mi15 页眉导航项保留了 `›`（规则一致性的自然结果）——若用户要源站式纯文字顶栏需再裁定。
2. 4 个范例站 accent 回退 default（airbnb/github/linear/xiaomi-account 量得色样本不足）——按规则回退，若用户想放宽阈值（如 ≥1 例）是产品决定。
3. `banner` 判定波及非 apple 的同形单元（huawei/aliyun/sspai/36kr 的 hero/promo 带）——全部随规则满幅；视觉自查 42/42 干净，但"是否所有满幅都合意"由人眼终审。
4. `comparable()` 网格判定与 `banner` 判定的交界（两个完全同形的 hero 会成卡格不满幅）——按"网格本就全宽"的设计意图处理。
5. MD 名字链接为本轮补齐（父任务前提有误，已按设计意图修正并在 54 号发现回填说明）。

最后一行：
`R57_DONE chevron_lists=y prose_underline=y title_links=y accent_measured=16/20_sites(42pages:38fallback=4) accent_fallback=4/20 mi_header=y apple_hero=y fidelity=42/42×2 audit=clean images_viewed=6`
