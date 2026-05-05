---
id: path-ui-selected-row
title: `/ui/selectedRow` — table row magic path
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md#21-uiselectedrow--blocker-1]
---

# `/ui/selectedRow` — magic path

Framework writes the clicked row's data to `/ui/selectedRow`
**immediately before** dispatching table row interactions: column actions
and direct `onRowClick` ActionBinding(s). Read it from downstream elements
(modal content, detail panels), action params, or subsequent actions in the
same chain.

## Write owner

`packages/react/src/runtime/row-dispatcher.ts` owns the row-write-then-dispatch
contract. `MythikRenderer` uses this helper for table column actions and
`onRowClick` ActionBinding(s):

```ts
export function createRowDispatcher(store, dispatchAction, rowPath = RESERVED_PATHS.SELECTED_ROW) {
  return (binding, row) => {
    if (row) store.set(rowPath, row);
    if (!binding) return;
    if (Array.isArray(binding)) {
      for (const b of binding) dispatchAction(b);
    } else {
      dispatchAction(binding);
    }
  };
};
```

## Lifetime

Persists until the next row interaction dispatch. **No auto-clear** on
modal close, screen navigate, or tab switch. A stale `/ui/selectedRow`
from a previous click is normal state.

## Scope

Singleton per screen. Two tables on the same screen share the path —
the most recently clicked row wins. Framework does not namespace per-table.

## Read patterns

In a downstream modal content:
```json
{ "type": "text", "props": { "content": { "$template": "Editing: ${ /ui/selectedRow/name }" } } }
```

In the action's own params or a subsequent action's params:
```json
{ "action": "fetch", "params": {
  "url": { "$template": "/api/items/${ /ui/selectedRow/id }" }
}}
```

In column-action params (resolves at press time via `lazyActionPaths`):
```json
"onPress": [{
  "action": "openModal",
  "params": { "id": "edit-modal", "itemId": { "$state": "/ui/selectedRow/id" } }
}]
```

In `onRowClick` params (same lazy contract):
```json
"onRowClick": [{
  "action": "openDrawer",
  "params": { "id": "detail", "itemId": { "$state": "/ui/selectedRow/id" } }
}]
```

## Constraints / Anti-patterns

- **`$row` does NOT exist.** See [[@antipattern-row-literal]].
- **Multi-table caveat**: if two tables on one screen, both write here —
  last write wins. No per-table isolation today.

## Related concepts

- [[@concept-expression-timing]] § 1.3 — column actions lazy
- [[@primitive-table]]
- [[@pattern-cross-screen-data-flow]]
- [[@antipattern-row-literal]]

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md § 2.1` + § 5.1
