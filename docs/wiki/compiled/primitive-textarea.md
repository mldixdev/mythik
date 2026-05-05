---
id: primitive-textarea
title: `textarea` — multi-line text input
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#textarea]
---

# `textarea`

Multi-line text input.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | expression | — | Bind via `$bindState` |
| `placeholder` | string/expression | — | Placeholder |
| `label` | string/expression | — | Field label |
| `rows` | number | `3` | Visible rows |
| `disabled` | boolean/expression | `false` | Disable |
| `readOnly` | boolean | `false` | Read-only |

## Events

`on.change`.

## Examples

```json
{ "type": "textarea", "props": {
  "value": { "$bindState": "/form/description" },
  "label": "Description",
  "rows": 6
}}
```

## Related concepts

- [[@expression-bindstate]]
- [[@primitive-input]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § textarea`
