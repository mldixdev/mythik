---
id: concept-skeleton-manual
title: Manual skeleton — `type: "skeleton"` element
kind: concept
sources: [docs/consumer/reference-doc.md#manual-skeleton]
---

# Manual skeleton

For custom loading layouts, place `type: "skeleton"` elements directly in
the spec. Useful when auto-skeleton's shape mapping isn't right.

## Example

```json
{
  "type": "skeleton",
  "props": {
    "variant": "text",
    "width": "80%",
    "height": 16,
    "count": 3,
    "gap": 8
  },
  "visible": { "$state": "/ui/loading" }
}
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `"text"` / `"circle"` / `"rect"` | `"rect"` | Shape |
| `width` | string/number | `"100%"` | Width (px or %) |
| `height` | number | `16` | Height in px |
| `count` | number | `1` | Number of shapes |
| `gap` | number | `8` | Gap (when `count > 1`) |

## Related concepts

- [[@primitive-skeleton]]
- [[@concept-skeleton-auto]]
- [[@pattern-loading-content-empty]]

## Sources (raw)

- `docs/consumer/reference-doc.md § Manual Skeleton`
