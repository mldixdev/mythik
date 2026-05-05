---
id: concept-mount-spec-runtime
title: `mountSpecRuntime` — internal mount helper
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md#9-derive-and-datasources-lifecycle-v010--item-e]
---

# `mountSpecRuntime` — internal helper

Internal helper (re-exported from `mythik` with `@internal` JSDoc)
that wires `derive` + `dataSources` engines per spec mount. Called from
`MythikRenderer` (web + RN).

## Mount/unmount scope

Per `MythikRenderer` instance via `useEffect` with deps `[spec, dispatcher,
svc, fetcher]`. Spec change → unmount old runtime, mount new. Same spec
reference → no remount.

## Internal mount order

1. `DeriveEngine.mount()` — sync evaluation in topological order; writes
   derive paths to store.
2. Subscribe `derive.onStateChange` to store.
3. `protectionRegistry.contribute(derivePaths)` — derive paths now
   blocked from setState.
4. `dispatcher.registerAction(dataSources.getActionDefinition())` —
   `refreshDataSource` available.
5. `DataSourcesEngine.mount()` — initial fetches with skip-on-undefined-URL.

## Why `@internal`

Marked `@internal` in JSDoc — not for application-level use. The export
exists so `MythikRenderer` (in `mythik-react`) can call it. **App code
should NOT call `mountSpecRuntime` directly** — use `MythikRenderer`.

## Related concepts

- [[@concept-derive-datasources-mount-order]]
- [[@concept-mythik-renderer]]
- [[@concept-derive]]
- [[@concept-data-sources]]

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md § 9`
- ` § Item E`
