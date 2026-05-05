import { describe, it, expect } from 'vitest';
import { resolveAnimation } from '../../../src/design/animation/resolver.js';
import type { InlineAnimation, AnimationRef } from '../../../src/design/animation/types.js';

const FADE: InlineAnimation = {
  keyframes: [{ at: '0%', opacity: 0 }, { at: '100%', opacity: 1 }],
  duration: '200ms',
  easing: 'ease-out',
};

const recipes = { fade: FADE };

describe('resolveAnimation', () => {
  it('resolves recipe reference to spec', () => {
    const spec = resolveAnimation({ recipe: 'fade' }, recipes);
    expect(spec.duration).toBe(200);
    expect(spec.easing).toBe('ease-out');
    expect(spec.keyframes.length).toBe(2);
  });

  it('recipe override fields take precedence', () => {
    const spec = resolveAnimation(
      { recipe: 'fade', duration: '500ms', easing: 'linear' },
      recipes,
    );
    expect(spec.duration).toBe(500);
    expect(spec.easing).toBe('linear');
  });

  it('parses duration strings: ms', () => {
    const spec = resolveAnimation({ recipe: 'fade', duration: '300ms' }, recipes);
    expect(spec.duration).toBe(300);
  });

  it('parses duration strings: s', () => {
    const spec = resolveAnimation({ recipe: 'fade', duration: '1.5s' }, recipes);
    expect(spec.duration).toBe(1500);
  });

  it('accepts numeric duration as ms', () => {
    const spec = resolveAnimation({ recipe: 'fade', duration: 350 }, recipes);
    expect(spec.duration).toBe(350);
  });

  it('resolves inline animation without recipe lookup', () => {
    const inline: AnimationRef = {
      keyframes: [{ at: '0%' }, { at: '100%', opacity: 1 }],
      duration: 400,
    };
    const spec = resolveAnimation(inline, recipes);
    expect(spec.duration).toBe(400);
    expect(spec.keyframes.length).toBe(2);
  });

  it('applies defaults: iterations=1, direction=normal, fillMode=both, easing=ease-out, delay=0', () => {
    const inline: AnimationRef = {
      keyframes: [{ at: '0%' }, { at: '100%' }],
      duration: 200,
    };
    const spec = resolveAnimation(inline, recipes);
    expect(spec.iterations).toBe(1);
    expect(spec.direction).toBe('normal');
    expect(spec.fillMode).toBe('both');
    expect(spec.easing).toBe('ease-out');
    expect(spec.delay).toBe(0);
    expect(spec.essential).toBe(false);
  });

  it('throws when recipe name is unknown', () => {
    expect(() => resolveAnimation({ recipe: 'does-not-exist' }, recipes))
      .toThrow(/unknown recipe: does-not-exist/i);
  });

  it('iterations=infinite passes through', () => {
    const inline: AnimationRef = {
      keyframes: [{ at: '0%' }, { at: '100%' }],
      duration: 1000,
      iterations: 'infinite',
    };
    const spec = resolveAnimation(inline, recipes);
    expect(spec.iterations).toBe('infinite');
  });

  it('essential=true passes through', () => {
    const inline: AnimationRef = {
      keyframes: [{ at: '0%' }, { at: '100%' }],
      duration: 200,
      essential: true,
    };
    const spec = resolveAnimation(inline, recipes);
    expect(spec.essential).toBe(true);
  });

  it('throws when ref has both recipe and keyframes (malformed input)', () => {
    const bad = {
      recipe: 'fade',
      keyframes: [{ at: '0%' }, { at: '100%' }],
      duration: 200,
    } as unknown as AnimationRef;
    expect(() => resolveAnimation(bad, recipes)).toThrow(
      /cannot have both 'recipe' and 'keyframes'/,
    );
  });

  it('inline animation preserves direction/fillMode defaults', () => {
    const inline: AnimationRef = {
      keyframes: [{ at: '0%' }, { at: '100%' }],
      duration: 200,
      direction: 'alternate',
      fillMode: 'forwards',
    };
    const spec = resolveAnimation(inline, recipes);
    expect(spec.direction).toBe('alternate');
    expect(spec.fillMode).toBe('forwards');
  });

  describe('defensive keyframe validation (I3)', () => {
    it('throws on empty keyframes', () => {
      const bad: AnimationRef = { keyframes: [], duration: 200 };
      expect(() => resolveAnimation(bad, recipes)).toThrow(/no keyframes/);
    });

    it('throws on non-monotonic at values', () => {
      const bad: AnimationRef = {
        keyframes: [
          { at: '0%' },
          { at: '50%' },
          { at: '30%' },
          { at: '100%' },
        ],
        duration: 200,
      };
      expect(() => resolveAnimation(bad, recipes)).toThrow(
        /monotonically non-decreasing/,
      );
    });

    it('throws on out-of-range at (<0%)', () => {
      const bad: AnimationRef = {
        keyframes: [{ at: '-10%' }, { at: '100%' }],
        duration: 200,
      };
      expect(() => resolveAnimation(bad, recipes)).toThrow(/\[0%, 100%\]/);
    });

    it('throws on out-of-range at (>100%)', () => {
      const bad: AnimationRef = {
        keyframes: [{ at: '0%' }, { at: '120%' }],
        duration: 200,
      };
      expect(() => resolveAnimation(bad, recipes)).toThrow(/\[0%, 100%\]/);
    });

    it('throws on invalid at format', () => {
      const bad: AnimationRef = {
        keyframes: [{ at: '0%' }, { at: 'middle' }],
        duration: 200,
      };
      expect(() => resolveAnimation(bad, recipes)).toThrow(/invalid keyframe 'at'/);
    });

    it('accepts equal consecutive fractions (monotonic non-decreasing, not strictly increasing)', () => {
      const borderline: AnimationRef = {
        keyframes: [
          { at: '0%' },
          { at: '50%' },
          { at: '50%' },
          { at: '100%' },
        ],
        duration: 200,
      };
      expect(() => resolveAnimation(borderline, recipes)).not.toThrow();
    });
  });
});
