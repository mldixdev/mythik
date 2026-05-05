---
id: concept-animation-null-semantics
title: Animation null semantics
kind: concept
sources: [docs/consumer/ai-context.md#interactive-states--animations, docs/consumer/reference-doc.md#null-semantics-decision-table-frozen]
---

# Animation null semantics

Three distinct meanings for absence/null in the cascade. **The distinction
is load-bearing — whole-field null vs per-trigger null have different
semantics and must NOT be conflated.**

## Decision table

| Form | Meaning |
|---|---|
| `undefined` / omitted | **Inherit** from earlier cascade level |
| Whole-field `null` (e.g. `variant.animations: null`) | **Inheritance-neutral** — that level contributes nothing, but earlier levels still apply. Equivalent to omitting |
| Per-trigger `null` (e.g. `element.animations: { hover: null }`) | **Disable** that trigger AND block inheritance |

Output strips nulls — callers see only defined triggers.

## Examples

Disable hover globally on one element:
```json
"element": { "animations": { "hover": null } }
```

Cascade-neutral — variant declares no animations but doesn't block prior:
```json
"variant": { "animations": null }
```

## Why the distinction matters

If you set `variant.animations: null` thinking it disables the trigger, the
identity-level `mount: fade-up` still applies. To actually block inherited
animations, use per-trigger null:

```json
"variant": { "animations": { "mount": null } }
```

## Related concepts

- [[@concept-animation-cascade]]
- [[@concept-animations-engine]]
- [[@concept-animation-triggers]]

## Sources (raw)

- `docs/consumer/ai-context.md § Interactive States & Animations → Null semantics`
- `docs/consumer/reference-doc.md § rule 203`
