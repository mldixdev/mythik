---
id: pattern-tx-delete
title: Pattern — DELETE transaction
kind: pattern
sources: [docs/consumer/ai-context.md#transactions-optimistic-updates, docs/consumer/reference-doc.md#delete--remove-item-from-list]
---

# Pattern — DELETE transaction

Remove an item by id. No `onSuccess` (re-fetch would re-add a deleted row
flashing into UI then back out).

## Template

```json
{
  "transaction": {
    "before": [
      { "action": "closeModal", "params": { "id": "{{CONFIRM_MODAL_ID}}" } }
    ],
    "optimistic": [
      { "action": "setState", "params": {
        "statePath": "{{ARRAY_PATH}}",
        "value": { "$array": "remove", "source": { "$state": "{{ARRAY_PATH}}" },
          "where": { "field": "id", "eq": { "$state": "/ui/deleteId" } }
        }
      }}
    ],
    "confirm": [
      { "action": "fetch", "params": {
        "method": "DELETE",
        "url": { "$template": "{{API_URL}}?id=eq.${/ui/deleteId}" }
      }}
    ],
    "onError": [
      { "action": "showNotification", "params": { "type": "error", "message": "Could not delete {{ENTITY}}." } }
    ]
  }
}
```

## Related concepts

- [[@concept-transactions]]
- [[@expression-array]] — `remove`

## Sources (raw)

- `docs/consumer/ai-context.md § Transactions → CRUD variations`
- `docs/consumer/reference-doc.md § Transaction Templates → DELETE`
