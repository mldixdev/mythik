---
id: antipattern-background-blobs-prop
title: Anti-pattern — `Box.backgroundBlobs` prop
kind: pattern
sources: [docs/consumer/ai-context.md#rule-56, docs/consumer/reference-doc.md#rules-154-222]
---

# Anti-pattern — `Box.backgroundBlobs` prop

The `Box` `backgroundBlobs` prop was **REMOVED** in the current LayerBackground contract along
with legacy per-element blob rendering. Setting it has no effect.

## Wrong

```json
{ "type": "box", "props": { "backgroundBlobs": true } }
```

Silently ignored.

## Right — use `tokens.identity.background`

App-level background lives exclusively at `tokens.identity.background`
(see [[@concept-layer-background]]) and mounts at `MythikRenderer` via
`<BackgroundStack>`.

```json
"tokens": {
  "identity": {
    "background": {
      "color": "#0a0a0a",
      "layers": [
        {
          "type": "blobs",
          "preset": "organic-duo",
          "palette": ["primary", "accent"],
          "motion": "drift-gentle"
        }
      ]
    }
  }
}
```

## Why removed

Box is now a pure surface-styled wrapper. Removed the
`dangerouslySetInnerHTML` keyframe-injection path (previously at
`box.tsx:127`) — zero `dangerouslySetInnerHTML` in
`packages/react/src/primitives/*` (rule 154).

## Related concepts

- [[@concept-layer-background]]
- [[@concept-blob-layer]]
- [[@primitive-box]]
- [[@antipattern-background-css-token]]

## Sources (raw)

- `docs/consumer/ai-context.md § rule 56`
- `docs/consumer/reference-doc.md § rules 154, 222`
