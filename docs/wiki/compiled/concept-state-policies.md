---
id: concept-state-policies
title: State policies — preserve / reset / reload
kind: concept
sources: [docs/consumer/ai-context.md#state-policies, docs/consumer/reference-doc.md#state-policies]
---

# State policies

Per-screen state behavior on navigation. Set via `screens.<id>.statePolicy`.

| Policy | On leave | On return | Use for |
|---|---|---|---|
| `preserve` | Keep state | Restore | Lists, dashboards |
| `reset` | Clear | Fresh `initialState` | Create forms |
| `reload` | Clear | Re-execute `initialActions` | Always-fresh data |

## Examples

Login screen with `reset` (credentials clear on every visit):
```json
"login": { "label": "Login", "icon": "sign-in", "statePolicy": "reset" }
```

Dashboard preserved across navigation:
```json
"dashboard": { "label": "Dashboard", "icon": "chart-bar", "statePolicy": "preserve" }
```

Admin report — always fresh:
```json
"report": { "label": "Daily Report", "icon": "file-text", "statePolicy": "reload" }
```

## Related concepts

- [[@concept-screen-definition]]
- [[@pattern-login-screen]] — typical use of `reset`
- [[@concept-initial-actions]]

## Sources (raw)

- `docs/consumer/ai-context.md § AppSpec & Navigation → State Policies`
- `docs/consumer/reference-doc.md § State Policies`
