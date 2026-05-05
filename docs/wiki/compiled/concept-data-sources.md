---
id: concept-data-sources
title: `dataSources` — reactive GET fetching
kind: concept
sources: [docs/consumer/ai-context.md#datasources, docs/consumer/reference-doc.md#data-sources-datasources, docs/consumer/ai-context-runtime-semantics.md#52-datasources-lifecycle]
---

# `dataSources` — reactive GET fetching

Declarative reactive data fetching. Makes specs self-contained. Fetches
re-fire automatically when declared parameter dependencies change. **For
one-shot operations (POST/PATCH/DELETE), use [[@action-fetch]] inside
transactions.**

## Shape / Signature

```json
"dataSources": {
  "tasks": {
    "url": { "$template": "${/config/apiUrl}/rest/v1/tasks?select=*" },
    "method": "GET",
    "headers": { "$state": "/config/headers" },
    "params": {
      "status": { "$state": "/filter/status" },
      "page": { "$state": "/pagination/page" },
      "search": { "$state": "/filter/search" }
    },
    "target": "/tasks",
    "trigger": "auto",
    "debounce": 300,
    "initialFetch": true,
    "emptyWhileLoading": false
  }
}
```

## Properties

| Property | Type | Default | Description |
|---|---|---|---|
| `url` | Expression | — | Request URL (supports `$template`, `$state`) |
| `method` | string | `"GET"` | HTTP method |
| `headers` | Expression | — | From state, NOT from spec (no keys in DB) |
| `params` | `Record<string, Expression>` | — | Reactive params — changes trigger re-fetch |
| `target` | string | — | State path where response is written |
| `trigger` | `"auto"` \| `"manual"` | `"auto"` | `auto`: re-fetch on param change. `manual`: only via `refreshDataSource` |
| `debounce` | number | `0` | Debounce ms for auto-trigger |
| `initialFetch` | boolean | `true` | Fetch on spec mount |
| `emptyWhileLoading` | boolean | `false` | If true, clear target while loading |

## Auto-generated state paths

For a dataSource with `target: "/tasks"`:
- `/tasks` — response data
- `/tasksLoading` — boolean
- `/tasksError` — error or null
- `/{target}Deferred: true` — set when initial fetch is skipped because URL
  template deps are unresolved (Item E). Render "waiting for prerequisite"
  UI distinct from `/{target}Loading`.

## Param filtering

Values `null`, `undefined`, `""`, or `"all"` are omitted from the query
string (inactive filter).

## Constraints / Anti-patterns

- **URL templating requires `$template`.** Plain strings with `${...}`
  are LITERAL — validator catches this (see
- **Don't mix `fetch` and `dataSources` for same target.** See
  [[@antipattern-mix-fetch-and-datasources]] +
  [[@pattern-fetch-vs-datasources]].
- **Headers from state, not from spec.** API keys must NOT live in DB —
  inject via host-app `initialState` / `sharedState`.

## Force re-fetch

```json
{ "action": "refreshDataSource", "params": { "id": "tasks" } }
```

## Related concepts

- [[@action-fetch]] — non-reactive alternative
- [[@action-refresh-data-source]]
- [[@concept-data-sources-lifecycle]]
- [[@concept-derive-datasources-mount-order]]
- [[@concept-derive]]
- [[@path-data-source-paths]]
- [[@concept-template-interpolation]] — URL template gotcha

## Sources (raw)

- `docs/consumer/ai-context.md § DataSources`
- `docs/consumer/reference-doc.md § Data Sources (dataSources)`
- `docs/consumer/ai-context-runtime-semantics.md § 5.2`
