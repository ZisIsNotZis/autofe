# 轮 49 — 补 schema 漏洞 + S3 `login` 迁移

状态：§1 完成；§2 完成（3/3，经两次裁定 A）；收尾进行中。

## 1. Schema 漏洞（F-091）
- [x] 漏洞 A：整行缺 `_fields` ⇒ 硬报错 `E_COMPOSITE_ROWS_INCONSISTENT`（沿用既有码）
- [x] 漏洞 B：`validate()` 新增 `warnings`；`validateFiles` 打印（不改退出码）；pipeline 汇总打印
- [x] `W_COMPOSITE_ROWS_TOO_FEW`（单行表）实现
- [x] 升级 storage-optimized / fpga-accelerated → `table`；**实测打印 2 条警告**
- [x] composite-selftest 23→24（整行缺 _fields 拒例 + 单行正例/两行反例）
- [x] failures.md F-091

## 2. S3 login 迁移（F-092）
- [x] 裁定 A（注册表）：`login.submit.verbs` 收窄 `["submit"]`；证据=三页提交均为 verb:submit、operate 均为额外登录方式；**收紧非放宽**；已证伪（放宽回 ⇒ 正例失败）
- [x] 裁定 A（渲染）：`_expose` 双重语义（普通节点=输入控件；复合件=声明状态不画控件）→ `axis.mjs#exposeRendersAsControl`，三目标共同消费；零影响（全库 0 个 `_composite`+`_expose`）；已证伪
- [x] github-com/login、stripe-dashboard/login、xiaomi-account/login → `_composite:"login"` + `signed-in`；secret=type:secret
- [x] 三目标逐字节一致（HTML 剥 style body / text / MD）
- [x] `signed-in` 可被 `_when` 引用（true⇒可见，false/undefined⇒不可见）
- [x] axis-selftest U0–U4（129 条）；failures.md F-092；docs §5.4/§9.2/§3.2/§3.3/§6.2(a)

## 收尾
- [ ] pipeline --shots 42/42

## 收尾结果（`node m1/eval/pipeline.mjs --shots`，退出码 0）
- 渲染 42/42 error 0；HTML 保真 1.00 42/42；Markdown 保真 1.00 42/42
- 模型校验 48 个全通过；**警告（不阻断）2 条**（W_COMPOSITE_ROWS_TOO_FEW，见下）
- 十一道自测全过（含校验器/地基/度量/文本/轴一致性/MD/证据门禁/归属/采集↔模型/采集自测/图片不放大/复合元语）
- 采集↔模型一致性：页面 42 / 事实 4076 / 未命中 0
- 视觉自查 42/42 干净；证据一致性（PNG⇄HTML）通过（42 页, v=mupbr74v）；`--check-shots` 退出 0

### 警告通道实际输出（pipeline 汇总）
```
[pipeline] 模型校验警告（不阻断）: 2 条
   ! warn families-by-type.storage-optimized: table has a single row — closer to a deflist than a table (structure is still legal; a curator call) (W_COMPOSITE_ROWS_TOO_FEW)
   ! warn families-by-type.fpga-accelerated: table has a single row — closer to a deflist than a table (structure is still legal; a curator call) (W_COMPOSITE_ROWS_TOO_FEW)
```

### 变更文件
- m1/validate.mjs（漏洞 A/B）
- m1/eval/pipeline.mjs（警告汇总）
- m1/eval/composite-selftest.mjs（24 条）
- m1/eval/axis-selftest.mjs（U0–U4，129 条）
- m1/composites.json（login.submit 收窄）
- m1/axis.mjs（exposeRendersAsControl，**父代理特批的唯一规则**；三个渲染器未改）
- m1/curated/{github-com,stripe-dashboard,xiaomi-account}/login.json、learn-microsoft/vm-sizes.json
- docs/m1/composites.md（§3.2/§3.3/§5.4/§6.2(a)/§9.2）、m1/failures.md（F-091/F-092）
- m1/curated/renders/**（pipeline --shots 生成）

### 残留风险
- `bilibili-com-home.png` 与 HEAD 相差 12 字节（HTML 逐字节一致、无 `_composite`；两次重拍自洽 ⇒ 环境级截图非确定性，非本轮语义改动所致）
