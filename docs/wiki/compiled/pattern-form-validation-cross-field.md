---
id: pattern-form-validation-cross-field
title: Pattern — Cross-field validation (`derive` + `requiredIf`)
kind: pattern
sources: [docs/consumer/ai-context-patterns.md#requiredif-is-truthy-only]
---

# Pattern — Cross-field validation

`requiredIf` is **truthy-only** — does NOT support `eq`. To require based
on a specific value, derive a boolean first, then `requiredIf` on that
derived path.

## Pattern

```json
{
  "derive": {
    "/ui/isEngineering": {
      "$cond": { "$state": "/form/department", "eq": "Engineering" },
      "$then": true,
      "$else": false
    }
  },
  "forms": {
    "employee-form": {
      "fields": {
        "salary": {
          "statePath": "/form/salary",
          "rules": [
            { "type": "required" },
            { "type": "requiredIf", "args": { "field": { "$state": "/ui/isEngineering" } }, "message": "Salary required for Engineering" },
            { "type": "greaterThan", "args": { "other": { "$state": "/form/minSalary" } }, "message": "Must exceed minimum" }
          ]
        }
      }
    }
  }
}
```

## Why this works

- `derive` computes `/ui/isEngineering` as a boolean reactively.
- `requiredIf` reads the boolean — works because the `field` arg is now
  truthy/falsy (not a value comparison).

## Related concepts

- [[@concept-validators-catalog]]
- [[@concept-derive]]
- [[@concept-forms]]
- [[@expression-cond]]
- [[@antipattern-required-if-equals]]

## Sources (raw)

- `docs/consumer/ai-context-patterns.md § requiredIf is truthy-only` + Cross-field conditional pattern
