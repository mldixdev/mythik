# Documentation Gaps

This file tracks concepts the raw docs left **unclear** — where a faithful
compiled article would either fabricate detail or leave a question open.
Per the compilation rules: **never fabricate, surface as a gap.**

## Status: 0 gaps detected during compilation

All 326 articles were written from raw content present in the source
files. Every fact in the compiled wiki traces to a `docs/consumer/<file>.md`
section listed in the article's `sources:` frontmatter.

## Process for adding gaps

When an article cannot be written without invention, add an entry here
in this format:

```
## <concept-id>

**Where**: docs/consumer/<file>.md#<section>

**Gap**: <what's unclear — what fact would the article need to assert
that the raw doesn't support?>
```

Then write the article anyway, citing the gap. Do NOT invent the missing
detail.

## Open observations (not gaps, just notes)

These were thin in raw but had enough material to write a faithful
article:

- **`primitive-kanban-board`** — raw covers props at a single line
  (`Props: columns (column definitions). Board-style layout`). The
  article notes this and points to source-of-truth files for column-shape
  details.
- **`primitive-audio-player`** — minimal props (`src`, `label`); the
  article reflects that.
- **`primitive-screen`** — RN-specific wrapper; raw confirms but doesn't
  expand on its props beyond `title`.
- **`primitive-list`** — no props besides common; the article reflects that.

If consumers find these too thin, they should either point to better
detail in the framework source via [[@concept-where-to-look]] or open a
docs PR.

## Inferred content

Articles do **not** contain `> **Inferred:**` blockquotes — no extrapolation
beyond raw was needed during compilation.
