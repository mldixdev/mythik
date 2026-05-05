---
id: concept-template-interpolation
title: `$template` interpolation contract
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md#15-template-interpolation]
---

# `$template` interpolation contract

`$template` is resolved at the **consumption site**. The same template object
resolves at different times depending on where it lives in the spec.

## Site contract

| Site | Timing | Context |
|---|---|---|
| Element prop | At render | Render context (eager) |
| Action param | At dispatch | Dispatch-time state (lazy) |

Nested expressions (`$state`, `$auth`, `$math`) inside the template resolve
with the template's execution context.

## Examples

In a prop — resolves at render with the current `/auth/user/id`:
```json
{ "props": { "src": { "$template": "/avatars/${ /auth/user/id }.png" } } }
```

In an action param — resolves at dispatch with the current `/ui/selectedId`:
```json
{ "action": "fetch", "params": { "url": { "$template": "/api/items/${ /ui/selectedId }" } } }
```

## Reference forms inside `$template`

| Form | Resolves to |
|---|---|
| `${/state/path}` | Read from state |
| `${name}` | Read from a `$let` binding |

## Constraints / Anti-patterns

- **`$item` does NOT resolve directly inside `$template`.** Capture in
  `$let` first.
- **`$template` does NOT resolve in transaction phases.** Capture row data
  via `setState` first.
- In `DataSourceConfig.url`, plain strings containing `${...}` are LITERAL
  — wrap in `$template` to enable templating. Validator catches this and
  points to the fix.

## Related concepts

- [[@expression-template]] — basic syntax
- [[@expression-let-ref]] — capturing for `$template`
- [[@concept-expression-timing]] — full timing matrix

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md § 1.5`
