# 轮 55 修复报告（模型侧 + 第 13 道门禁 G-1）

范围：用户 U-01…U-17 + 父代理 S-1…S-7。唯一写入者，先落盘骨架再动手。
写入范围：`m1/curated/**`、`m1/eval/**`、`.scratch/54-user-review/**`（未改 `m1/render*.mjs`、未改 `m1/validate.mjs`、未新增语法/保留键、未提交 git）。

## 0. 先核实（结论与父代理文字不符的地方）

| 断言 | 复核命令 | 实测 | 结论 |
|---|---|---|---|
| S-1 taobao `_action` 174/0 href | 遍历 `_action.to` + 渲染 `<a href>` | `_action`=92（带 `to`=90），渲染 `<a href>`=91，源站 `<a>`=183 | **口径错**：模型目标键是 `_action.to`（语法既有），父代理按不存在的 `_action.href` 统计 |
| S-1 各族页面 | 同上 | taobao 91 / mi-shop 151 / aliyun-home 67 / apple-ipad 16 / airbnb 2 / mi15 4（渲染 `<a href>`） | 能力存在；**真实缺口是“锚点文本抽成事实后丢目标”**（airbnb、mi15、apple 部分、huawei 目录等） |
| S-2 英文标签 | `grep -oh 'data-verb="[a-z]*">[A-Za-z][a-z]*<'` | 6 类可见英文（Google/Previous/Next/Refresh/Edit/Performance/Outline/Hide/Export） | 属实，但**全部是源站原文**（grafana/linear/apple/stripe 是英文站） |
| U-02 搜索框与按钮分离 | 读渲染 | 输入框 → `搜索` 同组相邻 | **不成立** |
| U-09 订阅按钮在三框之上 | 读渲染 | `入住日期 → 退房日期 → 房客 → 查看可订状态` | **当前不成立**（轮 53 后已修正） |
| U-10 `json_` | `grep -c json_ renders/*.html` | 0/42 | 未复现 |
| U-17 `Detail`/`Count` 可见 | `grep -ohE 'json_\|undefined\|NaN\|\[object Object\]'` | 0；`Detail/Count` 只在 URL 路径/文件名/JSON 键 | 未复现 |

## 1. 第 13 道门禁 G-1 链接覆盖（可失败）

- 引擎：`m1/eval/link-coverage.mjs`（采集 ⇄ 模型 ⇄ 渲染）。
- 门禁：`m1/eval/link-coverage-selftest.mjs`，已接入 `m1/eval/pipeline.mjs`（第 13 道，`gatesFailed` 参与退出码）。
- 判据：
  1. 源站**有真实 href** 的锚点文本（压缩后 ≥3 字符，信息阈值同 F-078 的 T2）被模型复现成事实时，持有该事实的节点必须带 `_action.to`（**语法既有的目标键**），否则差额必须带书面理由进白名单 ⇒ 失败并**点名到节点路径**。
  2. 渲染出的链接若指向**抓取从未链接过的域名** ⇒ `wrong-target`（防编造，F-025）。
  3. 源站自身无目标（`javascript:`/`#`，455 条）**只统计不判失败**——这里重建链接就是造假。
- 白名单：`m1/eval/link-coverage-allow.json`，每条带 `kind/page/text/reason/round`，无理由或无 round 是硬错误（同 F-078 风格）。共 21 条。
- **可失败验证**（15 条断言）：删除模型里的目标 ⇒ 报 `anchor-dropped` 并给出节点路径与源站目标（fixture B）；渲染 `https://evil.example/buy` ⇒ 报 `wrong-target`（fixture D）；`javascript:` 锚点不得被索要目标（E）；2 字符导航词不参与（F）；声明条目通过（C）；白名单三类硬错误（H）。
  先制造失败（fixture B/D 在实现过程中确实由 FAIL → 修好判据后 PASS）再跑通。

## 2. 逐页对账表（完整表见 `findings.md` §6.2）

| 页面 | 源站 `<a>` | 有真实 href | 源站自身无目标 | 模型复现的锚点事实 | 已有目标 | 未声明差额 |
|---|---|---|---|---|---|---|
| taobao-com/home | 177 | 174 | 3 | 30 | 30 | 0 |
| mi-com/product-detail-mi15 | 109 | 79 | 30 | 56 | 56 | 0 |
| mi-com/shop-category-list | 245 | 226 | 19 | 138 | 138 | 0 |
| mi-com/search-earbuds | 160 | 107 | 53 | 0 | 0 | 0 |
| aliyun-com/home | 420 | 420 | 0 | 19 | 18 | 0（1 声明） |
| aliyun-com/product-ecs | 319 | 319 | 0 | 1 | 1 | 0 |
| apple-com/ipad-air | 382 | 359 | 23 | 6 | 4 | 0（2 声明） |
| apple-com/home | 356 | 347 | 9 | 16 | 16 | 0 |
| airbnb-com/room-28871 | 32 | 31 | 1 | 0 | 0 | 0 |
| bilibili-com/video-bv1gj411x7h7 | 70 | 69 | 1 | 39 | 39 | 0 |
| **42 页合计** | **6250** | **5795** | **455** | **888** | **864** | **0** |

未映射的逐条原因（21 条白名单）：18 条“同文本对应 2–6 个不同目标 ⇒ **无法确证**该回填哪一个，不猜”；3 条“`_tag`/`_author`/`_summary` 角色事实不是节点入口标签，节点自身 `_action` 已承载链接”。

## 3. 回填（不新增语法，逐条取自 `corpus/<page>/dom.html`）

- 新增脚本：`.scratch/54-user-review/backfill-links.mjs`（dry-run 可复跑）：节点标题（或已有动作的 label）在捕获中对应**唯一**真实 href 时，写入 `_action.to`；`href` 逐字取自 DOM（协议相对→绝对化），**同文本多目标一律不填**（无法确证 62 处）。
- 实测回填 **108 条**（59 + 49），覆盖 36kr/aliyun/apple-cn/apple/huawei/linear/mi/sspai/stripe/taobao/bilibili/gov-uk 等；taobao 的 `淘宝网`、`天猫` 等回到可点。
- 三目标一致性：链接来自同一个模型，HTML/文本/MD 同步变化（保真 42/42 ×2 目标）。

## 4. 用户点名页面

- **U-12 mi15 页眉/页脚（已修）**：新增 `header`（站内导航 13 条 + 账号入口 `登录/注册/消息通知`）与 `footer`（服务承诺条 5 / 产品直达 10 / 帮助与售后 23 / 小米产品 9 / 隐私与反馈 5 / 法律与备案 8 / 备案与资质编号 2），文本与 href 逐条取自 dom.html；渲染 `<a` 由 4 → **72**。`登录/注册` 在源站是 `javascript:void(0)`，无目标可回填（不编造）。
- **U-11 mi15 多图（已修 + 采集缺口）**：新增 `gallery`（`_rel.order=sequence`，主图 `mi15-gallery-01.png` 本地镜像）与 `detail`（源站 **21 张**长图按 `data-src` 逐张镜像，`mi15-detail-01..21.jpg`）。源站轮播区 `J_imgListBox` 本次抓取**只加载了 1 帧**，其余帧与缩略图不在 dom.html ⇒ 在 `_intent` 写明采集缺口，不留空白、不编造。
- **U-07 airbnb 图片墙（部分已修）**：源站抓取里只有 5 张照片（`a0.muscache.com` 去重后 5 条房间图），模型 5 张与源站一致；缺陷是**镜像尺寸过小**（273–561px）⇒ 已按抓取 URL 重镜像为 **1440px 原图**（`airbnb-room-photo-1..5.jpg`），图片墙不再左侧窄柱+右侧大片空白。**1 大 + 4 小的网格本身需要改 `m1/render.mjs` 的 `.strip` CSS（本轮写入范围外，未改，见 §6）**。
- **U-08 airbnb 角色标签（已修）**：`reviews` 拆出 `score`/`count` 两个子节点，渲染为 `评分 4.86 分` / `评价数 815 条评价`（各自成行，不再并排裸数字）。
- **U-09 airbnb 表单顺序（核实：当前已正确）**：`入住日期 → 退房日期 → 房客 → 查看可订状态`。
- **U-05 taobao 裸价格（已修）**：抓取中 `原价/到手价/券后价/补贴价/好评率` **各 0 命中** ⇒ 不以编造词替代；改用在源站抓到的**会场名**作价格限定词：`百亿补贴 ¥14999`、`领券中心 ¥10800`、`国家补贴 ¥21800`、`淘宝秒杀 ¥6999`。
- **U-06 taobao 猜测类集合被画成 Radio（已修）**：`宝贝/天猫/店铺` 与猜你喜欢分类在源站是页签（`div.smallTabWrapper[data-tab-id]`），已**移除 `_expose` 输入槽**，按源站形态建模为标签集合；渲染 `type="radio"` 由若干 → **0**。
- **U-01/U-03/U-04 链接（已修）**：回填见 §3；taobao 渲染 `<a href>`=91（源站 183 个 `<a>` 中 174 个有目标）。
- **U-16 英文字母（已核实）**：可见文本中**没有**内部动词名/枚举名（`grep -ohE '>(open|operate|navigate|toggle|select|submit)<'` ⇒ 0）；`data-verb` 属性里的英文标签全部是源站原文（英文站 grafana/linear/apple/stripe），保留即逐字保真。**可见英文标签 = 0（内部名词）**。

## 5. 验证（收尾命令与结果）

```
node m1/eval/pipeline.mjs --shots
  渲染 42/42 | 保真 1.00 42/42 | Markdown 保真 1.00 42/42 | 模型校验 48 个全通过
  13 道自测：校验器/地基/度量/文本/轴一致性/Markdown/证据/归属/采集一致性(第9)/图片不放大(第10)/复合元语(第11)/控件渲染(第12)/链接覆盖(第13) 全通过
  采集↔模型一致性：事实 4154 | 参与判定 3738 | 未命中 0
  链接对照：源站锚点 6250（有目标 5795）| 模型复现锚点事实 888｜已有目标 864 | 未声明差额 0
  视觉自查 42/42 干净 | 截图 42 张 | 证据一致性（PNG ⇄ HTML）通过
```

## 6. 残留 / 需要决策（未擅自决定）

1. **U-07 照片墙网格**：要还原源站 1 大 + 4 小，需要改 `m1/render.mjs` 的 `.strip`（`width:100vw` + `img{max-width:100%;width:auto}`，且 F-082 禁止放大）。选项：(a) 允许改渲染器 CSS（给图集专门的网格类）；(b) 保持现状（原尺寸铺满、纵向堆叠）。**本轮未动，等裁定。**
2. **U-13 强调保真、U-15 多余分割**：不在本轮任务列表；G-5/G-10 的证据来源（capture 侧强调标记）未定义。
3. **U-16/U-17 的“白名单 + 理由”**：本轮只做了扫描复核（0 内部名词可见）；G-2“可见英文标签”门禁未实现，建议下一轮把动词/枚举名白名单化。
4. **21 条白名单**是“无法确证”的诚实计数（18 条同文本多目标 + 3 条角色事实），不是被静音的缺口。
