---
id: action-refresh-data-source
title: `refreshDataSource` — force re-fetch
kind: action
sources: [docs/consumer/ai-context.md#datasources, docs/consumer/ai-context-runtime-semantics.md#52-datasources-lifecycle]
---

# `refreshDataSource` — force re-fetch

Forces a registered dataSource to re-fetch immediately, bypassing the auto
trigger. Auto-registered for any spec with `dataSources` (you don't declare
it).

## Shape / Signature

```json
{ "action": "refreshDataSource", "params": { "id": "<dataSource-id>" } }
```

## Examples

Refresh after creating an item (in a transaction `onSuccess`):
```json
"onSuccess": [{ "action": "refreshDataSource", "params": { "id": "tasks" } }]
```

Manual refresh button:
```json
{ "type": "button",
  "props": { "label": "Refresh" },
  "on": { "press": { "action": "refreshDataSource", "params": { "id": "tasks" } } }
}
```

## Behavior

- Bypasses the dataSource's auto trigger.
- Works for both `trigger: "auto"` and `trigger: "manual"` dataSources.
- DataSourcesEngine's `refresh()` early-returns if the engine has been
  unmounted (re-mount-safe).

## Related concepts

- [[@concept-data-sources]]
- [[@concept-data-sources-lifecycle]]
- [[@concept-transactions]] — typical usage in onSuccess

## Sources (raw)

- `docs/consumer/ai-context.md § DataSources`
- `docs/consumer/ai-context-runtime-semantics.md § 5.2`
