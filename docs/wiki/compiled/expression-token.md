---
id: expression-token
title: `$token` — design system reference
kind: expression
sources: [docs/consumer/ai-context.md#deep-design-token-system, docs/consumer/reference-doc.md#expression-types]
---

# `$token` — design system reference

`$token` resolves a value from the active design tokens (colors, shape,
typography, spacing, elevation, motion, opacity). Use dot notation to address
the token tree. Auto-respects `/preferences/theme` for dark mode — no manual
switching required.

## Shape / Signature

```json
{ "$token": "colors.primary" }
{ "$token": "spacing.unit", "multiply": 3 }
```

`multiply` scales numeric tokens (e.g., `spacing.unit * 3`).

## Examples

Visual values from tokens:
```json
{ "type": "box", "style": {
  "backgroundColor": { "$token": "colors.surface" },
  "borderRadius": { "$token": "shape.radius.lg" },
  "padding": { "$token": "spacing.scale.md" }
}}
```

Elevation auto-converts to CSS `boxShadow` string on web:
```json
"style": { "boxShadow": { "$token": "elevation.lg" } }
```

Scheme-aware values in identity-driven previews:
```json
{ "$token": "schemeColors.text" }
{ "$token": "colorWeight.navBg" }
```

## Constraints / Anti-patterns

- **Tokens are project-defined.** No framework defaults — if no tokens are
  declared, use direct CSS values.
- **Use `$token` for ALL visual values** (rule 5/2) — never hardcode colors,
  spacing, or fonts. Hardcoded values break dark mode and identity changes.
- `$token: "backgroundCSS"` was REMOVED in the current LayerBackground contract. Use
  `tokens.identity.background` as a `LayerBackground` instead — see
  [[@antipattern-background-css-token]].

## Related concepts

- [[@concept-token-system]] — three-layer resolution (defaults → DNA → manual)
- [[@concept-token-categories]] — full path catalogue
- [[@concept-dna-seeds]] — DNA-driven token generation
- [[@concept-component-variants]] — `$path` references inside variants
- [[@concept-auto-dark-mode]] — `$token` and dark mode

## Sources (raw)

- `docs/consumer/ai-context.md § Deep Design Token System`
- `docs/consumer/reference-doc.md § Expression Types → $token` + § Deep Design Token System
