---
id: pattern-tx-update
title: Pattern — UPDATE transaction
kind: pattern
sources: [docs/consumer/ai-context.md#transactions-optimistic-updates, docs/consumer/reference-doc.md#update--edit-item-in-list]
---

# Pattern — UPDATE transaction

Edit an existing item by id. **No `onSuccess` needed** — optimistic data is
already correct; re-fetch causes a visible flash.

## Template

```json
{
  "transaction": {
    "before": [
      { "action": "closeModal", "params": { "id": "{{MODAL_ID}}" } }
    ],
    "optimistic": [
      { "action": "setState", "params": {
        "statePath": "{{ARRAY_PATH}}",
        "value": { "$array": "replace", "source": { "$state": "{{ARRAY_PATH}}" },
          "where": { "field": "id", "eq": { "$state": "/form/editId" } },
          "value": {
            "id": { "$state": "/form/editId" },
            "{{FIELD_1}}": { "$state": "/form/{{FIELD_1}}" },
            "{{FIELD_2}}": { "$state": "/form/{{FIELD_2}}" }
          }
        }
      }}
    ],
    "confirm": [
      { "action": "fetch", "params": {
        "method": "PATCH",
        "url": { "$template": "{{API_URL}}?id=eq.${/form/editId}" },
        "headers": { "Prefer": "return=representation" },
        "body": {
          "{{FIELD_1}}": { "$state": "/form/{{FIELD_1}}" },
          "{{FIELD_2}}": { "$state": "/form/{{FIELD_2}}" }
        },
        "target": "/tx/result"
      }}
    ],
    "onError": [
      { "action": "showNotification", "params": { "type": "error", "message": "Could not update {{ENTITY}}." } }
    ]
  }
}
```

## Notes

- **No `onSuccess`** — optimistic data is correct; re-fetch causes flash.
- `optimistic`: `$array: "replace"` by id.
- `confirm`: PATCH `?id=eq.${id}` (PostgREST URL filter).

## Related concepts

- [[@concept-transactions]]
- [[@pattern-tx-create]]
- [[@expression-array]] — `replace`

## Sources (raw)

- `docs/consumer/ai-context.md § Transactions → CRUD variations`
- `docs/consumer/reference-doc.md § Transaction Templates → UPDATE`
