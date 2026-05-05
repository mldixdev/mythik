---
id: action-update-tokens
title: `updateTokens` — runtime token update
kind: action
sources: [docs/consumer/ai-context.md#identity-system-forge, docs/consumer/reference-doc.md#runtime-token-update]
---

# `updateTokens` — runtime token update

Hot-swaps design tokens at runtime without a page reload. All primitives
re-render with the new tokens. **Deep-merges by default**; pass
`_replace: true` to fully replace accumulated state.

## Shape / Signature

```json
{ "action": "updateTokens", "params": {
  "dna"?: { ... },
  "identity"?: { ... },
  "_replace"?: true
}}
```

## Examples

Live playground slider — partial update:
```json
{ "action": "updateTokens", "params": { "dna": { "roundness": 50 } } }
```

Full reset (preset apply):
```json
{ "action": "updateTokens", "params": {
  "_replace": true,
  "dna": { "primary": "#0D9488" },
  "identity": { "surface": "outlined" }
}}
```

## Behavior

- Without `_replace`, `updateTokens({ dna: { roundness: 50 } })` merges
  with previously-applied tokens — previous primary, surface, etc. persist.
- With `_replace: true`, fully replaces (used internally by `applyPreset`
  to prevent stale flag values from carrying between presets — see
  [[@action-apply-preset]]).
- After every call, the framework persists `currentRawTokens` to
  `/tokens/raw` and `resolvedTokens` to `/tokens/resolved`.
- **Numeric DNA seeds > 1 are auto-normalized (÷100)** for slider
  0-100 compatibility.

## Related concepts

- [[@concept-token-system]] — three-layer resolution
- [[@concept-dna-seeds]]
- [[@concept-identity-overview]]
- [[@action-apply-preset]] — uses `_replace` internally
- [[@path-tokens]] — `/tokens/raw` and `/tokens/resolved`

## Sources (raw)

- `docs/consumer/ai-context.md § Identity System (Forge) → Runtime identity changes`
- `docs/consumer/reference-doc.md § Runtime Token Update` + rule 126, 157, 158
