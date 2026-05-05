---
id: concept-component-variants
title: Component variants — `tokens.components.{type}.{variant}`
kind: concept
sources: [docs/consumer/ai-context.md#component-variants, docs/consumer/reference-doc.md#component-variants]
---

# Component variants

Token-driven component styling. Define variant definitions in
`tokens.components.{primitiveType}.{variantName}`. The engine applies
style, hover, active, focus, transition, animations automatically.

## Defining

```json
"tokens": {
  "components": {
    "button": {
      "primary": {
        "style": { "backgroundColor": "$colors.primary", "color": "#FFF", "borderRadius": "$shape.radius.md", "padding": "10px 22px", "fontWeight": 700 },
        "hover": { "scale": 1.05, "y": -1 },
        "active": { "scale": 0.95 },
        "transition": { "duration": 0.15 }
      },
      "danger": {
        "style": { "backgroundColor": "$colors.error", "color": "#FFF" },
        "hover": { "scale": 1.03 }
      }
    },
    "box": {
      "card": {
        "style": { "backgroundColor": "$colors.surface", "borderRadius": "$shape.radius.lg", "padding": 16, "boxShadow": "$shadow.md" },
        "hover": { "boxShadow": "$shadow.lg", "y": -2 }
      }
    }
  }
}
```

## Using

```json
{ "type": "button", "props": { "label": "Save", "variant": "primary" } }
{ "type": "button", "props": { "label": "Delete", "variant": "danger" } }
{ "type": "box", "props": { "variant": "card" } }
```

`variant` is **universal** — any primitive can use it when defined in
`tokens.components`.

## Supported variant fields

`style`, `hover`, `active`, `focus`, `transition`, `animations`.

## `$path` references

String values starting with `$` reference tokens. Resolved against the
**active** token tree (with dark mode applied):

- `"$colors.primary"` → `"#0D9488"`
- `"$shape.radius.md"` → `12`
- `"$elevation.lg"` → CSS boxShadow string

Legacy paths (`$radius.md`, `$shadow.lg`) still work for backward compat.

## Merge precedence

Variant is base, element-level overrides — same as CSS class + inline
override. Hover merges per-key (variant's `scale: 1.05` + element's
`rotate: 5` both apply).

## Constraints / Anti-patterns

- **Place `variant` in `props`**, not as a top-level field. Top-level is
  silently ignored. See [[@antipattern-element-variant-top-level]].

## Related concepts

- [[@concept-token-system]]
- [[@concept-templates]]
- [[@concept-templates-vs-variants]]
- [[@concept-path-references]]
- [[@concept-animation-cascade]] — variant level

## Sources (raw)

- `docs/consumer/ai-context.md § Component Variants`
- `docs/consumer/reference-doc.md § Component Variants` + rule 97
