---
id: concept-api-param-properties
title: API param properties
kind: concept
sources: [docs/consumer/ai-context-api.md#endpoint-properties]
---

# API param properties

| Property | Type / Values |
|---|---|
| `type` | `int` / `string` / `float` / `date` / `boolean` |
| `required` | boolean |
| `default` | any |
| `max` | number (max value or max length) |
| `source` | `query` / `path` / `body` |

## `source` defaults

Auto-detect:
1. **Path** first (matches `:id` segment in `path`).
2. **Body** for non-GET requests.
3. **Query** as fallback.

## Examples

```json
"params": {
  "year":     { "type": "int", "source": "query" },
  "search":   { "type": "string", "source": "query" },
  "page":     { "type": "int", "default": 0, "source": "query" },
  "pageSize": { "type": "int", "default": 20, "max": 100, "source": "query" }
}
```

## Related concepts

- [[@concept-api-endpoint-properties]]
- [[@concept-api-query-endpoint]]
- [[@concept-api-handler-endpoint]]

## Sources (raw)

- `docs/consumer/ai-context-api.md § Endpoint properties → Param properties`
