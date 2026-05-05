---
id: pattern-tx-create
title: Pattern — CREATE transaction
kind: pattern
sources: [docs/consumer/ai-context.md#transactions-optimistic-updates, docs/consumer/reference-doc.md#create--add-item-to-list]
---

# Pattern — CREATE transaction

Append a new item with optimistic UX. Re-fetch in `onSuccess` to replace
temporary id with the server-assigned real id.

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
        "value": { "$array": "append", "source": { "$state": "{{ARRAY_PATH}}" }, "value": {
          "id": { "$template": "temp-${/form/title}" },
          "{{FIELD_1}}": { "$state": "/form/{{FIELD_1}}" },
          "{{FIELD_2}}": { "$state": "/form/{{FIELD_2}}" }
        }}
      }}
    ],
    "confirm": [
      { "action": "fetch", "params": {
        "method": "POST",
        "url": "{{API_URL}}",
        "headers": { "Prefer": "return=representation" },
        "body": {
          "{{FIELD_1}}": { "$state": "/form/{{FIELD_1}}" },
          "{{FIELD_2}}": { "$state": "/form/{{FIELD_2}}" }
        },
        "target": "/tx/result"
      }}
    ],
    "onSuccess": [
      { "action": "fetch", "params": {
        "method": "GET",
        "url": "{{API_URL}}?select=*&order=created_at.desc",
        "target": "{{ARRAY_PATH}}"
      }}
    ],
    "onError": [
      { "action": "showNotification", "params": { "type": "error", "message": "Could not create {{ENTITY}}." } }
    ]
  }
}
```

## Notes

- `before`: close the modal so it stays closed even on rollback.
- `optimistic`: append with a temporary id (e.g., `temp-<title>`) — UI
  shows the row immediately.
- `confirm`: POST. Server returns the real row.
- `onSuccess`: re-fetch full list to replace temp id with real id.

## Related concepts

- [[@concept-transactions]]
- [[@pattern-tx-update]]
- [[@pattern-tx-delete]]
- [[@expression-array]] — `append`
- [[@action-fetch]]

## Sources (raw)

- `docs/consumer/ai-context.md § Transactions → CRUD variations`
- `docs/consumer/reference-doc.md § Transaction Templates → CREATE`
