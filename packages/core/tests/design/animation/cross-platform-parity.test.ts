// Cross-platform parity: for every recipe (+ inline override cases), the
// same AnimationSpec produced by resolveAnimation must serialize to equivalent
// platform outputs — CSS (web) and ReanimatedSpec (RN). This is a regression
// barrier for the engine's cross-platform promise and complements per-builder
// tests that verify each path in isolation.
//
// Assertion discipline:
//   - Use space-bounded matches (` Xms `, ` easing `, ` direction `) rather
//     than raw substring contains, so 200ms does not match 1200ms and
//     ease-in does not match ease-in-out.
//   - Assert numeric output lengths AND color output lengths to catch
//     color-only recipes (glow) whose numeric output ranges are empty.
//   - Distinguish genuinely symmetric fields (duration, delay, easing,
//     iterations, color arrays) from semantically-different ones (direction
//     is a string on CSS vs a `reverse` boolean on RN; fillMode has no RN
//     equivalent — documented rather than asserted).

import { describe, it, expect } from 'vitest';
import {
  resolveAnimation,
  buildCSSKeyframes,
  buildReanimatedSpec,
  ANIMATION_RECIPES,
} from '../../../src/index.js';

describe('cross-platform parity — engine output equivalence', () => {
  it('fade-up: CSS + RN share duration, opacity curve, and translateY curve', () => {
    const spec = resolveAnimation({ recipe: 'fade-up' }, ANIMATION_RECIPES);
    const css = buildCSSKeyframes(spec);
    const rn = buildReanimatedSpec(spec);

    expect(css.animationCSS).toContain(' 500ms ');
    expect(rn.timing.duration).toBe(500);
    expect(rn.outputRanges.opacity).toEqual([0, 1]);
    expect(rn.outputRanges.translateY).toEqual([20, 0]);
    expect(css.keyframesText).toContain('opacity: 0');
    expect(css.keyframesText).toContain('opacity: 1');
    expect(css.keyframesText).toContain('translateY(20px)');
    expect(css.keyframesText).toContain('translateY(0px)');
  });

  it('pulse-primary: three input stops on both paths, infinite iterations', () => {
    const spec = resolveAnimation({ recipe: 'pulse-primary' }, ANIMATION_RECIPES);
    const css = buildCSSKeyframes(spec);
    const rn = buildReanimatedSpec(spec);

    expect(rn.inputRange).toEqual([0, 0.5, 1]);
    expect(rn.outputRanges.scale).toEqual([1, 1.05, 1]);
    expect(css.keyframesText).toContain('0%');
    expect(css.keyframesText).toContain('50%');
    expect(css.keyframesText).toContain('100%');
    expect(rn.timing.iterations).toBe('infinite');
    expect(css.animationCSS).toContain(' infinite ');
  });

  it('spin: linear easing + infinite + rotate → rotateDeg channel normalization', () => {
    const spec = resolveAnimation({ recipe: 'spin' }, ANIMATION_RECIPES);
    const css = buildCSSKeyframes(spec);
    const rn = buildReanimatedSpec(spec);

    expect(css.animationCSS).toContain(' linear ');
    expect(rn.timing.easing).toBe('linear');
    expect(css.animationCSS).toContain(' infinite ');
    expect(rn.timing.iterations).toBe('infinite');
    // rotate is normalized to rotateDeg on RN
    expect(rn.outputRanges.rotate).toBeUndefined();
    expect(rn.outputRanges.rotateDeg).toEqual([0, 360]);
    expect(css.keyframesText).toContain('rotate(0deg)');
    expect(css.keyframesText).toContain('rotate(360deg)');
  });

  it('inline override: duration propagates to both paths identically', () => {
    const spec = resolveAnimation(
      { recipe: 'fade', duration: 1000 },
      ANIMATION_RECIPES,
    );
    const css = buildCSSKeyframes(spec);
    const rn = buildReanimatedSpec(spec);
    expect(css.animationCSS).toContain(' 1000ms ');
    expect(rn.timing.duration).toBe(1000);
  });

  it('inline override: easing propagates to both paths identically (even with spaces)', () => {
    const spec = resolveAnimation(
      { recipe: 'fade', easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
      ANIMATION_RECIPES,
    );
    const css = buildCSSKeyframes(spec);
    const rn = buildReanimatedSpec(spec);
    expect(css.animationCSS).toContain(' cubic-bezier(0.4, 0, 0.2, 1) ');
    expect(rn.timing.easing).toBe('cubic-bezier(0.4, 0, 0.2, 1)');
  });

  it('inline override: delay propagates to both paths identically', () => {
    const spec = resolveAnimation(
      { recipe: 'fade', delay: 250 },
      ANIMATION_RECIPES,
    );
    const css = buildCSSKeyframes(spec);
    const rn = buildReanimatedSpec(spec);
    // CSS shorthand shape: `<name> <duration>ms <easing> <delay>ms <iterations> <direction> <fillMode>`
    expect(css.animationCSS).toContain(' 250ms ');
    expect(rn.timing.delay).toBe(250);
  });

  it('direction="reverse" inline: CSS has reverse in shorthand, RN timing.reverse=true', () => {
    const spec = resolveAnimation(
      {
        keyframes: [
          { at: '0%', opacity: 0 },
          { at: '100%', opacity: 1 },
        ],
        duration: 200,
        easing: 'ease-out',
        direction: 'reverse',
      },
      ANIMATION_RECIPES,
    );
    const css = buildCSSKeyframes(spec);
    const rn = buildReanimatedSpec(spec);
    expect(css.animationCSS).toContain(' reverse ');
    expect(rn.timing.reverse).toBe(true);
  });

  it('direction="alternate" inline: CSS keeps "alternate" string; RN flips timing.reverse=true', () => {
    const spec = resolveAnimation(
      {
        keyframes: [
          { at: '0%', opacity: 0 },
          { at: '100%', opacity: 1 },
        ],
        duration: 200,
        easing: 'ease-out',
        direction: 'alternate',
        iterations: 'infinite',
      },
      ANIMATION_RECIPES,
    );
    const css = buildCSSKeyframes(spec);
    const rn = buildReanimatedSpec(spec);
    expect(css.animationCSS).toContain(' alternate ');
    // RN encodes alternate/reverse/alternate-reverse all as timing.reverse=true
    expect(rn.timing.reverse).toBe(true);
  });

  it('fillMode: CSS writes the value; RN has no equivalent (semantic gap)', () => {
    const specForwards = resolveAnimation(
      {
        keyframes: [
          { at: '0%', opacity: 0 },
          { at: '100%', opacity: 1 },
        ],
        duration: 200,
        easing: 'ease-out',
        fillMode: 'backwards',
      },
      ANIMATION_RECIPES,
    );
    const css = buildCSSKeyframes(specForwards);
    const rn = buildReanimatedSpec(specForwards);
    expect(css.animationCSS).toContain(' backwards');
    // RN timing has no fillMode field — property is genuinely asymmetric.
    expect((rn.timing as Record<string, unknown>).fillMode).toBeUndefined();
  });

  it('lift: fillMode: forwards propagates on web; RN has no equivalent but duration persists', () => {
    const spec = resolveAnimation({ recipe: 'lift' }, ANIMATION_RECIPES);
    const css = buildCSSKeyframes(spec);
    const rn = buildReanimatedSpec(spec);
    expect(css.animationCSS).toContain(' forwards');
    expect(rn.timing.duration).toBe(160);
  });

  it('shake: >=5 keyframe stops align across both paths', () => {
    const spec = resolveAnimation({ recipe: 'shake' }, ANIMATION_RECIPES);
    const rn = buildReanimatedSpec(spec);
    expect(rn.inputRange.length).toBeGreaterThanOrEqual(5);
    // Every output range must share the same length as inputRange (required
    // by Reanimated's interpolate contract)
    expect(rn.outputRanges.translateX?.length).toBe(rn.inputRange.length);
  });

  it('glow: boxShadow animates on web (canonical glow primitive); RN omits (documented)', () => {
    const spec = resolveAnimation({ recipe: 'glow' }, ANIMATION_RECIPES);
    const css = buildCSSKeyframes(spec);
    const rn = buildReanimatedSpec(spec);
    // Web: emitted literally in the keyframes block
    expect(css.keyframesText).toContain('box-shadow: none');
    expect(css.keyframesText).toContain(
      'box-shadow: 0 0 20px 4px rgba(99,102,241,0.45)',
    );
    // RN: no color props and no numeric outputs for glow (web-only effect).
    // This matches the documented policy (same as `filter`).
    expect(rn.animatedColorProps.backgroundColor).toBeUndefined();
    expect(Object.keys(rn.animatedColorProps).length).toBe(0);
    expect(Object.keys(rn.outputRanges).length).toBe(0);
  });

  it('every recipe resolves; numeric AND color output lengths align with inputRange', () => {
    for (const name of Object.keys(ANIMATION_RECIPES)) {
      const spec = resolveAnimation({ recipe: name }, ANIMATION_RECIPES);
      const css = buildCSSKeyframes(spec);
      const rn = buildReanimatedSpec(spec);
      expect(css.keyframesText, `${name} CSS @keyframes block`).toContain('@keyframes');
      expect(rn.timing.duration, `${name} RN duration`).toBeGreaterThan(0);
      for (const [prop, range] of Object.entries(rn.outputRanges)) {
        expect(
          range.length,
          `${name} outputRange[${prop}] length mismatch with inputRange`,
        ).toBe(rn.inputRange.length);
      }
      // Color channels must align too — catches color-only recipes (glow)
      // whose outputRanges loop is vacuous.
      for (const [prop, range] of Object.entries(rn.animatedColorProps)) {
        expect(
          range.length,
          `${name} animatedColorProps[${prop}] length mismatch with inputRange`,
        ).toBe(rn.inputRange.length);
      }
    }
  });

  it('every recipe: CSS shorthand carries the same duration as RN timing (space-bounded match)', () => {
    for (const name of Object.keys(ANIMATION_RECIPES)) {
      const spec = resolveAnimation({ recipe: name }, ANIMATION_RECIPES);
      const css = buildCSSKeyframes(spec);
      const rn = buildReanimatedSpec(spec);
      // Space-bounded: ` 200ms ` cannot accidentally match ` 1200ms `
      expect(
        css.animationCSS,
        `${name}: CSS shorthand missing " ${rn.timing.duration}ms "`,
      ).toContain(` ${rn.timing.duration}ms `);
    }
  });

  it('every recipe: CSS iterations exact token matches RN iterations value', () => {
    for (const name of Object.keys(ANIMATION_RECIPES)) {
      const spec = resolveAnimation({ recipe: name }, ANIMATION_RECIPES);
      const css = buildCSSKeyframes(spec);
      const rn = buildReanimatedSpec(spec);
      if (rn.timing.iterations === 'infinite') {
        expect(
          css.animationCSS,
          `${name}: expected " infinite " in CSS shorthand`,
        ).toContain(' infinite ');
      } else {
        expect(typeof rn.timing.iterations).toBe('number');
        // Symmetric check: CSS must contain the same integer between spaces
        expect(
          css.animationCSS,
          `${name}: expected " ${rn.timing.iterations} " in CSS shorthand`,
        ).toContain(` ${rn.timing.iterations} `);
      }
    }
  });

  it('every recipe: CSS easing exact token matches RN easing value', () => {
    for (const name of Object.keys(ANIMATION_RECIPES)) {
      const spec = resolveAnimation({ recipe: name }, ANIMATION_RECIPES);
      const css = buildCSSKeyframes(spec);
      const rn = buildReanimatedSpec(spec);
      expect(
        css.animationCSS,
        `${name}: CSS shorthand missing " ${rn.timing.easing} "`,
      ).toContain(` ${rn.timing.easing} `);
    }
  });
});
