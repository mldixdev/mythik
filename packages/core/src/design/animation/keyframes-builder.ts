// Keyframe snapshot normalizer — converts KeyframeSnapshot into a form both
// CSS and Reanimated builders can consume. Expands `transform` object into an
// ordered CSS string (web) + per-axis map with NUMERIC values (RN). Applies
// default px units for translate, default deg for rotate. Numeric form on RN
// side is critical for Reanimated's interpolate() which requires numbers.
//
// Transform composition order: translate → scale → rotate → skew
// (Framer Motion convention — avoids pivot surprises when combining rotate
// with translate. Do not reorder without visual regression testing.)

import type { KeyframeSnapshot, TransformValue, FilterValue } from './types.js';

/**
 * Parses a keyframe `at` string like '0%', '50%', '100%' to a [0,1] fraction.
 * Throws on invalid format (non-percent), out-of-range (<0 or >100), or
 * non-monotonic when used as part of a keyframe sequence (caller responsibility).
 */
export function parseAtToFraction(at: string): number {
  const match = /^(-?\d*\.?\d+)%$/.exec(at.trim());
  if (!match) {
    throw new Error(`invalid at (must be percent like '50%'): ${at}`);
  }
  const value = parseFloat(match[1]);
  if (value < 0 || value > 100) {
    throw new Error(`at must be in [0%, 100%]: got ${at}`);
  }
  return value / 100;
}

/**
 * Parses a rotate value (number of degrees, or string like '45deg') to a
 * numeric degree value. Returns null for non-deg string units (turn, rad, grad)
 * — those remain web-only and are skipped on RN.
 */
function parseRotateToDeg(v: number | string): number | null {
  if (typeof v === 'number') return v;
  const match = /^(-?\d*\.?\d+)\s*deg$/i.exec(v.trim());
  if (match) return parseFloat(match[1]);
  return null;
}

export type NormalizedTransformRN = {
  translateX?: number | string;
  translateY?: number | string;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  rotateDeg?: number;
  skewXDeg?: number;
  skewYDeg?: number;
};

export type NormalizedKeyframe = {
  fraction: number;
  opacity?: number;
  transformCSS?: string;
  transformRN?: NormalizedTransformRN;
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: string;
  borderWidth?: number;
  color?: string;
  filterCSS?: string;
  /** CSS box-shadow literal string; emitted web-only (same policy as filter). */
  boxShadow?: string;
};

function numToPx(v: number | string | undefined): string | undefined {
  if (v === undefined) return undefined;
  return typeof v === 'number' ? `${v}px` : v;
}

function numToDeg(v: number | string | undefined): string | undefined {
  if (v === undefined) return undefined;
  return typeof v === 'number' ? `${v}deg` : v;
}

function buildTransformCSS(t: TransformValue): string | undefined {
  const parts: string[] = [];
  if (t.translateX !== undefined) parts.push(`translateX(${numToPx(t.translateX)})`);
  if (t.translateY !== undefined) parts.push(`translateY(${numToPx(t.translateY)})`);
  if (t.scale !== undefined) {
    if (typeof t.scale === 'number') parts.push(`scale(${t.scale})`);
    else parts.push(`scale(${t.scale.x}, ${t.scale.y})`);
  }
  if (t.rotate !== undefined) parts.push(`rotate(${numToDeg(t.rotate)})`);
  if (t.skewX !== undefined) parts.push(`skewX(${t.skewX}deg)`);
  if (t.skewY !== undefined) parts.push(`skewY(${t.skewY}deg)`);
  return parts.length ? parts.join(' ') : undefined;
}

function buildTransformRN(t: TransformValue): NormalizedTransformRN | undefined {
  const rn: NormalizedTransformRN = {};
  if (t.translateX !== undefined) rn.translateX = t.translateX;
  if (t.translateY !== undefined) rn.translateY = t.translateY;
  if (t.scale !== undefined) {
    if (typeof t.scale === 'number') rn.scale = t.scale;
    else {
      rn.scaleX = t.scale.x;
      rn.scaleY = t.scale.y;
    }
  }
  if (t.rotate !== undefined) {
    const deg = parseRotateToDeg(t.rotate);
    if (deg !== null) rn.rotateDeg = deg;
  }
  if (t.skewX !== undefined) rn.skewXDeg = t.skewX;
  if (t.skewY !== undefined) rn.skewYDeg = t.skewY;
  return Object.keys(rn).length ? rn : undefined;
}

function buildFilterCSS(f: FilterValue): string | undefined {
  const parts: string[] = [];
  if (f.blur !== undefined) parts.push(`blur(${f.blur}px)`);
  if (f.brightness !== undefined) parts.push(`brightness(${f.brightness})`);
  if (f.saturate !== undefined) parts.push(`saturate(${f.saturate})`);
  return parts.length ? parts.join(' ') : undefined;
}

export function normalizeKeyframeSnapshot(kf: KeyframeSnapshot): NormalizedKeyframe {
  const out: NormalizedKeyframe = {
    fraction: parseAtToFraction(kf.at),
  };
  if (kf.opacity !== undefined) out.opacity = kf.opacity;
  if (kf.transform) {
    out.transformCSS = buildTransformCSS(kf.transform);
    out.transformRN = buildTransformRN(kf.transform);
  }
  if (kf.backgroundColor !== undefined) out.backgroundColor = kf.backgroundColor;
  if (kf.borderColor !== undefined) out.borderColor = kf.borderColor;
  if (kf.color !== undefined) out.color = kf.color;
  if (kf.borderRadius !== undefined) {
    out.borderRadius = numToPx(kf.borderRadius);
  }
  if (kf.borderWidth !== undefined) out.borderWidth = kf.borderWidth;
  if (kf.filter) out.filterCSS = buildFilterCSS(kf.filter);
  if (kf.boxShadow !== undefined) out.boxShadow = kf.boxShadow;
  return out;
}

/**
 * Platform-agnostic keyframe data for an AnimationSpec. Used by Layer 1
 * CSS and Reanimated builders, and reserved for Layer 3 (SVG shape runner in
 * plan 3). Callers that need normalized data (tests, introspection) consume
 * this rather than re-mapping keyframes.
 */
export function buildKeyframes(keyframes: KeyframeSnapshot[]): NormalizedKeyframe[] {
  return keyframes.map(normalizeKeyframeSnapshot);
}
