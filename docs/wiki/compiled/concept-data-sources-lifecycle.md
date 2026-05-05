---
id: concept-data-sources-lifecycle
title: DataSources lifecycle (mount, deps, skip-on-undefined)
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md#52-datasources-lifecycle, docs/consumer/ai-context-runtime-semantics.md#9-derive-and-datasources-lifecycle-v010--item-e]
---

# DataSources lifecycle

Status: **SHIPPED v0.1.0 Item E.** Wired via internal `mountSpecRuntime`
helper called from `MythikRenderer` (web + RN) per spec mount.

## Mount

1. At spec mount, framework instantiates `DataSourcesEngine` with the
   spec's `dataSources` config + state store + resolver.
2. Engine runs `scanDeps` on each dataSource's `url`, `params`, `headers`
   to extract referenced state paths. These become the dataSource's deps.
3. Initial fetch fires (when `initialFetch: true` — default).

## Skip-on-undefined-URL-deps

If a dataSource's URL `$template` references state that's undefined / null /
empty at mount time, the initial fetch is **skipped** and
`/{target}Deferred: true` is set. The reactive subscription resumes the
fetch when deps resolve. Makes engines self-sufficient — no coordination
with `initialActions` needed.

## Auto re-fetch

When the store fires a write to any declared dep, the engine re-fetches
(debounced to coalesce rapid writes when `debounce` is configured).

## `emptyWhileLoading`

- `false` (default) — old data stays visible during fetch.
- `true` — target state path cleared to `null` at fetch start.

## Manual refresh

```json
{ "action": "refreshDataSource", "params": { "id": "rooms" } }
```

Auto-registered for any spec with dataSources.

## Re-mount safety (navigation)

`dispatcher.registerAction` uses `Map.set` (silent overwrite) — re-mounting
a spec with the same dataSources on the same dispatcher does not throw.
DataSourcesEngine's `refresh()` early-returns if the engine has been unmounted.

## Related concepts

- [[@concept-data-sources]]
- [[@concept-derive-datasources-mount-order]] — mount-time ordering with derive
- [[@action-refresh-data-source]]

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md § 5.2` + § 9
