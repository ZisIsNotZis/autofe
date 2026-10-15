# audit-media-auth-utility

## Contract
- Owner: audit-media-auth-utility lane worker, assigned by Main; no children.
- Baseline: `refs/autofe-private/62-all-sites-baseline` / `403cd5be096db89b428e130ad57cca730b425fdc`.
- Parent full contract/current decisions/proof: `/home/z/vibe/autofe/.scratch/62-all-sites/packet.md`. Read that compact packet before acting; no session/transcript inheritance.
- Read-only original capture symlink: `corpus` -> `/home/z/vibe/autofe/corpus` (contract restriction, not OS write enforcement). Never modify shared corpus/reference evidence.
- All new findings/screenshots/logs/hashes go under `/home/z/vibe/autofe-worktrees/62-all-sites/audit-media-auth-utility/.scratch/62-all-sites/audit-media-auth-utility`. Record actual `date -Iseconds` event times here; checkpoint each page/decision, not only at end.
- Never publish, commit master, add dependencies, spend, use external compute, reset/delete existing work, or change CLI/provider on infrastructure failure. Exact failure -> ticket + supervisor.
- Completion path: local `findings.md`/`proof.md`/hash manifest plus concise artifact pointer to Main; no routine user updates. No detached unobserved jobs.
- Scope: findings/evidence/ticket only; project source/models/assets/tests/docs and generated gallery are read-only. This is diagnostic audit, NOT fresh acceptance review of later fixes.
- Budget: 40 minutes wall-clock; command timeout <=180s, one browser instance with one active page; checkpoint by minute 35. At exhaustion preserve per-page coverage and next uninspected page/width, report incomplete.
- Owned pages:
  - `bilibili-com/read-home`
  - `bilibili-com/video-bv1gj411x7h7`
  - `github-com/login`
  - `stripe-dashboard/login`
  - `xiaomi-account/login`

## Required output
For each owned page inspect whole-height actual rendering at 2560/1920/1440/390; compare relevant existing source captures/images, facts/actions and content grouping. Report severity, exact selector/model path, width, source evidence, actual screenshot/crop paths and hashes, likely engine vs factual-model seam, and concrete falsifiable fix criterion. Whole-height inspection must include all sections (overlapping readable strips as needed), not only thumbnail/top. Separate defects from allowed source full-bleed and accepted brand variation; no speculative redesign. Geometry/gates alone cannot PASS. If no defects, give positive exercised coverage and limits. Batch image opens <=4 then persist before next batch.
