---
id: concept-keyframe-snapshot
title: `KeyframeSnapshot` schema
kind: concept
sources: [docs/consumer/reference-doc.md#animation-system--infrastructure-plan-2-2026-04-18]
---

# `KeyframeSnapshot` schema

Inline animations are arrays of `KeyframeSnapshot`.

## Shape / Signature

```ts
{
  at: string,                    // percent format '0%' to '100%'
  opacity?: number,
  transform?: TransformValue,    // translateX/Y, scale (number or {x,y}), rotate, skewX/Y
  backgroundColor?: string,
  borderColor?: string,
  borderRadius?: string,
  borderWidth?: number,
  color?: string,
  filter?: FilterValue,
  boxShadow?: string             // web-only — RN omitted (filter same policy)
}
```

## Constraints

- `at` must be percent format `'0%'` to `'100%'` (out-of-range throws).
- Keyframes must be **monotonically non-decreasing** by `at`.
- A ref containing both `recipe` AND `keyframes` throws as malformed.

## Example — `glow` recipe (boxShadow keyframe)

The `glow` recipe uses `boxShadow: 'none'` → `'0 0 20px 4px rgba(99,102,241,0.45)'` for a colored shadow halo (canonical glow per Linear/Stripe).

## Web vs RN

- **Web** — `buildCSSKeyframes(spec)` returns `{ name, keyframesText, animationCSS }`. `name` is `svka-${djb2(fingerprint)}` — deterministic hash for dedup.
- **RN** — `buildReanimatedSpec(spec)` returns plain data; runner wires shared values + `useAnimatedStyle`. Numeric rotate/skew stored as `rotateDeg`/`skewXDeg`/`skewYDeg`. **Percentage `borderRadius` throws on RN** (cannot animate natively). **`boxShadow` and `filter` omitted on RN.**

## Related concepts

- [[@concept-animation-build-css]]
- [[@concept-animation-build-rn]]
- [[@concept-web-only-recipes]]

## Sources (raw)

- `docs/consumer/reference-doc.md § rules 182, 185, 186, 197`
