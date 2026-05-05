---
id: concept-identity-border-elevation-override
title: Identity border + elevation overrides
kind: concept
sources: [docs/consumer/ai-context.md#identity-system-forge, docs/consumer/reference-doc.md#rules-161-162]
---

# Identity border + elevation overrides

`identity.borderWidth`, `borderStyle`, `borderColor`, `elevationStyle`,
`elevationColor` override surface-produced borders/shadows. **Both default
`false` — surface type controls everything until explicitly enabled.**

## Override flags (both default `false`)

| Flag | Scope |
|---|---|
| `overrideSurfaceBorders: true` | Card + modal |
| `overrideInputButtons: true` | Input + buttonPrimary + buttonSecondary |

## Override fields

| Field | Type / values |
|---|---|
| `borderWidth` | number (px) |
| `borderStyle` | CSS border-style |
| `borderColor` | semantic — `'neutral'` / `'primary'` / `'accent'` / `'text'` |
| `elevationStyle` | `'none'` / `'diffuse'` / `'solid'` / `'color'` |
| `elevationColor` | semantic — `'dark'` (`#000000`) / `'primary'` / `'accent'` |

## Elevation styles

| Value | Effect |
|---|---|
| `none` | No shadow |
| `diffuse` | Soft blur shadow, rgba |
| `solid` | No-blur offset shadow, direct color (comic-book style) |
| `color` | Blur shadow using `elevationColor` in rgba |

Shadow angle decomposed via sin/cos matching the surface serializer's
`shadowToCSS` pattern. `depthScale()` modulates intensity.

## inputFocus is never overridden

Accessibility — `inputFocus` styles preserve the framework's behavior
even when border/elevation overrides are enabled.

## Related concepts

- [[@concept-identity-surface]]
- [[@concept-identity-overview]]

## Sources (raw)

- `docs/consumer/ai-context.md § rule 58`
- `docs/consumer/reference-doc.md § rules 161-162`
