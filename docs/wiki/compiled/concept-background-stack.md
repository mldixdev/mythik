---
id: concept-background-stack
title: `BackgroundStack` — root mount
kind: concept
sources: [docs/consumer/reference-doc.md#rules-178-218-220]
---

# `BackgroundStack` — root mount

Component that consumes `LayerBackground` config OR a recipe-name string
and renders the layered background.

## Mounting

When `tokens.identity.background` is a `LayerBackground` (object with
`color` or `layers`), `MythikRenderer` wraps the rendered tree in a
positioned container with `<BackgroundStack>` as a sibling **inside a
stacking context** (`isolation: isolate`).

The isolation context prevents per-layer `zIndex` values (which
`resolveCommon` defaults to array-index, reaching 3+ on multi-layer
stacks) from leaking out to occlude the content wrapper.

## Palette threading

`BackgroundStack` accepts `palette?: { primary: string; accent: string }`
prop. Required for blob layers — without a palette, a dev-mode warning
fires per render.

`MythikRenderer` threads palette from `tokens.colors.{primary, accent}`;
missing/malformed colors fire a diagnostic dev-warn at the renderer seam.

## Per-platform implementation

- **Web** (`packages/react/src/background/`) — CSS for solid / gradient /
  image + inline SVG for pattern / grain.
- **RN** (`packages/react-native/src/background/`) — `react-native-svg`
  `SvgXml` for all layers + `View` for solid + `Image` for image.

## Test markers

Root wrappers carry `data-sv-renderer-root="v2"` (web) and
`testID="sv-renderer-root-v2"` (RN) markers.

## Related concepts

- [[@concept-layer-background]]
- [[@concept-background-layer-kinds]]
- [[@concept-blob-layer]]
- [[@concept-mythik-renderer]]
- [[@path-tokens]]

## Sources (raw)

- `docs/consumer/reference-doc.md § rules 178, 217-220`
