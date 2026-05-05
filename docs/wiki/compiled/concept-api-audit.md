---
id: concept-api-audit
title: `audit` — auto-inject user + timestamp
kind: concept
sources: [docs/consumer/ai-context-api.md#endpoints, docs/consumer/reference-doc.md#audit-sp3]
---

# `audit` — auto-inject user + timestamp

Endpoint-level config that auto-injects `username` and `timestamp` into
CRUD INSERT and UPDATE operations. **Audit values override client-sent
values** — prevents spoofing.

## Shape

```json
"endpoints": {
  "items": {
    "path": "/api/items",
    "crud": { "table": "Items", "primaryKey": "id", "insertable": ["name"], "updatable": ["name"] },
    "audit": {
      "createdBy": "usuarioCreacion",
      "createdAt": "fechaCreacion",
      "updatedBy": "usuarioModificacion",
      "updatedAt": "fechaModificacion",
      "timezone": "America/El_Salvador"
    }
  }
}
```

All audit fields optional — only configured fields are injected.

## Behavior per operation

| Operation | Fields injected |
|---|---|
| **INSERT** | `createdBy` + `createdAt` + `updatedBy` + `updatedAt` |
| **UPDATE** | `updatedBy` + `updatedAt` |
| **DELETE** | None |

Source: `req.user.username` (from JWT) + framework timestamp.

## Timezone

- Without `timezone` → UTC (default).
- With `timezone` → IANA string (e.g., `"America/El_Salvador"`,
  `"America/Tegucigalpa"`, `"US/Eastern"`).
- Use timezone when the database stores local time (most enterprise DBs).
- Uses `Intl.DateTimeFormat` — works regardless of server location.

## Security guarantees

- Audit values **override** client-sent values (even if client tries to
  spoof) — bypasses `filterFields`.
- No username available (public endpoint) → only timestamp fields injected.

## Related concepts

- [[@concept-api-crud-endpoint]]
- [[@concept-api-auth]]
- [[@concept-api-scope-filter]]

## Sources (raw)

- `docs/consumer/ai-context-api.md § Endpoints → Audit properties`
- `docs/consumer/reference-doc.md § Audit (SP3)`
