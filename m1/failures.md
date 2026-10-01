# M1 表达失败日志

规则：编码时语法表达不了的东西，**先记在这里**，走"审查 → 改语法/词表"的流程；禁止编码时即席发明字段。每条带：页面、缺什么、候选修法、状态。

## F-001 `_region`（区域可用性）无法表达
- **发现于**：fixtures/product.json（iPhone 16，`_when: region == "CN"`）
- **缺什么**：条件的真实来源之一是市场/区域，但 §3 词表没有 `region`。
- **修法（采纳）**：词表增加 `context` 组：`region`、`audience`。属词表变更，非语法变更。
- **状态**：已采纳（2026-09-18，grammar owner），加入词表。

## F-002 路径段不允许下划线开头 → `_lines[0]` 永远解析失败
- **发现于**：validator 自身（fixture 的 `_primary: "specs._lines[0]._measure"`）
- **缺什么**：数组保留键带 `_` 前缀，路径段正则却只允许字母开头。这是**语法自身的不自洽**。
- **修法（采纳）**：路径段允许 `_` 开头。
- **状态**：已修复。
- **遗留 ergonomic 问题**：`specs._lines[0]._measure` 可读性一般。候选修法（未采纳，留观察）：路径里允许无下划线别名 `lines[0]`。若编码 10 页时反复硌手，升级为语法变更。

## F-003 业务动词是常态，不是例外
- **发现于**：第一个 fixture 就需要 `preorder`
- **缺什么**：§6 内置动词只有 6 个通用动作，商业场景立即需要 `preorder/buy/add-to-cart`。
- **修法（采纳）**：新增 `m1/vocab-domain.json`（领域动词表，带 `$comment` 纪律说明），validator 合并加载。首批：`buy preorder add-to-cart compare follow share configure`。
- **状态**：已采纳。

## F-004 条件只能引用"节点或祖先的事实"——跨页上下文（如库存、登录态）怎么办？
- **发现于**：`_action.when: "stock > 0"`——库存是后端事实，理应在模型里；但**登录态/用户偏好**不是。
- **状态**：**开放，待决策**。候选：(a) 条件只能引用模型事实（登录态等由引擎按上下文注入并声明）；(b) 增加受控的 `_context` 词表（`signed-in`、`device-class`…），模型可引用但不得赋值。倾向 (a)+(b) 混合：模型事实优先，引擎上下文走受控词表。

## F-005 条件引用的每个事实都必须是词表角色（含 `stock`）
- **发现于**：`_action.when: "stock > 0"`——`stock` 不在 §3 词表。
- **教训**：`_when`/`_action.when` 引用的路径会逐个对照词表；商业模型里"可用性/库存"是高频事实。
- **修法（采纳）**：`quantity` 组增加 `stock`。
- **状态**：已采纳。

## F-006 瞬态任务状态（"步骤已完成"）不是业务事实
- **发现于**：apple-com/iphone-16（购买配置流程）
- **缺什么**：想写 `_action.when: "steps-complete == true"`，但"用户走完了向导"是**运行时交互状态**，不是后端业务事实；写进模型就是把 UI 状态塞回语义层——正是本架构禁止的。
- **修法（采纳）**：不建模。步骤序列（`_rel.order: "sequence"`）本身就是故事线；"是否完成"由引擎从用户交互推导，动作可用性是引擎的事。
- **状态**：已采纳。**这直接支持了"任务面也是故事线"的论点**：购买向导 = Finish → Storage → Trade In → Payment → Carrier → AppleCare 的步骤故事线。

## F-007 跨表面导航用真实 URL，不要求目标在同一模型内
- **发现于**：同页。`to: "/checkout"`、`"/trade-in/estimate"` 在本文档内无对应节点。
- **修法（采纳）**：一个模型编码一个表面；离开本表面的动作用真实外部 URL。表面间的关系不做语法约束。
- **状态**：已采纳。

## 工程侧（非语法）：渲染器两处 bug 由真页面编码逼出
`hide` 在 hero 注册前读取导致主指子树在正文重复；标题事实未从正文排除导致标题 ×2。已修，均有确定性测试。

## F-008 受众状态与页面选择是同一机制：暴露事实（_expose）——语法变更，已批准
- **决策（用户，2026-09-18）**：登录/未登录是**不同的故事线**；页面上的选项/滑杆也会产生不同故事。登录态、用户身份属于故事；设备能力、屏幕尺寸、颜色字体偏好属于引擎。判定判据：**两种用户需要不同的信息或动作 → 故事；只是形式与侧重不同 → 引擎**。
- **缺什么**：模型无法表达"这个组是单选，选中后暴露一个事实，下游故事线依赖它"。
- **修法（采纳）**：新增保留键 `_expose: { role, type }`——本节点的交互产出一个事实，进入后代 `_when` 的作用域。带 `_items` 的组 = 单选（暴露值为所选条目的 `_name`/`_title`）；无 `_items` = 自由输入。
- **配套**：登录是一个复合原语（M4），它的义务是**暴露 `signed-in`**——复合原语不仅要能展开成公理，还必须声明它向页面引入的状态。这是对 §3.6 的重要补充。
- **归属判据已写入 design-basis §3。**

## F-009 暴露事实的角色也必须在词表内（`variant` / `option`）
- **发现于**：apple 购买流程的 Finish / Storage 单选组
- **教训**：与 F-001/F-005 同源——**凡是能被引用或暴露的名字，都是词表的一部分**。这不是负担，这正是"封闭语法"在逼我们把业务语义说全。
- **修法（采纳）**：`classification` 组增加 `variant`（用户选中的变体）与 `option`（通用选项）。
- **状态**：已采纳。

## F-010 暴露事实的名字是领域标识符，不是词表角色——语法修正
- **发现于**：给 payment / carrier / care 补 `_expose` 时。若沿用词表角色，一个 20 字段的表单就要 20 个角色条目，词表爆炸。
- **病根**：**表单字段名是领域标识符，不是语义角色**。两个命名空间被混用了。
- **修法（采纳）**：`_expose: { name, type }`——`name` 是页面内声明的标识符（kebab-case），条件可引用"词表角色"或"已声明的暴露名"。封闭性不破：**每个被引用的名字都必须被声明过**，校验器照常阻断未声明引用。
- **状态**：已采纳。这是"封闭"与"可扩展"的正确分工：**语义角色封闭（引擎要懂），领域标识符开放但必须声明（引擎只需传话）**。

## F-011 联动的归属：定价计算归后端；选择/提交共用 `_expose` 契约——架构决策，无语法变更
- **决策（用户问、2026-09-18 定）**：改配置后价格不变的"联动"分两种——
  1. **数值联动**（总价 = 容量 + 保障 − 折抵）：本质是**定价计算 = 业务逻辑**，归后端。把公式写进模型是范畴错误（模型开始"做计算"）。流程：选择 → 标准结构体上行 → 后端返回模型（全量或补丁）→ 引擎确定性重渲染。
  2. **显示联动**（选了某外观才出现某子故事）：已有机制（`_expose` 事实 + `_when` 条件），无需新概念。
- **组合爆炸的解法**：事实按**选项**给（线性），跨选项依赖用**选项上的条件**（也线性）。只有业务真有组合独有子故事时才枚举——那是真实业务复杂度，不是语法债。
- **契约**：`_expose` 名字 = 上行结构体字段 = 最终提交体字段。`m1/contract.mjs` 从模型导出该契约（只是导出器，不是新语法）。
- **状态**：已采纳；写入 design-basis §6 交互回路。

## F-012 批量选择与聚合条件（`count()`）
- **发现于**：antd Table 的 rowSelection（全选/自定义选择 + 批量操作）
- **缺什么**：多选暴露 + "选中数 > 0 才可用"的条件。v0.1 的 `_expose` 只能单选，表达式没有聚合。
- **修法（采纳）**：`_expose` 增加 `multiple: true`（值为所选行的 `_key` 列表）；表达式操作数增加 `count(path)`。
- **状态**：已采纳。这也顺带解决了早前遗留的"批量操作 vs 单元素单动作"冲突：批量动作挂在集合节点上，条件引用聚合。

## F-013 空态是集合的故事线（`_empty`）
- **发现于**：模型轴审查早已指出 empty 必须可表达；antd 的 empty demo 印证
- **修法（采纳）**：集合节点新增保留键 `_empty`（一条子故事线），集合为空时渲染。
- **状态**：已采纳。

## F-014 集合可以嵌套（展开行 / 树表）
- **发现于**：expandable rows、树形数据
- **修法（采纳）**：`_items` 的元素本身是节点，可以再有 `_items`——嵌套即深度，无需新概念（§3.4）。
- **状态**：无需语法变更，写编码规范。

## F-015 列表型值（Tags 列）
- **发现于**：Tags 列一行多个标签
- **修法（采纳）**：类型化值增加 `{list: [类型化值...]}`。
- **状态**：已采纳。

## F-016 【重大】表格列 = 领域字段，不是语义角色；表格本身不是模型概念
- **发现于**：antd Table 的列：Name / Age / Address / Email / Gender / Score / Cash Assets
- **病根**：把 Age、Address、Score 塞进语义角色词表 = 词表爆炸（与 F-010 同源，但这次是**事实**侧而非暴露侧）。**表格不是模型概念，是"同质集合"的一种渲染**——列就是行节点上的字段，表头是字段的标签，排序/筛选/固定列都是引擎对同一份事实的呈现能力。
- **修法（采纳）**：第三个事实命名空间——**领域字段字典**（`m1/vocab-fields.json`：名字 → 类型 + 表头标签，按领域声明一次）。节点用保留键 `_fields` 携带领域事实（键必须在字典内）。三namespace各司其职：
  - 语义角色（封闭词表）：引擎要**懂**的东西（title/price/author…）
  - 领域字段（声明字典）：引擎只需**传话**的东西（age/address/score…）
  - 暴露标识符（页面声明）：本页交互的输入口
- **状态**：已采纳。这是元语"覆盖 99% 顶流"的关键一步：没有它，所有企业表格都会逼爆词表。

## F-017 两处规则精化（由 antd table 编码逼出）
- **意图规则的边界**：`_items` 的元素是**数据记录**，不是故事线——"它为何存在"由集合意图覆盖，不应强制 `_intent`（否则每行都要写一句废话）。精化：`_items` 元素豁免，其内部的命名子组照常要求。
- **受众状态的落地（F-004 的 b 半边定案）**：新增 `m1/vocab-context.json` 受控上下文词表（`signed-in`/`role`/`region`/`locale`/`audience`）。模型**可引用、不可赋值**；由引擎按会话注入。至此 F-004 完整闭环：模型事实 > 暴露事实 > 受控上下文，三层各有归属。
- **附带**：条件字面量必须带引号（`role == "admin"`），裸词是路径。
- **状态**：已采纳并实现。

## F-018 同质性是引擎的启发式，不是模型的声明——概念修正
- **修正（用户，2026-09-18）**：不许先入为主把"同质集合"当模型概念，更不许由此推出"表格"。同质由引擎对同级兄弟做形状聚类**自己发现**（含嵌套子对象）；表格/卡片/步骤条由引擎按字段数量与上下文决定——字段多→表格，就 name+description 两个字段→卡片。
- **保留的最小故事语义**：`_items` = "并行实例集"（可互换的同类实例）。这不是表现声明；没有它，纯形状聚类会把 Apple 的 6 个向导步骤误判为"一张步骤表"（它们形状相似，但**不可互换**）。实例可互换是故事事实。
- **"呈现感觉"的通道**：业务用 `_rel`（compare / order / level）表达"希望被怎样读"——要共现、要有序、强调档位——引擎从这些**感觉**推导形态。业务永远不说"表格"。
- **状态**：已采纳；渲染器改为启发式发现（字段字典键的 Jaccard 相似度 ≥0.6 的连续段判为同质段；共享字段 ≥3 → 表，否则 → 卡片）。

## F-018 附注：启发式的已知保守边界
- 嵌套成绩集（Chinese/Math/English 各占一个**不同**字段键）未被字段键 Jaccard 判为同质 → 渲染为三张卡片。语义上它们是并排可比的。
- 候选改进（引擎侧，不动语法）：形状相似度纳入"类型相同 + 键命名前缀相近"，或允许模型用 `_rel.compare` 提示共现（已有）。**改进永远在引擎侧，不加模型概念。**

## F-019 领域字段字典目前是单文件（跨域混用）
- **发现于**：aliyun-ecs 的 `regions`/`zones`（基础设施域字段）与 antd 的人员字段同住一个 `vocab-fields.json`
- **候选修法**：字典按领域拆分（people/infra/commerce…），模型声明引用哪个域。v0 单文件可用，规模上来再拆。
- **状态**：已记录，暂不改（避免过早抽象）。

## F-020 "带一个按钮的卡片" ≠ "就是一个按钮的卡片"——动作是故事元素，不是卡片属性
- **澄清（用户，2026-09-18）**：一张可乐卡片即使只有一个"买"按钮，故事上也是**两个元素**：卡片本身是"这瓶可乐"（点击=查看它的更多信息），"买"是另一个独立故事。正常设计不会让"卡片就是按钮"。
- **语法判定**：无需变更——公理层"一元素一动作"已经覆盖：卡片节点有自己的动作（`open` 详情），"买"是它的子元素动作。**包含 ≠ 同一**；引擎降级时内层命中优先（§3.5），但故事层它们始终是两个元素。
- **编码规范**：卡片级"点看详情"要显式写成卡片自己的 `_action`，不得省略后由引擎猜测。

## F-021 形态选择是优化问题，不是阈值——研究方向的定调
- **修正（用户）**：`相似度≥0.6`、`字段≥3` 这类阈值是占位符。真实问题是一个**优化**：在约束下选择让故事最清晰的形态（向导/表格/大卡片/横幅），背后是不同的故事线结构。
- **可挖的既有设计方法论**（编译进引擎 prior 的素材，§6）：
  - 选择是否相互依赖：依赖 → 分步向导（每步过滤下一步）；独立 → 单表单
  - 选项基数：≤5~7 → 平铺选择；多 → 搜索/下拉；视觉型选项 → 色板
  - 对比任务（多属性横向比）→ 表格；识别/浏览任务（物体导向）→ 卡片
  - 单一主故事 + 情感节拍 → 横幅/hero；渐进披露 → 展开/下钻
  - 认知负荷（7±2 分块）、Fitts 目标定律、渐进披露（NNg）
- **与"局部最优"研究合流**：目标函数可定义为**任务完成成本**（点击/滚动/决策次数）+ 清晰度约束（强调档位与优先级一致、无信息丢失）。
- **状态**：研究方向。启发式阈值保留为占位，规则库在 M6 编译期沉淀，每条规则引用我们自己的原语作为触发条件。

## F-022 动作需要显示文案（label）——它是内容，不是 UI 提示
- **发现于**：M2 judge（linear 页）：signup 动作渲染成无文字的"open"胶囊，访客认不出这是注册。`verb` 是语义，`label` 是按钮上的**文案=内容**（同"按钮文字是内容"的既有判定）。
- **修法（采纳）**：`_action` 增加可选 `label`（封闭集合内的新键，属语法小变更）。
- **同轮修正（RENDERER，judge B 页）**：① `_intent` 不再作为可见内容输出（改为 HTML 注释）——模型的意图不是页面文案；② 选择组的选项无 `_name` 时，回退用首个字段值做标签，不再输出 "option N" 占位；③ 根节点标题/事实先于主指块渲染（修 Apple 页主次倒置）。

## F-023 根因修正：不是采集截断上限，是 mid-animation 捕获
- 更正：`MAX_TEXT=1000` 并未截断；Linear 标题是打字机动画，捕获瞬间可见文本只打到 "Designed for t"，而 accName（`name` 字段）携带完整文案。与 mi 轮播同属"JS 动画期捕获"类。
- 修法（已做）：抽取器取 text/name 中构成前缀关系的较长者。采集侧改进（等动画稳定后再采样）记入 capture 待办。

## F-024 金额限定词（"From/起/每月"）——money 类型扩展
- **发现于**：策展试点（aliyun "¥99.00/1年起"、apple "From $799"）
- **修法（采纳）**：money 类型化值增加可选 `qualifier`（文本）。价格限定词是**内容**。
- **同轮修正**：① 渲染器根 `_primary` 主指块被排到页面底部（head/facts/expose → hero → runs/groups）；② expose-over-items 与集合渲染重复；③ 指标 norm 未反转 `&amp;`（AT&T 类事实永远过不了子串检查）；④ 覆盖豁免的子串阈值过松（短模型串压制源告警）。

## F-025 策展抽查抓到捏造 URL——抽查协议生效
- **发现于**：策展试点抽查（父级对照 capture DOM）
- **事实**：huawei 旗舰卡与 aliyun 客服入口的 3 条 URL 是策展者**构造**的（截自截图的品牌名 + 猜测路径），不在 capture DOM 中。
- **修法（采纳）**：URL 必须逐字来自 capture（相对路径用 DOM 里的原形）；截图可见但 capture 无背书的事实 → 从 capture 补证或丢弃。协议新增此条。

## F-026 渲染基线四缺陷（人工校准审查发现）
- 角色标签（DETAIL/SUMMARY/MEASURE）外显为页面文字 → 已移除（内部逻辑不外显）。
- 主指字号污染：`.hero` 的 1.9em 作用于整棵主指子树 → 限定为"主指是单个事实"时才放大。
- 区域点击被画成显式 "open" 按钮 → F-020 降级落地：容器上的 navigate/open 无 label 时降级为拉伸链接（卡片即可点区域），显式按钮保留给带 label 的动作。
- 无品牌头：`_brand` 渲染为站点身份条；货币按惯例映射符号（¥/$——惯例非品牌，品牌 token 归 M5）。

## F-027 编码/策展错误三处（人工校准审查发现，均已修）
- stripe：非卡支付费率被误编码为第三个"定价方案"进入 compare 排比 → 移为标准方案下的费率说明；"开箱即用"清单只编了 3/9 → 从 capture 补全 9 项；争议费用被抬为顶级故事线 → 降为 level-2 脚注级（原页为提示级信息）。
- aliyun：hero AI 区的"立即免费体验"CTA（aliyun.com/exp，capture 逐字）在策展中丢失 → 已恢复。
- aliyun 插图：capture 仅有 4 个无法定位归属的 img src → 按未猜原则未挂接，记为该页捕获局限（插图是故事本体，采集侧需增强图片-条目定位）。

## 人工校准审查（2026-09-18，用户）结论登记
- 三页均"内容列出但无主次"，主因=渲染基线（F-026）+ 策展强调缺失（`_rel.level` 未用）。
- 澄清一条：aliyun "全球公共云可用区" 非捏造（原页 DOM `<p>` 小标签，易漏看）。
- 待办：策展协议增加"强调档位必须显式使用 `_rel.level`"；渲染器 aside 分区（相关推荐远离正文）进引擎 prior 库。

## F-028 分区/邻近元语的落点：不加语法，引擎基线 + level 档位
- **发现于**：人工校准（sspai 相关推荐贴着正文；stripe 争议费用应为按需显示的参考信息；aliyun 层级间距）。
- **定案**：
  1. **"小东西靠近它的直属上级"（邻近随深度）**是引擎排版基线——间距随树深度收缩，CSS 已实现；模型无需表达。
  2. **"次要/尾部内容与主故事拉开"**：`_rel.level ≥ 2` → aside 分区（CSS 已补——之前 `.zone` 样式漏写，等于没修）。
  3. **"平时不显示、按需查看的参考信息"**（如争议费用、tooltip）→ `_rel.level: 3`，引擎 prior 映射为按需/tooltip 呈现。不新增 `expandable` 之类的表现键。
- **附带核实**：aliyun "31 地域/106 可用区" 真实存在于原页 DOM（基础设施区），原截图该区域懒加载未绘制（已知采集伪影），故用户在图中未见——非捏造。
- **策展修正**：aliyun "立即免费体验" CTA 移至页面级（页面级 CTA 属 hero 层，不属于小节）；stripe 争议费用降为 level 3。

## F-029 渲染器泄漏与实现缺陷（文本 judge 挖出，均为我方 bug）
- **F1**：`_intent` 被当可见标题输出——**上轮"intent 当标题"实现方式错误**。正解：`_intent` 永远内部；组标题必须来自 `_title`（原页标题文案）。规则已写入策展协议。
- **F2**：checklist 标签全空（`fmt(label.value)` 传值对象本身）+ `_items` 双渲染（checklist 与卡片重复）。已修；且"暴露选择集只跳纯标签项"（曾误跳价格/说明）。
- **F3**：`fact-hero` 类从未输出（CSS 只有选择器）→ 主指事实从未放大——这是"没有主次"的机械根因。已修（事实主指进 hero 且放大；子树主指**不再重排**，保声明顺序）。
- **F6**：`key:` 引用渲染成死链/字面文本 → 现在节点输出 `id` 锚点，`key:` 解析为页内锚。
- 另：legend 改用模型 `_label`（原页标签）优先；无 label 且无目标的 navigate/open 不再渲染按钮。

## F-032 控件被吞与内部标识符泄漏（视觉复核挖出，均为我方 bug）
- **R1 控件被 promo 吞掉**：一个「只有标题 + `_action.label` 与标题同名」的节点先被判为 `titleIsControl`（`action` 留空）→ 再命中 `bareTitle` → `return <div class="promo">`，控件外观和链接一起丢失。修正：`bareTitle` 增加 `!node._action`（有动作的节点永远不是 promo），并在标题控件/纯链接分支前先输出 `<div class="controls"><span|a class="ctl">` 控件条（F-031-§4：控件不是内容，也不得占满整行的浅灰空框）。受影响页：36kr search-ai/viz「站内搜索」、taobao「更多低价商品」、huawei consumer-phones「购买」、mi15「立即领取/修改/加入购物车/喜欢」、apple iphone-16「Continue/Save for later」、linear「Contact sales」、huawei search「重置」。
- **R2 内部动词泄漏**：`const copy = a.label ?? a.verb` 把 `buy`/`operate`/`open` 等内部词表动词印到界面（aliyun product-ecs 三个 `buy`、sspai 文章页 `operate`）。修正：动作文案只取 `label`，无 `label` 绝不打印 `verb`（`actionHtml` 与 `actionKids` 工具条两处都禁掉 verb 兜底；无文案的控件不渲染）。模型侧同轮补 label（aliyun「立即购买」、sspai「充电」）。
- **同族**：`renderDeflist` 标签为空仍输出 `.deflabel`（`min-width:130px` 构成无由缩进）→ 标签为空就不出该列；页头已渲染根 `_brand` 时根节点 meta 行不再重复输出 `_brand`（同一事实一处渲染）。
- **验证**：见 `.scratch/06-visual-review/fix-report-1.md`（门禁 `node m1/eval/pipeline.mjs`：保真 36/36、视觉自查 36/36 干净）。

## 评测口径（F4 澄清）
覆盖数字存在两个口径：试点日志（旧指标）与画廊（F-024 收紧豁免后的严口径）。**验收声明一律采用严口径**，`m1/eval/m3-final.json` 为准。

## 文本 judge 的能力边界（重要）
本 harness 的 judge 模型**无视觉能力**（读图被拒），故 layer-3 的**视觉主次判定只能由人完成**；agent judge 只能做 HTML/DOM 层面的确定性与捏造核查。校准记录须区分"人（视觉）"与"agent（文本）"两类判定。

## F-033 内部键当行标题 + 集合形态丢弃带 label 的动作（视觉复核 R7a/父代理裁定）
- **发现于**：四组视觉复核（apple-com-cn/iphone-17 对比表行标题印 `display/chip/camera/battery/ai/buy`；集合条目带 `_action.label` 时控件文字被条目 `_name` 顶替，约 30 处）。
- **两条根因**：① `renderCompareTable` 行标签 `FIELDS[key]?.label ?? key.replace(/^_/,'')` —— 词典没有该键时把内部键印上屏；② `renderChips/renderList/renderSeq/renderDeflist/renderControls` 只用条目自身的 `_name/_title` 作文本，动作 `label`（源站自己的控件文字，F-022）被丢掉。
- **修法（采纳）**：① 行标签只取「子节点 `_title` → `FIELDS` 词典标签 → 无标签」，**绝不印内部键**；② 新增 `itemExtra(it)`：条目名照常作内容，带 `label` 的动作另出控件（`a.ctl`/`span.ctl`）；`label` 与条目名同字（或互为子串，即同一事实的两种写法）时只渲染信息更全的一处，并由条目名降级为链接目标（F-020）。
- **验证**：见 `.scratch/06-visual-review/fix-report-2.md`；门禁 `node m1/eval/pipeline.mjs` 保真 36/36 + 视觉自查 36/36 干净。

## F-034 裸数字无标签/单位 + 句读成员排成一行 chip 流（视觉复核 R7b/R7c）
- **发现于**：airbnb room-28871 —— `4.86` / `815` 各占一行且无标签无单位、同一数值在「总体评分」与英雄区各渲染一遍；评分分布「5 星，88% 的评价 4 星，11% 的评价 …」被 `.chips{display:flex}` 排成一行连续文字（`.chip-item{display:block}` 在 flex 容器里不生效，故仍是一行）。
- **修法（采纳）**：① 角色数值事实 `_rating`/`_rating-count` 进 meta 行并带单位 ——「4.86 分 · 815 条评价」；deflist 里的分项评分同样带「分」；② 句读（，。；、）成员集合走 `chips-rows`（纵向，每条一行）；③ 模型侧去重：删掉 `overview.rating` 的裸 `_rating`/`_rating-count`（保留源站句子与评价入口），删掉 `reviews._detail`（与 meta 行同事实）。
- **验证**：同上；截图 `/tmp/fix2-airbnb-com-room-28871.png` 裁切确认「4.86 分 · 815 条评价」+ 5 行评分分布 + 分项「干净卫生 4.8 分」。

## F-035 grafana play-home 面板体在抓取里就是加载态（采集缺口，非模型/渲染器缺陷）
- **事实**：`corpus/grafana-play/play-home/dom.html` 每个 panel content 为 `<div>Loading plugin panel...</div>`（`data-testid="loading-plugin-panel-18"`）；即源站自身处于插件加载态时被截取。与 bilibili「弹幕列表填充中…」同例。
- **定案**：加载态文案不是内容事实（F-031/F-013），**不补进模型**（补即抄加载态）；渲染器已有面板名 `ol.seq` 序列。记入采集待办：截图前等待面板插件渲染完成。

## F-036 taobao 四会场商品名/图只在图内（采集缺口，非模型/渲染器缺陷）
- **事实**：`corpus/taobao-com/home/nodes.json` 中「百亿补贴 · 买贵必赔」「领券中心」「国家补贴」「淘宝秒杀」四张会场的**标题文案在抓取里**（会场的 `_name` 已采到并渲染成 h3 链接），但每个会场内的**商品成员只有价格文本**（`¥14999` 等），商品名与商品图分别是 0-byte 的 `img`（无 alt/src 文本）与图内像素 → 抓取台账里没有可用的商品名。
- **定案**：不发明商品文案。渲染器对"只有 `_price` 的成员"仍生成商品卡（价格脱离商品名语义不完整），记为**采集待办**：会场卡采集需补商品名（或图内可读的名称/alt）。
- **层级**：capture（商品名/图未入库）。

## F-037 角色单位叠加（渲染器回归，第 4 轮验收挖出）
- **现象**：`_rating-count` 已经带模型自己的 `unit`（如 `{"num":870,"unit":"人好评"}`）时，`ROLE_UNIT` 又追加角色单位「条评价」→ 屏上「870 人好评 条评价」（mi-com search-earbuds/search-phone 两页约 20 处）。`dd5b94e` 正确，`41ebd1c` 起坏。
- **定案**：**类型值自带 `unit` 时绝不追加角色单位**；角色单位只是兜底。规则落在 `roleFact`/`hasOwnUnit`。
- **防回归**：`audit-visual.mjs` 新增硬检查 —— 数字后跟两个相邻单位 token 即告警（`unit-stack`）。

## F-038 同页同名标题重复（模型侧重复，第 4 轮验收挖出）
- **现象**：`linear-app/home` 的 `proof._title` 与 `customers._title` 同字「Powering the companies building the future」，屏上出现两次 H2；源站该文案只出现一次（在 logo 墙之前）。
- **定案**：模型侧纠错——`proof` 用源站该图区的自身标签「Purpose-built」，`customers` 保留源站文案。**一个标题文案一页只出现一次。**
- **防回归**：`audit-visual.mjs` 新增硬检查 —— 同页 H1-H5 同名（≥6 字）在抓取里不重复即告警（`dup-title`）。

## F-039 airbnb 图墙第 5 张缩略图烘进了源站按钮（资产裁切，第 4 轮验收挖出）
- **现象**：`assets/airbnb-room-photo-5.png` 的裁切区把源站自己的「显示所有照片」按钮像素一起裁进去 → 页面上出现"图内假按钮 + 图外真控件"两个同名控件。
- **定案**：从 `corpus/airbnb-com/room-28871/full.png` 重裁该缩略图**按钮以上**的净区（272×178，`+1000+317`；按钮像素在 y≈500-528，裁到 y495 止），read 成品确认无内置 UI、分辨率与其余缩略图同级。资产选择须逐张 read 确认，不得凭 bbox 直接采信。

## F-040 校验器根调用缺失 ⇒ 校验空真（自 `6740f1c` 起，M4-a 发现）
- **现象**：`m1/validate.mjs` 的 `checkNode(model, '', [])` 根调用在提交 `6740f1c`（"encode antd table"）的 diff 里被顺手删掉。此后 `validate()` 只剩文末 `walk(model,…)` 的 ref / `_action.to` 目标解析，**全部节点级检查（未知键、`_intent`、`_primary`、`_when`、`_expose`、`_rel`、身份寄存）都是死代码**：`{"_intent":"x","_bogus":1}` 也判 `ok`。`node m1/validate.mjs` 的退出码恒为 0 ⇒ 2026-09-28 起的"42/42 模型校验通过"是**空真**，闭式语法的强制手段一直没在跑。
- **定案**：恢复 `checkNode(model,'',[])`；新增 `m1/eval/validate-selftest.mjs`（8 个坏样例必须被拒 + 2 个合法样例必须通过），并入 `m1/eval/pipeline.mjs`（失败即 pipeline 失败）。**gate 不会失败就不是 gate。**
- **影响面**：所有依赖"校验器会拦"的结论都不成立——包括 F-031 的"闭式枚举""形态谓词封闭"和 `axioms-v0.md §126`（"校验器必须解析全部 `_primary`/`ref`/`_when` 路径，解析失败 = 阻断"）。不是渲染缺陷，是**证明强度**缺陷。

## F-041 被 F-040 掩盖的 9 处模型缺陷（M4-a 发现）
- **事实**：恢复根调用后，36 策展模型里有 9 个不通过：
  - 5 处**悬空根 `_primary`**：`apple-com/home`="iphone-18-pro"、`sspai-com/post-114716`="intro"、`sspai-com/u-jtc092al`="feed"、`stripe-docs/payments`="intro"、`taobao-com/home`="search"（像是 `_lines` 重构前旧版命名子键的残留）；
  - 4 处 `_primary` **写成了对象而不是路径**：`sspai-com/home` banner + feed、`sspai-com/matrix` feed、`mi-com/search-phone` recommend（其中 3 处与同节点的 `_items[0]` 逐字相同）；
  - 1 处 `36kr-com/home` `hot._rel.order: "hot"` 不在闭式枚举 `sequence|time|none` 内。
- **定案（父代理裁定）**：**删除**非法/悬空声明（不改成"能解析但语义错"的引用）。渲染器早已忽略这些值 ⇒ **渲染零变化**（逐文件 `git show HEAD:` 渲染对比，9/9 字节相同）。真正该有 hero 的页面由策展 ticket 按语义重新声明 `_primary`（指主**事实**）。
- **验证**：`.scratch/07-m4/fix-report-5.md`。

## F-042 条目级 `_action.when` 从不求值（M4-a 的 D1 构造断言顺带挖出）
- **现象**：`renderControls` 与 `itemExtra`（`chips/list/seq/deflist/compare-table` 共用）直接读 `it._action`，**不求值 `_action.when`**；只有 `renderNode` 自己的 `_action` 走了 `evalExpr`。于是 `m1/models/ant-design/components-table.json` 的 "Delete selected"（`when: role == "admin"`、`role` 未注入）照样渲染成控件 —— 条件门形同虚设。
- **未修原因**：不属于 M4-a 的 D1-D3 范围（是"条目动作的条件求值"这条独立线），且修它会改动控件可见性语义、需先定"上下文未注入时 `role` 的默认值"（deny 还是 allow）。记为 ticket，交 M4 原语轮一起处理。
- **证据**：`/tmp/s-antd-bulk.png`（D1 断言截图里两个控件同时出现）。

## F-043 词汇增长（域字段，非失败模式）：aliyun 实例规格 `cpu` / `memory`
- **背景**：轮 6 把 aliyun `instances` 的 `_rel.compare` 删除，理由是“实例规格（2核2G）要成对照行必须在 `vocab-fields.json` 新增域字段（词汇变更）”。父代理裁定（轮 7 §3）：**允许**，属常规词汇增长。
- **变更**：`m1/vocab-fields.json` 新增 `cpu`（`{type:num, label:"CPU", unit:"核"}`）与 `memory`（`{type:num, label:"内存", unit:"GB"}`）；`m1/curated/aliyun-com/product-ecs.json` 四张报价卡补 `_fields`（抓取背书：`corpus/aliyun-com/product-ecs/nodes.json` 每卡 `p 实例 : N核NG`：e=2核2G / u2a=2核4G / c9i=4核8G / g9i=2核8G），并声明 `_rel.compare: true`。
- **结果**：`instances` 由“一排报价卡”变为对比表（列=实例，行=CPU/内存），有抓取与 `_intent` 双重背书。
- **状态**：已采纳（2026-xx-xx，父代理裁定·轮 7）。非失败模式，仅按 `vocab-fields.json` 纪律留痕。

## F-044 退化对比表：空壳表 + 位置行配对（引擎，第 6 轮独立验收挖出）
- **现象**（`_rel.compare` 声明正确，但渲染出的表退化）：
  - **空壳**（stripe-com/pricing `plans`）：两列各说各话——`标准定价` 的 `_detail`/`_text` 只在左列有值，`定制化定价` 的四个子项只在右列有值；**没有任何一行被两列同时填充**，表只是把两组无关事实并排。
  - **位置配对**（apple-com-cn/iphone-17 `which-iphone`）：实体各自的颜色集合按 `_items[i]` **下标**配对成行（薰衣草紫 ↔ 蓝），把两个无关列表强行对齐。
  - 断代：轮 6–8 期间两页 HTML 无字节变化 ⇒ 既有引擎行为，非回归。
- **定案**：见 `docs/m1/layout-axes.md §3.1/§3.2`。`_items[i]`/`_lines[i]` 位置键不是可比属性；实体嵌套集合渲染在该实体列内。对比集若 `有效行(被≥2实体共享)==0` ⇒ `degenerate-no-shared-attribute`，或 `填充率 < 0.4` ⇒ `degenerate-fill-rate:<rate>`，则回退到该集合的正常形态，并在 pipeline「显式降级清单」输出带理由的一条。
- **防回归**：`foundation-selftest.mjs` D2b 四条构造断言（稀疏集不进表 / 稠密集进表 / 低填充带率降级 / 位置集合留在列内）。

## F-045 词汇增长（域字段，非失败模式）：GOV.UK 国民保险费率表
- **背景**：轮 12 策展 `gov-uk/ni-rates-letters`（NH 费率表：每行一个类别字母，列为三段周收入区间的费率）。当前语法中“行=记录、列=属性”的数据表只能由 `_fields`（已声明域字段）表达；`_name` 在 run-table 渲染里不是列（见 F-046）。
- **变更**：`m1/vocab-fields.json` 新增 6 个域字段，标签一律取自抓取的表头 `<th>` 文本：`category-letter`（"Category letter"）、`employee-rate-low`（"£129 to £242 (£559 to £1,048 a month)"）、`employee-rate-mid`（"£242.01 to £967 (£1,048.01 to £4,189 a month)"）、`employer-rate-low`（"£96 to £481 (£417 to £2,083 a month)"）、`employer-rate-mid`（"£481.01 to £967 (£2,083.01 to £4,189 a month)"）、`rate-over-967`（"Over £967 a week (£4,189 a month)"，两张表共用）。
- **抓取背书**：`corpus/gov-uk/ni-rates-letters/dom.html` 两个 `<table>` 表头行逐字节见报告 §1；单元值（"0%"/"8%"/"1.85%"/"N/A"/"15%"）逐格照抄，未换算。
- **状态**：已采纳（轮 12）。非失败模式，按 `vocab-fields.json` 纪律留痕。

## F-046 登录/数据表的当前语法缺口（轮 12 策展新 exemplar 页挖出，未修）
三处结构性缺口，`m1/curated/**` 用当前语法如实建模并在此登记，**不造键**：
1. **secret 输入无类型**：`_expose.type` 的闭式值类型（§2 `text|num|money|date|time|bool|image|ref`）里**没有 password/secret**。三个登录页（stripe-dashboard / xiaomi-account / github-com）的密码框都只能声明为 `text`。引擎因此无法区分“普通文本输入”与“秘密输入”（无法决定掩码、不记录、不回填）。缺口归属 M4-b 的 `login` 原语（§4.5），本轮不预埋。
2. **无 `<th>` 的表头语义丢失**：`aliyun-help/ecs-instance-families` 有 224 个 `<table>`、1340 行、**0 个 `<th>`**（表头是灰底加粗 `<td>`）。提取器的 `buildTable` 找不到 `columnheader` 行 ⇒ 返回 `null`，整张规格表被丢弃（stats 记 `table-without-headers: 217`）。即：表头语义无法从 DOM 结构化判据恢复。
3. **表列词表爆炸 / 2 列表不能成表**：同一页的 217 张规格表共有 **76 个不同的列标签**（`实例规格` 204 次、`vCPU` 198 次……），且列是“规格属性”而非稳定域字段；用 `_fields` 逐列声明需要一次 76 条的词汇扩张（超出单轮策展的合理范围，且会成为事实上的 `table` 原语）。另外 run-table（`renderRun`）**不把 `_name` 当作列**（cols 只取 `_fields` + 非 name 事实），故“标签 + 值”这种 2 列表最多只能渲染为卡片，无法成表。这两点都由 M4-b 的 `table` 原语解决。
- **结果**：`aliyun-help/ecs-instance-families` 本轮**未策展**（见 `.scratch/09-new-exemplar-curation/report.md`「未完成页」）。

## F-047 `qualifier` 取值发散 ⇒ 本轮不收紧（M4-b1 测量，待人类决策）
- **测量**（`m1/curated/**` + `m1/models/**` 全量，2026-10 状态）：`qualifier` 共 **10 个不同取值**：
  `每 GB`×72、`起始价：`×8、`From`×6、`起`×4、`3.4% +`×3、`per certificate`×1、`订金`×1、`2.2% +`×1、`2.5% +`×1、`+`×1。
- **判定**：取值数 **>6**，且语义混杂（单位前缀 `每 GB`、显示前缀 `起始价：`、起始价词 `From/起`、**费率表达式** `3.4% +`/`+`、单价 `per certificate`、订金 `订金`）⇒ **不收紧为闭式枚举**（收紧会误伤现有语料）。
- **建议取值集**（供 M4-c 关词表时裁定，映射为语义 token + 显示映射，而非直接印 token）：
  `list`（原价/划线价，无显示前缀）、`from`（起始价，显示 `From`/`起`）、`per-unit`（单位价，显示 `每 …`）、`per-period`（按期，显示 `/月` 等）、`tax-incl`（含税）。
  现有的 `3.4% +` / `+` / `起始价：` / `订金` 属于**费率前缀与业务文案**，应迁到独立的事实/文案位，不能塞进这个闭式枚举。
- **本轮处置**：不新增/不删除 `qualifier` 值（`vocab.qualifiers` 未建立），只把 `_amount` 的“原价”标记收敛到 `list`（见 F-048）。
- **交叉引用**：`vocab.qualifiers` 的闭式化与 `_macro` 保留键同属“词汇/语法闭式化”待决项 —— 见 `.scratch/decisions-for-user.md` **D-1**（`_macro` 保留键）。

## F-048 原价（划线价）的显式标记是临时语义 token（M4-b1，待词表闭式化）
- **背景**：M4-a/D3 删除了引擎的金额比较后，mi 系列 `<del>` 原价的视觉语义丢失（fix-report-5 §4 已记）。本轮用**现有键**恢复：`_amount` 带显式限定词 `qualifier: "list"` ⇒ 弱化为删除线（`.fact.was`）。
- **落地**：`m1/render.mjs` 只识别 `list` 这一个显式标记，**不做任何金额比较**；标记本身是内部语义，**不渲染为文案**。`m1/curated/mi-com/{product-detail-mi15,search-earbuds,search-phone}.json` 的 `_amount` 全部改为 `{money, currency, qualifier: "list"}`。
- **数据缺口同轮补齐**：`mi-com/search-phone` 的 7 处 `<del>` 原价（1599/1799/2799/1799/2899/2399/3899）此前因“闭式词表无 was-price 角色”被策展丢弃（curation-log-ae「was-price vocab gap (7)」），本轮按源站 `<del>` 逐值补回 `_amount`。
- **缺口（未关）**：`list` 尚未进入任何词表文件；`vocab.qualifiers` 的闭式化 + 显示映射是**词汇变更**，需人类决策（与 F-047 同源）。在词表关闭前，`list` 是一个由引擎硬编码的临时语义 token。
- **交叉引用**：见 `.scratch/decisions-for-user.md` **D-1**（`_macro` 保留键）—— 同一类“闭式化需人类拍板”的项，同批上报。

## F-049 页面相对 URL（`/path`）不能作为 `_action.to`（M4-b2，gov-uk 分页控件命中）
- **发现于**：`m1/curated/gov-uk/ni-rates-letters.json` 的分页节点。源站 `<a href="/national-insurance-rates-letters/category-letters">` 是**站点相对 URL**。
- **缺什么**：`m1/validate.mjs` 把以 `/` 开头的 `_action.to`（以及 `ref`）**当作页内节点路径**去 `resolvePath` 解析（`/national-insurance-rates-letters/category-letters` → `bad segment`），因此**站点相对 URL 无法入库**。全库既有链接都是绝对 `https://…`（见 `gov-uk/register-birth-abroad.json`）。
- **本轮处置**：按 capture 的页面 origin（`https://www.gov.uk`）+ 捕获到的相对 href 拼成绝对 URL（`https://www.gov.uk/national-insurance-rates-letters/category-letters`），不捏造路径。
- **候选修法（未采纳，待裁定）**：区分"页内路径"与"站点相对 URL"的语法（如 `/…` 一律当 URL、页内引用只走 `key:`），或给 `_action.to` 增加站点基址解析。属语法/校验口径变更，不本轮即席发明。

## F-050 `paginator` 的"当前页 / 被分页集合"没有现成的表达位（M4-b2，受阻于 D-1）
- **背景**：`axioms-v0 §8` 原声明"分页控件不作表达"。本轮用**现有键**把页码集合渲染成控件行（条目级 `_action`；无捕获目标 ⇒ 控件观感，有目标 ⇒ `<a>`），但**"第 N 页为当前页""本控件分页的是哪一组结果"**没有可渲染的事实位：
  - 页码是 `_items` 的 `_name`；`_rel.order` 只表达顺序，不表达"选中页"；`_expose`（暴露状态）与 `_ref`（指向被分页集合）虽存在，但把一个**分页控件**声明为表单暴露状态/引用，是**原语级语义决策**，与 D-2（字段可引用性）同源。
- **本轮处置**：当前页与总数写入节点 `_intent`（**显式记录，不静默丢弃**），渲染只出控件行。
- **缺口归属**：命名原语 `paginator`（`_macro` = `paginator` + `_expose page` + `_ref` + `_count`）需要 **D-1 引入 `_macro` 保留键**的裁定；被 D-1 阻塞，本轮不预埋。与 F-047/F-048 同属"词表/语法闭式化"待决项。

## F-051 「表」的成立条件只认列数（≥3）⇒ 源站 2 列价目表一律降级为卡片（轮 12 挖出，已修）
- **现象**：`renderRun` 只在 `cols.length >= 3` 时出 `<table class="data">`，否则退化为卡片。`aws-amazon/ec2-on-demand` 的源站是**三张 2 列表**（`行标签 | 价格`），此前策展只用 `_name`+`_price`（未声明列），本轮声明 `_fields` 后仍**渲染不出表** —— 因为两列永远到不了阈值。这是 F-046.3 的同一根因（当时归给 M4-b `table` 原语，本轮收口）。
- **定案（明文规则见 `docs/m1/layout-axes.md §3.3`）**：表 = **身份列（成员名，有则必含）+ 已声明属性列**；有身份列 ⇒ 属性列 ≥2，无身份列 ⇒ 属性列 ≥2 且至少一列有已声明列标签。删除「≥3 列」历史阈值。**成表不得丢名**（身份列一定进表）。
- **影响面（枚举 + 证据）**：全库 `_fields` 列数分布 `{2 列: 5 节点, 4 列: 32 节点}`。放宽后**唯一**翻成表的是 aws 三张 2 列表；`aliyun-com/product-ecs` 的 `cpu|memory`（2 列、成员带名字）**不经 `renderRun`**（`_rel.compare` ⇒ 对比表；`.scale` 是命名子节点）⇒ 形态不变。逐文件渲染 diff：41 页里**只有 aws 一页字节变化**（其余 40 页含 gov-uk 字节相同）。
- **防回归**：`foundation-selftest.mjs` 四条构造断言（2 列已声明 ⇒ 表 / 单列 ⇒ 非表 / 身份列 + 1 属性列 ⇒ deflist / 带名成员成表保留身份列）。
- **状态**：已修（轮 12）。

## F-052 `_fields` 里的 money/list 值不进保真计数（度量漏洞，已修 · 轮 13）
- **现象**：`m1/eval/metrics.mjs::factValues` 只把 `_fields` 的 `text|date|num` 值计入事实集，**`money` 与 `list` 值不计**。轮 12 把 aws 的 74 个价格、Azure 的 71 个列表格（`Workloads`/`Series List`/`Links`）放进 `_fields` 后，这些值**不再被「事实保真 1.00」覆盖**（aws 事实数 154 → 81，Azure 37），页面因此更“绿”，但证明强度变弱。
- **定案（轮 13）**：**扩度量**——role 事实与 `_fields` 条目改走同一 `pushFact` 遍历（`text|date` 字面 / `money` 数值 / `num` 数值 / `list` 逐元素递归），`_fields` 的 `money`/`list` 进分母与匹配。口径只加严，不放宽。
- **结果**：全库事实 3739 → **3972（+233）**；仅 aws（81→155）、vm-sizes（37→196）分母变化，其余 40 页不变；**保真仍 42/42 = 1.00**（233 个新增值在既有渲染里本就存在，此前只是不进分母）⇒ 无新缺失、无渲染器缺陷、无需显式排除项。
- **防回归**：`m1/eval/metrics-selftest.mjs`（F-052 核心断言：`_fields` 的 money 值不在渲染中出现 ⇒ 保真 < 1.00；list 同理），已接入 pipeline 第 4 道门禁。
- **归属**：M4-b `table` 原语的度量面。**状态：已修（轮 13）。**

## F-053 表格单元格内的链接目标没有表达位（轮 12，未修）
- **现象**：`learn-microsoft/vm-sizes` 的 `Series List`/`Links` 列抓取里是锚点列表（如 `<a href="general-purpose/d-family#dsv7-series-and-ddsv7-series">`），但**表格单元格只能放类型化标量值**：`_fields` 的值没有承载 `<a href>` 的位置（`_action` 是节点级的，不是格级的），且目标多为**站点相对路径**（F-049 未关）。
- **本轮处置**：按 `list` 声明这些格子（值逐字），**链接目标如实丢弃并在此登记**（不捏造绝对 URL）。
- **归属**：`table` 原语（格级链接） + F-049（相对 URL）联合。
- **轮 13 补充**：F-052 修复后这 159 个链接格**文本**已进入保真分母且全部命中；格级 `<a href>` 目标仍无表达位（需 `table` 原语级裁定 + F-049），保持未修。

## F-054 保真匹配对极短数值过松（子串过匹配）——**已修 · 轮 14（部分：路径仍无关）**
- **现象**：保真匹配是规范化子串包含（`norm(render).includes(norm(value))`）。`String(v.money)` 为单字符时（aws 有 2 个 `{money: 0}` 单元格），只要渲染页任意位置出现一个 `0` 就判“已渲染”，无法区分该格是否真的渲染。
- **影响**：不制造假绿（本轮两格实测均真实渲染为 `每 GB $0`），但理论上可掩盖单个 `0`/个位数值的缺失。与 F-052 同源（都是度量面），方向相反（过匹配而非漏计）。
- **轮 14 修复（最小且可证）**：`m1/eval/metrics.mjs` 的 `isRendered` 改为**可见文本 + 边界感知**咨询：
  1. **可见文本**：先删 `<style>`/`<script>` 主体与**标签属性**（标篾折叠为 `<>` 仍作分隔符）——`margin:0`、`class="depth-0"` 不再为一格 `0` 作证；
  2. **边界感知**：`indexNorm` 在保留原 `norm` 输出的同时给出「保留字符 → 原始偏移」映射，逐次命中查**原始 HTML** 相邻字符，按值自己的**边类**判延续：数字边 ⇒ 邻接数字（或 `.`/`,` 且其外仍是数字）即不算；非数字边 ⇒ 邻接字母即不算。
- **可证性**（把“不可能失败的门禁”变成能失败的）：对 `aws-amazon/ec2-on-demand` 渲染页删掉两个 `$0` 单元格，旧口径仍报 **1.00（盲）**，新口径报 **0.987（153/155）并点名两条** `data-transfer-price` / `egress-price` 的 `:= "0"`。新自测 `m1/eval/metrics-selftest.mjs` 增 10 条断言（`0` 在 `2026`/`10.5`/`1,000`/样式表/类名里⇒不算；在 `$0` 里⇒算；`870人` 仍算，`87041` 不算；`Savechanges` 不算，`Pro further.` 算）。
- **重测**：42 页仍 **42/42 保真 1.00**，**无新增缺失**（严格收紧、零假缺失；反例筛选过程见 `.scratch/14-match-precision/report.md` §1）。
- **残余局限（未修，已写进 `m1/eval/rubric.md`）**：① **字母紧贴的数字**仍算命中（`0` 命中正文 `ID0`）：收紧它会把 `870人`/`2 vCPU` 这类“数字+紧贴单位”判成假缺失（实测 84 条假缺失）；② 度量仍**路径无关**——同页两个值相同的格，一格真缺而另一格真渲染时仍只报“已渲染”（aws 两个 `$0` 是已知例外）；③ 若将来渲染器把事实只放进 `title=`/`alt=` 等属性，会因“属性不作证”而报缺失（本轮 42 页无此形态：图片 `alt` 与 `ref` 本就不在分母内）。
- **状态**：已修（度量面），残余局限已如实登记；待 M4-b/M5 或独立度量重构时处理①（路径/格级对齐）。

## F-055 无源图片被渲染成空 src 的 `<img>`（轮 15 挖出，轮 16 已修）
- **现象**：留出集（69 个未策展页）唯一系统性硬缺陷——25 页 / 520 个 `<img>`。其中 515 个 `src=""`（浏览器裂图标），5 个 `src="undefined"`（字面量）。
- **根因两条**：① capture `nodes.json` 的 img 节点**只有 alt、没有 src**，URL 只在 `dom.html` 里；旧 `extract.mjs` 因此产出 `{image:'', alt}`。② 渲染器图带/promo 读 `.src`，而值里的键是 `.image` ⇒ 拼出字面量 `undefined`；且 `_image` 为**列表值**（一个 storyline 多张图）时整组图消失。
- **轮 16 修复（两层，都有构造断言）**：
  1. **渲染器守卫**：新增 `imgHtml(src, alt)` 作为唯一 `<img>` 出口——src 为空/缺失时**不输出 `<img>`**，退化为**已抓取的 alt 文本**（`<span class="img-alt">`；alt 是抓取事实，不属发明）。同时 `imageEntries(v)` 让 `_image` 的单值与列表值都按图带逐张渲染（修掉 `undefined` 与整组丢失）。断言 7 条在 `m1/eval/foundation-selftest.mjs`（D 系列之外的 F-055 段），并由 `pipeline.mjs` 每次必跑；用旧渲染器跑同输入可复现断言失败（门禁能失败）。
  2. **抽取器回读真 src**：纯 Node 扫描 `dom.html` 的元素序列，按节点自带的 `cleanedIndex`（= `document.querySelectorAll('*')` 文档序下标）逐元素取 `<img src>`；**每页要求所有带 tag 节点的 tag 与扫描结果全等**，否则**整页放弃**（不留错配 URL）。src 按 F-025 规则绝对化（`meta.json.url` 为 base；属性实体 `&amp;` 还原）。
- **重测**：留出集 69 页 `broken-img` 命中页 **25 → 3**，"无源" `<img>` **520 → 0**；视觉自查干净 **38/69 → 55/69**。42 页 exemplar 正文**逐字节不变**（只多一条 CSS 规则），保真仍 42/42。
- **残余（已如实登记）**：① 3 页 13 张 `<img>` 携带逐字捕获的 URL，但远端防盗链拒载（douban 418、byteimg 403；带 Referer 时 douban 200）——属源站可达性问题，非引擎发明（明文例外）；② 501 张 `role=image` 落在 `<span>/<svg>/<div>`（CSS 背景图/内联 SVG）的图**没有可取 URL**，退化为 alt 文本；要从背景图取 URL 需新增一类 src 来源，未做；③ 3 页（`antv/home`、`stripe-com/pricing`、`github-com/login`）下标空间与浏览器不一致被整页放弃，同样退化为 alt 文本。
- **状态**：已修（渲染器 + 抽取器两层）；残余 ①②③ 逐条留有数字与原因。

## F-057 截图产物非确定性（轮 20 顺带发现，接受为已知局限）
- **现象**：按规范跑 `pipeline.mjs --shots` 后，`m1/curated/renders/aliyun-com-home.png` 在模型/渲染器完全未变的情况下字节发生变化（HTML 产物零改动）。
- **影响**：不影响门禁（保真/自查均基于 HTML 与模型，不读 PNG），但**提交的证据图会漂移**，让 diff 噪音变大。
- **候选修法（未采纳）**：截图前冻结 CSS 动画/过渡、等待字体与图片就绪、固定设备像素比与随机种子；或把 PNG 从版本库移出（仅保留 HTML 产物与画廊按需生成）。
- **当前处置**：如实记录；提交时若只有 PNG 变化且 HTML 未变，视为已知非确定性。

## F-058 主次 CTA 颠倒 + 多动作竖排（轮 27 用户实证，已修）
- **现象**（用户实证，`apple-com/home`）：hero 里 `Buy` 与 `Learn more` **竖着两行**，且强调**读反** ——
  `Learn more`（元素自身 `_action`，`open`）被画成**黑色实心按钮**，`Buy`（子节点 `_action`，`buy`）反而是**浅色小胶囊**。
- **根因**：渲染器把"元素自身的 `_action`"一律当主行动（`.action` 实心、独占一行），把"子节点控件"一律当次要
  （`.ctl` 胶囊、包在自己的 `group` 章节里）⇒ 两个元素的**主次被读反，还各自独占一行**。
- **模型侧事实（实测，不是猜的）**：模型**没有**"谁是主 CTA"的标记；它有的是 F-020 的**两个元素**——
  元素自身的 `_action`（"查看详情"）与内部的**按钮子节点**（axioms §6 的 `buy` 例子原文）。全库 108 个多动作样本中，
  页面主的 `_action` 常常是导航（`查看更多资讯` / `Learn more` / `自动连播`），所以"自身动作=主"是**错的**规则。
- **规则（渲染强调规则，不改语法、不改模型）**：见 `docs/m1/layout-axes.md` §4.1 —— 一个元素的控件**成一行**；
  主 CTA = 行内第一个承诺型动词（`buy`/`preorder`/`add-to-cart`/`submit`），否则元素自身的 `_action`，否则行首；其余次要。
- **修复**：共享决策 `nodePlan().actionRow`（`m1/axis.mjs`，三个目标共用同一决策）+ HTML 只负责画（`.action` 实心 / `.ctl` 描边，
  同一 `.controls` 行）。行内只有一个控件时不包裹，改动只落在真正出现"多个动作"的容器。
- **验证**：42 页保真 1.00（HTML）+ 42/42（MD）+ 48 模型 + 七道自测全过 + 视觉自查 42/42 干净；
  `apple-com/home` 现在 `Learn more`（描边）+ `Buy`（实心）**同一行**，与源站一致。

## F-059 图片被 `object-fit:cover` 限高裁剪 + 小图不铺满（轮 27，已修）
- **现象**：`.cards .item img{height:150px;object-fit:cover}` **裁掉图片内容**；小图（`bilibili-com/home` 516×290 横幅）
  在 1060 宽容器里**缩在中间**，四周留白（用户描述为"小、居中、四周大片灰底"）。
- **实测**（playwright，42 页）：改前 22 张图被裁（aliyun 首页 6 + apple 首页 16），1 张未铺满（bilibili 横幅）；
  `apple-com/home` 的 hero 本来就是铺满的（3008×580 → 1060×204），用户那条观感来自上面两类。
- **修复**：图片默认 `width:100%; height:auto`（保持比例），**绝不** `object-fit:cover` 限高；不设固定高度（无 letterbox、无裁剪）。
  例外：`deflist` 行内缩略图保持自身宽度（图 + 控件成一行，不是区块主视觉）。
- **验证**：42 页重扫 **0 张被裁、0 张未铺满**；`img-variance` 自查仍 42/42 干净（同一网格内比例一致）。

## F-060 空 promo 盒：只有标题的集合成员被渲染成灰盒（轮 27，已修）
- **现象**：`apple-com/ipad-air`（`13” model` / `P3 wide color`）、`apple-com/macbook-air`（4 处）、
  `apple-com-cn/iphone-17`（2 处）出现**空灰盒子**。
- **实测**（全库探针）：`bareTitle` 命中 **8 处，8/8 是 `_lines`/`_items` 里"只有名字、没有 `_detail`"的普通成员**，
  **没有一个是带图广告位** ⇒ 旧规则把"没有内容的普通条目"误当成了"广告位"。
- **修复**：`bareTitle` 只在**源站有图**时成立（有图用图 `promo-image`）；**没有图 ⇒ 按普通文本/小标题渲染**（绝不空盒）。
- **验证**：8 处全部变为正常条目（标题进正文，保真不缺事实）；`.promo-label`/`.toolbar`/`.tool` 三条死 CSS 一并删除。

## F-061 动作行只有 HTML 消费，三目标对同一节点给出不同控件分组（轮 27b，已修）
- **现象**：轮 27 把"动作行 + 主 CTA"决策放进 `nodePlan().actionRow`，但**只有 HTML 渲染器消费**：
  `render-text.mjs`/`render-md.mjs` 里 `actionRow` 出现 **0 次**。两目标各自为政：
  自身 `_action` 单独一处；`plan.toolbar` 仅在 `length >= 2` 时另起一行（**单个 toolbar 子控件被丢弃**）；
  "标题即自身控件"的子节点按普通子节点渲染 ⇒ 与自身动作被拆成两处。
- **影响**：同一模型在三个目标下"动作分组与主次"可能不一致（`apple-com/home` 文本目标把 `[Learn more]` 与 `[Buy]` 分成两行；
  bilibili 视频页 a 块的多控件在文本/Markdown 里丢失）。
- **修复**：`render-text.mjs`/`render-md.mjs` 改为消费 `plan.actionRow` + `plan.rowConsumed`（文本一行并列、Markdown 行内链接，
  共享主 CTA 分别以 `*` / 加粗标出）；`nodePlan` **移除 `toolbar` 字段**，杜绝目标自行分组；
  titleIsControl 的元素**不再吞掉**同一元素上的其余控件。
- **验证**：`axis-selftest.mjs` A4 静态禁止私有分组（`actionKids`/`actionRowOf`/`plan.toolbar`），
  H0–H5 断言三目标在构造模型与全库 **68 个多控件行 / 17 页**上分组与主次一致；
  证伪：临时在 Markdown 里加私有 `actionKids` ⇒ 3 条断言失败，撤销后 86 条全过。

## F-062 chip 无视觉样式，特性标签连成一串裸文字（轮 27b，已修）
- **现象**：`.chip-item{display:block;padding:4px 0}` **无背景/边框/圆角**。`stripe-com/pricing` 的
  「1C+ 定价 交易量折扣 多产品组合折扣 …」、`aliyun-com/home` 的 6 个 ISO/PCI 认证都读成一串裸文字。
- **修复**：label chip（`.chips .chip-item`）加背景/边框/圆角/内边距，成为可辨的胶囊；句子成员（`.chips-rows .chip-item`）
  仍是纯文字行；换行由 `.chips{flex-wrap:wrap}` 保证，长列表不挤成一行。

## F-063 块级 chipbar 容器比内容宽，右侧空一大片（轮 27b，已修）
- **现象**：`fieldset.expose.chipbar` 是块级 ⇒ 铺满 ~1100 宽；`apple-com/ipad-air` 5 个单选组、
  `36kr-com/search-*` 的 search-type/sort、`huawei-cn/search-*` 的 `类别` 都是"外框很宽、内容只剩左侧"。
- **修复**：`fieldset.expose.chipbar{display:inline-block;max-width:100%}` 按内容收缩；需要满宽的选择表/数据表 fieldset 不受影响。
- **验证**：见 `docs/m1/layout-axes.md` §5.2；截图自查覆盖 ipad-air / 36kr / huawei。

## F-064 搜索框标签外置、提交控件另起一行（轮 27b · 用户 D-3，已修）
- **现象**：`_label` 走外部 `<span class="deflabel">`；`.expose{display:block}` 让输入框独占一行，
  提交控件（`站内搜索`/`重置`）另起一行；`bilibili-com/home` 的「磊哥游戏」也被外置。
- **用户裁定（D-3）**：搜索框应有名称；只有名称无默认值时，可把名称**当水印放进框内**节省空间。
- **修复**：共享判定 `choicePlan().labelAsPlaceholder`（`text`/未声明类型且有名 ⇒ 标签作 `placeholder`，保留 `aria-label`；
  `date`/`time`/`num` 仍外置）；`.expose-input` 行内化使提交控件与输入框同栏；有提交动作时提交控件**必须出现**（分组仍走 `actionRow`）。
- **验证**：`36kr-com/search-*`、`huawei-cn/search-*`、`bilibili-com/home` 均变为 `placeholder` + 同栏提交控件。

## F-065 `_primary` 长句导语按 H1 字号渲染 ⇒ 层级塌陷（轮 27b，已修）
- **现象**：`linear-app/home` 的 `_summary`（一句导语）被 `_primary` + `.hero.fact-hero .val{font-size:2em}` 渲染成 H1 字号，
  读者读不出真正的 H1（`The product development system for teams and agents`）。
- **修复**：hero 放大只适用于短值/数字；长文本 `_primary`（> 48 字）走 `.hero-prose`（1.15em/600），是导语不是标题。

## F-066 H1 采用文档 `<title>` 未注明来源 / SEO 串接串当 H1（轮 27b，复核并修正）
- **现象**：`mi-com/home`、`mi-com/shop-category-list` 用文档 `<title>` 当 H1，但 `_intent` 未注明来源；
  `mi-com/shop-category-list` 的 `<title>`「全部商品分类-小米商城」是 SEO 串接串，而 `nodes.json` 里「全部商品分类」是可见文本。
- **裁定（既有）**：H1 用抓取可见文本；确无可见标题才用文档标题并注明出处；不得编造。
- **修正**：`mi-com/home` 补记 `_intent` 来源（无任何 heading 节点、可见文本无页头文案 ⇒ 文档 `<title>`）；
  `mi-com/shop-category-list` 的 `_title` 改用可见文本「全部商品分类」并在 `_intent` 记明。
  复核 `36kr-com/{home,information-technology,search-ai,search-viz}` 已注明来源（合规，未改）。

## F-067 价格限定词一律前置 ⇒ `起 RMB 6799`（轮 30，已修）
- **现象**：`apple-com-cn/iphone-17` 源站是 `RMB 6799 起`，`fmt()` 却把 `qualifier` 一律加在数额**前** ⇒ `起 RMB 6799`；
  `每 GB`/`per certificate` 同理被前置。
- **判据（轮 30 明文规则，docs/m1/layout-axes.md §9.1）**：限定词的**位置**是这个词的**读法**，不是渲染器的偏好：
  `起/含税/每月/每…/per…` 后置；`从/From/起始价：/订金/费率` 前置；默认前置。
- **实现**：共享决策 `axis.qualifierPlacement`（闭式正则 `POSTPOSED_QUALIFIER`），`fmt()` 消费；
  三目标同源。**不新增模型键/语法**，无词表变更。

## F-068 同一金额在一节点内渲染两遍 / 数值角色事实裸数字（轮 30，已修）
- **现象（a）**：`iphone-17` 摘要 `RMB 6799 起或 RMB 284/月 起` 后，hero 又强调 `RMB 6799`（金额两遍）。
  摘要逐字渲染是保真硬门禁，故**去掉重复的 hero 行**（金额仍由摘要承载，事实不丢）。
- **现象（b）**：`_count`/`_measure` 等数值角色事实（bilibili 播放/弹幕数）渲染成裸数字。
- **实现**：`axis.quantityLabel`（读 `m1/vocab-role-labels.json` 的 `roleLabel`；无标签不加）；hero 去重见 §9.2。
- **状态**：已修（保真 42/42 保持）。

## F-069 同名标题/同名控件在同页重复（轮 30，部分修）
- **现象**：`stripe-docs/payments` 的「支付方式」既是 h2 又是嵌套分组标签 h3；`sspai-com/post-114699` 每条新闻各一枚「来源」外链（14 枚）。
- **规则（§9.4）**：标题——与祖先逐字相同、或与本页已出现标题逐字相同**且该节点自身无事实**（纯分组标签）时不再画；
  控件——**label 与目标都相同**才去重。
- **结论**：「支付方式」已去重（去掉内部 h3，链接与文本保留）；sspai 的「来源」**目标各不相同**，是 14 条真实外链，
  **不是**重复，**未合并**（合并会删掉 13 条真实链接）。此项为**部分修复**，理由如实记录。

## F-070 证据不一致：提交的渲染截图（PNG）比对应 HTML 旧（轮 31 四名终审独立发现；轮 32 做成门禁，已修）
- **现象**：`m1/curated/renders/*.png` 的 mtime 早于同目录已提交的 `*.html`（父代理实测旧 52 秒，四名终审各自复现）。
  画廊/截图仍显示旧样式（例如默认蓝下划线标题），而 HTML/CSS 里已修（轮 30 的 `a{color:inherit;text-decoration:none}`）——
  用户看的正是这些 PNG，会误判「没修」。根因：`--shots` 只在显式调用时重出图，且 HTML 每次 pipeline 都被重写，
  没有任何断言把「截图」与「当前 HTML」绑在一起。
- **修法（流程/工程，非语法变更）**：`m1/eval/pipeline.mjs` 新增**证据一致性门禁**：
  - `--shots` 结束前写 `m1/curated/renders/manifest.json`：每页 **HTML 的 sha256 + mtime**、**PNG 的 sha256 + mtime + 生成时间**，
    以及画廊 `index.html` 的版本号与哈希；
  - 新增 `--check-shots`：对每一页断言 **manifest 的 HTML 哈希 = 当前 HTML 哈希**（内容同源）且 **PNG 不旧于 HTML**（mtime）；
    不一致 ⇒ **退出码非 0 并点名页面**；
  - **默认（非 `--shots`）模式也跑这个检查**：HTML 更新了但没重出图会立刻暴露（不再是静默的旧证据）。
  - `m1/render.mjs` 的 CLI 写盘改为**幂等**（内容逐字节相同则不写）：否则每次默认 pipeline 都会 bump HTML mtime，
    让「PNG 不旧于 HTML」这条断言永远为假。
- **验证**：构造「改 HTML 不重出图」（向某页 HTML 追加一行注释）⇒ `--check-shots` 退出码 1 并点名该页；恢复后重出图 ⇒ 通过。

## F-071 主 CTA 回退把属性类控件提为实心主按钮（轮 27 引入；轮 32 修正）
- **现象**：`airbnb-com/room-28871` 顶部动作行两条**属性类控件**（`共享` / `添加至心愿单`，verb 均为 `operate`）中，
  `共享` 被渲染成**深色实心主 CTA**、真动作「添加至心愿单」被降级为描边——主次比改前更错。
- **根因**：轮 27 的主 CTA 规则在「没有承诺型动词」时回退到「元素自身的动作 / 行内第一个」，于是把任意一个提为主。
- **修法（明文规则 §4.1 rule 2，无模型/语法变更）**：**主 CTA 只由承诺型动词认领**
  （`buy`/`preorder`/`add-to-cart`/`submit`）；**没有承诺型动词时整行没有主 CTA，全部次要**；
  行内**只有一个控件**时它不是「主次选择」，维持原形状（它本就是该元素自身的动作）。
- **实现**：`axis.mjs` 的 `actionRowOf`：主 CTA 索引仅取第一个承诺型动词，找不到且行内多控件时 `pi = -1`（无主）。
- **验证**：`axis-selftest.mjs` J0–J3（构造集：两条 `operate` ⇒ 无主、HTML 两条 `.ctl`、text/Markdown 同行无标记）；
  airbnb 顶部两条均为 `.ctl`，不再有实心「共享」。

## F-072 通用数量标签套在语义不同的事实上（轮 30 引入；轮 32 修正）
- **现象**：`bilibili-com/{home,video-bv1gj411x7h7}` 的播放量/弹幕量被渲染成 `数量 20.2 万 · 规格 155` /
  `数量 1亿 · 规格 15万`——`_count`→「数量」、`_measure`→「规格」是**通用词**，站点语义实为**播放量/弹幕量**；
  把弹幕数标成「规格」比裸数字更误导（读者会当成手机规格）。组 2/3/4 独立同结论。
- **修法（词表使用纪律，§9.3）**：`axis.quantityLabel` 的**自动前缀集**（`NUMERIC_LABEL_KEYS`）只保留**语义无歧义**的角色：
  `_rating`→评分、`_rating-count`→评价数、`_stock`→库存（`_price` 金额格式自带单位）。`_count`/`_measure` 是通用计数，
  **默认不加标签**，除非模型显式给出自己的 `_label` 文案；二者仍可作**数据表列头**（表格里是有归属的列名）。
- **验证**：bilibili 首页/视频页不再出现「数量/规格」；airbnb 的「评分 4.86 分 · 评价数 815 条评价」保持不变。

## F-073 形态选择把带图/带动作的集合成员折叠进 `<details>`，静默丢图与链接（轮 32 修正）
- **现象**：`huawei-cn/home` 的「推荐信息」4 条（模型里各带源站图 + 「了解更多」外链）被渲染成 `<details class="qa">` 折叠问答，
  **4 张图与 4 个链接全部丢失**（评审：只显示 2/6 张图）。
- **根因**：`selectForm` 的 accordion 分支只要求成员有 `_title`+`_detail`、无子节点，未检查 `_image`/`_action`。
- **修法（明文规则 §9.6，无模型/语法变更）**：accordion 分支要求每个成员**既无 `_image` 也无 `_action`**；否则按卡片/列表渲染，
  保留图与动作。真 FAQ（标题+详情、无图无动作）仍走 accordion。
- **验证**：`axis-selftest.mjs` I0–I2（构造集：带图+动作 ⇒ 非 accordion，4 图 4 动作均在）；huawei「推荐信息」渲染为卡片，4 图 4 链接俱在。

## F-074 图带缩在文本栏里、左右留白边（轮 34 修正）
- **现象**：`mi-com/home` 的 10 条 `<figure class="strip">` 实测宽 **1060px**（视口 1280/1440）⇒ 左右各约 **110/190px 白边**；
  g3 终审量到「左右各约 107px」。违反 `layout-axes §7`「图像主导页 ⇒ 满幅」。
- **根因**：`.strip` 没有自己的宽度，继承 `main{max-width:1100px;padding:0 20px}` 的**文本栏**宽度。
- **修法（明文规则 §7 补充，无模型/语法变更）**：`.strip` = `width:100vw` + `margin:0 calc(50% - 50vw)`（负 margin 居中展开到视口）；
  卡片/表格/推广盒内的图不是「页框」，由 `.cards .strip,.run .strip,.promo .strip,.cmp-table .strip,.defval .strip,td .strip` 还原为容器宽。
- **验证**：`node .scratch/34-layout/measure.mjs m1/curated/renders/mi-com-home.html 1280 900` ⇒ 7 条带子全部 `l=0 r=1280 w=1280`；
  `scrollWidth == clientWidth`（无横向溢出）；`audit-visual` 42/42 仍干净。

## F-075 纯白裁切带被当内容渲染成页尾空白（轮 34 修正）；同时是**采集缺口**记录位
- **现象**：`mi-com/home` 页尾 **1420px（约 30%）纯白**。逐张量资产：`mi-home-band8/9/10` **整幅只有一种颜色 `(255,255,255)`**（暗像素 0.00%）。
- **根因**：这三条带子是 `corpus/mi-com/home/full.png` 里**源站自己的空白空洞**（y≈4400–6360，逐行采样非白像素占比 0.000）原样裁进来的——
  源站懒加载区块在采集时未绘制。空白**在裁切图的像素里**，且该区域**没有任何内容可裁**（重裁结果是空集）。
- **修法**：从模型 `showcase._items` 移除这三条空带（不做任何像素合成），并在本文件记录采集缺口。
- **验证**：`measure.mjs` ⇒ `scrollHeight 4095`、末内容底 `y=4003`、`tailDead=92px`（= `main` 的 80px 下内边距 + 12px 外边距，正常）。

### 采集缺口（capture gaps，供采集侧修，本轮不编造内容）
1. `mi-com/home`：`full.png` y≈4400–6360 为空（源站懒加载区块未绘制）；源站 footer 区 y≈6360–6858 未进任何裁切带 ⇒ 模型里没有这一段。
2. `mi-com/product-detail-mi15`：`full.png` y≳2400 全空——详情 20 张长图（`dom.html` 里有真实 `src`）在采集时未绘制。
   本轮按任务授权只换掉 hero（见 F-076 相邻记录），**未**把这 20 张图补进渲染（会引入采集未验证的 2 万像素内容）。
3. `grafana-play/play-home`：**面板内容没有进抓取**。证据：
   `grep -c 'Loading plugin panel' corpus/grafana-play/play-home/dom.html` ⇒ **1 行**（该 DOM 是单行文件），
   `grep -o ... | wc -l` ⇒ **2 处**；`nodes.json` 里 80 处提到该 loading 文案，且**纯数字节点 0 个**——
   即 11 个 stat 面板的**数值一个都没被采集到**（面板未加载完）。⇒ 渲染侧只能给出**面板名清单**（F-077），
   面板数值/底色属采集待办，**不得从截图转写**。

## F-076 一格里可点的条目与周边死文本完全同款（隐形链接）（轮 34 修正）
- **现象**：`mi-com/product-detail-mi15` 页尾保障组里 `售后服务政策`/`7天价格保护` 是真链接，实测 `color: rgb(23,33,43)`（与死文本同色）、`text-decoration-line: none` ⇒ 读者以为不能点。
- **根因**：轮 30 的站点级规则「链接继承文字色、默认无下划线」在**混排集合**（有的成员是链接、有的是死文本）里没有可辨性。
- **修法**：`.chips a{text-decoration:underline; text-underline-offset:2px; text-decoration-color:#9db0c4}`——只在「标签组」里补可辨下划线；
  标题/条目名/整列皆链接的清单维持轮 30 的「继承色、hover 下划线」不变。
- **验证**：playwright 取样式 ⇒ 两条链接 `text-decoration-line: underline`；`audit-visual` 无 `empty-anchors`。

## F-077 长串纯标签渲染成 1..N 编号目录（轮 34 修正）
- **现象**：`grafana-play/play-home` 的 11 个面板名渲染成 `<ol class="seq">1. Introduction … 11. Emoji in stat names` ⇒ 整页像技术文档的目录页（g4 唯一 untouched 的 major）。
- **根因**：`_rel.order=sequence` + 纯标签成员 ⇒ `renderSeq` 一律编号；编号把「一组面板名」读成「章节目录」。
- **修法**：`renderSeq` 中「成员 ≥6 且每项只有名字（无其他事实）」⇒ 渲染为 `.manifest` 等格清单（名字、DOM 顺序都不变，只是不编号）。
- **验证**：grafana 页现为 11 格清单，无 `<ol>`；`axis-selftest` C3（2 项纯标签序列）仍要求 `<ol class="seq">` 并通过（未改轴决策）。

## F-078 元数据与正文同级 + 表格分组行/长导航清单（轮 35 修正，终审 major）
- **现象**：(a) 36kr feed 卡片里 `来自主题：X|作者 · 时间` 与正文摘要**同字号同字重**、`|` 硬串成一句；(b) 24小时热榜无序号；(c) aws ec2 表段首「分组行」（第二格空）渲染成**漏价的数据行**；第二张表 h2 与列头复读；(d) gov-uk 正文行宽铺满 ~1060px；(e) taobao 首屏 62 个类目/推荐词链接渲染成一排排 `.ctl` 胶囊 ⇒ 像 sitemap。
- **根因**：(a) 元数据落成通用 `_detail` 文本、且 `_datetime` 未进 `META_KEYS`；(b) 有序 `_rel.order` 的 deflist 不编号；(c) `renderRun` 把单列行当普通数据行；(d) `.fact/.prose` 无最大测度；(e) 长串纯标签**链接菜单**被当控件集（`controls`）出胶囊。
- **修法**：`axis.mjs` 把 `_datetime` 并入 `META_KEYS`；纯标签集合中「≥8 条且每条带 `_action`」的链接菜单走 `list`。`render.mjs`：`renderDeflist` 在 `order==="sequence"` 时出 `.ranked` 序号；`renderRun` 把「唯一取值在身份列」的行出为 `<tr class="row-group">` 跨列小节标题；`.fact/.prose` 加 `max-width:74ch`（hero/cards 重置）；`renderList` 短标签按条数分栏 `cols2/3/4`。模型侧：36kr feed `_detail` 拆成 `_source/_author/_datetime`；`home.hot` 加 `_rel.order:"sequence"`；删 `aws region-egress._title`（抄自列头的重复标题）。
- **验证**：pipeline `--shots` ⇒ HTML 42/42 + MD 42/42 保真、48 模型通过、七套自测通过、视觉自查 42/42 干净、证据一致性通过。

