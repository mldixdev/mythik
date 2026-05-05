import { describe, it, expect } from 'vitest';
import { applyReducedMotion } from '../../../src/design/animation/reduced-motion.js';
import type { AnimationSpec } from '../../../src/design/animation/types.js';

function spec(overrides: Partial<AnimationSpec> = {}): AnimationSpec {
  return {
    keyframes: [
      { at: '0%', opacity: 0, transform: { translateY: 20 } },
      { at: '100%', opacity: 1, transform: { translateY: 0 } },
    ],
    duration: 300,
    easing: 'ease-out',
    delay: 0,
    iterations: 1,
    direction: 'normal',
    fillMode: 'both',
    essential: false,
    ...overrides,
  };
}

describe('applyReducedMotion', () => {
  describe('mount trigger', () => {
    it('strips transform from keyframes, keeps opacity', () => {
      const s = applyReducedMotion(spec(), 'mount');
      expect(s).not.toBeNull();
      expect(s!.keyframes[0].transform).toBeUndefined();
      expect(s!.keyframes[1].transform).toBeUndefined();
      expect(s!.keyframes[0].opacity).toBe(0);
      expect(s!.keyframes[1].opacity).toBe(1);
    });
  });

  describe('unmount trigger', () => {
    it('strips transform, keeps opacity', () => {
      const s = applyReducedMotion(spec(), 'unmount');
      expect(s!.keyframes[0].transform).toBeUndefined();
    });
  });

  describe('hover trigger', () => {
    it('returns null (skip)', () => {
      expect(applyReducedMotion(spec(), 'hover')).toBeNull();
    });
  });

  describe('focus trigger', () => {
    it('passes through unchanged (a11y-critical)', () => {
      const s = applyReducedMotion(spec(), 'focus');
      expect(s).toEqual(spec());
    });
  });

  describe('active trigger', () => {
    it('strips transforms, keeps opacity', () => {
      const s = applyReducedMotion(spec(), 'active');
      expect(s!.keyframes[0].transform).toBeUndefined();
      expect(s!.keyframes[1].transform).toBeUndefined();
    });
  });

  describe('ambient trigger', () => {
    it('returns null (disabled)', () => {
      expect(applyReducedMotion(spec(), 'ambient')).toBeNull();
    });
  });

  describe('stateChange trigger', () => {
    it('reduces duration 3x, keeps keyframes', () => {
      const s = applyReducedMotion(spec({ duration: 600 }), 'stateChange');
      expect(s!.duration).toBe(200);
      expect(s!.keyframes).toEqual(spec().keyframes);
    });
  });

  describe('essential override', () => {
    it('essential=true passes through on ambient (would normally skip)', () => {
      const s = applyReducedMotion(spec({ essential: true }), 'ambient');
      expect(s).not.toBeNull();
      expect(s!.keyframes[0].transform).toEqual({ translateY: 20 });
    });

    it('essential=true passes through on hover (would normally skip)', () => {
      const s = applyReducedMotion(spec({ essential: true }), 'hover');
      expect(s).not.toBeNull();
    });

    it('essential=true preserves transforms on mount', () => {
      const s = applyReducedMotion(spec({ essential: true }), 'mount');
      expect(s!.keyframes[0].transform).toEqual({ translateY: 20 });
    });

    it('essential=true on stateChange preserves original duration (no 3x reduction)', () => {
      const s = applyReducedMotion(spec({ essential: true, duration: 600 }), 'stateChange');
      expect(s!.duration).toBe(600);
    });
  });

  describe('degenerate-keyframe guard (I1)', () => {
    it('transform-only mount returns null (slide-left / spin class)', () => {
      const transformOnly = spec({
        keyframes: [
          { at: '0%', transform: { translateX: 40 } },
          { at: '100%', transform: { translateX: 0 } },
        ],
      });
      expect(applyReducedMotion(transformOnly, 'mount')).toBeNull();
    });

    it('transform-only unmount returns null', () => {
      const transformOnly = spec({
        keyframes: [
          { at: '0%', transform: { scale: 1 } },
          { at: '100%', transform: { scale: 0.9 } },
        ],
      });
      expect(applyReducedMotion(transformOnly, 'unmount')).toBeNull();
    });

    it('transform-only active returns null', () => {
      const transformOnly = spec({
        keyframes: [
          { at: '0%', transform: { scale: 1 } },
          { at: '100%', transform: { scale: 1.1 } },
        ],
      });
      expect(applyReducedMotion(transformOnly, 'active')).toBeNull();
    });

    it('opacity+transform mount keeps opacity (not null)', () => {
      const mixed = spec({
        keyframes: [
          { at: '0%', opacity: 0, transform: { translateY: 20 } },
          { at: '100%', opacity: 1, transform: { translateY: 0 } },
        ],
      });
      const result = applyReducedMotion(mixed, 'mount');
      expect(result).not.toBeNull();
      expect(result!.keyframes[0].opacity).toBe(0);
    });
  });

  describe('stateChange duration floor (I2)', () => {
    it('duration 600 reduces to 200 (nominal 3x)', () => {
      const s = applyReducedMotion(spec({ duration: 600 }), 'stateChange');
      expect(s!.duration).toBe(200);
    });

    it('duration 100 reduces to 50 (clamped at minimum)', () => {
      const s = applyReducedMotion(spec({ duration: 100 }), 'stateChange');
      expect(s!.duration).toBe(50);
    });

    it('duration 30 reduces to 50 (minimum floor, not 10)', () => {
      const s = applyReducedMotion(spec({ duration: 30 }), 'stateChange');
      expect(s!.duration).toBe(50);
    });

    it('duration 1 reduces to 50 (minimum floor, not 0)', () => {
      const s = applyReducedMotion(spec({ duration: 1 }), 'stateChange');
      expect(s!.duration).toBe(50);
    });
  });

  describe('immutability', () => {
    it('does not mutate the input spec', () => {
      const original = spec();
      const originalKeyframes = JSON.stringify(original.keyframes);
      applyReducedMotion(original, 'mount');
      expect(JSON.stringify(original.keyframes)).toBe(originalKeyframes);
    });
  });
});
