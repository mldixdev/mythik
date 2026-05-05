---
id: concept-navigation
title: Navigation config
kind: concept
sources: [docs/consumer/ai-context.md#appspec--navigation, docs/consumer/reference-doc.md#app-spec--screen-outlet]
---

# Navigation config

The `navigation` block in AppSpec defines navigation type, initial screen,
breadcrumb mode, sidebar menu order, and auth.

## Shape / Signature

```json
"navigation": {
  "type": "sidebar",
  "initialScreen": "dashboard",
  "breadcrumb": "history",
  "menu": ["dashboard", "reports", "settings"],
  "auth": { ... }
}
```

## Properties

| Property | Type | Required | Purpose |
|---|---|---|---|
| `type` | `"sidebar"` | yes | Navigation style |
| `initialScreen` | string | yes | Default screen on app load |
| `breadcrumb` | string | no | `"history"` (nav stack), `"hierarchy"` (parent chain), `"none"` |
| `menu` | string[] | no | Sidebar screen order. Omit to show all. Login always excluded |
| `auth` | object | no | Auth config (loginScreen, protectedScreens, roleAccess, etc.) |

## Breadcrumb modes

| Mode | Behavior |
|---|---|
| `"history"` | Follows navigation stack |
| `"hierarchy"` | Follows `parent` chain from current screen to root |
| `"none"` | No auto-computed breadcrumb |

## Sidebar nav

Built from `/app/screens` (auto-generated, filtered by role). Use a
`repeat` on `/app/screens` to render nav items — each has `id`, `label`,
`icon`.

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

## Related concepts

- [[@concept-app-spec]]
- [[@concept-screen-definition]]
- [[@concept-app-auto-state-paths]] — `/app/screens`, `/navigation/*`
- [[@concept-role-access]]
- [[@action-navigate]]
- [[@concept-auth-config]]
- [[@path-app-screens]]

## Sources (raw)

- `docs/consumer/ai-context.md § AppSpec & Navigation → Navigation Properties`
- `docs/consumer/reference-doc.md § App Spec & Screen Outlet`
