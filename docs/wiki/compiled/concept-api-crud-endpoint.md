---
id: concept-api-crud-endpoint
title: API CRUD endpoint — 1 declaration → 3 routes
kind: concept
sources: [docs/consumer/ai-context-api.md#endpoints, docs/consumer/ai-context-runtime-semantics.md#31-crud--one-endpoint-three-routes--blocker-3]
---

# API CRUD endpoint

A single endpoint with `crud: { table, primaryKey, insertable, updatable }`
generates **three** routes automatically:

- `POST <path>` — insert (body filtered to `insertable`)
- `PUT <path>/:id` — update (body filtered to `updatable`, `:id` matches `primaryKey`)
- `DELETE <path>/:id` — delete by primary key

## Shape

```json
"items": {
  "path": "/api/items",
  "policy": "admin",
  "crud": {
    "table": "Items",
    "primaryKey": "id",
    "insertable": ["name", "amount", "categoryId"],
    "updatable": ["name", "amount"]
  },
  "audit": {
    "createdBy": "created_by", "createdAt": "created_at",
    "updatedBy": "updated_by", "updatedAt": "updated_at",
    "timezone": "America/El_Salvador"
  }
}
```

## `filterFields` security

Fields in the request body NOT listed in `insertable` (POST) or `updatable`
(PUT) are **silently dropped**. Security feature — clients cannot inject
arbitrary columns (e.g., `isAdmin: true`).

## Audit — un-spoofable

Audit fields bypass `filterFields`. Server writes `req.user.username` +
timestamp post-filter. Clients cannot forge `createdBy` / `updatedBy` /
`createdAt` / `updatedAt`. CV4 in 2026-04 experiment validations —
confirmed secure-by-design.

## Constraints / Anti-patterns

- **Don't combine `crud: {}` with `endpoint.path` ending `/:id`.** CRUD
  auto-appends `/:id` to PUT/DELETE — `path: "/api/x/:id"` produces
  `/api/x/:id/:id`. See [[@antipattern-crud-id-collision]] (also a
  `mythik lint` rule with severity `error`).
- **Don't declare 3 separate endpoints** with `crud: {}` each.
  See [[@concept-api-endpoints-overview]] § Anti-pattern.

## Read-only list endpoint stays separate

```json
"items-list": {
  "path": "/api/items/query",
  "policy": "items",
  "scopeFilter": true,
  "query": "SELECT id, name, amount, categoryId FROM Items ORDER BY name",
  "pagination": "offset"
}
```

(No `crud:{}` — uses SQL or handler.)

## Trigger-safe queries

INSERT uses `SCOPE_IDENTITY()` + SELECT instead of `OUTPUT INSERTED.*`.
UPDATE uses SELECT after the update. Both compatible with SQL Server tables
that have triggers (rule 67).

## Related concepts

- [[@concept-api-endpoints-overview]]
- [[@concept-api-audit]]
- [[@concept-api-scope-filter]]
- [[@antipattern-crud-id-collision]]
- [[@cli-lint]]

## Sources (raw)

- `docs/consumer/ai-context-api.md § CRUD endpoint`
- `docs/consumer/ai-context-runtime-semantics.md § 3.1`
