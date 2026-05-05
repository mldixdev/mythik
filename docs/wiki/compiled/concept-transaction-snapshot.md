---
id: concept-transaction-snapshot
title: Transaction snapshot — internal mechanism
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md#16-transaction-phase-timing, docs/consumer/ai-context-runtime-semantics.md#55-transaction-rollback-mechanics]
---

# Transaction snapshot — internal mechanism

The transaction engine captures a store snapshot via `store.getSnapshot()`
immediately before the `optimistic` phase runs. If `confirm` rejects, the
snapshot is restored before `onError` actions execute.

This is internal — consumers never invoke `snapshot` directly, but
understanding it explains why phases behave as they do.

## Implementation

`packages/core/src/actions/transaction-engine.ts`:
- `before` at line 47-50
- snapshot at line 52-53
- `optimistic` at line 55-58
- `onSuccess` at line 79-81
- `onError` at line 94-99

(See `docs/consumer/ai-context-runtime-semantics.md § 5.5`.)

## Related concepts

- [[@concept-transactions]]
- [[@concept-transaction-phase-timing]]
- [[@concept-transaction-rollback]]
- [[@concept-where-to-look]] — for source-level debugging

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md § 1.6` + § 5.5
