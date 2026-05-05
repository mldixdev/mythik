---
id: primitive-list
title: `list` — list container
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#list]
---

# `list`

List container. Use with `repeat` to iterate items.

## Props

No specific props besides common (`style`, `visible`, `permission`).

## Examples

```json
"task-list": {
  "type": "list",
  "repeat": { "statePath": "/tasks", "key": "id" },
  "children": ["task-row"]
}
```

## Related concepts

- [[@concept-repeat]]
- [[@primitive-stack]] — frequently used as a list-style container too
- [[@primitive-table]] — for tabular data

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § list`
