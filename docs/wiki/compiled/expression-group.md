---
id: expression-group
title: `$group` — group context (inside groupBy)
kind: expression
sources: [docs/consumer/ai-context.md#group--selection-inside-repeat, docs/consumer/reference-doc.md#expression-types]
---

# `$group` — group context

Inside a `repeat` with `groupBy` (or `groupKey` + `groupItems`), `$group`
reads aggregates over the current group. Operations: `key`, `count`, `index`,
`items`, `sum`, `avg`, `min`, `max`, plus dot-notation for pre-grouped
objects.

## Shape / Signature

```json
{ "$group": "key" }
{ "$group": "count" }
{ "$group": "sum", "field": "amount" }
{ "$group": "subtotal.total" }
```

| Op | Returns | Available in |
|---|---|---|
| `key` | Group key value (e.g., "Institution A") | groupHeader, groupFooter |
| `count` | Number of items in group | groupHeader, groupFooter |
| `index` | Group index (0-based) | groupHeader, groupFooter |
| `items` | Array of items in group | groupHeader, groupFooter |
| `sum` | Σ field across group items | groupHeader, groupFooter |
| `avg` | Average of field | groupHeader, groupFooter |
| `min` | Minimum of field | groupHeader, groupFooter |
| `max` | Maximum of field | groupHeader, groupFooter |
| `dot.path` | Pre-grouped object access | groupHeader, groupFooter |

## Examples

Group header showing key + count:
```json
"category-header": {
  "type": "text",
  "props": {
    "content": {
      "$let": {
        "k": { "$group": "key" },
        "c": { "$group": "count" }
      },
      "$in": { "$template": "${k} (${c})" }
    }
  }
}
```

Group footer subtotal:
```json
"category-subtotal": {
  "type": "text",
  "props": {
    "content": { "$format": "currency", "value": { "$group": "sum", "field": "amount" } }
  }
}
```

Pre-grouped data dot access:
```json
{ "$group": "subtotal.total" }
```

## Constraints / Anti-patterns

- **Only valid inside `repeat` with `groupBy` or `groupKey`.** Throws an
  error if used outside.
- For per-row data inside the repeat children, use [[@expression-item-index]].

## Related concepts

- [[@concept-repeat-grouped]] — full groupBy/groupKey contract
- [[@expression-item-index]] — per-row context
- [[@expression-array]] — equivalent ops on plain arrays

## Sources (raw)

- `docs/consumer/ai-context.md § Expressions → Group & Selection`
- `docs/consumer/reference-doc.md § Expression Types → $group`
