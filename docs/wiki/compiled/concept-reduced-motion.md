---
id: concept-reduced-motion
title: Reduced motion — a11y policy
kind: concept
sources: [docs/consumer/reference-doc.md#animation-system--infrastructure-plan-2-2026-04-18]
---

# Reduced motion — a11y policy

`applyReducedMotion(spec, trigger)` applies a moderate accessibility policy
when the user has `prefers-reduced-motion: reduce`.

## Per-trigger behavior

| Trigger | Policy |
|---|---|
| `mount` / `unmount` / `active` | Strip transforms (keep opacity). Returns null if all animated props disappear |
| `hover` / `ambient` | Return null (skip entirely) |
| `focus` | **Preserved** (a11y-critical) |
| `stateChange` | Reduce duration 3x with floor at 50ms |

## `essential` bypass

Set `essential: true` on the spec to bypass the entire policy. Intended for
spinners / loaders where motion is the affordance:

```json
"animations": { "ambient": { "recipe": "spin", "essential": true } }
```

## Related concepts

- [[@concept-animations-engine]]
- [[@concept-animation-triggers]]

## Sources (raw)

- `docs/consumer/reference-doc.md § rule 187`
