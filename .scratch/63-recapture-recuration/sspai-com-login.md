# sspai-com/login — new curation (round 63)

Worker: curation worker, round 63. Date: 2026-10-16.
Capture oracle: `corpus/sspai-com/login/` (capturedAt 2026-10-16T08:41:16Z, status 200,
`https://sspai.com/login/`, title “登录 - 少数派”, archetype form/checkout/settings).
Shape reference: `m1/curated/github-com/login.json`. The capture is minimal (36 nodes, 23 with
text; `dom.html` is 4.3 KB), so a small honest model is the correct output — 13 facts.

## What the capture carries (all modeled)

- `_title` “登录少数派” (the page's own heading; document title is “登录 - 少数派”).
- `login.identifier`: placeholder/label “输入手机号 或 邮箱”, `_expose {name:"login", type:"text"}`.
- `login.region`: the international dial-code panel, captured OPEN — `nodes.json` carries the
  options merged into one 200-char-capped name (“+86 中国 86美国 1日本 … 56哥伦比亚 57”). Modeled
  verbatim as the panel's `_detail` text (splitting into per-option items would require a boundary
  decision the capture does not prove; the merged leaf is the capture's own unit).
- `login.submit`: “登录 / 注册” with `verb: submit` (the page's single submit control).
- `login.alternatives`: group `_title` “其他方式” — the capture's own label for the third-party row.
- `login.agreement`: sentence “未注册手机号验证后自动登录, 注册或登录即代表同意” + `用户协议`
  → `https://sspai.com/page/agreement` + `隐私条款` → `https://sspai.com/page/privacy_policy`
  (the only two hrefs in the capture, verbatim).
- `support`: the floating toolbar copy — items 联系客服 / 发送邮件 / 商务合作 / 少数派 App (no
  captured targets → kept action-less) + note “请用微信手机端扫码咨询客服”.

## Dropped / not invented (with capture evidence)

- **Password input**: present in nodes with `visible: false`; dom shows the wrapper is
  `comp__PasswordInput--hidden` with `aria-hidden="true"` (a hidden alternate field, plus an
  eyes-closed toggle inside it). Dropped per the visible:false drop class; recorded in `_intent`.
  Consequence: the `login` composite's required `secret` slot has no capture-side counterpart, so
  the block is modeled as a plain form group, NOT `_composite: "login"` (github reference provides
  the shape, not a mandate; inventing a visible password field would break capture-truth).
- **Two third-party login icon buttons** under 其他方式: icon-font glyphs only (a11y names are
  private-use codepoints `\ue964`/`\ue963`); identities exist solely as CSS classes
  (`ssCommunityIcon__weixin` / `ssCommunityIcon__weibo`) — not user-visible text. No visible name
  is invented; the group keeps only “其他方式” and the evidence is recorded in `_intent`.
- **Two floating icon buttons** (customer-service / back-top, classes
  `ss__customer__service__button` / `ss__backtop__button`): same treatment, no invented labels.
- **Region list tail “57”**: the merged name is cut by the 200-char name cap mid-option; the
  completion source does not exist (`dom.html` contains no such panel — the dropdown content was
  DOM-detached at capture). The trailing orphan code is dropped and the truncation is recorded in
  `region._intent` (batch AF rule 3 requires a DOM-verbatim completion source; there is none).

## Assets

None. No image in the model; nothing proposed for `m1/curated/assets/`.

## Evidence

```
node m1/validate.mjs m1/curated/sspai-com/login.json
  → ok
node m1/render.mjs m1/curated/sspai-com/login.json /tmp/sspai-com-login.html
node m1/eval/metrics.mjs … /tmp/sspai-com-login.html corpus/sspai-com/login
  → factFidelity 1 (13/13); storyline tau null (6 model storylines, 0 heading matches —
    the page has no headings to match; metric feature, not a gate)
node m1/eval/capture-integrity.mjs --model m1/curated/sspai-com/login.json
  → 13 facts, 0 unmatched (exit-fresh capture; literally 0, no allow entries involved)
Screenshot check: /tmp/sspai.png — title, identifier field, region paragraph, 其他方式,
agreement + 2 links, submit, support note + 4 chips all render.
```

## Residual risks

- The model carries the dial-code panel as one merged text; if a later capture shows discrete
  options, re-splitting into single-select items would be the upgrade path.
- `support` items are action-less by capture (no targets); if the real controls have endpoints,
  a future capture with them painted should restore the actions.
