---
id: path-tx-result-error
title: `/tx/result` and `/tx/error` — transaction state
kind: concept
sources: [docs/consumer/ai-context.md#transactions-optimistic-updates]
---

# `/tx/result` and `/tx/error`

Auto-managed transaction state for accessing `confirm` results and error
messages.

## Paths

| Path | Content |
|---|---|
| `/tx/result` | Server response when `confirm` writes via `target: "/tx/result"`. Read in `onSuccess` |
| `/tx/error` | `{ message }` on transaction error. Read in `onError` |

Both are cleaned up automatically after the transaction completes.

## Use

In `confirm` phase, write to `/tx/result`:
```json
"confirm": [{ "action": "fetch", "params": {
  "method": "POST", "url": "/api/items",
  "body": {...},
  "target": "/tx/result"
}}]
```

In `onSuccess`, read it:
```json
"onSuccess": [{ "action": "showNotification", "params": {
  "message": { "$template": "Created item ${ /tx/result/id }" }
}}]
```

In `onError`:
```json
"onError": [{ "action": "showNotification", "params": {
  "type": "error",
  "message": { "$state": "/tx/error/message" }
}}]
```

## Related concepts

- [[@concept-transactions]]
- [[@concept-transaction-phase-timing]]
- [[@action-fetch]]

## Sources (raw)

- `docs/consumer/ai-context.md § Transactions (Optimistic Updates) → Confirm result access`
