---
id: pattern-reusable-components
title: Pattern — Reusable components (templates + variants)
kind: pattern
sources: [docs/consumer/ai-context-patterns.md#reusable-components--templates--variants]
---

# Pattern — Reusable components

Two underused reuse mechanisms in Mythik. **Use them before duplicating
style blocks.**

## Decision

| Need | Pick |
|---|---|
| Same primitive type, different style set | `tokens.components.{type}.{variant}` |
| Composite (custom type wrapping primitive + children slot) | `appSpec.templates` |
| Style varies by state (hover/active/focus) | Variants (built-in state slots) |
| Parametrized via props + children | Templates (with `$prop` + `$children`) |

See [[@concept-templates-vs-variants]] for the full decision walk-through.

## Anti-pattern — duplicate style blocks

```json
// screen-a.json
{ "type": "button", "style": { "background": "linear-gradient(...)", "animation": "pulse 2s ...", ...20 lines } }

// screen-b.json
{ "type": "button", "style": { "background": "linear-gradient(...)", "animation": "pulse 2s ...", ...20 lines } }
```

If the same rich style object appears in 2+ specs (or 2+ places in same
spec), extract to a template or variant. Duplication inflates DB storage,
breaks DRY, makes updates O(N).

See [[@antipattern-style-block-duplication]].

## Right approach — extract once

```json
// appSpec.templates once
{ "templates": { "button-pulse-cta": { ...full definition... } } }

// both screens
{ "type": "button-pulse-cta", "props": { "label": "..." } }
```

## Animations cascade across BOTH mechanisms

`animations` declared at any of these levels merges via the cascade —
identity → variant → template → element — with per-trigger null semantics.
Templates and variants are NOT animation islands. See
[[@concept-animation-cascade]].

## Related concepts

- [[@concept-templates]]
- [[@concept-component-variants]]
- [[@concept-templates-vs-variants]]
- [[@concept-animation-cascade]]
- [[@antipattern-style-block-duplication]]

## Sources (raw)

- `docs/consumer/ai-context-patterns.md § Reusable Components — Templates + Variants`
