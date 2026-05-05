---
id: path-tokens
title: `/tokens/raw` and `/tokens/resolved`
kind: concept
sources: [docs/consumer/reference-doc.md#rules-158-224]
---

# `/tokens/raw` and `/tokens/resolved`

Two state paths that hold token state. Useful for export, debugging,
preset re-resolution.

## Paths

| Path | Content |
|---|---|
| `/tokens/raw` | Accumulated raw input from `updateTokens` (pre-normalization). Useful for exporting current DNA+Identity config |
| `/tokens/resolved` | Fully-resolved token tree (DNA-derived colors, DEFAULT-merged identity, everything downstream consumers need) |

## When written

- `/tokens/raw` — after every `updateTokens` call (rule 158).
- `/tokens/resolved` — at `createMythik` initialization AND after every
  `updateTokens` call (rule 224).

## Why both

`MythikRenderer`'s v2 `LayerBackground` root mount reads from
`/tokens/resolved` so preset swaps + playground control changes (dropdown
writes via `$bindState` + onChange `updateTokens`) trigger fresh reads
and remount the `BackgroundStack` with the new layers. Avoids the trap
where reading static `spec.tokens` froze the renderer at initial values
(rule 224).

## Read patterns

Export current tokens:
```json
{ "action": "copyToClipboard", "params": { "value": { "$state": "/tokens/raw" } } }
```

Read resolved value (rare in specs — `$token` typically suffices):
```json
{ "$state": "/tokens/resolved/colors/primary" }
```

## Related concepts

- [[@action-update-tokens]]
- [[@concept-token-system]]
- [[@concept-mythik-renderer]]
- [[@concept-layer-background]]

## Sources (raw)

- `docs/consumer/reference-doc.md § rules 158, 224`
