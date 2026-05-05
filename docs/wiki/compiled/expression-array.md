---
id: expression-array
title: `$array` — array operations
kind: expression
sources: [docs/consumer/ai-context.md#math--data, docs/consumer/reference-doc.md#expression-types]
---

# `$array` — array operations

Comprehensive array operations over expression sources. The most-used
operation set in specs — count, filter, sum, search, slice, sort, append,
replace, remove, etc.

## Operations catalog

| Op | Signature | Purpose |
|---|---|---|
| `count` | `source[, where]` | Length, optionally filtered |
| `sum` | `source, field[, where]` | Sum of `field` |
| `sumProduct` | `source, field1, field2` | Σ(field1 × field2) |
| `filter` | `source, where` | Subset by predicate |
| `search` | `source, query, fields` | Case-insensitive multi-field |
| `sort` | `source, field, direction` | `asc`/`desc` |
| `slice` | `source, from, to` | Range |
| `find` | `source, where` | First match |
| `includes` | `source, value` | Boolean membership |
| `map` | `source, field` | Project a single field |
| `first` | `source` | First element |
| `last` | `source` | Last element |
| `append` | `source, value` | Add element (mutate path) |
| `replace` | `source, where, value` | Replace by predicate |
| `remove` | `source, where` | Remove by predicate |
| `toggle` | `source, value` | Add or remove (selection toggle) |

## Where operators

`eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `notIn`.

**`where` accepts ONE field + ONE operator only** — no `$and`/`$or` inside
`where`. For multiple conditions, chain filters.

## Examples

Count items:
```json
{ "$array": "count", "source": { "$state": "/items" } }
```

Filter active items:
```json
{ "$array": "filter", "source": { "$state": "/items" }, "where": { "field": "status", "eq": "active" } }
```

Multi-condition (chain filters):
```json
{
  "$array": "filter",
  "source": {
    "$array": "filter",
    "source": { "$state": "/items" },
    "where": { "field": "price", "gte": 10 }
  },
  "where": { "field": "price", "lte": 100 }
}
```

Search + paginate:
```json
{
  "$array": "slice",
  "source": {
    "$array": "search",
    "source": { "$state": "/items" },
    "query": { "$state": "/search" },
    "fields": ["name", "category"]
  },
  "from": 0,
  "to": 20
}
```

Mutation in transaction `optimistic`:
```json
{ "$array": "append", "source": { "$state": "/items" }, "value": { "name": "New" } }
{ "$array": "replace", "source": { "$state": "/items" }, "where": { "field": "id", "eq": 1 }, "value": { "name": "Updated" } }
{ "$array": "remove", "source": { "$state": "/items" }, "where": { "field": "id", "eq": 3 } }
```

## Constraints / Anti-patterns

- **`append` and `replace` use `value`, NOT `item`.** `item` silently does
  nothing (rule 10). See [[@antipattern-action-chain-no-stop]] for related
  silent-fail traps.
- **`"all"` is NOT a wildcard** — `where: { field: "status", eq: "all" }`
  matches the literal string `"all"`. Use `$cond` to bypass — see
  [[@antipattern-all-filter-wildcard]].
- **`derive` over server-paginated state sees only the current page.**
  Don't use `$array: "sum"` for full-dataset totals — use the API's
  `totals` response instead. See [[@antipattern-derive-server-pagination]].

## Related concepts

- [[@concept-repeat]] — `repeat.source` consumer
- [[@expression-math]] — pair with `$math` for averages
- [[@concept-derive]] — typical `$array` consumer
- [[@pattern-tx-create]] / [[@pattern-tx-update]] / [[@pattern-tx-delete]] — mutation in optimistic phases

## Sources (raw)

- `docs/consumer/ai-context.md § Expressions → Math & Data → $array`
- `docs/consumer/reference-doc.md § Expression Types → $array`
