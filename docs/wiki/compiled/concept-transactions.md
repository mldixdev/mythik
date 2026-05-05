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
`{ message }`. Both are cleaned up automatically.

## Timeout

Default 10 seconds. Override:
```json
"transaction": { "timeout": 30000, ... }
```

## Constraints / Anti-patterns

- **`submitForm` in `confirm` is NOT recommended.** It has its own validation
  gate that conflicts with the transaction engine. Use `fetch` in `confirm`
  instead. See [[@antipattern-submit-form-in-tx-confirm]].
- **UPDATE transactions don't need `onSuccess`** — re-fetch causes flash.
  See [[@pattern-tx-update]].

## Related concepts

- [[@concept-transaction-phase-timing]]
- [[@concept-transaction-rollback]]
- [[@concept-transaction-snapshot]]
- [[@pattern-tx-create]] / [[@pattern-tx-update]] / [[@pattern-tx-delete]] / [[@pattern-tx-toggle]]
- [[@path-tx-result-error]]

## Sources (raw)

- `docs/consumer/ai-context.md § Transactions (Optimistic Updates)`
- `docs/consumer/reference-doc.md § Transactions (Optimistic Updates)`
