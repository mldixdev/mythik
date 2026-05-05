---
id: primitive-screen-outlet
title: `screen-outlet` — nested screen content slot
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#screen-outlet, docs/consumer/ai-context.md#appspec--navigation]
---

# `screen-outlet`

Pseudo-primitive that renders the active nested screen content inside an
AppSpec layout. Place it where the current screen should appear.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `style` | object | — | CSS styles |

## Examples

In an AppSpec layout (sidebar + outlet):
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

## Related concepts

- [[@concept-app-spec]]
- [[@concept-navigation]]
- [[@path-app-screens]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § screen-outlet`
- `docs/consumer/ai-context.md § AppSpec & Navigation`
