---
id: concept-screen-definition
title: ScreenDefinition — per-screen metadata
kind: concept
sources: [docs/consumer/ai-context.md#appspec--navigation, docs/consumer/reference-doc.md#screen-definition]
---

# ScreenDefinition

Per-screen metadata in AppSpec's `screens` map.

## Shape / Signature

```json
"screens": {
  "task-manager": {
    "label": "Task Manager",
    "icon": "clipboard-text",
    "roles": ["admin", "user"],
    "statePolicy": "preserve"
  },
  "new-task": {
    "label": "New Task",
    "icon": "plus",
    "roles": ["admin", "user"],
    "statePolicy": "reset",
    "parent": "task-manager"
  }
}
```

## Properties

| Property | Type | Default | Description |
|---|---|---|---|
| `label` | string or Expression | — | Display name (sidebar, breadcrumb) |
| `icon` | string | — | Icon name (kebab-case) |
| `roles` | `string[]` | `["*"]` | Which roles can access (only when `roleAccess` is NOT defined — see [[@concept-role-access]]) |
| `statePolicy` | `"preserve"` \| `"reset"` \| `"reload"` | `"preserve"` | State behavior on navigation |
| `parent` | string | — | Parent screen ID (for hierarchy breadcrumb) |

## Related concepts

- [[@concept-state-policies]] — preserve / reset / reload behavior
- [[@concept-role-access]]
- [[@concept-navigation]]

## Sources (raw)

- `docs/consumer/ai-context.md § AppSpec & Navigation`
- `docs/consumer/reference-doc.md § Screen Definition`
