# 63 · sspai-com/post-102392 — recapture re-curation

Worker: wave-1 curation worker. Drift class: light-moderate (4 unmatched facts + 4 stale action targets found by the F-025 sweep — integrity does not check targets, the contract does).

## 1. meta._detail「2 分钟阅读 · MIT License」

- 合成串（含「 · 」分隔符）不在新 capture：meta 行 nodes[86/101] 为 `MaxChow 2 分钟阅读`；MIT License 只作为正文内链接存在（nodes[124/125]），且已由正文 `_quote` 事实覆盖。
- 动作：`meta._detail` → **`2 分钟阅读`**（verbatim）。许可事实单一 home 保持为正文引言。

## 2. related._items — 4 张卡全部轮换（关联阅读是滚动推荐位）

新 capture（nodes[234–304]，dom 链接序）：

| # | 新标题（nodes verbatim） | 作者/日期（capture 有，未建模，与旧形一致） | 目标（dom verbatim） |
|---|---|---|---|
| 0 | 弯道超车｜赛车入门指北 03：进站不只为换胎，策略里的那本时间账 | 一群小羊说 08/01 | https://sspai.com/post/112701 |
| 1 | 怀旧手记｜从迷你电脑到口袋笔记本，索尼如何把电脑越做越小 | 随便好啦 09/24 | https://sspai.com/post/114821 |
| 2 | 派评 \| 近期值得关注的 App | 少数派编辑部 10/12 | https://sspai.com/post/115934 |
| 3 | 写给「跑两步就喘」的你：不能忽略的跑后拉伸与恢复 | 阿帅的健康笔记 10/11 | https://sspai.com/post/115568 |

- 旧 items[0/2/3]（新 iPhone 相机…114453 / 众测招募…114410 / HomeLab…113880）已不在 capture → 删除。
- 旧 items[1]「派评｜近期值得关注的 App」标题匹配 integrity（栏目名相同），但目标是**另一篇文章**（114577 → 115934，F-025 sweep 抓出）；标题一并改为新卡的逐字形（半角 `|` 带空格，nodes[277]）。
- 形状与旧模型一致：`_title` + `_action`（作者/日期旧模型未建模，未新增）。

## 3. related[0] 封面图（asset）

- 旧 `_image` 指向 `../assets/sspai-102392-623052a8f6d6a5d3354c9151079fc560.webp` = 已消失文章的封面 → 必须撤下（挂着会变成错误归属）。
- 新首卡封面在 capture 中有绘（nodes[253] image，name=标题即 alt，归属可证明：图在卡链接内、紧随卡文案——recapture 规则 7）。按 bbox x809 y3997.78 w166 h124 从 `corpus/sspai-com/post-102392/full.png` 裁切（1/1 DPR，1440 宽），**颜料验证：5685 个不同色** + 人工目检（赛车赛道封面、卡标题文字清晰）。
- 新资产：`m1/curated/assets/sspai-102392-related-112701.webp`（166×124 webp，5.3K）；`_image.image` 指向它，`alt` = nodes[253] name verbatim。

## Allow entries proposed
None（合成串已拆解，无残余不可溯源事实）。

## Evidence (2026-10-16, ticket env)
- validate → ok；capture-integrity → factsTotal 50, **unmatched 0**
- render → `/tmp/sspai-com-post-102392.html`; metrics → **factFidelity 1** (50/50)
- F-025 target sweep → 25 checked, **0 stale**
- screenshot reads used: 1/4（新封面裁切目检）
