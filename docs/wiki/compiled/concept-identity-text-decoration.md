---
id: concept-identity-text-decoration
title: `identity.textDecoration` — heading effects (multi-select)
kind: concept
sources: [docs/consumer/ai-context.md#identity-system-forge, docs/consumer/reference-doc.md#rule-122]
---

# `identity.textDecoration`

6 heading effects. **Supports array for multi-select** — combinations are
merged.

## Catalog

| Value | Effect |
|---|---|
| `stroke` | webkit-text-stroke |
| `underline-accent` | 3px bottom border, accent color |
| `highlight` | accent bg tint behind text |
| `overline` | 3px top border |
| `shadow` | text-shadow with accent |

## Examples

Single:
```json
"tokens": { "identity": { "textDecoration": "underline-accent" } }
```

Multi-select array:
```json
"tokens": { "identity": { "textDecoration": ["underline-accent", "shadow"] } }
```

## Mechanism

`resolveTextDecorations()` merges styles from all selected decorations.

## Related concepts

- [[@concept-identity-typography-hierarchy]]
- [[@concept-identity-gradients]]
- [[@concept-identity-heading-color]]

## Sources (raw)

- `docs/consumer/ai-context.md § Identity System (Forge) → Text Decoration`
- `docs/consumer/reference-doc.md § rule 122`
