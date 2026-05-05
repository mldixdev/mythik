---
id: concept-api-handler-endpoint
title: API handler endpoint — complex logic
kind: concept
sources: [docs/consumer/ai-context-api.md#endpoints]
---

# API handler endpoint

Complex-logic endpoint backed by a handler module file. Use when SQL alone
isn't enough.

## Shape

```json
"advanced-report": {
  "path": "/api/report",
  "policy": "reports",
  "handler": "report-handler",
  "params": {
    "year":     { "type": "int",    "source": "query" },
    "search":   { "type": "string", "source": "query" },
    "page":     { "type": "int",    "default": 0,  "source": "query" },
    "pageSize": { "type": "int",    "default": 20, "max": 100, "source": "query" }
  }
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `handler` | string | Handler file name (mutually exclusive with `query`) |
| `policy` | string | Reference to `auth.policies` key |
| `params` | object | Parameter definitions |

## Mutual exclusivity

`query` and `handler` are mutually exclusive — use `query` for simple
SQL, `handler` for complex logic.

## Handler discovery

`packages/server/src/handler-loader.ts` discovers handler modules from the
filesystem and validates references (`validateHandlerRefs`).

## Related concepts

- [[@concept-api-endpoints-overview]]
- [[@concept-api-endpoint-properties]]
- [[@concept-api-param-properties]]
- [[@concept-customize-server-middleware]]

## Sources (raw)

- `docs/consumer/ai-context-api.md § Endpoints → Handler endpoint`
