---
id: primitive-audio-player
title: `audio-player`
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#audio-player]
---

# `audio-player`

Audio player.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `src` | string/expression | — | Audio URL |
| `label` | string | — | Player label |

## Examples

```json
{ "type": "audio-player", "props": { "src": { "$state": "/recording/url" }, "label": "Voice memo" } }
```

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § audio-player`
