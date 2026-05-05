---
id: concept-transaction-phase-timing
title: Transaction phase timing
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md#16-transaction-phase-timing]
---

# Transaction phase timing

Transaction bindings fire phases at distinct moments — knowing exactly when
each phase runs is the difference between safe rollback and broken state.

## Phase timing

| Phase | Timing | Context |
|---|---|---|
| `before` | Eager at dispatch start | Pre-network. Side-effects that must NOT roll back (closeModal, navigate). |
| `optimistic` | Eager at dispatch | State changes applied synchronously. UI reflects immediately. Rolled back on `onError`. |
| `confirm` | Network call | Determines success/failure. Writes to `/tx/result` via target. |
| `onSuccess` | Eager at network resolve | Response available in resolver context. UPDATE transactions typically omit (re-fetch causes flash). |
| `onError` | Eager at network reject | Optimistic state reverted via snapshot BEFORE this phase runs. Error available in resolver context. |

## Internal phase (not consumer-visible)

A `snapshot` phase captures the state immediately before `optimistic`,
enabling rollback. Consumers never invoke `snapshot` directly.

## Examples

When state is read inside each phase:
```json
"before":     [{ "action": "closeModal", "params": { "id": "edit" } }],
"optimistic": [{ "action": "setState", "params": { "statePath": "/items", "value": { "$array": "append", ... } } }],
"confirm":    [{ "action": "fetch", "params": { "target": "/tx/result", ... } }],
"onSuccess":  [{ "action": "showNotification", "params": { "message": { "$template": "Created ${ /tx/result/id }" } } }],
"onError":    [{ "action": "showNotification", "params": { "type": "error", "message": "Could not save." } }]
```

## Related concepts

- [[@concept-transactions]]
- [[@concept-transaction-rollback]]
- [[@concept-transaction-snapshot]]

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md § 1.6` + § 5.5
