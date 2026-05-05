---
id: antipattern-background-css-token
title: Anti-pattern — `$token: "backgroundCSS"`
kind: pattern
sources: [docs/consumer/ai-context.md#rule-57, docs/consumer/reference-doc.md#rule-155]
---

# Anti-pattern — `$token: "backgroundCSS"`

`$token: "backgroundCSS"` was REMOVED in the current LayerBackground contract. The field was
deleted from `injectColorTokens` and no longer resolves.

## Wrong

```json
"style": { "background": { "$token": "backgroundCSS" } }
```

Returns `undefined` at render → element has no background.

## Right — use `tokens.identity.background` (LayerBackground)

```json
"tokens": {
  "identity": {
    "background": {
      "color": "#0a0a0a",
      "layers": [...]
    }
  }
}
```

`MythikRenderer` mounts a root `<BackgroundStack>` that reads from
`/tokens/resolved` and re-renders on preset switches. See
[[@concept-layer-background]].

## Why removed

For preset-aware app backgrounds, presets update
`tokens.identity.background` directly so the root `<BackgroundStack>`
re-resolves on preset switch — no token alias indirection needed.

## Related concepts

- [[@concept-layer-background]]
- [[@concept-background-stack]]
- [[@antipattern-background-blobs-prop]]

## Sources (raw)

- `docs/consumer/ai-context.md § rule 57`
- `docs/consumer/reference-doc.md § rule 155, 222`
