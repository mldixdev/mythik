---
id: concept-identity-icons
title: `identity.icons` — icon defaults
kind: concept
sources: [docs/consumer/ai-context.md#identity-system-forge, docs/consumer/reference-doc.md#rule-143]
---

# `identity.icons`

Default `weight` for all icons + auto-wrap container.

## Fields

| Field | Type | Effect |
|---|---|---|
| `weight` | string | Default for all icon primitives. Spec `weight` overrides |
| `container` | string | `'none'` / `'circle'` / `'square'` / `'rounded-square'` — auto-wraps with colored bg. `container={false}` in spec suppresses |
| `containerColor` | string | `'primary'` / `'accent'` / `'muted'` / `'surface'` |

## Example

```json
"tokens": { "identity": {
  "icons": { "weight": "bold", "container": "circle", "containerColor": "primary" }
}}
```

Spec icon (overrides default `weight`):
```json
{ "type": "icon", "props": { "name": "pencil-simple", "weight": "regular" } }
```

Spec icon (suppresses container):
```json
{ "type": "icon", "props": { "name": "trash", "container": false } }
```

## Related concepts

- [[@primitive-icon]]
- [[@concept-identity-overview]]

## Sources (raw)

- `docs/consumer/ai-context.md § Identity System (Forge) → Identity icons`
- `docs/consumer/reference-doc.md § rule 143`
