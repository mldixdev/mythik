---
id: concept-motion-field
title: `motion` field (legacy Framer-Motion)
kind: concept
sources: [docs/consumer/ai-context.md#mountexit-animations, docs/consumer/reference-doc.md#animations]
---

# `motion` field (legacy)

Legacy Framer-Motion-style mount/exit animation field. Still supported but
**prefer `animations`** ([[@concept-animations-engine]]) for new specs —
cross-platform, reduced-motion aware, integrates with the 5-level cascade.

## Shape / Signature

```json
"motion": {
  "initial": { "opacity": 0, "y": 20 },
  "animate": { "opacity": 1, "y": 0 },
  "transition": { "duration": 0.3, "ease": "easeOut" }
}
```

## Examples

Mount fade-up:
```json
"card": { "type": "box",
  "motion": {
    "initial": { "opacity": 0, "y": 20 },
    "animate": { "opacity": 1, "y": 0 },
    "transition": { "duration": 0.3 }
  }
}
```

Exit:
```json
"motion": {
  "initial": { "opacity": 0 },
  "animate": { "opacity": 1 },
  "exit": { "opacity": 0, "y": -10 }
}
```

Staggered children — parent defines stagger, children animate in sequence:
```json
"list": {
  "type": "stack",
  "motion": { "animate": {}, "transition": { "staggerChildren": 0.05 } },
  "children": ["card-1", "card-2", "card-3"]
}
```

Each child should have its own `motion.initial` / `motion.animate`.

## `_motion.whileTap` / `_motion.whileHover`

`_motion.whileTap` and `_motion.whileHover` forward to Framer Motion. Use
`"Infinity"` (string) for `repeat` in JSON — renderer converts to JS
`Infinity` (rule 78).

## Migration

`identity.motionEntrance` and `identity.motionHover` were REMOVED in
plan 2 — see [[@antipattern-motion-entrance-token]] for the mapping.

## Related concepts

- [[@concept-animations-engine]] — preferred for new specs
- [[@concept-animation-recipes]]
- [[@antipattern-motion-entrance-token]]

## Sources (raw)

- `docs/consumer/ai-context.md § Mount/Exit Animations`
- `docs/consumer/reference-doc.md § Animations → Motion design tokens`
