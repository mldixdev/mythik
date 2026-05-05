---
id: expression-breakpoint
title: `$breakpoint` — responsive value
kind: expression
sources: [docs/consumer/ai-context.md#responsive--cross-platform, docs/consumer/reference-doc.md#expression-types]
---

# `$breakpoint` — responsive value

`$breakpoint` resolves to different values based on viewport width. Auto-tracked
— the renderer writes `/ui/device/viewportWidth` on mount and resize.
Default breakpoints: `sm: 0`, `md: 768`, `lg: 1024`, `xl: 1280`. Override via
design tokens.

## Shape / Signature

```json
{ "$breakpoint": { "sm": <value>, "md": <value>, "lg": <value>, "xl": <value> } }
```

Missing breakpoints inherit from the smallest defined one below the current
viewport.

## Examples

Responsive grid columns:
```json
{
  "type": "grid",
  "props": { "columns": { "$breakpoint": { "sm": 1, "md": 2, "lg": 3 } } }
}
```

Responsive padding:
```json
"style": {
  "padding": { "$breakpoint": { "sm": "16px", "md": "24px", "lg": "32px" } }
}
```

Responsive direction (stack flips on small screens):
```json
"props": { "direction": { "$breakpoint": { "sm": "vertical", "md": "horizontal" } } }
```

## Recommended responsive defaults

| Property | Mobile (sm) | Tablet (md) | Desktop (lg+) |
|---|---|---|---|
| `direction` | `"vertical"` | `"horizontal"` | `"horizontal"` |
| `columns` | `1` | `2` | `3-4` |
| `gap` | `12` | `16` | `24` |
| `padding` | `"16px"` | `"24px"` | `"32px"` |

## Constraints / Anti-patterns

- **Always use `$breakpoint` for layout properties.** Hardcoding desktop-only
  values produces broken mobile UX.
- For platform-specific TECHNIQUES (CSS blur vs native BlurView), use
  [[@expression-platform]] instead.

## Related concepts

- [[@expression-platform]] — cross-platform variant
- [[@path-ui-device]] — `/ui/device/*` paths
- [[@concept-token-categories]] — override breakpoints via tokens

## Sources (raw)

- `docs/consumer/ai-context.md § Expressions → Responsive & Cross-Platform → $breakpoint`
- `docs/consumer/reference-doc.md § Expression Types → $breakpoint`
