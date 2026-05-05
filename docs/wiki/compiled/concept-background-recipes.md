---
id: concept-background-recipes
title: 8 curated background recipes
kind: concept
sources: [docs/consumer/reference-doc.md#rule-173]
---

# 8 curated background recipes

Shipped in `tokens.backgrounds.*`. Use by recipe-name string OR expand
and modify for custom variants.

## Catalog

| Recipe | Inspiration |
|---|---|
| `linear-aura` | Linear |
| `stripe-ribbons` | Stripe |
| `vercel-center` | Vercel |
| `arc-organic` | Arc browser |
| `grid-subtle` | Subtle grid (technical) |
| `notion-warm` | Notion |
| `raycast-mono` | Raycast |
| `comic-pop` | Pop-art / comic |

Exported as `BACKGROUND_RECIPES` constant.

## Use

Recipe name as background:
```json
"tokens": { "identity": { "background": "linear-aura" } }
```

Or expand a recipe and tweak:
```json
"tokens": { "identity": {
  "background": {
    "color": "#0a0a0a",
    "layers": [...]
  }
}}
```

## Related concepts

- [[@concept-layer-background]]
- [[@concept-background-layer-kinds]]
- [[@concept-presets]] — preset-level snapshots

## Sources (raw)

- `docs/consumer/reference-doc.md § rule 173`
