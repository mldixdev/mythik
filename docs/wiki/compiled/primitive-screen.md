---
id: primitive-screen
title: `screen` — top-level screen wrapper
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#screen]
---

# `screen`

Top-level screen wrapper in AppSpec apps. RN-specific — provides the screen
chrome (title bar, navigation integration).

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | string | — | Screen title |

## Examples

```json
{ "type": "screen", "props": { "title": "Dashboard" }, "children": [...] }
```

Used as a platform-specific root:
```json
{
  "root": { "$platform": { "web": "layout-web", "native": "layout-native" } },
  "elements": {
    "layout-native": { "type": "screen", "props": { "title": "Dashboard" }, "children": [...] }
  }
}
```

## Related concepts

- [[@expression-platform]]
- [[@primitive-screen-outlet]]
- [[@concept-app-spec]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § screen`
