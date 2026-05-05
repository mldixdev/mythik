---
id: action-selection
title: `toggleSelection` / `selectAll` / `selectNone`
kind: action
sources: [docs/consumer/ai-context.md#repeat-selection, docs/consumer/reference-doc.md#repeat-selection-selection]
---

# `toggleSelection` / `selectAll` / `selectNone`

Helper actions for `repeat.selection` patterns.

## Shape / Signature

```json
{ "action": "toggleSelection", "params": { "statePath": "/selectedIds", "value": <id>, "mode"?: "single" | "multiple" } }
{ "action": "selectAll",       "params": { "statePath": "/selectedIds", "values": [<id>, ...] } }
{ "action": "selectNone",      "params": { "statePath": "/selectedIds" } }
```

## Examples

Per-row toggle:
```json
"select-checkbox": {
  "type": "checkbox",
  "props": { "checked": { "$selection": "selected" } },
  "on": { "change": { "action": "toggleSelection", "params": { "statePath": "/selectedIds", "value": { "$item": "id" } } } }
}
```

Select-all in a header:
```json
{ "action": "selectAll", "params": {
  "statePath": "/selectedIds",
  "values": { "$array": "map", "source": { "$state": "/items" }, "field": "id" }
}}
```

## Behavior

- `toggleSelection` adds value if absent, removes if present. `mode:
  "single"` replaces the array with a single value.
- `selectAll` overwrites the selection with the provided array.
- `selectNone` clears the selection.

## Related concepts

- [[@concept-repeat-selection]]
- [[@expression-selection]]
- [[@primitive-table]] — table selection uses these under the hood

## Sources (raw)

- `docs/consumer/ai-context.md § Repeat Selection`
- `docs/consumer/reference-doc.md § Repeat Selection → Selection Helper Actions`
