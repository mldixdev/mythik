---
id: primitive-toast-container
title: `toast-container` — toast positioning override
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#toast-container, docs/consumer/reference-doc.md#toast-notifications]
---

# `toast-container`

Override default toast positioning/duration. **Optional** — toasts render
automatically without this element using top-right defaults.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `store` | string | — | State path for toast data |
| `position` | string | `"top-right"` | `top-right`/`top-left`/`top-center`/`bottom-right`/`bottom-left`/`bottom-center` |
| `duration` | number | `4000` | Default auto-dismiss time in ms |
| `maxVisible` | number | `5` | Max toasts shown at once |
| `offset` | number | `24` | Distance from viewport edge |
| `gap` | number | `8` | Space between toasts |

## Examples

```json
"notifications": {
  "type": "toast-container",
  "props": {
    "position": "bottom-center",
    "duration": 6000,
    "maxVisible": 3
  }
}
```

## Related concepts

- [[@action-show-notification]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § toast-container`
- `docs/consumer/reference-doc.md § Toast Notifications`
