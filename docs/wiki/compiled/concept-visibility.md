---
id: concept-visibility
title: `visible` — show/hide condition
kind: concept
sources: [docs/consumer/ai-context.md#visibility, docs/consumer/reference-doc.md#visibility-conditions]
---

# `visible` — show/hide condition

`visible` is an expression that controls whether an element renders.
Returns a boolean — when truthy, the element renders; when falsy, it's
omitted from the DOM/render tree.

## Shape / Signature

```json
"visible": <expression>
```

## Examples

Role check:
```json
"visible": { "$state": "/user/role", "eq": "admin" }
"visible": { "$auth": "role", "eq": "admin" }
```

Compound conditions:
```json
"visible": { "$and": [{ "$state": "/form/isValid" }, { "$state": "/form/hasChanges" }] }
"visible": { "$or": [{ "$state": "/user/isVIP" }, { "$state": "/cart/total", "gt": 200 }] }
```

Negation:
```json
"visible": { "$not": { "$state": "/ui/loading" } }
```

## Constraints / Anti-patterns

- **Don't add `visible` on `modal` / `drawer`** — engine manages those.
  See [[@antipattern-modal-drawer-visible]].
- For loading/content/empty states, use [[@pattern-loading-content-empty]].

## Related concepts

- [[@expression-state]] — typical condition source
- [[@expression-cond]] / [[@expression-and-or-not]]
- [[@expression-auth]]
- [[@pattern-loading-content-empty]]

## Sources (raw)

- `docs/consumer/ai-context.md § Visibility`
- `docs/consumer/reference-doc.md § Visibility Conditions`
