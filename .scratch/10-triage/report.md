# 10 · 41 页策展集 · 场景×原型覆盖诊断（重尾 triage，只读）

状态：诊断报告（只读分析；本轮唯一写入文件 = 本文件）。
范围：**41 页 exemplar 策展集** + 68 页 support 抓取层（共 109 条分级记录；corpus 另有 1 页 `aliyun-help/ecs-instance-families` 已抓未分级/未策展）。
用户既定范围：**只针对业内公认顶流的专业/商业/工业场景设计**；非专业/小众/游戏类**不算**覆盖缺口。
纪律：只做**覆盖与证据强度**判断，不下审美判断；所有数字附可复现命令（§8）。

---

## 0. 摘要

- **exemplar 层** = 41 页 / **19 个策展站点目录**（apple-com 与 apple-com-cn、stripe-com/dashboard/docs 按目录各算 1 个）。覆盖 **21 个场景原型**，分属 7 个场景族。
- **薄（≤1 个 exemplar 站点支撑）的原型 = 11 / 21**：市场门户首页、SaaS/云定价页、云/企业产品页、配置器/购买流程、文章/编辑内容、内容站内搜索、作者主页、视频观看页、公共服务/办事指南、开发者文档、仪表盘/数据可视化。
- **缺口 = 8**：其中 **6 个"support 有真值但 exemplar 零策展"**（组件库/设计系统文档、后台管理数据表、结算流程、通用搜索引擎结果、时间线动态、帮助中心/FAQ），**2 个"全语料零真值"**（设置/账户页、多步表单/向导）。
- **对 M4 的阻塞**：`table` 原语**被阻塞**（exemplar 层只有 2 站、且都是只读费率表，无行选择/行操作；有选择列的样本全在 support 的组件 demo）。`form` 的记录型（record 提交+订单摘要=结算）证据偏窄，但不阻塞命名。
- **大前提（诚实边界）**：任何覆盖率宣称只适用于 **exemplar 41 页**；support 68 页只作结构覆盖，不进入覆盖率声明（`docs/design-basis.md` §7–§8）。

---

## 1. 口径与数据来源

| 用途 | 文件 |
|---|---|
| tier（exemplar / support） | `m1/eval/m3-scale.json`（41 exemplar + 68 support + 1 未分级） |
| 页面真实内容/主旨 | `m1/curated/*/*.json` 的 `_intent`/`_title`（41 页） |
| 抓取真相（DOM/结构） | `corpus/<site>/<page>/dom.html`（110 页） |
| 策展事实保真 | `m1/eval/m3-final.json`（41 页 fid=1） |

- 站点数按 corpus/curated 目录名计（`m1/curated/<site>`）：**19**。`docs/m1/m4-composites-proposal.md` 写的 "41 页/22 站" 与本口径不一致，本报告以 **19 目录**为准并在此标注差异（见 §7 诚实边界）。
- 原型分类**从 41 页真实主旨归纳**，不套 M0 spec 的 10 类；下方给出与 M0 spec 类的映射注记。

---

## 2. 覆盖矩阵

### 2.1 站点 × 原型 网格（格 = exemplar 页数，`·` = 0）

站点缩写：`36K`=36kr-com `AB`=airbnb-com `AL`=aliyun-com `AP`=apple-com `APC`=apple-com-cn `AW`=aws-amazon `BL`=bilibili-com `GH`=github-com `GOV`=gov-uk `GF`=grafana-play `HW`=huawei-cn `LN`=linear-app `MI`=mi-com `SP`=sspai-com `ST`=stripe-com `STD`=stripe-dashboard `STC`=stripe-docs `TB`=taobao-com `XA`=xiaomi-account

| 场景族 | 原型 | 36K | AB | AL | AP | APC | AW | BL | GH | GOV | GF | HW | LN | MI | SP | ST | STD | STC | TB | XA | 页 | 站 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 消费品牌 | 品牌/集团首页 | · | · | · | 1 | · | · | · | · | · | · | 1 | · | 1 | · | · | · | · | · | · | 3 | 3 |
| 消费品牌 | 产品营销详情页 | · | · | · | 3 | 1 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 4 | 2 |
| 消费品牌 | 配置器/购买流程 | · | · | · | 1 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 1 | **1** |
| 电商/零售 | 市场/电商门户首页 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 1 | · | 1 | **1** |
| 电商/零售 | 商品/房源详情页 (PDP/listing) | · | 1 | · | · | · | · | · | · | · | · | · | · | 1 | · | · | · | · | · | · | 2 | 2 |
| 电商/零售 | 搜索/列表 (PLP) | · | · | · | · | · | · | · | · | · | · | 2 | · | 2 | · | · | · | · | · | · | 4 | 2 |
| 电商/零售 | 分类/目录 | · | · | · | · | · | · | · | · | · | · | 1 | · | 1 | · | · | · | · | · | · | 2 | 2 |
| 企业/云 SaaS | SaaS/云定价页 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 1 | · | · | · | · | 1 | **1** |
| 企业/云 SaaS | 云/企业产品页 | · | · | 1 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 1 | **1** |
| 企业/云 SaaS | 云厂商/SaaS 营销首页 | · | · | 1 | · | · | · | · | · | · | · | · | 1 | · | · | · | · | · | · | · | 2 | 2 |
| 内容媒体 | 内容平台首页 | 1 | · | · | · | · | · | 1 | · | · | · | · | · | · | 1 | · | · | · | · | · | 3 | 3 |
| 内容媒体 | 文章/编辑内容 | · | · | · | · | · | · | · | · | · | · | · | · | · | 3 | · | · | · | · | · | 3 | **1** |
| 内容媒体 | 社区/UGC 流 | · | · | · | · | · | · | 1 | · | · | · | · | · | · | 1 | · | · | · | · | · | 2 | 2 |
| 内容媒体 | 内容站内搜索 | 2 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 2 | **1** |
| 内容媒体 | 作者/用户主页 | · | · | · | · | · | · | · | · | · | · | · | · | · | 1 | · | · | · | · | · | 1 | **1** |
| 内容媒体 | 视频观看页 | · | · | · | · | · | · | 1 | · | · | · | · | · | · | · | · | · | · | · | · | 1 | **1** |
| 政府/公共 | 数据表/费率表 | · | · | · | · | · | 1 | · | · | 1 | · | · | · | · | · | · | · | · | · | · | 2 | 2 |
| 政府/公共 | 公共服务/办事指南 | · | · | · | · | · | · | · | · | 1 | · | · | · | · | · | · | · | · | · | · | 1 | **1** |
| 文档/后台/认证 | 开发者文档 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 1 | · | · | 1 | **1** |
| 文档/后台/认证 | 仪表盘/数据可视化 | · | · | · | · | · | · | · | · | · | 1 | · | · | · | · | · | · | · | · | · | 1 | **1** |
| 文档/后台/认证 | 登录/身份 | · | · | · | · | · | · | · | 1 | · | · | · | · | · | · | · | 1 | · | · | 1 | 3 | 3 |

**加粗的站数 = 1** 即 §3 的薄处。

### 2.2 原型详情（exemplar 页 + support 层同原型真值）

support 层只作"该原型有没有抓取、有没有未策展真值"的说明，**不进入覆盖率宣称**。

| # | 原型（M0 spec 类映射） | exemplar 页（站点/页） | support 层同原型 | 判定 |
|---|---|---|---|---|
| A1 | 品牌/集团首页 (`landing/home`) | apple-com/home、huawei-cn/home、mi-com/home | — | 3 站，健康 |
| A2 | 产品营销详情页 (`product-detail`) | apple×3（iphone-17/ipad-air/macbook-air）、apple-com-cn/iphone-17 | — | 2 站，同品牌系 |
| A3 | 配置器/购买流程 (`form/checkout`) | apple-com/iphone-16 | — | **1 站**（薄） |
| A4 | 市场/电商门户首页 (`landing/home`) | taobao-com/home | — | **1 站**（薄） |
| A5 | 商品/房源详情页 (`product-detail`) | mi-com/product-detail-mi15（电子）、airbnb-com/room-28871（住宿） | — | 2 站，异质 |
| A6 | 搜索/列表 PLP (`search-results`) | mi-com/search-earbuds、mi-com/search-phone、huawei-cn/search-laptop、huawei-cn/search-phone | oppo-cn/search-phone | 2 站，健康 |
| A7 | 分类/目录 (`category/list`) | mi-com/shop-category-list、huawei-cn/consumer-phones | getbootstrap/example-pricing | 2 站 |
| A8 | SaaS/云定价页 (`landing/home`) | stripe-com/pricing | getbootstrap/example-pricing（demo） | **1 站**（薄） |
| A9 | 云/企业产品页 (`product-detail`) | aliyun-com/product-ecs | cloud-tencent/product-cvm | **1 站**（薄） |
| A10 | 云厂商/SaaS 营销首页 (`landing/home`) | aliyun-com/home、linear-app/home | cloud-tencent/home、antv/home、apexcharts/home、g2-antv/home | 2 站 |
| A11 | 内容平台首页 (`landing/home`) | 36kr-com/home、bilibili-com/home、sspai-com/home | juejin-cn/home、cnblogs/* | 3 站，健康 |
| A12 | 文章/编辑内容 (`article/editorial`) | sspai-com/post-102392、post-114699、post-114716 | juejin-cn/post-*（3）、mdn/docs-*、react-dev/* | **1 站**（薄） |
| A13 | 社区/UGC 流 (`article/editorial`) | sspai-com/matrix、bilibili-com/read-home | juejin-cn/home、douban-people/*、huaban-com/discovery | 2 站 |
| A14 | 内容站内搜索 (`search-results`) | 36kr-com/search-ai、36kr-com/search-viz | cloud-tencent/search-db、search-yun | **1 站**（薄） |
| A15 | 作者/用户主页 (`profile/account`) | sspai-com/u-jtc092al | gitee/oss-profile、douban-people/people-ahbei、juejin-cn/user-* | **1 站**（薄） |
| A16 | 视频观看页 (`article/editorial`) | bilibili-com/video-bv1gj411x7h7 | — | **1 站**（薄） |
| A17 | 数据表/费率表 (`table-heavy/admin` 部分) | gov-uk/ni-rates-letters（公共费率）、aws-amazon/ec2-on-demand（云价目） | 28 页/9 站有 `<table>`（含组件 demo） | 2 站，均只读 |
| A18 | 公共服务/办事指南 (`form/checkout`) | gov-uk/register-birth-abroad | getbootstrap/forms-overview（demo） | **1 站**（薄） |
| A19 | 开发者文档 (`docs/design-system`) | stripe-docs/payments | mdn/docs-*、react-dev/*、tailwindcss/docs-installation、chartjs/docs-latest、cloud-tencent/docs-cvm、getbootstrap/docs-introduction | **1 站**（薄） |
| A20 | 仪表盘/数据可视化 (`dashboard/data-viz`) | grafana-play/play-home | getbootstrap/example-dashboard（demo） | **1 站**（薄），且是可视化 demo，非运营后台 |
| A21 | 登录/身份 (`form/checkout`) | github-com/login、stripe-dashboard/login、xiaomi-account/login | passport-baidu/login、9 页组件 demo 有 `type=password` | 3 站，健康（本轮补齐） |

---

## 3. 薄处清单（≤1 个 exemplar 站点，共 11 个）

每条附可复现证据。

| # | 原型 | 薄处性质 | 证据（命令见 §8） |
|---|---|---|---|
| A3 | 配置器/购买流程 | 全区唯一 1 页（apple iphone-16），无第二家；无真实结算/购物车页 | `corpus/apple-com/iphone-16/dom.html` 有 `<form>`；`mi-com/product-detail-mi15` 只有 `结算/购物车` **动作**，无结算页 |
| A4 | 市场/电商门户首页 | 全区唯一 1 页（taobao home） | `jq` 归类；support 层无第二个市场门户 |
| A8 | SaaS/云定价页 | 1 站（stripe pricing）；support 仅一个引导 demo | `getbootstrap/example-pricing` 是 demo |
| A9 | 云/企业产品页 | 1 站（aliyun ECS）；support 有 `cloud-tencent/product-cvm` 未策展 | `corpus/cloud-tencent/product-cvm/dom.html` |
| A12 | 文章/编辑内容 | 3 页但**全在同一站**（sspai）；正文类跨站为 0 | `m1/curated/sspai-com/post-*.json` |
| A14 | 内容站内搜索 | 2 页但**同一站**且同一关键词族（36kr）；跨站 0 | `m1/curated/36kr-com/search-*.json` |
| A15 | 作者/用户主页 | 1 站（sspai 作者页）；support 有 3 站未策展 | `corpus/gitee/oss-profile`、`douban-people/people-ahbei`、`juejin-cn/user-*` |
| A16 | 视频观看页 | 1 站（bilibili）；全区唯一播放页 | `corpus/bilibili-com/video-bv1gj411x7h7/dom.html` |
| A18 | 公共服务/办事指南 | 1 站（gov-uk）；且是"指南"非"表单/事务流" | `m1/curated/gov-uk/register-birth-abroad.json` |
| A19 | 开发者文档 | 1 站（stripe-docs）；support 文档 5+ 站未策展 | `m1/curated/stripe-docs/payments.json` |
| A20 | 仪表盘/数据可视化 | 1 站（grafana）；且是**演示仪表盘**（11 stat 面板），无运营后台 | `m1/curated/grafana-play/play-home.json` |

**另有 2 个"每站仅 1 页"的原型**（站数=2 但同站无第二页）：A5 商品/房源详情页、A7 分类/目录 —— 不算硬薄，但同原型内**页面多样性低**，M4 的"跨页一致性"断言样本偏窄。

---

## 4. 缺口清单

### 4.1 (b) support 层有真值、exemplar 层零策展（6 个）

| # | 缺口原型 | support 层真值（页/站） | 证据 |
|---|---|---|---|
| G1 | 组件库/设计系统文档（交互组件 sandbox + API 属性表） | ant-design(6)、arco-design(5)、element-plus(6)、semi-design(3)、tdesign(4)、getbootstrap/forms-overview(1) ≈ **25 页 / 6 站** | `corpus/{ant-design,arco-design,element-plus,semi-design,tdesign}/*/dom.html` |
| G2 | 后台管理数据表（带行选择/行操作的真实数据表） | 组件 demo 5 页 + `getbootstrap/example-dashboard`、`cloud-tencent/product-cvm`、`douban-movie/home`、`gitee/oschina-org`、`cnblogs/*` ≈ **10+ 页 / 8 站** | m4 §2.3：exemplar `<table>`=0（旧快照）；现 exemplar 仅 2 页只读表 |
| G3 | 结算/收银流程（购物车→支付→确认） | `getbootstrap/example-checkout`（**演示页，非顶流真实结算**）= 1 页 / 1 站 | `corpus/getbootstrap/example-checkout/dom.html`（title "Checkout example"） |
| G4 | 通用搜索引擎结果页 | `cn-bing/home` = 1 页 / 1 站 | `corpus/cn-bing/home/dom.html` |
| G5 | 时间线/动态（带机器可读 `<time>` 的序列） | **exemplar `<time>` = 0**；support `gitee/oss-profile(15)`、`juejin-cn/post-*(1×3)`、`mdn(1×2)` = 7 页 / 3 站 | `grep -o '<time' corpus/**/dom.html` |
| G6 | 帮助中心/FAQ（折叠问答） | support `mdn/docs-*(<details> 118+10)`、`antv/home(2)`；exemplar `<details>` 仅 github login 1 处 | `grep -o '<details' ...` |

### 4.2 (c) 全语料零真值（2 个）

| # | 缺口原型 | 说明 | 证据 |
|---|---|---|---|
| G7 | 设置/账户页（settings/account console） | 全 110 页无一个以设置/账户管理为主内容的页；最接近的是 profile 页（A15）。`设置/logout` 关键字只在导航里零散出现（huawei/taobao/mdn/apple 等），无独立设置页 | §8 P10：`grep -o -iE '账户设置\|个人设置\|Settings</\|logout'` 命中均为导航项，无独立设置页 |
| G8 | 多步表单/向导（wizard） | 无真实多步事务流；`gov-uk/register-birth-abroad` 是"指南+Start now 入口"，apple iphone-16 是配置器 | `m1/curated/gov-uk/register-birth-abroad.json`（无 `_expose` 向导） |

---

## 5. 缺口价值与候选页

**范围闸门**：候选必须是**业内公认顶流**的专业/商业/工业页面；非专业/小众/游戏类**不计为缺口**（本清单已按此过滤）。

| # | 缺口 | 值得补？ | 候选页（顶流） | 预期证据 | 不补/低优先的理由 |
|---|---|---|---|---|---|
| G1 | 组件库/设计系统文档 | **值得（中）** | 已有抓取：`ant-design/components-table`、`element-plus/table`（升 tier 或补采 `mui.com`/`developer.apple.com/design`） | 真实组件的 API 属性表、交互 sandbox、`<table>` 语义表 | 不补的理由：A19 已用 stripe-docs 覆盖"开发者文档"大类，边际价值在于"活组件 demo"这一**新子型**；若 M4 冻结前无人策展，则 subclass 永久无 exemplar |
| G2 | 后台管理数据表 | **值得（高）** | 顶流后台多为登录墙（aliyun/aws/stripe console 不可采）；可采替代：`cloud-tencent/product-cvm`（真实云规格表）、`douban-movie/home`（榜单表） | 真实只读数据表（补第 3 站） | 不补的风险：`table` 原语 C1（≥3 exemplar 站）不达标；行选择/行操作证据**无顶流真实来源**（只能标注为组件 demo） |
| G3 | 结算/收银流程 | **低-中** | 真实结算页普遍登录/购物车门禁，顶流不可达；`getbootstrap/example-checkout` 是 demo 非顶流 | 记录型 `form`（字段集一次提交 + 订单摘要 + `offer`） | 不补的理由：`form` 的搜索面板证据（5 站）已够命名；结算增量只在"record 提交 + 订单摘要"组合，且无顶流可采来源 ⇒ 归为**记录在案的不作覆盖** |
| G4 | 通用搜索引擎结果页 | **低** | `cn.bing.com`（support 已采） | 通用 SERP 的混合结果块 | 不补的理由：结果渲染已由 A6/A14 覆盖（电商 + 站内搜索）；SERP 是同一故事线族，边际价值低 |
| G5 | 时间线/动态 | **不是覆盖缺口，是数据缺口** | 无需新页；在已有页补 `_datetime` | `_rel.order:time` 条目的机器可读时间 | 补页无意义（`juejin/gitee` 已有 support 真值）⇒ m4 §5.5 的处置（校验警告 + 策展规则）正确 |
| G6 | 帮助中心/FAQ | **低** | 顶流：`help.aliyun.com`（**已有抓取 `aliyun-help/ecs-instance-families`**，未策展）；`mdn`（support） | 折叠问答（`<details>`）、帮助导航 | 不补的理由：折叠问答的正确处置是 `_rel.detail` 谓词 + 引擎修法（m4 §5.5），与页面量无关；且 `aliyun-help` 页因规格表词汇爆炸未策展（F-046） |
| G7 | 设置/账户页 | **不可达** | 全部登录墙（无顶流公开设置页） | —— | 不补的理由：**采集不可达**（登录门禁 + 合规）；且设置页 = `form`+`table` 组合，已被现有原语覆盖 |
| G8 | 多步表单/向导 | **值得（中）** | `www.gov.uk` 的 Start-now 事务流（gov-uk 已在 exemplar；robots ALLOW） | 多步 `form` 的分步故事线、步骤状态 | 不补的理由：需要一次新抓取（gov.uk 事务流路径未采）；若 M4 `form` 只针对"面板"不针对"步骤"，可归为内联展开 |

**推荐补样本清单（按价值排序，均属顶流且在范围内）**：
1. `cloud-tencent/product-cvm` 或 `douban-movie/home` → 提升/策展为 exemplar，补 `table` 第 3 站（**解 `table` C1 阻塞**）。
2. `aliyun-help/ecs-instance-families` → 有界策展（只建索引 + 代表规格表），同时验证 `table` 与"帮助中心"子型（**F-046 待裁定**）。
3. `ant-design/components-table` 或 `element-plus/table` → 明确标注为"组件库文档（demo）"升 exemplar，补 G1 子型（**不得当作生产后台证据**）。
4. `www.gov.uk` 事务流（多步表单）→ 补 G8。

---

## 6. 对 M4 / M5 的阻塞分析

### 6.1 M4 复合原语

| 原语 | exemplar 证据现状 | 阻塞？ |
|---|---|---|
| `table` | **2 站**（gov-uk 费率表、aws 价目表），**均为只读**、无行选择/行操作；选择列证据只在 support 组件 demo | **阻塞**：C1 要求 ≥3 exemplar 站；且"选中集合=业务键列表"这一核心状态在 exemplar 层**零覆盖** |
| `login` | 3 站（github / stripe-dashboard / xiaomi-account），本轮补齐 | 不阻塞（`signed-in` 归属仍是用户决策 D-1，非覆盖问题） |
| `offer` | 6 站（mi×3 有 `<del>`、gov-uk fees、apple 分期、aliyun、huawei、stripe pricing） | 不阻塞 |
| `form` | 5 站 / 8 个搜索面板；**记录型提交（结算/订单摘要）无 exemplar** | 不阻塞命名；但 **record 值类型的证据偏窄**（只有查询面板，无事务提交）⇒ 建议在 acceptance 里显式标注 |
| `paginator` | 3 站（huawei×2、mi、gov-uk，见 m4 轮 14 更正） | 不阻塞 |
| `qa`/`prose`/`compare`/`timeline` | 已判"不升/修引擎/修数据" | — |

**结论**：**唯一被覆盖证据阻塞的 M4 原语是 `table`**。`form` 的记录型分支为**证据偏窄但不阻塞**。

### 6.2 M5 品牌层（互换测试）

M5 需要对**同一故事线跨品牌**取证据（design-basis §4.1 互换测试）。当前：
- 有 ≥2 品牌的同原型：A1 品牌首页（apple/huawei/mi=3）、A10 营销首页（aliyun/linear=2）、A11 内容首页（3）、A21 登录（3）、A6 PLP（mi/huawei=2）、A7 目录（2）。
- **单品牌原型（11 个薄处）无法做跨品牌互换**：定价、结算、文档、仪表盘、视频、文章、公共服务、作者页等。
- **货币 token**（M5 已知 token 项）：模型层 `_price`/`_amount` 共 **4 种货币代码**：USD（apple×3、aws、stripe）、CNY/RMB（aliyun、huawei、mi×2、apple-cn、taobao）、GBP（gov-uk）、HKD（stripe）⇒ 货币字形 token 有跨品牌证据，但**无跨原型对照**（定价页只 stripe 一家）。证据：§8 P11。
- **风险**：M5 若对全部原型声明显式品牌不变量，则 11 个单品牌原型只能得到"存在性证明"，得不到"跨品牌不变性"证据。**建议 M5 先限定在品牌数 ≥2 的原型（A1/A6/A7/A10/A11/A21）上做门槛，其余标为"单品牌存在性"。**

### 6.3 与 M3 覆盖率声明的关系

M3 的 `事实保真 1.00 × 41` 成立（`m1/eval/m3-final.json`）；但"1.00 保真"只证明"模型 → 渲染 忠实"，**不证明"覆盖了多少场景"**。本诊断显示的 11 个单站原型与 6 个 support-only 缺口，正是 `1.00` 数字**不体现**的部分。

---

## 7. 诚实边界

1. **本诊断基于 41 页策展 + 68 页 support + 110 页抓取**（`m1/eval/m3-scale.json` + `corpus/`，即 `m1/eval/m3-scale.json` 的 109 条 + 未分级的 `aliyun-help/ecs-instance-families`）。
2. **任何覆盖率/缺口结论仅适用于 exemplar 层（41 页）**；support 层（68 页）只用于回答"这个原型有没有抓取"，**不进入覆盖率宣称**（design-basis §7–§8）。
3. **站点计数口径**：本报告按 curated/corpus 目录名 = **19 站**；`docs/m1/m4-composites-proposal.md` 的"22 站"未按同一目录口径，两者差异已在此标注，**不据此改任何已冻结声明**。
4. **抓取层不是全量互联网**：缺口清单是"本语料内"的缺口，不等于"该原型在业界不存在"。G2/G3/G7 的顶流样本多为登录墙，是**采集可达性**限制，非设计不存在。
5. **不做审美判断**：薄/缺口只表示**证据强度不足**，不表示该页面/品牌设计质量低。
6. **AI 不裁决顶流**（design-basis §8）：§5 的候选页沿用 `tools/capture/sites.json` 已认可的 exemplar 级别站点，**未自行新增顶流判定**。

---

## 8. 附录：可复现命令

```bash
cd /home/z/vibe/autofe

# (P1) tier 计数：41 exemplar / 68 support / 109 分级
jq length m1/eval/m3-scale.json
jq '[.[]|select(.tier=="exemplar")]|length' m1/eval/m3-scale.json   # 41
jq '[.[]|select(.tier=="support")]|length'  m1/eval/m3-scale.json   # 68

# (P2) corpus 抓取页数（110）与未分级页
find corpus -name meta.json | wc -l                                  # 110
find corpus -name meta.json | sed 's|corpus/||;s|/meta.json||' | sort > /tmp/corpus-pages.txt
jq -r '.[].k' m1/eval/m3-scale.json | sort > /tmp/tiered-pages.txt
comm -23 /tmp/corpus-pages.txt /tmp/tiered-pages.txt                 # aliyun-help/ecs-instance-families

# (P3) exemplar 层每页主旨（用于原型归类）
for f in $(find m1/curated -name '*.json' -not -path '*/assets/*' -not -path '*/renders/*'); do
  echo "$f"; jq -r '._title.text, ._intent' "$f"; done

# (P4) exemplar 层 / support 层结构真值（本报告 §4 用的扫描；脚本 /tmp/af-scan.mjs）
#   见脚本正文；核心 = 对每页 dom.html 统计 <table>/<th>/type=password/<form>/<time>/<details> 等
node /tmp/af-scan.mjs

# (P5) exemplar 层 <table> 页（只读表证据 = 2 页）
for p in $(jq -r '.[]|select(.tier=="exemplar")|.k' m1/eval/m3-scale.json); do
  n=$(grep -o '<table' corpus/$p/dom.html 2>/dev/null | wc -l); [ "$n" -gt 0 ] && echo "$n $p"; done

# (P6) exemplar 层 type=password（登录证据 = 3 站）
for p in $(jq -r '.[]|select(.tier=="exemplar")|.k' m1/eval/m3-scale.json); do
  n=$(grep -o 'type="password"' corpus/$p/dom.html 2>/dev/null | wc -l); [ "$n" -gt 0 ] && echo "$n $p"; done

# (P7) exemplar 层 <time>（= 0，G5 数据缺口）
for p in $(jq -r '.[]|select(.tier=="exemplar")|.k' m1/eval/m3-scale.json); do
  n=$(grep -o '<time' corpus/$p/dom.html 2>/dev/null | wc -l); [ "$n" -gt 0 ] && echo "$n $p"; done

# (P8) 结算真值只在 support demo
grep -o -iE 'checkout|billing|payment|order' corpus/getbootstrap/example-checkout/dom.html | sort | uniq -c
jq -r '.title' corpus/getbootstrap/example-checkout/meta.json        # "Checkout example · Bootstrap v5.3"

# (P9) 站点目录数（19）
find m1/curated -mindepth 1 -maxdepth 1 -type d | grep -vE 'assets|renders' | wc -l

# (P10) 设置/账户页真值探测（G7：命中均为导航项，无独立设置页）
for f in $(find corpus -name dom.html); do
  n=$(grep -o -iE '账户设置|个人设置|账号设置|Settings</|Account settings|登出|退出登录|logout' "$f" | wc -l)
  [ "$n" -gt 0 ] && echo "$n ${f#corpus/}"; done

# (P11) 模型层货币代码（M5 货币 token；$6.2）
for f in $(find m1/curated -name '*.json' -not -path '*/assets/*' -not -path '*/renders/*'); do
  c=$(jq -r '[..|objects|select(has("currency"))|.currency]|unique|join(",")' "$f")
  [ -n "$c" ] && echo "$(basename $(dirname $f))/$(basename $f): $c"; done
```

---

TRIAGE_DONE archetypes=21 thin=11 gaps=8 blocked_primitive=table
