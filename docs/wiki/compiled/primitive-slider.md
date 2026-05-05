---
id: primitive-slider
title: `slider` — numeric range
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#slider, docs/consumer/reference-doc.md#rule-109]
---

# `slider`

Numeric range slider with min/max/step.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | expression | — | Bind via `$bindState` |
| `min` | number | `0` | Minimum value |
| `max` | number | `100` | Maximum value |
| `step` | number | `1` | Step increment |
| `label` | string/expression | — | Label text (display-only — does NOT append value) |
| `disabled` | boolean/expression | `false` | Disable |

## Examples

```json
{ "type": "slider", "props": {
  "value": { "$bindState": "/dna/roundness" },
  "min": 0, "max": 100, "step": 1,
  "label": { "$template": "Roundness: ${/dna/roundness}%" }
}}
```

## Constraints / Anti-patterns

- **`label` is display-only** — does NOT append the current value.
  Use `$template` to include it (rule 109).

## Related concepts

- [[@expression-template]]
- [[@expression-bindstate]]
- [[@action-update-tokens]] — typical use-case pattern

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § slider`
- `docs/consumer/reference-doc.md § rule 109`
