---
id: concept-screen-outlet
title: `screen-outlet` — nested screen content slot
kind: concept
sources: [docs/consumer/ai-context.md#appspec--navigation]
---

# `screen-outlet`

Pseudo-primitive that renders the active nested screen content inside an
AppSpec layout. The layout wraps every screen; place `screen-outlet` where
the screen content should appear.

## Example

```json
"layout": {
  "root": "shell",
  "elements": {
    "shell": { "type": "stack", "props": { "direction": "horizontal" }, "children": ["sidebar", "screen-outlet"] },
    "sidebar": { "type": "box", "children": ["nav"] },
    "screen-outlet": { "type": "screen-outlet", "style": { "flex": 1 } }
  }
}
```

When the user navigates to `dashboard`, the dashboard screen's `root` element
renders inside `screen-outlet`.

## Login screen — fullscreen rendering

Login renders fullscreen (no sidebar, no header). MythikApp automatically
renders the login screen WITHOUT the AppSpec layout when the user is not
authenticated. After login, the full layout appears reactively. No
`visible` conditions needed on the sidebar (rule 46).

## Related concepts

- [[@primitive-screen-outlet]]
- [[@concept-app-spec]]
- [[@concept-navigation]]
- [[@pattern-login-screen]]

## Sources (raw)

- `docs/consumer/ai-context.md § AppSpec & Navigation`
