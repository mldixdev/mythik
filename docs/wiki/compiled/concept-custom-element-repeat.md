---
id: concept-custom-element-repeat
title: Custom elements under `repeat`
kind: concept
sources: [docs/consumer/reference-doc.md#rule-235]
---

# Custom elements under `repeat`

Custom elements dispatched under `element.repeat` (count / statePath /
source) render N instances as expected, same as primitives.

## Architectural fix (Task 17)

The `repeat` handling block was moved BEFORE the custom-element dispatch
so the repeat gate (`element.repeat && itemContext === undefined`) fires
for all element types uniformly. Prior to the fix, custom elements with
`repeat` rendered once instead of N times because the custom-element
dispatch returned early.

## `$index` / `$item` threading

Iteration context threads through consumer props into the expansion's
`propContext` so inner primitives see the correct iteration values.

## Example

```json
"my-list": {
  "type": "stack",
  "repeat": { "statePath": "/items", "key": "id" },
  "children": ["row-card"]
},
"row-card": {
  "type": "stat-card",
  "props": {
    "label": { "$item": "name" },
    "value": { "$item": "count" }
  }
}
```

Each item produces one `stat-card` instance with its own merged props.

## Related concepts

- [[@concept-custom-elements]]
- [[@concept-repeat]]
- [[@expression-item-index]]

## Sources (raw)

- `docs/consumer/reference-doc.md § rule 235`
