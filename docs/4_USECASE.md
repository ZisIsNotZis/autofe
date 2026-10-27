# 4 · Who does what

Source: **INFERRED** from the confirmed commitment, the user's U-series review, and the
implementation's actual flows. Each story's acceptance is a condition a test or a person can check;
where only a human eye can settle it, the story says so.

## U1 · The author declares a page

**Actor:** an author/curator with a captured page. **Flow:** reads the capture (DOM, nodes, a11y,
full-page image), writes one model using reserved keys and vocabulary roles, records the intent in
`_intent`, validates it. **Acceptance:** `node m1/validate.mjs <model>` is `ok`; every key is a
reserved key, a named child, or a vocabulary role; every fact has a capture witness; a composite that
is claimed satisfies its schema or fails with a path.

## U2 · The engine renders one model to three targets

**Actor:** the engine. **Flow:** `axis.mjs` decides form, comparability, labels, node plan, page
frame and control visibility; each renderer turns the same plan into its own notation. **Acceptance:**
HTML / text / Markdown all contain the same facts; changing only the drawing code never changes a
decision; the axis self-test's cross-target assertions pass, and are demonstrably able to fail.

## U3 · The reviewer checks a page against its source

**Actor:** an independent reviewer (agent or human). **Flow:** renders the page, opens the captured
full-page image beside it, and checks facts, targets, images, order, grouping and emphasis.
**Acceptance:** every model fact appears in the render; every render fact is traceable to the capture;
no invented value, target, image or quote; the side-by-side image exists; the page's composition
matches its archetype. Perceptual items (does it look right, is the density appropriate) are
`need_user_review`, never claimed as passed by a test.

## U4 · The maintainer adds a capability

**Actor:** a worker, directed by the manager. **Flow:** a real page fails to be declared or rendered
faithfully; the failure is recorded in `m1/failures.md`; a closed rule, role, composite or frame is
added; the page is re-curated; a negative control proves the new rule can fail. **Acceptance:** the
triggering page passes; every pre-existing page is unchanged or its change is explained; the new gate
fails on a known-bad sample and passes after the fix; docs record the decision and its rejected
branches.

## U5 · The user judges the gallery

**Actor:** the user. **Flow:** opens the gallery (`m1/curated/renders/index.html`) and the
original | rendered pairs (`m1/curated/renders/sbs/index.html`), page by page. **Acceptance:** the
user says the pages are acceptable, or names the defects; named defects are recorded in
`.scratch/54-user-review/findings.md`-style SSOT before any fix. This is a perceptual judgement and
the only thing that closes a `need_user_review` milestone.

## U6 · A release

**Actor:** the manager. **Flow:** sweeps the tree, runs the pipeline from a clean clone, refreshes the
README's first screen and status, checks every link and command, publishes. **Acceptance:** a
newcomer can clone and run the quick start in under thirty seconds of commands; every quoted number
was measured; the gallery and side-by-side evidence are current; the release report says what is
done, what is not, and who owns what remains.

## U7 · A dashboard is declared

**Actor:** author/curator + engine, once the capability exists. **Flow:** a captured dashboard page's
panels and their unit-bearing stat values are modelled with existing closed types; the engine gives
the page a dashboard frame and stat presentation. **Acceptance:** every captured stat value and label
on the page appears in the model and in all three targets with its unit; the page resolves to the
dashboard prototype; no new styling key was needed.
