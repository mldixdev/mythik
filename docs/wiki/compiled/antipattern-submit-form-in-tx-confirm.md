---
id: antipattern-submit-form-in-tx-confirm
title: Anti-pattern — `submitForm` in `transaction.confirm`
kind: pattern
sources: [docs/consumer/ai-context-patterns.md#submitform-in-transactionconfirm-is-not-recommended]
---

# Anti-pattern — `submitForm` in `transaction.confirm`

`submitForm` is technically valid in any action context, but **inside
`transaction.confirm` it conflicts** — `submitForm` includes its own
validation gate and error handling, while the transaction engine handles
rollback separately.

## Wrong

```json
"confirm": [
  { "action": "submitForm", "params": { "formId": "f", "url": "/api/save", "method": "POST", "body": {} } }
]
```

The form's validation gate fires inside the transaction; if invalid,
`submitForm` shows errors but the transaction engine sees no network
attempt → no rollback path → ambiguous state.

## Right — use plain `fetch` in `confirm`

```json
"confirm": [
  { "action": "fetch", "params": {
    "url": "/api/save",
    "method": "POST",
    "body": { "title": { "$state": "/form/title" } },
    "target": "/tx/result"
  }}
]
```

Validate the form BEFORE the transaction (e.g., disable the trigger
button via `$state: "/ui/forms/f/isValid"`):

```json
"disabled": { "$not": { "$state": "/ui/forms/f/isValid" } }
```

## Related concepts

- [[@concept-transactions]]
- [[@action-fetch]]
- [[@action-submit-form]]
- [[@concept-forms]]

## Sources (raw)

- `docs/consumer/ai-context-patterns.md § submitForm in transaction.confirm is not recommended`
