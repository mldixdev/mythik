---
id: pattern-identity-aware-spec
title: Pattern — Identity-aware spec
kind: pattern
sources: [docs/consumer/ai-context-patterns.md#identity-aware-spec-pattern]
---

# Pattern — Identity-aware spec

Generic recipe for specs that adapt to identity tokens (surface, scheme,
gradient, etc.) without breaking under preset switches.

## Always

1. Set page layout `bg` to `{ "$token": "colors.background" }` (NOT white).
2. Use `surface="card"` on card-like boxes (stat cards, form cards,
   content panels).
3. Set `tokens.identity` for app personality — at minimum `surface` +
   `typographyHierarchy`.
4. Use `$token` for ALL visual values — identity controls borders,
   shadows, radius through tokens.
5. For colored-surface schemes, set `coloredSurfaceLayers` to control
   tonal separation (default 25/45/65).
6. Use `$token: "schemeColors.text"` for scheme-aware text in
   previews / themed content.
7. Use `$token: "colorWeight.navBg"` for layout elements that respond
   to color weight.

## Skeleton

```json
{
  "tokens": {
    "dna": { "primary": "#0D9488", "harmony": "analogous", "formality": 0.3 },
    "identity": {
      "surface": "outlined",
      "typographyHierarchy": "editorial",
      "labelStyle": "uppercase",
      "radiusPattern": "all"
    }
  },
  "root": "layout",
  "elements": {
    "layout": { "type": "box", "style": { "backgroundColor": { "$token": "colors.background" }, "minHeight": "100vh" }, "children": ["card"] },
    "card":   { "type": "box", "props": { "surface": "card" }, "style": { "padding": 24 }, "children": ["title", "form"] },
    "title":  { "type": "text", "props": { "content": "Settings", "variant": "heading" } }
  }
}
```

## Anti-patterns

- **Card-like boxes WITHOUT `surface="card"`** — they ignore identity
  surface treatment and look inconsistent.
- **Hardcoding text color** instead of letting surface containers set
  `color: c.text` via CSS inheritance — child primitives use
  `color: 'inherit'` automatically.

## Related concepts

- [[@concept-identity-overview]]
- [[@concept-identity-surface]]
- [[@concept-identity-color-scheme]]
- [[@concept-identity-color-weight]]
- [[@primitive-box]] — `surface` prop
- [[@expression-token]]

## Sources (raw)

- `docs/consumer/ai-context-patterns.md § Identity-Aware Spec Pattern`
