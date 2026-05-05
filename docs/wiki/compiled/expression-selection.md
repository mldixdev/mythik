---
id: expression-selection
title: `$selection` — selection state (inside repeat.selection)
kind: expression
sources: [docs/consumer/ai-context.md#group--selection-inside-repeat, docs/consumer/reference-doc.md#expression-types]
---

# `$selection` — selection state

Inside a `repeat` with a `selection` config, `$selection` reads selection
state for the current item.

## Shape / Signature

```json
{ "$selection": "selected" }
{ "$selection": "count" }
```

| Op | Returns | Description |
|---|---|---|
| `selected` | boolean | Whether the current item's key is in the selection array |
| `count` | number | Total selected items |

## Examples

Per-row checkbox bound to selection:
```json
"select-checkbox": {
  "type": "checkbox",
  "props": { "checked": { "$selection": "selected" } },
  "on": { "change": { "action": "toggleSelection", "params": { "statePath": "/selectedIds", "value": { "$item": "id" } } } }
}
```

Count badge in header:
```json
"selection-count": {
  "type": "text",
  "props": { "content": { "$template": "${count} selected", "args": {} } }
}
```

## Constraints / Anti-patterns

- **Only valid inside `repeat` with `selection` config.** Throws an error
  if used outside.

## Related concepts

- [[@concept-repeat-selection]] — selection config
- [[@action-selection]] — `toggleSelection` / `selectAll` / `selectNone`
- [[@expression-item-index]] — current row id for toggle action

## Sources (raw)

- `docs/consumer/ai-context.md § Expressions → Group & Selection`
- `docs/consumer/reference-doc.md § Expression Types → $selection`
