---
id: concept-identity-heading-color
title: `identity.headingColor`
kind: concept
sources: [docs/consumer/ai-context.md#identity-system-forge, docs/consumer/reference-doc.md#rule-165]
---

# `identity.headingColor`

Controls heading text color via 4 modes.

## Catalog

`'default'` (inherit from container — default), `'primary'`, `'accent'`,
`'primary-dark'`. Resolves to scheme colors.

## Priority

`style.color > gradient (gradients.text) > headingColor > inherit`

When `gradients.text` is active, gradient takes precedence. When
`style.color` is set on the element, that takes precedence over both.

## Example

```json
"tokens": { "identity": { "headingColor": "primary" } }
```

## Related concepts

- [[@concept-identity-typography-hierarchy]]
- [[@concept-identity-gradients]]
- [[@concept-identity-color-scheme]]
- [[@primitive-text]]

## Sources (raw)

- `docs/consumer/ai-context.md § Identity System (Forge)`
- `docs/consumer/reference-doc.md § rule 165`
