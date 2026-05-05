---
id: concept-identity-helpers
title: Identity helpers — resolve API
kind: concept
sources: [docs/consumer/ai-context.md#identity-system-forge, docs/consumer/reference-doc.md#rules-114-129]
---

# Identity helpers — resolve API

Functions that compose the identity system into platform-neutral
structured data. Useful for custom renderers / consumers.

## `resolveIdentity<T>(input, serializer)` — unified orchestrator

Single function that orchestrates: `resolveSchemeColors → generateTonalStep
→ resolveSurfaceStyles → serializer(T) → resolveColorWeight →
resolveRadiusPattern`. Accepts a `SurfaceSerializer<T>` — each platform
passes its own (`surfaceToCSS`, `surfaceToRN`).

Returns `{ schemeColors, surface: T, colorWeight, radius }`.

## `resolveSurfaceStyles()`

Returns `StructuredSurfaceStyles` with 6 component categories: `card`,
`input`, `inputFocus`, `buttonPrimary`, `buttonSecondary`, `modal`. Each
is a `StructuredSurfaceStyleProps` with `backgroundColor?`, `color?`,
`border?: BorderDef`, `borderTop/Right/Bottom/Left?: BorderDef`, `shadows:
ShadowDef[]`, `blur?: BlurDef`, `backgroundOpacity?`. **NO CSS strings —
data only.**

## Platform serializers

- **`surfaceToCSS()`** — for web (React/Vue/Angular/Svelte).
- **`surfaceToRN()`** — for React Native. `toViewStyle()` helper strips
  `blur` and `focusRing` from surface props before spreading into RN
  style objects.

## Depth + angle are serializer concerns

`identity.depth` (0-1) and `identity.shadowAngle` (0-360°) are NOT in
`StructuredSurfaceStyleProps`. Shadows store raw `magnitude`/`blur`/`opacity`.
The serializer applies `depthScale()` and sin/cos angle rotation when
converting to platform-specific format.

## Module structure

`packages/core/src/design/identity/` with 8 focused modules:
`types.ts`, `surface.ts`, `shape.ts`, `elevation.ts`, `typography.ts`,
`color.ts`, `background.ts`, `motion.ts`. Barrel `index.ts` re-exports all
public API.

## Related concepts

- [[@concept-identity-overview]]
- [[@concept-identity-surface]]
- [[@concept-where-to-look]] — for custom serializer development

## Sources (raw)

- `docs/consumer/ai-context.md § Identity System (Forge) → Architecture`
- `docs/consumer/reference-doc.md § rules 114, 128, 129, 160`
