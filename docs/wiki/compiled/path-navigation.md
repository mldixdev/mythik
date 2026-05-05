---
id: path-navigation
title: `/navigation/*` — navigation state
kind: concept
sources: [docs/consumer/ai-context.md#auto-generated-state]
---

# `/navigation/*`

Navigation state auto-managed by AppEngine.

## Paths

| Path | Type | Content |
|---|---|---|
| `/navigation/currentScreen` | string | Active screen ID |
| `/navigation/history` | string[] | Visited screen IDs (in order) |
| `/navigation/breadcrumb` | array | Enriched array with `label`, `icon` per entry |
| `/navigation/params` | object | Extra params from `navigateScreen` (reset on each navigation) |

## Breadcrumb modes

The shape of `/navigation/breadcrumb` depends on `navigation.breadcrumb`:

| Mode | Behavior |
|---|---|
| `"history"` | Follows nav stack |
| `"hierarchy"` | Follows `parent` chain |
| `"none"` | Empty / not computed |

## Read patterns

Active screen:
```json
{ "$state": "/navigation/currentScreen" }
```

Render breadcrumb:
```json
{ "type": "stack", "repeat": { "statePath": "/navigation/breadcrumb", "key": "id" }, "children": ["crumb"] }
```

Read navigation params on target screen:
```json
{ "$state": "/navigation/params/employeeId" }
```

## `/navigation/params` is reset on each navigation

For data that persists across back-navigation, use `/ui/selected*` (e.g.,
`/ui/selectedRow`) instead.

## Related concepts

- [[@concept-navigation]]
- [[@action-navigate]]
- [[@concept-app-auto-state-paths]]
- [[@pattern-cross-screen-data-flow]]

## Sources (raw)

- `docs/consumer/ai-context.md § Auto-Generated State`
