# 三目标演示：同一份业务元语，多个前端形态

> 本文件由 `node m1/eval/three-target-preview.mjs` 生成，**内容全部取自真实渲染产物**
> （片段为脚本从 HTML / 纯文本 / Markdown 产物中截取的字节窗口，非手写摘要）。

## 目标与现状

- **一句话目标**：同一份 **业务元语**（M1 模型）→ **多个前端形态**（HTML / 纯文本 / Markdown）。
- **决策层共享**：形态选择、可比性闸门、对比表头属性集、控件可见性、节点渲染计划等**唯一实现**在
  `m1/axis.mjs`；三个渲染器（`m1/render.mjs`、`m1/render-text.mjs`、`m1/render-md.mjs`）
  只 `import` 它、**互不 import**，各自把同一决策画成自己的记号。
- **画法各异**：HTML 画元素（`<table>`/`<div>`/`<fieldset>`…），纯文本画对齐文本与 `[标签]`/`( )`，
  Markdown 画 GFM 语法（`| 表格 |`、`- ( ) 选项`、`> 引用`）。
- **isomorphism 现状：`partial`**。**决策层已无重复实现**：本轮把上一轮遗留的「对比表实体表头属性集」
  上移为共享决策 `compareHeaderEntries`，并加了**三目标同集合**的显式门禁断言（`m1/eval/axis-selftest.mjs` 的 E2/F2）。
  **剩余残余**（已登记；下表四页均未触发）：
  1. `ROLE_LABEL` 标签词汇仍是目标本地（文本/MD）。当一次 `table` 形态的列含内部角色事实
     （`_count`/`_price`…）时，HTML 该列**无表头文字**，而文本/MD 打 `数量`/`价格`；身份列 `名称` 同理只在文本/MD。
     合法模型可达（已声明 `_fields` + 一个角色事实），但 42 个策展页扫描 **0/42** 触发 ⇒ 当前无产物差异，只是保证尚非结构性。
  2. 8 个形态各自的绘制写法（「画法各异」本身）。
  ⇒ 决策层无重复，但上述目标本地标签词汇使三目标尚未达到**产物级**同构，故记 `partial`。

生成命令（可重复执行，产物确定性）：

```bash
node m1/eval/three-target-preview.mjs   # → docs/three-targets.md
```

## 决策层一览（本页模型经 `m1/axis.mjs` 选出的形态；三目标共用）

- `gov-uk/ni-rates-letters` — 表格页（data table）：list×2 table×2 controls×1
- `apple-com-cn/iphone-17` — 对比页（compare table）：deflist×5 chips×4 list×3 stack×2 cards×1 compare-table×1 choice:choice×2（compare-table 2 实体）
- `github-com/login` — 表单 / 登录页（form）：list×1 choice:input×2
- `sspai-com/post-114716` — 内容页（prose + 列表 + 集合）：prose×18 stack×9 deflist×7 list×1 cards×1

## 1. `gov-uk/ni-rates-letters` — 表格页（data table）

- **模型意图**：让雇主与雇员查清 2026–2027 年度国民保险（NI）各类别字母、各收入档的缴款率
- **共享决策**（`axis.mjs`）：list×2、table×2、controls×1
- **说明**：同一批记录在三种目标里都是「有身份列/≥2 属性列」的表——表/卡阈值由共享 runPlan 决定。

### HTML 目标 · `m1/render.mjs`

```html
…Employee National Insurance rates</h2>
<div class="fact">
<span class="val">This table shows how much employers deduct from employees’ pay from 6 April 2026 to 5 April 2027.</span>
</div>
<table class="data">
<thead>
<tr>
<th>Category letter</th>
<th>£129 to £242 (£559 to £1,048 a month)</th>
<th>£242.01 to £967 (£1,048.01 to £4,189 a month)</th>
<th>Over £967 a week (£4,189 a month)</th>
</tr>
</thead>
<tbody>
<tr>
<td>A</td>
<td>0%</td>
<td>8%</td>
<td>2%</td>
</tr>
<tr>
<td>B</td>
<td>0%</td>
<td>1.85%</td>
<td>2%</td>
</tr>
<tr>
<td>C</td>
<td>N/A</td>
<td>N/A</td>
<td>N/A</td>
</tr>
<tr>
<td>D</td>
<td>0%</td>
<td>2%</td>
<td>2%</td>
</tr>
<tr>
<
```

### 纯文本目标 · `m1/render-text.mjs`

```text
…Employee National Insurance rates
  This table shows how much employers deduct from employees’ pay from 6 April 2026 to 5 April 2027.
  Category letter  £129 to £242 (£559 to £1,048 a month)  £242.01 to £967 (£1,048.01 to £4,189 a month)  Over £967 a week (£4,189 a month)
  ---------------  -------------------------------------  ---------------------------------------------  ---------------------------------
  A                0%                                     8%                                             2%
  B                0%                                     1.85%                                     
```

### Markdown 目标 · `m1/render-md.mjs`

```markdown
…Employee National Insurance rates

This table shows how much employers deduct from employees’ pay from 6 April 2026 to 5 April 2027.

| Category letter | £129 to £242 (£559 to £1,048 a month) | £242.01 to £967 (£1,048.01 to £4,189 a month) | Over £967 a week (£4,189 a month) |
| --- | --- | --- | --- |
| A | 0% | 8% | 2% |
| B | 0% | 1.85% | 2% |
| C | N/A | N/A | N/A |
| D | 0% | 2% | 2% |
| E | 0% | 1.85% | 2% |
| F | 0% | 8% | 2% |
| H | 0% | 8% | 2% |
| I | 0% | 1.85% | 2% |
| J | 0% | 2% | 2% |
| K | N/A | N/A | N/A |
| L | 0% | 2% | 2% |
| M | 0% | 8% | 2% |
| N | 0% | 8% | 2% |
| S | N/A | N/A | N/A |
| V 
```

## 2. `apple-com-cn/iphone-17` — 对比页（compare table）

- **模型意图**：iPhone 17 中国大陆产品页：以「神通妙彩」为主题讲设计、芯片续航、摄像头的升级，核心交易信息是 RMB 6799 起（或 RMB 284/月 24 期），页面主旨是产品与起售价
- **共享决策**（`axis.mjs`）：deflist×5、chips×4、list×3、stack×2、cards×1、compare-table×1、choice:choice×2；compare-table 2 实体
- **说明**：实体表头属性集由共享 compareHeaderEntries 决定；HTML 画成列头块，文本/MD 画成一行。

### HTML 目标 · `m1/render.mjs`

```html
…当前浏览</span>
<div class="cmp-price">起 RMB 6799</div>
<div class="cmp-sub">拉高好感度， 再添耐用性。</div>
<div class="cmp-sub">RMB 6799 起或 RMB 284/月 (24 期) 起</div>
<div class="cmp-nested">
<div class="chips">
<span class="chip-item">薰衣草紫色</span>
<span class="chip-item">鼠尾草绿色</span>
<span class="chip-item">青雾蓝色</span>
<span class="chip-item">白色</span>
<span class="chip-item">黑色</span>
</div>
</div>
<div class="cmp-ctl">
<a class="ctl" href="https://www.apple.com.cn/cn/shop/goto/buy_iphone/iphone_17">购买</a>
</div>
</th>
<th class="cmp-col">iPhone Air<div class="cmp-price">起 RMB 8799</div>
<div class="cmp-sub">超轻超薄， Pro 级性能表现。</div>
<div class="cm
```

### 纯文本目标 · `m1/render-text.mjs`

```text
…当前浏览] 起 RMB 6799 拉高好感度， 再添耐用性。 RMB 6799 起或 RMB 284/月 (24 期) 起 [购买] 薰衣草紫色 / 鼠尾草绿色 / 青雾蓝色 / 白色 / 黑色  iPhone Air 起 RMB 8799 超轻超薄， Pro 级性能表现。 RMB 8799 起或 RMB 367/月 (24 期) 起 [进一步了解] 蓝色 / 金色 / 白色 / 黑色
----------  ------------------------------------------------------------------------------------------------------------------------------------------------------  -----------------------------------------------------------------------------------------------------------------------------
显示屏        ## 显示屏
  6.3 英寸 超视网膜 XDR 显示屏                                                                                                
```

### Markdown 目标 · `m1/render-md.mjs`

```markdown
…当前浏览 起 RMB 6799 拉高好感度， 再添耐用性。 RMB 6799 起或 RMB 284/月 (24 期) 起 [购买](https://www.apple.com.cn/cn/shop/goto/buy_iphone/iphone_17) 薰衣草紫色 · 鼠尾草绿色 · 青雾蓝色 · 白色 · 黑色 | iPhone Air 起 RMB 8799 超轻超薄， Pro 级性能表现。 RMB 8799 起或 RMB 367/月 (24 期) 起 [进一步了解](https://www.apple.com.cn/iphone-air/) 蓝色 · 金色 · 白色 · 黑色 |
| --- | --- | --- |
| 显示屏 | ###### 显示屏 6.3 英寸 超视网膜 XDR 显示屏 | ###### 显示屏 6.5 英寸 超视网膜 XDR 显示屏 |
| 芯片 | ###### 芯片 A19 芯片 第三代 3 纳米制程 · 5 核图形处理器 配备神经网络加速器 | ###### 芯片 A19 Pro 芯片 第三代 3 纳米制程 · 5 核图形处理器 配备神经网络加速器 |
| 摄像头 | ###### 摄像头 4800 万像素融合式双摄系统 · 4800 万像素融合式主摄 · 4800 万像素融合式超广角 | ###### 摄像头 4800 万像素融合式摄像头系统 · 4800 万像素融合式主摄 |
| 
```

## 3. `github-com/login` — 表单 / 登录页（form）

- **模型意图**：让开发者登录 GitHub
- **共享决策**（`axis.mjs`）：list×1、choice:input×2
- **说明**：输入/选择形态由共享 nodePlan.choice 决定；HTML 是 fieldset/input，文本是下划线位，MD 是 [text]。

### HTML 目标 · `m1/render.mjs`

```html
…Username or email address</span>
<input type="text" name="login" data-type="text" aria-label="Username or email address">
</span>
</article>
</section>
<section class="group g-secret">
<article class="node depth-2">
<span class="expose expose-password">
<span class="deflabel">Password</span>
<input type="text" name="password" data-type="text" aria-label="Password">
</span>
</article>
</section>
<section class="group g-submit">
<div class="controls">
<span class="ctl">Sign in</span>
</div>
</section>
<section class="group g-forgot">
<div class="controls">
<a class="ctl" href="https://github.com/password_reset">Forgot password?</a>
</d
```

### 纯文本目标 · `m1/render-text.mjs`

```text
…Username or email address: __________ [text]
    Password: __________ [text]
    [Sign in]
    [Forgot password?]
    ----
    - Continue with Google
    - Continue with Apple
    [Sign in with a passkey]
    [Create an account]

```

### Markdown 目标 · `m1/render-md.mjs`

```markdown
…Username or email address: ________ `[text]`

Password: ________ `[text]`

[Sign in]

[Forgot password?](https://github.com/password_reset)

- Continue with Google
- Continue with Apple

[Sign in with a passkey]

[Create an account](https://github.com/signup)

```

## 4. `sspai-com/post-114716` — 内容页（prose + 列表 + 集合）

- **模型意图**：少数派「本周看什么」本期：编辑部推荐 9 部影视作品，附补遗、本周新预告与影视新闻周报
- **共享决策**（`axis.mjs`）：prose×18、stack×9、deflist×7、list×1、cards×1
- **说明**：正文段合并 / 有序集合 / 链接清单等形态都由共享 selectForm/seqGroupsOf 决定。

### HTML 目标 · `m1/render.mjs`

```html
…本周看什么 | 最近值得一看的 9 部作品</h1>
<div class="fact">
<span class="val">2026-09-18</span>
</div>
<section class="block">
<article class="node depth-1">
<div class="fact">
<span class="val">少数派编辑部 等 4 位作者</span>
</div>
<div class="prose">
<p>16 分钟阅读</p>
</div>
</article>
</section>
<section class="block">
<article class="node depth-1">
<h2 class="title">👀 N 部作品推荐</h2>
<div class="fact">
<span class="val">往期推荐可 点此 或点击文末 tag #本周看什么，更多主题片单可 点此 查看；想要查看更多深度影视内容，可以关注我们的衍生栏目「看什么 Café」。如有其他建议也欢迎在评论区提出，感谢大家对「看什么」栏目的喜爱和支持。</span>
</div>
<ul class="linklist">
<li>近期佳作推荐：[英剧] 流人 第六季、[英剧] 翠鸟谋杀案、[美剧] 怪物：丽兹·波顿的故事、[澳大利亚] 最后目击、[德剧] 巴比伦柏林 第五季、[日剧] 幸福伽菜子的快乐杀手生
```

### 纯文本目标 · `m1/render-text.mjs`

```text
…本周看什么 | 最近值得一看的 9 部作品
时间: 2026-09-18
少数派编辑部 等 4 位作者
16 分钟阅读
# 👀 N 部作品推荐
往期推荐可 点此 或点击文末 tag #本周看什么，更多主题片单可 点此 查看；想要查看更多深度影视内容，可以关注我们的衍生栏目「看什么 Café」。如有其他建议也欢迎在评论区提出，感谢大家对「看什么」栏目的喜爱和支持。
- 近期佳作推荐：[英剧] 流人 第六季、[英剧] 翠鸟谋杀案、[美剧] 怪物：丽兹·波顿的故事、[澳大利亚] 最后目击、[德剧] 巴比伦柏林 第五季、[日剧] 幸福伽菜子的快乐杀手生活 第二季、[韩剧] 中头奖还是要上班、[纪录片] 命运与人、[纪录片] 美丽的执念
- 几则精彩预告：《哆啦 A 梦 大雄的蒸汽时间车》首支特报、《荒野丛林》终极预告、《黄金时段》新预告、《如何干一票大的》新预告
- 几则影视资讯：《生化危机：爆发夜》确认引进、《生日快乐》内地定档 10 月 23 日、《泥面人》新海报
[看什么 Café]
# [英剧] 流人 第六季
开启废物清除计划。
关键词：剧情 / 惊悚

又名：Slow Horses Season 6
片长：40 分钟左右（单集）× 6 集
[豆瓣链接]
@潘誉晗：斯劳屋部门流年不利，本就不被总部的人待见的他们没工资了，系统里也没有他们的任何记录，房屋中介甚至上门勘查了部门好做估价。曾在斯劳部门就职过的同事们遭到了两名
```

### Markdown 目标 · `m1/render-md.mjs`

```markdown
…本周看什么 | 最近值得一看的 9 部作品

时间: 2026-09-18

少数派编辑部 等 4 位作者

16 分钟阅读

## 👀 N 部作品推荐

往期推荐可 点此 或点击文末 tag #本周看什么，更多主题片单可 点此 查看；想要查看更多深度影视内容，可以关注我们的衍生栏目「看什么 Café」。如有其他建议也欢迎在评论区提出，感谢大家对「看什么」栏目的喜爱和支持。

- 近期佳作推荐：[英剧] 流人 第六季、[英剧] 翠鸟谋杀案、[美剧] 怪物：丽兹·波顿的故事、[澳大利亚] 最后目击、[德剧] 巴比伦柏林 第五季、[日剧] 幸福伽菜子的快乐杀手生活 第二季、[韩剧] 中头奖还是要上班、[纪录片] 命运与人、[纪录片] 美丽的执念
- 几则精彩预告：《哆啦 A 梦 大雄的蒸汽时间车》首支特报、《荒野丛林》终极预告、《黄金时段》新预告、《如何干一票大的》新预告
- 几则影视资讯：《生化危机：爆发夜》确认引进、《生日快乐》内地定档 10 月 23 日、《泥面人》新海报

[看什么 Café](https://sspai.com/topic/416)

## [英剧] 流人 第六季

开启废物清除计划。

关键词：剧情 / 惊悚

又名：Slow Horses Season 6

片长：40 分钟左右（单集）× 6 集

[豆瓣链接](https://movie.douban.com/subject/3668981
```

## 同一决策层，不同画法

三份产物的**形态选择完全相同**（上表由同一个 `m1/axis.mjs` 算出），差别只在绘制：
HTML 用元素与 class，纯文本用空格对齐与 `[标签]`，Markdown 用 GFM 语法。
因此「业务元语 → 前端形态」的映射是**一对多**的，但映射的**决策**是**一份**的——
任一目标都无法自行改变形态、表头集合或可比性判定，只能改变画法。
