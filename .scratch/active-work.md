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
- **分轮执行（单写入者，40 分钟一轮）——进展**：
  1. ✅ `fix-1` R1+R2（提交 `dd5b94e`，父代理实证验收）
  2. ✅ `fix-2` 对比表行标签/角色单位/逐项动作控件/句读集合竖排（提交 `41ebd1c`）
  3. ✅ `fix-3` B 站横幅重裁、airbnb 图墙、R7f 区域分隔、`key:` 锚点、36kr H1（提交 `cd8f94d`，父代理看图验收）
  4. ✅ `verify` 轮 4 判 FAIL（抓到我们引入的单位叠加回归 + 4 项漏修），提交 `3f0a986`
  5. ✅ `fix-4` 修完 6 项 + 新增两条自查（unit-stack / dup-title），提交 `37d4599`
  6. ✅ `verify` 轮 5 判 **PASS**（0 blocker / 0 major / 5 minor），并发现流程坑：截图未随 HTML 刷新 → 已 `--shots` 并提交 `27153d7`
  7. ⏳ **`M4-a` 运行中**（worker `6826f6e5`）：D1 `_expose` 作用域 + `_when` 硬校验、D2 compare 语义与位置无关、D3 删除引擎侧价格算术 → `.scratch/07-m4/fix-report-5.md`
- **已完成并行轨**：M4 复合原语提案 → `docs/m1/m4-composites-proposal.md`（14 候选 → 升格 5 / 否决 7；三条基础缺陷均已复现）
- **M4-a 之后**：策展回改（55 异质 `_items`）→ 补 exemplar 样本（`table`/`login` 前置证据）→ M4 原语实现
- **待用户拍板清单（累积）**：① 三条 provisional 语法裁定 P1-P3（`_expose` 作用域优先级 / 字段可引用性按原语类型 / prose 走引擎修法）② ipad-air 实体-属性分层规则 ③ 无标签输入框的受控标签来源 ④ exemplar 补样本范围
- **父代理裁定汇总**（写于 `rounds.md`）：控件是控件（带 label 的 `_action` 必渲染为控件）／角色单位进 `vocab-units.json` 声明化／集合单位由模型给出不得推定／日期本地化推迟待语言信号／`key:` 目标降为 `#锚点`
- **未修（已记录）**：ipad-air 实体/属性分层（试过回滚，需要新的渲染规则→待裁定）、R7e 日期、`_count` 单位、3 条采集待办（taobao 会场文案 F-036、airbnb 缩略图分辨率、grafana 面板体/T-109）
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
