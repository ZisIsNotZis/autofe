# 轮 34 · 布局 blocker 修复 + huawei 慢图镜像（唯一写入者）

限额 40 分钟；只碰 `m1/render.mjs`、`m1/axis.mjs`、`m1/curated/**`、`m1/failures.md`、`docs/m1/layout-axes.md`、`.scratch/**`。

## 0. 量出来的基线（playwright，视口 1280×900 = 证据截图口径）

`node .scratch/34-layout/measure.mjs <render.html>`（本轮新增探针）：

- `mi-com/home`：10 条 `<figure class="strip">` 全部 **x 110..1170（宽 1060）**，视口宽 1280 ⇒ **左右各 110px 白边**（与 g3 的「约 107px」一致）。
  页面高 4779px，**y 3360..4780 全白（1420px ≈ 30%）** ⇒ 页尾 30% 空白复现。
- `mi-com/product-detail-mi15`：hero 图同宽 1060（左右各 110px）；y 840..1580 的内容 **最右只到 x≈400**，右 2/3 全白（半页空白复现）；尾部死白 80px。

## 1. 页尾 30% 空白的来源 = **裁切图自身是纯白像素**（不是布局 bug）

逐张资产量（`PIL`，阈值 luminance<235 的暗像素占比 + 暗像素包围盒）：

| 资产 | 尺寸 | 暗像素占比 | 包围盒 |
|---|---|---|---|
| mi-home-band1 | 1440×664 | 19.8% | 0..1437 × 0..618 |
| mi-home-band2..7 | 1440×608 | 19.0–81.0% | 有内容 |
| **mi-home-band8** | 1440×608 | **0.00%** | **none** |
| **mi-home-band9** | 1440×608 | **0.00%** | **none** |
| **mi-home-band10** | 1440×608 | **0.00%** | **none** |

三张图是**整幅纯白**（唯一色 `(255,255,255)`，875520px 全白）——它们是 `corpus/mi-com/home/full.png` 里
**源站自己的空白空洞**（y≈4400–6360，逐行采样实测该区间非白像素占比 0.000）被原样裁进来的。
⇒ 按任务给的判据「空白在裁切图自身的像素里 ⇒ 重裁到内容边界」，**重裁结果是空集**（该区域没有任何像素内容），
因此如实处置是**从模型里移除这三条空图带**，并把「源站采集空洞」记进 `m1/failures.md`（见 §5）。

## 2. mi15 hero 资产与源站真图的逐像素比对（进行中，结论先落盘）

- 现资产 `m1/curated/assets/mi15-product-hero.png` **逐字节等于** `corpus/.../full.png` 的 crop(107,957,1226×799)（`ImageChops.difference` bbox = None ⇒ 完全相同）。
- 该 crop 对应的**源站真图 URL** 由 `dom.html` 的详情首图给出：
  `https://cdn.cnbj1.fds.api.mi-img.com/mi-mall/9104b0b8236cf51d5c3c27f9722130cd.jpg` → 实测 **HTTP 200、502647 B、0.49s**，真图尺寸 **1226×799**（与 crop 同尺寸）。
- 与真图比对：`max|Δ|>60` 的像素 **13050 个**（占 1.3%），分布 x 0..1225 / y 0..744 ⇒ 差异同时含 **JPEG 压缩差**与**源站浮层像素**；
  结论：**crop 里确有源站浮层（UI 徽标）像素**（g3 证据成立），处置 = **换成源站真图（逐字节镜像到 assets）**，不做任何裁切/重编码。

## 3. 修完后的量测（playwright，视口 1280×900 = 证据截图口径）

| 页面 | 图带 x 区间 | 余白 | 结果 |
|---|---|---|---|
| `mi-com/home` | 7 条全部 **0..1280（宽 1280）** | `tailDead=92px` | 满幅 ✓，无 30% 空尾 ✓ |
| `mi-com/product-detail-mi15` | hero **0..1280** | `tailDead=92px` | 满幅 ✓ |
| `grafana-play/play-home` | 无图 | `tailDead=486px` | 面板内容缺失 ⇒ 见下 |
| `huawei-cn/consumer-phones` | hero 在旗舰卡内（卡宽 110..1170）、理由/机型图 3 列（123..441/481..799/839..1157） | `tailDead=119px` | 14 张全部本地、无裂图 ✓ |

`scrollWidth == clientWidth`（无横向溢出）。**≤80px 空尾**判据：三页 `tailDead` 均为 92px（= `main` 80px 下内边距 + 12px 外边距）。

### 看图（3 张，预算 ≤6）
- `mi-com/home` 成品：图带**贴到页面左右缘**，末尾 Smart Band / Sound 2 Max 两条带之后直接到页尾，**无 30% 死白**。
- `mi15` 成品：hero 已是**源站 CDN 原图**（逐字节镜像）。
- `grafana` 成品：11 个面板名现在是**等格清单**（不是 1..11 编号目录）。
- 对照裁切（第 3 张）：**源站真图自身左下就带那三枚角标**（下方=镜像的 CDN 原图，与上方成品同一处像素一致）

## 4. mi15 角标的真正结论（与 g3 的表述不同，必须如实纠正）

g3 认为「hero 图内左下三枚源站浮层徽标」是**截图派生像素**。本轮验证：把这枚图**换成源站 CDN 原图**
（`9104b0b8236cf51d5c3c27f9722130cd.jpg`，1226×799，sha256 两次抓取一致，502647 B 逐字节镜像）后，
**角标依然在**——即三枚角标（支持 小米澎湃智联 / 已接入 米家APP / 支持 小爱同学控制）**是源站这张营销图自身的内容**，
不是采集污染。⇒ 已去除「截图派生」这一层（图现在是源站的字节原样），但**不能在不裁掉源站自身内容的前提下抹掉角标**；
任务给的第三条路「重裁到不含 UI 的区域」需要切掉该图底部约 15%（属删除源站内容）⇒ 未做，留作决策项。

## 5. grafana：判定 = **抓取里确实没有面板内容**（只记录，不转写）

- 证据：`grep -c 'Loading plugin panel' corpus/grafana-play/play-home/dom.html` ⇒ **1**（该 DOM 是单行文件）；
  `grep -o … | wc -l` ⇒ **2 处**；`nodes.json` 里 80 处提到该 loading 文案，**纯数字节点 0 个**
  ⇒ 11 个 stat 面板的**数值一个都没被采集到**。按任务判据：「面板名清单」是能诚实表达的全部。
- 处置：`renderSeq` 对「≥6 项、每项只有名字」的序列改渲染为 `.manifest` 等格清单（编号会把清单读成目录，F-077）；
  **未从截图转写任何面板数值/底色**；采集缺口记入 `m1/failures.md` F-075。
- 遗留（如实）：页面内容仍只占首屏上部，底部约 486px 是空白——**根因是面板数据缺失**，不是排版；补数据属采集侧。

## 6. huawei-cn/consumer-phones：8 张慢 JPEG 已用镜像补上

镜像（curl 一次成功，未裁切/未重编码/未合成；其中 `battery.jpg` 二次抓取 sha256 一致，验证字节等价）：

| 资产 | 源站 | 字节 | 实测耗时 |
|---|---|---|---|
| hw-hero-mate-xt-2.jpg | kv-mate-xt-2-ultimate-design-pc.jpg | 593818 | 58.1s |
| hw-reason-camera.jpg | camera.jpg | 355153 | 34.1s |
| hw-reason-design.jpg | design.jpg | 355806 | 34.1s |
| hw-reason-reliable.jpg | reliable.jpg | 88204 | 8.1s |
| hw-reason-ai.jpg | huawei-phones-ai.jpg | 89533 | 8.1s |
| hw-reason-battery.jpg | battery.jpg | 134463 | 13.1s |
| hw-product-mate-x7.jpg | mate-x7.jpg | 380379 | 37.1s |
| hw-product-mate80-rs.jpg | mate80-rs-ultimate-design.jpg | 153220 | 15.1s |

**8/8 到齐**（每张 <120s，未触发放弃条件）。挂载点：`flagship._image`（hero）、`why._items` 5 条理由行
（影像/设计/可靠性/AI/续航；**隐私**源站只有 1×1 占位 base64，如实不挂）、`catalog-mate` 里只有慢 .jpg 的两条机型
（Mate X7 / Mate 80 RS 非凡大师）。渲染后 `imgs=14`、无裂图、理由行与机型行按源站一致。

## 7. 收尾门禁（全部改动在位时跑）

```
node m1/eval/pipeline.mjs --shots
[pipeline] 渲染 42/42 | 错误 0
[pipeline] 保真 1.00: 42/42
[pipeline] Markdown 目标: 渲染 42/42 | 保真 1.00: 42/42
[pipeline] 模型校验: 48 个全通过
[pipeline] 校验器自测: 通过 / 地基自测: 全部通过 / 度量自测(F-052): 通过
[pipeline] 文本目标自测(F-031): 通过 / 轴一致性自测(F-031 三目标): 通过 / Markdown 目标自测(F-031): 通过
[pipeline] 证据门禁自测(哈希优先): 通过
视觉自查: 42/42 干净
[pipeline] 证据一致性（PNG ⇄ HTML）: 通过（42 页与截图同源, v=mup1gvwk）
```

## 8. 未完成 / 局限

1. **mi15 的「右半页空」只做到部分**：hero 现在满幅（左右白边消失），但 hero 以下的购买信息仍是**左列窄行**
   （页高 840–1580 区间最右只到 x≈400，右半仍白）。要变成「左图右购买面板两栏」需要**新的模型/轴信号**（新保留键）
   ——任务禁止新增语法，故**未做**，如实报告为残留，建议父代理决定是否授权一个「商品详情双栏」信号。
2. **mi15 详情长图未补**（源站 20 张，采集时未绘制）——补进去会引入采集未验证的 ~2 万像素内容，且截图会大到 20MB 级，未做。
3. **grafana 底部 486px 空白**（根因：面板数据缺失）。
4. mi15 角标是**源站图自带**，未抹（见 §4），是否裁掉源站内容需授权。
