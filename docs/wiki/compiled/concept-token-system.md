---
id: concept-token-system
title: Token system — three-layer resolution
kind: concept
sources: [docs/consumer/ai-context.md#deep-design-token-system, docs/consumer/reference-doc.md#deep-design-token-system]
---

# Token system — three-layer resolution

```
Layer 1: Framework DEFAULTS (always present — app looks good out of the box)
Layer 2: DNA derivation (OKLCH color science — 8 seeds generate full identity)
Layer 3: Manual overrides (explicit values always win)
```

## Three control levels

**Level 1 — Just a color**: `"dna": { "primary": "#0D9488" }` → full
coherent identity.

**Level 2 — Personality**: `"dna": { "primary": "#0D9488", "roundness": 0.7,
"motion": "fluid" }` → unique identity from 5 values.

**Level 3 — Override specific tokens**: DNA generates base, explicit values
win:
```json
{ "tokens": {
  "dna": { "primary": "#0D9488" },
  "colors": { "error": "#DC2626" },
  "shape": { "radius": { "md": 24 } }
}}
```

## Resolution order

For any token reference (`$token: "colors.primary"`):
1. Manual override in `tokens.colors.primary`?
2. DNA-derived value?
3. Framework default.

## Reactive runtime updates

`updateTokens` action hot-swaps tokens at runtime — see
[[@action-update-tokens]]. Persists raw input to `/tokens/raw` and resolved
output to `/tokens/resolved`.

## Related concepts

- [[@concept-dna-seeds]]
- [[@concept-token-categories]]
- [[@expression-token]]
- [[@concept-component-variants]]
- [[@concept-auto-dark-mode]]
- [[@action-update-tokens]]
- [[@path-tokens]]
- [[@concept-identity-overview]] — identity controls categorical dimensions

## Sources (raw)

- `docs/consumer/ai-context.md § Deep Design Token System`
- `docs/consumer/reference-doc.md § Deep Design Token System`
