---
id: action-submit-form
title: `submitForm` — validate + fetch + notify
kind: action
sources: [docs/consumer/ai-context.md#actions, docs/consumer/reference-doc.md#form-validation-forms]
---

# `submitForm` — validate + fetch + notify

Validates a declared form, blocks if invalid, otherwise dispatches a fetch.
Use this **instead of `validateForm` + `fetch`** — `validateForm` does NOT
halt subsequent actions in a chain.

## Shape / Signature

```json
{ "action": "submitForm", "params": {
  "formId"?: "<form-id>",
  "url": "<string-or-$template>",
  "method": "POST" | "PUT" | "PATCH",
  "body": <object>,
  "target"?: "/state/path",
  "successMessage"?: "<string>"
}}
```

When `formId` is present, `submitForm` validates first and blocks dispatch
if the form is invalid. Without `formId`, it behaves like a labeled
`fetch`.

## Examples

Submit with a declared form:
```json
{ "action": "submitForm", "params": {
  "formId": "task-form",
  "url": "/api/tasks",
  "method": "POST",
  "body": { "title": { "$state": "/form/title" } }
}}
```

Disable submit until valid:
```json
"disabled": { "$not": { "$state": "/ui/forms/task-form/isValid" } }
```

## Constraints / Anti-patterns

- **Don't use `validateForm` + `fetch` as a manual gate** — `validateForm`
  marks errors but does NOT halt subsequent actions. Use `submitForm` with
  `formId` instead. See [[@antipattern-action-chain-no-stop]].
- **`submitForm` inside `transaction.confirm` is NOT recommended.** It has
  its own validation gate and error handling that conflicts with the
  transaction engine. Use plain `fetch` in `confirm` instead. See
  [[@antipattern-submit-form-in-tx-confirm]].

## Related concepts

- [[@action-fetch]] — underlying HTTP layer
- [[@action-form-control]] — `validateForm`/`touchField`/`resetForm`
- [[@concept-forms]] — declarative forms block
- [[@concept-form-state-paths]] — `/ui/forms/{id}/*`

## Sources (raw)

- `docs/consumer/ai-context.md § Actions`
- `docs/consumer/reference-doc.md § Form Validation → Form Actions`
- `docs/consumer/ai-context-patterns.md § Action chains don't stop on failure`
