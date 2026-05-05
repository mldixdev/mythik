---
id: antipattern-derive-server-pagination
title: Anti-pattern — `derive` over server-paginated state
kind: pattern
sources: [docs/consumer/ai-context-patterns.md#derive-only-sees-current-page-data, docs/consumer/ai-context.md#derived-state]
---

# Anti-pattern — `derive` over server-paginated state

`derive` operates on data **in state only**. With server-side pagination,
state holds the current page — derive sums/counts reflect the page, NOT
the full dataset.

## Wrong

```json
{
  "dataSources": {
    "items": { "url": "/api/items", "params": { "page": { "$state": "/page" } }, "target": "/items" }
  },
  "derive": {
    "/stats/totalAmount": { "$array": "sum", "source": { "$state": "/items/data" }, "field": "amount" }
  }
}
```

`/stats/totalAmount` is the sum of the **current page only** — typically
not what the user expected.

## Right — use API totals

For full-dataset totals with server pagination, fetch totals from the API
via the endpoint's `totals` config:

```json
"item-list": {
  "path": "/api/items",
  "query": "SELECT id, name, amount FROM Items",
  "pagination": "offset",
  "totals": ["SUM:amount", "COUNT:*"]
}
```

The query response envelope includes `totals` — see
[[@concept-query-envelope]].

## Related concepts

- [[@concept-derive]]
- [[@concept-data-sources]]
- [[@concept-api-query-endpoint]]
- [[@concept-query-envelope]]
- [[@expression-array]]

## Sources (raw)

- `docs/consumer/ai-context-patterns.md § Derive only sees current page data`
- `docs/consumer/ai-context.md § Derived State (warning paragraph)`
