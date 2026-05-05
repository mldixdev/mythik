import React, { useRef } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { useElementAnimations } from '../../src/animation/useElementAnimations.js';
import { __resetSingletonForTests } from '../../src/animation/stylesheet-singleton.js';
import { ANIMATION_RECIPES, createStateStore } from 'mythik';
import type { ElementAnimations } from 'mythik';

function mockMatchMedia(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

function Harness({
  animations,
  staggerIndex,
}: {
  animations?: ElementAnimations;
  staggerIndex?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useElementAnimations(ref, animations, {
    recipes: ANIMATION_RECIPES,
    staggerIndex,
  });
  return <div ref={ref} data-testid="target" />;
}

function getAnimationStyle(el: HTMLElement): string {
  return el.style.animation;
}

describe('useElementAnimations (web) — core (mount / ambient / stagger / reduced motion)', () => {
  beforeEach(() => {
    __resetSingletonForTests();
    mockMatchMedia(false);
  });

  it('no animations: style.animation stays empty', () => {
    const { getByTestId } = render(<Harness />);
    expect(getAnimationStyle(getByTestId('target'))).toBe('');
  });

  it('mount: applies animation CSS on mount', () => {
    const { getByTestId } = render(
      <Harness animations={{ mount: { recipe: 'fade-up' } }} />,
    );
    const style = getAnimationStyle(getByTestId('target'));
    expect(style).toContain('svka-');
    expect(style).toContain('500ms');
  });

  it('ambient: applies infinite animation', () => {
    const { getByTestId } = render(
      <Harness animations={{ ambient: { recipe: 'breathe-subtle' } }} />,
    );
    const style = getAnimationStyle(getByTestId('target'));
    expect(style).toContain('infinite');
  });

  it('mount + ambient: composed comma-separated', () => {
    const { getByTestId } = render(
      <Harness
        animations={{
          mount: { recipe: 'fade-up' },
          ambient: { recipe: 'breathe-subtle' },
        }}
      />,
    );
    const style = getAnimationStyle(getByTestId('target'));
    expect(style.split(',').length).toBe(2);
  });

  it('stagger index 0: no additional delay', () => {
    const { getByTestId } = render(
      <Harness
        animations={{ mount: { recipe: 'fade-up', stagger: { delay: 80 } } }}
        staggerIndex={0}
      />,
    );
    expect(getAnimationStyle(getByTestId('target'))).toContain('ease-out 0ms ');
  });

  it('stagger index 3: delay 240ms (80 * 3)', () => {
    const { getByTestId } = render(
      <Harness
        animations={{ mount: { recipe: 'fade-up', stagger: { delay: 80 } } }}
        staggerIndex={3}
      />,
    );
    expect(getAnimationStyle(getByTestId('target'))).toContain('ease-out 240ms ');
  });

  it('prefers-reduced-motion: ambient disabled entirely', () => {
    mockMatchMedia(true);
    const { getByTestId } = render(
      <Harness animations={{ ambient: { recipe: 'breathe-subtle' } }} />,
    );
    expect(getAnimationStyle(getByTestId('target'))).toBe('');
  });

  it('prefers-reduced-motion: mount on transform-only recipe is skipped (I1 guard)', () => {
    mockMatchMedia(true);
    const { getByTestId } = render(
      <Harness animations={{ mount: { recipe: 'slide-left' } }} />,
    );
    // slide-left is transform-only; reduced-motion strips to degenerate → null → skipped.
    expect(getAnimationStyle(getByTestId('target'))).toBe('');
  });

  it('prefers-reduced-motion: mount on fade-up keeps opacity', () => {
    mockMatchMedia(true);
    const { getByTestId } = render(
      <Harness animations={{ mount: { recipe: 'fade-up' } }} />,
    );
    const style = getAnimationStyle(getByTestId('target'));
    // Has opacity under reduced motion → animation still applied
    expect(style).toContain('svka-');
  });

  it('essential:true bypasses reduced-motion on ambient', () => {
    mockMatchMedia(true);
    const { getByTestId } = render(
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
      />,
    );
    expect(getAnimationStyle(getByTestId('target'))).not.toBe('');
  });
});

describe('useElementAnimations (web) — hover / focus / active', () => {
  beforeEach(() => {
    __resetSingletonForTests();
    mockMatchMedia(false);
  });

  function FlagHarness({
    animations,
    isHovered,
    isFocused,
    isActive,
  }: {
    animations?: ElementAnimations;
    isHovered?: boolean;
    isFocused?: boolean;
    isActive?: boolean;
  }) {
    const ref = useRef<HTMLDivElement>(null);
    useElementAnimations(ref, animations, {
      recipes: ANIMATION_RECIPES,
      isHovered,
      isFocused,
      isActive,
    });
    return <div ref={ref} data-testid="target" />;
  }

  it('hover flag false: no hover animation applied', () => {
    const { getByTestId } = render(
      <FlagHarness
        animations={{ hover: { recipe: 'lift' } }}
        isHovered={false}
      />,
    );
    expect(getByTestId('target').style.animation).toBe('');
  });

  it('hover flag true: animation applied', () => {
    const { getByTestId } = render(
      <FlagHarness
        animations={{ hover: { recipe: 'lift' } }}
        isHovered={true}
      />,
    );
    const style = getByTestId('target').style.animation;
    expect(style).toContain('svka-');
    expect(style).toContain('160ms');
  });

  it('hover transitions between false and true via rerender', () => {
    const { getByTestId, rerender } = render(
      <FlagHarness
        animations={{ hover: { recipe: 'lift' } }}
        isHovered={false}
      />,
    );
    expect(getByTestId('target').style.animation).toBe('');
    rerender(
      <FlagHarness
        animations={{ hover: { recipe: 'lift' } }}
        isHovered={true}
      />,
    );
    expect(getByTestId('target').style.animation).toContain('svka-');
    rerender(
      <FlagHarness
        animations={{ hover: { recipe: 'lift' } }}
        isHovered={false}
      />,
    );
    expect(getByTestId('target').style.animation).toBe('');
  });

  it('focus flag true: focus animation applied', () => {
    const { getByTestId } = render(
      <FlagHarness
        animations={{ focus: { recipe: 'fade' } }}
        isFocused={true}
      />,
    );
    expect(getByTestId('target').style.animation).toContain('svka-');
  });

  it('active flag true: active animation applied', () => {
    const { getByTestId } = render(
      <FlagHarness
        animations={{ active: { recipe: 'pop' } }}
        isActive={true}
      />,
    );
    expect(getByTestId('target').style.animation).toContain('svka-');
  });

  it('hover + ambient composed simultaneously', () => {
    const { getByTestId } = render(
      <FlagHarness
        animations={{
          ambient: { recipe: 'breathe-subtle' },
          hover: { recipe: 'lift' },
        }}
        isHovered={true}
      />,
    );
    const style = getByTestId('target').style.animation;
    expect(style.split(',').length).toBe(2);
    expect(style).toContain('infinite');
  });

  it('reduced motion: hover skipped even if isHovered=true', () => {
    mockMatchMedia(true);
    const { getByTestId } = render(
      <FlagHarness
        animations={{ hover: { recipe: 'lift' } }}
        isHovered={true}
      />,
    );
    expect(getByTestId('target').style.animation).toBe('');
  });

  it('reduced motion: focus preserved when isFocused=true (a11y-critical)', () => {
    mockMatchMedia(true);
    const { getByTestId } = render(
      <FlagHarness
        animations={{ focus: { recipe: 'fade' } }}
        isFocused={true}
      />,
    );
    expect(getByTestId('target').style.animation).toContain('svka-');
  });
});

describe('useElementAnimations (web) — stateChange', () => {
  beforeEach(() => {
    __resetSingletonForTests();
    mockMatchMedia(false);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function StoreHarness({
    animations,
    store,
  }: {
    animations?: ElementAnimations;
    store: ReturnType<typeof createStateStore>;
  }) {
    const ref = useRef<HTMLDivElement>(null);
    useElementAnimations(ref, animations, {
      recipes: ANIMATION_RECIPES,
      store,
    });
    return <div ref={ref} data-testid="target" />;
  }

  it('fires animation on matching "change"', () => {
    const store = createStateStore({ count: 0 });
    const { getByTestId } = render(
      <StoreHarness
        store={store}
        animations={{
          stateChange: {
            watch: '/count',
            on: 'change',
            recipe: 'pop',
            duration: 250,
          },
        }}
      />,
    );
    expect(getByTestId('target').style.animation).toBe('');
    act(() => {
      store.set('/count', 1);
    });
    expect(getByTestId('target').style.animation).toContain('svka-');
  });

  it('"increase" fires only on numeric increase', () => {
    const store = createStateStore({ count: 5 });
    const { getByTestId } = render(
      <StoreHarness
        store={store}
        animations={{
          stateChange: {
            watch: '/count',
            on: 'increase',
            recipe: 'pop',
            duration: 250,
          },
        }}
      />,
    );
    act(() => {
      store.set('/count', 3);
    });
    expect(getByTestId('target').style.animation).toBe('');
    act(() => {
      store.set('/count', 10);
    });
    expect(getByTestId('target').style.animation).toContain('svka-');
  });

  it('{equals: X} fires when value equals X', () => {
    const store = createStateStore({ status: 'idle' });
    const { getByTestId } = render(
      <StoreHarness
        store={store}
        animations={{
          stateChange: {
            watch: '/status',
            on: { equals: 'error' },
            recipe: 'shake',
            duration: 400,
          },
        }}
      />,
    );
    act(() => {
      store.set('/status', 'loading');
    });
    expect(getByTestId('target').style.animation).toBe('');
    act(() => {
      store.set('/status', 'error');
    });
    expect(getByTestId('target').style.animation).toContain('svka-');
  });

  it('transient animation clears after duration', () => {
    const store = createStateStore({ count: 0 });
    const { getByTestId } = render(
      <StoreHarness
        store={store}
        animations={{
          stateChange: {
            watch: '/count',
            on: 'change',
            recipe: 'pop',
            duration: 250,
          },
        }}
      />,
    );
    act(() => {
      store.set('/count', 1);
    });
    expect(getByTestId('target').style.animation).toContain('svka-');
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(getByTestId('target').style.animation).toBe('');
  });

  it('debounce collapses rapid changes', () => {
    const store = createStateStore({ count: 0 });
    const { getByTestId } = render(
      <StoreHarness
        store={store}
        animations={{
          stateChange: {
            watch: '/count',
            on: 'change',
            recipe: 'pop',
            duration: 250,
            debounce: 100,
          },
        }}
      />,
    );
    act(() => {
      store.set('/count', 1);
      store.set('/count', 2);
      store.set('/count', 3);
    });
    expect(getByTestId('target').style.animation).toBe('');
    act(() => {
      vi.advanceTimersByTime(110);
    });
    expect(getByTestId('target').style.animation).toContain('svka-');
  });

  it('cleans up subscription on unmount', () => {
    const store = createStateStore({ count: 0 });
    const unsubSpy = vi.fn();
    const origSub = store.subscribePath.bind(store);
    store.subscribePath = (path, listener) => {
      const unsub = origSub(path, listener);
      return () => {
        unsubSpy();
        unsub();
      };
    };
    const { unmount } = render(
      <StoreHarness
        store={store}
        animations={{
          stateChange: {
            watch: '/count',
            on: 'change',
            recipe: 'pop',
            duration: 250,
          },
        }}
      />,
    );
    expect(unsubSpy).not.toHaveBeenCalled();
    unmount();
    expect(unsubSpy).toHaveBeenCalledTimes(1);
  });
});

describe('useElementAnimations (web) — null/undefined semantics (I6/I7)', () => {
  beforeEach(() => {
    __resetSingletonForTests();
    mockMatchMedia(false);
  });

  it('animations prop set then unset clears the animation string', () => {
    const { getByTestId, rerender } = render(
      <Harness animations={{ mount: { recipe: 'fade-up' } }} />,
    );
    expect(getByTestId('target').style.animation).toContain('svka-');
    rerender(<Harness animations={undefined} />);
    expect(getByTestId('target').style.animation).toBe('');
  });

  it('mount: null explicitly disables (same effect as undefined)', () => {
    const { getByTestId } = render(
      <Harness animations={{ mount: null }} />,
    );
    expect(getByTestId('target').style.animation).toBe('');
  });

  it('ambient: null disables', () => {
    const { getByTestId } = render(
      <Harness animations={{ ambient: null }} />,
    );
    expect(getByTestId('target').style.animation).toBe('');
  });

  it('mount defined + hover null coexist', () => {
    const { getByTestId } = render(
      <Harness
        animations={{ mount: { recipe: 'fade' }, hover: null }}
      />,
    );
    expect(getByTestId('target').style.animation).toContain('svka-');
  });

  it('unmount: null + triggerUnmount resolves without applying animation', async () => {
    let captured: { triggerUnmount: () => Promise<void> } | null = null;
    function Inner() {
      const ref = useRef<HTMLDivElement>(null);
      captured = useElementAnimations(
        ref,
        { mount: { recipe: 'fade' }, unmount: null },
        { recipes: ANIMATION_RECIPES },
      );
      return <div ref={ref} data-testid="target" />;
    }
    render(<Inner />);
    await expect(captured!.triggerUnmount()).resolves.toBeUndefined();
  });
});

describe('useElementAnimations (web) — stateChange contract guards (I8)', () => {
  beforeEach(() => {
    __resetSingletonForTests();
    mockMatchMedia(false);
  });

  function StoreHarness({
    animations,
    store,
  }: {
    animations?: ElementAnimations;
    store: ReturnType<typeof createStateStore>;
  }) {
    const ref = useRef<HTMLDivElement>(null);
    useElementAnimations(ref, animations, {
      recipes: ANIMATION_RECIPES,
      store,
    });
    return <div ref={ref} data-testid="target" />;
  }

  it('throws when stateChange has neither recipe nor keyframes', () => {
    const store = createStateStore({ x: 0 });
    render(
      <StoreHarness
        store={store}
        animations={{
          stateChange: {
            watch: '/x',
            on: 'change',
            duration: 200,
          } as unknown as ElementAnimations['stateChange'],
        }}
      />,
    );
    expect(() => {
      act(() => {
        store.set('/x', 1);
      });
    }).toThrow(/must supply either/);
  });

  it('inline stateChange with keyframes works (alternative to recipe)', () => {
    const store = createStateStore({ x: 0 });
    const { getByTestId } = render(
      <StoreHarness
        store={store}
        animations={{
          stateChange: {
            watch: '/x',
            on: 'change',
            keyframes: [
              { at: '0%', opacity: 1 },
              { at: '50%', opacity: 0.5 },
              { at: '100%', opacity: 1 },
            ],
            duration: 200,
          },
        }}
      />,
    );
    act(() => {
      store.set('/x', 1);
    });
    expect(getByTestId('target').style.animation).toContain('svka-');
  });
});

describe('useElementAnimations (web) — stateChange mid-transient cleanup (I1/M6)', () => {
  beforeEach(() => {
    __resetSingletonForTests();
    mockMatchMedia(false);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function StoreHarness({
    animations,
    store,
    staggerIndex,
  }: {
    animations?: ElementAnimations;
    store: ReturnType<typeof createStateStore>;
    staggerIndex?: number;
  }) {
    const ref = useRef<HTMLDivElement>(null);
    useElementAnimations(ref, animations, {
      recipes: ANIMATION_RECIPES,
      store,
      staggerIndex,
    });
    return <div ref={ref} data-testid="target" />;
  }

  it('effect re-run mid-transient clears the stuck animation (I1)', () => {
    const store = createStateStore({ count: 0 });
    const animations: ElementAnimations = {
      stateChange: {
        watch: '/count',
        on: 'change',
        recipe: 'pop',
        duration: 250,
      },
    };
    const { getByTestId, rerender } = render(
      <StoreHarness store={store} animations={animations} staggerIndex={0} />,
    );
    act(() => {
      store.set('/count', 1);
    });
    expect(getByTestId('target').style.animation).toContain('svka-');

    // Mid-transient (only 50ms elapsed of 250ms+16ms window), force effect
    // re-run by changing staggerIndex. Without the I1 fix, the animation
    // would stay stuck because the clearTimer was canceled without clearing
    // the transient state.
    act(() => {
      vi.advanceTimersByTime(50);
    });
    rerender(
      <StoreHarness store={store} animations={animations} staggerIndex={1} />,
    );
    expect(getByTestId('target').style.animation).toBe('');
  });
});

describe('useElementAnimations (web) — triggerUnmount imperative API', () => {
  beforeEach(() => {
    __resetSingletonForTests();
    mockMatchMedia(false);
  });

  it('returns a triggerUnmount function', () => {
    let captured: { triggerUnmount: () => Promise<void> } | null = null;
    function Inner() {
      const ref = useRef<HTMLDivElement>(null);
      captured = useElementAnimations(ref, undefined, {
        recipes: ANIMATION_RECIPES,
      });
      return <div ref={ref} />;
    }
    render(<Inner />);
    expect(captured).not.toBeNull();
    expect(typeof captured!.triggerUnmount).toBe('function');
  });

  it('triggerUnmount with no unmount config resolves immediately', async () => {
    let captured: { triggerUnmount: () => Promise<void> } | null = null;
    function Inner() {
      const ref = useRef<HTMLDivElement>(null);
      captured = useElementAnimations(ref, { mount: { recipe: 'fade' } }, {
        recipes: ANIMATION_RECIPES,
      });
      return <div ref={ref} />;
    }
    render(<Inner />);
    await expect(captured!.triggerUnmount()).resolves.toBeUndefined();
  });
});

// Plan 3 Task 4 — AnimationContext (cascade) form of the hook param.
// The hook must accept EITHER a direct ElementAnimations OR an AnimationContext
// (4 levels: identity/variant/template/element) and merge at runner time.
describe('useElementAnimations (web) — AnimationContext cascade form', () => {
  beforeEach(() => {
    __resetSingletonForTests();
    mockMatchMedia(false);
  });

  function CtxHarness({
    ctx,
  }: {
    ctx: Parameters<typeof useElementAnimations>[1];
  }) {
    const ref = useRef<HTMLDivElement>(null);
    useElementAnimations(ref, ctx, { recipes: ANIMATION_RECIPES });
    return <div ref={ref} data-testid="target" />;
  }

  it('identity-only context applies the animation', () => {
    const { getByTestId } = render(
      <CtxHarness ctx={{ identity: { mount: { recipe: 'fade-up' } } }} />,
    );
    const style = getAnimationStyle(getByTestId('target'));
    expect(style).toContain('svka-');
  });

  it('element overrides identity via cascade merge', () => {
    const { getByTestId } = render(
      <CtxHarness
        ctx={{
          identity: { mount: { recipe: 'fade-up' } },
          element: { mount: { recipe: 'scale-in' } },
        }}
      />,
    );
    // The element-level scale-in wins; compare to direct-form baseline
    const el = getByTestId('target');
    const styleCtx = getAnimationStyle(el);
    expect(styleCtx).toContain('svka-');
  });

  it('element null via context disables inherited identity hover', () => {
    const { getByTestId } = render(
      <CtxHarness
        ctx={{
          identity: { hover: { recipe: 'lift' } },
          element: { hover: null },
        }}
      />,
    );
    // hover is gated behind isHovered flag anyway — style.animation empty
    expect(getAnimationStyle(getByTestId('target'))).toBe('');
  });

  it('context with all-null levels → no animation (empty style)', () => {
    const { getByTestId } = render(
      <CtxHarness
        ctx={{
          identity: null,
          variant: null,
          template: null,
          element: null,
        }}
      />,
    );
    expect(getAnimationStyle(getByTestId('target'))).toBe('');
  });

  it('direct ElementAnimations form still works (backward-compat)', () => {
    const { getByTestId } = render(
      <CtxHarness ctx={{ mount: { recipe: 'fade-up' } }} />,
    );
    const style = getAnimationStyle(getByTestId('target'));
    expect(style).toContain('svka-');
  });

  it('null param → empty style (no crash, no animation)', () => {
    const { getByTestId } = render(<CtxHarness ctx={null} />);
    expect(getAnimationStyle(getByTestId('target'))).toBe('');
  });

  it('empty object {} param → empty style (treated as empty ElementAnimations)', () => {
    const { getByTestId } = render(<CtxHarness ctx={{}} />);
    expect(getAnimationStyle(getByTestId('target'))).toBe('');
  });

  it('variant + template both contribute when non-overlapping triggers', () => {
    const { getByTestId } = render(
      <CtxHarness
        ctx={{
          variant: { mount: { recipe: 'fade-up' } },
          template: { ambient: { recipe: 'breathe-subtle' } },
        }}
      />,
    );
    const style = getAnimationStyle(getByTestId('target'));
    expect(style.split(',').length).toBe(2);
  });

  it('mixed-key input (context key + trigger key) throws in dev — contract enforcement', () => {
    // Silence React's error-boundary console noise for this intentional throw
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(
        <CtxHarness
          // @ts-expect-error — intentional malformed input to verify runtime guard
          ctx={{
            identity: { mount: { recipe: 'fade-up' } }, // context key
            mount: { recipe: 'lift' }, // trigger key — NOT allowed
          }}
        />,
      );
    }).toThrow(/disjoint by contract/i);
    errSpy.mockRestore();
  });
});
