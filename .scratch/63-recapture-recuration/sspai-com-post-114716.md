# 63 · sspai-com/post-114716 — recapture re-curation

Worker: wave-1 curation worker. Drift class: light (3 unmatched facts + 3 stale targets via F-025 sweep).

## 1. `_lines[4]._lines[0]._text`（丽兹·波顿条目关键词行）

- 旧：`关键词：犯罪 / 惊悚 / 传记` → 新 capture nodes[199]：**`关键词：犯罪 / 惊悚`**（「传记」被源站撤下）→ updated verbatim。
- 同条目其余事实（又名 / 片长 50 分钟左右（单集）× 8 集 / 观看渠道：Netflix / 豆瓣链接 / 短评两段）与新 capture 逐字一致，未动。

## 2. `_lines[16]`（关联阅读）— 4 项全部换成新一期

新 capture（nodes[821–824]，dom 链接序 115566 → 115211 → 114957 → 114458）：

| # | 标题（verbatim） | 日期 | 目标（dom verbatim） | 对应旧 item |
|---|---|---|---|---|
| 0 | 本周看什么 \| 最近值得一看的 11 部作品 | 10/09 | https://sspai.com/post/115566 | （新） |
| 1 | 本周看什么 \| 最近值得一看的 8 部作品 | 10/02 | https://sspai.com/post/115211 | 旧「8 部」114175（**同栏目名不同文章**，F-025 抓出） |
| 2 | 本周看什么 \| 最近值得一看的 6 部作品 | 09/25 | https://sspai.com/post/114957 | 旧「10 部」×2（113944/113693，已不在 capture） |
| 3 | 本周看什么 \| 最近值得一看的 7 部作品 | 09/11 | https://sspai.com/post/114458 | 旧 item[0]，标题/日期/目标均未变，仅移位 |

- `_summary`（少数派编辑部）与 `_title`（关联阅读）未动。

## Allow entries proposed
None. Asset additions: none.

## 附注（非阻塞）
- 模型 `_action` `https://sspai.com/tag/生活方式`：dom.html 以相对形 `href="/tag/生活方式"`（原生中文，未百分号编码）verbatim 存在——同一 URL 的相对形，非 stale。粗粒度的绝对串匹配会误报，检查脚本已加 raw-path 回退。
- integrity 的「10 部作品」×2 unmatched 实为条目更替；同形标题「7 部」能匹配是因旧条目标题恰好留任，不能只信标题匹配——目标逐字核查（F-025 sweep）才是本轮抓根的手段。

## Evidence (2026-10-16, ticket env)
- `node m1/validate.mjs m1/curated/sspai-com/post-114716.json` → ok
- capture-integrity → factsTotal 128, scanned 122, **unmatched 0**
- render → `/tmp/sspai-com-post-114716.html`; metrics → **factFidelity 1** (128/128)
- F-025 target sweep → 37 checked, **0 stale**
