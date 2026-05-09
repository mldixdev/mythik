---
id: concept-shape-animations
title: `useShapeAnimations` — Layer 3 SVG animations
kind: concept
sources: [docs/consumer/reference-doc.md#layer-3-custom-elements-plan-custom-element-cascade]
---

# `useShapeAnimations` — Layer 3 SVG animations

React hook for SVG-child animations (`<path>` / `<circle>` / `<rect>` /
`<g>`). Consumes the same `ElementAnimations` contract as
`useElementAnimations` but **narrowed to `ambient` trigger ONLY**.

## Web variant

`packages/react/src/animation/useShapeAnimations.ts` — exported from
`mythik-react`.

```ts
useShapeAnimations(ref, animations, options)
```

- Attaches CSS animations via `el.style.animation` (surgical, preserves
  other inline styles).
- Keyframes registered once via `registerKeyframes` singleton (CSSOM,
  zero `dangerouslySetInnerHTML`) — deduped by hash so multiple shape
  instances with the same recipe share one CSS rule.
- Dev-mode warns when non-ambient triggers are passed.

## RN variant

`packages/react-native/src/animation/useShapeAnimations.ts` — repository
preview implementation. It is not part of the supported npm publish surface yet.

```ts
useShapeAnimations(animations, options) → { animatedProps }
```

- Spread `animatedProps` onto `Animated.createAnimatedComponent(Path)`
  from react-native-svg.
- Uses `HARD_PER_TRIGGER` (=6) fixed-pool `useSharedValue` pattern for
  stable hook count.
- Reuses `composeRNStyle` shared with `useElementAnimations`.

## Why ambient-only

Shape children have no hover/focus/active contract and no distinct mount
ceremony in the current animation contract. Triggers other than `ambient` are silently
ignored in prod (dev-warn).

## Use case — blob layer

`BlobLayer` (web + RN) consumes `useShapeAnimations` to drive blob motion
(drift / rotate / scale).

## Related concepts

- [[@concept-animations-engine]]
- [[@concept-animation-build-css]]
- [[@concept-animation-build-rn]]
- [[@concept-blob-layer]]
- [[@concept-blob-motion]]

## Sources (raw)

- `docs/consumer/reference-doc.md § rules 211-213`
