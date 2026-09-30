# 独立验收（第 9 轮）· 验收对象：轮 13/14/16（证明强度 / 诚实性）

独立视角，不采信修复者自述。基线：HEAD = `8542a7e`（image honesty accepted）。
时间纪律：≤30 分钟，≤3 张裁切图。每项完成即替换本节状态。

## 骨架与状态

| # | 项 | 状态 |
|---|---|---|
| 1 | 门禁自跑 + 策展页渲染 body 未变（剥 `<style>` 对比） | ✅ 通过 |
| 2 | 度量可被证伪（awsm 删两处 `每 GB $0` ⇒ 保真<1 + 点名路径 + 对照朴素口径） | ✅ 通过 |
| 3 | 图片守卫（全库 grep 无 `src=""`/`src="undefined"`；空 src 模型 ⇒ 无 `<img>` + alt 可见） | ✅ 通过（1 minor：陈旧草稿仍含） |
| 4 | 抽取器 src 配对独立复核（2 页） | ✅ 通过 |
| 5 | 留出集改善抽样（10 页 broken-img 方向 25→3） | ✅ 方向一致 |

图片预算：本轮 0/3。

## 1. 门禁与回归（策展页 body 未变）

**门禁原文**（自己跑 `node m1/eval/pipeline.mjs`，EXIT=0，13s）：

```
[pipeline] 渲染 42/42 | 错误 0
[pipeline] 保真 1.00: 42/42
[pipeline] 模型校验: 48 个全通过
[pipeline] 校验器自测: 通过
[pipeline] 地基自测(D1/D2/D3): 通过
[pipeline] 显式降级清单（compare 标记但成不了对比表）:
[pipeline] · stripe-com/pricing · n=2 · degenerate-no-shared-attribute
[pipeline] 地基自测: 全部通过
[pipeline] 度量自测(F-052): 通过
dup-title: 华为磁吸手机支架 - 华为官网
· sspai-com-home.html                           dup-source-true(info):2

视觉自查: 42/42 干净
```

✅ 与修复者（轮 13/14/16 报告 §5/§7 收尾门禁）一致：42/42 保真 1.00 · 48 模型 · 三套自测（度量 F-052 / 校验器 12 断言 / 地基 D1/D2/D3+F-042+F-055）· 视觉自查 42/42 干净。降级清单仅 `stripe-com/pricing` 一条（既有、非本轮引入）。

**策展页渲染 body 未变（独立复核）**：`/tmp/verify6-strip-all.mjs` 把 `m1/curated/renders/*.html` 的 `<style>` 块剥掉后与 `git show HEAD~3:<path>` 逐字节比对：

```
pages compared=73 body-identical=72 diffs=1 [ 'index.html' ]
raw byte deltas (cur-HEAD~3): [ 0, 216 ]
```

- **72/73 页 body 逐字节相同**（唯一 DIFF 是 `index.html` 画廊索引：版本串 `v=muolqy7n → v=muon3tn6`、coverage 数字重算；它是导航产物，不是策展页本体）✅
- **raw 字节差集合恰为 {0, 216}**：每张页正文 +216B = 轮 16 新增的唯一一条 `.img-alt` CSS 规则；正文零变化 ⇒ 图片守卫没有改变任何既有输出 ✅
- 抽读的 5 页（aws / aliyun / ipad-air / taobao / stripe）剥 style 后长度分别逐字相等（4758/2865/18441/33386/38013）✅

**判定：✅ 通过**（门禁自跑与自述一致；策展页 body 未被轮 13/14/16 改动，唯一新增是 style 里的 `.img-alt`）。

## 2. 度量可被证伪（轮 13/14）· 独立构造反例

**方法**（全部在 `/tmp/verify6/`，未碰仓库）：
1. `node m1/render.mjs m1/curated/aws-amazon/ec2-on-demand.json /tmp/verify6/aws-clean.html` 自己重渲，确认 `每 GB $0` 单元格恰 **2** 处（`data-transfer` 表的「所有传入数据」行 + `region-egress` 表的「Amazon CloudFront」行，单元格含限定词「每 GB」）。
2. `sed 's|<td>每 GB $0</td>|<td></td>|g'` 删掉这两处（仅值，不动限定词）。
3. 跑当前 `metrics.mjs`；再用 `git show HEAD~3:m1/eval/metrics.mjs`（轮 13 版，未含轮 14 边界规则）跑同一篡改页作对照。

**结果**：

```
clean    当前 metrics:  factsTotal=155 factsRendered=155 factFidelity=1.00   missing=[]
tampered 当前 metrics:  factsTotal=155 factsRendered=153 factFidelity=0.987
   missing = [ "data-transfer._items[1]._fields.data-transfer-price := \"0\"",
               "region-egress._items[0]._fields.egress-price := \"0\"" ]

tampered HEAD~3(轮13口径，无边界规则): factsRendered=155 factFidelity=1.00  missing=[]   ← 盲
```

- ① **保真 < 1.00**：0.987 = 153/155 ✅
- ② **点名两条 `_fields` 路径**：`data-transfer._items[1]._fields.data-transfer-price` 与 `region-egress._items[0]._fields.egress-price`，逐字与报告 §5 一致 ✅
- ③ **对照朴素子串口径**：直接跑 HEAD~3（轮 13）的真 `metrics.mjs`（分母已含 `_fields` 的 155 项，故差异**只可能是匹配规则**）在**同一篡改页**上仍报 **1.00 / missing=[]**。另用独立写的旧 `norm`（小写+解实体+删空白标点）复核：篡改页仍含 `0`（幸存上下文 `...oxbodymargin0font16px16s`——正是样式表里的 `margin:0`）⇒ 朴素口径误判为 1.00 ✅

**判定：✅ 通过**。门禁**现在能失败**，且能精确点名被删的两格；同一反例在旧口径下仍然通过。这是"不会失败的门禁不是门禁"从口号变成事实的直接证据。

## 3. 图片守卫（轮 16）

**构造实验**（`/tmp/verify6-guard.mjs`，直接调 `render()`，不经文件）：

| 构造 | `<img>` 数 | 空/undefined src 的 `<img>` | 字面 `undefined` | `.img-alt` 可见文本 |
|---|---|---|---|---|
| 单值 `{image:'', alt:'x'}` | **0** | false | false | true |
| 单值 `{image:undefined, alt:'y'}` | **0** | false | false | true |
| 列表值全无 src（MIRROR SHOT/SECOND SHOT） | **0** | false | false | true（两条 alt 均保留） |
| 列表值 2 条有 src | **2** | false | false | 逐字 `https://e/a.png`/`b.png` |
| 正常单图 | 1 | false | false | 逐字 src |

- 空 src ⇒ **无 `<img>` 且 alt 以可见文本出现**：实测输出 `<span class="img-alt">VISIBLE ALT TEXT</span>`，无 `<img` ✅
- 列表值回归：无源 ⇒ 无 `<img>`、alt 全保留（旧渲染器会 `src="undefined"` + 丢 alt）；有源 ⇒ 恰好 N 个 `<img>` ✅

**全库 grep（精确定位实际 `<img … src=""/src="undefined">` 标签）**：

- **实时产物零命中**：`m1/curated/renders/*.html`（排除 `auto-`）= **0** 个文件含空/undefined src；抽样的 10 张留出集渲染页（见 §5）`badImg` 也全为 **0** ✅
- **陈旧提交产物仍命中**：`m1/extract/tmp/*.auto.html`（如 `ant-design--components-form.auto.html` 157 个、`linear-app--home.auto.html` 29 个）与 `m1/curated/renders/auto-*.html` 仍含 `<img src="">`。
  - 它们是 **9/28 旧渲染器 + 旧 `--eval` 的遗留快照**（时间戳 Sep 28 19:41，未被 `pipeline.mjs` 重生成；`git status` 干净、已提交）；`audit-visual.mjs:14` 明确 `!f.startsWith('auto-')` 排除它们，故不影响实时门禁。
  - **判定：minor（陈旧制品卫生，非轮 16 引入）**——字面“全库 grep”不成立，但**实时输出**的守卫成立。
- `corpus/**/dom.html` 亦含 `src=""`（源站原样），属捕获事实、不计入。

**判定：✅ 通过（带 1 minor）**。

## 4. 抽取器 src 配对的独立复核（2 页）

独立方法（`/tmp/verify6-src.mjs`，不采信抽取器自述）：
- **方法 A**：正则解析 `corpus/<k>/dom.html` 的 `<img …>` 序列，取 `src` 属性、解实体、按 `meta.json.url` 绝对化。
- **方法 B**：把 `<base href="meta.url">` 注入 dom.html 副本，真浏览器 `document.images[].src`（playwright，与抽取器代码路径无关）。
- **实数**：`extractPage()` 直接导入运行，收集模型里所有非空 `image` 值。

| 页 | dom `<img>` | A(正则) | B(浏览器) | A==B | 抽取器 src 数 | 抽取器 src 不在 B 列表 | imageJoin |
|---|---|---|---|---|---|---|---|
| gitee/mirrors-org | 22 | 22 | 22 | ✅ | 1 | **0** | ok (398 元素, 20/20) |
| juejin-cn/home | 14 | 14 | 14 | ✅ | 11 | **0** | ok (883 元素, 13/13) |

- 两种独立方法集合**完全一致**；抽取器产出的每一个 src 都能在真浏览器解析出的 URL 列表里找到（**0 缺失**）✅
- 抽取器实际产出的 `_image` 少（gitee 1、juejin 11）与 dom 的 `<img>` 多（22/14）不矛盾：页头 logo/图标未被产出为事实（§16 报告已解释）；**已产出的**均对得上。

**判定：✅ 独立复核通过**（src 与真实源一致，无错配）。

## 5. 留出集改善的抽样验证

**留出集定义**（照抄报告）：`corpus/**` 里已抓取、但 `tier !== 'exemplar'` 的页面。实测 **69** 页，与报告一致。

抽样 10 页（按名排序等距 `step=floor(69/10)`，`/tmp/verify6-holdout2.mjs`），逐页 `extractPage → render → audit-visual`：

| 页 | `<img>` | 空/undefined src | `_image` 事实 | 无源 `_image` | audit 硬缺陷 |
|---|---|---|---|---|---|
| aliyun-help/ecs-instance-families | 0 | 0 | 0 | 0 | dup-title+dup-content |
| ant-design/components-table | 0 | 0 | 128 | **128** | dup-title×3 |
| arco-design/components-form | 2 | 0 | 2 | 0 | dup-title+dup-content |
| cloud-tencent/docs-cvm | 1 | 0 | 1 | 0 | 无 |
| cnblogs/blog-cmt | 0 | 0 | 0 | 0 | 无 |
| echarts/examples | 0 | 0 | 0 | 0 | 无 |
| element-plus/input | 0 | 0 | 0 | 0 | 无 |
| getbootstrap/example-checkout | 0 | 0 | 0 | 0 | 无 |
| gitee/oss-profile | 0 | 0 | 0 | 0 | 无 |
| juejin-cn/user-712139234359182 | 4 | 0 | 4 | 0 | 无 |

- **broken-img 命中页 = 0 / 10**（审计无任何 `broken-img:` 标记）✅ 方向与报告“25 → 3”一致（3/69≈4.3%）。
- **空/undefined `<img>` = 0**（10 页合计）；`ant-design/components-table` 有 **128** 个无源 `_image` 事实，旧渲染器会输出 128 个 `<img src="">`（broken-img），现渲染 **0 个 `<img>`**（退化为 alt 文本）——这正是“修前 vs 修后”同一输入的对照，方向成立 ✅
- 3 页的 `dup-title`/`dup-content` 正是报告判为 **info（源站本就重复）** 的类别，非 broken-img，非回归 ✅

**判定：✅ 方向一致**（样本 0/10 broken-img；无源图事实被正确退化而非渲染成破图）。

## 新发现缺陷

- **minor-1（陈旧制品，非轮 13/14/16 引入）**：`m1/extract/tmp/*.auto.html` 与 `m1/curated/renders/auto-*.html` 仍含 `<img src="">`（9/28 旧渲染器快照）。实时门禁已排除，但“全库 grep 无空 src”字面不成立。建议：删除或重生成这批 `auto-*` 陈旧产物。

## 回归与纪律

- 未改仓库任何文件（唯一写入本报告）。未碰 `corpus/`、未 git 提交、未 `git add`。中间物全在 `/tmp/verify6/`。
- 未改 `m1/**`。门禁自跑 EXIT=0。
- 图片预算：**0/3**（本 5 项均可用文本/程序化对照完成，不需要读图）。

## 总体判定

**PASS**（0 blocker / 0 major / 1 minor）。5 项全部执行，无跳过。核心结论（独立复核）：
1. **门禁**：自跑 `pipeline.mjs` EXIT=0 → 42/42 保真 1.00 · 48 模型 · 三套自测 · 视觉自查 42/42 干净；策展页剥 `<style>` 后相对 `HEAD~3` **72/73 body 逐字节相同**（唯一 DIFF 是画廊 `index.html`，raw 字节差集合恰 {0, 216}=新增 `.img-alt`）。
2. **度量可证伪**：删 aws 两处 `每 GB $0` ⇒ 当前 metrics **0.987 (153/155) 且点名两条 `_fields` 路径**；同一篡改页在真 `HEAD~3`（轮 13）metrics 下仍报 **1.00**（朴素 `norm` 子串口径也报 1.00，因样式表 `margin:0` 内含 `0`）。
3. **图片守卫**：空 src 模型 ⇒ **0 `<img>`**、alt 变可见 `.img-alt` 文本、无 `undefined`；列表值回归修复（无源不丢 alt、有源逐张渲染）；实时产物零空/undefined src；发现陈旧 `auto-*` 快照仍含空 src（minor）。
4. **抽取器 src 配对**：正则解析与真浏览器 `img.src` 两法一致，抽取器 src **0 缺失**（gitee 1/1、juejin 11/11）。
5. **留出集**：69 页中抽 10 页，broken-img **0/10**，方向与 25→3 一致；无源图事实被正确退化。

VERIFY6_DONE verdict=PASS blockers=0 majors=0 minors=1 skipped=[]
