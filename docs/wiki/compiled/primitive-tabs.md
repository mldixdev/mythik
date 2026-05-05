---
id: primitive-tabs
title: `tabs`
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#tabs]
---

# `tabs`

Tab navigation. Children render below tabs. Use `visible` conditions on
children with `$state` on the active tab key to show/hide tab content.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | expression | — | Active tab key, bind via `$bindState` |
| `items` | array | — | `[{ key, label, icon? }]` tab definitions |

## Events

`on.change`.

## Examples

```json
{
  "type": "tabs",
  "props": {
    "value": { "$bindState": "/ui/activeTab" },
    "items": [
      { "key": "overview", "label": "Overview", "icon": "chart-bar" },
      { "key": "sales", "label": "Sales" }
    ]
  },
  "children": ["overview-panel", "sales-panel"]
},
"overview-panel": {
  "type": "box",
  "visible": { "$state": "/ui/activeTab", "eq": "overview" },
  "children": [...]
}
```

## Related concepts

- [[@expression-bindstate]]
- [[@concept-visibility]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § tabs`
