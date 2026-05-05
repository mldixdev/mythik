---
id: concept-initial-actions
title: `initialActions` — mount-time actions
kind: concept
sources: [docs/consumer/ai-context.md#spec-structure, docs/consumer/ai-context-runtime-semantics.md#1-expression-resolution-timing]
---

# `initialActions` — mount-time actions

`initialActions` is a top-level array of ActionBindings that fire once when
the spec mounts. Use it to load initial data (typically `fetch`), set initial
state, or trigger any one-shot setup. Params are eagerly resolved at mount
context — state then stabilizes for subsequent renders.

## Shape / Signature

```json
{
  "root": "...",
  "initialActions": [
    { "action": "fetch", "params": { "url": "/api/data", "target": "/items" } },
    { "action": "setState", "params": { "statePath": "/ui/ready", "value": true } }
  ],
  "elements": { ... }
}
```

## Resolution timing

| Surface | Timing |
|---|---|
| `initialActions[]` params | **Eager** at spec mount, mount context |

Subsequent state changes do NOT re-fire `initialActions`. For reactive
fetching, use [[@concept-data-sources]].

## Examples

Initial data load with auth headers:
```json
"initialActions": [
  { "action": "fetch", "params": {
    "url": "/api/items",
    "headers": { "$state": "/config/headers" },
    "target": "/items"
  }}
]
```

Multiple actions run sequentially:
```json
"initialActions": [
  { "action": "fetch", "params": { "url": "/api/config", "target": "/config" } },
  { "action": "fetch", "params": { "url": "/api/items", "target": "/items" } }
]
```

## Constraints / Anti-patterns

- **Don't mix `initialActions + fetch` and `dataSources` for the same data
  target.** Each writes to different loading-state paths (`/ui/loading` vs
  `/{target}Loading`). Pick one pattern per data source — see
  [[@antipattern-mix-fetch-and-datasources]] and
  [[@pattern-fetch-vs-datasources]].
- Engines with `dataSources` self-coordinate via reactive subscriptions —
  no ordering dependency on `initialActions`. URL templates depending on
  `initialActions` output use skip-on-undefined-URL-deps to defer the
  initial fetch until deps resolve.

## Related concepts

- [[@action-fetch]] — most common initialAction
- [[@concept-data-sources]] — reactive alternative
- [[@concept-data-sources-lifecycle]] — mount ordering
- [[@concept-skeleton-auto]] — auto-skeleton activates when `initialActions`
  has `fetch`
- [[@pattern-loading-content-empty]] — visibility pattern paired with `fetch`

## Sources (raw)

- `docs/consumer/ai-context.md § Spec Structure → Top-Level Properties`
- `docs/consumer/ai-context-runtime-semantics.md § 1.1` (timing matrix), § 9 (mount runtime)
