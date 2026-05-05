---
id: antipattern-mix-fetch-and-datasources
title: Anti-pattern — mixing `fetch` + `dataSources` for same target
kind: pattern
sources: [docs/consumer/ai-context-patterns.md#dont-mix-fetch-and-datasources-for-the-same-target]
---

# Anti-pattern — mixing `fetch` + `dataSources` for same target

`initialActions` `fetch` and `dataSources` write to **different
loading-state paths** (`/ui/loading` vs `/{target}Loading`). Using both
for the same data target creates conflicting state.

## Wrong

```json
{
  "initialActions": [{ "action": "fetch", "params": { "url": "/api/items", "target": "/items" } }],
  "dataSources": {
    "items": { "url": "/api/items", "target": "/items" }   // SAME target!
  }
}
```

Both populate `/items`; loading states use different paths; mutations
race.

## Right — pick one pattern per data source

For reactive lists (filters, search, pagination): use `dataSources`.

For one-shot CRUD (POST/PATCH/DELETE in transactions): use `fetch` action.

When you need both for the SAME data source — e.g. a reactive list AND
mutations — use `dataSources` for the GET and trigger a `refreshDataSource`
after the mutation succeeds. See [[@pattern-fetch-vs-datasources]].

## Related concepts

- [[@pattern-fetch-vs-datasources]]
- [[@action-fetch]]
- [[@concept-data-sources]]
- [[@concept-initial-actions]]
- [[@action-refresh-data-source]]

## Sources (raw)

- `docs/consumer/ai-context-patterns.md § Don't mix fetch and dataSources for the same target`
