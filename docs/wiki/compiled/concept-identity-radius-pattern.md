---
id: concept-identity-radius-pattern
title: `identity.radiusPattern` — 11 corner options
kind: concept
sources: [docs/consumer/ai-context.md#identity-system-forge, docs/consumer/reference-doc.md#rule-119]
---

# `identity.radiusPattern`

11 asymmetric corner-shape options. Applied via `t.radius(baseValue)` in
all primitives.

## Catalog

`all` (default), `top`, `bottom`, `left`, `right`, `diagonal` (TL+BR),
`inverse-diagonal` (TR+BL), `single` (TL only), `single-tr`, `single-bl`,
`single-br`.

## Example

```json
"tokens": { "identity": { "radiusPattern": "diagonal" } }
```

## Mechanism

`resolveRadiusPattern()` converts to a CSS `border-radius` string. For
example, `diagonal` produces `"<r> 0 <r> 0"` (TL and BR rounded, TR and
BL square).

## Related concepts

- [[@concept-identity-overview]]
- [[@concept-token-categories]] — `shape.radius.*`

## Sources (raw)

- `docs/consumer/ai-context.md § Identity System (Forge) → Radius Pattern`
- `docs/consumer/reference-doc.md § rule 119`
