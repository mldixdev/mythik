// buildReanimatedSpec — RN output for animation engine.
// Emits a plain data descriptor: which properties animate, the input range
// (fractions from keyframes), the output range per property, timing config.
// The RN hook (Layer 2) consumes this to wire shared values + useAnimatedStyle.
// Pure function, no Reanimated imports at this layer.
//
// Animated properties covered (GPU-accelerated, cross-platform):
//   opacity, translateX, translateY, scale/scaleX/scaleY,
//   rotateDeg (degrees, numeric), skewXDeg, skewYDeg,
//   borderRadius (px only — percentage throws), borderWidth
// Color properties (interpolated separately via interpolateColor):
//   backgroundColor, borderColor, color
// Explicitly omitted on RN (web-only): filter — blur/brightness/saturate —
// and boxShadow — CSS shorthand strings with no 1:1 RN mapping (iOS splits
// into shadowColor/Offset/Radius/Opacity, Android uses elevation, neither
// string-parseable). A future framework feature (plan 3+) can add per-
// platform parsing + interpolation.

import type { AnimationSpec } from './types.js';
import { normalizeKeyframeSnapshot } from './keyframes-builder.js';

export type ReanimatedSpec = {
  animatedProps: string[];
  inputRange: number[];
  outputRanges: Record<string, number[]>;
  animatedColorProps: Record<string, string[]>;
  timing: {
    duration: number;
    delay: number;
    iterations: number | 'infinite';
    reverse: boolean;
    easing: string;
  };
};

const NUMERIC_PROPS = [
  'opacity',
  'translateX',
  'translateY',
  'scale',
  'scaleX',
  'scaleY',
  'rotateDeg',
  'skewXDeg',
  'skewYDeg',
  'borderRadius',
  'borderWidth',
] as const;

const COLOR_PROPS = ['backgroundColor', 'borderColor', 'color'] as const;

function extractNumericFromRN(
  rn: ReturnType<typeof normalizeKeyframeSnapshot>,
): Partial<Record<(typeof NUMERIC_PROPS)[number], number>> {
  const out: Partial<Record<(typeof NUMERIC_PROPS)[number], number>> = {};
  if (rn.opacity !== undefined) out.opacity = rn.opacity;
  if (rn.transformRN) {
    const t = rn.transformRN;
    if (typeof t.translateX === 'number') out.translateX = t.translateX;
    if (typeof t.translateY === 'number') out.translateY = t.translateY;
    if (t.scale !== undefined) out.scale = t.scale;
    if (t.scaleX !== undefined) out.scaleX = t.scaleX;
    if (t.scaleY !== undefined) out.scaleY = t.scaleY;
    if (t.rotateDeg !== undefined) out.rotateDeg = t.rotateDeg;
    if (t.skewXDeg !== undefined) out.skewXDeg = t.skewXDeg;
    if (t.skewYDeg !== undefined) out.skewYDeg = t.skewYDeg;
  }
  if (rn.borderRadius !== undefined) {
    const match = /^(-?\d*\.?\d+)px$/.exec(rn.borderRadius);
    if (match) {
      out.borderRadius = parseFloat(match[1]);
    } else if (rn.borderRadius.endsWith('%')) {
      throw new Error(
        `RN cannot animate percentage borderRadius: '${rn.borderRadius}' — use pixel values on RN-targeted animations`,
      );
    }
  }
  if (rn.borderWidth !== undefined) out.borderWidth = rn.borderWidth;
  return out;
}

function extractColorsFromRN(
  rn: ReturnType<typeof normalizeKeyframeSnapshot>,
): Partial<Record<(typeof COLOR_PROPS)[number], string>> {
  const out: Partial<Record<(typeof COLOR_PROPS)[number], string>> = {};
  if (rn.backgroundColor) out.backgroundColor = rn.backgroundColor;
  if (rn.borderColor) out.borderColor = rn.borderColor;
  if (rn.color) out.color = rn.color;
  return out;
}

function fillNearestNeighbor(values: (number | undefined)[]): number[] {
  const out = [...values];
  for (let i = 0; i < out.length; i++) {
    if (out[i] !== undefined) continue;
    let j = i - 1;
    while (j >= 0 && out[j] === undefined) j--;
    let k = i + 1;
    while (k < out.length && out[k] === undefined) k++;
    if (j >= 0) out[i] = out[j];
    else if (k < out.length) out[i] = out[k];
    // Note: caller guarantees at least one defined value (filtered via `some`).
    // The "all undefined" branch is defensive; unreachable in normal flow.
  }
  return out as number[];
}

function fillNearestColor(values: (string | undefined)[]): string[] {
  const out = [...values];
  for (let i = 0; i < out.length; i++) {
    if (out[i] !== undefined) continue;
    let j = i - 1;
    while (j >= 0 && out[j] === undefined) j--;
    let k = i + 1;
    while (k < out.length && out[k] === undefined) k++;
    if (j >= 0) out[i] = out[j];
    else if (k < out.length) out[i] = out[k];
    // Same "all undefined" defensive branch as fillNearestNeighbor.
  }
  return out as string[];
}

export function buildReanimatedSpec(spec: AnimationSpec): ReanimatedSpec {
  const normalized = spec.keyframes.map(normalizeKeyframeSnapshot);
  const inputRange = normalized.map((n) => n.fraction);

  const numericByProp: Record<string, (number | undefined)[]> = {};
  const colorByProp: Record<string, (string | undefined)[]> = {};

  const numericRows = normalized.map(extractNumericFromRN);
  const colorRows = normalized.map(extractColorsFromRN);

  for (const prop of NUMERIC_PROPS) {
    const col = numericRows.map((r) => r[prop]);
    if (col.some((v) => v !== undefined)) {
      numericByProp[prop] = col;
    }
  }
  for (const prop of COLOR_PROPS) {
    const col = colorRows.map((r) => r[prop]);
    if (col.some((v) => v !== undefined)) {
      colorByProp[prop] = col;
    }
  }

  const outputRanges: Record<string, number[]> = {};
  for (const [k, v] of Object.entries(numericByProp)) {
    outputRanges[k] = fillNearestNeighbor(v);
  }
  const animatedColorProps: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(colorByProp)) {
    animatedColorProps[k] = fillNearestColor(v);
  }

  const reverse =
    spec.direction === 'alternate' ||
    spec.direction === 'alternate-reverse' ||
    spec.direction === 'reverse';

  return {
    animatedProps: Object.keys(outputRanges),
    inputRange,
    outputRanges,
    animatedColorProps,
    timing: {
      duration: spec.duration,
      delay: spec.delay,
      iterations: spec.iterations,
      reverse,
      easing: spec.easing,
    },
  };
}
