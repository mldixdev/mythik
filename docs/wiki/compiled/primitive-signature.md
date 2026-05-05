---
id: primitive-signature
title: `signature` — signature pad
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#signature]
---

# `signature`

Canvas signature capture.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `width` | number | — | Canvas width |
| `height` | number | — | Canvas height |
| `lineColor` | string | — | Pen color |
| `lineWidth` | number | — | Pen width |
| `label` | string | — | Label text |

## Events

`on.sign`.

## Examples

```json
{ "type": "signature", "props": { "width": 400, "height": 200, "lineColor": "#0F172A", "lineWidth": 2 },
  "on": { "sign": { "action": "setState", "params": { "statePath": "/form/signature", "value": { "$state": "/ui/lastSignature" } } } }
}
```

## Related concepts

- [[@action-set-state]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § signature`
