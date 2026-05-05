---
id: primitive-spacer
title: `spacer` — empty space
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#spacer]
---

# `spacer`

Renders empty space. Use when `gap` on a parent stack/grid isn't expressive
enough.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `size` | number | — | Pixel size |
| `direction` | `"vertical"` \| `"horizontal"` | — | Orientation |

## Examples

```json
{ "type": "spacer", "props": { "size": 24, "direction": "vertical" } }
```

## Related concepts

- [[@primitive-stack]] — `gap` is usually preferable
- [[@primitive-divider]] — for visible separation

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § spacer`
