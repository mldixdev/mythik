---
id: concept-forms
title: `forms` — declarative form validation
kind: concept
sources: [docs/consumer/ai-context.md#forms, docs/consumer/reference-doc.md#form-validation-forms]
---

# `forms` — declarative form validation

Top-level `forms` block coordinates multiple fields as a unit. Tracks
form-level validity, supports cross-field rules, and gates `submitForm`.
**Opt-in** — existing inline `checks` on inputs continue to work.

## Shape / Signature

```json
"forms": {
  "task-form": {
    "fields": {
      "title": {
        "statePath": "/form/title",
        "rules": [{ "type": "required", "message": "Title is required" }]
      },
      "email": {
        "statePath": "/form/email",
        "rules": [{ "type": "required" }, { "type": "email" }]
      },
      "maxPrice": {
        "statePath": "/form/maxPrice",
        "rules": [
          { "type": "greaterThan", "args": { "other": { "$state": "/form/minPrice" } }, "message": "Max must exceed min" }
        ]
      }
    },
    "validateOn": "blur"
  }
}
```

## Auto-generated state

| Path | Type | Description |
|---|---|---|
| `/ui/forms/{id}/isValid` | boolean | All fields valid (even untouched — for submit-button state) |
| `/ui/forms/{id}/errorCount` | number | Total displayed errors |
| `/ui/forms/{id}/isDirty` | boolean | Any value changed |
| `/ui/forms/{id}/fields/{field}/errors` | string[] | Error messages (shown only when touched) |
| `/ui/forms/{id}/fields/{field}/touched` | boolean | User has interacted |
| `/ui/forms/{id}/fields/{field}/dirty` | boolean | Value differs from initial |

## Examples

Disable submit until valid:
```json
"disabled": { "$not": { "$state": "/ui/forms/task-form/isValid" } }
```

Show inline error:
```json
"error-text": {
  "type": "text",
  "visible": { "$array": "count", "source": { "$state": "/ui/forms/task-form/fields/title/errors" } },
  "props": {
    "content": { "$array": "first", "source": { "$state": "/ui/forms/task-form/fields/title/errors" } },
    "style": { "color": "#EF4444" }
  }
}
```

Submit with validation gate:
```json
{ "action": "submitForm", "params": { "formId": "task-form", "url": "...", "method": "POST", "body": {...} } }
```

## Form actions

- [[@action-submit-form]] — preferred submission action
- [[@action-form-control]] — `validateForm` / `touchField` / `resetForm`

## Related concepts

- [[@concept-form-state-paths]]
- [[@concept-validators-catalog]]
- [[@pattern-form-validation-cross-field]]

## Sources (raw)

- `docs/consumer/ai-context.md § Forms`
- `docs/consumer/reference-doc.md § Form Validation (forms)`
