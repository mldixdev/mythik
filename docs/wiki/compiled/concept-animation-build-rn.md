---
id: concept-animation-build-rn
title: `buildReanimatedSpec` — RN output
kind: concept
sources: [docs/consumer/reference-doc.md#animation-system--infrastructure-plan-2-2026-04-18]
---

# `buildReanimatedSpec` — RN output

RN animation builder. Returns `{ animatedProps, inputRange, outputRanges,
animatedColorProps, timing }`. Emits **plain data** — no React, no
Reanimated imports. Runner wires shared values + `useAnimatedStyle` separately.

## Mechanism

- Nearest-neighbor fill for missing property values at keyframe stops.
- Numeric rotate / skew stored as `rotateDeg` / `skewXDeg` / `skewYDeg`
  for correct `interpolate()` input.
- Non-deg rotate strings (`0.25turn`, `3.14rad`) skipped on RN (web-only).
- **Percentage `borderRadius` throws on RN** (cannot animate natively).

## Hooks

- `useElementAnimations(animations, options)` returns `{ animatedStyle, triggerUnmount }`.
- `useShapeAnimations(animations, options)` for SVG-shape children.

Pure RN-style composition via `composeRNStyle` — scalars last-wins,
transforms merge-by-key (not concat).

## Web-only fields stripped

`boxShadow` and `filter` keyframe fields are omitted on RN (no 1:1
platform mapping yet — deferred to Plan 4 RN motion parity milestone).

## Related concepts

- [[@concept-animation-build-css]]
- [[@concept-keyframe-snapshot]]
- [[@concept-web-only-recipes]]
- [[@concept-shape-animations]]

## Sources (raw)

- `docs/consumer/reference-doc.md § rules 186, 192`
