---
id: concept-repeat
title: `repeat` — render an element per item
kind: concept
sources: [docs/consumer/ai-context.md#repeat, docs/consumer/reference-doc.md#repeat-lists]
---

# `repeat` — render an element per item

Renders a child element once per item in an array. Two source modes:
`statePath` (direct path) and `source` (expression — for filtered/paginated
lists). Inside the children, use `$item`/`$index`/`$bindItem` to access the
current item.

## Shape / Signature

```json
"task-list": {
  "type": "stack",
  "repeat": { "statePath": "/tasks", "key": "id" },
  "children": ["task-row"]
}
```

Filtered/paginated:
```json
"repeat": {
  "source": { "$array": "filter", "source": { "$state": "/tasks" }, "where": { "field": "status", "eq": "active" } },
  "key": "id"
}
```

| Field | Required | Description |
|---|---|---|
| `statePath` | (with `source` alternative) | Direct state path |
| `source` | (with `statePath` alternative) | Expression — typical chain: filter → search → slice |
| `key` | yes | Field used as React key (typically `"id"`) |

## Examples

Filter + search + paginate chain:
```json
"repeat": {
  "source": {
    "$array": "slice",
    "source": {
      "$array": "search",
      "source": {
        "$array": "filter",
        "source": { "$state": "/items" },
        "where": { "field": "status", "eq": "active" }
      },
      "query": { "$state": "/search" },
      "fields": ["name", "category"]
    },
    "from": 0,
    "to": 10
  },
  "key": "id"
}
```

## Constraints

- Children use `$item` / `$index` / `$bindItem`. Outside `repeat`, these
  expressions return undefined.
- Event-handler params inside `repeat` are eagerly resolved for `$item`
  shape; inner `$state`/`$template` stay lazy.

## Related concepts

- [[@concept-repeat-grouped]] — groupBy / pre-grouped
- [[@concept-repeat-selection]] — multi-select
- [[@expression-item-index]]
- [[@expression-binditem]]
- [[@expression-array]] — typical source shape

## Sources (raw)

- `docs/consumer/ai-context.md § Repeat`
- `docs/consumer/reference-doc.md § Repeat (Lists)`
