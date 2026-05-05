---
id: primitive-skeleton
title: `skeleton` — loading placeholder
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#skeleton, docs/consumer/reference-doc.md#skeleton-primitive]
---

# `skeleton`

Loading placeholder. Auto-skeleton activates automatically when the spec has
`fetch` in `initialActions` + `/ui/loading: true` + empty target — no
configuration needed (see [[@concept-skeleton-auto]]). Use the explicit
`skeleton` primitive for custom loading layouts.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `"text" \| "circle" \| "rect"` | `"rect"` | Shape |
| `width` | string/number | `"100%"` | Width (px or %) |
| `height` | number | `16` | Height in px |
| `count` | number | `1` | Number of shapes |
| `gap` | number | `8` | Gap between shapes (when count > 1) |

## Examples

Manual skeleton list:
```json
{ "type": "skeleton", "props": {
  "variant": "text", "width": "80%", "height": 16, "count": 3, "gap": 8
}, "visible": { "$state": "/ui/loading" } }
```

## Constraints

- Set `skeleton: false` on elements that show static content during
  loading.
- `autoSkeleton={false}` on `MythikRenderer` disables auto-skeleton entirely.

## Related concepts

- [[@concept-skeleton-auto]]
- [[@concept-skeleton-manual]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § skeleton`
- `docs/consumer/reference-doc.md § Skeleton Primitive`
