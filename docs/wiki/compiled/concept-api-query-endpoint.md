---
id: concept-api-query-endpoint
title: API query endpoint — SQL-driven read
kind: concept
sources: [docs/consumer/ai-context-api.md#endpoints]
---

# API query endpoint

SQL-driven read endpoint with optional pagination + totals.

## Shape

```json
"item-list": {
  "path": "/api/items",
  "policy": "items",
  "scopeFilter": true,
  "query": "SELECT i.id, i.name, i.amount, c.name as category FROM Items i LEFT JOIN Categories c ON i.categoryId = c.id ORDER BY i.name",
  "pagination": "offset",
  "params": { "pageSize": { "type": "int", "default": 20, "max": 100 } },
  "totals": ["SUM:amount", "COUNT:*"]
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `path` | string | URL path (supports `:id` params) |
| `query` | string | SQL query (mutually exclusive with `handler`) |
| `pagination` | `"offset"` \| `false` | Enable offset pagination |
| `totals` | string[] | Aggregate expressions: `"SUM:column"`, `"COUNT:*"` |
| `params` | object | Parameter definitions |
| `policy` | string | Reference to `auth.policies` key, or `"public"` |
| `scopeFilter` | boolean/object | Enable row-level filtering |

## Response envelope

Returns `{ data, total?, page?, pageSize?, totals? }` — see
[[@concept-query-envelope]].

With `pagination: "offset"` and `scopeFilter`, generated totals are scoped before aggregation: Mythik filters the query source first, then counts that scoped source. Prefer generated counts. If custom `endpoint.count` SQL is truly needed with `scopeFilter`, include `{{scopeWhere[:alias]}}` or `{{scopeAnd[:alias]}}`; Mythik expands the macro to the correct scope predicate and removes it for bypass roles. Mythik does not otherwise rewrite custom count SQL; use `:alias` for JOIN/subquery counts.

## Related concepts

- [[@concept-api-endpoints-overview]]
- [[@concept-api-endpoint-properties]]
- [[@concept-api-param-properties]]
- [[@concept-api-scope-filter]]
- [[@concept-query-envelope]]

## Sources (raw)

- `docs/consumer/ai-context-api.md § Endpoints → Query endpoint`
