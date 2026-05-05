---
id: expression-computed
title: `$computed` — registered function
kind: expression
sources: [docs/consumer/ai-context.md#values--formatting, docs/consumer/reference-doc.md#expression-types]
---

# `$computed` — registered function

`$computed` calls a registered function with resolved arguments. **Prefer the
built-in operators** ([[@expression-math]], [[@expression-array]],
[[@expression-date]], [[@expression-format]]) — built-in operations cover
90%+ of cases without registering code.

## Shape / Signature

```json
{ "$computed": "<functionName>", "args": { "<argName>": <expr>, ... } }
```

## Examples

```json
{
  "$computed": "calculateBMI",
  "args": {
    "weight": { "$state": "/patient/weight" },
    "height": { "$state": "/patient/height" }
  }
}
```

## Constraints / Anti-patterns

- **Prefer built-in expressions.** Use `$computed` only when no
  combination of `$math` / `$array` / `$date` / `$format` covers the case.
- The function must be registered with the engine via host-app config —
  `$computed` references resolve only against that registry.
- Args are resolved before the function runs.

## Related concepts

- [[@expression-math]] — arithmetic
- [[@expression-array]] — array ops
- [[@expression-date]] — date ops
- [[@expression-format]] — value formatting
- [[@concept-derive]] — derived state for memoizing computed values

## Sources (raw)

- `docs/consumer/ai-context.md § Expressions → Values & Formatting → $computed`
- `docs/consumer/reference-doc.md § Expression Types → $computed`
