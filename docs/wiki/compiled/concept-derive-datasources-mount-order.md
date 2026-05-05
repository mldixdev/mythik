---
id: concept-derive-datasources-mount-order
title: Derive + DataSources mount ordering
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md#9-derive-and-datasources-lifecycle-v010--item-e]
---

# Derive + DataSources mount ordering

Both engines execute at runtime per spec mount via internal
`mountSpecRuntime` helper called from `MythikRenderer` (web + RN). Order
inside `mountSpecRuntime`:

1. **`DeriveEngine.mount()`** — sync evaluation in topological order;
   writes derive paths to store.
2. Subscribe `derive.onStateChange` to store — reactive recompute on
   state changes.
3. `protectionRegistry.contribute(derivePaths)` — derive paths now
   blocked from `setState`.
4. `dispatcher.registerAction(dataSources.getActionDefinition())` —
   `refreshDataSource` action becomes available.
5. **`DataSourcesEngine.mount()`** — initial fetches with
   skip-on-undefined-URL-deps.

## Renderer useEffect order

The state-subscription `useEffect` is declared **before** the
`mountSpecRuntime` `useEffect`. React fires effects in declaration order,
so the subscription is attached first; deriveEngine.mount()'s synchronous
writes are then captured by that listener and trigger initial-paint
re-render.

If you fork or reimplement `MythikRenderer`, preserve this ordering —
otherwise initial paint misses derive writes.

## Re-entrant safety

Derive recompute writes fire the store subscription, which calls
`onStateChange` recursively. **Intentional** — chained derives need to
cascade (B depending on A's output sees A's write and recomputes).
Infinite loops prevented structurally:
- Topo-sort at mount throws on circular deps.
- A derive's own write doesn't make itself dirty (its deps don't include
  its own path).

## State protection

Derive paths are contributed via RAII handle to `protectionRegistry`;
`stateGuard` reads via lazy callback. Validator catches
`setState → derive path` at load time (8 derive/dataSources checks);
dispatcher catches at runtime via `stateGuard.assertCanWrite`. Defense in
depth.

## Error degradation

`DeriveEngine.evaluatePath` wraps each evaluation in try/catch. On error:
`console.error` with the path name, leave path unwritten (consumer reads
undefined), continue with other derives. Reactive recompute on subsequent
state changes can recover.

## Related concepts

- [[@concept-derive]]
- [[@concept-data-sources]]
- [[@concept-data-sources-lifecycle]]
- [[@concept-state-protection]]
- [[@concept-mount-spec-runtime]]
- [[@concept-mythik-renderer]]

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md § 9`
