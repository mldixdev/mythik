---
id: concept-element-children-slot
title: `"$children"` slot in custom element render trees
kind: concept
sources: [docs/consumer/ai-context-custom-elements.md#elementrendernode]
---

# `"$children"` slot in custom element render trees

Authors mark slot positions for consumer children with the **string
literal** `"$children"` in `render.children` (or any nested
`children` array).

## Syntax

```json
"render": {
  "type": "stack",
  "children": [
    { "type": "icon", "props": { "name": "star" }, "repeat": { "count": { "$prop": "max" } } },
    "$children"
  ]
}
```

`"$children"` is replaced with the consumer's `children` array at
expansion time.

## Multiple markers

Multiple markers each splice the full consumer children list. Authors can
position the slot anywhere in the render tree.

## Constraints / Anti-patterns

- **`"$children"` is a string literal** — write the bare string as an
  item in `children`, NOT `{ "$children": true }`. The expression-object
  form is silently ignored.

## Identity

Same slot semantics as spec templates ([[@concept-template-children-marker]]).
Consumer children retain their enclosing element IDs and render via the
unified dispatch.

## Related concepts

- [[@concept-element-render-node]]
- [[@concept-template-children-marker]] — spec-template equivalent
- [[@concept-custom-elements]]

## Sources (raw)

- `docs/consumer/ai-context-custom-elements.md § ElementRenderNode → "$children" slot`
