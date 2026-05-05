---
id: antipattern-required-if-equals
title: Anti-pattern — `requiredIf` with value comparison
kind: pattern
sources: [docs/consumer/ai-context-patterns.md#requiredif-is-truthy-only]
---

# Anti-pattern — `requiredIf` with value comparison

`requiredIf` is **truthy-only**. Does NOT support `eq`. Trying to require
based on a specific value silently does nothing.

## Wrong

```json
{ "type": "requiredIf", "args": { "field": { "$state": "/form/department" }, "eq": "Engineering" } }
```

`requiredIf` ignores `eq` and only checks `field` truthiness. The field
is always truthy (whatever the department), so the rule always fires.

## Right — derive a boolean first

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
            { "type": "requiredIf", "args": { "field": { "$state": "/ui/isEngineering" } }, "message": "Salary required for Engineering" }
          ]
        }
      }
    }
  }
}
```

See [[@pattern-form-validation-cross-field]] for the full pattern.

## Related concepts

- [[@concept-validators-catalog]]
- [[@concept-derive]]
- [[@expression-cond]]
- [[@pattern-form-validation-cross-field]]

## Sources (raw)

- `docs/consumer/ai-context-patterns.md § requiredIf is truthy-only`
