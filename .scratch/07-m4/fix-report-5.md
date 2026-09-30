# 07 · M4-a 地基修复报告（fix-report-5）

作者：worker `M4-a`（唯一写入者）。任务书：`.scratch/07-m4/spec.md` + 父代理/supervisor 裁定（A 加强版）。
时间：单片超时（40 分钟硬限被打破，见「纪律」），工作按片落盘。

## 0. 结论

| 缺陷 | 结果 | 一句话 |
|---|---|---|
| D1 `_expose` 不进作用域 + `_when` 名解析 | **done** | 暴露名进作用域（注入值优先于笼统默认、最近声明覆盖外层）；顺带发现并修复**校验器根调用缺失**（F-040），新增校验器自测 + 地基自测，都接进 pipeline |
| D2 `_rel.compare` 位置敏感 | **done** | 语义与位置无关：集合节点上的标记 ≡ "成员是对照实体"；20 处标记 → **13 个对比表 + 6 个显式降级单元**（降级理由进 pipeline 审计输出），零静默变形 |
| D3 引擎做金额比较 | **done** | 删除 `money >` 分支与 `.fact.was` 样式；`_amount` 照常渲染为普通事实；渲染器 0 处业务算术 |
| 门禁 | **green** | 保真 1.00 **36/36** · 视觉自查 **36/36 干净** · 模型校验 **42/42 真通过** · 两个自测全绿 |

---

## 1. 分片进展

1. 读 spec / 提案 §2.4·§2.5·§5.5·§6 / render·model-lib·validate·metrics·audit·pipeline；独立复现三缺陷。
2. 核 D1 验收第 3 条时发现 **`validate.mjs` 根调用被删（F-040）** ⇒ 停下走 `contact_supervisor`（need_decision）。
3. 收到裁定 A 加强版：恢复根调用、9 处模型缺陷"以删除为主"、新增校验器自测并接 pipeline、记账 F-040/F-041。
4. 实现（model-lib 作用域 → render D1/D2/D3 → validate 根调用 → metrics 同步 → 两个自测 → pipeline 接线）。
5. 9 个模型删除非法/悬空声明；逐文件 `git show HEAD:` 渲染对比确认**零视觉变化**。
6. `pipeline`（无截图）→ 全绿；`pipeline --shots` → 全绿 + 36 张截图刷新；read 图自查。

## 2. D1 · `_expose` 事实进求值作用域（+ `_when` 名硬校验）

**改动**
- `m1/model-lib.mjs` `scopeFor(chain, context)`：沿祖先链累积时，除角色事实外，**每个 `_expose` 声明的名字也进作用域**。取值 = **上下文注入的同名值**（后端已知态，design-basis §6 交互回路）；无注入时取"已声明未置位"的默认值（`multiple: true` ⇒ `[]`，否则 `undefined`）。链上**后者覆盖前者** ⇒ 最近声明的祖先链优先于外层与上下文默认（P1 方案 A）。
- `m1/render.mjs`：`scope = { ...ctx.values, ...scopeFor([...chain, node], ctx.values) }`（把上下文送进解析）；`m1/eval/metrics.mjs` 同步（否则保真分母与渲染不一致）。
- `m1/validate.mjs`：**恢复被删的 `checkNode(model, '', [])` 根调用**（F-040）。`_when` 里出现的名字必须能解析为角色事实 / `_expose` 名 / `vocab-context.json` 上下文名，否则阻断。

**构造断言（`node m1/eval/foundation-selftest.mjs`，全绿）**
```
ok   D1 unset selection ⇒ the gated block does not render
ok   D1 selected=[] ⇒ the gated block does not render
ok   D1 selected=[john] ⇒ the gated block renders
ok   D1 unset single expose ⇒ falsy
ok   D1 injected single expose ⇒ truthy
```
另：`grep -c 'Batch operations' /tmp/antd-none.html` = **0**，`/tmp/antd-sel.html`（注入 `selected` 非空）= **1**。

**read 了哪张图**：`/tmp/s-antd-bulk.png`（antd 模型 `.group.g-bulk`，注入两个选中行）——看到 "Batch operations apply to every selected row." 与两枚控件 "Delete selected"/"Invite selected"。**块出现了**（D1 的病灶已消）。
⇒ 但同时也看到 **F-042**：`Delete selected` 带 `when: role == "admin"`、`role` 未注入，**仍然渲染**——条目级 `_action.when` 从不求值（独立缺陷，本轮不修，已记 `failures.md`）。

## 3. D2 · `_rel.compare` 与位置无关

**语义（写进代码注释）**：一个对照单元 = 一组 ≥2 个被标为对照实体的条目。
- 集合节点上的 `_rel.compare` ≡ "它的成员是对照实体"（位置无关：同一组实体，标记打在集合上或打在成员上，产物相同）；
- 成员是**唯一**被标记者且它自己就是集合（"标记说的是我的成员"）⇒ 不算对照单元，由它自己处理（避免同一个标记在两个层级重复成组）；
- 成表条件：≥2 个成员、每个成员有名字（`_name`/`_title`，作列头）、没有成员是控件（`_expose`）、**至少有一个可对照属性**（`_fields` 键 / 角色事实 / 子节点，排除进表头的 `_name/_title/_tag/_price/_subtitle/_summary`）；
- 成不了表 ⇒ **显式降级理由**（`no-comparable-attribute` / `member-has-no-name` / `member-is-a-control` / `fewer-than-2-entities`）写进审计输出，再按普通集合渲染。**`render` 的 HTML 仍是纯函数**（`renderWithAudit` 单独收集理由）。
- 删除 `.compare` 网格 CSS（那正是"会换行"的违反项）；实体自己的动作控件进表头（`itemExtra`），避免进表后丢控件（F-033 同族）。

**构造断言**（全绿）
```
ok   D2 marker on the collection ⇒ comparison table
ok   D2 marker on the entities ⇒ the same comparison table
ok   D2 position-independent ⇒ byte-identical body          ← 同一模型两种标记位置，HTML 逐字相同
ok   D2 entities with no comparable attribute degrade explicitly  ← degradations=[{reason:no-comparable-attribute}]
ok   D2 every curated compare marker is a table or an explicit degradation
```

**全库结果**：对比表 **1 → 13**（`airbnb 1 · aliyun-product-ecs 1 · apple-home 2 · ipad-air 3 · macbook-air 3 · iphone-17 1 · bilibili 1 · stripe-pricing 1`），全部来自模型声明、非启发式。

**显式降级清单（pipeline 每轮打印）**
```
· aliyun-com/product-ecs · n=4 · no-comparable-attribute     (instances：属性只有 _summary/_price，二者进表头)
· apple-com/home · n=9 · no-comparable-attribute             (services：9 个入口只有 _name + _action)
· apple-com/macbook-air · n=2 · no-comparable-attribute      (sizes：只有两个尺寸名)
· apple-com-cn/iphone-17 · n=5 · no-comparable-attribute     (颜色集)
· apple-com-cn/iphone-17 · n=4 · no-comparable-attribute     (颜色集)
· apple-com-cn/iphone-17 upgrade-compare · n=6 · no-comparable-attribute (换新四项只有名字)
```
4 处 `_rel.compare` 标记打成 20 处 → 13 表 + 6 降级单元（两个成员标记落在同一组时合成一个单元）＝ 全覆盖。

**read 了哪张图**
- `/tmp/s-bili-0.png`（bilibili 首页对照表）：列=5 个视频，行=UP主/播放/弹幕/时长，横向可滚、不换行。**技术上成立**，但语义上是"视频流"被当成"对照实体"——**策展问题**（见 §6）。
- `/tmp/s-ipad-1.png`（ipad-air `_lines[5]`）：列 = `11” model / 13” model / True Tone / P3 wide color / Full lamination`，行=detail。**这张是错的**：该集合把"两个型号"和"三条显示特性"混在一起 ⇒ 模型标记不当（应只把 11"/13" 两个型号作实体）。同样是策展问题，不是引擎问题。

## 4. D3 · 删除引擎侧金额算术

**改动**：删除 `render.mjs` 里 `f.key === '_amount' && node._price && f.value.money > node._price.money ⇒ 删除线` 分支，以及随之悬空的 `.fact.was` 样式。`_amount` 现在按普通事实渲染（`fmt` 里 `qualifier` 仍然照原文打印，那是模型显式声明，不是计算）。
**构造断言**（全绿）
```
ok   D3 the renderer compares no money values              ← /\.money\s*[<>]/ 不匹配 render.mjs
ok   D3 `_amount` facts still render (as plain facts)      ← mi/search-earbuds 全部 _amount 金额都出现
ok   D3 no strike-through branch survives                  ← 无 class="fact was"
```
**代价（如实记）**：mi 系列的"原价"不再有删除线视觉信号（ml 页 `<del>` 的语义丢失）；保留它只能靠引擎算数，故宁可少一个删除线。**保真未掉**：`_amount` 的值照旧渲染（构成断言第 2 条即为此设）。正确的重获方式是策展侧用显式事实表达（见 §6）。

## 5. 校验器（F-040）与模型侧删除（F-041）

- `m1/validate.mjs`：恢复根调用；`m1/eval/validate-selftest.mjs` 新增 **10 条断言（8 拒 + 2 接受）**全绿：
```
ok   rejects: unknown reserved-style key / dangling _primary / _when names an undeclared fact /
     _expose with an unknown value type / _rel.order outside the closed enum /
     role value that is not a closed typed value / a storyline group with no _intent /
     _action verb outside the vocabulary
ok   accepts: a minimal legal page / _when naming a declared exposure
校验器自测: 10/10 通过
```
- `m1/eval/pipeline.mjs`：每轮跑 ① `validate.mjs` 全模型 ② `validate-selftest` ③ `foundation-selftest`，任一失败 ⇒ pipeline 失败（并打印 `显式降级清单`）。
- 9 个模型缺陷按裁定**删除**非法/悬空声明：5 处悬空根 `_primary`、4 处对象形式 `_primary`、1 处 `order:"hot"` 的 inert `_rel`。
- **渲染零变化验证**：对 9 个文件逐一 `git show HEAD:<file> > /tmp/head.json` → 渲染 → 与当前渲染 `diff` ⇒ **9/9 字节相同**（含引擎改动在内）。

## 6. 未修 / 采集待办 / 需要人类决策

**未修（记 ticket，不在 M4-a 范围）**
1. **F-042 条目级 `_action.when` 从不求值**（`renderControls`/`itemExtra` 路径）：D1 构造断言顺带挖出的独立缺陷；修它要先定"上下文未注入时条件名的默认判定"（deny 还是 allow）。证据：`/tmp/s-antd-bulk.png` 里 `role=="admin"` 的控件照样出现。
2. **策展 ticket：按语义重新声明 `_primary`**（指主**事实**，不是节点）。本轮只删除非法声明、不发明指向。
3. **策展 ticket：`_rel.compare` 标记复检**——`bilibili-com/home.feed`（视频流当对照实体）、`apple-com/ipad-air._lines[5]`（两个型号 + 三条特性混成一个对照集）、`apple-com/ipad-air._lines[9]`（三条相机规格）、`apple-com/home._lines[4].tv`、`apple-com/macbook-air._lines[2]`。引擎已如实呈现声明；错的是声明本身。
4. **策展 ticket：mi/airbnb 的"原价"重新表达**——用源站自己的文案（如 mi 的划线价）声明为显式事实（`qualifier` 或独立事实），而不是让引擎猜"更大的金额 = 原价"。

**采集待办（沿用 M4-a.4，未实现，仅登记）**：exemplar 层 0 个 `<table>`（28 页全在 support 层）；14/36 exemplar 有"查看更多"但仅 4 页建模分页；`passport-baidu/login` 是唯一真实登录页且不在 exemplar 36 内 ⇒ M4 的 `table`/`login` 原语要先补 exemplar 样本。

**需要人类决策**
- P1/P2/P3 三条 provisional 裁定仍待用户确认；本轮的实现严格按其字面执行：P1 = "链上最近声明 > 上下文注入，注入值即暴露名的当前值"。
- 强行把"一个标记"同时读成"成员是实体"和"自己是实体"的边界规则（D2 里"唯一被标记者且自己是集合 ⇒ 不算单元"）是本轮为兼容 `iphone-17` 的对照表而定的工程规则，请复核是否符合语义直觉。

## 7. 纪律与流程

- 单片超时（本轮约 80 分钟，超出 40 分钟分片纪律）：主因是 F-040 的发现与裁定往返 + D2 的一处误判回退。**教训**：D2 的"位置无关"要先用 `iphone-17` 的既有对照表做回归锚点，再动分组规则。
- 未动 `corpus/`；未从截图转写文字；未引入 HTML/CSS 逃生口（降级理由只进审计输出，不进 HTML）；未 git 提交。
- **已知流程坑已避**：改 HTML 后跑了 `pipeline --shots`，36 张截图与 HTML 同版本（画廊 `v=muoc7bce`）。

## 8. 门禁原文（`node m1/eval/pipeline.mjs --shots`）
```
[pipeline] 渲染 36/36 | 错误 0
[pipeline] 保真 1.00: 36/36
[pipeline] 模型校验: 42 个全通过
[pipeline] 校验器自测: 通过
[pipeline] 地基自测(D1/D2/D3): 通过
[pipeline] 显式降级清单（compare 标记但成不了对比表）:
[pipeline] · aliyun-com/product-ecs · n=4 · no-comparable-attribute
[pipeline] · apple-com/home · n=9 · no-comparable-attribute
[pipeline] · apple-com/macbook-air · n=2 · no-comparable-attribute
[pipeline] · apple-com-cn/iphone-17 · n=5 · no-comparable-attribute
[pipeline] · apple-com-cn/iphone-17 · n=4 · no-comparable-attribute
[pipeline] · apple-com-cn/iphone-17 upgrade-compare · n=6 · no-comparable-attribute
[pipeline] 地基自测: 全部通过
dup-title: 华为磁吸手机支架 - 华为官网
· sspai-com-home.html                           dup-source-true(info):2

视觉自查: 36/36 干净
[pipeline] 截图 36 张, 画廊 v=muoc7bce
```
（`dup-title: 华为磁吸手机支架` 与 `sspai-home dup-source-true` 是既有的源站真实重复，标 `info`，不计硬缺陷，与本轮改动无关。）

M4A_DONE d1=done d2=done d3=done fidelity=36/36 audit=clean
