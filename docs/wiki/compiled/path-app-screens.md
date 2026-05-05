---
id: path-app-screens
title: `/app/screens` — accessible screens
kind: concept
sources: [docs/consumer/ai-context.md#auto-generated-state]
---

# `/app/screens`

Auto-generated array of accessible screen definitions, **filtered by
role**, with the loginScreen excluded. Source for the sidebar menu.

## Shape

```json
[
  { "id": "dashboard", "label": "Dashboard", "icon": "chart-bar" },
  { "id": "reports",   "label": "Reports",   "icon": "file-text" }
]
```

## Sidebar nav pattern

```json
"nav-menu": {
  "type": "stack",
  "repeat": { "statePath": "/app/screens", "key": "id" },
  "children": ["nav-item"]
},
"nav-item": {
  "type": "touchable",
  "on": { "press": { "action": "navigateScreen", "params": { "screen": { "$item": "id" } } } },
  "children": ["nav-icon", "nav-label"]
}
```

## Auto-refresh on auth changes

`MythikApp` subscribes to `/auth/user/*` and `/auth/isAuthenticated` and
re-computes `/app/screens` automatically. No manual call needed after
login, logout, session restore, cross-tab sync, or role changes.

If building a custom host app without `MythikApp`, call
`appEngine.refreshScreenList()` after auth state changes.

## Related concepts

- [[@concept-navigation]]
- [[@concept-role-access]]
- [[@concept-app-auto-state-paths]]
- [[@expression-auth]]

## Sources (raw)

- `docs/consumer/ai-context.md § Auto-Generated State`
