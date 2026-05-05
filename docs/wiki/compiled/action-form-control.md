---
id: action-form-control
title: `validateForm` / `touchField` / `resetForm`
kind: action
sources: [docs/consumer/ai-context.md#forms, docs/consumer/reference-doc.md#form-actions]
---

# `validateForm` / `touchField` / `resetForm`

Form-control actions — coordinate field validation states programmatically.

## Shape / Signature

```json
{ "action": "validateForm", "params": { "formId": "<id>" } }
{ "action": "touchField",   "params": { "formId": "<id>", "field": "<id>" } }
{ "action": "resetForm",    "params": { "formId": "<id>" } }
```

## Behavior

- **`validateForm`** — marks all fields as touched, runs validation, writes
  errors. Does NOT block subsequent actions. To gate submission, use
  [[@action-submit-form]] with `formId`.
- **`touchField`** — marks one field touched and validates it.
- **`resetForm`** — restores state values to initial AND clears all
  metadata (touched, errors, dirty).

## Examples

Reset on cancel:
```json
{ "action": "resetForm", "params": { "formId": "task-form" } }
```

Touch a field on blur:
```json
"on": { "change": { "action": "touchField", "params": { "formId": "task-form", "field": "email" } } }
```

## Constraints / Anti-patterns

- **`validateForm` does NOT halt action chains** — use `submitForm` to
  gate submission. See [[@antipattern-action-chain-no-stop]].

## Related concepts

- [[@action-submit-form]] — preferred submission action
- [[@concept-forms]] — declarative form block
- [[@concept-form-state-paths]] — auto-generated state paths

## Sources (raw)

- `docs/consumer/ai-context.md § Forms`
- `docs/consumer/reference-doc.md § Form Validation → Form Actions`
