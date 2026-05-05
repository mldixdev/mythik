import { describe, it, expect } from 'vitest';
import { buildCSSKeyframes } from '../../../src/design/animation/css-keyframes.js';
import type { AnimationSpec } from '../../../src/design/animation/types.js';

const FADE_SPEC: AnimationSpec = {
  keyframes: [
    { at: '0%', opacity: 0 },
    { at: '100%', opacity: 1 },
  ],
  duration: 200,
  easing: 'ease-out',
  delay: 0,
  iterations: 1,
  direction: 'normal',
  fillMode: 'both',
  essential: false,
};

describe('buildCSSKeyframes', () => {
  it('produces stable deterministic name from content', () => {
    const a = buildCSSKeyframes(FADE_SPEC);
    const b = buildCSSKeyframes(FADE_SPEC);
    expect(a.name).toBe(b.name);
    expect(a.name).toMatch(/^svka-[a-z0-9]+$/);
  });

  it('different keyframes produce different names', () => {
    const other: AnimationSpec = {
      ...FADE_SPEC,
      keyframes: [{ at: '0%' }, { at: '100%', opacity: 0.5 }],
    };
    const a = buildCSSKeyframes(FADE_SPEC);
    const b = buildCSSKeyframes(other);
    expect(a.name).not.toBe(b.name);
  });

  it('keyframesText contains @keyframes + both stops', () => {
    const { keyframesText, name } = buildCSSKeyframes(FADE_SPEC);
    expect(keyframesText).toContain(`@keyframes ${name}`);
    expect(keyframesText).toContain('0%');
    expect(keyframesText).toContain('100%');
    expect(keyframesText).toContain('opacity: 0');
    expect(keyframesText).toContain('opacity: 1');
  });

  it('animationCSS has ms + easing + iteration + direction + fillMode + name', () => {
    const { animationCSS, name } = buildCSSKeyframes(FADE_SPEC);
    expect(animationCSS).toBe(`${name} 200ms ease-out 0ms 1 normal both`);
  });

  it('iterations=infinite maps to "infinite"', () => {
    const spec: AnimationSpec = { ...FADE_SPEC, iterations: 'infinite' };
    const { animationCSS } = buildCSSKeyframes(spec);
    expect(animationCSS).toContain('infinite');
  });

  it('transform composed into one transform property per stop', () => {
    const spec: AnimationSpec = {
      ...FADE_SPEC,
      keyframes: [
        { at: '0%', transform: { translateY: 20, scale: 0.95 }, opacity: 0 },
        { at: '100%', transform: { translateY: 0, scale: 1 }, opacity: 1 },
      ],
    };
    const { keyframesText } = buildCSSKeyframes(spec);
    expect(keyframesText).toContain('transform: translateY(20px) scale(0.95)');
    expect(keyframesText).toContain('transform: translateY(0px) scale(1)');
  });

  it('colors + borderRadius rendered', () => {
    const spec: AnimationSpec = {
      ...FADE_SPEC,
      keyframes: [
        { at: '0%', backgroundColor: '#f00', borderRadius: 8 },
        { at: '100%', backgroundColor: '#0f0', borderRadius: 16 },
      ],
    };
    const { keyframesText } = buildCSSKeyframes(spec);
    expect(keyframesText).toContain('background-color: #f00');
    expect(keyframesText).toContain('border-radius: 8px');
    expect(keyframesText).toContain('background-color: #0f0');
    expect(keyframesText).toContain('border-radius: 16px');
  });

  it('filter rendered', () => {
    const spec: AnimationSpec = {
      ...FADE_SPEC,
      keyframes: [
        { at: '0%', filter: { blur: 4 } },
        { at: '100%', filter: { blur: 0 } },
      ],
    };
    const { keyframesText } = buildCSSKeyframes(spec);
    expect(keyframesText).toContain('filter: blur(4px)');
    expect(keyframesText).toContain('filter: blur(0px)');
  });

  it('boxShadow literal is emitted verbatim in each keyframe', () => {
    const spec: AnimationSpec = {
      ...FADE_SPEC,
      keyframes: [
        { at: '0%', boxShadow: 'none' },
        { at: '100%', boxShadow: '0 0 20px 4px rgba(99,102,241,0.45)' },
      ],
    };
    const { keyframesText } = buildCSSKeyframes(spec);
    expect(keyframesText).toContain('box-shadow: none');
    expect(keyframesText).toContain(
      'box-shadow: 0 0 20px 4px rgba(99,102,241,0.45)',
    );
  });
});
