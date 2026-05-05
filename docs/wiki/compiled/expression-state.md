---
id: expression-state
title: `$state` — read from state
kind: expression
sources: [docs/consumer/ai-context.md#expressions, docs/consumer/reference-doc.md#expression-types]
---

# `$state` — read from state

`$state` reads a value from the application state store at the given JSON
Pointer path. It is the most common expression and works in nearly every
context (props, visible, style, derive, repeat.source, $template, transaction).

## Shape / Signature

```json
{ "$state": "/path/to/value" }
```

Can carry an `eq` operator (boolean shortcut) when used in `visible`:
```json
{ "$state": "/user/role", "eq": "admin" }
```

## Examples

Read a value:
```json
{ "type": "text", "props": { "content": { "$state": "/user/name" } } }
```

Boolean check in `visible`:
```json
"visible": { "$state": "/user/role", "eq": "admin" }
```

Use inside `$template`:
```json
{ "$template": "Hello, ${/user/name}!" }
```

Inside `$array` source:
```json
{ "$array": "count", "source": { "$state": "/items" } }
```

## Constraints / Anti-patterns

- **Trap:** `$state` with `eq` only works as a boolean condition in `visible`.
  For `disabled` / other props that need a strict boolean, wrap in `$cond`:
  ```json
  { "$cond": { "$state": "/x", "eq": 0 }, "$then": true, "$else": false }
  ```
- For auth user data, prefer [[@expression-auth]] — `$auth` is whitelisted and
  blocks tokens/passwords; `$state: "/auth/user/email"` works but is less safe.
- Some paths are framework-managed (read-only). Writing to them via `setState`
  triggers StateGuard rejection — see [[@concept-state-protection]].

## Related concepts

- [[@expression-bindstate]] — two-way binding equivalent
- [[@expression-template]] — `$state` interpolation in strings
- [[@expression-cond]] — wrap `$state` for non-boolean contexts
- [[@concept-expression-timing]] — when `$state` resolves
- [[@concept-state-protection]] — read-only paths

## Sources (raw)

- `docs/consumer/ai-context.md § Expressions → State & Binding`
- `docs/consumer/reference-doc.md § Expression Types → $state`
