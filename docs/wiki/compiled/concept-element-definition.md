---
id: concept-element-definition
title: `ElementDefinition` shape
kind: concept
sources: [docs/consumer/ai-context-custom-elements.md#elementdefinition-shape]
---

# `ElementDefinition` shape

Argument to `plugins.registerElement`.

## Shape

```json
{
  "type": "rating-stars",
  "props": {
    "max": { "type": "number", "default": 5 },
    "value": { "type": "number", "bindable": true },
    "label": { "type": "string", "default": "" }
  },
  "variants": {
    "compact": { "props": { "max": 3 }, "style": { "gap": 2 } },
    "large":   { "style": { "gap": 8 }, "animations": { "mount": { "recipe": "scale-in" } } }
  },
  "render": {
    "type": "stack",
    "props": { "direction": "horizontal", "gap": { "$prop": "gap" } },
    "children": [
      {
        "type": "icon",
        "props": { "name": "star" },
        "repeat": { "count": { "$prop": "max" } },
        "animations": { "hover": { "recipe": "lift" } }
      },
      { "type": "text", "props": { "content": { "$prop": "label" } } }
    ]
  }
}
```

## Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | string | yes | Public type name consumers use in specs |
| `props` | `Record<name, PropDefinition>` | no | Declared accepted props |
| `variants` | `Record<name, ElementVariantSpec>` | no | Author-shipped variants |
| `render` | `ElementRenderNode` | yes | Render tree built from primitives (and nested custom elements + templates) |

## Related concepts

- [[@concept-element-prop-definition]] — `PropDefinition` fields
- [[@concept-element-render-node]] — render tree contract
- [[@concept-element-variants]] — `ElementVariantSpec`
- [[@concept-custom-elements]]

## Sources (raw)

- `docs/consumer/ai-context-custom-elements.md § ElementDefinition Shape`
