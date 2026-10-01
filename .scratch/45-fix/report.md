# 轮 45 修复报告

时间预算 40 分钟硬限。目标：禁止放大 + 补齐图片缺口 + 热链本地化。

## 1. 不放大规则（renderer，全局）— DONE

- **改动**：`m1/render.mjs` 图像规则由 `width:100%;height:auto` 改为 `width:auto;max-width:100%;height:auto`
  （`img` 全局 + `.fact img`/`.cards img`/`.cards .item img`/`.run .item img` + `.promo-image img` + `.strip img`）。
  显示宽 = `min(naturalWidth, 容器宽)`；自然宽 ≥ 容器仍铺满，自然宽 < 容器按自然尺寸，绝不放大、不裁内容。
- **文档**：`docs/m1/layout-axes.md §7.1` 重写为「保持比例且**绝不放大**（轮 27 + 轮 45）」，含实测数据。
- **构造断言**：`m1/eval/no-upscale-selftest.mjs`（新）——构造 200px 宽图 + 1000px 容器，Chromium 实测显示宽 ≤200。
  回归验证：把 `.fact img` 改回 `width:100%` ⇒ FAIL（实测 677px）；恢复 ⇒ PASS（200px）。
- **实测（playwright 1280 视口）**：
  - `bilibili-com/read-home` 封面 `234×176 → 234×176`（改前 `677×509`）；页面总高 **14394 → 8060px**；放大张数 19 → 0。
  - `bilibili-com/home` 516→677 放大也修正；`mi-com/home`(7)、`huawei-cn/consumer-phones`(51)、`36kr-com/search-*`(9) 放大 0。

## 2. apple-com/iphone-16 — DONE（0 → 10 图）

用**修正后**的 `m1/eval/imgattr.mjs`（dangling=0）枚举 13 个 ≥120px 候选；源站**无锚点**、alt 长于标题 ⇒ M1/M2/M3 均不命中，
按**源站 bbox y 序 + alt 文案**手动挂载（同 y 带 1:1）。补 10 张，全部 `curl -r 0-0` 验 200/206 后**逐字节镜像**：

| 位置 | 源站 | 依据 |
|---|---|---|
| 根 `_image`（主视觉） | idx3 1264×711 `iphone-16-finish-select` | alt=「iPhone 16, all five finishes…」 |
| `services._image` | idx22 1070×481 `services-iphone` | alt=「Apple TV, Apple Music…」 |
| `inbox._items[0..1]` | idx19/20 `…witb…` | alt=「iPhone 16…」/「USB-C to USB-C cable…」 |
| `recap._image` | idx17 380×256 `…ultramarine-select…` | alt=「iPhone 16, Ultramarine…」 |
| `compare._lines[0..4]` | idx23/28/32/36/40（均 y=5202） | 与 5 行标题（iPhone Duo/18 Pro/Air/17/17e）1:1 |

渲染 `<img>` 0 → 10；保真 **122/122**；视觉自查干净（无放大、无裂图）。跳过源站 120×143 空 alt 小图（归属不明）。

## 3. aliyun-com/product-ecs — DONE（0 → 1 图）

- 主视觉 1 张：`O1CN01rdFGco…tps-4640-2448.png`，源站 alt=「云服务器 ECS」= 页面标题，bbox 1111×586，位于标题正下方（y=1558）。
- 渲染 `<img>` 0 → 1；保真 **38/38**；自查干净。
- **跳过**：源站 6 张 696×400「价值卡」图 alt 全为 generic `img`、卡数与模型 `values` 4 项不一致 ⇒ 不挂（宁可少图不留错挂）。

## 4. 36kr-com/search-ai & search-viz — 复核：非缺口（9/9 可挂）

- 终审「9/25」把 25 个 **img 节点**当成 25 张结果图。实为：每页 **9 个 `<img class="scaleBig">`**（结果缩略图，直接 src）
  + **11 个 `<div class="kr-default-img-no-logo scaleBig">` 占位块（无 src）** + partner logo（68×30）与 `36氪APP` 图标（120×120）。
- 两页模型各已挂 **9/9 可挂内容图**（`grep '<img class="scaleBig"'`=9；model `results._items` 带图=9）。**不补**（补 logo 才是错挂）。
- 每张 URL 与源站逐条一致（未新增，故未镜像）。

## 5. 镜像

`mirrored=11`：apple-16 ×10 + aliyun-ecs ×1，全部 `curl` 验可达（200/206）后逐字节镜像到 `m1/curated/assets/`，
模型改引用 `../assets/<name>`。既有热链（36kr/bilibili）未动 ⇒ 登记为残余风险。

## 6. 收尾验证

- `node m1/eval/pipeline.mjs --shots` ⇒ 见下方命令输出。
- 新增 `m1/eval/no-upscale-selftest.mjs`（可证伪）；既有九套自测全过。

## 未完成 / 残余

- 36kr/bilibili **既有**远程热链未本地化（本轮口径仅「新挂的图」）。
