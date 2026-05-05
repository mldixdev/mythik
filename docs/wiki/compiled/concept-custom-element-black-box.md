---
id: concept-custom-element-black-box
title: Custom element black-box contract
kind: concept
sources: [docs/consumer/ai-context-custom-elements.md#black-box-contract]
---

# Custom element black-box contract

Strict boundary between consumer and author scope.

## Boundary

| Scope | Owns |
|---|---|
| **Consumer** | Instance-level `animations`, `hover`, `active`, `focus`, `motion`, `style`, `visible`, `key` — apply to the **outer primitive** of the render tree only |
| **Author** | All inner primitives. Consumer cannot reach them directly |

## Identity cascade reaches inside

`tokens.identity.animations` (cascade level 1) propagates to inner
primitives. Consumer cannot block this via instance-level declarations.

## No future leakage

A future `::part()`-style API would layer on top without breaking this
contract.

## Animation cascade inside custom elements

Inner primitives participate in the full 5-level cascade:

```
identity → variant → elementDef → template → element
```

For inner primitives:
- **identity** (level 1): global, reaches inside.
- **variant** (level 2): the inner primitive's own variant if any.
- **elementDef** (level 3): the author's `animations` declaration on that
  inner node — only present inside custom-element expansions.
- **template** (level 4): if the inner uses a template.
- **element** (level 5): NOT the consumer's declaration — that stays on
  the outer. Inner has no level 5 unless author wires one via `$prop`.

## Related concepts

- [[@concept-animation-cascade]]
- [[@concept-custom-element-prop-cascade]]
- [[@concept-custom-elements]]
- [[@concept-element-render-node]]

## Sources (raw)

- `docs/consumer/ai-context-custom-elements.md § Black-Box Contract` + § Animation Cascade
- `docs/consumer/reference-doc.md § rule 230`
