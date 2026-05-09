---
id: concept-transactions
title: Transactions — optimistic CRUD with rollback
kind: concept
sources: [docs/consumer/ai-context.md#transactions-optimistic-updates, docs/consumer/reference-doc.md#transactions-optimistic-updates]
---

# Transactions — optimistic CRUD with rollback

Use `transaction` for CRUD operations that need instant UI feedback. The
framework takes a state snapshot before `optimistic`, applies your changes
instantly, then confirms with the server. **On failure, it rolls back
automatically.**

A transaction can be used directly as an event binding or as one entry inside
an event action array. When mixed with normal actions in an event array,
Mythik awaits the transaction before running the next entry.

## Shape / Signature

```json
"on": { "press": { "transaction": {
  "before": [/* UI transitions — NOT rolled back */],
  "optimistic": [/* Data changes — ROLLED BACK on error */],
  "confirm": [/* Network — determines success/failure */],
  "onSuccess"?: [/* Post-success sync */],
  "onError"?: [/* User notification (after rollback) */],
  "timeout"?: 30000
}}}
```

## Decision rule

- **"Would I undo this if the server says no?"** → `optimistic`
- **"Should this happen regardless?"** → `before`

| Action | Phase | Why |
|---|---|---|
| `closeModal` | `before` | Don't reopen on error |
| `setState` (data) | `optimistic` | Rollback if server rejects |
| `setState` (form reset) | `optimistic` | Restore form so user can retry |
| `navigate` | `before` | Stay on page, show error there |

## Confirm result access

`fetch` in `confirm` writes to `/tx/result` via `target`. `onSuccess` reads
it via `{ "$state": "/tx/result" }`. On error, `/tx/error` contains
the best available error details. For `fetch` confirm HTTP failures, Mythik
preserves backend `error.message`, `error.code`, HTTP `status`, and raw `data`
after rollback so `onError` can show a useful message. Both paths are cleaned
up automatically.

## Timeout

Default 10 seconds. Override:
```json
"transaction": { "timeout": 30000, ... }
```

## Constraints / Anti-patterns

- **`submitForm` in `confirm` is NOT recommended.** It has its own validation
  gate that conflicts with the transaction engine. Use `fetch` in `confirm`
  instead. See [[@antipattern-submit-form-in-tx-confirm]].
- **Do not nest transactions.** An event array may contain transaction
  bindings, but `before`, `optimistic`, `confirm`, `onSuccess`, and `onError`
  phases contain normal action bindings only.
- **UPDATE transactions don't need `onSuccess`** — re-fetch causes flash.
  See [[@pattern-tx-update]].

## Related concepts

- [[@concept-transaction-phase-timing]]
- [[@concept-transaction-rollback]]
- [[@concept-transaction-snapshot]]
- [[@concept-action-chains]]
- [[@pattern-tx-create]] / [[@pattern-tx-update]] / [[@pattern-tx-delete]] / [[@pattern-tx-toggle]]
- [[@path-tx-result-error]]

## Sources (raw)

- `docs/consumer/ai-context.md § Transactions (Optimistic Updates)`
- `docs/consumer/reference-doc.md § Transactions (Optimistic Updates)`
