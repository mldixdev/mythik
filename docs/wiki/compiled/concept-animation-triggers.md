---
id: concept-animation-triggers
title: Animation triggers — 7 triggers
kind: concept
sources: [docs/consumer/reference-doc.md#animation-system--infrastructure-plan-2-2026-04-18]
---

# Animation triggers

`ElementAnimations` supports 7 triggers. Each accepts `AnimationRef |
AnimationRef[] | null`.

| Trigger | Fires when |
|---|---|
| `mount` | Element first appears |
| `unmount` | Element removed (returns Promise) |
| `hover` | Pointer enters |
| `focus` | Keyboard focus |
| `active` | Pressed |
| `ambient` | Always-running (decorative) |
| `stateChange` | Specified state path changes (see [[@concept-state-change-animation]]) |

## AnimationRef

```json
{ "recipe": "fade-up" }
{ "recipe": "fade-up", "duration": 400, "easing": "ease-out", "delay": 100, "iterations": 1, "stagger": 0, "essential": false }
```

## Inline animation alternative

```json
{ "keyframes": [<KeyframeSnapshot>, <KeyframeSnapshot>] }
```

See [[@concept-keyframe-snapshot]].

## Constraints

- A ref containing both `recipe` AND `keyframes` throws as malformed.
- `essential: true` bypasses reduced-motion policy — see [[@concept-reduced-motion]].

## Related concepts

- [[@concept-animations-engine]]
- [[@concept-animation-recipes]]
- [[@concept-keyframe-snapshot]]
- [[@concept-state-change-animation]]
- [[@concept-reduced-motion]]
- [[@concept-animation-caps]]

## Sources (raw)

- `docs/consumer/reference-doc.md § rules 180-181, 188`
