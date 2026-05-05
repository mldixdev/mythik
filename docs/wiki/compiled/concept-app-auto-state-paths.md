---
id: concept-app-auto-state-paths
title: AppSpec auto-state paths
kind: concept
sources: [docs/consumer/ai-context.md#auto-generated-state, docs/consumer/reference-doc.md#auto-generated-state]
---

# AppSpec auto-state paths

Paths the framework writes when AppSpec is mounted.

## Paths

| Path | Content |
|---|---|
| `/navigation/currentScreen` | Active screen ID |
| `/navigation/history` | Visited screen IDs (array) |
| `/navigation/breadcrumb` | Enriched array with `label`, `icon` |
| `/navigation/params` | Extra params passed to `navigateScreen` (reset on each navigation) |
| `/app/screens` | Accessible screens (filtered by role; loginScreen excluded) |
| `/auth/isAuthenticated` | (auth) |
| `/auth/user/*` | (auth — see [[@concept-auth-state-paths]]) |

## Sidebar auto-refresh

`MythikApp` automatically re-computes `/app/screens` when auth state
changes (`/auth/user/*` or `/auth/isAuthenticated`). No manual call needed
— login, logout, session restore, cross-tab sync, and role changes all
trigger sidebar refresh.

## Use patterns

Read current screen:
```json
{ "$state": "/navigation/currentScreen" }
```

Render sidebar items via repeat:
```json
{ "type": "stack", "repeat": { "statePath": "/app/screens", "key": "id" }, "children": [...] }
```

Read navigation params on target screen:
```json
{ "$state": "/navigation/params/employeeId" }
```

## Related concepts

- [[@concept-navigation]]
- [[@concept-app-spec]]
- [[@path-navigation]]
- [[@path-app-screens]]
- [[@action-navigate]]

## Sources (raw)

- `docs/consumer/ai-context.md § AppSpec & Navigation → Auto-Generated State`
- `docs/consumer/reference-doc.md § Auto-Generated State`
