---
id: concept-repeat-grouped
title: `repeat.groupBy` — grouped lists
kind: concept
sources: [docs/consumer/ai-context.md#grouped-repeat, docs/consumer/reference-doc.md#grouped-repeat-groupby]
---

# `repeat.groupBy` — grouped lists

Two grouping modes — auto-detected:

- **Mode 1 — Client-side grouping**: engine groups a flat array by field
  value. Use `groupBy: "field-name"`.
- **Mode 2 — Pre-grouped**: server already grouped the data. Use
  `groupKey` + `groupItems`.

## Shape / Signature

Client-side:
```json
"repeat": {
  "source": { "$state": "/tasks" },
  "key": "id",
  "groupBy": "category",
  "groupHeader": ["category-header"],
  "groupFooter": ["category-subtotal"],
  "footer": ["grand-total"]
}
```

Pre-grouped:
```json
"repeat": {
  "source": { "$state": "/response/groups" },
  "key": "name",
  "groupKey": "name",
  "groupItems": "rows",
  "groupHeader": ["institution-header"],
  "groupFooter": ["subtotal-row"],
  "footer": ["grand-total"]
}
```

Pre-grouped data format:
`[{ "name": "Group A", "rows": [...], "subtotal": { "total": 50000 } }, ...]`

## Group-context expressions

Inside `groupHeader` / `groupFooter`, use [[@expression-group]] (`$group`)
to read aggregates. Inside child elements, use `$item` / `$index` as usual.

## Field reference

| Property | Type | Description |
|---|---|---|
| `groupBy` | string | Client-side field for grouping |
| `groupKey` | string | Field in pre-grouped objects holding the key |
| `groupItems` | string | Field holding the items array (pre-grouped) |
| `groupHeader` | string[] | Element IDs to render as header (receive `$group`) |
| `groupFooter` | string[] | Element IDs to render as footer (receive `$group`) |
| `footer` | string[] | Element IDs once after all groups |

## Related concepts

- [[@concept-repeat]]
- [[@expression-group]]
- [[@expression-item-index]]

## Sources (raw)

- `docs/consumer/ai-context.md § Repeat → Grouped Repeat`
- `docs/consumer/reference-doc.md § Grouped Repeat (groupBy)`
