---
id: concept-derive
title: `derive` — derived state
kind: concept
sources: [docs/consumer/ai-context.md#derived-state, docs/consumer/reference-doc.md#derived-state-derive, docs/consumer/ai-context-runtime-semantics.md#53-derive-evaluation-order]
---

# `derive` — derived state

Auto-computed reactive state. Declared at spec level. **Read-only** —
StateGuard blocks `setState` writes to derive paths. Dependency-tracked —
only re-evaluates when a dependency changes.

## Shape / Signature

```json
{
  "derive": {
    "/stats/total": { "$array": "count", "source": { "$state": "/items" } },
    "/stats/avg": { "$math": "divide", "args": [
      { "$array": "sum", "source": { "$state": "/items" }, "field": "price" },
      { "$array": "count", "source": { "$state": "/items" } }
    ]}
  }
}
```

## How it works

1. On spec mount: all derive expressions are evaluated in dependency order
   (topological sort).
2. On state change: only derives whose deps changed re-evaluate.
3. Derive paths are **read-only** — `setState` to a derive path is blocked
   by StateGuard.
4. Circular dependencies are detected at mount time (throws error).
5. Derive A can reference Derive B (no cycles).

## Constraints / Anti-patterns

- **Derive sees only data in state.** With server-side pagination, state
  holds the current page — derive sums/counts reflect the page, not the
  full dataset. For full-dataset totals, use the API's `totals` response.
  See [[@antipattern-derive-server-pagination]].
- **`$auth` not available in derive.** Use `$state: "/auth/*"` instead.
  See [[@concept-expression-contexts]].
- **Empty/cyclic/protected paths fail at validation** — see
- **DeriveEngine degrades gracefully**: one bad expression doesn't break
  others. Errors logged via `console.error`; affected path stays
  unwritten or holds last-good value.

## Lifecycle (post-Item-E)

DeriveEngine mounts first, populates derive paths from current state, then
subscribes for reactive recompute. See [[@concept-derive-datasources-mount-order]].

## Related concepts

- [[@concept-data-sources]]
- [[@concept-derive-datasources-mount-order]]
- [[@concept-state-protection]]
- [[@concept-expression-contexts]]

## Sources (raw)

- `docs/consumer/ai-context.md § Derived State`
- `docs/consumer/reference-doc.md § Derived State (derive)`
- `docs/consumer/ai-context-runtime-semantics.md § 5.3`
