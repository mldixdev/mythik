// Mock for react-native-reanimated — end-state-synchronous semantics.
// Used in Vitest/jsdom environment where the native module isn't available.
//
// withTiming/withSpring/withDelay/withSequence/withRepeat return the target
// value immediately. useAnimatedStyle evaluates its factory synchronously on
// each render — this yields end-state validation in tests without timing complexity.
//
// Important timing nuance: useAnimatedStyle returns the style captured AT RENDER
// TIME. If a trigger fires inside a useEffect that sets sharedValue.value, the
// updated value is not reflected in the rendered style until the NEXT render.
// In tests, assert end-state AFTER a re-render (or use @testing-library/react's
// `rerender` / `waitFor` to flush effects). Real Reanimated has the same property
// (style updates go through the native bridge, not React renders) — this is
// intentional fidelity, not a mock artifact.
//
// Layout-animation presets (FadeIn, FadeOutUp, ZoomIn, etc.) are chainable
// builders that return themselves on every method call — the mock ignores
// their configuration because no real animation runs in the test environment.
import * as React from 'react';

type SharedValue<T> = { value: T };

export function useSharedValue<T>(initial: T): SharedValue<T> {
  const ref = React.useRef<SharedValue<T>>({ value: initial });
  return ref.current;
}

export function useAnimatedStyle(fn: () => Record<string, unknown>, _deps?: unknown[]) {
  return fn();
}

// useAnimatedProps is Reanimated's sibling to useAnimatedStyle — takes a worklet
// returning a props object that consumers spread onto an animated component
// (typically Animated.createAnimatedComponent(Path) for react-native-svg). The
// semantic difference vs useAnimatedStyle is which attribute the animated
// component consumes (animatedProps vs style); in the mock both evaluate the
// worklet synchronously at render time, producing end-state props.
//
// Scope caveat: this alias is valid for Layer 3's current scope (transform +
// opacity animated props — shared with View-style). SVG-specific attributes
// like `fill`, `stroke`, `d`, `cx`, `cy` would go through Reanimated's
// dedicated prop-updater path on real devices with semantics different from
// style. If a future task animates those, this mock needs extending OR the
// test needs to run against real Reanimated.
export function useAnimatedProps(fn: () => Record<string, unknown>, _deps?: unknown[]) {
  return fn();
}

export function useDerivedValue<T>(fn: () => T): SharedValue<T> {
  const ref = React.useRef<SharedValue<T>>({ value: undefined as unknown as T });
  ref.current.value = fn();
  return ref.current;
}

export function withTiming<T>(target: T, _config?: unknown, _cb?: (finished: boolean) => void): T {
  return target;
}

export function withSpring<T>(target: T, _config?: unknown, _cb?: (finished: boolean) => void): T {
  return target;
}

export function withDelay<T>(_ms: number, value: T): T {
  return value;
}

export function withSequence<T>(...values: T[]): T {
  return values[values.length - 1];
}

export function withRepeat<T>(value: T, _count?: number, _reverse?: boolean): T {
  return value;
}

export function cancelAnimation(_sv: SharedValue<unknown>): void {
  // noop in mock
}

export function runOnJS<F extends (...args: never[]) => unknown>(fn: F): F {
  return fn;
}

export function runOnUI<F extends (...args: never[]) => unknown>(fn: F): F {
  return fn;
}

export function interpolate(
  value: number,
  inputRange: number[],
  outputRange: number[],
  _extrapolation?: unknown,
): number {
  if (value <= inputRange[0]) return outputRange[0];
  const last = inputRange.length - 1;
  if (value >= inputRange[last]) return outputRange[last];
  for (let i = 0; i < last; i++) {
    if (value >= inputRange[i] && value <= inputRange[i + 1]) {
      const t = (value - inputRange[i]) / (inputRange[i + 1] - inputRange[i]);
      return outputRange[i] + t * (outputRange[i + 1] - outputRange[i]);
    }
  }
  return outputRange[0];
}

export function interpolateColor(
  _value: number,
  _inputRange: number[],
  outputRange: string[],
): string {
  return outputRange[outputRange.length - 1];
}

export const Easing = {
  linear: (t: number) => t,
  ease: (t: number) => t,
  quad: (t: number) => t * t,
  cubic: (t: number) => t * t * t,
  bezier: (_x1: number, _y1: number, _x2: number, _y2: number) => (t: number) => t,
  in: (fn: (t: number) => number) => fn,
  out: (fn: (t: number) => number) => (t: number) => 1 - fn(1 - t),
  inOut: (fn: (t: number) => number) => fn,
};

export const Extrapolation = {
  CLAMP: 'clamp' as const,
  EXTEND: 'extend' as const,
  IDENTITY: 'identity' as const,
};

// Layout animation builders (e.g. FadeInUp, FadeOutUp, ZoomIn, ...)
// Each preset is a chainable builder. In the mock, all methods return the
// builder unchanged so consuming components pass validation at render time.
type LayoutAnimationBuilder = {
  duration: (_ms: number) => LayoutAnimationBuilder;
  delay: (_ms: number) => LayoutAnimationBuilder;
  easing: (_e: unknown) => LayoutAnimationBuilder;
  springify: () => LayoutAnimationBuilder;
  damping: (_d: number) => LayoutAnimationBuilder;
  mass: (_m: number) => LayoutAnimationBuilder;
  stiffness: (_s: number) => LayoutAnimationBuilder;
  overshootClamping: (_o: boolean) => LayoutAnimationBuilder;
  restDisplacementThreshold: (_r: number) => LayoutAnimationBuilder;
  restSpeedThreshold: (_r: number) => LayoutAnimationBuilder;
  randomDelay: () => LayoutAnimationBuilder;
  withInitialValues: (_v: Record<string, unknown>) => LayoutAnimationBuilder;
  withCallback: (_cb: unknown) => LayoutAnimationBuilder;
  build: () => () => Record<string, unknown>;
};

function createLayoutBuilder(): LayoutAnimationBuilder {
  const builder: LayoutAnimationBuilder = {
    duration: () => builder,
    delay: () => builder,
    easing: () => builder,
    springify: () => builder,
    damping: () => builder,
    mass: () => builder,
    stiffness: () => builder,
    overshootClamping: () => builder,
    restDisplacementThreshold: () => builder,
    restSpeedThreshold: () => builder,
    randomDelay: () => builder,
    withInitialValues: () => builder,
    withCallback: () => builder,
    build: () => () => ({}),
  };
  return builder;
}

export const FadeIn = createLayoutBuilder();
export const FadeInUp = createLayoutBuilder();
export const FadeInDown = createLayoutBuilder();
export const FadeInLeft = createLayoutBuilder();
export const FadeInRight = createLayoutBuilder();
export const FadeOut = createLayoutBuilder();
export const FadeOutUp = createLayoutBuilder();
export const FadeOutDown = createLayoutBuilder();
export const FadeOutLeft = createLayoutBuilder();
export const FadeOutRight = createLayoutBuilder();
export const SlideInLeft = createLayoutBuilder();
export const SlideInRight = createLayoutBuilder();
export const SlideInUp = createLayoutBuilder();
export const SlideInDown = createLayoutBuilder();
export const SlideOutLeft = createLayoutBuilder();
export const SlideOutRight = createLayoutBuilder();
export const SlideOutUp = createLayoutBuilder();
export const SlideOutDown = createLayoutBuilder();
export const ZoomIn = createLayoutBuilder();
export const ZoomOut = createLayoutBuilder();
export const Layout = createLayoutBuilder();
export const LinearTransition = createLayoutBuilder();

function flattenStyle(style: unknown): Record<string, unknown> {
  if (!style) return {};
  if (Array.isArray(style)) {
    const merged: Record<string, unknown> = {};
    for (const item of style) {
      Object.assign(merged, flattenStyle(item));
    }
    return merged;
  }
  return style as Record<string, unknown>;
}

const createPassthroughComponent = (name: string) =>
  React.forwardRef<unknown, { children?: React.ReactNode; style?: unknown } & Record<string, unknown>>(
    (
      {
        style,
        children,
        entering: _e,
        exiting: _x,
        layout: _l,
        testID,
        accessibilityRole,
        accessibilityLabel,
        // RN-native event handlers not recognized by React DOM — drop silently
        // rather than spreading them onto the <div>, which would log noisy
        // "Unknown event handler property" warnings for every Animated.View.
        onHoverIn: _h1,
        onHoverOut: _h2,
        onPressIn: _p1,
        onPressOut: _p2,
        onLongPress: _lp,
        ...rest
      },
      ref,
    ) =>
      React.createElement(
        'div',
        {
          ...rest,
          ref,
          style: flattenStyle(style),
          'data-animated': name,
          'data-testid': testID,
          role: accessibilityRole,
          'aria-label': accessibilityLabel,
        },
        children,
      ),
  );

const AnimatedView = createPassthroughComponent('Animated.View');
const AnimatedText = createPassthroughComponent('Animated.Text');
const AnimatedScrollView = createPassthroughComponent('Animated.ScrollView');
const AnimatedImage = createPassthroughComponent('Animated.Image');

const Animated = {
  View: AnimatedView,
  Text: AnimatedText,
  ScrollView: AnimatedScrollView,
  Image: AnimatedImage,
  createAnimatedComponent: <T,>(c: T): T => c,
};

export default Animated;
