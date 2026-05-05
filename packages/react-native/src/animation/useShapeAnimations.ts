// useShapeAnimations (RN) — Layer 3 runner for SVG-child animations on
// react-native-svg via Reanimated. Returns `{ animatedProps }` which the
// consumer spreads onto `Animated.createAnimatedComponent(Path)` (or any
// other react-native-svg child wrapped via Animated.createAnimatedComponent).
//
// Scope matches the web runner (Task 10): ambient trigger ONLY. SVG children
// have no hover/focus/active affordance in plan 3, and mount/unmount is the
// parent Box's responsibility.
//
// Pattern mirrors the plan 2 useElementAnimations (RN) HARD_PER_TRIGGER fixed
// shared-value pool — React Hook rules require a stable hook count per
// render, and `useSharedValueArray(HARD_PER_TRIGGER)` preallocates a pool so
// an `ambient: AnimationRef[]` with 1 to 6 entries doesn't violate the rule.
// Arrays exceeding HARD_PER_TRIGGER are silently clamped (validator handles
// the warning at spec time via validateAnimationCaps).
//
// Composition: reuses `composeRNStyle(contributions, interpolate,
// interpolateColor)` shared with useElementAnimations. The output key shape
// (transform array + scalar props like opacity) is identical for View style
// AND animated SVG props — no second composition fn needed.
//
// Spec-vs-impl note: the design spec described "SVG-safe attribute writes
// (e.g. transform='translate(x y)')" — this implementation instead emits
// RN's native transform-array form and RELIES ON react-native-svg v13+
// auto-translating the array into SVG `transform="..."` strings on the
// native side. Delegating to the library is preferable to reimplementing
// the translation ourselves (fewer bugs, better version alignment). Plan 3
// peerDep range is react-native-svg >=15.0.0 which covers this. If the
// peer range ever loosens below v13, this hook will need its own
// array→string translator.
//
// Mock caveat: the tests use the Vitest mock of useAnimatedProps which
// aliases to useAnimatedStyle. This covers the scalar + transform-array
// props animated by plan 3 (all non-SVG-specific). SVG-only animated
// attributes like `fill`, `stroke`, `d`, `cx`, `cy` would need either a
// real-Reanimated test or mock extension before relying on this hook for
// those paths.
//
// Cross-platform parity with the web runner flows from both consuming the
// same ElementAnimations contract, resolveAnimation, applyReducedMotion,
// and buildReanimatedSpec output shape.
//
// Performance:
//   - `options.recipes` SHOULD be a stable reference (typically
//     ANIMATION_RECIPES from core, which is module-scope). Inline object
//     literals invalidate the useMemo every render — correct but wasteful.
//   - `animations` SHOULD be a stable reference (derived from the blob
//     spec, not constructed inline). BlobLayer iterating many blobs with
//     inline-literal `animations={{ ambient: {...} }}` objects busts memo
//     on every render — BlobLayer should memoize per-blob animations
//     upstream.

import { useEffect, useMemo } from 'react';
import {
  useAnimatedProps,
  withTiming,
  withRepeat,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import {
  resolveAnimation,
  buildReanimatedSpec,
  applyReducedMotion,
  toArray,
  HARD_PER_TRIGGER,
  type AnimationRef,
  type AnimationSpec,
  type ElementAnimations,
  type InlineAnimation,
  type ReanimatedSpec,
} from 'mythik';
import { composeRNStyle, type TriggerContribution } from './compose-rn-style.js';
import { useSharedValueArray } from './use-shared-value-array.js';
import { usePrefersReducedMotion } from './usePrefersReducedMotion.js';

export type UseShapeAnimationsOptions = {
  /** Recipe registry — typically ANIMATION_RECIPES from core. */
  recipes: Record<string, InlineAnimation>;
  /** Index for stagger-delay multiplier on animations with `stagger` set. */
  staggerIndex?: number;
  /** Override prefers-reduced-motion for tests / user preference. */
  reducedMotion?: boolean;
};

type TriggerResolution = {
  spec: AnimationSpec;
  rspec: ReanimatedSpec;
};

function resolveAmbient(
  refs: AnimationRef | AnimationRef[] | null | undefined,
  recipes: Record<string, InlineAnimation>,
  reducedMotion: boolean,
): TriggerResolution[] {
  const items = toArray(refs).slice(0, HARD_PER_TRIGGER);
  const out: TriggerResolution[] = [];
  for (const ref of items) {
    let spec = resolveAnimation(ref, recipes);
    if (reducedMotion) {
      const r = applyReducedMotion(spec, 'ambient');
      if (r === null) continue;
      spec = r;
    }
    out.push({ spec, rspec: buildReanimatedSpec(spec) });
  }
  return out;
}

/**
 * Attach ambient animations to an SVG-child component's animated props.
 *
 * @param animations ElementAnimations (Layer 3 reads only `ambient`) or null
 *                   for "no animations".
 * @param options    Recipe registry, optional stagger index, reduced-motion
 *                   override.
 * @returns `{ animatedProps }` — consumer spreads onto
 *          `Animated.createAnimatedComponent(Path)` or equivalent.
 */
export function useShapeAnimations(
  animations: ElementAnimations | null,
  options: UseShapeAnimationsOptions,
): { animatedProps: Record<string, unknown> } {
  const reducedMotion = usePrefersReducedMotion(options.reducedMotion);

  // Dev-mode guard: Layer 3 scope is strictly `ambient`. If the consumer
  // passes hover/mount/etc., the trigger is silently dropped in production
  // (robust against being fed a full ElementAnimations object from a
  // cascade merge). In dev we warn to surface a likely mistake — usually
  // the consumer meant useElementAnimations. Mirrors web hook Task 10 M3.
  if (process.env.NODE_ENV !== 'production' && animations) {
    const extras: string[] = [];
    for (const key of ['mount', 'unmount', 'hover', 'focus', 'active', 'stateChange'] as const) {
      if (key in animations && animations[key] !== undefined && animations[key] !== null) {
        extras.push(key);
      }
    }
    if (extras.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `useShapeAnimations: ignoring non-ambient triggers [${extras.join(', ')}]. ` +
          'Use useElementAnimations for interactive/mount animations; shapes only support ambient.',
      );
    }
  }

  const resolved = useMemo(
    () => resolveAmbient(animations?.ambient, options.recipes, reducedMotion),
    [animations?.ambient, options.recipes, reducedMotion],
  );

  // Fixed SV pool — only the first `resolved.length` entries are driven;
  // unused ones stay at 0 and contribute nothing to composed props.
  const ambientSVs = useSharedValueArray(HARD_PER_TRIGGER);

  useEffect(() => {
    for (let i = 0; i < HARD_PER_TRIGGER; i++) {
      const res = resolved[i];
      ambientSVs[i].value = 0;
      if (res) {
        const iterations =
          res.rspec.timing.iterations === 'infinite'
            ? -1
            : (res.rspec.timing.iterations as number);
        ambientSVs[i].value = withRepeat(
          withTiming(1, { duration: res.rspec.timing.duration }),
          iterations,
          res.rspec.timing.reverse,
        );
      }
    }
  }, [resolved, ambientSVs]);

  // Apply composed animations as props (NOT style) — consumer spreads onto
  // an animated SVG component where `animatedProps` is the attribute
  // Reanimated updates on the UI thread.
  const animatedProps = useAnimatedProps(() => {
    const contributions: TriggerContribution[] = [];
    for (let i = 0; i < HARD_PER_TRIGGER; i++) {
      const res = resolved[i];
      if (res) contributions.push({ progress: ambientSVs[i].value, spec: res.rspec });
    }
    if (contributions.length === 0) return {};
    return composeRNStyle(contributions, interpolate, interpolateColor);
  });

  return { animatedProps };
}
