---
id: concept-api-endpoints-overview
title: API endpoints — 4 patterns
kind: concept
sources: [docs/consumer/ai-context-api.md#endpoints]
---

# API endpoints — 4 patterns

Four endpoint declaration patterns:

| Pattern | Use | Article |
|---|---|---|
| Query | Simple SQL read | [[@concept-api-query-endpoint]] |
| Handler | Complex logic | [[@concept-api-handler-endpoint]] |
| CRUD | INSERT/UPDATE/DELETE for a table (1 endpoint → 3 routes) | [[@concept-api-crud-endpoint]] |
| Public | No-auth endpoint (health checks) | [[@concept-api-public-endpoint]] |

## Common properties

See [[@concept-api-endpoint-properties]] for the full table.

## Mutual exclusivity

- `query` and `handler` are mutually exclusive — use `query` for simple
  SQL, `handler` for complex logic.
- CRUD declarations (`crud: {}`) generate POST + PUT/:id + DELETE/:id
  automatically — DO NOT also declare separate POST/PUT/DELETE endpoints
  for the same path.

## Anti-pattern

```json
// WRONG — each crud:{} synthesizes 3 routes; 3 endpoints → 9 routes, collisions
"item-create": { "path": "/api/items",     "method": "POST",   "crud": { } },
"item-update": { "path": "/api/items/:id", "method": "PUT",    "crud": { } },
"item-delete": { "path": "/api/items/:id", "method": "DELETE", "crud": { } }
```

The `PUT` endpoint at `/api/items/:id` combined with auto-append produces
`/api/items/:id/:id` (broken). See [[@antipattern-crud-id-collision]] —
also a `mythik lint` rule.

## Related concepts

- [[@concept-api-spec]]
- [[@concept-api-query-endpoint]]
- [[@concept-api-handler-endpoint]]
- [[@concept-api-crud-endpoint]]
- [[@concept-api-public-endpoint]]
- [[@concept-api-endpoint-properties]]
- [[@concept-api-param-properties]]
- [[@antipattern-crud-id-collision]]

## Sources (raw)

- `docs/consumer/ai-context-api.md § Endpoints`
