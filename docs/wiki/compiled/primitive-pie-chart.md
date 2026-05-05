---
id: primitive-pie-chart
title: `pie-chart`
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#pie-chart]
---

# `pie-chart`

Pie chart. Optional `donut` style.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | array/expression | — | `[{ label, value, color? }]` |
| `size` | number | — | Diameter in pixels |
| `donut` | boolean | `false` | Donut style |

## Examples

```json
{ "type": "pie-chart", "props": { "data": { "$state": "/breakdown" }, "size": 240, "donut": true } }
```

## Related concepts

- [[@primitive-bar-chart]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § pie-chart`
