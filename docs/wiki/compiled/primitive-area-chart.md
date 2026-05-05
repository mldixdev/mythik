---
id: primitive-area-chart
title: `area-chart`
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#area-chart]
---

# `area-chart`

Area chart (filled line chart).

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | array/expression | — | `[{ label, value }]` |
| `height` | number | `200` | Chart height |
| `color` | string | — | Fill color |

## Examples

```json
{ "type": "area-chart", "props": {
  "data": { "$state": "/timeSeries" },
  "color": { "$token": "colors.primary" }
}}
```

## Related concepts

- [[@primitive-line-chart]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § area-chart`
