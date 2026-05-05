// Task 10 — useShapeAnimations (web) Layer 3 runner tests.
//
// Pins the contract that the hook attaches CSS animations to an SVG-child
// `<path>` / `<circle>` / etc. via `el.style.animation`, consumes ONLY the
// `ambient` trigger (SVG children have no hover/focus/active contract in plan
// 3 scope), and cleans up on unmount. Keyframes are registered exactly once
// into the plan-2 stylesheet singleton so multiple shapes can reuse the same
// recipe without per-instance CSS duplication.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { useRef } from 'react';
import { useShapeAnimations } from '../../src/animation/useShapeAnimations.js';
import { __resetSingletonForTests } from '../../src/animation/stylesheet-singleton.js';
import { ANIMATION_RECIPES } from 'mythik';
import type { ElementAnimations } from 'mythik';

function TestShape({
  animations,
  staggerIndex,
}: {
  animations: ElementAnimations | null;
  staggerIndex?: number;
}) {
  const ref = useRef<SVGPathElement>(null);
  useShapeAnimations(ref, animations, {
    recipes: ANIMATION_RECIPES,
    staggerIndex,
  });
  return (
    <svg viewBox="0 0 100 100">
      <path ref={ref} d="M0,0 L100,0 L50,100 Z" />
    </svg>
  );
}

beforeEach(() => {
  __resetSingletonForTests();
});

describe('useShapeAnimations (web)', () => {
  it('null animations → no animation attached', () => {
    const { container } = render(<TestShape animations={null} />);
    const path = container.querySelector('path') as SVGPathElement;
    expect(path).toBeTruthy();
    expect(path.style.animation).toBe('');
  });

  it('empty object animations → no animation attached (treated as "no ambient")', () => {
    const { container } = render(<TestShape animations={{}} />);
    const path = container.querySelector('path') as SVGPathElement;
    expect(path.style.animation).toBe('');
  });

  it('ambient with inline drift animation attaches a CSS animation shorthand', () => {
    const { container } = render(
      <TestShape
        animations={{
          ambient: {
            keyframes: [
              { at: '0%', transform: { translateX: 0, translateY: 0 } },
              { at: '100%', transform: { translateX: 10, translateY: 5 } },
            ],
            duration: '10s',
            iterations: 'infinite',
          },
        }}
      />,
    );
    const path = container.querySelector('path') as SVGPathElement;
    // Shape runner produces one animation with a hashed keyframes name;
    // the shorthand includes the hash prefix + duration in ms.
    expect(path.style.animation).toMatch(/\S+\s+10000ms/);
    expect(path.style.animation).toMatch(/infinite/);
  });

  it('ambient as array of 3 InlineAnimations composes via comma-separated shorthand', () => {
    const { container } = render(
      <TestShape
        animations={{
          ambient: [
            {
              keyframes: [
                { at: '0%', transform: { translateX: 0, translateY: 0 } },
                { at: '100%', transform: { translateX: 8, translateY: 5 } },
              ],
              duration: '28s',
              iterations: 'infinite',
              direction: 'alternate',
            },
            {
              keyframes: [
                { at: '0%', transform: { rotate: '-15deg' } },
                { at: '100%', transform: { rotate: '12deg' } },
              ],
              duration: '80s',
              iterations: 'infinite',
              direction: 'alternate',
            },
            {
              keyframes: [
                { at: '0%', transform: { scale: 1 } },
                { at: '100%', transform: { scale: 1.04 } },
              ],
              duration: '20s',
              iterations: 'infinite',
              direction: 'alternate',
            },
          ],
        }}
      />,
    );
    const path = container.querySelector('path') as SVGPathElement;
    // Three animations → two commas in the shorthand.
    const commas = (path.style.animation.match(/,/g) ?? []).length;
    expect(commas).toBe(2);
    // All three durations appear
    expect(path.style.animation).toContain('28000ms');
    expect(path.style.animation).toContain('80000ms');
    expect(path.style.animation).toContain('20000ms');
  });

  it('ignores non-ambient triggers with a dev-mode warning (plan 3 scope: Layer 3 is ambient-only)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { container } = render(
      <TestShape
        animations={{
          hover: {
            keyframes: [
              { at: '0%', opacity: 1 },
              { at: '100%', opacity: 0.8 },
            ],
            duration: '200ms',
          },
          mount: { recipe: 'fade-up' },
        }}
      />,
    );
    const path = container.querySelector('path') as SVGPathElement;
    // No ambient → no animation, even though other triggers are set.
    expect(path.style.animation).toBe('');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/useShapeAnimations.*ignoring non-ambient/),
    );
    const msg = warnSpy.mock.calls[0][0] as string;
    expect(msg).toContain('hover');
    expect(msg).toContain('mount');
    warnSpy.mockRestore();
  });

  it('does NOT warn when only ambient is set alongside (no other triggers)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <TestShape
        animations={{
          ambient: {
            keyframes: [
              { at: '0%', opacity: 0 },
              { at: '100%', opacity: 1 },
            ],
            duration: '1s',
          },
        }}
      />,
    );
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('reducedMotion=true filters ambient animations (applyReducedMotion policy)', () => {
    function ReducedShape({ animations }: { animations: ElementAnimations | null }) {
      const ref = useRef<SVGPathElement>(null);
      useShapeAnimations(ref, animations, {
        recipes: ANIMATION_RECIPES,
        reducedMotion: true,
      });
      return (
        <svg viewBox="0 0 100 100">
          <path ref={ref} d="M0,0 L100,0 L50,100 Z" />
        </svg>
      );
    }
    const { container } = render(
      <ReducedShape
        animations={{
          ambient: {
            // Pure opacity fade is a non-essential decorative animation —
            // applyReducedMotion returns null (disables ambient in reduced
            // mode per plan-2 policy).
            keyframes: [
              { at: '0%', transform: { translateX: 0 } },
              { at: '100%', transform: { translateX: 10 } },
            ],
            duration: '1s',
            iterations: 'infinite',
          },
        }}
      />,
    );
    const path = container.querySelector('path') as SVGPathElement;
    expect(path.style.animation).toBe('');
  });

  it('resolves recipe references via options.recipes', () => {
    // 'pulse-primary' doesn't exist; use an actual recipe from ANIMATION_RECIPES.
    // Pick 'pulse' — a known recipe name — and rely on the hash match.
    const recipeName = Object.keys(ANIMATION_RECIPES)[0];
    const { container } = render(
      <TestShape animations={{ ambient: { recipe: recipeName } }} />,
    );
    const path = container.querySelector('path') as SVGPathElement;
    expect(path.style.animation).not.toBe('');
  });

  it('re-renders with different animations update the shorthand', () => {
    const { container, rerender } = render(
      <TestShape
        animations={{
          ambient: {
            keyframes: [
              { at: '0%', opacity: 0 },
              { at: '100%', opacity: 1 },
            ],
            duration: '1s',
          },
        }}
      />,
    );
    const path = container.querySelector('path') as SVGPathElement;
    const first = path.style.animation;
    expect(first).toContain('1000ms');

    rerender(
      <TestShape
        animations={{
          ambient: {
            keyframes: [
              { at: '0%', opacity: 0 },
              { at: '100%', opacity: 1 },
            ],
            duration: '2s',
          },
        }}
      />,
    );
    expect(path.style.animation).toContain('2000ms');
    expect(path.style.animation).not.toBe(first);
  });

  it('transitioning to null animations clears the style', () => {
    const { container, rerender } = render(
      <TestShape
        animations={{
          ambient: {
            keyframes: [
              { at: '0%', opacity: 0 },
              { at: '100%', opacity: 1 },
            ],
            duration: '1s',
          },
        }}
      />,
    );
    const path = container.querySelector('path') as SVGPathElement;
    expect(path.style.animation).not.toBe('');

    rerender(<TestShape animations={null} />);
    expect(path.style.animation).toBe('');
  });

  it('unmount does not throw', () => {
    const { unmount } = render(
      <TestShape animations={{ ambient: { recipe: Object.keys(ANIMATION_RECIPES)[0] } }} />,
    );
    expect(() => unmount()).not.toThrow();
  });

  it('staggerIndex multiplies the stagger delay', () => {
    const { container } = render(
      <TestShape
        animations={{
          ambient: {
            keyframes: [
              { at: '0%', opacity: 0 },
              { at: '100%', opacity: 1 },
            ],
            duration: '1s',
            stagger: { delay: 100 },
          },
        }}
        staggerIndex={3}
      />,
    );
    const path = container.querySelector('path') as SVGPathElement;
    // stagger.delay * staggerIndex = 300ms delay; verify the shorthand
    // contains 300ms at the delay position.
    expect(path.style.animation).toMatch(/300ms/);
  });

  it('handles SVG circle element ref equally (not just path)', () => {
    function CircleShape({ animations }: { animations: ElementAnimations | null }) {
      const ref = useRef<SVGCircleElement>(null);
      useShapeAnimations(ref, animations, { recipes: ANIMATION_RECIPES });
      return (
        <svg viewBox="0 0 100 100">
          <circle ref={ref} cx="50" cy="50" r="40" />
        </svg>
      );
    }
    const { container } = render(
      <CircleShape
        animations={{
          ambient: {
            keyframes: [
              { at: '0%', opacity: 0 },
              { at: '100%', opacity: 1 },
            ],
            duration: '500ms',
          },
        }}
      />,
    );
    const circle = container.querySelector('circle') as SVGCircleElement;
    expect(circle.style.animation).toContain('500ms');
  });
});
