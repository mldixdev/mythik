---
id: concept-identity-animations
title: `identity.animations` — cascade level 1
kind: concept
sources: [docs/consumer/ai-context.md#interactive-states--animations, docs/consumer/reference-doc.md#rule-223]
---

# `identity.animations`

App-wide animation defaults. **Level 1** of the 5-level animation cascade —
applies to every element, **including primitives inside custom-element
expansions**.

## Shape / Signature

```json
"tokens": {
  "identity": {
    "animations": { "mount": { "recipe": "fade-up" } }
  }
}
```

## Cascade behavior

- Reaches inside custom-element expansions — the consumer cannot block
  identity-level animations (black-box boundary preserves identity
  cascade).
- Per-trigger `null` at lower cascade levels disables the inherited
  animation. See [[@concept-animation-null-semantics]].

## Why this is useful

Avoid repeating `animations: { mount: { recipe: 'fade-up' } }` on every
element. Declare it once in `identity.animations` and let the cascade
propagate.

## Related concepts

- [[@concept-animation-cascade]]
- [[@concept-animation-null-semantics]]
- [[@concept-animations-engine]]
- [[@concept-identity-overview]]

## Sources (raw)

- `docs/consumer/ai-context.md § Interactive States & Animations → Cascade level 1`
- `docs/consumer/reference-doc.md § rule 223`
