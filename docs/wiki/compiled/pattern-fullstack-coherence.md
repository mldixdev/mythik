---
id: pattern-fullstack-coherence
title: Pattern — Fullstack coherence (API + Frontend)
kind: pattern
sources: [docs/consumer/ai-context.md#fullstack-coherence-api--frontend]
---

# Pattern — Fullstack coherence

When generating both API spec and frontend screens, keep them in lockstep
to avoid runtime mismatches.

## Coherence rules

- **Frontend `fetch` URLs must match API `endpoint.path` values.**
- **Frontend filter dropdown options must match API `catalogs` static values.**
- **Frontend CRUD transaction methods (POST/PUT/DELETE) must match API
  endpoint methods.**
- **API `policies` role lists should align with AppSpec `roleAccess`.**
- **API `scopeFilter.bypassRoles` should include the same admin roles
  as AppSpec.**

## Cross-validation tool

Use `mythik contract` to cross-validate before deploy:

```bash
mythik contract --app app-demo --api ejecucion-api
```

It checks 4 rules:
- `endpoints-exist` (error)
- `fields-valid` (error)
- `params-match` (warning)
- `permissions-consistent` (warning)

See [[@cli-contract]] for full details.

## Related concepts

- [[@cli-contract]]
- [[@concept-api-spec]]
- [[@concept-app-spec]]
- [[@concept-role-access]]
- [[@concept-api-scope-filter]]

## Sources (raw)

- `docs/consumer/ai-context.md § Fullstack Coherence (API + Frontend)`
