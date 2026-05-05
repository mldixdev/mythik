// Pure composer for RN animated styles — no React, no Reanimated imports.
// Consumed by useElementAnimations inside useAnimatedStyle; isolated here so
// unit tests can verify end-state composition without fighting the mock's
// sharedValue-doesn't-trigger-rerender semantics.
//
// Composition rules (cross-platform parity with web CSS shorthand):
//   - Scalars (opacity, borderRadius, borderWidth): LAST active contribution
//     wins. Matches CSS animation shorthand's "later rule wins" for parallel
//     animations over the same property.
//   - Transforms: MERGE-BY-KEY. The transform array is deduplicated per key
//     (translateX, translateY, scale, scaleX, scaleY, rotate, skewX, skewY);
//     later contributions overwrite earlier ones for the same key. This matches
//     CSS shorthand semantics and avoids RN's default sequential-composition
//     producing multiplicative/additive effects (two `scale: 1.015` + `scale: 1.01`
//     would otherwise compose to ~1.025 on RN vs. 1.01 on web).
//   - Colors (backgroundColor, borderColor, color): LAST active contribution wins.
//   - rotateDeg/skewXDeg/skewYDeg (numeric in spec): serialized to `${n}deg`
//     string form in the transform array, since RN's transform API accepts
//     strings for these properties.
//
// Priority order (earlier → later): mount, ambient, focus, hover, active,
// unmount, stateChange. A later trigger overrides scalars and transforms
// for overlapping keys while leaving non-overlapping properties intact.

import type { ReanimatedSpec } from 'mythik';

export type TriggerContribution = {
  progress: number;
  spec: ReanimatedSpec;
};

const NUMERIC_SCALAR_PROPS = new Set([
  'opacity',
  'borderRadius',
  'borderWidth',
]);

// Transform keys we merge by. Additional keys (translate3d, matrix) are not
// currently emitted by the framework and would need explicit handling here.
const TRANSFORM_KEYS_ORDER = [
  'translateX',
  'translateY',
  'scale',
  'scaleX',
  'scaleY',
  'rotate',
  'skewX',
  'skewY',
] as const;

export type InterpolateFn = (
  value: number,
  inputRange: number[],
  outputRange: number[],
) => number;

export type InterpolateColorFn = (
  value: number,
  inputRange: number[],
  outputRange: string[],
) => string;

export function composeRNStyle(
  contributions: TriggerContribution[],
  interpolate: InterpolateFn,
  interpolateColor: InterpolateColorFn,
): Record<string, unknown> {
  'worklet';
  const style: Record<string, unknown> = {};
  const transformMap = new Map<string, unknown>();

  for (const { progress, spec } of contributions) {
    for (const prop of spec.animatedProps) {
      const range = spec.outputRanges[prop];
      if (!range) continue;
      const value = interpolate(progress, spec.inputRange, range);

      if (NUMERIC_SCALAR_PROPS.has(prop)) {
        style[prop] = value;
      } else if (prop === 'rotateDeg') {
        transformMap.set('rotate', `${value}deg`);
      } else if (prop === 'skewXDeg') {
        transformMap.set('skewX', `${value}deg`);
      } else if (prop === 'skewYDeg') {
        transformMap.set('skewY', `${value}deg`);
      } else {
        transformMap.set(prop, value);
      }
    }
    for (const [prop, colors] of Object.entries(spec.animatedColorProps)) {
      style[prop] = interpolateColor(progress, spec.inputRange, colors);
    }
  }

  if (transformMap.size > 0) {
    // Emit transforms in a deterministic order for stable output and RN matrix
    // composition predictability.
    const transforms: Array<Record<string, unknown>> = [];
    for (const key of TRANSFORM_KEYS_ORDER) {
      if (transformMap.has(key)) {
        transforms.push({ [key]: transformMap.get(key) });
      }
    }
    style.transform = transforms;
  }

  return style;
}
