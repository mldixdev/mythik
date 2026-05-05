---
id: concept-api-spec
title: ApiSpec — declarative backend
kind: concept
sources: [docs/consumer/ai-context-api.md, docs/consumer/ai-context.md#apispec-server]
---

# ApiSpec — declarative backend

`type: "api"` document defines a backend API declaratively — endpoints,
catalogs, auth, audit. **No connection strings or secrets in the spec**
(those go in `createServer` config).

## Shape / Signature

```json
{
  "type": "api",
  "name": "My API",
  "auth": { ... },
  "catalogs": { ... },
  "endpoints": { ... }
}
```

## Sub-concepts

- [[@concept-api-catalogs]] — dropdown data sources
- [[@concept-api-endpoints-overview]] — 4 endpoint patterns
- [[@concept-api-query-endpoint]]
- [[@concept-api-handler-endpoint]]
- [[@concept-api-crud-endpoint]] — 1 declaration → 3 routes
- [[@concept-api-public-endpoint]]
- [[@concept-api-endpoint-properties]]
- [[@concept-api-param-properties]]
- [[@concept-api-auth]]
- [[@concept-api-scope-filter]] — row-level filtering
- [[@concept-api-audit]] — un-spoofable audit fields
- [[@concept-query-envelope]] — `{ data, total, page, pageSize, totals }`
- [[@concept-api-login-body-contract]] — `{ username, password }`

## Rules

- ApiSpec is **pure declarative** — no connection strings, no secrets
  (those go in `createServer` config).
- Api-specs use `type: "api"` — **never served to the browser** (404 on
  `GET /api/screens/:id` for type "api").
- `query` and `handler` are mutually exclusive — use `query` for simple
  SQL, `handler` for complex logic.
- CRUD `insertable` / `updatable` define which fields can be written —
  fields not listed are rejected.
- Audit values override client-sent values — prevents spoofing.
- `policy: "public"` skips auth — use for health checks and public
  endpoints only.
- ScopeFilter `bypassRoles` lets admin roles see all data.
- Provider queries use `@username` parameter and must return `val` column.
- Param `source` defaults to auto-detect: path first, body for non-GET,
  query as fallback.

## Related concepts

- [[@concept-spec-types]]
- [[@cli-contract]]
- [[@pattern-fullstack-coherence]]
- [[@concept-spec-stores-catalog]] — separate `api_specs` table per rule 71

## Sources (raw)

- `docs/consumer/ai-context-api.md` (full)
- `docs/consumer/ai-context.md § ApiSpec (Server)`
