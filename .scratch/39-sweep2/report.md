# 轮 39：修两条判据 + 继续系统性补图（唯一写入者 · 40 分钟硬限）

**范围（硬限）**：只碰 `m1/axis.mjs`、`m1/validate.mjs`、`m1/eval/*selftest*.mjs`、`m1/curated/**`、
`docs/m1/layout-axes.md`、`m1/failures.md`、`.scratch/**`。**不改 `corpus/`**，不新增其它保留键，看图 ≤8 张，不 git 提交。

## 计划（3 组任务）

1. **判据修正 A：榜单 vs 轮播用声明代替推断**
   - `axis.mjs` 新增闭式 `"rank"`（榜单：条目同类可排序 ⇒ 应编号且允许带图）；`"sequence"` 永不编号。
   - `rankedSequence(items, order) = order === 'rank' && items.length > 1`。
   - `validate.mjs` `_rel.order` 闭式枚举加 `"rank"`；`axis-selftest.mjs` 断言（rank+图 ⇒ 编号；sequence ⇒ 不编号；rank 无图 ⇒ 编号）。
   - `36kr-com/home` 的 `hot` 改 `order:"rank"` 并补回缩略图（imgmap 归属核对）。
   - `m1/failures.md` + `docs/m1/layout-axes.md` 记这次闭式枚举小扩展（理由：声明优于推断）。
2. **判据修正 B：卡片主视觉图下沿**
   - 内容图判据：卡片/列表条目主视觉图放宽为 `w≥100 ∧ h≥60` **且**为条目内最大图（排除头像/图标）。
   - 给 `bilibili-com/read-home` 补缩略图（头像不挂）。
   - 断言：条目内最大图 100×60 ⇒ 可挂；24×24 头像 ⇒ 不可挂。
3. **继续补图（差值降序，时间上限为止）**
   - 优先：`apple-com/iphone-16`、`aliyun-com/product-ecs`、`36kr-com/information-technology`、
     `36kr-com/search-ai`、`36kr-com/search-viz`、`mi-com/product-detail-mi15`。
   - 每页：改模型 → 追加报告（含归属证据）→ `--shots` 后 read 一次局部确认；同行图片高度方差过大 ⇒ 回滚该组。
   - 每页改完立刻 `node m1/eval/pipeline.mjs`（不必须 `--shots`）；保真下降 ⇒ 立刻回滚该页。

## 逐项结果（边做边追加）

### 1. 判据修正 A（rank）— 已完成

- `m1/axis.mjs`：`rankedSequence(items, order) = order === 'rank' && items.length > 1`（注释重写：声明优于推断）。
  `selectForm` 把 `rank` 与 `sequence`/`time` 同视为有序集合（不塌成一行 chip）。
- `m1/validate.mjs`：`_rel.order` 闭式枚举 → `sequence|time|rank|none`。
- `m1/eval/axis-selftest.mjs`：L0–L5（rank ⇒ 编号；rank+图 ⇒ **仍编号且带图**；sequence ⇒ 不编号；none ⇒ 不编号；
  hero(sequence) 无序号；declared leaderboard 同时出序号与 `<img>`）。
- `m1/curated/36kr-com/home.json`：`hot._rel.order: "sequence"` → `"rank"`；给榜首条目补回源站缩略图
  （来源 idx 1241，见下归属证据）。**渲染实测**：`<div class="deflist ranked">` + `<span class="rank">1</span>` … `<span class="rank">8</span>`
  且第 1 行 `<div class="defval"><img src="https://img.36krcdn.com/…de1e5eb7…">` ⇒ **既编号又带图**。
- 归属证据：`corpus/36kr-com/home` 闸门 `join state=ok tags=1423 imgs=43 aligned=1369/1369`；该图 `idx=1241`、`bbox 300×200`、
  容器 `a.hotlist-item-toptwo-pic`、最近 `<a href>`=`/p/3988151372036873`、源站 `alt` **逐字**等于模型 `hot._items[0]._name.text`；模型里 `hot._items[0]._action.to = https://36kr.com/p/3988151372036873` ⇒ 业务键（文章 id）相等。
- 该热榜在 DOM 里**只有 1 张图**（`a.hotlist-item-toptwo-pic`，榜首两位共用），其余 6 条源站本就无图 ⇒ 只补 1 张，不是漏图。

### 2. 判据修正 B（thumb floor）— 已完成

- **判据实现**：`.scratch/39-sweep2/mainvisual.mjs` —— `isMainVisual(box, siblings)`：`w≥100 ∧ h≥60`
  **且** 它是**该条目（同一最近 `<a href>`）内面积最大的图**。附 `--selftest`（6 条断言，全部通过）：
  - S0 条目内最大图正好 100×60 ⇒ **可挂**；
  - S1 24×24 头像 ⇒ **不可挂**（低于下沿）；
  - S2 真实 117×88 缩略图（与其 24×24 头像同条目）⇒ **可挂**；
  - S3 同条目内的 24×24 头像 ⇒ **不可挂**（它不是最大图）；
  - S4 90×60 即使是条目内最大图也低于下沿 ⇒ 不可挂；S5 两张内容图取最大者。
  命令：`node .scratch/39-sweep2/mainvisual.mjs --selftest` ⇒ `主视觉判据自测: 全部通过 (6 条断言)`。
- **补图**：`.scratch/39-sweep2/patch-mainvisual.mjs`（只当业务键相等才插 `_image`）对
  `corpus/bilibili-com/read-home` 运行：闸门 `join state=ok tags=840 imgs=38 aligned=770/770`；
  **19/19 条目全中，0 SKIP**，插入的全是 **117×88 缩略图，0 张 24×24 头像**。
- **归属证据**：每个条目 = 一个最近 `<a href>` = `//www.bilibili.com/read/cv<id>/`，模型 `_lines[i]._action.to` =
  `https://www.bilibili.com/read/cv<同一个 id>/` ⇒ **业务键（cv id）相等**；脚本按该键匹配，不按 DOM 顺序对位。
  `git diff` 核对：19 处 `_image` 均插在该条目自己的 `_measure` 之后、**同一条目的 `_action` 之前**（一条一行）。
- **不发明**：图片写源站 URL（`i2.hdslb.com/bfs/note|new_dyn/…@234w_176h_1c.webp`），未裁切/未合成；源站无 `alt` ⇒ 不造 `alt`。
- **取图通道**：`curl` ⇒ `200 image/webp 17686`（带/不带 Referer 均 200）⇒ 无需镜像进 `m1/curated/assets/`。
- **渲染实测**：该页 HTML 现有 19 个 `<img>`（改动前 0），均在各自条目内；同行图片高度方差：19 张全是 117×88 ⇒ 无方差。
  保真仍 42/42（HTML+MD），自查 42/42 干净。

### 3. 补图 — 已停（时间上限），共 **6 页 / 58 张**

> 口径：本表只统计**本轮新增**的 `_image`。`m1/curated/36kr-com/home.json` 的 `git diff` 里有 19 行 `_image` 新增，
> 其中 **18 行是轮 38 未提交的既有改动**（工作区起始状态），本轮只加了 **1 张**（hot 榜首）+ 1 行 `_rel.order` 改动。

机制：`.scratch/39-sweep2/patch-mainvisual.mjs`（复用轮 38 的 `imgattr.mjs` 闸门 + 轮 29 的栈式祖先 `<a href>` 归属）。
**只在“业务键相等”时插 `_image`**（不按 DOM 顺序对位）；已有 `_image` 的条目跳过；归属不唯一（同一条目内多张同大图）跳过。

| 页 | 插入 | 业务键 | 跳过及理由 |
|---|---|---|---|
| `36kr-com/home`（hot） | 1 | 文章 id（`/p/3988151372036873`） | 热榜 DOM 里**只有 1 张图**（`a.hotlist-item-toptwo-pic`） |
| `bilibili-com/read-home` | 19 | `cv<id>` | 19 张 24×24 头像（非条目内最大图，判据排除） |
| `36kr-com/information-technology` | 10 | 文章 id `/p/…` | 6× 64×64 企业号头像 + 12× 68×30 合作伙伴站标 + 二维码/logo |
| `36kr-com/search-ai` | 9 | 文章 id `/p/…` | 1× `staticx.36krcdn.com/…/static/code_production.png`（36氪APP 二维码，**站点 chrome**，`--exclude` 排除） |
| `36kr-com/search-viz` | 9 | 同上 | 同上 |
| `bilibili-com/home` | 10 | `BV<id>` | 2 SKIP：1 个条目内两张同大图（516×290.25，不唯一 ⇒ 不猜）+ 1 个 BV 不在模型 |

- 每页均为 **216×144 / 117×88 / 248×139.5 同尺寸**（或热榜单张）⇒ 无“同行高度方差过大”问题，无需回滚。
- 每页改完立即 `node m1/eval/pipeline.mjs` ⇒ 保真始终 **42/42（HTML）+ 42/42（MD）**、48 模型通过、自查 42/42 干净，无回滚。
- **未完成（时间到点，非技术障碍）**：按差值降序的剩余目标 —— `huawei-cn/consumer-phones(50)`、`mi-com/home(24)`、
  `mi-com/product-detail-mi15(21)`、`taobao-com/home(18)`（轮 38 已挂）、`aliyun-com/product-ecs(12)`、
  `36kr-com/home` 其余（无更多图）、`sspai-com/post-102392(9)`、`sspai-com/post-114699(9)`、`aliyun-com/home(8)`、
  `aws-amazon/ec2-on-demand(5)`、`stripe-com/pricing(4)`、`learn-microsoft/vm-sizes(2)`。
- 本轮**核实并放弃**1 页：`apple-com/iphone-16`（差值 13）——该页模型**没有任何 `_action.to`**（动作只有 `label`，是配置流程而非卡片列表），
  而拓到的 13 张候选是页面 chrome（1264×711 产品画廊、支付选项、`dd-column-header` 里**其它型号**的图）⇒ **无业务键可归属**，不做。
- 同样**未做**（无业务键）：`aliyun-com/product-ecs` —— 12 张候选全是帮助中心卡片/重复 banner/网站 ilustration，模型里只有
  `instances._items[*]._action.to = …/buy?spec=…`（无对应图）。

## 4. 看图计数（≤8 张硬限）

诊断 0 张 + 自检 0 张 = **0 张**。**如实说明**：本轮**未 read 任何图片**（工具预算在收尾前到达软上限），“每页 `--shots` 后 read 一次局部确认”
这一步**未执行**；确认改用（a）渲染后的 HTML 结构（`<img>` 计数与位置）、（b）DOM 归属证据（业务键 + 源站 alt/title）以及
（c）`--shots` 全量重生后的自查 42/42 干净 + 证据一致性通过。这是**证明强度的降级**，已在此明确登记。

## 收尾门禁（`node m1/eval/pipeline.mjs --shots`，全页）

```
[pipeline] 渲染 42/42 | 错误 0
[pipeline] 保真 1.00: 42/42
[pipeline] Markdown 目标: 渲染 42/42 | 保真 1.00: 42/42
[pipeline] 模型校验: 48 个全通过
[pipeline] 校验器自测: 通过 / 地基自测(D1/D2/D3): 通过 / 度量自测(F-052): 通过
[pipeline] 文本目标自测(F-031): 通过 / 轴一致性自测(F-031 三目标): 通过 / Markdown 目标自测(F-031): 通过
[pipeline] 证据门禁自测(哈希优先): 通过
.scratch/39-sweep2/mainvisual.mjs --selftest: 主视觉判据自测: 全部通过 (6 条断言)
视觉自查: 42/42 干净
[pipeline] 证据一致性（PNG ⇄ HTML）: 通过（42 页与截图同源, 画廊 v=mup7pq11）
```

八套自测全过；证据一致性通过；`git diff --cached` 为空（无 staged 文件）；未 git 提交（本轮禁提）。
`--shots` 重生 `m1/curated/renders/**`（含非本轮改动页的 PNG 随全量重截而变化）属任务要求的收尾步骤产物。

## 收尾门禁 — 待办
