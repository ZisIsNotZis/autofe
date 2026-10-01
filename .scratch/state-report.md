# AutoFE 现状报告（回归速览 · 5 分钟）

> 生成：2026-10-01 17:58 CST · HEAD `29701fb`（S5 accepted）· 唯一写入者 = 状态汇总者。
> 本文件内容由**只读检索 + 只读命令**写成（§7 全部只读，故§7 不含 `pipeline.mjs`）；未改 `m1/**` 语义、未提交 git。收尾按纪律另跑过一次 `node m1/eval/pipeline.mjs --shots` 确认全绿（见文末验收），**不作为本报告数字来源**。
> 凡标「未核实」= 无文件/命令背书。其余数字均有报告或本机只读命令背书（§7 给出原命令）。
> 覆盖旧版（2026-10-01 06:42 · HEAD `71959b4`）。

---

## 1. 一页速览

- **系统形态**：一份**业务元语（蓝图）** → 由**服务端引擎**投影成前端形态。当前交付元语层（M1）：一份模型（`m1/curated/<site>/<page>.json`）经**唯一决策层 `m1/axis.mjs`**，渲染到 **3 个目标**——HTML（`m1/render.mjs`）、纯文本（`m1/render-text.mjs`）、Markdown（`m1/render-md.mjs`）。三渲染器**只 import `axis.mjs`、互不 import**；模型语义 token（`_rel/_when/_expose/_fields/_primary/_empty/_items/_lines/_action`）在渲染器代码里出现 **0 次**（剥注释后本机实测，§7）。
- **一条命令跑门禁**：
  ```bash
  node m1/eval/pipeline.mjs [--shots]
  ```
  = 渲染 42 页 → 3 目标事实保真 → 模型校验 + **11 道自测** → 视觉自查 →（`--shots`）截图 + 画廊 + 证据哈希清单。退出码 0 = 全过（约 1 分钟；`--shots` 约 3 分钟）。
- **当前数字**（本机只读命令实测，§7）：
  - **42 页** exemplar（`m3-scale.json` exemplar=42；`m1/curated/**/*.json`=42）
  - **4077 条事实**（`Σ facts` 分母 = 4077；分子亦 4077）
  - **保真 42/42 = 1.00（HTML + Markdown 双目标各 42/42）**
  - **27 个复合实例覆盖 16 页**（search 8 / table 13 / login 3 / paginator 2 / form 1）
  - **模型校验 48 个全通过**；**警告 10 条可见**（8 `W_COMPOSITE_NAME_ONLY_WATERMARK` + 2 `W_COMPOSITE_ROWS_TOO_FEW`）
  - **11 道自测**全绿：校验器 13/13 · 地基 49 · 度量 20 · 文本 13 · 轴一致性 135 · Markdown 20 · 证据哈希 8/8 · 归属工具 13 · 采集一致性 17/17 · 图片不放大 6 · 复合元语 32/32
  - **采集↔模型一致性**：42 页 / 4077 事实 / 参与判定 3661 / **未命中 0** / 白名单（转换）37 / 采集缺口 4
  - 视觉自查 42/42 干净

---

## 2. 已完成的自主推进（按主题，不按时间流水）

**① 视觉缺陷闭环**：4 份视觉复核归档 **12 blocker / 31 major / 52 minor**；6 个 blocker 根因族全清；期间一次**独立验收判 FAIL**（抓到自引入的回归 F-037）→ 修复 → 复验 PASS（0 blocker / 0 major）。新增 unit-stack / dup-title 两条防回归自查。

**② 校验器空转（重大发现）**：`validate.mjs` 的根调用自某提交起被删，节点级检查长期是**死代码**（坏模型也判 `ok`）——"42/42 校验通过"曾长期是**空真**。处置：恢复根调用 + 新增 `validate-selftest`（坏样例必须被拒）接门禁，并据此挖出并修掉 9 处被掩盖的模型缺陷。教训：**不会失败的 gate 不是 gate**。

**③ M4-a 地基修复**：D1 `_expose` 作用域进求值 + `_when` 硬校验；D2 `_rel.compare` 位置无关（13 表 + 显式降级清单）；D3 删除引擎侧价格算术（违反"定价永远在后端"）。

**④ 模型说真话**：删 16 处错误 compare 标记、删 30 处非法 `_primary`、实体/属性分层；**55 个异质 `_items` 集合**逐一给结论（6 改 `_lines`、6 有判据保留、1 豁免），并把"`stack` 混了语义不可比与表现太富两种原因"写进 `layout-axes.md`。

**⑤ 采集补样本**：robots 预检 + 节流 + 只增不改，新增 **6 个 exemplar 页**（gov.uk 表 / 阿里云帮助 / AWS EC2 价目 / stripe·小米·github 登录），7 条拒绝如实记录；使 `table`、`login` 在**模型层**各达 **3 站点**（M4 证据门槛）。

**⑥ 门禁诚实性**：**分母补 233 值**——`_fields` 的 `money`/`list` 此前不进保真计数，修复后全库事实 3739 → **4077**，保真仍 42/42；**匹配边界化**——事实匹配从"朴素子串包含"改为"可见文本 + 原始偏移边界感知"，门禁从"删两个 `$0` 仍报 1.00"变为**报 0.987 并点名路径**。

**⑦ 同构架构 `axis.mjs`**：写第 2 目标（纯文本）时只能靠"重抄轴决策"通过，暴露 12 处语义泄漏 → 抽出 `m1/axis.mjs`（两渲染器 42 页字节不变）→ 写第 3 目标（Markdown）仍被迫重推 11 处节点级知识 ⇒ 收进 `nodePlan`（三渲染器语义 token **140 → 0**）。判定最终为 **`holds（已行使路径）`**（轮 24 把角色标签词汇声明化 + 行标签链上移进 axis，并加 `axis-selftest` G 段门禁 + 一次证伪）。

**⑧ 复合元语（Schema 式，M4-b）**：按用户裁定把"宏/展开"改成 **Schema 式复合元语**——5 个闭式类型、实例用 `_composite` 声明、校验器按 schema 逐项判定，缺必需槽 = 硬错误。落地：注册表 `m1/composites.json`（5 类型/槽位带 `role ∈ state|field|pointer`）、错误码 + **警告通道**、双命名空间点路径、第 11 道自测（`composite-selftest` 32/32）。迁移 **27 实例 / 16 页**，逐类型进度与未迁移原因见 `docs/m1/composites.md §9.5`。唯一渲染变更 = taobao 搜索框补回抓取里**真实存在**的 `aria-label`（此前策展丢失）。

---

## 3. 证明强度现状（11 道自测 + 2 道非自测门禁）

**11 道自测**（pipeline 每次全跑；`--shots` 另含证据哈希门禁）：

| # | 门禁 | 断言数 | 本机实测 | 已做「证伪」测试？ |
|---|---|---|---|---|
| 1 | 校验器自测 `validate-selftest` | 13 | 13/13 ✅ | ✅ 坏样例必须被拒（F-040 空转教训的产线化） |
| 2 | 地基自测 `foundation-selftest` | 49 | 全过 ✅ | ✅ 构造断言：旧渲染器/旧口径跑同输入**必须失败**（D1/D2/D3/F-051/F-042/F-055） |
| 3 | 度量自测 `metrics-selftest` | 20 | 全过 ✅ | ✅ 断"缺一格 ⇒ 保真 <1"、"样式表/类名不替数字作证" |
| 4 | 文本目标自测 `text-selftest` | 13 | 全过 ✅ | ◐ 归同构一致性装置（见 #5/#6） |
| 5 | 轴一致性自测 `axis-selftest` | 135 | 全过 ✅ | ✅ **反重新推导**：向渲染器注入 `const comparable=…` / `_rel.compare` 探针 ⇒ **FAIL**；G 段行标签证伪、U/V/T 段各一次反转证伪 |
| 6 | Markdown 目标自测 `md-selftest` | 20 | 全过 ✅ | ✅ **三目标一致性**：让 md 表头丢弃 `_summary` ⇒ **FAIL**（报多处不一致） |
| 7 | 证据门禁自测 `shots-selftest` | 8 | 8/8 ✅ | ✅ **哈希优先**：PNG ⇄ HTML 双向 sha256；改码不重拍必被点名（轮 44 复核独立确证 11/11 哈希一致） |
| 8 | 归属工具自测 `imgattr-selftest` | 13 | 全过 ✅ | ✅ 闭合标签必须入栈/弹栈（该 bug 曾致 7 张图错配被拒，F-078 线） |
| 9 | 采集一致性自测 `capture-integrity-selftest` | 17 | 17/17 ✅ | ✅ 门禁本身必须能失败（构造未命中 ⇒ 必报；阈值为 0 时构造 1238 ⇒ 报） |
| 10 | 图片不放大自测 `no-upscale-selftest` | 6 | 6 过 ✅ | ✅ 回归 `width:100%` 立即 FAIL（实测被量到 677px） |
| 11 | 复合元语自测 `composite-selftest` | 32 | 32/32 ✅ | ✅ 拒例 fixture 全覆盖；S3/S4/S5 各做一次反向证伪（放宽 verbs / 反转画控件规则 / 标错 role → 断言失败，已撤销） |

**2 道非自测门禁**：**模型校验**（`validate.mjs`，48 模型全 `ok`，警告不阻断）+ **采集↔模型一致性**（`capture-integrity.mjs`，未命中 0，第 9 道门禁）。

> **谁执行的证伪**：第 3/5/6/7/9/10 道有明确"反向证伪已做"的文字记录；其中**父代理亲手**证伪过的（度量删 `$0` → 0.987；视觉审计门禁对合成脏页实测可得 `empty-anchors:1 …` ⇒ 0/1 干净，证明它会失败）在旧报告 §3 有记。**逐道的"执行者"在 `failures.md` 未逐条署名** ⇒ 标「未核实」。门禁**可失败性**本身均有构造断言背书（可核查）。

---

## 4. 诚实清单（每条一句 + 影响）

- **复合元语未迁移**：候选未迁移 **10 人次**（table 1 / login 0 / search 1 / paginator 1 / form 7）；**落到任何类型之外的不同节点只有 4 个**——`aws…data-transfer`（设计推迟，非缺陷）、`mi-com/search-earbuds`（无输入节点 ⇒ 语义不匹配）、`gov-uk…pagination`（被分页集合不在模型 ⇒ **采集缺口 + 缺必需槽**，不放宽 `_ref`）、`sspai…discussion`（评论框非检索、`form` 无对应槽）。**逐条依据见 `docs/m1/composites.md §9.5`**。另有 §6.3 的"**不该升级**"清单（19 个裸 `_expose` / 商品卡列表 / apple 配置器 / 弹幕登录入口 / 面包屑 / `offer` 41 价）——那是**防逃生口**，不是欠账。
- **`isomorphism` 现状 = `holds（已行使路径）`**（不再是 `partial`）。**残余**（轮 24 登记，均不在 42 页上触发或属画法差异）：① HTML 选择表的列标签仍走域字段词典 + 空（未接角色词汇）；② HTML 数据表在"无任何列标签且无行内操作"时**省略表头行**，文本/MD 恒打表头行——列标签本身已共享，这是"画不画空表头行"的表现差异；③ 8 个形态各自的画法不同（元素/对齐/GFM 记号），本就是"一对多"的应有之义。**影响**：无产物分歧落在已行使路径上；残余未来合法模型可达。
- **截图非确定性（F-057）**：模型/渲染器未变时 `aliyun-com-home.png` 仍可能字节变化。**影响**：不影响门禁（保真看 HTML/模型），但提交的证据图会漂移、diff 噪音变大。
- **37 条白名单转换**：`capture-integrity-allow.json` 里 **37 条 `conversion`**（聚合/推导/分期文案/时间格式化/正文编辑性改写），每条带 `reason`。**影响**：这 37 个事实**不是逐字**可溯源——任何"逐字照抓取"类宣称必须带此限定语。
- **4 条采集缺口**：`linear-app/home` 3 处客户 logo 品牌名（疑内联 SVG/背景图未渲染为文本）+ `sspai-com/post-114699._author`（作者区为头像 + 链接，抓取无文本）。**影响**：已声明、待采集，非编造。
- **远程热链残留**：42 页 HTML 里的 `<img>` 大量指向远程 CDN（本机实测：`cdn.cnbj1.fds.api.mi-img.com` 50 · `img.36krcdn.com` 43 · `www.apple.com` 34 · `img.alicdn.com` 26 · `i2.hdslb.com` 25 · `consumer.huawei.com` 19 …）。**影响**：离线时这些 `<img>` 会变裂图（渲染器的**可复现性风险**，非模型缺陷）；证据哈希通过说明**当前**网络可达。
- **`F-054` 度量残余**：度量**路径无关**（同页同值两格，一格真缺也报已渲染）+ 字母紧贴数字（`ID0` 里的 `0`）仍算命中。**影响**：可掩盖低概率的"两格之一真缺"与个位数字缺失。
- **未核实项**：
  1. 各道门禁"证伪执行者"的逐条署名（见 §3 注）——**未核实**。
  2. `README.md` 顶部状态段落**已过期**（仍写"47 模型 / M4 行为改进 await `_macro` 决策"）；本轮写入白名单不含 README ⇒ **未更新**，以本报告与 `composites.md` 为准。
  3. `docs/m1/composites.md §6.1` 的现状盘点表（42 页"23 站"、`_expose` 57 等）是**更早口径**，与 §9.5 的最终账口径不同——引用时须注明。

---

## 5. 待用户拍板（读 `.scratch/decisions-for-user.md`）

> **该文件的 D-1…D-6 已全部裁定**（2026-10-01 用户远程口头）；**无仍未决条目**。逐条如下（**已裁定 + 结论**）：

| 条目 | 状态 | 结论（落地口径） |
|---|---|---|
| D-1 `_macro` 保留键 | **已裁定** | **否决"macro"命名，改为 Schema 式复合元语**：闭式类型 + schema 逐项校验，缺必需字段 = 类型错误；不叫 macro、不做恒等展开 |
| D-2 复合字段能否被下游引用 | **已裁定** | **允许**，且要**路径访问**（`form.size`、`search.query` 可被 `_when`/`_action.when` 引用）；secret 暂不特殊保护（记后续可选加固） |
| D-3 无标签输入框的受控标签来源 | **已裁定** | **允许闭式词表标签 + `_label` 可覆盖**；"标签→水印"降级是引擎编排决策 |
| D-4 是否继续扩 exemplar 站点 | **已裁定** | **先不扩样本**，把现有页面做完美优先（质量优先于覆盖扩张） |
| D-5 三条 provisional 语法裁定 | **已裁定** | 无异议（P1 `_expose` 作用域优先级 / P2=D-2 / P3 散文合并走引擎修法，维持） |
| D-6 金额字形与精度 | **已裁定** | **币种是标准枚举（进元语）；字形/精度属呈现层/品牌层（M5）**；`USD→$` 不再是"偏差"，而是**默认品牌风格**，只需声明化 |

> **另**：`docs/m1/composites.md §8` 的三条**设计层**问题 D-A（注册表扩展政策）/ D-B（search 与 form 边界）/ D-C（严格 schema 与既有语料冲突）**未单独拍板**，均已**按建议的 A 落地**——全局闭式 / 保持拆分（单查询位=search、≥2 字段=form）/ 硬错误 + 修模型。如需改口径，重做成本低但需另开轮（§9.5 已记）。

---

## 6. 建议的下一步 3 个选项

**选项 A（推荐）——清空"已知局限"清单，把每条规则都变成可失败门禁**：落地 D-6 的呈现层声明化（币种字形/精度可配置，不再隐式 `USD→$`），并逐个关闭已登记的小证明洞——F-054（度量路径无关 + 字母紧贴数字）、F-042（条目级 `_action.when` 从不求值）、F-053（表格格级链接无表达位）。
- 收益：把 §4 的诚实清单显著缩短；每条规则都有"能失败"的门禁背书；与已就位的 `axis.mjs`/自测装置直接衔接（边际改动小）。
- 代价：涉及 `validate.mjs`/`axis.mjs`/渲染器的**受控**语义变更，需重新跑全门禁 + 逐处 before/after。

**选项 B——补证据面**：`aliyun-help/ecs-instance-families` 有界策展（第 43 页，224 表 / 0 `<th>` / 76 类列标签），给 `table` 的"无表头 / 两列"语义补一张验收案例；顺带把 `offer`（41 价格节点）升为类型。
- 收益：补齐 `table` 语义边界证据；`offer` 从"角色事实"进到"可校验声明"。
- 代价：76 类列标签会触发**词表爆炸**（或实质是手搓 table 原语）；采集可达性受限；**与 D-4 的"先不扩"裁定有张力**，需用户点头才动。

**选项 C——做可用性实证**：把三目标产物接成可交付组件/SSR 原型，验证"引擎在浏览器里跑"（`design-basis §6`）。
- 收益：从"能渲染"进到"能用"，检验运行期确定性与性能。
- 代价：大工程，且**游离于当前元语里程碑之外**；此时做会分薄 M1 收尾动力。

**推荐 A**：它是唯一能**同时**兑现"每条规则都有可失败门禁"与用户 D-6 裁定（呈现层声明化）的路径，边际改动最小、验证装置已就位。

---

## 7. 如何自证（本轮实跑的只读命令 + 输出摘要）

> 按纪律**未跑 `pipeline.mjs`**；下列命令均只读（`node` 自测只做内存断言，不写仓库）。

**① 规模 / 保真 / 分母**
```
$ jq -r 'group_by(.tier)[]|"\(.[0].tier): \(length)"' m1/eval/m3-scale.json
exemplar: 42
support: 68
$ jq '[.[]|select(.fid==1)]|length as $h|[.[]|select(.mdFid==1)]|length as $m|"HTML \($h)/42 · MD \($m)/42"' m1/eval/m3-final.json
"HTML 42/42 · MD 42/42"
$ jq '[.[].facts|split("/")[1]|tonumber]|add' m1/eval/m3-final.json
4077
```

**② 复合实例（27 / 16 页）**
```
$ grep -rho '"_composite": "[a-z]*"' m1/curated --include=*.json | grep -v renders | sed 's/.*: //' | sort | uniq -c
      1 "form"
      3 "login"
      2 "paginator"
      8 "search"
     13 "table"
```

**③ 模型校验 + 警告**
```
$ node m1/validate.mjs $(find m1/curated -maxdepth 2 -name '*.json' -not -path '*/renders/*') m1/models/*/*.json | grep -c '^ok '
48
$ … | grep 'warn' | sed 's/.*(\(W_[A-Z_]*\)).*/\1/' | sort | uniq -c
      8 W_COMPOSITE_NAME_ONLY_WATERMARK
      2 W_COMPOSITE_ROWS_TOO_FEW
```

**④ 11 道自测（逐条实跑）**
```
$ for t in validate-selftest foundation-selftest metrics-selftest text-selftest axis-selftest \
           md-selftest shots-selftest imgattr-selftest capture-integrity-selftest \
           no-upscale-selftest composite-selftest; do node m1/eval/$t.mjs; done
… 校验器自测: 13/13 通过 · 地基自测: 全部通过(49) · 度量自测: 全部通过(20) ·
  文本渲染自测: 全部通过(13) · 轴一致性自测(三目标): 全部通过 (135 条断言) ·
  Markdown 目标自测: 全部通过(20) · 证据门禁自测（哈希优先）: 8/8 通过 ·
  归属工具自测: 全部通过 (13 条断言) · 采集↔模型一致性自测(F-078): 17/17 通过 ·
  no-upscale: 6 passed, 0 failed · 复合元语自测: 32/32 通过
```

**⑤ 采集↔模型一致性（第 9 道门禁）**
```
$ node m1/eval/capture-integrity.mjs
[采集↔模型一致性] 页面 42 | 事实 4077 | 参与判定 3661 | 未命中 0 | 白名单(转换) 37 | 采集缺口 4（声明白名单共 41 条）
[采集↔模型一致性] 通过
```

**⑥ 决策层唯一性（渲染器零语义 token）**
```
$ for f in m1/render.mjs m1/render-text.mjs m1/render-md.mjs; do
    sed 's://.*::' "$f" | grep -E '_rel|_when|_expose|_fields|_primary|_empty|_items|_lines|_action' | wc -l
  done
0
0
0
```

**⑦ 注册表格式整理无语义变化（本轮）**
```
$ node .scratch/52-s6/compact.mjs /tmp/old-composites.json /tmp/old-compacted.json   # 在 5663da6 旧版上复现
$ diff <(cat /tmp/old-composites.json) /tmp/old-compacted.json   # 无差异（逐字节复现旧格式）
$ node -e "const a=require('/tmp/before-composites.json'),b=require('m1/composites.json');console.log(JSON.stringify(a)===JSON.stringify(b))"
true            # 340 行 → 73 行，语义 parse-equal
```

**⑧ 无暂存文件**
```
$ git diff --cached --name-only | wc -l
0
```

---

STATE_REPORT_DONE sections=7 verified_commands=8 unverified_claims=3

---
## 补充（轮 53 后，父代理追加）
- 门禁从 **11 道 → 12 道**：新增 **控件渲染自测**（凡 `axis` 判定应渲染成控件的 `_expose`，三目标必须都画出控件）。对账：**应渲染 56 / HTML 命中 56 / 不一致 0**；另透明列出"单项降级为事实 2"与"`state` 槽不画控件 3"。
- 同类盲区共补了 **3 处**：`_fields` 里的金额（F-052）、单位叠加（F-054 边界匹配）、**控件消失（本轮）** —— 都是"度量看不见"的类型。
- 校验器健壮性：对**非模型 JSON**（如 `renders/manifest.json`）不再栈溢出，改为 `E_NOT_MODEL` + skip（根因：`childrenOf` 对字符串返回其字符 ⇒ 无限递归）。
- 第 11 轮独立验收 **6/6 accept**（含"用 `git archive` 取本线之前版本做逐字节对照"与"复制仓库改副本注册表验证 role 双向生效"）。
