---
id: concept-identity-typography-hierarchy
title: `identity.typographyHierarchy` — 6 heading scales
kind: concept
sources: [docs/consumer/ai-context.md#identity-system-forge, docs/consumer/reference-doc.md#rule-120]
---

# `identity.typographyHierarchy`

6 heading-scale options, applied to `<Text variant="heading">`.

## Catalog

| Value | Feel | Effect |
|---|---|---|
| `dramatic` | Strong | 3×, 800w |
| `uniform` | Notion-like | 1.3×, 600w |
| `editorial` | Elegant | 2.2×, 700w, -0.02em tracking |
| `display` | Magazine hero | 4×, 900w, -0.03em |
| `mono` | Mono-spaced | 1.5×, monospace font |
| `contrast` | Luxury / Apple | 2.5×, 300w ultra-thin |

## Example

```json
"tokens": { "identity": { "typographyHierarchy": "editorial" } }
```

## Related concepts

- [[@primitive-text]]
- [[@concept-identity-overview]]
- [[@concept-identity-text-decoration]]
- [[@concept-identity-heading-color]]
- [[@concept-identity-gradients]]

## Sources (raw)

- `docs/consumer/ai-context.md § Identity System (Forge) → Typography Hierarchy`
- `docs/consumer/reference-doc.md § rule 120`
