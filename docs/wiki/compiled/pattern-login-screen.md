---
id: pattern-login-screen
title: Pattern — Login screen
kind: pattern
sources: [docs/consumer/ai-context.md#login-screen, docs/consumer/reference-doc.md#login-screen-example]
---

# Pattern — Login screen

Use **`/screens/login/...` paths** for form fields (NOT `/form/...`).
Combined with `statePolicy: "reset"` on the login screen, credentials
auto-clear on logout.

## Skeleton

```json
{
  "root": "login-page",
  "elements": {
    "login-page": { "type": "box", "style": { "display": "flex", "alignItems": "center", "justifyContent": "center", "minHeight": "100vh" }, "children": ["card"] },
    "card": { "type": "box", "props": { "surface": "card" }, "style": { "width": 400, "padding": 32, "borderRadius": 16 }, "children": ["email", "pass", "error", "btn"] },
    "email": { "type": "input", "props": { "placeholder": "Email", "value": { "$bindState": "/screens/login/email" } } },
    "pass": { "type": "input", "props": { "placeholder": "Password", "type": "password", "value": { "$bindState": "/screens/login/password" } } },
    "error": { "type": "text", "visible": { "$auth": "error" }, "props": { "content": { "$auth": "error" } }, "style": { "color": "#EF4444" } },
    "btn": {
      "type": "button",
      "props": {
        "label": { "$cond": { "$auth": "loading" }, "$then": "Signing in...", "$else": "Login" },
        "disabled": { "$auth": "loading" }
      },
      "on": { "press": { "action": "login", "params": {
        "email": { "$state": "/screens/login/email" },
        "password": { "$state": "/screens/login/password" }
      }}}
    }
  }
}
```

## AppSpec screen definition

```json
"login": { "label": "Login", "icon": "sign-in", "statePolicy": "reset" }
```

`statePolicy: "reset"` clears `/screens/login` on every navigation to the
login screen. Without it, credentials persist after logout.

## Why `/screens/login/*` not `/form/*`

Combined with `statePolicy: "reset"`, the AppEngine clears `/screens/login`
when navigating to the login screen with reset policy. Root-level paths
like `/form/email` would persist across logouts (rule 30).

## Login renders fullscreen

`MythikApp` automatically renders the login screen WITHOUT the AppSpec
layout (no sidebar, no header) when the user is not authenticated. After
login, the full layout appears reactively. No `visible` conditions needed
on the sidebar (rule 46).

## Submit on Enter

Add `on.submit` to a password input:
```json
{ "type": "input", "props": { "type": "password", ... },
  "on": { "submit": { "action": "login", "params": { ... } } }
}
```

## Related concepts

- [[@action-login]]
- [[@expression-auth]]
- [[@concept-state-policies]]
- [[@concept-screen-outlet]]
- [[@pattern-login-body-template]]
- [[@path-login]]

## Sources (raw)

- `docs/consumer/ai-context.md § AppSpec & Navigation → Login Screen`
- `docs/consumer/reference-doc.md § Login Screen Example`
