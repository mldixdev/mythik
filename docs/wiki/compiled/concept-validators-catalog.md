---
id: concept-validators-catalog
title: Validators catalog
kind: concept
sources: [docs/consumer/ai-context.md#validation, docs/consumer/reference-doc.md#validation]
---

# Validators catalog

Built-in validator types for `checks` on inputs and `rules` in forms.

| Validator | Args | Purpose |
|---|---|---|
| `required` | — | Non-empty value |
| `email` | — | Email format |
| `minLength` | `{ min }` | Minimum string length |
| `maxLength` | `{ max }` | Maximum string length |
| `pattern` | `{ pattern }` | Regex match |
| `min` | `{ min }` | Minimum number |
| `max` | `{ max }` | Maximum number |
| `numeric` | — | Must be a number |
| `url` | — | Valid URL |
| `matches` / `equalTo` | `{ other }` | Must equal another field |
| `greaterThan` / `lessThan` | `{ other }` | Compare to another field |
| `requiredIf` | `{ field }` | Required when `field` value is truthy. **Truthy check only** — no `eq` operator |

## `requiredIf` trap

`requiredIf` is **truthy-only**. To require based on a specific value (not
just truthy), compute a boolean via `derive` first, then `requiredIf` on
that derived path. See [[@antipattern-required-if-equals]] +
[[@pattern-form-validation-cross-field]].

## Cross-field validators

`matches`, `equalTo`, `greaterThan`, `lessThan`, `requiredIf` all reference
another field via `args.other` or `args.field`. The `other`/`field` value
is itself an expression — typically `{ "$state": "/form/<other-field>" }`.

## Examples

Cross-field validation in `forms`:
```json
"maxPrice": { "statePath": "/form/maxPrice", "rules": [
  { "type": "greaterThan", "args": { "other": { "$state": "/form/minPrice" } }, "message": "Max must exceed min" }
]}
```

Conditional required via derived boolean:
```json
"derive": {
  "/ui/isEngineering": { "$cond": { "$state": "/form/department", "eq": "Engineering" }, "$then": true, "$else": false }
},
"forms": {
  "employee-form": {
    "fields": {
      "salary": { "statePath": "/form/salary", "rules": [
        { "type": "requiredIf", "args": { "field": { "$state": "/ui/isEngineering" } }, "message": "Salary required for Engineering" }
      ]}
    }
  }
}
```

## Related concepts

- [[@concept-validation-checks]] — inline use
- [[@concept-forms]] — coordinated use
- [[@antipattern-required-if-equals]]
- [[@pattern-form-validation-cross-field]]
- [[@concept-derive]]

## Sources (raw)

- `docs/consumer/ai-context.md § Validation`
- `docs/consumer/reference-doc.md § Validation`
