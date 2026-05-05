import { describe, it, expect } from 'vitest';
import { buildReanimatedSpec } from '../../../src/design/animation/reanimated-spec.js';
import type { AnimationSpec } from '../../../src/design/animation/types.js';

const FADE_UP: AnimationSpec = {
  keyframes: [
    { at: '0%', opacity: 0, transform: { translateY: 20 } },
    { at: '100%', opacity: 1, transform: { translateY: 0 } },
  ],
  duration: 500,
  easing: 'ease-out',
  delay: 0,
  iterations: 1,
  direction: 'normal',
  fillMode: 'both',
  essential: false,
};

describe('buildReanimatedSpec — translate / opacity / scale', () => {
  it('extracts animated properties', () => {
    const r = buildReanimatedSpec(FADE_UP);
    expect(r.animatedProps).toContain('opacity');
    expect(r.animatedProps).toContain('translateY');
    expect(r.animatedProps.length).toBe(2);
  });

  it('input range from fractions', () => {
    const r = buildReanimatedSpec(FADE_UP);
    expect(r.inputRange).toEqual([0, 1]);
  });

  it('output range per property aligned', () => {
    const r = buildReanimatedSpec(FADE_UP);
    expect(r.outputRanges.opacity).toEqual([0, 1]);
    expect(r.outputRanges.translateY).toEqual([20, 0]);
  });

  it('translateX flows through (slide recipes use it)', () => {
    const spec: AnimationSpec = {
      ...FADE_UP,
      keyframes: [
        { at: '0%', transform: { translateX: 40 } },
        { at: '100%', transform: { translateX: 0 } },
      ],
    };
    const r = buildReanimatedSpec(spec);
    expect(r.animatedProps).toEqual(['translateX']);
    expect(r.outputRanges.translateX).toEqual([40, 0]);
  });

  it('timing config', () => {
    const r = buildReanimatedSpec(FADE_UP);
    expect(r.timing.duration).toBe(500);
    expect(r.timing.delay).toBe(0);
    expect(r.timing.iterations).toBe(1);
    expect(r.timing.reverse).toBe(false);
  });

  it('direction=alternate sets reverse=true', () => {
    const spec: AnimationSpec = { ...FADE_UP, direction: 'alternate' };
    const r = buildReanimatedSpec(spec);
    expect(r.timing.reverse).toBe(true);
  });

  it('iterations=infinite passes through', () => {
    const spec: AnimationSpec = { ...FADE_UP, iterations: 'infinite' };
    const r = buildReanimatedSpec(spec);
    expect(r.timing.iterations).toBe('infinite');
  });

  it('three-stop keyframes produce three-value ranges', () => {
    const pulse: AnimationSpec = {
      ...FADE_UP,
      keyframes: [
        { at: '0%', transform: { scale: 1 } },
        { at: '50%', transform: { scale: 1.1 } },
        { at: '100%', transform: { scale: 1 } },
      ],
    };
    const r = buildReanimatedSpec(pulse);
    expect(r.inputRange).toEqual([0, 0.5, 1]);
    expect(r.outputRanges.scale).toEqual([1, 1.1, 1]);
    expect(r.animatedProps).toEqual(['scale']);
  });

  it('missing property at a stop fills with nearest neighbor', () => {
    const partial: AnimationSpec = {
      ...FADE_UP,
      keyframes: [
        { at: '0%', opacity: 0 },
        { at: '50%', transform: { scale: 1.1 } },
        { at: '100%', opacity: 1 },
      ],
    };
    const r = buildReanimatedSpec(partial);
    expect(r.outputRanges.opacity).toEqual([0, 0, 1]);
    expect(r.outputRanges.scale).toEqual([1.1, 1.1, 1.1]);
  });
});

describe('buildReanimatedSpec — rotation / skew (C1/C2 regression prevention)', () => {
  it('rotate numeric flows through as rotateDeg', () => {
    const spec: AnimationSpec = {
      ...FADE_UP,
      keyframes: [
        { at: '0%', transform: { rotate: 0 } },
        { at: '100%', transform: { rotate: 360 } },
      ],
    };
    const r = buildReanimatedSpec(spec);
    expect(r.animatedProps).toContain('rotateDeg');
    expect(r.outputRanges.rotateDeg).toEqual([0, 360]);
  });

  it('rotate "45deg" string parses to numeric rotateDeg', () => {
    const spec: AnimationSpec = {
      ...FADE_UP,
      keyframes: [
        { at: '0%', transform: { rotate: '0deg' } },
        { at: '100%', transform: { rotate: '45deg' } },
      ],
    };
    const r = buildReanimatedSpec(spec);
    expect(r.outputRanges.rotateDeg).toEqual([0, 45]);
  });

  it('rotate non-deg string (turn/rad) does NOT produce RN animation', () => {
    const spec: AnimationSpec = {
      ...FADE_UP,
      keyframes: [
        { at: '0%', transform: { rotate: '0turn' } },
        { at: '100%', transform: { rotate: '0.5turn' } },
      ],
    };
    const r = buildReanimatedSpec(spec);
    expect(r.animatedProps).not.toContain('rotateDeg');
    expect(r.animatedProps).not.toContain('rotate');
  });

  it('skewX numeric flows through as skewXDeg', () => {
    const spec: AnimationSpec = {
      ...FADE_UP,
      keyframes: [
        { at: '0%', transform: { skewX: 0 } },
        { at: '100%', transform: { skewX: 10 } },
      ],
    };
    const r = buildReanimatedSpec(spec);
    expect(r.animatedProps).toContain('skewXDeg');
    expect(r.outputRanges.skewXDeg).toEqual([0, 10]);
  });

  it('skewY numeric flows through as skewYDeg', () => {
    const spec: AnimationSpec = {
      ...FADE_UP,
      keyframes: [
        { at: '0%', transform: { skewY: 0 } },
        { at: '100%', transform: { skewY: 5 } },
      ],
    };
    const r = buildReanimatedSpec(spec);
    expect(r.animatedProps).toContain('skewYDeg');
    expect(r.outputRanges.skewYDeg).toEqual([0, 5]);
  });
});

describe('buildReanimatedSpec — borderRadius / borderWidth (C3 regression prevention)', () => {
  it('borderRadius integer px flows through', () => {
    const spec: AnimationSpec = {
      ...FADE_UP,
      keyframes: [
        { at: '0%', borderRadius: 8 },
        { at: '100%', borderRadius: 16 },
      ],
    };
    const r = buildReanimatedSpec(spec);
    expect(r.outputRanges.borderRadius).toEqual([8, 16]);
  });

  it('borderRadius decimal px flows through (was dropped before C3 fix)', () => {
    const spec: AnimationSpec = {
      ...FADE_UP,
      keyframes: [
        { at: '0%', borderRadius: 8.5 },
        { at: '100%', borderRadius: 16.25 },
      ],
    };
    const r = buildReanimatedSpec(spec);
    expect(r.outputRanges.borderRadius).toEqual([8.5, 16.25]);
  });

  it('borderRadius percentage throws (cannot animate on RN)', () => {
    const spec: AnimationSpec = {
      ...FADE_UP,
      keyframes: [
        { at: '0%', borderRadius: '50%' },
        { at: '100%', borderRadius: '100%' },
      ],
    };
    expect(() => buildReanimatedSpec(spec)).toThrow(/percentage borderRadius/i);
  });

  it('borderWidth flows through', () => {
    const spec: AnimationSpec = {
      ...FADE_UP,
      keyframes: [
        { at: '0%', borderWidth: 1 },
        { at: '100%', borderWidth: 3 },
      ],
    };
    const r = buildReanimatedSpec(spec);
    expect(r.outputRanges.borderWidth).toEqual([1, 3]);
  });
});

describe('buildReanimatedSpec — colors', () => {
  it('color properties emitted for interpolateColor', () => {
    const spec: AnimationSpec = {
      ...FADE_UP,
      keyframes: [
        { at: '0%', backgroundColor: '#f00' },
        { at: '100%', backgroundColor: '#0f0' },
      ],
    };
    const r = buildReanimatedSpec(spec);
    expect(r.animatedColorProps.backgroundColor).toEqual(['#f00', '#0f0']);
  });

  it('borderColor + color also tracked separately', () => {
    const spec: AnimationSpec = {
      ...FADE_UP,
      keyframes: [
        { at: '0%', borderColor: 'black', color: 'white' },
        { at: '100%', borderColor: 'red', color: 'yellow' },
      ],
    };
    const r = buildReanimatedSpec(spec);
    expect(r.animatedColorProps.borderColor).toEqual(['black', 'red']);
    expect(r.animatedColorProps.color).toEqual(['white', 'yellow']);
  });
});

describe('buildReanimatedSpec — filter omission (web-only)', () => {
  it('filter is NOT included in animatedProps on RN (web-only)', () => {
    const spec: AnimationSpec = {
      ...FADE_UP,
      keyframes: [
        { at: '0%', filter: { blur: 4 } },
        { at: '100%', filter: { blur: 0 } },
      ],
    };
    const r = buildReanimatedSpec(spec);
    expect(r.animatedProps).not.toContain('filter');
    expect(r.animatedProps).not.toContain('blur');
    expect(Object.keys(r.outputRanges)).toEqual([]);
  });
});

describe('buildReanimatedSpec — boxShadow omission (web-only)', () => {
  it('boxShadow is NOT included on RN (CSS shorthand has no RN 1:1 mapping)', () => {
    const spec: AnimationSpec = {
      ...FADE_UP,
      keyframes: [
        { at: '0%', boxShadow: 'none' },
        { at: '100%', boxShadow: '0 0 20px 4px rgba(99,102,241,0.45)' },
      ],
    };
    const r = buildReanimatedSpec(spec);
    expect(r.animatedProps).not.toContain('boxShadow');
    expect(r.animatedProps).not.toContain('box-shadow');
    expect(Object.keys(r.outputRanges)).toEqual([]);
    expect(Object.keys(r.animatedColorProps)).toEqual([]);
  });
});
