---
id: expression-switch
title: `$switch` — multi-branch conditional
kind: expression
sources: [docs/consumer/ai-context.md#conditionals--logic, docs/consumer/reference-doc.md#expression-types]
---

# `$switch` — multi-branch conditional

`$switch` evaluates an expression, converts the result to string, looks up in
`cases`, and returns the matched value (or `default` if no match). Use for
3+ branches instead of nested `$cond`. **`default` is required** — prevents
silent `undefined`.

## Shape / Signature

```json
{
  "$switch": <expression>,
  "cases": { "<key>": <value>, "...": "..." },
  "default": <value>
}
```

Cases are looked up by string match against the resolved expression.

## Examples

Categorize by numeric type:
```json
{
  "$switch": { "$state": "/filter/type" },
  "cases": {
    "1": "Current Expenses",
    "2": "Capital Expenses",
    "3": { "$token": "colors.warning" }
  },
  "default": "Other"
}
```

Drive variant dynamically (consumer of [[@concept-custom-elements]]):
```json
"variant": {
  "$switch": { "$state": "/filter/tipoEjecucion" },
  "cases": { "1": "active" },
  "default": "inactive"
}
```

## Constraints / Anti-patterns

- **`default` is required.** Omitting it produces silent `undefined` at
  runtime if no case matches.
- Cases match the **stringified** evaluation. Numbers, booleans, and
  enums all match string keys.
- Only the matching case is resolved (lazy evaluation). Other case
  expressions are not evaluated.

## Related concepts

- [[@expression-cond]] — 2-branch alternative
- [[@expression-and-or-not]] — boolean composition

## Sources (raw)

- `docs/consumer/ai-context.md § Expressions → Conditionals & Logic → $switch`
- `docs/consumer/reference-doc.md § Expression Types → $switch`
