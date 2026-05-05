---
id: path-data-source-paths
title: DataSources auto-paths — `/{target}Loading`, `/{target}Error`, `/{target}Deferred`
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md#24-uiloading-uilasterror-and-datasources-loadingerror-paths, docs/consumer/ai-context-runtime-semantics.md#9-derive-and-datasources-lifecycle-v010--item-e]
---

# DataSources auto-paths

For a dataSource with `target: "/tasks"`, the framework writes
auto-managed paths.

| Path | Type | When |
|---|---|---|
| `/tasks` | response data | Fetch resolves |
| `/tasksLoading` | boolean | `true` during in-flight, `false` after resolve/reject |
| `/tasksError` | object \| null | Error message on failure, `null` on success |
| `/tasksDeferred` | boolean | `true` when initial fetch is skipped because URL template deps are unresolved (Item E). Render "waiting for prerequisite" UI distinct from loading |

## `Deferred` use case

Render a "waiting for X" placeholder when the URL depends on data that
hasn't loaded yet — distinct from "loading" (request in flight) and
"empty" (loaded but no rows):

```json
"waiting": { "visible": { "$state": "/tasksDeferred" } }
```

## Implementation

`packages/core/src/data/data-sources.ts:76-86` (loadingPath / errorPath
derivation + write on fetch start).

## Related concepts

- [[@concept-data-sources]]
- [[@concept-data-sources-lifecycle]]
- [[@path-ui-loading-error]]
- [[@pattern-loading-content-empty]]

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md § 2.4` + § 9
