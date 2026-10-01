# 轮 47：复合元语 S0 + S1 报告

状态：**完成**（S1 全量；S0 按父代理裁定 done；gate 全绿）

## 范围与结果

| 项 | 结果 |
|---|---|
| S0.1 aws `data-transfer` 补齐缺列 | ✅ 7 行键集一致（`uniqFieldSets=1`），显式空白不编造 |
| S0 `_label` 占位拆分 | ✅ 语法/注册表槽（`_default`）就位；模型迁移按 §6.4 顺延 S4（见下"顺延"） |
| S1.1 注册表 `m1/composites.json` | ✅ 5 类型 / 29 槽，闭式 |
| S1.2 保留键 `_composite` | ✅（并含 §2.4 的 `_default`） |
| S1.3 校验器 `m1/validate.mjs` | ✅ `code` + 10 个 `E_COMPOSITE_*` + 2 个 `E_PATH_*` |
| S1.4 路径引用（§4 双命名空间） | ✅ 裸名=fact / 点或 `/` = 树路径（可穿祖先） |
| S1.5 自测 `m1/eval/composite-selftest.mjs` | ✅ 19 断言（14 拒 + 5 收） |
| S1.6 接入 pipeline 第 11 道 | ✅ |
| S1.7 文档 | ✅ `docs/m1/composites.md §9/§10` + `m1/failures.md F-089/F-089.a/b/c` |

## S0.1 的渲染 before/after（父代理要求的证据）

**中间态（只补列、未加共享判定）——错误**：
```html
<tr><td>数据自互联网传入 Amazon EC2</td><td></td></tr>
<tr><td>数据自 Amazon EC2 传出至互联网</td><td></td></tr>
```
**BEFORE（git HEAD = 补列前）与 AFTER（当前 = 补列 + 共享 `hasValue`）逐字节相同**：
```html
<tr class="row-group"><th colspan="2">数据自互联网传入 Amazon EC2</th></tr>
<tr><td>所有传入数据</td><td>$0 每 GB</td></tr>
<tr class="row-group"><th colspan="2">数据自 Amazon EC2 传出至互联网</th></tr>
<tr><td>每月前 10TB</td><td>$0.09 每 GB</td></tr>
```
（`before==after bytes: True`）

## 裁定 C 的落地（共享决策，非渲染器特例）

- `m1/axis.mjs#hasValue(v)`：`null`/`undefined`/空文本/空列表 ⇒ 无值；`num/money/bool`（含 0/false）⇒ 有值。
- `m1/axis.mjs#tableRowLabel(rp, it)`：某行唯一有值列是首列 ⇒ 源站分组行（轮 35 规则）。
- HTML（`render.mjs`）/文本（`render-text.mjs`）/Markdown（`render-md.mjs`）**三者都消费** `hasValue` + `tableRowLabel`；test/md 原对空值表现为空，对齐后无输出变化（已在报告说明）。
- 授权范围仅此一项，未改其他语义。

## 证伪（父代理要求）

临时把 `hasValue` 的空文本分支改成有值 → `axis-selftest.mjs` T0/T1/T2 **失败**（`待修 3`）；撤销 → `全部通过 (123 条断言)`。

## 最终门禁（`node m1/eval/pipeline.mjs --shots`，退出码 0）

```
渲染 42/42 | 保真 1.00: 42/42
Markdown 目标: 42/42 | 保真 1.00: 42/42
模型校验: 48 个全通过
校验器自测: 通过 · 地基自测: 通过 · 度量自测: 通过 · 文本目标自测: 通过
轴一致性自测(三目标): 通过 (123 条断言) · Markdown 目标自测: 通过
证据门禁自测: 通过 · 归属工具自测: 通过
采集↔模型一致性(F-078): 通过（41 页… 未命中 0）
采集一致性自测: 通过 · 图片不放大自测: 通过
复合元语自测(轮47 · 第11道): 通过 (19/19)
视觉自查: 42/42 干净
证据一致性（PNG ⇄ HTML）: 通过
```

## 与设计的差异（已入档）

1. `login.secret` 暴露类型取 `secret`（§5.4 写 `text`）——轮 46 闭式值类型 + 3 张登录页实测。
2. S0.2 的**模型迁移**顺延 S4：需渲染器把 `_default` 画成名称水印，与"不改渲染器"冲突且 6 个文件不在白名单；本轮仅备好语法+注册表槽。
3. S0.1 空格 = `{text:""}`（显式空），table 校验对空文本豁免类型检查。
4. `NOT_ALLOWED` 只把结构槽键当字段槽；`_label` 是通用角色事实，不算槽标记。

## 风险

- 零实例：本轮无模型声明 `_composite`，schema 尚未在真实语料上运行；S2–S6 会首次触发。
- `hasValue` 是新增共享判定；三目标一致性由 `axis-selftest` 的 `SHARED_NAMES` 反复发检查守护（已加入 `hasValue`/`tableRowLabel`）。
- aws 补列使该页 fidelity 分母 +2（空文本计为已渲染事实，`isRendered("")=true`），诚实性无损。
