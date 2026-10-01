# 轮 32 修复报告（证据一致性门禁 + 三处回归）

唯一写入者：worker。改动文件：`m1/eval/pipeline.mjs`、`m1/render.mjs`、`m1/axis.mjs`、
`m1/eval/axis-selftest.mjs`、`m1/vocab-role-labels.json`、`docs/m1/layout-axes.md`、`m1/failures.md`。
未改模型/`corpus/`；未新增保留键/语法；未 git 提交。重跑 `--shots` 重生成了 `m1/curated/renders/*.{html,png}` 与 `index.html`、新增 `manifest.json`。

## 1.（P0）证据一致性门禁：截图必须与 HTML 同源

四名终审独立发现提交的 `renders/*.png` 比对应 `.html` 旧（旧样式：默认蓝下划线标题）。

- `--shots` 结束写 `m1/curated/renders/manifest.json`：每页 HTML 的 **sha256+mtime**、PNG 的 **sha256+mtime**，生成时间，
  以及画廊 `index.html` 的**版本号 v** 与哈希。
- 新增 `--check-shots`：逐页断言 manifest 的 **HTML 哈希 = 当前 HTML 哈希** 且 **PNG 不旧于 HTML**；不一致 ⇒ **退出码 1 并点名页面**。
- **默认（非 `--shots`）模式也跑同一检查**：HTML 更新了但没重出图 ⇒ pipeline 直接失败。
- 配套：`m1/render.mjs` 的 CLI 写盘改为**幂等**（逐字节相同则不写），否则每次默认 pipeline 都会 bump HTML mtime，让 mtime 断言永远为假。

验收（构造“改 HTML 不重出图”）：

```
$ printf '\n<!-- tamper -->\n' >> m1/curated/renders/airbnb-com-room-28871.html
$ node m1/eval/pipeline.mjs --check-shots ; echo exit=$?
[pipeline] 证据一致性（PNG ⇄ HTML）: 失败 1/42 页（HTML 更新了但截图未重出）
   ✗ airbnb-com/room-28871 — html changed since shots
exit=1
$ cp -p /tmp/airbnb-tamper.bak m1/curated/renders/airbnb-com-room-28871.html   # 恢复
$ node m1/eval/pipeline.mjs --check-shots ; echo exit=$?
[pipeline] 证据一致性（PNG ⇄ HTML）: 通过（42 页, 画廊 v=muoznlcd）
exit=0
```

## 2a. airbnb：「共享」不再被提为实心主 CTA

- **改前**（HEAD HTML）：
  `<div class="controls"><span class="action-plain">共享</span><span class="ctl" data-verb="operate">添加至心愿单</span></div>`
- **改后**（当前 HTML）：
  `<div class="controls"><span class="ctl" data-verb="operate">共享</span><span class="ctl" data-verb="operate">添加至心愿单</span></div>`
- 规则：主 CTA **只由承诺型动词认领**（`buy`/`preorder`/`add-to-cart`/`submit`）；无承诺型动词 ⇒ 整行无主 CTA，全部次要；
  单控件不算“主次选择”，维持原形状。写入 `docs/m1/layout-axes.md §4.1 rule 2/3`；断言 `axis-selftest.mjs` J0–J3。
- 截图：`.scratch/32-fix/2a-airbnb-controls.png`（两枚描边胶囊，无实心块）。

## 2b. bilibili：不再把播放/弹幕标成「数量/规格」

- **改前**（HEAD HTML）：`… · <span class="role-label">数量</span> 20.2 万 · <span class="role-label">规格</span> 155`
- **改后**（当前 HTML）：`啊力解说 · 09-15 · 20.2 万 · 155`（首页文件内「数量/规格」出现次数 = 0）
- 规则：`axis.quantityLabel` 的自动前缀集只保留**语义无歧义**角色（`_rating`→评分、`_rating-count`→评价数、`_stock`→库存；
  `_price` 金额格式自带）。`_count`/`_measure` 是通用计数，**默认不加**，除非模型显式给 `_label`；二者仍可作数据表列头。
  写入 `vocab-role-labels.json` 的 `$comment` 与 `layout-axes §9.3`；`failures.md F-072`。
- 截图：`.scratch/32-fix/2b-bilibili-card.png`（meta 行无角色标签）。

## 2c. huawei「推荐信息」：不再折叠丢图/丢动作

- **改前**（HEAD HTML）：`<h2>推荐信息</h2><div class="accordion"><details class="qa"><summary>华为助力…</summary><div class="qa-a">…</div></details>…`（4 条，**0 图 0 链接**）
- **改后**（当前 HTML）：`<h2>推荐信息</h2><section class="block"><article…><h3>…</h3><div class="fact"><span class="val"><img src="…tianjin-binhai…"></span></div><div class="fact">…</div><a class="action verb-open" href="…">了解更多</a></article></section>…`
  （4 条，**4 图 4 链接**；`<details>` 计数 = 0）
- 规则：`selectForm` 的 accordion 分支要求成员**既无 `_image` 也无 `_action`**；带图/带动作的标题+详情集渲染为**纵向区块序列**
  （不是网格：内容图比例各异会触发 T-105 image-variance，而裁掉差异被 §7.1 禁止）。真 FAQ 仍走 accordion。
  写入 `layout-axes §9.6`；`failures.md F-073`；断言 `axis-selftest.mjs` I0–I2。
- 截图：`.scratch/32-fix/2c-huawei-featured.png`（4 张卡片各有图与「了解更多」）。

## 3. 复验

`node m1/eval/pipeline.mjs --shots`（exit 0）：

```
[pipeline] 保真 1.00: 42/42
[pipeline] Markdown 目标: 渲染 42/42 | 保真 1.00: 42/42
[pipeline] 模型校验: 48 个全通过
[pipeline] 校验器自测: 通过
[pipeline] 地基自测(D1/D2/D3): 通过
[pipeline] 度量自测(F-052): 通过
[pipeline] 文本目标自测(F-031): 通过
[pipeline] 轴一致性自测(F-031 三目标): 通过        (93 条断言)
[pipeline] Markdown 目标自测(F-031): 通过
视觉自查: 42/42 干净
[pipeline] 截图 42 张, 画廊 v=muoznlcd
[pipeline] 证据清单 renders/manifest.json 已写（42 页, v=muoznlcd）
[pipeline] 证据一致性（PNG ⇄ HTML）: 通过（42 页与截图同源, 画廊 v=muoznlcd）
```

看图 ≤6 张：本报告 3 张（airbnb / bilibili / huawei），均取自当前 HTML 与当前 CSS。
