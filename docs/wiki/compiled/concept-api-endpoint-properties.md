---
id: concept-api-endpoint-properties
title: API endpoint properties (full table)
kind: concept
sources: [docs/consumer/ai-context-api.md#endpoint-properties]
---

# API endpoint properties

| Property | Type | Description |
|---|---|---|
| `path` | string | URL path (supports `:id` params) |
| `method` | string | `GET` (default), `POST`, `PUT`, `DELETE` |
| `query` | string | SQL query (mutually exclusive with `handler`) |
| `handler` | string | Handler file name (mutually exclusive with `query`) |
| `crud` | object | `{ table, primaryKey, insertable, updatable }` |
| `pagination` | `"offset"` \| `false` | Enable offset pagination |
| `totals` | string[] | Aggregate expressions: `"SUM:column"`, `"COUNT:*"` |
| `params` | object | Parameter definitions (see [[@concept-api-param-properties]]) |
| `policy` | string | Reference to `auth.policies` key, or `"public"` |
| `scopeFilter` | boolean/object | Enable row-level filtering |
| `audit` | object | Auto-inject user + timestamp fields |

## Constraints

- `query` and `handler` are mutually exclusive.
- `crud` cannot combine with `path` ending in `/:id`.

## Related concepts

- [[@concept-api-spec]]
- [[@concept-api-endpoints-overview]]
- [[@concept-api-param-properties]]
- [[@concept-api-auth]]
- [[@concept-api-scope-filter]]
- [[@concept-api-audit]]

## Sources (raw)

- `docs/consumer/ai-context-api.md § Endpoint properties`
