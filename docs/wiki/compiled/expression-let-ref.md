---
id: expression-let-ref
title: `$let` / `$ref` — named bindings
kind: expression
sources: [docs/consumer/ai-context.md#named-bindings, docs/consumer/reference-doc.md#expression-types]
---

# `$let` / `$ref` — named bindings

`$let` defines named bindings; `$in` is the expression that uses them.
References use `$ref`. Use to define a value once and reference it multiple
times — particularly useful when `$item` or a complex expression must be
captured for use in `$template`.

`$ref` can read nested values from an object binding with dot notation. The
same dotted binding lookup is available inside `$template` placeholders.

## Shape / Signature

Object form (no inter-binding refs):
```json
{
  "$let": { "name1": <expr>, "name2": <expr> },
  "$in": <expr-using-$ref>
}
```

Array form (preserves order — use when stored in JSONB):
```json
{
  "$let": [
    ["filtered", { "$array": "filter", ... }],
    ["count", { "$array": "count", "source": { "$ref": "filtered" } }]
  ],
  "$in": { "$ref": "count" }
}
```

## Examples

Capture `$item` for `$template` (the most common use):
```json
{
  "$let": { "x": { "$item": "name" } },
  "$in": { "$template": "Editing: ${x}" }
}
```

Read nested object fields:
```json
{
  "$let": { "user": { "$state": "/auth/user" } },
  "$in": {
    "label": { "$ref": "user.name" },
    "message": { "$template": "Welcome, ${user.name}" }
  }
}
```

Multi-step computation:
```json
{
  "$let": {
    "total": { "$array": "count", "source": { "$state": "/items" } },
    "label": { "$template": "${total} items" }
  },
  "$in": { "$ref": "label" }
}
```

In a composite template:
```json
"stat-card": {
  "type": "text",
  "defaults": { "label": "Count", "value": 0 },
  "props": {
    "content": {
      "$let": { "l": { "$prop": "label" }, "v": { "$prop": "value" } },
      "$in": { "$template": "${l}: ${v}" }
    }
  }
}
```

## Constraints / Anti-patterns

- **Use array form when storing in JSONB.** Object key order is not
  preserved by JSONB — if bindings reference each other via `$ref`, use
  the array form to guarantee evaluation order. See rule 4.
- **Fix missing dotted `$ref` segments.** A path such as
  `{ "$ref": "user.name" }` expects `user` to exist as a binding and `name`
  to exist on that object. Missing dotted segments are invalid references,
  not optional data.
- Object form is fine when bindings don't reference each other.

## Related concepts

- [[@expression-prop]] — `$prop` inside templates needs `$let` to bridge into `$template`
- [[@expression-template]] — primary consumer of `$let` bindings
- [[@expression-item-index]] — `$item` doesn't work inside `$template` directly

## Sources (raw)

- `docs/consumer/ai-context.md § Expressions → Named Bindings`
- `docs/consumer/reference-doc.md § Expression Types → $let / $ref`
