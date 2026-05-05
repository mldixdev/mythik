---
id: expression-template
title: `$template` — string interpolation
kind: expression
sources: [docs/consumer/ai-context.md#values--formatting, docs/consumer/ai-context-runtime-semantics.md#15-template-interpolation]
---

# `$template` — string interpolation

`$template` interpolates values into a string. Two reference forms:
`${/state/path}` reads from state, `${name}` reads from a `$let` binding.
Resolves at the consumption site — at render in element props, at dispatch in
action params.

## Shape / Signature

```json
{ "$template": "literal text ${/state/path} and ${letBindingName}" }
```

## Examples

State interpolation:
```json
{ "$template": "Hello, ${/user/name}! You have ${/inbox/count} messages." }
```

URL with state:
```json
{ "$template": "${/config/apiUrl}/rest/v1/items?id=eq.${/form/editId}" }
```

Combined with `$let` (when `$item` is needed inside `$template`):
```json
{
  "$let": { "x": { "$item": "name" } },
  "$in": { "$template": "Editing: ${x}" }
}
```

## Constraints / Anti-patterns

- **`$template` does NOT resolve `$item` directly.** `$item` is a JSON
  expression, not a string token. Capture in `$let` first (see example
  above) — see also [[@concept-expression-contexts]].
- **`$template` does NOT resolve in transaction phases.** Capture row data
  via `setState` before the transaction fires.
- **Plain strings containing `${...}` are LITERAL** in `DataSourceConfig.url`.
  Wrap in `$template` to enable templating — the validator catches plain
  strings with `${...}` and points to the fix. See

## Resolution timing

| Surface | Timing |
|---|---|
| Element prop | Eager at render |
| Action param | Lazy at dispatch |

## Related concepts

- [[@concept-template-interpolation]] — full timing contract
- [[@expression-let-ref]] — capture values for use in `$template`
- [[@expression-state]] — `${/path}` form
- [[@concept-expression-contexts]] — where `$template` works
- [[@concept-data-sources]] — URL template gotcha

## Sources (raw)

- `docs/consumer/ai-context.md § Expressions → Values & Formatting → $template`
- `docs/consumer/ai-context-runtime-semantics.md § 1.5`
- `docs/consumer/reference-doc.md § Expression Types → $template`
