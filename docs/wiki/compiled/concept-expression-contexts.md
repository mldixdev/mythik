---
id: concept-expression-contexts
title: Expression Resolution Contexts (where each expression works)
kind: concept
sources: [docs/consumer/ai-context-patterns.md#expression-resolution-contexts]
---

# Expression Resolution Contexts

Where each expression CAN be used. **"no"** = documented trap (will fail or
produce wrong results). Use this matrix to answer "can I put `$item` here?"
before debugging.

## Context Matrix

| Expression | props | visible | style | derive | repeat.source | $template | transaction |
|---|---|---|---|---|---|---|---|
| `$state` | yes | yes | yes | yes | yes | yes | yes |
| `$item` / `$index` | yes | yes | yes | — | yes | **no** | **no** |
| `$auth` | yes | yes | yes | — | — | **no** | — |
| `$cond` | yes | yes | yes | yes | yes | — | yes |
| `$and`/`$or`/`$not` | yes | yes | yes | yes | yes | — | yes |
| `$format` | yes | — | — | yes | — | — | — |
| `$array` | yes | yes | — | yes | yes | — | yes |
| `$math` | yes | — | — | yes | — | — | yes |
| `$template` | yes | — | — | — | — | — | yes |
| `$let`/`$in` | yes | yes | yes | yes | yes | — | yes |
| `$prop` | yes | yes | yes | — | — | — | — |
| `$i18n` | yes | — | — | — | — | — | — |
| `$breakpoint` | yes | yes | yes | — | — | — | — |
| `$platform` | yes | yes | yes | — | yes | — | — |
| `$computed` | yes | yes | yes | — | — | — | — |

## Key traps

- **`$item` in `$template`** does NOT work. Capture in `$let` first:
  ```json
  { "$let": { "x": { "$item": "name" } }, "$in": { "$template": "${x}" } }
  ```
- **`$item` in transaction** does NOT resolve. Capture row data via
  `setState` before the transaction fires.
- **`$auth` in derive** is not available. Use `$state` to read from
  `/auth/*` paths that the auth engine populates.

## Related concepts

- [[@concept-expression-timing]] — when (eager vs lazy)
- [[@expression-let-ref]] — bridging trap
- [[@expression-template]]
- [[@expression-item-index]]
- [[@expression-auth]]
- [[@concept-derive]]

## Sources (raw)

- `docs/consumer/ai-context-patterns.md § Expression Resolution Contexts`
