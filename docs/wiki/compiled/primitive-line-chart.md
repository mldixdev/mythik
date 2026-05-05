---
id: primitive-line-chart
title: `line-chart`
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#line-chart]
---

# `line-chart`

Line chart. Data is `[{ label, value }]`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | array/expression | — | `[{ label, value }]` |
| `height` | number | `200` | Chart height |
| `color` | string | — | Line color |

## Examples

```json
{ "type": "line-chart", "props": { "data": { "$state": "/timeSeries" }, "color": { "$token": "colors.primary" } } }
```

## Related concepts

- [[@primitive-bar-chart]]
- [[@primitive-area-chart]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § line-chart`
