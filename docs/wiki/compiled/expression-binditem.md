---
id: expression-binditem
title: `$bindItem` — two-way binding to repeat item
kind: expression
sources: [docs/consumer/ai-context.md#expressions, docs/consumer/reference-doc.md#expression-types]
---

# `$bindItem` — two-way binding to repeat item

`$bindItem` is the read+write equivalent of `$item`. Use it on input value
props inside a `repeat` so each row's input updates that row's data.

## Shape / Signature

```json
{ "$bindItem": "<fieldName>" }
```

## Examples

Editable list of todos with completion checkboxes:
```json
"task-list": {
  "type": "stack",
  "repeat": { "statePath": "/tasks", "key": "id" },
  "children": ["task-row"]
},
"task-row": {
  "type": "checkbox",
  "props": {
    "checked": { "$bindItem": "completed" },
    "label": { "$item": "title" }
  }
}
```

## Constraints / Anti-patterns

- Only valid inside `repeat`. Outside, returns undefined.
- Mutates the underlying array entry at the bound field — make sure the
  array path is writable (not a derived path).

## Related concepts

- [[@expression-item-index]] — read-only equivalent
- [[@expression-bindstate]] — non-repeat two-way binding
- [[@concept-repeat]] — `repeat` config

## Sources (raw)

- `docs/consumer/ai-context.md § Expressions → State & Binding`
- `docs/consumer/reference-doc.md § Expression Types → $bindItem`
