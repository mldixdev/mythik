---
id: expression-math
title: `$math` — arithmetic operations
kind: expression
sources: [docs/consumer/ai-context.md#math--data, docs/consumer/reference-doc.md#expression-types]
---

# `$math` — arithmetic operations

Arithmetic over expressions. Operations: `add`, `subtract`, `multiply`, `divide`,
`round`, `floor`, `ceil`, `abs`, `min`, `max`, `mod`. Undefined args coerce to
`0` (prevents NaN propagation).

## Shape / Signature

Binary/n-ary operations use `args`:
```json
{ "$math": "add", "args": [<expr>, <expr>, ...] }
```

Unary operations use `value`:
```json
{ "$math": "round", "value": 3.14159, "decimals": 2 }
```

## Examples

Multiply two state values:
```json
{ "$math": "multiply", "args": [{ "$state": "/price" }, { "$state": "/qty" }] }
```

Calculate average price (used in derive):
```json
"/stats/avg": {
  "$math": "divide",
  "args": [
    { "$array": "sum", "source": { "$state": "/items" }, "field": "price" },
    { "$array": "count", "source": { "$state": "/items" } }
  ]
}
```

Round to 2 decimals:
```json
{ "$math": "round", "value": { "$state": "/total" }, "decimals": 2 }
```

## Constraints / Anti-patterns

- **Undefined args → 0.** If a state path doesn't exist yet,
  `$math` treats it as `0`. Prevents NaN in the UI but masks data
  loading order issues — use `visible` conditions or
  `initialActions` to ensure data exists before rendering.
- The spec author is responsible for data availability; `$math` is
  responsible for never producing NaN.

## Related concepts

- [[@expression-array]] — `sum`, `count`, etc.
- [[@expression-format]] — currency/number formatting after math
- [[@concept-derive]] — typical `$math` consumer

## Sources (raw)

- `docs/consumer/ai-context.md § Expressions → Math & Data → $math`
- `docs/consumer/reference-doc.md § Expression Types → $math`
