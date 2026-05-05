---
id: concept-customize-expression-handler
title: Customize — custom expression handler (NOT extensible in v0.1)
kind: concept
sources: [docs/consumer/WHERE-TO-LOOK.md]
---

# Customize — custom expression handler

**NOT officially extensible in v0.1.** Expression-handler extensibility
is a v0.2+ candidate.

## What to do instead

Use **`customActions`** if your need is action-shaped (write to state,
trigger fetch, etc.). See [[@concept-customize-action]].

## Source (for fork/upstream contribution)

`packages/core/src/expressions/handlers/` — shows the existing handler
shape. Each `$name` is one file.

## Related concepts

- [[@concept-customize-action]]
- [[@concept-where-to-look]]

## Sources (raw)

- `docs/consumer/WHERE-TO-LOOK.md § Section 1 → custom expression handler`
