---
id: concept-element-variants
title: Custom element variants — `ElementDefinition.variants`
kind: concept
sources: [docs/consumer/ai-context-custom-elements.md#elementvariantspec]
---

# Custom element variants

Author-shipped variants. Shape identical to primitive variant specs.

## Shape

```json
"variants": {
  "compact": { "props": { "max": 3 }, "style": { "gap": 2 } },
  "large":   { "style": { "gap": 8 }, "animations": { "mount": { "recipe": "scale-in" } } }
}
```

## Variant fields

| Field | Description |
|---|---|
| `props` | Prop overrides that merge with consumer props (consumer wins) |
| `style` | Style overrides applied to the outer primitive |
| `hover` | Hover overrides |
| `active` | Active overrides |
| `focus` | Focus overrides |
| `transition` | Transition overrides |
| `animations` | Animation overrides — cascade level 2 |

## Resolution order

Consumer's `{ "props": { "variant": "name" } }`:
1. `ElementDefinition.variants[name]` — author's built-in (checked first).
2. `tokens.components[type].variants[name]` — theme-level fallback.

Variant props merge into consumer props **before expansion**; consumer
wins last; defaults < variant < consumer.

## Variant placement

`variant` is a **prop**. Consumer writes
`{ "type": "stat-card", "props": { "variant": "primary", ... } }`.
Top-level `variant` field is silently ignored (renderer reads `props.variant` only).

Consumer may drive it dynamically:
```json
"variant": {
  "$switch": { "$state": "/filter/tipoEjecucion" },
  "cases": { "1": "active" },
  "default": "inactive"
}
```

## Related concepts

- [[@concept-custom-elements]]
- [[@concept-component-variants]]
- [[@concept-animation-cascade]]
- [[@antipattern-element-variant-top-level]]

## Sources (raw)

- `docs/consumer/ai-context-custom-elements.md § ElementVariantSpec`
- `docs/consumer/reference-doc.md § rule 240`
