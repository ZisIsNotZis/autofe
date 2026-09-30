# 修复轮次任务书（父代理编排用）

**共同纪律（每轮都适用）**
- 单写入者；不得修改 `corpus/`；不得从截图转写文字（F-025）；不得引入 HTML/CSS 逃生口；不得 git 提交。
- 每片先落盘报告再继续；硬限 40 分钟；收尾必须 `node m1/eval/pipeline.mjs` → 「保真 1.00: 36/36」+「视觉自查: 36/36 干净」。
- 改模型必须过 `node m1/validate.mjs <模型>`；新失败模式先记 `m1/failures.md`（F-0xx 格式）。
- 需要改语法/词汇/产物契约的：不实现，写进「需要人类决策」。
- 输入：`.scratch/06-visual-review/findings-1..4.md`（只读）。产出：`.scratch/06-visual-review/fix-report-<轮号>.md`。

---
## 轮 2（渲染器族 · R4/R5/R7）
来源：findings-1..4 的 major 条目 + fix-report-1 未修项。

1. **R5 静默丢弃**：小米净化器页「用户评价」入口是唯一内容为 `_action` 的独立子节点，渲染结果里整块消失（findings-3 blocker）。要先复现（`m1/curated/mi-com/product-detail-mi15.json` + 渲染 HTML），定位是 `bareTitle`/空节点守卫/`itemsConsumed` 哪一处吞掉，然后修成**控件**（不得变 promo）。同类风险：所有"只有动作没有文字"的节点。
2. **R4 面板连排**：grafana `play-home` 的 11 个面板名渲染成一行连排（无分隔/无编号）；且面板体丢失。先用 `corpus/grafana-play/play-home/nodes.json|dom.html` 判定"面板体是否在抓取里"：在抓取里而模型缺 ⇒ 模型侧补（含 `_rel.order` 语义）；模型有而渲染丢 ⇒ 渲染器修。
3. **R7a 对比表行标题印英文键**：`cmp-table` 的 `th.cmp-row` 现在用 `FIELDS[key] ?? key.replace(/^_/,'')`，于是 `display/chip/camera/battery/buy` 直接上屏（findings-4 major，apple-com-cn/iphone-17）。改为**优先取该子节点的 `_title`**，其次 `FIELDS` 词典，都没有则**不显示标签**（绝不印内部键）。apple `buy` 子节点本身有 `_title: "购买"`。
4. **R7b 裸数字无标签无单位**：如 airbnb `4.86` / `815` 各占一行、评分又在「总体评分」重复一次（findings-1 major）。要求：数值事实必须带**角色/词典标签与单位**（如「4.86 分 · 815 条评价」），同一事实不得两处渲染（优先保留信息更全的一处）。
5. **R7c 评分分布挤成一行**：5 星/4 星/… 连成一句话且末句被截断（findings-1 major）。按星档渲染为逐行（deflist/表格/条形），每档一行。
6. **R7d 顺序语义缺失**：`_rel.order: "time" | "sequence"` 的集合必须体现顺序（编号/时间轴/分隔），不得连排（findings-2 major：aliyun product-ecs「产品动态」4 条）。
7. **R7e 日期未本地化/无标签**：`2025-06-30` 裸格式（findings-4 minor）。输出人读格式或加「发布」标签。
8. **R7f 无标题尾块**：无 `_title` 的堆叠块若前面是有标题块，必须输出区域分隔（`hr.region`）或补区块标签（findings-1 major：airbnb「地段 616…」十行）。
9. **R7g/R7h 若 fix-1 未完成**：`renderDeflist` 空标签列；页头已输出 `_brand` 时 meta 行重复 `_brand`。

---
## 轮 3（模型/采集侧 + 剩余 blocker）
1. **R3 B 站首页横幅裁错**：现挂的 `m1/curated/assets/bilibili-banner.png` 实际是**顶部导航条**（y=0..158 裁到了 header）。用 `corpus/bilibili-com/home/nodes.json` 的 img bbox 定位真正的轮播横幅区域（在导航条之下、更宽更高的一段），重新裁切替换资产；确认渲染截图里出现的是活动横幅而不是导航条。
2. **R6 淘宝会场空卡片**：四个会场（百亿补贴/领券中心/国家补贴/淘宝秒杀）只渲染出价格，无标题、无内容（findings-4 blocker）。先查 `corpus/taobao-com/home/nodes.json|dom.html` 是否有这些会场的文案；有 ⇒ 补模型；无 ⇒ 记采集缺口 ticket 并在报告说明，不要发明文案。
3. **airbnb 图墙 alt 串**：`gallery._items` 只存图片 alt，渲染成一行夹生英文（findings-1 major）。两个方案选其一并在报告说明理由：(a) 按抓取 bbox 裁切截图派生图墙（满幅/等宽，alt 为空）；(b) 删除该行只留「显示所有照片」控件。
4. **ipad-air 行内实体+属性混排**：「11″ model」与两条显示属性同排（findings-2 major，违反 F-031 §1）。模型侧修正（实体与属性分层）或渲染器可比性判据加强。
5. **36kr 资讯页 H1 是 SEO 串接标题**（findings-2 minor）：若源站 H1 确实如此则保留并在报告说明；否则模型侧改人读标题。
6. 收尾时把仍无法修的项（多为 capture 缺数据）汇总成"采集待办"清单，附证据。

---
## 轮 4（独立验收）
见 `.scratch/06-visual-review/spec.md` 的 P3 要求：fresh 视角、独立跑门禁、独立看图复验 ≥8 页、抽查"设计如此"项、检查回归与纪律，产出 `verification.md` 与 `VERIFY_DONE verdict=PASS|FAIL`。
