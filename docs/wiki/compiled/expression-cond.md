---
id: expression-cond
title: `$cond` / `$then` / `$else` — conditional value
kind: expression
sources: [docs/consumer/ai-context.md#conditionals--logic, docs/consumer/reference-doc.md#expression-types]
---

# `$cond` / `$then` / `$else`

`$cond` evaluates a condition and returns `$then` if truthy, `$else` otherwise.
Operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `not`. Both branches can be
arbitrary expressions.

## Shape / Signature

```json
{
  "$cond": <expression-or-condition>,
  "$then": <value>,
  "$else": <value>
}
```

Truthiness check:
```json
{ "$cond": { "$state": "/form/isValid" }, "$then": "green", "$else": "gray" }
```

Operator form:
```json
{ "$cond": { "$item": "priority", "eq": "urgent" }, "$then": "#EF4444", "$else": "#22C55E" }
```

## Examples

Disable button conditionally:
```json
"disabled": {
  "$cond": { "$state": "/x", "eq": 0 },
  "$then": true,
  "$else": false
}
```

Nested for multi-branch (prefer [[@expression-switch]] for 3+ branches):
```json
{
  "$cond": { "$item": "priority", "eq": "urgent" },
  "$then": "#EF4444",
  "$else": {
    "$cond": { "$item": "priority", "eq": "high" },
    "$then": "#F97316",
    "$else": "#22C55E"
  }
}
```

## Constraints / Anti-patterns

- **For 3+ branches use [[@expression-switch]].** Deeply nested `$cond`
  becomes unreadable.
- **`$state` with `eq` only resolves to boolean in `visible`.** For
  `disabled` and other props, wrap in `$cond` (the trap above).
- `requiredIf` is truthy-only — does NOT support `eq`. To require
  conditionally on a specific value, derive a boolean first via `$cond` in
  `derive`, then `requiredIf` on that derived path. See
  [[@antipattern-required-if-equals]] + [[@pattern-form-validation-cross-field]].

## Related concepts

- [[@expression-switch]] — multi-branch alternative
- [[@expression-and-or-not]] — boolean composition
- [[@concept-derive]] — derived booleans for conditional rules

## Sources (raw)

- `docs/consumer/ai-context.md § Expressions → Conditionals & Logic`
- `docs/consumer/reference-doc.md § Expression Types → $cond / $then / $else`
