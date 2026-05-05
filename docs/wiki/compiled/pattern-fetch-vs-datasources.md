---
id: pattern-fetch-vs-datasources
title: Pattern — `fetch` vs `dataSources` decision
kind: pattern
sources: [docs/consumer/ai-context.md#when-to-use-fetch-vs-datasources, docs/consumer/reference-doc.md]
---

# Pattern — `fetch` vs `dataSources` decision

Both load data into state. Pick **one pattern per data target**.

## Comparison

| | `initialActions + fetch` | `dataSources` |
|---|---|---|
| **Purpose** | One-shot load on mount, CRUD in transactions | Reactive data that re-fetches when params change |
| **Loading state** | `/ui/loading` (boolean) | `/{target}Loading` (boolean) — auto-generated |
| **Error state** | `/ui/lastError` (object) | `/{target}Error` (object) — auto-generated |
| **Re-fetch** | Manual (call fetch again) | Automatic on param change, or `refreshDataSource` |
| **Use for** | Static initial data, POST/PUT/DELETE | Lists with filters, search, pagination |

## Rule

**Don't mix both for the same data target.** They write to different
loading-state paths — using both creates conflicting state. See
[[@antipattern-mix-fetch-and-datasources]].

## Examples — same screen with both, correctly separated

`dataSources` for the reactive list, `fetch` (in transactions) for
mutations:

```json
{
  "dataSources": {
    "items": { "url": "/api/items", "params": { "status": { "$state": "/filter" } }, "target": "/items" }
  },
  "elements": {
    "create-btn": {
      "type": "button",
      "on": { "press": { "transaction": {
        "before": [{ "action": "closeModal", "params": { "id": "create-modal" } }],
        "optimistic": [{ "action": "setState", "params": { "statePath": "/items", "value": { "$array": "append", ... } } }],
        "confirm": [{ "action": "fetch", "params": { "url": "/api/items", "method": "POST", "body": {...}, "target": "/tx/result" } }],
        "onSuccess": [{ "action": "refreshDataSource", "params": { "id": "items" } }]
      }}}
    }
  }
}
```

## Related concepts

- [[@action-fetch]]
- [[@concept-data-sources]]
- [[@concept-initial-actions]]
- [[@antipattern-mix-fetch-and-datasources]]
- [[@pattern-loading-content-empty]]
- [[@concept-transactions]]

## Sources (raw)

- `docs/consumer/ai-context.md § When to Use fetch vs dataSources`
