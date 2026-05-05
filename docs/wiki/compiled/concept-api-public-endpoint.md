---
id: concept-api-public-endpoint
title: API public endpoint (`policy: "public"`)
kind: concept
sources: [docs/consumer/ai-context-api.md#endpoints]
---

# API public endpoint

Endpoint that skips auth. Use **for health checks and public endpoints
only**.

## Shape

```json
"health": { "path": "/api/health", "policy": "public", "query": "SELECT 1 as status" }
```

## Constraints / Anti-patterns

- `policy: "public"` skips auth — never use for endpoints that touch
  user data or modify state.
- Audit timestamp fields still inject (no username available — only
  timestamp).

## Related concepts

- [[@concept-api-endpoints-overview]]
- [[@concept-api-auth]]

## Sources (raw)

- `docs/consumer/ai-context-api.md § Endpoints → Public endpoint`
