// Task 11 — useShapeAnimations (RN) Layer 3 runner tests.
//
// Parity with the web runner (Task 10): ambient-only, dev-warn on non-ambient
// triggers, reduced-motion respects applyReducedMotion policy, composeRNStyle
// shared with useElementAnimations for identical RN cross-trigger semantics.
//
// Output shape: `{ animatedProps }` — consumer spreads onto
// `Animated.createAnimatedComponent(Path)` from react-native-svg. In the mock,
// useAnimatedProps evaluates the worklet synchronously at render time so
// end-state assertions work without timing flush.

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { useShapeAnimations } from '../../src/animation/useShapeAnimations.js';
import { ANIMATION_RECIPES } from 'mythik';
import type { ElementAnimations } from 'mythik';

function Harness({
  animations,
  staggerIndex,
  reducedMotion,
  onProps,
}: {
  animations: ElementAnimations | null;
  staggerIndex?: number;
  reducedMotion?: boolean;
  onProps: (p: Record<string, unknown>) => void;
}) {
  const { animatedProps } = useShapeAnimations(animations, {
    recipes: ANIMATION_RECIPES,
    staggerIndex,
    reducedMotion,
  });
  onProps(animatedProps);
  return null;
}

describe('useShapeAnimations (RN) — basic contract', () => {
  it('null animations → empty animatedProps', () => {
    const seen: Record<string, unknown>[] = [];
    render(<Harness animations={null} onProps={(p) => seen.push(p)} />);
    expect(seen[seen.length - 1]).toEqual({});
  });

  it('empty animations object → empty animatedProps', () => {
    const seen: Record<string, unknown>[] = [];
    render(<Harness animations={{}} onProps={(p) => seen.push(p)} />);
    expect(seen[seen.length - 1]).toEqual({});
  });

  it('ambient with recipe returns animatedProps with shared keys', () => {
    const seen: Record<string, unknown>[] = [];
    const anims: ElementAnimations = {
      ambient: {
        keyframes: [
          { at: '0%', opacity: 0 },
          { at: '100%', opacity: 1 },
        ],
        duration: 1000,
        iterations: 'infinite',
      },
    };
    render(<Harness animations={anims} onProps={(p) => seen.push(p)} />);
    // End-state (mock: withRepeat returns target = 1 → progress=1 → opacity=1)
    expect(seen[seen.length - 1].opacity).toBeDefined();
  });

  it('ambient with drift keyframes produces transform array', () => {
    const seen: Record<string, unknown>[] = [];
    const anims: ElementAnimations = {
      ambient: {
        keyframes: [
          { at: '0%', transform: { translateX: 0, translateY: 0 } },
          { at: '50%', transform: { translateX: 10, translateY: 5 } },
          { at: '100%', transform: { translateX: 0, translateY: 0 } },
        ],
        duration: 28000,
        iterations: 'infinite',
        direction: 'alternate',
      },
    };
    render(<Harness animations={anims} onProps={(p) => seen.push(p)} />);
    const last = seen[seen.length - 1];
    expect(last.transform).toBeDefined();
    expect(Array.isArray(last.transform)).toBe(true);
  });

  it('ambient array (drift + rotate + scale) composes multiple contributions', () => {
    const seen: Record<string, unknown>[] = [];
    const anims: ElementAnimations = {
      ambient: [
        {
          keyframes: [
            { at: '0%', transform: { translateX: 0, translateY: 0 } },
            { at: '100%', transform: { translateX: 8, translateY: 5 } },
          ],
          duration: 28000,
          iterations: 'infinite',
          direction: 'alternate',
        },
        {
          keyframes: [
            { at: '0%', transform: { rotate: -15 } },
            { at: '100%', transform: { rotate: 12 } },
          ],
          duration: 80000,
          iterations: 'infinite',
          direction: 'alternate',
        },
        {
          keyframes: [
            { at: '0%', transform: { scale: 1 } },
            { at: '100%', transform: { scale: 1.04 } },
          ],
          duration: 20000,
          iterations: 'infinite',
          direction: 'alternate',
        },
      ],
    };
    render(<Harness animations={anims} onProps={(p) => seen.push(p)} />);
    const last = seen[seen.length - 1];
    expect(last.transform).toBeDefined();
    // Composed transform array has multiple keys (translateX/Y, rotate, scale)
    // — each animation contributes its own keys, composeRNStyle merges by key.
    const transforms = last.transform as Array<Record<string, unknown>>;
    const keys = new Set<string>();
    for (const t of transforms) {
      for (const k of Object.keys(t)) keys.add(k);
    }
    expect(keys.has('translateX')).toBe(true);
    expect(keys.has('translateY')).toBe(true);
    expect(keys.has('rotate')).toBe(true);
    expect(keys.has('scale')).toBe(true);
  });

  it('array length beyond MAX_PER_TRIGGER (6) is clamped without throwing', () => {
    expect(() => {
      const anims: ElementAnimations = {
        ambient: Array.from({ length: 10 }, () => ({
          keyframes: [
            { at: '0%', opacity: 0 },
            { at: '100%', opacity: 1 },
          ],
          duration: 1000,
          iterations: 'infinite' as const,
        })),
      };
      render(<Harness animations={anims} onProps={() => undefined} />);
    }).not.toThrow();
  });

  it('unmount does not throw', () => {
    const anims: ElementAnimations = {
      ambient: {
        keyframes: [
          { at: '0%', opacity: 0 },
          { at: '100%', opacity: 1 },
        ],
        duration: 1000,
        iterations: 'infinite',
      },
    };
    const { unmount } = render(<Harness animations={anims} onProps={() => undefined} />);
    expect(() => unmount()).not.toThrow();
  });
});

describe('useShapeAnimations (RN) — ambient-only scope (plan 3 Task 11 M3 parity)', () => {
  it('ignores non-ambient triggers with a dev-mode warning', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const seen: Record<string, unknown>[] = [];
    render(
      <Harness
        animations={{
          hover: {
            keyframes: [
              { at: '0%', opacity: 1 },
              { at: '100%', opacity: 0.8 },
            ],
            duration: 200,
          },
          mount: { recipe: 'fade-up' },
        }}
        onProps={(p) => seen.push(p)}
      />,
    );
    // Non-ambient triggers contribute nothing to animatedProps.
    expect(seen[seen.length - 1]).toEqual({});
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/useShapeAnimations.*ignoring non-ambient/),
    );
    const msg = warnSpy.mock.calls[0][0] as string;
    expect(msg).toContain('hover');
    expect(msg).toContain('mount');
    warnSpy.mockRestore();
  });

  it('does NOT warn when only ambient is set', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Harness
        animations={{
          ambient: {
            keyframes: [
              { at: '0%', opacity: 0 },
              { at: '100%', opacity: 1 },
            ],
            duration: 1000,
          },
        }}
        onProps={() => undefined}
      />,
    );
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('useShapeAnimations (RN) — reduced-motion parity', () => {
  it('reducedMotion=true: decorative ambient disabled → empty props', () => {
    const seen: Record<string, unknown>[] = [];
    render(
      <Harness
        animations={{
          ambient: {
            keyframes: [
              { at: '0%', transform: { translateX: 0 } },
              { at: '100%', transform: { translateX: 10 } },
            ],
            duration: 1000,
            iterations: 'infinite',
          },
        }}
        reducedMotion
        onProps={(p) => seen.push(p)}
      />,
    );
    // Pure transform ambient is decorative — applyReducedMotion returns null
    // → no contribution → empty animatedProps.
    expect(seen[seen.length - 1]).toEqual({});
  });

  it('reducedMotion=true: essential: true bypasses policy', () => {
    const seen: Record<string, unknown>[] = [];
    render(
      <Harness
        animations={{
          ambient: {
            keyframes: [
              { at: '0%', transform: { rotate: 0 } },
              { at: '100%', transform: { rotate: 360 } },
            ],
            duration: 1000,
            iterations: 'infinite',
            essential: true,
          },
        }}
        reducedMotion
        onProps={(p) => seen.push(p)}
      />,
    );
    // essential: true → bypass → full contribution
    expect(seen[seen.length - 1].transform).toBeDefined();
  });
});
