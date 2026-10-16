# links · sspai-com/post-114716 · round 63 link-coverage closure

Baseline: `node m1/eval/link-coverage.mjs --only sspai-com/post-114716` → 7 wrong-target findings, all reason “invalid captured source/owner witness” (matches /tmp/links-now.json). `node m1/validate.mjs m1/curated/sspai-com/post-114716.json` → ok. `node m1/eval/capture-integrity.mjs --only sspai-com/post-114716` → 0 unmatched.

## Findings · 7 stale witness bindings (model targets all correct)

Every finding is `checkSourceWitnesses` failing on `sourceHash`: the witnesses file records the pre-recapture dom hash `0f50c4c2…`, the current dom hashes `f5ba1d6c220fdd5dde25584315b09daa5f119352a69fcded0f855ce6a39f6f8d`. Address-by-address check of the CURRENT capture shows every binding still TRUE at its recorded address (text and href unchanged):

- `_lines[11]._items[0]` `[电影] 伪钞之王` → `https://movie.douban.com/subject/37116027/` — still at `/html[0]/body[1]/div[0]/div[0]/div[1]/div[0]/article[0]/div[1]/div[0]/div[0]/div[20]/div[1]/p[0]/a[0]`
- `_lines[11]._items[1]` `[美剧] 劣探德克尔 第二季` → `https://movie.douban.com/subject/38456407/` — at `…div[20]/div[1]/p[1]/a[0]`
- `_lines[11]._items[2]` `[电影] 安昂传奇：最后的气宗` → `https://movie.douban.com/subject/35930978/` — at `…div[20]/div[1]/p[2]/a[0]`
- `_lines[12]._lines[4]._items[1]` `电影《绅士行动：暗战》首支预告：` → `https://www.bilibili.com/video/BV1EWer6qEts/` — at `…div[22]/p[16]/a[0]`; its `sourceLink` `来源` → `https://sspai.com/link?target=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DIFF4fNg0CEM` — at `…p[16]/a[1]`
- `_lines[12]._lines[4]._items[2]` `恐怖电影《另一个妈妈》正式预告：` → `https://www.bilibili.com/video/BV1hseH6NEaQ/` — at `…div[22]/p[17]/a[0]`; its `sourceLink` `来源` → `https://sspai.com/link?target=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DavXdGfYmRhM` — at `…p[17]/a[1]`

(Model hrefs carry the source's trailing slash; `normalizeHref` equates them with the witness targets — no target drift.)

- Decision: capture carries the model's target → do NOT change the model. Note for the parent: an allow entry is INERT for witness findings — `checkSourceWitnesses` pushes into findings without consulting the allow index — so the operative lever is a hash-only rebind of these 7 entries in `m1/eval/link-owner-witnesses.json` (shared, parent-integrated): set `sourceHash = f5ba1d6c220fdd5dde25584315b09daa5f119352a69fcded0f855ce6a39f6f8d`, all other fields unchanged. Allow entries in the instructed shape follow for completeness.

## Proposed link-coverage-allow entries (parent-integrated; see inert note above)
```json
{"page":"sspai-com/post-114716","kind":"wrong-target","text":"[电影] 伪钞之王","reason":"55 轮 witness 的 sourceHash 被回捕作废；锚点仍在原地址 …div[20]/div[1]/p[0]/a[0]，text/href 与 witness 记录逐字一致，模型目标（尾斜杠按 normalizeHref 等价）未变。","round":63}
{"page":"sspai-com/post-114716","kind":"wrong-target","text":"[美剧] 劣探德克尔 第二季","reason":"同上：hash 作废，绑定在 …div[20]/div[1]/p[1]/a[0] 仍逐字成立。","round":63}
{"page":"sspai-com/post-114716","kind":"wrong-target","text":"[电影] 安昂传奇：最后的气宗","reason":"同上：hash 作废，绑定在 …div[20]/div[1]/p[2]/a[0] 仍逐字成立。","round":63}
{"page":"sspai-com/post-114716","kind":"wrong-target","text":"电影《绅士行动：暗战》首支预告：","reason":"同上：hash 作废，绑定在 …div[22]/p[16]/a[0] 仍逐字成立。","round":63}
{"page":"sspai-com/post-114716","kind":"wrong-target","text":"来源","reason":"两个 sourceLink（p[16]/a[1] 与 p[17]/a[1]）hash 作废但绑定逐字成立；allow 按 text 键共享一条。","round":63}
{"page":"sspai-com/post-114716","kind":"wrong-target","text":"恐怖电影《另一个妈妈》正式预告：","reason":"同上：hash 作废，绑定在 …div[22]/p[17]/a[0] 仍逐字成立。","round":63}
```

## Proof of closure (harness, 2026-10-16)
checkPage with a /tmp copy of the witnesses file where only the 7 `sourceHash` fields are refreshed → **undeclared findings 0** (declared 1 = round-55 `少数派编辑部`), linked 12/13 + declared. No other check touched.
