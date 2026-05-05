---
id: pattern-form-validation
title: Pattern — Form validation overview
kind: pattern
sources: [docs/consumer/ai-context.md#forms]
---

# Pattern — Form validation overview

Two layers of validation in Mythik:

1. **Inline `checks`** on individual inputs — for standalone fields.
2. **Declarative `forms` block** — for coordinated multi-field forms with
   `isValid`, cross-field rules, and `submitForm` gating.

## When to pick which

| Need | Pick |
|---|---|
| Single field, no cross-references | Inline `checks` |
| Disable submit until form is valid | `forms` + `submitForm` |
| Cross-field rule (`greaterThan`, `requiredIf`) | `forms` |
| Conditional rule based on another field's value | `forms` + `derive` (see [[@pattern-form-validation-cross-field]]) |

## Skeleton

```json
{
  "forms": {
    "my-form": {
      "fields": {
        "title": { "statePath": "/form/title", "rules": [{ "type": "required" }] }
      },
      "validateOn": "blur"
    }
  },
  "elements": {
    "submit-btn": {
      "type": "button",
      "props": { "label": "Save", "disabled": { "$not": { "$state": "/ui/forms/my-form/isValid" } } },
      "on": { "press": { "action": "submitForm", "params": { "formId": "my-form", "url": "...", "method": "POST", "body": {...} } } }
    }
  }
}
```

## Related concepts

- [[@concept-forms]]
- [[@concept-validation-checks]]
- [[@concept-validators-catalog]]
- [[@pattern-form-validation-cross-field]]
- [[@action-submit-form]]
- [[@antipattern-action-chain-no-stop]]

## Sources (raw)

- `docs/consumer/ai-context.md § Forms`
