---
id: path-ui-loading-error
title: `/ui/loading` and `/ui/lastError`
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md#24-uiloading-uilasterror-and-datasources-loadingerror-paths]
---

# `/ui/loading` and `/ui/lastError`

Auto-managed by `fetch` action.

## Paths

| Path | Type | Behavior |
|---|---|---|
| `/ui/loading` | boolean | Set `true` at request start, `false` at resolve. **Shared across all fetch actions.** |
| `/ui/lastError` | object | Error message on failure; cleared on next successful fetch. |

## Use in visibility

```json
"loading": { "visible": { "$state": "/ui/loading" } }
"error":   { "visible": { "$state": "/ui/lastError" } }
```

## Fine-grained tracking

For per-target loading state, use `dataSources` (which writes
`/{target}Loading` / `/{target}Error`) — see [[@path-data-source-paths]].
Or use per-target writes in your own action chains.

## Related concepts

- [[@action-fetch]]
- [[@path-data-source-paths]]
- [[@pattern-loading-content-empty]]

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md § 2.4`
