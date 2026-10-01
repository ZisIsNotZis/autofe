# 轮 53 — 补第 11 轮验收发现的两个更早遗留缺陷

状态: DONE

## 1. `m1/validate.mjs` 非模型 JSON 栈溢出 — DONE (validate_robust=yes)
- 复现(修前): `node m1/validate.mjs m1/curated/renders/manifest.json` → `Maximum call stack size exceeded`, exit=2。
- 根因: refs 解析段的兜底遍历 `walk(model,…)` 经共享 `childrenOf` 递归；`childrenOf` 对**字符串**做 `Object.entries` 得到它的**字符** ⇒ 字符串被当集合无限递归。manifest 顶层 `version:"mupct4wn"` 是非下划线命名子件，被收进遍历，首击爆栈。
- 修（只动 `m1/validate.mjs`；pipeline 的模型口径 `find … -not -path '*/renders/*'` **未改**）:
  1. 入口守卫：顶层非 node 对象（数组/标量/null）⇒ `notModel` + `E_NOT_MODEL`，不遍历。
  2. 清单/数据袋启发：模型的**非保留成员必是 node 对象**；某非保留键的值是标量/数组 ⇒ `notModel`（manifest 的 `version` 命中）。
  3. 兜底遍历改 **受保护 `walkNodes`**：只下钻 plain object，绝不把标量当集合递归（`isPlainObject`）。
  4. 复合件 `collect` 同样先跳过非对象子件。
  5. `validateFiles`：`notModel` 打印 `skip <file>: <原因>(E_NOT_MODEL)`，**不计失败**。
- 行为: `node m1/validate.mjs m1/curated/*/*.json` → **exit=0**，42 模型 `ok` + 1 行 `skip …/renders/manifest.json`（附原因），**不崩溃**。
- 断言: `validate-selftest.mjs` 新增 5 条（数组顶层/标量顶层/null 顶层/manifest 形数据袋/真模型深层字符串子件），均不抛异常 + 预期结论。自测 **18/18**。

## 2. 保真度量看不见输入控件消失 — DONE (control_gate=yes)
- 现象: `search.query` role `field`→`state` ⇒ 输入框整块消失，保真不变（只数字符文本）。
- 修: 新增 **第 12 道自测** `m1/eval/control-render-selftest.mjs`，接入 `m1/eval/pipeline.mjs`。
  - 规则: `axis.exposeRendersAsControl(node)!==null` 的每个 `_expose` 必须在**三目标**画出控件：HTML `<input|select|textarea … name="<洞名>">`；文本/MD 可辨识输入占位标记（`_____…`/`(密码)`/`[ ]`/`( )`）。
  - 反向: `state` 槽 `_expose` 不得画控件（`login.signed-in` 三页）。
  - 单项 `_items` ⇒ `choicePlan` 有意 `plain-fact`（非控件），单独计数并要求其事实文本在场。
- 覆盖全 42 页: 应渲染控件 **56**、HTML 命中 **56**、单项降级事实 **2**、`state` 不画控件 **3**，**不一致清单为空**。
- 可失败: ① 自测内构造"声明 field 但控件被剥离"的产物 ⇒ `auditPage` 报缺失（实测）；② 临时改 `search.fields.query.role=state` ⇒ 断言 B/D 失败（待修 2），撤销后全过（`axis-selftest` V0/V1/V2 亦失败）。

## 验证（收尾 `node m1/eval/pipeline.mjs --shots`，exit=0）
- 渲染 42/42 | HTML 保真 1.00 **42/42** | Markdown 保真 1.00 **42/42**
- 模型校验 **48 个全通过**（警告 10 条，不阻断）
- 十二道自测全过（含第 12 道控件渲染自测 + 更新后的校验器自测 18/18）
- 采集↔模型一致性通过（42 页/4077 事实/未命中 0）| 证据一致性 PNG⇄HTML 通过 | 视觉自查 **42/42 干净**
- 控件对照: 应渲染 56 = HTML 命中 56；不一致 0

## 改动文件
- `m1/validate.mjs`, `m1/eval/validate-selftest.mjs`, `m1/eval/control-render-selftest.mjs`(新), `m1/eval/pipeline.mjs`, `m1/failures.md`
- `m1/curated/renders/{manifest.json,index.html}`：`--shots` 收尾命令重新生成的产物（版本/哈希），非手改。
- 未 git 提交；无暂存（staged）文件。

## 看图
0 张（本轮为校验器健壮性 + 门禁，未引入视觉变更）。
