---
id: concept-transaction-rollback
title: Transaction rollback semantics
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md#55-transaction-rollback-mechanics]
---

# Transaction rollback semantics

At dispatch start, the engine captures `store.getSnapshot()` immediately
before `optimistic`. If `confirm` rejects, the snapshot is restored before
`onError` runs.

## Phase rollback table

| Phase | Rolled back on error? | Runs if network fails? |
|---|---|---|
| `before` | **No** — side-effects persist (closeModal, navigate) | Yes — runs first |
| `optimistic` | **Yes** — state snapshot restored | Yes — applied, then potentially reverted |
| `onSuccess` | No — only runs if network succeeded | No — skipped |
| `onError` | No — runs AFTER rollback | Yes — sees restored state |

## Implications

- **Don't put data mutations in `before`** — they persist through rollback.
- **Don't put navigation in `optimistic`** — rollback does NOT un-navigate.
- **`onError` sees the pre-optimistic state** — rollback has already
  happened by the time `onError` runs.

## Related concepts

- [[@concept-transactions]]
- [[@concept-transaction-phase-timing]]
- [[@concept-transaction-snapshot]]

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md § 5.5`
