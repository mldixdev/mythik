---
id: primitive-touchable
title: `touchable` — invisible tap area
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#touchable]
---

# `touchable`

Invisible tap area. Use when wrapping arbitrary content with press behavior
(rows, custom cards, image overlays).

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `className` | string | — | CSS class |

## Events

`on.press`.

## Examples

```json
{ "type": "touchable",
  "style": { "padding": 12 },
  "on": { "press": { "action": "openModal", "params": { "id": "edit" } } },
  "children": ["card-content"]
}
```

## Related concepts

- [[@primitive-button]] — when you need a label
- [[@concept-interactive-states]] — typical hover/active pairing

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § touchable`
