---
id: concept-repeat-selection
title: `repeat.selection` — multi-select pattern
kind: concept
sources: [docs/consumer/ai-context.md#repeat-selection, docs/consumer/reference-doc.md#repeat-selection-selection]
---

# `repeat.selection`

Adds multi-select (or single-select) behavior to a `repeat`. Selection
state lives at a configured path; per-row checkbox uses `$selection` and
`toggleSelection`.

## Shape / Signature

```json
"repeat": {
  "source": { "$state": "/tasks" },
  "key": "id",
  "selection": {
    "state": "/selectedIds",
    "mode": "multiple"
  }
}
```

| Property | Type | Description |
|---|---|---|
| `state` | string | State path for selected IDs array |
| `key` | string | Field from each item used as the selection identifier (defaults to `repeat.key`) |
| `mode` | `"single"` \| `"multiple"` | Single replaces the array; multiple adds/removes |

## Examples

Per-row checkbox bound to selection state:
```json
"select-checkbox": {
  "type": "checkbox",
  "props": { "checked": { "$selection": "selected" } },
  "on": { "change": { "action": "toggleSelection", "params": {
    "statePath": "/selectedIds",
    "value": { "$item": "id" }
  }}}
}
```

Header showing count:
```json
{ "type": "text", "props": { "content": { "$template": "${count} selected" } } }
```

## Related concepts

- [[@concept-repeat]]
- [[@expression-selection]]
- [[@action-selection]]

## Sources (raw)

- `docs/consumer/ai-context.md § Repeat Selection`
- `docs/consumer/reference-doc.md § Repeat Selection (selection)`
