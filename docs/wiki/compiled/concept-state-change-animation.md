---
id: concept-state-change-animation
title: `stateChange` — state-driven animation
kind: concept
sources: [docs/consumer/reference-doc.md#animation-system--infrastructure-plan-2-2026-04-18]
---

# `stateChange` — state-driven animation

Trigger an animation when a watched state path changes. Single-fire — for
repeating state-driven behavior, use `ambient` with conditional enablement
via `$cond`.

## Shape / Signature

```json
"animations": {
  "stateChange": {
    "watch": "/cart/count",
    "on": "increase",
    "recipe": "pop",
    "duration": 300
  }
}
```

## `on` patterns

| Pattern | Triggers when |
|---|---|
| `"change"` | Value changes (any direction) |
| `"increase"` | Numeric increase |
| `"decrease"` | Numeric decrease |
| `"truthy"` | Becomes truthy |
| `"falsy"` | Becomes falsy |
| `{ "equals": <value> }` | Becomes equal to specific value |

## Field reference

```json
{
  "watch": "<state-path>",
  "on"?: "<pattern>",
  "recipe"?: "<recipe-name>",
  "keyframes"?: [<KeyframeSnapshot>],
  "duration": <ms>,
  "easing"?: "<easing>",
  "debounce"?: <ms>
}
```

Must supply either `recipe` or `keyframes`.

## Symmetric-keyframe convention

`stateChange` animations should return to baseline or the transient clear
will cause a visible snap. Recipes are designed to return to start state
within the duration window.

## Constraints

- Single-fire semantics (no `iterations` / `direction`).
- For repeating behavior, use `ambient` with conditional enablement.

## Related concepts

- [[@concept-animation-triggers]]
- [[@concept-animations-engine]]
- [[@concept-keyframe-snapshot]]

## Sources (raw)

- `docs/consumer/reference-doc.md § rule 189`
