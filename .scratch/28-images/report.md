# 轮 28：三页批量补图（worker，唯一写入者）

**范围**：只做 `apple-com/ipad-air`、`apple-com/macbook-air`、`apple-com-cn/iphone-17` 三页；
只改 `m1/curated/<site>/<page>.json` 与 `.scratch/**`。未碰渲染器/axis/corpus，无新语法，无 git 提交。

## 方法（照轮 26b，未重新发明）
- 复用 `.scratch/26-images/imgmap.mjs`（其 4 个函数逐字复制自 `m1/extract/extract.mjs`）读取
  `dom.html` + `nodes.json`，跑**整页 tag 一致性闸门**：`cleanedIndex` 与 `dom.html` 扫描 tag 序列必须逐项对齐，
  否则整页放弃（绝不猜 URL）。三页闸门**全部 ok**：
  - ipad-air `tags=2814 imgs=81 resolved=81 unattributed=0`
  - macbook-air `tags=2889 imgs=96 resolved=96 unattributed=0`
  - iphone-17 `tags=2876 imgs=68 resolved=68 unattributed=0`
- **内容图判据**：`corpus/<page>/nodes.json` 里 img 节点的 bbox，只取 `w ≥ 200 且 h ≥ 120`。
- **URL 绝对化**按 `meta.json` 的 `origin`（F-025）；未发明 URL、未从截图转写文字；抽检 3 条 URL 均 HTTP 200。
- **归属用证据核对**：不看索引先后。用「img 所属卡片的可访问文本 / 资产路径 slug」对齐模型条目
  （`/tmp/attrib.mjs`：对每张内容图回溯最近 `li/tabpanel/figure` 的段落文本）。
  再次验证 **DOM 顺序 ≠ 模型顺序**：
  - ipad-air highlights：DOM `li[1]`="iPadOS…"→`hl-ipados`、`li[2]`="Apple Intelligence…"→`hl-ai`
    （资产 slug 亦对上：`highlights/ipados`）；模型顺序里 `hl-ai` 在 `hl-keyboard` 前。
  - macbook-air/macbook-air macos：`os-spotlight`/`os-liquid-glass` 是 696×452，`os-control-center`/`os-translation` 是 372×452。
- **每节点一张代表图**：同一媒体块有 start/end/static 多帧时，取可见海报（role=image/img），动画关键帧跳过（见下）。

## 结果
### 1) apple-com/ipad-air（源站 98 `<img>`；nodes.json 81 img，74 张 bbox=1×1 未渲染）
内容图仅 **6** 张，全部回挂：
| 节点 | cleanedIndex | 证据 |
|---|---|---|
| root `_image`（页 hero） | 1058 | `hero/hero_endframe__…`，alt "iPad Air front and back view…" |
| `hl-ipados` | 1159 | 卡片文本"iPadOS and amazing apps…" + 资产 `highlights/ipados` |
| `hl-ai` | 1172 | 卡片文本"Apple Intelligence. Create…" |
| `m4._image` | 1430 | `chip/chip_top_endframe__…` |
| `size-11` | 1647 | `two-sizes/gallery-toggle/spin_reverse_endframe__…`（alt "…11 inch model…"） |
| `size-13` | 1667 | `two-sizes/gallery-toggle/spin_endframe__…`（alt "…13 inch model…"） |
新增 6；跳过 75（bbox=1×1 懒加载占位，源站未渲染；含"iPad Pro/Blue iPad Air"等未加载图）。

### 2) apple-com/macbook-air（源站 96；nodes.json 96 img）
内容图 35 张：**attached 19**，**skipped_with_reason 16**（12 动画帧 + 2 无模型节点 + 2 布局).
- root `_image`=1080（hero_static）；highlights `hl-m5/battery/ai/storage/macos/continuity`=1116/1128/1139/1148/1171/1180；
- `design._image`=1205；gallery `dg-15/dg-13-battery/dg-13-display`=1361/1371/1383；
- macos `os-spotlight`=1603、`os-liquid-glass`=1614；continuity `cont-clipboard`=1726；
- new-to-mac `ntm-setup/icloud/apps/durable`=1783/1793/1803/1815；`cam-center-stage`=1930。
跳过（reason）：
- 12 张 **动画关键帧**（`*_startframe`/`*_endframe`，role=presentation，与同块 static 海报重复）：hero 1068/1075、
  mx_chip 1104/1111、highlight-spotlight 1159/1166、macos-spotlight 1590/1597、continuity 1713/1720、center-stage 1917/1924。
- 2 张 **无对应模型节点**：2367（Apple at Work）、2384（Apple and Education）——模型 compare 区只收 `cmp-mba`/`cmp-mbp`，
  这两张路由卡不在模型内，按纪律不新增节点。
- 2 张 **T-105 布局冲突回滚**：`os-control-center`(1625,372×452)、`os-translation`(1636,372×452)。
  首轮挂上后 macos `.cards` 网格混排 696×452(h=207) 与 372×452(h=386)，比值 0.54<0.7 触发自查硬缺陷
  `img-variance`；故仅保留同高的 spotlight/liquid_glass（207/207），回滚这两张并记录原因。

### 3) apple-com-cn/iphone-17（源站 78；nodes.json 68 img）
内容图 16 张：**attached 11**，**skipped_with_reason 5**。
- root `_image`=1080（hero_startframe，页面折扇形 hero）；
- highlights `hl-display`=1147（`highlights/ceramic-shield/…`，卡片文本"屏幕更亮…超瓷晶面板"）、`hl-front-camera`=1177；
- `design._image`=1245（产品展示窗 viewer_display_endframe）；`front-camera._image`=1539（`cameras/…selfie_intro`）；
- front-camera modes：`mode-photo-center-stage`=1607、`mode-video-dual`=1627、`mode-video-steady`=1642、`mode-facetime`=1655；
- `lineup._image`=1786（`shared-features/hero_features_center`）；`benefits-upgrade`=2091（清点卡"新机年年换，超值更随心"）。
跳过（reason）：1083（hero 同帧 dup）、1281（viewer 第二状态 action_button，与 1245 重复）、1612（selfie start 帧）、
1780/1792（lineup 左/右合成帧）——共 5。

## 硬门禁（`node m1/eval/pipeline.mjs --shots`）
- 渲染 42/42 | **HTML 保真 42/42 (1.00)** | **Markdown 保真 42/42 (1.00)**
- 模型校验 **48 全通过**；七套自测全通过（校验器/地基 D1·D2·D3/度量 F-052/文本 F-031/轴一致性/Markdown）
- **视觉自查 42/42 干净**（首轮 macbook-air 1 处 `img-variance`，按上回滚后干净）
- 看图自查（读图 3 张渲染局部）：ipad-air hero、macbook-air hero+M5/续航/AI 卡、iphone-17 hero+显示屏卡
  **均真出图、尺寸合理、无裂图**；`grep 'src=""'` 三页均 0。

## 纪律
- `git diff`：三页模型**纯新增 `_image` 键**（147 行插入，0 删除），无删事实、无新语法、无 git 提交、无 staged 文件。
- pipeline 重生成的 `m1/curated/renders/*`、`m1/eval/m3-final.json` 已 `git checkout` 还原，工作树仅留三页模型改动 + `.scratch/28-images/`。

## 未做 / 局限（如实）
- ipad-air 内容图仅 6 张：该抓取 74/81 张 img 为 1×1（懒加载未渲染），是抓取局限，非技术障碍。
- macbook-air 的 Apple at Work / Education 两张路由卡无模型节点，未挂（未新增节点）。
- 动画帧与重复状态帧一律不挂（每节点一张可见海报）。
