---
id: concept-blob-motion
title: Blob motion — drift / rotate / scale
kind: concept
sources: [docs/consumer/reference-doc.md#rules-208-209]
---

# Blob motion — drift / rotate / scale

Each `BlobMotion` dimension becomes one `InlineAnimation` on the `ambient`
trigger.

## Dimension catalog

| Dim | Keyframes | Direction |
|---|---|---|
| `drift` | 3 (`0%` → origin, `50%` → (range.x, range.y), `100%` → origin) | translate |
| `rotate` | 2 (`from` → `to`) | rotate |
| `scale` | 2 (`from` → `to`) | scale |

All use `direction: 'alternate'` + `iterations: 'infinite'`. Emission
order: drift → rotate → scale.

## Single vs multi-dimension

- Single dimension → returns scalar `AnimationRef`.
- Multi-dimension → returns array — both valid per `AnimationRef |
  AnimationRef[]` union.

## Perceived cycle duration

- Drift = 1× `duration` (symmetric trajectory).
- Rotate / scale = 2× `duration` (forward + reverse iteration).

## Motion presets

| Preset | Effect |
|---|---|
| `drift-gentle` | 28s / small / ease-in-out |
| `drift-fluid` | 20s / wide / ease-in-out |
| `drift-snappy` | 14s / medium / linear |
| `static` | No motion |

## Runtime

`useShapeAnimations` (web: CSSOM keyframes singleton; RN: Reanimated
`useAnimatedProps` + `HARD_PER_TRIGGER` SV pool) drives them at render time.

## Related concepts

- [[@concept-blob-layer]]
- [[@concept-shape-animations]]
- [[@concept-animation-recipes]]
- [[@concept-keyframe-snapshot]]

## Sources (raw)

- `docs/consumer/reference-doc.md § rules 208-209`
