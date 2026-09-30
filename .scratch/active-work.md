# 活跃工作（父代理维护 · 供跨会话接续）

## 当前：06 · 视觉复核与缺陷闭环（自主推进中）
- **发现已归档**：`.scratch/06-visual-review/findings-1..4.md`（**12 blocker / 31 major / 52 minor**），提交 `77cf57a`
- **根因族（本轮修复主线）**
  - R1（blocker）promo 分支吞掉控件节点：`bareTitle` 命中了 `titleIsControl` 的节点 → CTA 变成浅灰空横幅且丢链接（36kr 站内搜索、taobao 重置、huawei 购买×45、mi15 四控件、apple Continue/Save for later、linear Contact sales）
  - R2（blocker）内部动词泄漏：`a.label ?? a.verb` 把 `buy`/`operate` 印到界面（aliyun product-ecs、sspai 文章页）
  - R3（blocker，采集/模型）B 站首页横幅裁错了区域（裁到顶部导航条截图）
  - R4（blocker，渲染/模型）grafana play-home：11 个面板名连成一句、面板体丢失
  - R5（blocker，渲染）mi15「用户评价」入口（`_action`-only 子节点）被静默丢弃
  - R6（blocker，模型）taobao 四个会场区块渲染成只有价格的空卡片
  - R7（major 族）`_brand` 重复渲染、对比表行标题印英文键（display/chip/camera）、评分分布挤成一行、裸数字无标签单位、`order: time` 无序感、日期未本地化、deflist 空标签列、无标题尾块缺区域分隔
- **分轮执行（单写入者，40 分钟一轮，防超时）**：
  1. `fix-1`（运行中，worker `43a0ee08`）：R1 + R2 (+ deflist 空标签列 / `_brand` 重复) → 产出 `fix-report-1.md`
  2. `fix-2`：R4/R5/R7 渲染器族
  3. `fix-3`：R3/R6 + 其它模型侧（airbnb 图墙 alt 串、重复评分事实、ipad-air 行内实体+属性）
  4. `verify`：fresh 视角独立验收（跑门禁 + 独立看图复验 ≥8 页）→ `verification.md`
- **每轮硬判据**：`node m1/eval/pipeline.mjs` → 36/36 保真 1.00 且 视觉自查 36/36 干净；模型改动必须过 `m1/validate.mjs`
- **教训**：100 分钟单轮修复必然超时——改为 40 分钟分片 + 每片先落盘报告

## 基线（本轮开始时）
- 36/36 事实保真 1.00；视觉自查 36/36 干净；42/42 模型校验通过；最新提交 `4f62c2e`
- 视觉子代理可用（子代理能真读图）；父代理负责拆解/编排/验收，不亲自干活（用户 2026-09-30 指令）

## 已登记但未做的 ticket（下一批）
- 策展回改：55 个异质 `_items` 集合改为 `_lines`/命名子组（引擎自愈是安全网，不是常态）
- 采集侧 T-109：`nodes.json` 的 img 节点需记录 `src`/`alt`（现仅 bbox，图片无法按位置回挂）
- 采集侧：FAQ 折叠答案未采集；动画稳定采样；200 字名称截断；mi15 slug 更名
- 里程碑顺序：重尾 triage → M4 复合原语（login/段落/评分行等，复合件必须声明其暴露状态）→ M5 品牌层（货币字形、字阶、圆角 token）
- 需人审的开放项：对比表列宽/换行策略；小米净化器 reviews/assurances 逐条确认

## 回来找人的条件（仅这些）
1. 需要人类审美验收才能继续；2. 关键设计取舍（改语法/产物契约/范围）；3. 严重阻塞（无法修、需外部资源）
