---
id: antipattern-row-template-capture
title: Anti-pattern — `$item` directly in `$template`
kind: pattern
sources: [docs/consumer/ai-context-patterns.md#expression-resolution-contexts]
---

# Anti-pattern — `$item` directly in `$template`

`$item` is a JSON expression, not a string token. **`$template` does NOT
resolve `$item` directly.** Capture in `$let` first.

## Wrong

```json
{ "$template": "Editing: ${ $item.name }" }     // BAD — does not work
{ "$template": "Editing: ${ /item/name }" }      // BAD — wrong path
```

## Right

```json
{
  "$let": { "x": { "$item": "name" } },
  "$in": { "$template": "Editing: ${x}" }
}
```

`${name}` references in `$template` resolve **only** `$let` bindings,
plus `${/state/path}` for state reads. To bridge `$item` → `$template`,
go through `$let`.

## Related concepts

- [[@expression-template]]
- [[@expression-item-index]]
- [[@expression-let-ref]]
- [[@concept-expression-contexts]]

## Sources (raw)

- `docs/consumer/ai-context-patterns.md § Expression Resolution Contexts → Key traps`
