---
id: concept-token-categories
title: Token categories — `$token` paths
kind: concept
sources: [docs/consumer/ai-context.md#deep-design-token-system, docs/consumer/reference-doc.md#token-categories--token-paths]
---

# Token categories

All primitives consume tokens via `useDesignTokens` internally. Specs
reference them via `$token` with dot notation.

## Categories

| Category | Paths | Example |
|---|---|---|
| Colors | `colors.primary`, `colors.surface`, `colors.text`, `colors.error`, `colors.accent`, etc. (13 semantic colors) | `{ "$token": "colors.primary" }` |
| Shape | `shape.radius.none/sm/md/lg/xl/full` | `{ "$token": "shape.radius.lg" }` |
| Typography | `typography.fontFamily.base/heading/mono`, `typography.scale.xs/sm/md/lg/xl/2xl` (each has `.fontSize`, `.lineHeight`), `typography.weight.normal/medium/semibold/bold`, `typography.letterSpacing`, `typography.headingLetterSpacing` | `{ "$token": "typography.scale.xl.fontSize" }` |
| Spacing | `spacing.unit`, `spacing.scale.xs/sm/md/lg/xl/2xl` | `{ "$token": "spacing.scale.md" }` |
| Elevation | `elevation.none/sm/md/lg/xl` — auto-converts to CSS `boxShadow` string in `$token` | `{ "$token": "elevation.lg" }` |
| Motion | `motion.duration.fast/normal/slow`, `motion.easing.default/enter/exit`, `motion.spring.damping/stiffness/mass`, `motion.stagger` | `{ "$token": "motion.duration.fast" }` |
| Opacity | `opacity.disabled/pressed/backdrop/muted` | `{ "$token": "opacity.backdrop" }` |

## Identity-derived

| Category | Paths | Notes |
|---|---|---|
| Scheme colors | `schemeColors.text`, `schemeColors.surface`, etc. | For preview/themed content (rule 131) |
| Color weight | `colorWeight.navBg`, `colorWeight.navText`, `colorWeight.sectionBg`, `colorWeight.heroBg`, `colorWeight.heroGradient` | Layout tokens — see [[@concept-identity-color-weight]] |

## Auto elevation conversion

`{ "$token": "elevation.md" }` returns a CSS `boxShadow` string on web
(e.g., `"0px 4px 12px rgba(0,0,0,0.15)"`). On RN, primitives handle
elevation internally via native shadow props. No manual conversion needed
(rule 100).

## `multiply`

```json
{ "$token": "spacing.unit", "multiply": 3 }
```

Scales a numeric token (e.g., `spacing.unit` × 3).

## Related concepts

- [[@concept-token-system]]
- [[@concept-dna-seeds]]
- [[@expression-token]]
- [[@concept-identity-color-weight]]
- [[@concept-identity-color-scheme]]

## Sources (raw)

- `docs/consumer/ai-context.md § Deep Design Token System → Token categories`
- `docs/consumer/reference-doc.md § Token Categories & $token Paths`
