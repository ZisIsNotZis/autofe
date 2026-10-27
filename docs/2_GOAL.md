# 2 · The Goal

Source: **CONFIRMED** — the delivery commitment and its acceptance were confirmed by the user and
recorded in round 62 (`docs/sources/product-2026-10.md` §1–§2 before the chain migration); the engine framing is
**EXPLICIT** in the user's rulings D-1…D-6 (`.scratch/decisions-for-user.md`, "用户裁定记录") and in
the public README. No later user message has changed it.

## The Goal

**AutoFE makes a page's business intent the source of its frontend.** An author declares what a
page means — roles, priorities, relations and actions — and one shared decision layer renders that
same model as HTML, plain text and Markdown, so presentation can change without the meaning changing
with it. The proof is a curated gallery of real pages, faithful to their source and composed like
the real thing, with no per-site CSS, no per-site template and no styling escape hatch.

## Priorities (in this order)

1. **Truth.** Capture is the only oracle; no invented fact, link, image or value. A page may omit a
   captured fact honestly, never silently contradict it.
2. **A page the user will accept.** Composition, hierarchy, density and affordance are judged by the
   user's eye against the source, not by a green gate. Gate-green is necessary, not sufficient.
3. **One meaning, one decision.** The same model yields the same decisions in every target; renderers
   draw, they do not re-decide.
4. **Breadth by evidence.** A new primitive or archetype exists because a real captured page needs
   it, and it is closed and validated — never because a page could then be forced through.
5. **Minimal means.** No dependency where a small pure module suffices; no pixel-perfect copy where a
   faithful composition carries the meaning.

## Mode

**Open.** The project is a public repository under AGPL-3.0 and ships at each release; the Goal is a
direction, not a finish line. Each milestone is a release the user can see, use or judge.

## The thing that would not be the Goal

A pixel-perfect clone of a site, a component library, a browser runtime, a per-site stylesheet
generator, or a gallery grown for coverage while its pages stay visibly wrong. These are rejected
branches, recorded in `docs/5_PRODUCT.md`.
