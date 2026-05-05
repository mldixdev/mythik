---
id: primitive-bar-chart
title: `bar-chart`
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#bar-chart]
---

# `bar-chart`

Bar chart. Data is `[{ label, value, color? }]`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | array/expression | — | `[{ label, value, color? }]` |
| `height` | number | `200` | Chart height in pixels |

## Examples

```json
{ "type": "bar-chart", "props": { "data": { "$state": "/chartData" }, "height": 300 } }
```

## Related concepts

- [[@expression-state]]
- [[@primitive-line-chart]]
- [[@primitive-pie-chart]]
- [[@primitive-area-chart]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § bar-chart`
