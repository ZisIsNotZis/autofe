# 修复报告 · 轮 10（退化对比表规则 + 验收遗留 3 条 minor）

写入者：轮 10 实现者（唯一写入者）。范围：`m1/**` + `.scratch/**`（未动 `corpus/`、未动 `tools/capture/`、未 git 提交）。
输入：`verification-3.md`（第 6 轮独立验收，PASS + 3 minor）、`rounds.md` 共同纪律。
硬限：40 分钟；每片先落盘。

---

## 片 0 · 侦察量测（先于改动）

写了探针 `/tmp/probe.mjs` 复算**全库**对比集的表指标（口径 = `compareRowKeys` + 单元格是否有值）。库内 4 张对比表（airbnb/aliyun/stripe/iphone）实测：

| 集合 | n 列 | 行键 | 填充率 | 共享行（≥2 实体有值） | 位置行 `_items[i]` |
|---|---|---|---|---|---|
| airbnb `reviews.aspects` | 6 | `_rating` | 1.00 | 1 | 0 |
| aliyun `instances` | 4 | `cpu`,`memory` | 1.00 | 2 | 0 |
| **stripe `plans`** | 2 | `_detail`,`_text`,`_items[0..3]` | 0.50 | **0** | 4 |
| **iphone-17 `which-iphone`** | 2 | display…ai,`buy`,`_items[0..4]` | 0.91 | 9 | 5 |

关键分辨：
- **stripe**：`_detail`/`_text` 只有实休①有值，`_items[0..3]` 只有实体②有值 ⇒ **没有任何一条被两个实体共享的属性行** ⇒ 空壳。
- **iphone-17**：真实属性行（显示屏/芯片/摄像头/电池/Apple 智能）两列都有值，表本身成立；缺陷在**颜色行按 `_items[i]` 下标配对**（薰衣草紫 ↔ 蓝）。
- **airbnb 只有 1 条共享行但填充率 1.00**，是被验收接受的合法最小对比表 ⇒ 论证见片 1。

→ 结论：退化判据须分两种信号（空壳 / 低填充），且 `_items[i]` 位置行不是"可比属性"。

## 片 1 · 引擎退化规则（`m1/render.mjs`）

### 判据（论证）
任务建议「填充率 < 0.4 **或** 有效行数 < 2」。按片 0 量测：
- **填充率阈值取 0.4**：库内合表格的填充率分别为 1.00 / 1.00 / 0.91，退化表 0.50；0.4 落在两者之间且留有余量（半填充即不再算表）。用构造集验证 0.38 触发、1.00 不触发。
- **「有效行数 < 2」不能直接采用**：`airbnb reviews.aspects` 是**只有 1 条有效行**（`_rating`）但**填充率 1.00**、被第 6 轮验收明确接受的合法最小对比表。若按 `< 2` 一刀切会误伤它。故把「有效行」定义为**被 ≥2 个实体同时声明值的属性行**，退化为**空壳**的判据是 `sharedRows === 0`（一条共享行都没有，哪怕每格都填了字，如 stripe 的两列各说各话）。这与任务「有效行数 < 2」的**意图**（剔除空壳表）一致，且不误伤单行满填充表。
- **`_items[i]`/`_lines[i]` 位置行不是可比属性**：按下标对齐两个无关列表是「配对」不是「对照」（iphone 颜色 薰衣草紫↔蓝）。此类键不再进 `compareRowKeys`；实体的嵌套集合渲染在**该实体自己的列内**（`<th class="cmp-col">` 的新 `.cmp-nested` 容器），不再丢事实。

### 实现
`compareRowKeys` 跳过 `isPositionalKey`；新增 `compareHasCell`/`compareStats`（填充率 + 共享行）；`compareSetVerdict` 依次判：
`fewer-than-2-entities` → `member-is-a-control` → `member-has-no-name` → `no-comparable-attribute` → **`degenerate-no-shared-attribute`** → **`degenerate-fill-rate:<rate>`**。
后两者即 pipeline「显式降级清单」与 D2 并列的新理由。`renderCompareTable` 头部为每个实体追加其嵌套集合（`selectForm` 选形，颜色 ⇒ chips）。

### 构造断言（`m1/eval/foundation-selftest.mjs`，新增 D2b 四条）
```
ok   D2b a sparse set (no shared attribute row) does not become a table
ok   D2b a dense set (shared attributes) becomes a comparison table
ok   D2b a thin table (fill < 0.4) degrades with its fill rate
ok   D2b nested collections are not index-paired rows (colors stay in their column)
ok   D2 every curated compare marker is a table or an explicit degradation
显式降级清单（compare 标记但成不了对比表）:
  · stripe-com/pricing · n=2 · degenerate-no-shared-attribute
地基自测: 全部通过
```
（同时修了 D2 清单核对器对**无 `_key` 集合**的匹配：原先 `d.key === c._key` 对无键集合恒假，过去因这些集合都成了表而侥幸通过。）
