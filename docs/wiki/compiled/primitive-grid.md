---
id: primitive-grid
title: `grid` — CSS grid container
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#grid]
---

# `grid`

CSS Grid container. Use for 2D layouts (cards in rows, dashboards).

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `columns` | number/string/expression | — | CSS grid columns (number or template string) |
| `rows` | string | — | CSS grid rows template |
| `gap` | number | — | Gap between cells (px) |
| `areas` | string | — | CSS grid-template-areas |
| `className` | string | — | CSS class |

## Examples

Responsive columns:
```json
{ "type": "grid", "props": {
  "columns": { "$breakpoint": { "sm": 1, "md": 2, "lg": 3 } },
  "gap": 24
}, "children": ["card-1", "card-2", "card-3"] }
```

Template areas:
```json
{ "type": "grid", "props": {
  "areas": "'sidebar header' 'sidebar content'",
  "columns": "240px 1fr",
  "rows": "60px 1fr"
}, "children": [...] }
```

## Related concepts

- [[@primitive-stack]] — 1D alternative
- [[@expression-breakpoint]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § grid`
