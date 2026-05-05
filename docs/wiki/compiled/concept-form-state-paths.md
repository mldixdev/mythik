---
id: concept-form-state-paths
title: Form state paths — `/ui/forms/{id}/*`
kind: concept
sources: [docs/consumer/ai-context.md#forms, docs/consumer/reference-doc.md#form-state-auto-generated]
---

# Form state paths

When a form is declared in `spec.forms`, the framework reserves the
`/ui/forms/{formId}/*` subtree for that form's state. **Internal keys
(`__valid`, `__touched`, `__errors`)** are framework-owned.

## Auto-generated paths

| Path | Type | Description |
|---|---|---|
| `/ui/forms/{id}/isValid` | boolean | All fields valid (even untouched) |
| `/ui/forms/{id}/errorCount` | number | Total displayed errors |
| `/ui/forms/{id}/isDirty` | boolean | Any value changed |
| `/ui/forms/{id}/fields/{field}/errors` | string[] | Error messages (shown only when touched) |
| `/ui/forms/{id}/fields/{field}/touched` | boolean | User has interacted |
| `/ui/forms/{id}/fields/{field}/dirty` | boolean | Value differs from initial |

## Behavior

- **`isValid` reflects actual validity** even for untouched fields
  (so you can disable submit before user touches anything).
- **`errors` show only for touched fields** — no error messages on
  fields the user hasn't interacted with yet.

## Read patterns

Submit gate:
```json
"disabled": { "$not": { "$state": "/ui/forms/task-form/isValid" } }
```

First error message:
```json
{ "$array": "first", "source": { "$state": "/ui/forms/task-form/fields/title/errors" } }
```

## Related concepts

- [[@concept-forms]]
- [[@concept-state-protection]]
- [[@action-form-control]]
- [[@action-submit-form]]

## Sources (raw)

- `docs/consumer/ai-context.md § Forms → Auto-generated state`
- `docs/consumer/reference-doc.md § Form State (auto-generated)`
- `docs/consumer/ai-context-runtime-semantics.md § 2.6`
