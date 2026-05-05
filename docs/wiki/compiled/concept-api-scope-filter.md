---
id: concept-api-scope-filter
title: `scopeFilter` — row-level security
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md#34-scopefilter--bypassroles, docs/consumer/ai-context-api.md#auth]
---

# `scopeFilter` — row-level security

A SQL `WHERE` clause template injected server-side on **query, update,
and delete** operations, resolved against JWT claims. **Prevents
cross-tenant row access.**

## Shape

In `auth.scopeFilter`:
```json
"scopeFilter": {
  "claim": "institutions",
  "type": "int",
  "column": "institution_id",
  "bypassRoles": ["ADMIN"]
}
```

Or per-endpoint (boolean / per-endpoint config):
```json
"endpoints": {
  "rooms": {
    "scopeFilter": "tenant_id = :jwt.tenant_id",
    "bypassRoles": ["admin"]
  }
}
```

## Behavior

- For roles in `bypassRoles`, the filter is NOT applied (admin sees all).
- All other roles see only rows matching their JWT claim.
- **Applies to UPDATE and DELETE**, not just SELECT — defense in depth.

## Security invariant

A user cannot UPDATE or DELETE rows outside their scope — the filter is
appended to the WHERE clause of those queries. Combined with audit fields
(see [[@concept-api-audit]]), this gives a strong defense-in-depth posture
for multi-tenant apps.

## Related concepts

- [[@concept-api-auth]]
- [[@concept-api-audit]]
- [[@concept-api-spec]]
- [[@concept-role-access]] — frontend equivalent

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md § 3.4`
- `docs/consumer/ai-context-api.md § Auth → scopeFilter`
