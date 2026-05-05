---
id: antipattern-motion-entrance-token
title: Anti-pattern — `identity.motionEntrance` / `motionHover`
kind: pattern
sources: [docs/consumer/ai-context.md#rule-54, docs/consumer/reference-doc.md#rule-149]
---

# Anti-pattern — `identity.motionEntrance` and `motionHover`

`identity.motionEntrance` and `identity.motionHover` were **REMOVED** in
plan 2 Task 22. Setting them has no effect — the legacy
`resolveMotionEntrance` function and `MotionEntrance`/`MotionHover` types
are deleted from the framework.

## Wrong

```json
"tokens": { "identity": { "motionEntrance": "fade", "motionHover": "lift" } }
```

## Right — per-element animations via the engine

```json
{ "type": "card", "animations": { "mount": { "recipe": "fade-up" }, "hover": { "recipe": "lift" } } }
```

Or set app-wide defaults via `identity.animations` (cascade level 1):
```json
"tokens": { "identity": { "animations": { "mount": { "recipe": "fade-up" } } } }
```

## Old → new mapping

| Old `motionEntrance` | New `animations.mount.recipe` |
|---|---|
| `'fade'` | `'fade'` |
| `'slide-up'` | `'fade-up'` |
| `'scale'` | `'scale-in'` |
| `'slide-left'` | `'slide-right'` |

Hover similarly maps to `animations.hover` (e.g. `'lift'` recipe).

## Related concepts

- [[@concept-animations-engine]]
- [[@concept-animation-recipes]]
- [[@concept-animation-cascade]]
- [[@concept-identity-animations]]

## Sources (raw)

- `docs/consumer/ai-context.md § rule 54`
- `docs/consumer/reference-doc.md § rule 149, 200`
