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
  7. ✅ **`M4-a` 完成并验收**（提交 `d0b90a4`）：D1 `_expose` 作用域 + `_when` 硬校验、D2 compare 位置无关（13 表 + 显式降级清单）、D3 删除引擎侧价格算术；**恢复被删的校验器根调用**；新增 `validate-selftest.mjs`(10 断言) 与 `foundation-selftest.mjs` 并接入 pipeline
  8. ✅ **轮 6**（提交 `4cb14b2`）：删 16 处错误 compare 标记、ipad-air 实体/属性分层、删 30 处非法 `_primary`、F-042 求值 + 断言；降级清单 6→0，对比表 13→3（全是真表）
  9. ✅ **轮 7**（提交 `e451edd`）：三条父代理裁定落地（`_primary` 硬规则+自测、36kr H1 带出处说明、aliyun 域字段）+ 10 个异质集合回改（**如实报剩余 12 个**）；并把 `layout-axes.md` 里过期的 55/98 数字**标注口径**
 10. ✅ **轮 8**（提交 `5a6d57f`）：12 个集合全部有结论（6 改 `_lines`、6 有判据理由保留、1 豁免）；**重要洞察**：`stack` 混了"语义不可比"与"表现太富"两种原因，已写入 `layout-axes.md`，M4 的网格类原语必须区分二者
 11. ⏳ **轮 9 运行中**（worker `c6b15d3d`）：补 exemplar 证据样本（`table`/`login` 前置；已做 robots 预检：华为云/小米/gov.uk 表格页/AWS EC2 价目/阿里云规格/stripe docs/apple 对比 = ALLOW；AWS signin = DENY 跨域跳转）
 12. ✅ **验收轮 6**（提交 `2608137`）：**PASS**（0 blocker / 0 major / 3 minor），并纠正我 brief 的数字（compare 标记 5 处而非 3）
 13. ✅ **轮 9 采集**（提交 `7464646`）：新增 5 个 exemplar 页（gov.uk 表格 / 阿里云帮助规格表 224 表但 0 `<th>` / AWS EC2 价目表 / stripe-dashboard 登录 / 小米账号登录），robots+节流+先干跑到 /tmp，7 条拒绝如实记录，既有 36 页未动。**`table` 达 C1（3 站点）；`login` 达 2/3**
 14. ⏳ **轮 10 运行中**（worker `136a478b`）：退化对比表规则（填充率阈值 + 断言 + 写进 layout-axes §3）+ 3 条 minor
 15. ⏳ **轮 11 运行中**（worker `26874b0a`）：补第 3 个登录 exemplar 站点（GOV.UK One Login / GitHub / 云厂商账号页候选；守顶流约束与 robots）
- **下一步**：轮 10/11 完成 → **新页策展**（把 5-6 个新页做成模型并纳入门禁，届时候选集从 36 → 41/42 页，须同步更新引用"36 页"的文档与报告）→ **M4-b 原语实现**（`form`/`offer`/`paginator` 先做；`table` 已达标，`login` 待第 3 站点）→ 独立验收
- **F-042 新登记**：条目级 `_action.when` 从不求值（M4-a 的 D1 构造断言顺带挖出）
- **已完成并行轨**：M4 复合原语提案 → `docs/m1/m4-composites-proposal.md`（14 候选 → 升格 5 / 否决 7；三条基础缺陷均已复现）
- **M4-a 之后**：策展回改（55 异质 `_items`）→ 补 exemplar 样本（`table`/`login` 前置证据）→ M4 原语实现
- **待用户拍板清单（累积）**：① 三条 provisional 语法裁定 P1-P3（`_expose` 作用域优先级 / 字段可引用性按原语类型 / prose 走引擎修法）② ipad-air 实体-属性分层规则 ③ 无标签输入框的受控标签来源 ④ exemplar 补样本范围
- **父代理裁定汇总**（写于 `rounds.md`）：控件是控件（带 label 的 `_action` 必渲染为控件）／角色单位进 `vocab-units.json` 声明化／集合单位由模型给出不得推定／日期本地化推迟待语言信号／`key:` 目标降为 `#锚点`
- **未修（已记录）**：ipad-air 实体/属性分层（试过回滚，需要新的渲染规则→待裁定）、R7e 日期、`_count` 单位、3 条采集待办（taobao 会场文案 F-036、airbnb 缩略图分辨率、grafana 面板体/T-109）
- **每轮硬判据**：`node m1/eval/pipeline.mjs` → 36/36 保真 1.00 且 视觉自查 36/36 干净；模型改动必须过 `m1/validate.mjs`
- **教训**：100 分钟单轮修复必然超时——改为 40 分钟分片 + 每片先落盘报告

## ⚠ 重大发现（M4-a 过程中，父代理已独立复核）
**校验器长期空转**：`m1/validate.mjs` 的根调用 `checkNode(model,'',[])` 在提交 `6740f1c`（antd table 编码）被 diff 顺手删除，此后节点级检查（未知键、`_intent`、`_primary`、`_when`、`_expose`、`_rel`）**全部是死代码**。
- 实证（父代理亲测）：`{"_intent":"x","_bogus":1}` → `ok`；`{"_when":"undefinedName > 0"}` → `ok`
- **影响面**：此前所有"42/42 模型校验通过"的结论**均无效**（空真）；"闭式语法无逃生口"的强制手段实际未生效
- 处置（裁定 A 加强版）：恢复根调用；用"删除非法/悬空声明"方式修 9 处被掩盖的模型缺陷（渲染零变化）；**新增 `m1/eval/validate-selftest.mjs`（≥5 个坏样例必须被拒）并接入 pipeline**——不会失败的 gate 不是 gate；记 F-040/F-041 + 策展 ticket
- 教训：**任何"通过"结论都必须能被反例证伪**；自动化的门禁必须自带自测

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
