---
id: concept-identity-images
title: `identity.images` — image defaults
kind: concept
sources: [docs/consumer/ai-context.md#identity-system-forge, docs/consumer/reference-doc.md#rule-144]
---

# `identity.images`

Default corner-radius, overlay, and border for `image` primitives.

## Fields

| Field | Type | Effect |
|---|---|---|
| `corners` | string | Default `borderRadius`: `'match-card'` (uses card radius), `'circle'` (50%), `'square'` (0), `'rounded'` (8px). Spec `style.borderRadius` overrides |
| `overlay` | string | `'gradient-bottom'`, `'color-tint'`, or `'none'`. Spec `overlay="none"` suppresses |
| `border` | boolean | 1px border |

## Example

```json
"tokens": { "identity": {
  "images": { "corners": "match-card", "overlay": "gradient-bottom", "border": true }
}}
```

## Related concepts

- [[@primitive-image]]
- [[@concept-identity-overview]]

## Sources (raw)

- `docs/consumer/ai-context.md § Identity System (Forge) → Identity images`
- `docs/consumer/reference-doc.md § rule 144`
