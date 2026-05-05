---
id: expression-and-or-not
title: `$and` / `$or` / `$not` — boolean logic
kind: expression
sources: [docs/consumer/ai-context.md#conditionals--logic, docs/consumer/reference-doc.md#expression-types]
---

# `$and` / `$or` / `$not`

Boolean composition. Works everywhere a boolean is accepted — `visible`,
`disabled`, conditions inside `$cond`, etc.

## Shape / Signature

```json
{ "$and": [<expr>, <expr>, ...] }
{ "$or":  [<expr>, <expr>, ...] }
{ "$not": <expr> }
```

## Examples

All conditions must be true:
```json
"visible": { "$and": [
  { "$state": "/form/isValid" },
  { "$state": "/form/hasChanges" }
]}
```

Either of multiple roles:
```json
{ "$or": [{ "$state": "/user/isAdmin" }, { "$state": "/user/isModerator" }] }
```

Negation:
```json
{ "$not": { "$state": "/form/isValid" } }
```

Combined with array operations (loading/empty pattern):
```json
"visible": {
  "$and": [
    { "$not": { "$state": "/ui/loading" } },
    { "$not": { "$array": "count", "source": { "$state": "/items" } } }
  ]
}
```

## Constraints / Anti-patterns

- Truthy/falsy follows JavaScript semantics: `0`, `""`, `null`,
  `undefined`, `false`, empty arrays/objects evaluate as falsy.
- Use `$cond` to wrap when the surrounding prop requires a strict
  boolean (some props are stricter than `visible`).

## Related concepts

- [[@expression-cond]]
- [[@expression-switch]]
- [[@concept-visibility]] — most common use site
- [[@pattern-loading-content-empty]] — typical `$and` + `$not` shape

## Sources (raw)

- `docs/consumer/ai-context.md § Expressions → Conditionals & Logic`
- `docs/consumer/reference-doc.md § Expression Types → $and / $or / $not`
