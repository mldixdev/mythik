---
id: primitive-scroll
title: `scroll` — scrollable container
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#scroll]
---

# `scroll`

Scrollable container. Set `maxHeight` to enable scrolling.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `direction` | string | `vertical` | `vertical` or `horizontal` |
| `maxHeight` | string/number | — | Max height (enables scroll) |
| `className` | string | — | CSS class |

## Examples

```json
{ "type": "scroll", "props": { "maxHeight": 400 }, "children": ["long-list"] }
```

## Related concepts

- [[@primitive-stack]]
- [[@primitive-table]] — already scrollable

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § scroll`
