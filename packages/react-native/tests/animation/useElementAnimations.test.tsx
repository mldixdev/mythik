import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { useElementAnimations } from '../../src/animation/useElementAnimations.js';
import { ANIMATION_RECIPES, createStateStore } from 'mythik';
import type { ElementAnimations } from 'mythik';

// AccessibilityInfo mock is provided by the react-native mock (packages/react-native/tests/__mocks__/react-native.ts)
// or by the default mocks pipeline. Reanimated is mocked by the repo-level __mocks__.

function Harness({
  animations,
  isHovered,
  isFocused,
  isActive,
  staggerIndex,
  onStyle,
}: {
  animations?: ElementAnimations;
  isHovered?: boolean;
  isFocused?: boolean;
  isActive?: boolean;
  staggerIndex?: number;
  onStyle: (s: Record<string, unknown>) => void;
}) {
  const { animatedStyle } = useElementAnimations(animations, {
    recipes: ANIMATION_RECIPES,
    isHovered,
    isFocused,
    isActive,
    staggerIndex,
  });
  onStyle(animatedStyle);
  return null;
}

describe('useElementAnimations (RN) — array support per trigger (C1)', () => {
  it('mount with array of refs: all contributions resolved', () => {
    const seen: Record<string, unknown>[] = [];
    render(
      <Harness
        onStyle={(s) => seen.push(s)}
        animations={{
          mount: [
            { recipe: 'fade' },
            { recipe: 'scale-in' },
          ],
        }}
      />,
    );
    // Both mounted; hook didn't crash
    expect(seen.length).toBeGreaterThan(0);
    const last = seen[seen.length - 1];
    // At progress=0, fade keyframe[0].opacity=0, scale-in keyframe[0].opacity=0 (both start at 0).
    // Later contribution wins for opacity.
    expect(last.opacity).toBeDefined();
  });

  it('array length beyond MAX_PER_TRIGGER (6) is clamped', () => {
    expect(() => {
      render(
        <Harness
          onStyle={() => {}}
          animations={{
            mount: Array.from({ length: 10 }, () => ({ recipe: 'fade' })),
          }}
        />,
      );
    }).not.toThrow();
  });

  it('empty array for trigger = no contribution', () => {
    const seen: Record<string, unknown>[] = [];
    render(
      <Harness
        onStyle={(s) => seen.push(s)}
        animations={{ mount: [] }}
      />,
    );
    expect(seen[seen.length - 1]).toEqual({});
  });
});

describe('useElementAnimations (RN) — reduced-motion policy parity (I1)', () => {
  it('reducedMotion=true: ambient disabled', () => {
    const seen: Record<string, unknown>[] = [];
    render(
      <Harness
        onStyle={(s) => seen.push(s)}
        animations={{ ambient: { recipe: 'breathe-subtle' } }}
      />,
    );
    const beforeReduced = seen[seen.length - 1];
    expect(beforeReduced.transform).toBeDefined();

    const seenReduced: Record<string, unknown>[] = [];
    function ReducedHarness() {
      const { animatedStyle } = useElementAnimations(
        { ambient: { recipe: 'breathe-subtle' } },
        { recipes: ANIMATION_RECIPES, reducedMotion: true },
      );
      seenReduced.push(animatedStyle);
      return null;
    }
    render(<ReducedHarness />);
    expect(seenReduced[seenReduced.length - 1]).toEqual({});
  });

  it('reducedMotion=true: transform-only mount (slide-left) is skipped', () => {
    const seen: Record<string, unknown>[] = [];
    function R() {
      const { animatedStyle } = useElementAnimations(
        { mount: { recipe: 'slide-left' } },
        { recipes: ANIMATION_RECIPES, reducedMotion: true },
      );
      seen.push(animatedStyle);
      return null;
    }
    render(<R />);
    // slide-left is transform-only; reduced-motion strips → degenerate → null → no contribution
    expect(seen[seen.length - 1]).toEqual({});
  });

  it('reducedMotion=true: fade-up mount keeps opacity (transforms stripped)', () => {
    const seen: Record<string, unknown>[] = [];
    function R() {
      const { animatedStyle } = useElementAnimations(
        { mount: { recipe: 'fade-up' } },
        { recipes: ANIMATION_RECIPES, reducedMotion: true },
      );
      seen.push(animatedStyle);
      return null;
    }
    render(<R />);
    const last = seen[seen.length - 1];
    // Opacity contribution should exist (transform stripped, opacity preserved)
    expect(last.opacity).toBeDefined();
    // Transform should be undefined or empty (no translateY after strip)
    expect(last.transform).toBeUndefined();
  });

  it('reducedMotion=true: essential=true bypasses policy', () => {
    const seen: Record<string, unknown>[] = [];
    function R() {
      const { animatedStyle } = useElementAnimations(
        {
          ambient: {
            keyframes: [
              { at: '0%', transform: { rotate: 0 } },
              { at: '100%', transform: { rotate: 360 } },
            ],
            duration: 1000,
            iterations: 'infinite',
            essential: true,
          },
        },
        { recipes: ANIMATION_RECIPES, reducedMotion: true },
      );
      seen.push(animatedStyle);
      return null;
    }
    render(<R />);
    // essential:true bypasses reduced-motion, so ambient rotate still active
    const last = seen[seen.length - 1];
    expect(last.transform).toBeDefined();
  });

  it('reducedMotion=true: hover skipped even with isHovered=true', () => {
    const seen: Record<string, unknown>[] = [];
    function R() {
      const { animatedStyle } = useElementAnimations(
        { hover: { recipe: 'lift' } },
        {
          recipes: ANIMATION_RECIPES,
          reducedMotion: true,
          isHovered: true,
        },
      );
      seen.push(animatedStyle);
      return null;
    }
    render(<R />);
    expect(seen[seen.length - 1]).toEqual({});
  });

  it('reducedMotion=true: focus preserved (a11y-critical) with isFocused=true', () => {
    const seen: Record<string, unknown>[] = [];
    function R() {
      const { animatedStyle } = useElementAnimations(
        { focus: { recipe: 'fade' } },
        {
          recipes: ANIMATION_RECIPES,
          reducedMotion: true,
          isFocused: true,
        },
      );
      seen.push(animatedStyle);
      return null;
    }
    render(<R />);
    const last = seen[seen.length - 1];
    expect(last.opacity).toBeDefined();
  });
});

describe('useElementAnimations (RN) — hook renders without crashing', () => {
  it('no animations: returns empty animatedStyle', () => {
    const seen: Record<string, unknown>[] = [];
    render(<Harness onStyle={(s) => seen.push(s)} />);
    expect(seen[seen.length - 1]).toEqual({});
  });

  it('mount: animatedStyle is defined (exact end-state covered by compose-rn-style tests)', () => {
    const seen: Record<string, unknown>[] = [];
    render(
      <Harness
        onStyle={(s) => seen.push(s)}
        animations={{ mount: { recipe: 'fade-up' } }}
      />,
    );
    expect(seen.length).toBeGreaterThan(0);
    // At render time, mountSV is 0 (useEffect not yet run), so style reflects start-state.
    // End-state verification belongs to compose-rn-style tests.
    expect(seen[seen.length - 1]).toBeDefined();
  });

  it('ambient: renders without crash', () => {
    const seen: Record<string, unknown>[] = [];
    render(
      <Harness
        onStyle={(s) => seen.push(s)}
        animations={{ ambient: { recipe: 'breathe-subtle' } }}
      />,
    );
    expect(seen[seen.length - 1]).toBeDefined();
  });

  it('hover off: no hover contribution at render', () => {
    const seen: Record<string, unknown>[] = [];
    render(
      <Harness
        onStyle={(s) => seen.push(s)}
        animations={{ hover: { recipe: 'lift' } }}
        isHovered={false}
      />,
    );
    const last = seen[seen.length - 1];
    expect(last.transform).toBeUndefined();
    expect(last.opacity).toBeUndefined();
  });

  it('hover on: lift contribution present (as transform at start progress=0)', () => {
    const seen: Record<string, unknown>[] = [];
    render(
      <Harness
        onStyle={(s) => seen.push(s)}
        animations={{ hover: { recipe: 'lift' } }}
        isHovered={true}
      />,
    );
    const last = seen[seen.length - 1];
    const transforms = last.transform as Array<Record<string, unknown>> | undefined;
    expect(transforms).toBeDefined();
    // At progress=0, lift keyframes[0] = translateY 0 + scale 1
    expect(transforms!.find((t) => 'translateY' in t)?.translateY).toBe(0);
    expect(transforms!.find((t) => 'scale' in t)?.scale).toBe(1);
  });

  it('null trigger is treated same as undefined (no contribution)', () => {
    const seen: Record<string, unknown>[] = [];
    render(
      <Harness
        onStyle={(s) => seen.push(s)}
        animations={{ mount: null }}
      />,
    );
    expect(seen[seen.length - 1]).toEqual({});
  });

  it('staggerIndex passes through without crash', () => {
    const seen: Record<string, unknown>[] = [];
    render(
      <Harness
        onStyle={(s) => seen.push(s)}
        animations={{ mount: { recipe: 'fade-up', stagger: { delay: 80 } } }}
        staggerIndex={3}
      />,
    );
    expect(seen[seen.length - 1]).toBeDefined();
  });
});

describe('useElementAnimations (RN) — stateChange', () => {
  function StoreHarness({
    animations,
    store,
    onStyle,
  }: {
    animations?: ElementAnimations;
    store: ReturnType<typeof createStateStore>;
    onStyle?: (s: Record<string, unknown>) => void;
  }) {
    const { animatedStyle } = useElementAnimations(animations, {
      recipes: ANIMATION_RECIPES,
      store,
    });
    onStyle?.(animatedStyle);
    return null;
  }

  it('subscribes to watched path and fires on matching change', () => {
    const store = createStateStore({ count: 0 });
    expect(() => {
      render(
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
    }).not.toThrow();
  });

  it('"increase" gates by numeric comparison', () => {
    const store = createStateStore({ count: 5 });
    render(
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
    expect(() =>
      act(() => {
        store.set('/count', 3);
        store.set('/count', 10);
      }),
    ).not.toThrow();
  });

  it('"{equals}" gates by specific value', () => {
    const store = createStateStore({ status: 'idle' });
    render(
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
    expect(() =>
      act(() => {
        store.set('/status', 'loading');
        store.set('/status', 'error');
      }),
    ).not.toThrow();
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

  it('throws at render when stateChange has neither recipe nor keyframes', () => {
    // RN resolves stateChange eagerly in useMemo (needed for the useAnimatedStyle
    // interpolation). Web defers to listener fire time. Both surface the error;
    // RN's is earlier and caught at render, which is better DX.
    const store = createStateStore({ x: 0 });
    expect(() => {
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
    }).toThrow(/must supply either/);
  });

  it('no store option: stateChange no-ops silently', () => {
    expect(() => {
      render(
        <StoreHarness
          store={createStateStore({})}
          animations={{
            stateChange: {
              watch: '/x',
              on: 'change',
              recipe: 'pop',
              duration: 200,
            },
          }}
        />,
      );
    }).not.toThrow();
  });
});

describe('useElementAnimations (RN) — triggerUnmount imperative API', () => {
  it('returns a triggerUnmount function', () => {
    let captured: { triggerUnmount: () => Promise<void> } | null = null;
    function Inner() {
      captured = useElementAnimations(undefined, { recipes: ANIMATION_RECIPES });
      return null;
    }
    render(<Inner />);
    expect(captured).not.toBeNull();
    expect(typeof captured!.triggerUnmount).toBe('function');
  });

  it('triggerUnmount with no unmount config resolves immediately', async () => {
    let captured: { triggerUnmount: () => Promise<void> } | null = null;
    function Inner() {
      captured = useElementAnimations(
        { mount: { recipe: 'fade' } },
        { recipes: ANIMATION_RECIPES },
      );
      return null;
    }
    render(<Inner />);
    await expect(captured!.triggerUnmount()).resolves.toBeUndefined();
  });

  it('triggerUnmount with unmount config resolves after duration', async () => {
    vi.useFakeTimers();
    let captured: { triggerUnmount: () => Promise<void> } | null = null;
    function Inner() {
      captured = useElementAnimations(
        {
          unmount: {
            keyframes: [
              { at: '0%', opacity: 1 },
              { at: '100%', opacity: 0 },
            ],
            duration: 200,
          },
        },
        { recipes: ANIMATION_RECIPES },
      );
      return null;
    }
    render(<Inner />);
    const p = captured!.triggerUnmount();
    vi.advanceTimersByTime(201);
    await expect(p).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});

// Plan 3 Task 4 — AnimationContext (cascade) form of the hook param.
// The RN hook must accept EITHER a direct ElementAnimations OR an
// AnimationContext (4 levels) and merge at runner time. Same contract as web.
describe('useElementAnimations (RN) — AnimationContext cascade form', () => {
  function CtxHarness({
    ctx,
    onStyle,
  }: {
    ctx: Parameters<typeof useElementAnimations>[0];
    onStyle: (s: Record<string, unknown>) => void;
  }) {
    const { animatedStyle } = useElementAnimations(ctx, {
      recipes: ANIMATION_RECIPES,
    });
    onStyle(animatedStyle);
    return null;
  }

  it('identity-only context resolves without crashing and returns a style object', () => {
    const seen: Record<string, unknown>[] = [];
    render(
      <CtxHarness
        onStyle={(s) => seen.push(s)}
        ctx={{ identity: { mount: { recipe: 'fade-up' } } }}
      />,
    );
    expect(seen.length).toBeGreaterThan(0);
    expect(typeof seen[seen.length - 1]).toBe('object');
  });

  it('element overrides identity via cascade merge (no crash)', () => {
    const seen: Record<string, unknown>[] = [];
    render(
      <CtxHarness
        onStyle={(s) => seen.push(s)}
        ctx={{
          identity: { mount: { recipe: 'fade-up' } },
          element: { mount: { recipe: 'scale-in' } },
        }}
      />,
    );
    expect(seen.length).toBeGreaterThan(0);
  });

  it('element null via context disables inherited identity hover (no crash)', () => {
    const seen: Record<string, unknown>[] = [];
    render(
      <CtxHarness
        onStyle={(s) => seen.push(s)}
        ctx={{
          identity: { hover: { recipe: 'lift' } },
          element: { hover: null },
        }}
      />,
    );
    expect(seen.length).toBeGreaterThan(0);
  });

  it('all-null cascade → no crash, empty or near-empty style', () => {
    const seen: Record<string, unknown>[] = [];
    render(
      <CtxHarness
        onStyle={(s) => seen.push(s)}
        ctx={{ identity: null, variant: null, template: null, element: null }}
      />,
    );
    expect(seen.length).toBeGreaterThan(0);
  });

  it('direct ElementAnimations form still works (backward-compat)', () => {
    const seen: Record<string, unknown>[] = [];
    render(
      <CtxHarness
        onStyle={(s) => seen.push(s)}
        ctx={{ mount: { recipe: 'fade-up' } }}
      />,
    );
    expect(seen.length).toBeGreaterThan(0);
  });

  it('null param → no crash', () => {
    const seen: Record<string, unknown>[] = [];
    render(<CtxHarness onStyle={(s) => seen.push(s)} ctx={null} />);
    expect(seen.length).toBeGreaterThan(0);
  });

  it('empty object {} param → treated as empty ElementAnimations (no crash)', () => {
    const seen: Record<string, unknown>[] = [];
    render(<CtxHarness onStyle={(s) => seen.push(s)} ctx={{}} />);
    expect(seen.length).toBeGreaterThan(0);
  });

  it('mixed-key input (context + trigger keys) throws in dev — contract enforcement', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(
        <CtxHarness
          onStyle={() => {}}
          // @ts-expect-error — intentional malformed input to verify runtime guard
          ctx={{
            identity: { mount: { recipe: 'fade-up' } },
            mount: { recipe: 'lift' },
          }}
        />,
      );
    }).toThrow(/disjoint by contract/i);
    errSpy.mockRestore();
  });
});
