// Task 12 — Layer 3 cross-platform parity.
//
// Pins that `buildCSSKeyframes` (web) and `buildReanimatedSpec` (RN) interpret
// the SAME resolved AnimationSpec identically on load-bearing invariants:
//
//   - Durations agree (both report the same ms count, regardless of the
//     input form '28s' / '28000' — the Layer 1 resolver normalizes to ms).
//   - Keyframe stops count agrees (number of `at` markers in web CSS text
//     matches number of snapshots the RN spec interpolates across).
//   - Direction semantic agrees (web CSS shorthand contains 'alternate'
//     token iff RN spec.timing.reverse is true).
//   - Iteration count agrees (web shorthand contains 'infinite' token iff
//     RN spec.timing.iterations === 'infinite').
//   - Both runners cover the three motion dimensions Layer 3 emits via
//     resolveBlobLayer (drift/rotate/scale).
//
// Not checked here (runner-specific, not contract-relevant):
//   - CSS shorthand string format details (order of tokens, whitespace).
//   - RN outputRanges exact numeric interpolation (other tests pin this).
//   - Keyframe name hash values (both builders hash independently; dedup
//     is internal to each runner's keyframe registry).

import { describe, it, expect } from 'vitest';
import {
  resolveAnimation,
  buildCSSKeyframes,
  buildReanimatedSpec,
} from '../../../src/index.js';
import type { InlineAnimation } from '../../../src/design/animation/types.js';

// Empty recipe registry — all specs in this file are inline AnimationRefs,
// so `resolveAnimation` short-circuits before touching the registry. Passing
// `{}` (instead of NO_RECIPES) decouples this parity test from the
// recipe registry's evolution — a recipe-registry edit cannot break these
// invariants.
const NO_RECIPES = {};

const DRIFT_INLINE: InlineAnimation = {
  keyframes: [
    { at: '0%', transform: { translateX: 0, translateY: 0 } },
    { at: '50%', transform: { translateX: 8, translateY: 5 } },
    { at: '100%', transform: { translateX: 0, translateY: 0 } },
  ],
  duration: '28s',
  iterations: 'infinite',
  direction: 'alternate',
};

const ROTATE_INLINE: InlineAnimation = {
  keyframes: [
    { at: '0%', transform: { rotate: '-15deg' } },
    { at: '100%', transform: { rotate: '12deg' } },
  ],
  duration: '80s',
  iterations: 'infinite',
  direction: 'alternate',
};

// Scope note: Task 8's `motionToAnimations` in resolveBlobLayer emits only
// scalar `scale` (a number). The TransformValue type also permits the object
// form `scale: {x, y}` which splits to scaleX/scaleY animated props on RN —
// a structurally different parity contract. That case is out of scope for
// Task 12; add a dedicated describe when Layer 3 emits the object form.
const SCALE_INLINE: InlineAnimation = {
  keyframes: [
    { at: '0%', transform: { scale: 1 } },
    { at: '100%', transform: { scale: 1.04 } },
  ],
  duration: '20s',
  iterations: 'infinite',
  direction: 'alternate',
};

function countPercentMarkers(keyframesText: string): number {
  // Counts `<n>% {` blocks — robust against different % inside values
  // (e.g. opacity:50% is impossible here, but percentage-based stops are
  // written `0%` / `50%` / `100%` at the start of each rule).
  //
  // Coupling note: this couples to `fractionToPercentLabel` in
  // css-keyframes.ts, which always emits `<N>%` tokens (never `from`/`to`
  // keywords and never comma-compressed stops like `0%, 50%`). If that
  // builder ever changes format, update this regex.
  const matches = keyframesText.match(/^\s*-?\d+(?:\.\d+)?%\s*\{/gm);
  return matches ? matches.length : 0;
}

describe('Layer 3 parity — drift motion (translate)', () => {
  const spec = resolveAnimation(DRIFT_INLINE, NO_RECIPES);
  const web = buildCSSKeyframes(spec);
  const rn = buildReanimatedSpec(spec);

  it('duration agrees: web shorthand shows 28000ms; RN timing.duration = 28000', () => {
    expect(web.animationCSS).toMatch(/\b28000ms\b/);
    expect(rn.timing.duration).toBe(28000);
  });

  it('keyframe stops count agrees: 3 percent markers; 3 inputRange points', () => {
    expect(countPercentMarkers(web.keyframesText)).toBe(3);
    expect(rn.inputRange).toHaveLength(3);
  });

  it("direction 'alternate' surfaces on both: web shorthand token; RN timing.reverse=true", () => {
    expect(web.animationCSS).toContain('alternate');
    expect(rn.timing.reverse).toBe(true);
  });

  it("iterations 'infinite' surfaces on both: web shorthand token; RN timing.iterations='infinite'", () => {
    expect(web.animationCSS).toContain('infinite');
    expect(rn.timing.iterations).toBe('infinite');
  });

  it('both runners emit translateX + translateY as animated props', () => {
    // Web: keyframesText contains `translateX` and `translateY` tokens
    expect(web.keyframesText).toContain('translateX');
    expect(web.keyframesText).toContain('translateY');
    // RN: animatedProps array contains them
    expect(rn.animatedProps).toContain('translateX');
    expect(rn.animatedProps).toContain('translateY');
  });
});

describe('Layer 3 parity — rotate motion', () => {
  const spec = resolveAnimation(ROTATE_INLINE, NO_RECIPES);
  const web = buildCSSKeyframes(spec);
  const rn = buildReanimatedSpec(spec);

  it('duration agrees: web 80000ms; RN 80000', () => {
    expect(web.animationCSS).toMatch(/\b80000ms\b/);
    expect(rn.timing.duration).toBe(80000);
  });

  it('keyframe stops count agrees: 2 percent markers; 2 inputRange points', () => {
    expect(countPercentMarkers(web.keyframesText)).toBe(2);
    expect(rn.inputRange).toHaveLength(2);
  });

  it('both runners emit rotate as an animated prop (web: rotate, RN: rotateDeg)', () => {
    // Web uses CSS `rotate(Ndeg)`; RN normalizes to `rotateDeg` numeric
    // field (buildReanimatedSpec's internal name for the degree-form rotate).
    expect(web.keyframesText).toContain('rotate');
    expect(rn.animatedProps).toContain('rotateDeg');
  });

  it('alternate direction surfaces on both runners', () => {
    expect(web.animationCSS).toContain('alternate');
    expect(rn.timing.reverse).toBe(true);
  });
});

describe('Layer 3 parity — scale motion', () => {
  const spec = resolveAnimation(SCALE_INLINE, NO_RECIPES);
  const web = buildCSSKeyframes(spec);
  const rn = buildReanimatedSpec(spec);

  it('duration agrees: web 20000ms; RN 20000', () => {
    expect(web.animationCSS).toMatch(/\b20000ms\b/);
    expect(rn.timing.duration).toBe(20000);
  });

  it('keyframe stops count agrees: 2 percent markers; 2 inputRange points', () => {
    expect(countPercentMarkers(web.keyframesText)).toBe(2);
    expect(rn.inputRange).toHaveLength(2);
  });

  it('both runners emit scale as animated prop', () => {
    expect(web.keyframesText).toContain('scale');
    expect(rn.animatedProps).toContain('scale');
  });
});

describe('Layer 3 parity — direction semantics', () => {
  const base = (direction: InlineAnimation['direction']): InlineAnimation => ({
    keyframes: [
      { at: '0%', opacity: 0 },
      { at: '100%', opacity: 1 },
    ],
    duration: '1s',
    direction,
  });

  it("'normal' direction: web no alternate token; RN reverse=false", () => {
    const spec = resolveAnimation(base('normal'), NO_RECIPES);
    const web = buildCSSKeyframes(spec);
    const rn = buildReanimatedSpec(spec);
    expect(web.animationCSS).not.toContain('alternate');
    expect(rn.timing.reverse).toBe(false);
  });

  it("'alternate' direction: web alternate token; RN reverse=true", () => {
    const spec = resolveAnimation(base('alternate'), NO_RECIPES);
    const web = buildCSSKeyframes(spec);
    const rn = buildReanimatedSpec(spec);
    expect(web.animationCSS).toContain('alternate');
    expect(rn.timing.reverse).toBe(true);
  });

  it("'reverse' direction: web reverse token; RN reverse=true", () => {
    const spec = resolveAnimation(base('reverse'), NO_RECIPES);
    const web = buildCSSKeyframes(spec);
    const rn = buildReanimatedSpec(spec);
    expect(web.animationCSS).toContain('reverse');
    expect(rn.timing.reverse).toBe(true);
  });

  it("'alternate-reverse' direction: web alternate-reverse token; RN reverse=true", () => {
    const spec = resolveAnimation(base('alternate-reverse'), NO_RECIPES);
    const web = buildCSSKeyframes(spec);
    const rn = buildReanimatedSpec(spec);
    expect(web.animationCSS).toContain('alternate-reverse');
    expect(rn.timing.reverse).toBe(true);
  });
});

describe('Layer 3 parity — finite iterations', () => {
  it('iterations: 3 surfaces on both runners (web shorthand "3"; RN timing.iterations=3)', () => {
    const spec = resolveAnimation(
      {
        keyframes: [
          { at: '0%', opacity: 0 },
          { at: '100%', opacity: 1 },
        ],
        duration: '500ms',
        iterations: 3,
      },
      NO_RECIPES,
    );
    const web = buildCSSKeyframes(spec);
    const rn = buildReanimatedSpec(spec);
    // Web shorthand: "<name> 500ms ease 0ms 3 normal none"
    expect(web.animationCSS).toMatch(/\b3\b/);
    expect(web.animationCSS).not.toContain('infinite');
    expect(rn.timing.iterations).toBe(3);
  });
});
