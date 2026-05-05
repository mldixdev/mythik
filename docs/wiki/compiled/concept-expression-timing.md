---
id: concept-expression-timing
title: Expression Resolution Timing (eager vs lazy)
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md#1-expression-resolution-timing]
---

# Expression Resolution Timing

When the framework resolves `$state`, `$template`, `$prop`, `$auth`, etc.
varies by surface. This matrix is the foundation of every "why is my `$state`
returning stale data?" debugging session.

## Resolution Timing Matrix

| Surface | Binding Location | Timing | Context Source |
|---|---|---|---|
| Direct props | `element.props.*` | **Eager** at render | Render context |
| Event binding (outside repeat) | `element.on.<event>` | **Lazy** at press/dispatch | Dispatch context |
| Event binding (inside repeat) | `element.on.<event>` | **Eager** for `$item`/`$index` shape; lazy inner `$state` | Item + dispatch context |
| Event binding as `$prop` | `element.on.<event>: { $prop: "..." }` | Eager outer (Layer 3 propagation), lazy inner | Prop cascade + dispatch |
| Column actions | `columns[].actions[].onPress` | **Lazy** via `lazyActionPaths` | Dispatch + `/ui/selectedRow` |
| Row click | `onRowClick` | **Lazy** via `lazyActionPaths` | Dispatch + `/ui/selectedRow` |
| `$template` in action params | action params | Lazy at dispatch | Action dispatch context |
| `$template` in element props | prop values | Eager at render | Render context |
| `initialActions[]` params | spec-level | Eager at spec mount | Mount context |
| Transaction `before` | tx phase | Eager at dispatch start | Dispatch context |
| Transaction `optimistic` | tx phase | Eager at dispatch | Dispatch + optimistic state |
| Transaction `onSuccess` / `onError` | tx phase | Eager at network resolve/reject | Dispatch + response |
| Form bindings | `$bindState` | Eager read at render + write on event | Render + event |

## Why this matters

`onClick: [{ "action": "fetch", "params": { "url": { "$template": "/api/items/${ /ui/selectedId }" }}}]`
— the `$template` reads `/ui/selectedId` at **click time**, not render time. If the user clicked a different row between render and click, the click reads the LATER value. Correct behavior for event flows.

## Special cases

- **Inside `repeat`** — binding wrapper is eagerly resolved so `$item`/`$index` bind to the rendered row. Inner `$state`/`$template` inside `params` stay lazy unless they reference `$item` directly.
- **`$prop` bindings** — when binding itself is `{ $prop: "onAction" }` (custom-element propagation), `$prop` resolves eagerly so consumer's supplied chain replaces it. Inner expressions stay lazy.
- **Table row interactions** declare `lazyActionPaths` in the primitive
  schema. Engine keeps `columns[].actions[].onPress` and `onRowClick`
  action bindings raw at render; the row dispatcher writes
  `/ui/selectedRow` and resolves params at press/click time.

## Related concepts

- [[@concept-expression-contexts]] — where each expression works
- [[@concept-prop-cascade]] — `$prop` cascade specifics
- [[@concept-template-interpolation]] — `$template` site contracts
- [[@path-ui-selected-row]] — row context magic path
- [[@concept-primitive-prop-schemas]] — `lazyActionPaths` declaration

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md § 1` (full)
