---
id: antipattern-checkbox-toggle-value
title: Anti-pattern — `value` on checkbox/toggle
kind: pattern
sources: [docs/consumer/ai-context-primitives.md#checkbox, docs/consumer/ai-context-primitives.md#toggle]
---

# Anti-pattern — `value` on checkbox/toggle

`checkbox` and `toggle` use the **`checked`** prop, NOT `value`. Using
`value` is silently ignored — element appears un-bound.

## Wrong

```json
{ "type": "checkbox", "props": { "value": { "$bindState": "/form/agreed" } } }
{ "type": "toggle",   "props": { "value": { "$bindState": "/preferences/darkMode" } } }
```

## Right

```json
{ "type": "checkbox", "props": { "checked": { "$bindState": "/form/agreed" } } }
{ "type": "toggle",   "props": { "checked": { "$bindState": "/preferences/darkMode" } } }
```

## Why

`checkbox` is rendered as a custom div+SVG (NOT native browser checkbox).
The framework standardized on `checked` to clarify the boolean semantics
— surface-aware adapt to identity (bold = thick border, neo = inset
shadow, flat = no border).

## Related concepts

- [[@primitive-checkbox]]
- [[@primitive-toggle]]
- [[@expression-bindstate]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § checkbox, toggle`
