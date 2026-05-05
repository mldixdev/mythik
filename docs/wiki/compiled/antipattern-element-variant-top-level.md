---
id: antipattern-element-variant-top-level
title: Anti-pattern — top-level `variant` field
kind: pattern
sources: [docs/consumer/ai-context.md#rule-67, docs/consumer/reference-doc.md#rule-240]
---

# Anti-pattern — top-level `variant` field

`variant` is a **prop**. Place it inside `props`, NEVER as a top-level
element field. Top-level `variant` is **silently ignored** by the
renderer (reads `props.variant` only).

## Wrong

```json
{ "type": "stat-card", "variant": "primary", "props": { ... } }
```

`variant: "primary"` is silently ignored.

## Right

```json
{ "type": "stat-card", "props": { "variant": "primary", ... } }
```

## Applies to

- Built-in primitives with `tokens.components` variants (button, box, etc.)
- Layer 3 custom elements with `ElementDefinition.variants`

## Dynamic variant

Consumer may drive variant dynamically via expression:

```json
"props": {
  "variant": {
    "$switch": { "$state": "/filter/tipoEjecucion" },
    "cases": { "1": "active" },
    "default": "inactive"
  }
}
```

## Related concepts

- [[@concept-component-variants]]
- [[@concept-element-variants]]
- [[@concept-element-properties]]
- [[@expression-switch]]

## Sources (raw)

- `docs/consumer/ai-context.md § rule 67`
- `docs/consumer/reference-doc.md § rule 240`
