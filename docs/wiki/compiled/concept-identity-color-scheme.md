---
id: concept-identity-color-scheme
title: `identity.colorScheme` - surface polarity
kind: concept
sources: [docs/consumer/ai-context.md#identity-system-forge, docs/consumer/reference-doc.md#rule-130]
---

# `identity.colorScheme`

3 surface-polarity modes. Affects surfaces only; `t.colors` stays the
original palette so UI controls remain readable.

## Catalog

| Value | Effect |
|---|---|
| `light-surface` | (default) Pass-through |
| `dark-surface` | Uses `modes.dark` from DNA |
| `colored-surface` | 3 configurable tonal layers from primary palette |

`"light"` and `"dark"` are not valid values. Lint validates
`tokens.identity.colorScheme` in both AppSpec and screen Spec tokens before
render.

## Colored Surface Layers

```json
"tokens": {
  "identity": {
    "colorScheme": "colored-surface",
    "coloredSurfaceLayers": { "background": 25, "surface": 45, "primitive": 65 }
  }
}
```

The 3 numbers are OKLCH lightness steps (0-100). Each produces a distinct
layer:

- Page background (darkest)
- Cards (mid)
- Inputs (lightest)

Default 25/45/65 validated across 8 hues. Focus ring uses **accent** (not
primary) in colored-surface to avoid invisible ring on primary background.

## `t.colors` stays original

`t.colors.text` returns the original light palette text color. Surface
styles use scheme-adjusted colors internally. This separation ensures UI
controls (selects, labels) remain readable while preview/app content
adapts to the scheme.

## Preview text uses `schemeColors`

For preview elements that should reflect the scheme, use
`{ "$token": "schemeColors.text" }`.

## Glass + dark scheme

`hexToRgba(c.surface, opacity)` derives rgba from the actual surface color.
Dark scheme + glass = semi-transparent dark, not semi-transparent white
(rule 132).

## Related concepts

- [[@concept-identity-overview]]
- [[@concept-identity-color-weight]]
- [[@concept-token-categories]] - `schemeColors.*`
- [[@concept-auto-dark-mode]]

## Sources (raw)

- `docs/consumer/ai-context.md` - Identity System (Forge) / Color Scheme
- `docs/consumer/reference-doc.md` - rules 130-132
