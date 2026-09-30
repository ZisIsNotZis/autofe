# 09 · 新 exemplar 页策展（36 → 42 页）

轮 12，worker 唯一写入者。**交付 5/6 页**：`gov-uk/ni-rates-letters`、`aws-amazon/ec2-on-demand`、
`stripe-dashboard/login`、`xiaomi-account/login`、`github-com/login` 已策展并纳入门禁（36 → **41**
页）；第 6 页 `aliyun-help/ecs-instance-families` **未策展**，原因见文末「未完成页」。
40 分钟硬限内如实交付，未硬凑第 6 页。

---

## 0. 流程

1. `node m1/extract/extract.mjs <6 页>` 生成草稿（`m1/extract/drafts/**` + `stats/**`，均通过校验），
   逐页人工策展为 `m1/curated/<site>/<page>.json`。
2. 域字段：表格页所需 `_fields` 先加进 `m1/vocab-fields.json`（6 条，见 §2），每条约有抓取背书。
3. 纳入门禁：`m1/eval/m3-scale.json` 追加 5 条 `tier: "exemplar"`。
4. 门禁：`node m1/eval/pipeline.mjs --shots` → 41/41 保真 1.00 + 视觉自查 41/41 干净 + 模型校验/自测全通过。
5. 看图自查：逐张 read 渲染截图（见各页「抽图所见」）。
6. 未造键：表达不了的记 `m1/failures.md` F-046「语法缺口」。

新增失败/词汇条目：`m1/failures.md` **F-045**（GOV.UK 费率表域字段增长，非失败模式）、
**F-046**（登录/数据表的当前语法缺口，含 secret 无类型、无 `<th>` 表头、表列词表爆炸）。

---

## 1. `gov-uk/ni-rates-letters`

- **草稿**：8 条故事线；两张费率表被抽成"只有 `_name`（类别字母）"的集合——三个费率列全部落进
  `table-column-unmapped`（80 格），因列值混有 `N/A` 且列首非数值 ⇒ 列规划放弃。草稿不可直接用。
- **策展要点**：把两张表如实建模为"行=类别字母记录、列=三段周收入区间"的数据表。当前语法里
  "记录 + 列属性"= `_items` 中每条带 `_fields`；**行首列也必须进 `_fields`**（run-table 渲染不把
  `_name` 当列，见 F-046 第 3 条），故加域字段 `category-letter`。四列 ≥3 ⇒ 渲染成真
  `<table class="data">`。
- **抓取依据**：`corpus/gov-uk/ni-rates-letters/dom.html` 两个 `<table>`，表头 `<th>` 原文照抄为列标签；
  32 行单元值（`0%`/`8%`/`1.85%`/`2%`/`15%`/`N/A`）逐格照抄，未换算、未补空。
  `category-letter` 标签 "Category letter"、三个费率列标签为原文表头（含 £ 区间）。
- **抽图所见**：read `m1/curated/renders/gov-uk-ni-rates-letters.png`（1280×2302）。看到：H1
  「National Insurance rates and categories」；「Contribution rates」段落 + 两条 bullet；**两张四列数据表**
  （表头行灰色：`Category letter | £129 to £242 (…) | £242.01 to £967 (…) | Over £967 a week (…)`），
  16 行 A/B/C…Z，C/K/S 行三格 N/A；「Class 1A and Class 1B rates」段（15%）；「Example」段 + 3 条 bullet。
  表格形态正确、无溢出、无空单元错位。**唯一瑕疵**：源站顺序是"先 bullet 后 'The amounts deducted…' 句"，
  渲染器把事实（`_summary`/`_text`）排在集合（`_items`）之前 ⇒ 该句出现在 bullet 前。属渲染器
  facts-before-collection 的既有行为，未在模型侧绕过（不造键）。

## 2. `aws-amazon/ec2-on-demand`

- **草稿**：17 条故事线、61 items；三张价目表被抽成 `_name`/少量事实，价格列（"每 GB USD 0.09"）落在
  `table-column-unmapped`（周期尾使 `parseMoney` 返回 null）。草稿不可直接用。
- **策展要点**：三张表都是**两列**（区域/档位 + 价格），当前 run-table 只在 ≥3 列时成表、且不把 `_name`
  当列 ⇒ 两列表最多渲染为卡片。故如实建模为"`_name` + `_price`"的价目条目（价格进 `_price` money，
  "每 GB" 进 `qualifier`）。**不换算**：金额与货币照抓取（"USD 0.09"⇒`{money:0.09,currency:"USD"}`）。
  区域表 67 行由脚本从 `dom.html` 逐行转录（不手抄）。
- **抓取依据**：`corpus/aws-amazon/ec2-on-demand/dom.html` 的 3 张 `<table>`（T0 互联网传输 / T1 67 区域
  传出 / T2 同区域传输）；区块标题取 `nodes.json` 的 `h2`（数据传输 / 在同一 AWS 区域内传输数据）。
- **抽图所见**：read `m1/curated/renders/aws-amazon-ec2-on-demand.png`（1280×3920）。看到：H1
  「Amazon EC2 按需定价」；「数据传输」—「所有传入数据 每 GB $0」+ 免费额度说明段 + 四档出站价
  （10TB/40TB/100TB/超出 150TB：0.09/0.085/0.07/0.05）；「数据自 Amazon EC2 传出至」— 67 张区域价目卡
  （CloudFront $0、各国区域 $0.01–$0.08）；「在同一 AWS 区域内传输数据」— 数据传入/传出 $0.01。
  卡片网格整齐、无破图、无空卡。**注**：`USD 0.00` 经 `_price` 渲染为 `$0`（货币字形 + 金额归一），
  与源字符串有字形差异、非数值换算；已在此注明。

## 3. `stripe-dashboard/login`

- **草稿**：0 故事线；3 个输入（`_expose`：email/password/toggle）+ 8 个无目标动作。草稿可用度高但
  无结构与 `_intent`。
- **策展要点**：登录块 = 声明标识符 + 秘密 + 记忆 + 提交 + 第三方/通行密钥/SSO + 创建账户 + 忘记密码。
  **标签全部来自抓取**：`邮件地址`、`密码`、`在此设备上记住我`、`忘记密码？`、`创建账户`、
  `登录您的账户`、`Google`/`通行密钥`/`SSO`。秘密输入用 `_expose.type: "text"`（闭式类型里**没有
  password/secret**，见 F-046 第 1 条）。不提交凭据、不采登录后内容。
- **抓取依据**：`corpus/stripe-dashboard/login/{dom.html,nodes.json}`：`<label for="email">邮件地址`、
  `<label for="old-password">密码 忘记密码？`、`aria-label="password input"`、`type="password"`×1、
  `创建账户`（href `/register`）。
- **抽图所见**：read `m1/curated/renders/stripe-dashboard-login.png`。看到：H1「Stripe 登录」；H2
  「登录您的账户」；字段 `邮件地址`（文本框）、`密码`（**纯文本框** — 见 F-046，无 password 类型）；
  `在此设备上记住我` 复选框；`登录` 控件；`忘记密码？`；分隔线后 `Google`/`通行密钥`/`SSO` 三枚入口 chip；
  `创建账户`。形态与源站登录块一致，无空控件、无重复标题。

## 4. `xiaomi-account/login`

- **草稿**：**空草稿**（0 故事线 / 0 输入）——整页内容被提取器的 chrome `banner` 规则吞掉。
  故本页完全按 `nodes.json` 人工策展。
- **策展要点**：登录块 = 账号（`邮箱/手机号码/小米ID`）+ 密码 + 协议勾选 + 提交 + 忘记密码 + 手机号/扫码
  切换 + 第三方（支付宝/微信/QQ/微博）+ 注册。**标签全部来自抓取**（见依据）。秘密输入同用 `text`。
- **抓取依据**：`corpus/xiaomi-account/login/nodes.json`：`textbox "邮箱/手机号码/小米ID"`、`textbox "密码"`、
  `checkbox "已阅读并同意小米账号使用协议和小米账号隐私政策"`、`button "登录"`、`link "忘记密码？"`、
  `link "手机号登录"`、`button "扫码登录"`、`h2 "其他方式登录"` + `button 支付宝登录/微信登录/QQ登录/微博登录`、
  `link "注册"`；`dom.html` 有 `type="password"`×1。
- **抽图所见**：read `m1/curated/renders/xiaomi-account-login.png`。看到：H1「小米账号」；H2「登录」；
  字段 `邮箱/手机号码/小米ID`、`密码`（纯文本框）；协议复选框；`登录`；`忘记密码？`；`手机号登录`；
  `扫码登录`；H2「其他方式登录」+ 四枚第三方 chip（支付宝/微信/QQ/微博登录）；`注册`。形态正确、干净。

## 5. `github-com/login`

- **草稿**：1 条故事线（`Sign in to GitHub`）+ 2 输入 + 5 动作。可用。
- **策展要点**：登录块 = 用户名/邮箱 + 密码 + 提交 + 忘记密码 + Google/Apple 第三方 + 通行密钥 + 创建账户。
  **标签全部来自抓取**。根 `_title` 用源 h1「Sign in to GitHub」；**登录组不再复用同名标题**（避免同页
  重复 H 标题触发 `dup-title` 硬检查）。秘密输入同用 `text`。
- **抓取依据**：`corpus/github-com/login/{dom.html,nodes.json}`（报告 11.3）：`type="password"`×1、
  `name="login"`、`<form>`×4、`Username or email address`、`Password`、`Sign in`、`Forgot password?`、
  `Continue with Google`、`Continue with Apple`、`Sign in with a passkey`、`Create an account`。
- **抽图所见**：read `m1/curated/renders/github-com-login.png`。看到：H1「Sign in to GitHub」；
  字段 `Username or email address`、`Password`（纯文本框）；`Sign in`；`Forgot password?`；分隔线后
  bullet `Continue with Google`/`Continue with Apple`（两条长标签 ⇒ 列表形态，非 chip 条）；`Sign in with
  a passkey`；`Create an account`。干净、无空锚、无重复标题。

---

## 6. 当前语法缺口清单（本轮挖出，记 `m1/failures.md` F-046）

1. **secret 输入无类型**：`_expose.type` 闭式值类型（§2）没有 password/secret ⇒ 三个登录页的密码框只能写 `text`，
   引擎无法区分普通文本与秘密输入（掩码/不回填/不记录）。归属 M4-b `login` 原语，**未预埋**。
2. **无 `<th>` 的表头语义丢失**（`aliyun-help/ecs-instance-families`，224 表 / 0 `<th>`，表头是灰底加粗 `<td>`）：
   提取器找不到 `columnheader` 行 ⇒ 整张规格表返回 null 被丢（`table-without-headers: 217`）。表头语义无法从
   DOM 结构化判据恢复。
3. **表列词表爆炸 / 两列表不能成表**：同页 217 张规格表共 **76 个不同列标签**（`实例规格` 204 次、`vCPU` 198 次…），
   列是"规格属性"而非稳定域字段；逐列声明需一次 76 条词汇扩张（超出单轮策展合理范围，且实质是 `table` 原语）。
   另：run-table（`renderRun`）**不把 `_name` 当列**，故"标签 + 值"两列表最多只能渲染为卡片。
   二者都由 M4-b `table` 原语解决。

（非缺口但需知：渲染器把节点的角色事实排在集合之前，故"事实句 + 集合"的源站顺序会被重排，见 §1。）

---

## 7. 页数与文档同步

| 文件 | 处理 |
|---|---|
| `m1/eval/m3-scale.json` | 追加 5 条 `tier: "exemplar"`；exemplar **36 → 41**（总条目 104 → 109） |
| `m1/vocab-fields.json` | 新增 6 条域字段（`category-letter`、`employee-rate-low/mid`、`employer-rate-low/mid`、`rate-over-967`），标签取自抓取表头 |
| `README.md` | **无页数/分母引用**（仅 M0 状态说明）⇒ 无需改动 |
| `m1/eval/m3-report.md` | 顶部加「口径提示」：本报告为 M3 快照（36 页）；轮 9/11 补样本 + 轮 12 策展 ⇒ 门禁现为 41 页（目标 42）；下文 `36`/`104` 均为快照口径。严口径终值节标题补注当前为 41 页 |
| `docs/m1/m4-composites-proposal.md` | 顶部「数据层」更新为现状（模型层 41 页/22 站；抓取层 110 页 = exemplar 42 + support 68）；加「口径提示」说明 `table`/`login` 在模型层已有样本、历史 `36`/`104` 为 M4-a 快照分母 |
| `docs/m1/layout-axes.md` | 未含页数/分母引用（`55/98` 是集合数且已有口径注），无需改动 |
| `.scratch/active-work.md` | 更新轮 12 条目、下一步、每轮硬判据、基线现况为 41/41；轮 9 条目中的"既有 36 页未动"为历史事实陈述，保留 |

**为什么文档写 41 而非 42**：门禁实际覆盖 41 页（第 6 页未策展）。为不留过期数字，当前分母一律写成 **41**，
并注明"第 6 页 `aliyun-help` 待策展 ⇒ 目标 42、corpus 已采 exemplar 42 页"。若强行写 42，会与
`m3-scale.json`/门禁实际值不一致。

---

## 8. 未完成页与原因

**`aliyun-help/ecs-instance-families`（第 6 页，未策展）**

- 抓取事实：224 `<table>` / 1340 `<tr>` / **0 `<th>`**（表头为灰底加粗 `<td>`）。
- 提取器行为：217 张表判为 `table-without-headers` 后**整表丢弃**；文档正文被抽成 220 故事线 / 1263 items /
  625 动作的"列表化"草稿，规格表结构已丢失，草稿不可直接策展。
- 未完成原因（三条，见 F-046）：① 表头语义无 `<th>` 无法结构化恢复；② 217 张规格表共 76 个不同列标签，
  要如实建模需一次 76 条域字段扩张（实质是在模型里手搓 `table` 原语，越权）；③ index 型两列表/转置表在
  当前 run-table（不把 `_name` 当列）下无法成表。
- 结论：**如实不做**，交父代理裁定：或（a）接受本轮 41 页、下一轮做 `aliyun-help` 的**有界策展**
  （只建模索引 + 若干代表性规格表，明确标注覆盖比例）；或（b）批准一次 76 条域字段词汇扩张以**全量**建模
  217 张规格表；或（c）等 M4-b `table` 原语落地后再策展。
- 其余 5 页（含 3 个登录块、2 个数据表）已全部交付，M4 的 `table`/`login` 在**模型层**已有 ≥3 站样本。

---

## 9. 门禁原文

```
$ node m1/eval/pipeline.mjs --shots
[pipeline] 渲染 41/41 | 错误 0
[pipeline] 保真 1.00: 41/41
[pipeline] 模型校验: 47 个全通过
[pipeline] 校验器自测: 通过
[pipeline] 地基自测(D1/D2/D3): 通过
[pipeline] 显式降级清单（compare 标记但成不了对比表）:
[pipeline] · stripe-com/pricing · n=2 · degenerate-no-shared-attribute
[pipeline] 地基自测: 全部通过
dup-title: 华为磁吸手机支架 - 华为官网
· sspai-com-home.html                           dup-source-true(info):2

视觉自查: 41/41 干净
[pipeline] 截图 41 张, 画廊 v=muoe9dje
```

新增 5 页在 pipeline 中的合成结果（`m1/eval/m3-final.json` 口径，均 `fidelity 1`）：

| 页面 | fid | facts | 截图 |
|---|---|---|---|
| gov-uk/ni-rates-letters | 1 | 146/146 | 已 read |
| aws-amazon/ec2-on-demand | 1 | 154/154 | 已 read |
| stripe-dashboard/login | 1 | 11/11 | 已 read |
| xiaomi-account/login | 1 | 15/15 | 已 read |
| github-com/login | 1 | 9/9 | 已 read |

（模型校验自测 `validate-selftest.mjs`、地基自测 `foundation-selftest.mjs` 均通过，见上。）

---

CURATE_DONE pages=5/6 total_gate=41 fidelity=1.00 audit=clean docs_updated=yes
