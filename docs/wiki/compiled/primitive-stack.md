---
id: primitive-stack
title: `stack` — flexbox container
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#stack]
---

# `stack`

Flexbox container. The default layout primitive for vertical/horizontal
arrangements.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `direction` | string | `vertical` | `vertical` or `horizontal` |
| `gap` | number | — | Space between children (px) |
| `align` | string | — | Cross-axis: `start`, `center`, `end`, `stretch` |
| `justify` | string | — | Main-axis: `start`, `center`, `end`, `between`, `around` |
| `className` | string | — | CSS class |

## Examples

Vertical stack with consistent gap:
```json
{ "type": "stack", "props": { "direction": "vertical", "gap": 16 }, "children": ["row1", "row2"] }
```

Responsive direction:
```json
{ "type": "stack", "props": {
  "direction": { "$breakpoint": { "sm": "vertical", "md": "horizontal" } },
  "gap": { "$breakpoint": { "sm": 12, "md": 24 } }
}}
```

## Related concepts

- [[@primitive-grid]] — for 2D layouts
- [[@expression-breakpoint]] — responsive
- [[@primitive-spacer]] — manual spacing alternative

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § stack`
