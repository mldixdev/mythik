---
id: primitive-camera
title: `camera` — capture from camera
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#camera]
---

# `camera`

Camera capture (photo or video).

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | string | — | Button label |
| `accept` | string | — | `image/*` or `video/*` |
| `disabled` | boolean/expression | `false` | Disable |

## Events

`on.capture`.

## Examples

```json
{ "type": "camera", "props": { "accept": "image/*", "label": "Take photo" },
  "on": { "capture": { "action": "uploadFile", "params": { "bucket": "photos", "target": "/form/photoUrl" } } }
}
```

## Related concepts

- [[@action-upload-file]]
- [[@primitive-file-upload]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § camera`
