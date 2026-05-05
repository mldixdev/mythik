---
id: concept-query-envelope
title: Query response envelope
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md#33-query-endpoint-response-envelope]
---

# Query response envelope

All query endpoints return responses in this envelope shape.

## Shape

```json
{
  "data": [ /* row objects */ ],
  "total": 42,
  "page": 1,
  "pageSize": 20,
  "totals": { "total_amount": 1250.50 }
}
```

| Field | Always? | Description |
|---|---|---|
| `data` | yes | Always an array (may be empty) |
| `total`, `page`, `pageSize` | when paginated | Present when endpoint has pagination config |
| `totals` | when configured | Present when endpoint has `totals` config |

## Consumer contract

The envelope is **NOT auto-unwrapped**. Specs reading the response must
target `response.data`:

```json
{ "action": "fetch", "params": { "url": "/api/rooms/query", "target": "/rooms" } }
```

Setting `target: "/rooms"` writes the entire envelope to `/rooms`. Consumer
reads via `$state: "/rooms/data"` at consumption sites.

If you only want the data array in state, use a two-step chain: first
`fetch` with no `target` (captures in transient), second `setState` writing
`response.data` to your desired path.

## Related concepts

- [[@concept-api-spec]]
- [[@concept-api-query-endpoint]]
- [[@action-fetch]]
- [[@concept-data-sources]] — same envelope when target is a dataSource

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md § 3.3`
