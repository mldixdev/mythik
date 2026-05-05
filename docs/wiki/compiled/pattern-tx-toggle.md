---
id: pattern-tx-toggle
title: Pattern — TOGGLE transaction
kind: pattern
sources: [docs/consumer/ai-context.md#transactions-optimistic-updates, docs/consumer/reference-doc.md#toggle--flip-a-boolean-value]
---

# Pattern — TOGGLE transaction

Flip a boolean value. **No `before` phase** — there's no modal to close.

## Template

```json
{
  "transaction": {
    "optimistic": [
      { "action": "setState", "params": {
        "statePath": "{{BOOLEAN_PATH}}",
        "value": { "$not": { "$state": "{{BOOLEAN_PATH}}" } }
      }}
    ],
    "confirm": [
      { "action": "fetch", "params": {
        "method": "PATCH",
        "url": { "$template": "{{API_URL}}?id=eq.{{ITEM_ID}}" },
        "body": { "{{FIELD}}": { "$state": "{{BOOLEAN_PATH}}" } }
      }}
    ],
    "onError": [
      { "action": "showNotification", "params": { "type": "error", "message": "Could not update." } }
    ]
  }
}
```

## Related concepts

- [[@concept-transactions]]
- [[@expression-and-or-not]] — `$not` for boolean toggle

## Sources (raw)

- `docs/consumer/ai-context.md § Transactions → CRUD variations`
- `docs/consumer/reference-doc.md § Transaction Templates → TOGGLE`
