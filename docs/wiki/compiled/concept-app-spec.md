---
id: concept-app-spec
title: AppSpec — multi-screen app
kind: concept
sources: [docs/consumer/ai-context.md#appspec--navigation, docs/consumer/reference-doc.md#app-spec--screen-outlet]
---

# AppSpec — multi-screen app

Top-level document with `type: "app"`. Defines navigation, screens, shared
state, tokens, templates, and the layout that wraps every screen via
`screen-outlet`. **100% opt-in** — without AppSpec, screen specs work
standalone.

## Shape / Signature

```json
{
  "type": "app",
  "name": "my-app",
  "navigation": {
    "type": "sidebar",
    "initialScreen": "dashboard",
    "menu": ["dashboard", "reports", "settings"],
    "auth": { ... }
  },
  "screens": {
    "dashboard": { "label": "Dashboard", "icon": "chart-bar", "statePolicy": "preserve" },
    "new-item": { "label": "New", "icon": "plus", "statePolicy": "reset", "parent": "dashboard" }
  },
  "tokens": { "dna": { "primary": "#0D9488" } },
  "sharedState": { "preferences": { "theme": "light" } },
  "templates": { ... },
  "translations": { "en": { ... }, "es": { ... } },
  "layout": {
    "root": "shell",
    "elements": {
      "shell": { "type": "stack", "props": { "direction": "horizontal" }, "children": ["sidebar", "screen-outlet"] },
      "sidebar": { "type": "box", "children": ["nav"] },
      "screen-outlet": { "type": "screen-outlet", "style": { "flex": 1 } }
    }
  }
}
```

## Top-level properties

| Property | Type | Required | Purpose |
|---|---|---|---|
| `type` | `"app"` | yes | Identifies as AppSpec |
| `name` | string | no | App display name |
| `navigation` | object | yes | Navigation config |
| `screens` | object | yes | `{ id: { label, icon, statePolicy, parent?, roles? } }` |
| `tokens` | object | no | Design tokens |
| `sharedState` | object | no | Initial shared state |
| `templates` | object | no | Shared templates |
| `translations` | object | no | i18n translations |
| `layout` | object | yes | `{ root, elements }` — sidebar + screen-outlet |

## Inheritance

Screens inherit from AppSpec:
- **Tokens**: deep merge (screen overrides app)
- **Translations**: merged (screen extends app)
- **Templates**: screen overrides app with same name

## Constraints / Anti-patterns

- **AppSpec patches use `/layout/elements/`**, not `/elements/`. See
  [[@cli-app-spec]].
- **AppSpec is filtered without Bearer token** — `GET /api/app/:id` strips
  `roleAccess` and `protectedScreens` when no valid Bearer is present
  (rule 63). Prevents disclosure of authorization model.

## Related concepts

- [[@concept-navigation]]
- [[@concept-screen-definition]]
- [[@concept-state-policies]]
- [[@concept-role-access]]
- [[@primitive-screen-outlet]]
- [[@concept-auth-config]]
- [[@cli-app-spec]]
- [[@concept-spec-types]]

## Sources (raw)

- `docs/consumer/ai-context.md § AppSpec & Navigation`
- `docs/consumer/reference-doc.md § App Spec & Screen Outlet`
