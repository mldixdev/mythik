---
id: expression-item-index
title: `$item` / `$index` — repeat context
kind: expression
sources: [docs/consumer/ai-context.md#expressions, docs/consumer/reference-doc.md#expression-types]
---

# `$item` / `$index` — repeat context (read-only)

Inside a `repeat` block, `$item` reads a field from the current item; `$index`
returns the position. Works in `props`, `style`, `visible`, and `on` (event
params are pre-resolved with item context). For two-way binding to a current
item field, use [[@expression-binditem]].

## Shape / Signature

```json
{ "$item": "<fieldName>" }
{ "$item": "" }       // returns the whole item
{ "$index": true }
```

## Examples

Display item field:
```json
{ "type": "text", "props": { "content": { "$item": "title" } } }
```

Whole item passed to a template prop:
```json
{ "type": "row-template", "props": { "row": { "$item": "" } } }
```

Conditional style based on item priority:
```json
"style": { "color": {
  "$cond": { "$item": "priority", "eq": "urgent" },
  "$then": "#EF4444",
  "$else": "#22C55E"
}}
```

Index in a label:
```json
{ "$let": { "n": { "$index": true } }, "$in": { "$template": "Row #${n}" } }
```

## Constraints / Anti-patterns

- **`$item` in `$template` does NOT work directly.** Capture in `$let`
  first — see [[@concept-expression-contexts]] and [[@expression-let-ref]].
- **`$item` in transaction phases does NOT resolve.** Capture row data
  via `setState` before the transaction fires.
- **`$item` only inside `repeat`.** Outside `repeat` returns undefined.
- For event-handler params inside `repeat`, the binding wrapper is
  eagerly resolved so `$item` binds to the row being rendered. Inner
  `$state`/`$template` inside params stay lazy.

## Related concepts

- [[@expression-binditem]] — two-way binding equivalent
- [[@expression-let-ref]] — bridge `$item` into `$template`
- [[@concept-repeat]] — `repeat` config
- [[@concept-expression-contexts]] — where `$item` resolves
- [[@concept-expression-timing]] — eager vs lazy semantics inside repeat

## Sources (raw)

- `docs/consumer/ai-context.md § Expressions → State & Binding`
- `docs/consumer/ai-context-patterns.md § Expression Resolution Contexts`
- `docs/consumer/reference-doc.md § Expression Types → $item / $index`
