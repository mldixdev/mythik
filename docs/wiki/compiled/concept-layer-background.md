---
id: concept-layer-background
title: `tokens.identity.background` — LayerBackground v2
kind: concept
sources: [docs/consumer/ai-context.md#identity-system-forge, docs/consumer/reference-doc.md#rules-147-152-220]
---

# `tokens.identity.background` — LayerBackground v2

App-level background. The legacy `BackgroundConfig` (`{ style: 'solid' |
'gradient' | 'mesh' | 'blobs' }`) was not part of the current public contract — current shape is
`LayerBackground` with `color?` + ordered `layers[]`.

## Shape / Signature

```json
"tokens": {
  "identity": {
    "background": {
      "color": "#0a0a0a",
      "layers": [
        { "type": "gradient", "kind": "radial", "stops": [...] },
        { "type": "grain", "intensity": 0.04 }
      ]
    }
  }
}
```

## Layer kinds

`'solid'`, `'gradient'`, `'pattern'`, `'grain'`, `'image'`, `'blobs'` —
each carries `LayerCommonProps` (`opacity?`, `blendMode?`, `zIndex?`).

See [[@concept-background-layer-kinds]].

## Recipes

8 curated recipes shipped in `tokens.backgrounds.*`:
`linear-aura` (Linear-like), `stripe-ribbons` (Stripe-like),
`vercel-center`, `arc-organic`, `grid-subtle`, `notion-warm`,
`raycast-mono`, `comic-pop`.

Use a recipe by name string instead of declaring layers — see
[[@concept-background-recipes]].

## Mounting

`<BackgroundStack>` mounts at the root of `MythikRenderer` when
`tokens.identity.background` is a `LayerBackground`. `isLayerBackground`
returns true for objects carrying `color` or `layers` (rejects empty `{}`,
arrays, and objects with a `style` field — defense against legacy
holdovers).

`/tokens/resolved` is the source — preset swaps + playground updates
trigger re-resolution and remount.

## Constraints / Anti-patterns

- **`$token: "backgroundCSS"` removed.** See
  [[@antipattern-background-css-token]].
- **Box `backgroundBlobs` prop removed.** App-level background lives
  exclusively at `tokens.identity.background`. See
  [[@antipattern-background-blobs-prop]].

## Related concepts

- [[@concept-background-stack]]
- [[@concept-background-layer-kinds]]
- [[@concept-blob-layer]]
- [[@concept-background-recipes]]
- [[@concept-pattern-primitives]]
- [[@concept-background-caps]]
- [[@concept-identity-overview]]
- [[@path-tokens]]

## Sources (raw)

- `docs/consumer/ai-context.md § Identity System (Forge)`
- `docs/consumer/reference-doc.md § rules 147, 152, 220, 222`
