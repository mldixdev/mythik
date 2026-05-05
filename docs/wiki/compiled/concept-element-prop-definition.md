---
id: concept-element-prop-definition
title: `PropDefinition` — declaring custom element props
kind: concept
sources: [docs/consumer/ai-context-custom-elements.md#propdefinition-fields]
---

# `PropDefinition`

Declares a prop the custom element accepts.

## Fields

| Field | Type | Description |
|---|---|---|
| `type` | `"string"` \| `"number"` \| `"boolean"` \| `"enum"` \| `"object"` \| `"array"` | Prop value type. Use `"object"` for expression values (`$format`, `$template`, `$let`, etc.) and `"array"` for action chains |
| `default` | any | Default value when consumer omits the prop |
| `bindable` | boolean | If `true`, consumer can pass `$bindState` for two-way binding |

## Examples

Numeric prop with default:
```json
"max": { "type": "number", "default": 5 }
```

Bindable string (consumer can pass `$bindState`):
```json
"value": { "type": "number", "bindable": true }
```

Action-chain prop (Layer 3 consumer-supplied event handler):
```json
"onSelect": { "type": "array" }
```

See [[@concept-custom-element-action-props]] for action-chain pattern.

Expression-valued prop:
```json
"label": { "type": "object" }
```

Use `"object"` to accept expression objects (`$format`, `$template`,
`$cond`, etc.).

## Related concepts

- [[@concept-element-definition]]
- [[@concept-custom-element-action-props]]

## Sources (raw)

- `docs/consumer/ai-context-custom-elements.md § PropDefinition fields`
